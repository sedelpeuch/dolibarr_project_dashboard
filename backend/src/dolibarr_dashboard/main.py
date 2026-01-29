"""Main FastAPI Application"""

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dolibarr_dashboard.config import settings
from dolibarr_dashboard.dolibarr_client import DolibarrClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disable verbose httpx logging
logging.getLogger("httpx").setLevel(logging.WARNING)

# Initialize FastAPI app
app = FastAPI(
    title="Dolibarr Dashboard API",
    description="API for project coordinator dashboard",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Dolibarr client
dolibarr = DolibarrClient(
    base_url=settings.dolibarr_url,
    api_key=settings.doliapikey,
)


# Cache for thirdparty names (client_id -> name)
_thirdparty_cache: dict[int, str] = {}


def get_projects_config_path() -> Path:
    """Get the path to projects.json"""
    # Path to the backend root directory
    backend_root = Path(__file__).parent.parent.parent
    config_file = backend_root / "projects.json"
    return config_file


def get_thirdparty_name(client_id: int) -> str:
    """Get thirdparty name with caching"""
    try:
        if client_id not in _thirdparty_cache:
            try:
                thirdparty = dolibarr.get_thirdparty(int(client_id))
                _thirdparty_cache[client_id] = thirdparty.get("name", str(client_id))
            except Exception as e:
                logger.warning(f"Failed to fetch thirdparty {client_id}: {e}")
                _thirdparty_cache[client_id] = str(client_id)

        return _thirdparty_cache[client_id]
    except Exception:
        return str(client_id)


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/api/dashboard")
def get_dashboard():
    """Main dashboard endpoint
    Returns aggregated data for tracked projects from projects.json
    """
    try:
        # Get list of projects to track from configuration
        tracked_project_ids = settings.tracked_projects

        if not tracked_project_ids:
            return {"projects": []}

        projects = []
        for project_id in tracked_project_ids:
            try:
                # Get project details
                proj = dolibarr.get_project_by_id(project_id)

                if not proj:
                    logger.warning(f"Project {project_id} not found")
                    continue

                # Convert budget to float, handling string values
                budget = float(proj.get("budget", 0) or 0)

                # Determine classification based on ref prefix
                ref = proj.get("ref", "")
                is_opportunity = ref.startswith("OPP-") if ref else False
                is_rd = ref.startswith("RD-") if ref else False

                # Get client name with caching
                client_id = proj.get("socid", "")
                client_name = get_thirdparty_name(client_id) if client_id else "N/A"

                # Extract custom fields
                array_options = proj.get("array_options", {}) or {}

                # Parse unittech - can be comma-separated values like '3,1'
                unittech_str = array_options.get("options_unittech", "") or ""
                unittech = []
                if unittech_str:
                    try:
                        unittech = [
                            int(val.strip()) for val in str(unittech_str).split(",")
                        ]
                    except (ValueError, AttributeError):
                        unittech = []

                wp_days = float(array_options.get("options_wp_days", 0) or 0)
                rd_days = float(array_options.get("options_rd_days", 0) or 0)

                # Budget amounts
                budget_amount = float(proj.get("budget_amount", 0) or 0)
                opp_amount = float(proj.get("opp_amount", 0) or 0)
                opp_percent = float(proj.get("opp_percent", 0) or 0)

                # Calculate total time spent on project
                time_spent_total = 0.0
                try:
                    tasks = dolibarr.get_project_tasks(project_id)
                    if tasks:
                        for task in tasks:
                            duration_effective = task.get("duration_effective", 0) or 0
                            try:
                                time_spent_total += float(duration_effective)
                            except (ValueError, TypeError):
                                continue
                except Exception as e:
                    logger.warning(
                        f"Error fetching tasks for project {project_id}: {e}",
                    )
                    time_spent_total = 0.0

                # Calculate total invoiced amount for project
                invoiced_amount = 0.0
                try:
                    invoices = dolibarr.get_project_invoices(project_id)
                    if invoices:
                        for invoice in invoices:
                            total_ttc = invoice.get("total_ttc", 0) or 0
                            try:
                                invoiced_amount += float(total_ttc)
                            except (ValueError, TypeError):
                                continue
                except Exception as e:
                    logger.warning(
                        f"Error fetching invoices for project {project_id}: {e}",
                    )
                    invoiced_amount = 0.0

                proj_enriched = {
                    "id": proj.get("id"),
                    "ref": ref,
                    "title": proj.get("title"),
                    "client_id": client_id,
                    "client_name": client_name,
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
                }
                projects.append(proj_enriched)

            except Exception as e:
                logger.warning(f"Error processing project {project_id}: {e}")
                continue

        return {
            "projects": projects,
        }

    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== PROJECT CONFIG MANAGEMENT ==========


class ProjectConfigRequest(BaseModel):
    """Request body for updating projects config"""

    projects: list[int]


class ProjectInfo(BaseModel):
    """Project info with name"""

    id: int
    title: str
    ref: str


@app.get("/api/projects-config")
def get_projects_config():
    """Get current projects configuration with names"""
    try:
        config_path = get_projects_config_path()

        if not config_path.exists():
            logger.error(f"Config file not found at {config_path}")
            return {"projects": []}

        with open(config_path) as f:
            config = json.load(f)

        project_ids = config.get("projects", [])

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


@app.post("/api/projects-config")
def update_projects_config(request: ProjectConfigRequest):
    """Update projects configuration"""
    try:
        config_path = get_projects_config_path()

        config = {
            "projects": request.projects,
            "description": "Liste des projets à suivre dans le dashboard",
        }

        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        logger.info(f"Updated projects config with {len(request.projects)} projects")

        return {
            "success": True,
            "projects": request.projects,
        }
    except Exception as e:
        logger.error(f"Error updating projects config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search-project/{project_id}")
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        reload=(settings.fastapi_env == "development"),
    )
