"""Dashboard service - business logic for dashboard"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from src.infrastructure import (
    DolibarrClient,
    GaaspardClient,
    ThreadSafeCache,
    load_data,
)

logger = logging.getLogger(__name__)

# Thread-safe cache for thirdparty data
_thirdparty_cache = ThreadSafeCache()


def _get_adaptive_workers(total_items: int) -> int:
    """Calculate adaptive number of workers based on item count"""
    if total_items < 5:
        return 2
    if total_items < 15:
        return 5
    return 3


class DashboardService:
    """Service pour construire les données du dashboard.

    Source primaire : Gaaspard _index APIs (3 appels pour toute la liste).
    Dolibarr : uniquement pour les détails (tasks, invoices, proposals).
    data.json["projects"] : liste des IDs supplémentaires non couverts par l'API
                            (anciens projets dont l'utilisateur n'est plus coordinateur).
    """

    def __init__(
        self, dolibarr_client: DolibarrClient, gaaspard_client: GaaspardClient
    ):
        self.dolibarr = dolibarr_client
        self.gaaspard = gaaspard_client

    def get_dashboard_data(self) -> dict[str, list]:
        """Construire les données complètes du dashboard"""
        try:
            # ── 1. Récupérer tous les projets via Gaaspard (3 appels parallèles) ──
            gaaspard_projects = self.gaaspard.get_all_projects(include_closed=True)
            gaaspard_by_id = {int(p["rowid"]): p for p in gaaspard_projects}

            # ── 2. Compléter avec les IDs supplémentaires de data.json ──
            data = load_data()
            extra_ids = [
                pid for pid in data.get("projects", []) if pid not in gaaspard_by_id
            ]

            # Auto-sync: persist the full merged list back to data.json
            all_ids = sorted(set(gaaspard_by_id.keys()) | set(data.get("projects", [])))
            if set(all_ids) != set(data.get("projects", [])):
                data["projects"] = all_ids
                from src.infrastructure import save_data

                save_data(data)

            # ── 3. Enrichir avec les détails Dolibarr (tasks, invoices, proposals) ──
            projects = []
            max_workers = _get_adaptive_workers(len(gaaspard_by_id) + len(extra_ids))

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {}

                # Projets Gaaspard — enrichissement partiel (détails seulement)
                for pid, gp in gaaspard_by_id.items():
                    futures[executor.submit(self._build_from_gaaspard, pid, gp)] = pid

                # Projets extra — chargement complet depuis Dolibarr
                for pid in extra_ids:
                    futures[executor.submit(self._build_from_dolibarr, pid)] = pid

                for future in as_completed(futures):
                    pid = futures[future]
                    try:
                        project_data = future.result(timeout=30)
                        if project_data:
                            projects.append(project_data)
                    except Exception as e:
                        logger.warning(
                            "Error processing project",
                            extra={"context": {"project_id": pid, "error": str(e)}},
                        )

            return {"projects": projects}

        except Exception as e:
            logger.error(
                "Error building dashboard", extra={"context": {"error": str(e)}}
            )
            raise

    # ── Build from Gaaspard index data + Dolibarr details ─────────────────────

    def _build_from_gaaspard(
        self, project_id: int, gp: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Build project data using Gaaspard index as base + Dolibarr for financials."""
        ref = gp.get("ref", "")
        # ref in Gaaspard index is "PJ-XXX Short title" — split on first space
        ref_parts = ref.split(" ", 1)
        ref_code = ref_parts[0] if ref_parts else ""
        # Use the title portion from ref (reliable) rather than gp["title"]
        # which can contain raw Dolibarr HTML description for some projects
        title_from_ref = ref_parts[1] if len(ref_parts) > 1 else ref
        is_opportunity = ref_code.startswith("OPP-")
        is_rd = ref_code.startswith("RD-") or ref_code.startswith("CA-")

        # Gaaspard client field
        client_name = gp.get("client", "N/A") or "N/A"

        # Fetch Dolibarr details for financial data (tasks, invoices, proposals)
        time_spent_total = 0.0
        tasks_data: list = []
        invoiced_amount = 0.0
        invoices_data: list = []
        proposals_data: list = []

        with ThreadPoolExecutor(max_workers=3) as ex:
            t_future = ex.submit(self._get_tasks_data, project_id)
            i_future = ex.submit(self._get_invoices_data, project_id)
            p_future = ex.submit(self._get_proposals_data, project_id)

        try:
            time_spent_total, tasks_data = t_future.result(timeout=30)
        except Exception as e:
            logger.warning(f"Tasks fetch failed for {project_id}: {e}")
        try:
            invoiced_amount, invoices_data = i_future.result(timeout=30)
        except Exception as e:
            logger.warning(f"Invoices fetch failed for {project_id}: {e}")
        try:
            proposals_data = p_future.result(timeout=30)
        except Exception as e:
            logger.warning(f"Proposals fetch failed for {project_id}: {e}")

        timespent_by_user = self._extract_timespent_by_user(tasks_data)

        # Map Gaaspard status → Dolibarr-style numeric
        raw_status = gp.get("status", "open")
        status = "2" if raw_status == "closed" else "1"

        # Parse dates (Gaaspard gives YYYY-MM-DD strings → convert to timestamps)
        date_start = self._parse_date(gp.get("start_date"))
        date_end = self._parse_date(gp.get("end_date"))

        # Unittech from coordinators list (Gaaspard doesn't expose it directly)
        # Will be enriched later if needed; default empty
        unittech: list[int] = []

        return {
            "id": project_id,
            "ref": ref_code,
            "title": title_from_ref,
            "client_id": "",
            "client_name": client_name,
            "client_code": "",
            "client_address": "",
            "client_zip": "",
            "client_town": "",
            "client_country_code": "",
            "status": status,
            "date_start": date_start,
            "date_end": date_end,
            "budget_total": float(gp.get("budget_amount") or 0),
            "total_invoiced": invoiced_amount,
            "budget_remaining": float(gp.get("budget_amount") or 0),
            "is_opportunity": is_opportunity,
            "is_rd": is_rd,
            "description": "",
            "unittech": unittech,
            "wp_days": 0.0,
            "rd_days": 0.0,
            "budget_amount": float(gp.get("budget_amount") or 0),
            "opp_amount": float(gp.get("opp_amount") or 0),
            "opp_percent": float(gp.get("opp_percent") or 0),
            "time_spent_total": time_spent_total,
            "invoices": invoices_data,
            "proposals": proposals_data,
            "tasks": tasks_data,
            "timespent_by_user": timespent_by_user,
            # ── Champs enrichis depuis Gaaspard ──────────────────────────────
            "real_progress": gp.get("real_progress"),
            "declared_progress": gp.get("declared_progress"),
            "last_validated_progress": gp.get("last_validated_progress"),
            "prev_month_progress": gp.get("prev_month_progress"),
            "prev_month_validation": gp.get("prev_month_validation"),
            "health_warnings": gp.get("health_warnings", []),
            "mp_timesheets": gp.get("mp_timesheets"),
            "coordinators": gp.get("coordinators", []),
            "contributors": gp.get("contributors", []),
            "unittech_names": gp.get("unittech_names", []),
        }

    def _build_from_dolibarr(self, project_id: int) -> dict[str, Any] | None:
        """Full build from Dolibarr (fallback for extra projects)."""
        proj = self.dolibarr.get_project_by_id(project_id)
        if not proj:
            logger.warning(f"Project {project_id} not found")
            return None

        budget = float(proj.get("budget", 0) or 0)
        ref = proj.get("ref", "")
        is_opportunity = ref.startswith("OPP-") if ref else False
        is_rd = ref.startswith("RD-") if ref else False

        client_id = proj.get("socid", "")
        client_data = (
            self._get_thirdparty_name(client_id)
            if client_id
            else {
                "name": "N/A",
                "code": "",
                "address": "",
                "zip": "",
                "town": "",
                "country_code": "",
            }
        )
        client_name = (
            client_data.get("name", "N/A")
            if isinstance(client_data, dict)
            else client_data
        )

        array_options = proj.get("array_options", {}) or {}
        unittech_str = array_options.get("options_unittech", "") or ""
        unittech: list[int] = []
        if unittech_str:
            try:
                unittech = [int(v.strip()) for v in str(unittech_str).split(",")]
            except (ValueError, AttributeError):
                unittech = []

        wp_days = float(array_options.get("options_wp_days", 0) or 0)
        rd_days = float(array_options.get("options_rd_days", 0) or 0)
        budget_amount = float(proj.get("budget_amount", 0) or 0)
        opp_amount = float(proj.get("opp_amount", 0) or 0)
        opp_percent = float(proj.get("opp_percent", 0) or 0)

        time_spent_total = 0.0
        tasks_data: list = []
        invoiced_amount = 0.0
        invoices_data: list = []
        proposals_data: list = []

        with ThreadPoolExecutor(max_workers=3) as executor:
            t_f = executor.submit(self._get_tasks_data, project_id)
            i_f = executor.submit(self._get_invoices_data, project_id)
            p_f = executor.submit(self._get_proposals_data, project_id)

        try:
            time_spent_total, tasks_data = t_f.result(timeout=30)
            invoiced_amount, invoices_data = i_f.result(timeout=30)
            proposals_data = p_f.result(timeout=30)
        except Exception as e:
            logger.warning(f"Error fetching project data for {project_id}: {e}")

        timespent_by_user = self._extract_timespent_by_user(tasks_data)

        return {
            "id": int(proj.get("id", 0)),
            "ref": ref,
            "title": proj.get("title"),
            "client_id": client_id,
            "client_name": client_name,
            "client_code": client_data.get("code", "")
            if isinstance(client_data, dict)
            else "",
            "client_address": client_data.get("address", "")
            if isinstance(client_data, dict)
            else "",
            "client_zip": client_data.get("zip", "")
            if isinstance(client_data, dict)
            else "",
            "client_town": client_data.get("town", "")
            if isinstance(client_data, dict)
            else "",
            "client_country_code": client_data.get("country_code", "")
            if isinstance(client_data, dict)
            else "",
            "status": proj.get("status"),
            "date_start": proj.get("date_start"),
            "date_end": proj.get("date_end"),
            "budget_total": budget,
            "total_invoiced": invoiced_amount,
            "budget_remaining": budget,
            "is_opportunity": is_opportunity,
            "is_rd": is_rd,
            "description": proj.get("description", ""),
            "unittech": unittech,
            "wp_days": wp_days,
            "rd_days": rd_days,
            "budget_amount": budget_amount,
            "opp_amount": opp_amount,
            "opp_percent": opp_percent,
            "time_spent_total": time_spent_total,
            "invoices": invoices_data,
            "proposals": proposals_data,
            "tasks": tasks_data,
            "timespent_by_user": timespent_by_user,
            # Gaaspard fields absent for extra projects
            "real_progress": None,
            "declared_progress": None,
            "last_validated_progress": None,
            "prev_month_progress": None,
            "prev_month_validation": None,
            "health_warnings": [],
            "mp_timesheets": None,
            "coordinators": [],
            "contributors": [],
            "unittech_names": [],
        }

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_date(date_str: str | None) -> int | None:
        """Convert YYYY-MM-DD to Unix timestamp (noon UTC)."""
        if not date_str:
            return None
        try:
            from datetime import datetime, timezone

            dt = datetime.strptime(date_str, "%Y-%m-%d").replace(
                hour=12,
                tzinfo=timezone.utc,
            )
            return int(dt.timestamp())
        except (ValueError, TypeError):
            return None

    def _get_thirdparty_name(self, client_id: int) -> dict[str, Any]:
        """Get thirdparty name with thread-safe caching"""
        return _thirdparty_cache.get_or_set(
            client_id,
            lambda: self._fetch_thirdparty(client_id),
        )

    def _fetch_thirdparty(self, client_id: int) -> dict[str, Any]:
        """Fetch thirdparty from API"""
        try:
            thirdparty = self.dolibarr.get_thirdparty(int(client_id))
            return {
                "name": thirdparty.get("name", str(client_id)),
                "code": thirdparty.get("code_client", ""),
                "address": thirdparty.get("address", ""),
                "zip": thirdparty.get("zip", ""),
                "town": thirdparty.get("town", ""),
                "country_code": thirdparty.get("country_code", ""),
            }
        except Exception as e:
            logger.warning(
                "Failed to fetch thirdparty",
                extra={"context": {"client_id": client_id, "error": str(e)}},
            )
            return {
                "name": str(client_id),
                "code": "",
                "address": "",
                "zip": "",
                "town": "",
                "country_code": "",
            }

    def _get_tasks_data(self, project_id: int) -> tuple[float, list[dict]]:
        """Get tasks and calculate total time spent, including timespent details with dates"""
        time_spent_total = 0.0
        tasks_data = []

        try:
            tasks_response = self.dolibarr.get_project_tasks(project_id)
            tasks = self._normalize_response(tasks_response)

            if tasks:
                for task in tasks:
                    if not isinstance(task, dict):
                        continue

                    duration_effective = task.get("duration_effective", 0) or 0
                    task_id = task.get("id") or task.get("rowid")

                    try:
                        duration_float = float(duration_effective)
                        time_spent_total += duration_float

                        # Extract timespent lines with dates
                        timespent_lines = []
                        lines = task.get("lines", [])
                        if isinstance(lines, list):
                            for line in lines:
                                if not isinstance(line, dict):
                                    continue

                                timespent_date = line.get("timespent_line_date")
                                timespent_duration = line.get(
                                    "timespent_line_duration",
                                    0,
                                )
                                timespent_user_id = line.get("timespent_line_fk_user")

                                if timespent_date and timespent_duration:
                                    try:
                                        timespent_lines.append({
                                            "id": line.get("timespent_line_id"),
                                            "date": int(timespent_date),
                                            "duration": float(timespent_duration),
                                            "user_id": int(timespent_user_id)
                                            if timespent_user_id
                                            else None,
                                            "user_name": f"User {timespent_user_id}"
                                            if timespent_user_id
                                            else "Unknown",
                                        })
                                    except (ValueError, TypeError):
                                        continue

                        tasks_data.append(
                            {
                                "id": int(task_id) if task_id else None,
                                "ref": task.get("ref", ""),
                                "label": task.get("label", ""),
                                "duration_effective": duration_float,
                                "planned_workload": float(
                                    task.get("planned_workload", 0) or 0,
                                ),
                                "timespent_lines": timespent_lines,
                            },
                        )
                    except (ValueError, TypeError):
                        continue
        except Exception as e:
            logger.warning(
                "Error fetching tasks",
                extra={"context": {"project_id": project_id, "error": str(e)}},
            )

        return time_spent_total, tasks_data

    def _extract_timespent_by_user(
        self,
        tasks_data: list[dict],
    ) -> list[dict[str, Any]]:
        """Extract timespent by user from tasks"""
        timespent_by_user_dict = {}

        try:
            if tasks_data:
                for task in tasks_data:
                    if not isinstance(task, dict):
                        continue
                    lines = task.get("lines", [])
                    if isinstance(lines, list):
                        for line in lines:
                            if not isinstance(line, dict):
                                continue
                            user_id = line.get("timespent_line_fk_user")
                            duration = line.get("timespent_line_duration", 0)
                            if user_id:
                                try:
                                    duration_float = (
                                        float(duration) if duration else 0.0
                                    )
                                    if user_id not in timespent_by_user_dict:
                                        timespent_by_user_dict[user_id] = {
                                            "user_id": int(user_id),
                                            "user_name": f"User {user_id}",
                                            "total_duration": 0.0,
                                        }
                                    timespent_by_user_dict[user_id][
                                        "total_duration"
                                    ] += duration_float
                                except (ValueError, TypeError):
                                    continue
        except Exception as e:
            logger.warning(f"Error extracting timespent by user: {e}")

        return list(timespent_by_user_dict.values())

    def _get_invoices_data(self, project_id: int) -> tuple[float, list[dict]]:
        """Get invoices and calculate total invoiced amount"""
        invoiced_amount = 0.0
        invoices_data = []

        try:
            invoices = self.dolibarr.get_project_invoices(project_id)
            if invoices:
                for invoice in invoices:
                    total_ttc = invoice.get("total_ttc", 0) or 0
                    try:
                        invoiced_amount += float(total_ttc)
                        invoices_data.append(
                            {
                                "id": invoice.get("id"),
                                "ref": invoice.get("ref"),
                                "total": float(total_ttc),
                                "total_ht": float(invoice.get("total_ht", 0) or 0),
                                "date_validation": invoice.get("date_validation"),
                                "status": invoice.get("status"),
                            },
                        )
                    except (ValueError, TypeError):
                        continue
        except Exception as e:
            logger.warning(
                "Error fetching invoices",
                extra={"context": {"project_id": project_id, "error": str(e)}},
            )

        return invoiced_amount, invoices_data

    def _get_proposals_data(self, project_id: int) -> list[dict]:
        """Get proposals data"""
        proposals_data = []

        try:
            proposals = self.dolibarr.get_project_proposals(project_id)
            if proposals:
                for proposal in proposals:
                    try:
                        lines_total = 0.0
                        lines_details = []
                        proposal_lines = proposal.get("lines", [])
                        if proposal_lines:
                            for line in proposal_lines:
                                line_total = float(line.get("total_ttc", 0) or 0)
                                lines_total += line_total
                                lines_details.append(
                                    {
                                        "description": line.get("description", ""),
                                        "total": line_total,
                                        "rang": line.get("rang", 1),
                                    },
                                )

                        proposals_data.append(
                            {
                                "id": proposal.get("id"),
                                "ref": proposal.get("ref"),
                                "total": float(proposal.get("total_ttc", 0) or 0),
                                "total_ht": float(proposal.get("total_ht", 0) or 0),
                                "date_creation": proposal.get("date_creation"),
                                "date_signature": proposal.get("date_signature"),
                                "delivery_date": proposal.get("delivery_date"),
                                "status": proposal.get("status"),
                                "cond_reglement_doc": proposal.get(
                                    "cond_reglement_doc",
                                ),
                                "lines": lines_details,
                            },
                        )
                    except (ValueError, TypeError):
                        continue
        except Exception as e:
            logger.warning(
                "Error fetching proposals",
                extra={"context": {"project_id": project_id, "error": str(e)}},
            )

        return proposals_data

    @staticmethod
    def _normalize_response(response: Any) -> list:
        """Normaliser la réponse d'API en liste"""
        if isinstance(response, list):
            return response
        if isinstance(response, dict):
            if "data" in response:
                data = response["data"]
                return list(data.values()) if isinstance(data, dict) else data
            return list(response.values())
        return []
