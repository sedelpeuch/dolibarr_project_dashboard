"""Dolibarr routes"""

import logging

from fastapi import APIRouter, HTTPException

from src.config import settings
from src.infrastructure import DolibarrClient
from src.services import DashboardService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dolibarr"])

# Initialize Dolibarr client
dolibarr = DolibarrClient(settings.dolibarr_url, settings.doliapikey)

# Initialize dashboard service
dashboard_service = DashboardService(dolibarr)


@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@router.get("/api/config")
def get_config():
    """Get public configuration (dolibarr URL)"""
    return {"dolibarrUrl": settings.dolibarr_url}


@router.get("/api/dashboard")
def get_dashboard():
    """Main dashboard endpoint - aggregated data for tracked projects"""
    try:
        return dashboard_service.get_dashboard_data()
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/search-project/{project_id}")
def search_project(project_id: int):
    """Search for a project in Dolibarr by ID"""
    try:
        proj = dolibarr.get_project_by_id(project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")

        return {
            "id": proj.get("id"),
            "title": proj.get("title"),
            "ref": proj.get("ref"),
            "status": proj.get("status"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
