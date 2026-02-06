"""Projects configuration routes"""

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import settings
from src.infrastructure import DolibarrClient, load_data, save_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["projects"])

# Initialize Dolibarr client
dolibarr = DolibarrClient(settings.dolibarr_url, settings.doliapikey)


class ProjectConfigRequest(BaseModel):
    """Request body for updating projects config"""

    projects: list[int]


class ProjectInfo(BaseModel):
    """Project info with name"""

    id: int
    title: str
    ref: str


def _get_adaptive_workers(total_items: int) -> int:
    """Calculate adaptive number of workers based on item count"""
    if total_items < 5:
        return 2
    if total_items < 15:
        return 5
    return 3


def _fetch_project_config(project_id: int) -> dict[str, Any]:
    """Fetch single project config"""
    try:
        proj = dolibarr.get_project_by_id(project_id)
        return {
            "id": proj.get("id"),
            "title": proj.get("title"),
            "ref": proj.get("ref"),
            "status": proj.get("status"),
        }
    except Exception as e:
        logger.warning(f"Failed to fetch project {project_id}: {e}")
        return {
            "id": project_id,
            "title": "Unknown",
            "ref": "Unknown",
            "status": None,
        }


@router.get("/projects-config")
def get_projects_config():
    """Get current projects configuration with names"""
    try:
        data = load_data()
        project_ids = data.get("projects", [])

        if not project_ids:
            return {"projects": []}

        # Paralléliser la récupération des détails des projets avec workers adaptatifs
        max_workers = _get_adaptive_workers(len(project_ids))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            projects_with_names = list(
                executor.map(_fetch_project_config, project_ids, timeout=30),
            )

        return {
            "projects": projects_with_names,
        }
    except Exception as e:
        logger.error(f"Error reading projects config: {e}")
        return {"projects": []}


@router.post("/projects-config")
def update_projects_config(request: ProjectConfigRequest):
    """Update projects configuration"""
    try:
        data = load_data()
        data["projects"] = request.projects
        save_data(data)

        logger.info(f"Updated projects config with {len(request.projects)} projects")

        return {
            "success": True,
            "projects": request.projects,
        }
    except Exception as e:
        logger.error(f"Error updating projects config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
