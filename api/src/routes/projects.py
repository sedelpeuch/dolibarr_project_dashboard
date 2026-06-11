"""Projects configuration routes"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import settings
from src.infrastructure import DolibarrClient, GaaspardClient, load_data, save_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["projects"])

dolibarr = DolibarrClient(settings.dolibarr_url, settings.doliapikey)
gaaspard = GaaspardClient(settings.dolibarr_url, settings.doliapikey)


class ProjectConfigRequest(BaseModel):
    """Request body for updating projects config"""

    projects: list[int]


@router.get("/projects-config")
def get_projects_config():
    """Get current projects config: Gaaspard projects + extra IDs from data.json"""
    try:
        # All projects the user is coordinator/contributor on
        gaaspard_projects = gaaspard.get_all_projects(include_closed=True)
        gaaspard_by_id = {int(p["rowid"]): p for p in gaaspard_projects}

        data = load_data()
        extra_ids = [
            pid for pid in data.get("projects", []) if pid not in gaaspard_by_id
        ]

        # Build project list: Gaaspard projects first (rich data), then extras via Dolibarr
        result = []
        for p in gaaspard_projects:
            ref = p.get("ref", "")
            ref_code = ref.split(" ")[0] if ref else ref
            result.append({
                "id": int(p["rowid"]),
                "ref": ref_code,
                "title": p.get("title", ""),
                "status": "closed" if p.get("status") == "closed" else "open",
                "source": "gaaspard",
            })

        # Extra projects: single Dolibarr calls
        for pid in extra_ids:
            try:
                proj = dolibarr.get_project_by_id(pid)
                result.append({
                    "id": pid,
                    "ref": proj.get("ref", str(pid)),
                    "title": proj.get("title", "Unknown"),
                    "status": proj.get("status"),
                    "source": "manual",
                })
            except Exception as e:
                logger.warning(f"Failed to fetch extra project {pid}: {e}")
                result.append({
                    "id": pid,
                    "ref": str(pid),
                    "title": "Unknown",
                    "status": None,
                    "source": "manual",
                })

        return {"projects": result}
    except Exception as e:
        logger.error(f"Error reading projects config: {e}")
        return {"projects": []}


@router.post("/projects-config")
def update_projects_config(request: ProjectConfigRequest):
    """Save extra project IDs (manual additions beyond Gaaspard scope)"""
    try:
        data = load_data()
        data["projects"] = request.projects
        save_data(data)
        return {"success": True, "projects": request.projects}
    except Exception as e:
        logger.error(f"Error updating projects config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
