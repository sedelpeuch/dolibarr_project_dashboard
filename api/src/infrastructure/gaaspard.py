"""Gaaspard Rails API Client
Handles all API calls to the Gaaspard custom Rails API (complement to Dolibarr).
Base URL: {dolibarr_url}/rails/api/
Auth: DOLAPIKEY header (same key as Dolibarr)
"""

import logging
from typing import Any
from urllib.parse import urljoin

import httpx

logger = logging.getLogger(__name__)


class GaaspardClient:
    """Client for the Gaaspard Rails API"""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/") + "/rails/api"
        self.api_key = api_key
        self.client = httpx.Client(
            headers={
                "DOLAPIKEY": api_key,
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    def _get(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        url = urljoin(self.base_url + "/", endpoint.lstrip("/"))
        try:
            response = self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Gaaspard API error [{endpoint}]: {e}")
            raise

    # ── Project lists ──────────────────────────────────────────────────────────

    def get_projects(self, include_closed: bool = True) -> list[dict[str, Any]]:
        """All projects flat (160+), raw Dolibarr fields incl. fk_opp_status.
        Use this when you need fk_opp_status or full raw data.
        """
        params = {"closed": "1"} if include_closed else {}
        data = self._get("/projects", params)
        return data if isinstance(data, list) else []

    def get_projects_index(self, include_closed: bool = True) -> list[dict[str, Any]]:
        """B2B / collaborative projects (PJ-*). Returns flat list."""
        params = {"closed": "1"} if include_closed else {}
        data = self._get("/projects_index", params)
        result = []
        for bucket in data.values():
            result.extend(bucket)
        return result

    def get_rd_index(self, include_closed: bool = True) -> list[dict[str, Any]]:
        """R&D / internal projects (RD-*, CA-*). Returns flat list."""
        params = {"closed": "1"} if include_closed else {}
        data = self._get("/rd_index", params)
        return data.get("rd_projects", [])

    def get_opportunities_index(
        self,
        include_closed: bool = True,
    ) -> list[dict[str, Any]]:
        """Opportunities (OPP-*). Returns flat list."""
        params = {"closed": "1"} if include_closed else {}
        data = self._get("/opportunities_index", params)
        return data.get("opportunities", [])

    def get_all_projects(self, include_closed: bool = True) -> list[dict[str, Any]]:
        """All project types merged in one call (3 parallel requests)."""
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
            f_pj = ex.submit(self.get_projects_index, include_closed)
            f_rd = ex.submit(self.get_rd_index, include_closed)
            f_opp = ex.submit(self.get_opportunities_index, include_closed)
        return f_pj.result() + f_rd.result() + f_opp.result()

    # ── Project detail ─────────────────────────────────────────────────────────

    def get_project_objectives(self, project_id: int, year: int) -> dict[str, Any]:
        """Objectives + person breakdown + monthly reports for a year."""
        return self._get(f"/projects/{project_id}/objectives/{year}")

    def get_project_task_workloads(self, project_id: int) -> dict[str, Any]:
        """All planned task workloads (all years)."""
        return self._get(f"/projects/{project_id}/all_task_planned_workloads")

    def get_project_task_year_workloads(
        self,
        project_id: int,
        year: int,
    ) -> dict[str, Any]:
        """Planned task workloads for a specific year."""
        return self._get(f"/projects/{project_id}/task_year_workloads/{year}")

    def get_project_health(self, project_id: int) -> dict[str, Any]:
        """Health indicators / warnings for a project."""
        return self._get(f"/projects/{project_id}/health")

    # ── Person report ──────────────────────────────────────────────────────────

    def get_person_report(self, user_id: int, month: str) -> dict[str, Any]:
        """Full yearly report for a user (capacity, pointage, planned_workload).
        month: YYYY-MM-DD (any day in the target year works)
        """
        return self._get("/person_report", params={"user_id": user_id, "month": month})

    # ── Charge (plan de charge) ────────────────────────────────────────────────

    def get_charge(self) -> dict[str, Any]:
        """Plan de charge — projects + persons + monthly_reports."""
        return self._get("/charge")
