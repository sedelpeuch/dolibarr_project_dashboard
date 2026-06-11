"""Opportunities service - business logic for opportunities dashboard"""

import logging
from typing import Any

from src.infrastructure import GaaspardClient

logger = logging.getLogger(__name__)


class OpportunitiesService:
    """Service pour les données d'opportunités"""

    def __init__(self, gaaspard_client: GaaspardClient):
        self.gaaspard = gaaspard_client

    @staticmethod
    def _normalize(opp: dict, opp_status_override: str | None = None) -> dict:
        """Normalise un objet Gaaspard opportunité vers la forme attendue."""
        ref = opp.get("ref", "")
        parts = ref.split(" ", 1)
        ref_code = parts[0]
        title = parts[1] if len(parts) > 1 else ref

        opp_status = opp_status_override or str(opp.get("fk_opp_status") or "1")

        return {
            **opp,
            "id": opp.get("rowid") or opp.get("id"),
            "ref": ref_code,
            "title": title,
            "opp_status": opp_status,
        }

    def get_opportunities_data(self) -> list[dict[str, Any]]:
        """Récupérer les opportunités depuis Gaaspard avec fk_opp_status réel."""
        try:
            # /projects contient fk_opp_status (vrai champ Dolibarr)
            all_projects = self.gaaspard.get_projects(include_closed=True)
            opp_status_map = {
                int(p["rowid"]): str(p.get("fk_opp_status") or "1")
                for p in all_projects
                if p.get("rowid")
            }

            raw = self.gaaspard.get_opportunities_index(include_closed=True)
            result = []
            for o in raw:
                rowid = int(o.get("rowid") or 0)
                status_override = opp_status_map.get(rowid)
                result.append(self._normalize(o, status_override))
            return result
        except Exception as e:
            logger.error(f"Error building opportunities data: {e}")
            raise

    def get_stats(self) -> dict[str, Any]:
        """Calculer les stats des opportunités"""
        opps = self.get_opportunities_data()
        # Real projects = PJ-* only (rd_index excluded by design)
        real_projects = self.gaaspard.get_projects_index(include_closed=True)

        # Après _normalize, opp_status est un str "1"–"7"
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
            if str(stage_code) == "6":
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
                    "coordinators": opp.get("coordinators") or [],
                    "health_warnings": opp.get("health_warnings") or [],
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
