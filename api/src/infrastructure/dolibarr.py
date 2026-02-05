"""Dolibarr API Client
Handles all API calls to Dolibarr REST API
"""

import logging
from typing import Any
from urllib.parse import urljoin

import httpx

logger = logging.getLogger(__name__)


class DolibarrClient:
    """Client for Dolibarr REST API"""

    def __init__(self, base_url: str, api_key: str):
        """Initialize Dolibarr client

        Args:
            base_url: Base URL of Dolibarr instance (e.g., https://dolibarr.example.com)
            api_key: API key for authentication

        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.Client(
            headers={
                "DOLAPIKEY": api_key,
                "Accept": "application/json",
            },
        )

    def _request(
        self,
        method: str,
        endpoint: str,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make HTTP request to Dolibarr API

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            params: Query parameters
            json: JSON body for POST requests

        Returns:
            Response JSON

        Raises:
            httpx.HTTPError: If request fails

        """
        url = urljoin(self.base_url, endpoint)

        try:
            response = self.client.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=30.0,
            )
            response.raise_for_status()

            if response.status_code == 204:
                return {}

            return response.json()

        except httpx.HTTPError as e:
            logger.error(f"Dolibarr API error: {e}")
            raise

    # ========== PROJECTS ==========

    def get_project_by_id(self, project_id: int) -> dict[str, Any]:
        """Get a specific project by ID"""
        return self._request(
            "GET",
            f"/api/index.php/projects/{project_id}",
        )

    def get_project_tasks(self, project_id: int) -> list[dict[str, Any]]:
        """Get all tasks for a project with timespent data"""
        return self._request(
            "GET",
            f"/api/index.php/projects/{project_id}/tasks",
            params={"includetimespent": "2"},
        )

    def get_project_invoices(self, project_id: int) -> list[dict[str, Any]]:
        """Get all invoices for a specific project"""
        return self._request(
            "GET",
            "/api/index.php/invoices",
            params={
                "sortfield": "t.rowid",
                "sortorder": "ASC",
                "limit": "100",
                "sqlfilters": f"(fk_projet:=:{project_id})",
            },
        )

    def get_project_proposals(self, project_id: int) -> list[dict[str, Any]]:
        """Get all proposals for a specific project"""
        return self._request(
            "GET",
            "/api/index.php/proposals",
            params={
                "sortfield": "t.rowid",
                "sortorder": "ASC",
                "limit": "100",
                "sqlfilters": f"(fk_projet:=:{project_id})",
            },
        )

    # ========== THIRDPARTIES (CLIENTS) ==========

    def get_thirdparty(self, thirdparty_id: int) -> dict[str, Any]:
        """Get thirdparty (client/company) details"""
        return self._request(
            "GET",
            f"/api/index.php/thirdparties/{thirdparty_id}",
        )

    # ========== USERS ==========

    def get_user(self, user_id: int) -> dict[str, Any]:
        """Get user details by ID"""
        return self._request(
            "GET",
            f"/api/index.php/users/{user_id}",
        )

    def __del__(self):
        """Cleanup: close the client"""
        self.client.close()
