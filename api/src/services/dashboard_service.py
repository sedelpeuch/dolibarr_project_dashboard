"""Dashboard service - business logic for dashboard"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from src.infrastructure import DolibarrClient, ThreadSafeCache, load_data

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
    """Service pour construire les données du dashboard"""

    def __init__(self, dolibarr_client: DolibarrClient):
        self.dolibarr = dolibarr_client

    def get_dashboard_data(self) -> dict[str, list]:
        """Construire les données complètes du dashboard"""
        try:
            # Charger la liste des projets depuis data.json
            data = load_data()
            tracked_project_ids = data.get("projects", [])

            if not tracked_project_ids:
                return {"projects": []}

            projects = []
            # Paralléliser la construction des données de projet avec workers adaptatifs
            max_workers = _get_adaptive_workers(len(tracked_project_ids))
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Soumettre tous les projets
                future_to_id = {
                    executor.submit(self._build_project_data, project_id): project_id
                    for project_id in tracked_project_ids
                }
                # Récupérer les résultats au fur et à mesure
                for future in as_completed(future_to_id):
                    project_id = future_to_id[future]
                    try:
                        project_data = future.result(timeout=30)
                        if project_data:
                            projects.append(project_data)
                    except Exception as e:
                        logger.warning(
                            "Error processing project",
                            extra={
                                "context": {"project_id": project_id, "error": str(e)}
                            },
                        )
                        continue

            return {"projects": projects}

        except Exception as e:
            logger.error(
                "Error building dashboard",
                extra={"context": {"error": str(e)}},
            )
            raise

    def _build_project_data(self, project_id: int) -> dict[str, Any] | None:
        """Construire les données d'un projet spécifique"""
        # Get project details
        proj = self.dolibarr.get_project_by_id(project_id)

        if not proj:
            logger.warning(f"Project {project_id} not found")
            return None

        # Convert budget to float, handling string values
        budget = float(proj.get("budget", 0) or 0)

        # Determine classification based on ref prefix
        ref = proj.get("ref", "")
        is_opportunity = ref.startswith("OPP-") if ref else False
        is_rd = ref.startswith("RD-") if ref else False

        # Get client name with caching
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

        # Extract custom fields
        array_options = proj.get("array_options", {}) or {}

        # Parse unittech
        unittech_str = array_options.get("options_unittech", "") or ""
        unittech = []
        if unittech_str:
            try:
                unittech = [int(val.strip()) for val in str(unittech_str).split(",")]
            except (ValueError, AttributeError):
                unittech = []

        wp_days = float(array_options.get("options_wp_days", 0) or 0)
        rd_days = float(array_options.get("options_rd_days", 0) or 0)

        # Budget amounts
        budget_amount = float(proj.get("budget_amount", 0) or 0)
        opp_amount = float(proj.get("opp_amount", 0) or 0)
        opp_percent = float(proj.get("opp_percent", 0) or 0)

        # Paralléliser les 3 appels API internes (tasks, invoices, proposals)
        time_spent_total = 0.0
        tasks_data = []
        invoiced_amount = 0.0
        invoices_data = []
        proposals_data = []

        with ThreadPoolExecutor(max_workers=3) as executor:
            tasks_future = executor.submit(self._get_tasks_data, project_id)
            invoices_future = executor.submit(self._get_invoices_data, project_id)
            proposals_future = executor.submit(self._get_proposals_data, project_id)

            try:
                time_spent_total, tasks_data = tasks_future.result(timeout=30)
                invoiced_amount, invoices_data = invoices_future.result(timeout=30)
                proposals_data = proposals_future.result(timeout=30)
            except Exception as e:
                logger.warning(
                    "Error fetching project data",
                    extra={"context": {"project_id": project_id, "error": str(e)}},
                )

        # Extract timespent by user from tasks
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
        }

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
        """Get tasks and calculate total time spent"""
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
                    try:
                        duration_float = float(duration_effective)
                        time_spent_total += duration_float
                        task_id = task.get("id") or task.get("rowid")
                        tasks_data.append(
                            {
                                "id": int(task_id) if task_id else None,
                                "ref": task.get("ref", ""),
                                "label": task.get("label", ""),
                                "duration_effective": duration_float,
                                "planned_workload": float(
                                    task.get("planned_workload", 0) or 0,
                                ),
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
