"""Dolibarr routes"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import settings
from src.infrastructure import DolibarrClient
from src.infrastructure.storage import load_data, save_data
from src.services import DashboardService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dolibarr"])

# Initialize Dolibarr client
dolibarr = DolibarrClient(settings.dolibarr_url, settings.doliapikey)

# Initialize dashboard service
dashboard_service = DashboardService(dolibarr)


class CoordinatorProjectsRequest(BaseModel):
    """Request model for saving coordinator projects"""

    coordinatorProjects: list[int]


class ProjectPeriod(BaseModel):
    """A work period on a project"""

    start: str
    end: str
    days: float


class ParticipationItem(BaseModel):
    """A single project participation entry"""

    project_id: int
    days: float
    active: bool = True
    periods: list[ProjectPeriod] | None = None


class VacationPeriod(BaseModel):
    """A continuous vacation period"""

    id: str
    start: str
    end: str
    label: str | None = None


class WorkloadConfigRequest(BaseModel):
    """Request model for saving workload config"""

    participations: list[ParticipationItem]
    vacation_periods: list[VacationPeriod] = []


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


@router.get("/api/current-user")
def get_current_user():
    """Get currently authenticated user details"""
    try:
        user = dolibarr.get_user(settings.current_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user.get("id"),
            "firstname": user.get("firstname", ""),
            "lastname": user.get("lastname", ""),
            "email": user.get("email", ""),
            "job": user.get("job"),
            "login": user.get("login", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading current user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/coordinator-projects")
def get_coordinator_projects():
    """Get list of project IDs where user is coordinator"""
    try:
        data = load_data()
        # Initialize coordinatorProjects if it doesn't exist
        if "coordinatorProjects" not in data:
            data["coordinatorProjects"] = []
            save_data(data)
        return {"coordinatorProjects": data.get("coordinatorProjects", [])}
    except Exception as e:
        logger.error(f"Error loading coordinator projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/coordinator-projects")
def save_coordinator_projects(request: CoordinatorProjectsRequest):
    """Save list of project IDs where user is coordinator"""
    try:
        data = load_data()
        data["coordinatorProjects"] = request.coordinatorProjects
        save_data(data)

        return {"success": True, "coordinatorProjects": data["coordinatorProjects"]}
    except Exception as e:
        logger.error(f"Error saving coordinator projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/workload")
def get_workload():
    """Get workload config (project participations + vacations)"""
    try:
        data = load_data()
        return data.get("workload", {"participations": [], "vacation_periods": []})
    except Exception as e:
        logger.error(f"Error loading workload config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/workload")
def save_workload(request: WorkloadConfigRequest):
    """Save workload config (project participations + vacations)"""
    try:
        data = load_data()
        data["workload"] = {
            "participations": [p.model_dump() for p in request.participations],
            "vacation_periods": [v.model_dump() for v in request.vacation_periods],
        }
        save_data(data)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error saving workload config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
