"""Projects configuration routes"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import settings
from src.dolibarr_client import DolibarrClient
from src.storage import load_data, save_data

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


@router.get("/projects-config")
def get_projects_config():
    """Get current projects configuration with names"""
    try:
        data = load_data()
        project_ids = data.get("projects", [])

        projects_with_names: list[dict[str, Any]] = []

        for project_id in project_ids:
            try:
                proj = dolibarr.get_project_by_id(project_id)
                projects_with_names.append(
                    {
                        "id": proj.get("id"),
                        "title": proj.get("title"),
                        "ref": proj.get("ref"),
                        "status": proj.get("status"),
                    },
                )
            except Exception as e:
                logger.warning(f"Failed to fetch project {project_id}: {e}")
                # Still add the project even if we can't fetch details
                projects_with_names.append(
                    {
                        "id": project_id,
                        "title": "Unknown",
                        "ref": "Unknown",
                        "status": None,
                    },
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
