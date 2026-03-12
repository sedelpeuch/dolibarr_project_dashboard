"""Opportunities service - business logic for opportunities dashboard"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from src.infrastructure import DolibarrClient, load_data

logger = logging.getLogger(__name__)


class OpportunitiesService:
    """Service pour les données d'opportunités"""

    def __init__(self, dolibarr_client: DolibarrClient):
        self.dolibarr = dolibarr_client

    def get_opportunities_data(self) -> list[dict[str, Any]]:
        """Récupérer la liste des opportunités (projets avec ref OPP-)"""
        try:
            # Charger la liste des projets depuis data.json
            data = load_data()
            tracked_project_ids = data.get("projects", [])

            if not tracked_project_ids:
                return []

            opportunities = []
            # Paralléliser la récupération des détails
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_id = {
                    executor.submit(
                        self.dolibarr.get_project_by_id,
                        project_id,
                    ): project_id
                    for project_id in tracked_project_ids
                }
                for future in as_completed(future_to_id):
                    project_id = future_to_id[future]
                    try:
                        proj = future.result(timeout=30)
                        if proj and self._is_opportunity(proj):
                            opportunities.append(proj)
                    except Exception as e:
                        logger.warning(
                            f"Error processing opportunity {project_id}: {e}",
                        )
                        continue

            return opportunities

        except Exception as e:
            logger.error(f"Error building opportunities data: {e}")
            raise

    def get_stats(self) -> dict[str, Any]:
        """Calculer les stats des opportunités"""
        opps = self.get_opportunities_data()
        all_projects = self._get_all_projects()

        # Filtrer les projets (pas opp, pas rd)
        real_projects = [
            p
            for p in all_projects
            if not self._is_opportunity(p) and not self._is_rd(p)
        ]

        # Filtrer les opps
        open_opps = [
            o for o in opps if not self._is_opp_lost(o) and o.get("opp_status") != "6"
        ]
        lost_opps = [o for o in opps if self._is_opp_lost(o)]
        not_lost_opps = [o for o in opps if o not in lost_opps]  # Potentiel de gain

        # Taux de transformation = gagnés (projets) / total (projets + opps)
        total_count = len(real_projects) + len(opps)
        won_count = len(real_projects)
        conversion_rate = (won_count / total_count * 100) if total_count > 0 else 0

        # Calculer les montants des opp ouvertes
        total_open_amount = sum(float(o.get("opp_amount") or 0) for o in open_opps)
        weighted_open_amount = sum(
            float(o.get("opp_amount") or 0) * float(o.get("opp_percent") or 0) / 100
            for o in open_opps
        )

        # Potentiel = montant des opps pas perdues
        potential_amount = sum(float(o.get("opp_amount") or 0) for o in not_lost_opps)

        # Montant perdu
        lost_amount = sum(float(o.get("opp_amount") or 0) for o in lost_opps)

        return {
            "open_count": len(open_opps),
            "won_count": won_count,
            "lost_count": len(lost_opps),
            "conversion_rate": conversion_rate,
            "total_open_amount": total_open_amount,
            "weighted_open_amount": weighted_open_amount,
            "potential_amount": potential_amount,
            "lost_amount": lost_amount,
        }

    def _get_all_projects(self) -> list[dict[str, Any]]:
        """Récupérer tous les projets suivis"""
        try:
            data = load_data()
            tracked_project_ids = data.get("projects", [])

            all_projects = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_id = {
                    executor.submit(
                        self.dolibarr.get_project_by_id,
                        project_id,
                    ): project_id
                    for project_id in tracked_project_ids
                }
                for future in as_completed(future_to_id):
                    try:
                        proj = future.result(timeout=30)
                        if proj:
                            all_projects.append(proj)
                    except Exception as e:
                        logger.warning(f"Error loading project: {e}")
                        continue
            return all_projects
        except Exception as e:
            logger.error(f"Error getting all projects: {e}")
            return []

    def get_pipeline(self) -> dict[str, Any]:
        """Grouper les opportunités par étape (opp_status)"""
        opps = self.get_opportunities_data()

        # Mapping des statuts d'opportunités
        stage_names = {
            "1": "Prospection",
            "2": "Qualification",
            "3": "Proposition",
            "4": "Négociation",
            "5": "En attente",
            "6": "Gagnée",
            "7": "Perdue",
        }

        # Ordre des étapes pour l'affichage
        stage_order = [
            "Prospection",
            "Qualification",
            "Proposition",
            "Négociation",
            "En attente",
            "Perdue",
        ]

        # Grouper par étape
        stages = {}
        for opp in opps:
            # Déterminer le stage code basé UNIQUEMENT sur opp_status
            stage_code = opp.get("opp_status") or "1"

            # Si opp_status est 6 (Gagnée), ne pas l'afficher dans le pipeline
            if stage_code == "6":
                continue

            stage_name = stage_names.get(str(stage_code), f"Étape {stage_code}")

            if stage_name not in stages:
                stages[stage_name] = []

            stages[stage_name].append(
                {
                    "id": opp.get("id"),
                    "ref": opp.get("ref"),
                    "title": opp.get("title"),
                    "opp_amount": float(opp.get("opp_amount") or 0),
                    "opp_percent": float(opp.get("opp_percent") or 0),
                    "opp_status": opp.get("opp_status"),
                    "status": opp.get("status"),
                },
            )

        # Trier les opportunités dans chaque étape par opp_status
        for stage_name in stages:
            stages[stage_name].sort(key=lambda x: x.get("opp_status") or "1")

        return {
            "pipeline": [
                {"stage": stage_name, "opportunities": stages[stage_name]}
                for stage_name in stage_order
                if stage_name in stages
            ],
        }

    @staticmethod
    def _is_opportunity(proj: dict) -> bool:
        """Déterminer si un projet est une opportunité"""
        ref = proj.get("ref", "")
        return ref.startswith("OPP-") if ref else False

    @staticmethod
    def _is_rd(proj: dict) -> bool:
        """Déterminer si un projet est un RD"""
        ref = proj.get("ref", "")
        return ref.startswith("RD-") if ref else False

    @staticmethod
    def _is_opp_lost(opp: dict) -> bool:
        """Déterminer si une opp est perdue"""
        return opp.get("opp_status") == "7"
