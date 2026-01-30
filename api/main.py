"""Main FastAPI Application"""

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.config import settings
from api.dolibarr_client import DolibarrClient

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


# Cache for thirdparty data (client_id -> {name, code, address, zip, town, country_code})
_thirdparty_cache: dict[int, dict] = {}


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
                _thirdparty_cache[client_id] = {
                    "name": thirdparty.get("name", str(client_id)),
                    "code": thirdparty.get("code_client", ""),
                    "address": thirdparty.get("address", ""),
                    "zip": thirdparty.get("zip", ""),
                    "town": thirdparty.get("town", ""),
                    "country_code": thirdparty.get("country_code", ""),
                }
            except Exception as e:
                logger.warning(f"Failed to fetch thirdparty {client_id}: {e}")
                _thirdparty_cache[client_id] = {
                    "name": str(client_id),
                    "code": "",
                    "address": "",
                    "zip": "",
                    "town": "",
                    "country_code": "",
                }

        return _thirdparty_cache[client_id]
    except Exception:
        return {
            "name": str(client_id),
            "code": "",
            "address": "",
            "zip": "",
            "town": "",
            "country_code": "",
        }


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
                client_data = (
                    get_thirdparty_name(client_id)
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

                # Calculate total time spent on project and get task details
                time_spent_total = 0.0
                tasks_data = []
                try:
                    tasks_response = dolibarr.get_project_tasks(project_id)

                    # Handle different response formats
                    tasks = []
                    if isinstance(tasks_response, list):
                        tasks = tasks_response
                    elif isinstance(tasks_response, dict):
                        # If it's a dict, check for common wrapper keys
                        if "data" in tasks_response:
                            tasks = tasks_response["data"]
                            if isinstance(tasks, dict):
                                tasks = list(tasks.values())
                        else:
                            # Assume the dict values are tasks
                            tasks = list(tasks_response.values())

                    if tasks:
                        for task in tasks:
                            if not isinstance(task, dict):
                                continue
                            duration_effective = task.get("duration_effective", 0) or 0
                            try:
                                duration_float = float(duration_effective)
                                time_spent_total += duration_float
                                # Store task details - use int() to ensure it's an integer
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
                        f"Error fetching tasks for project {project_id}: {e}",
                    )
                    time_spent_total = 0.0
                    tasks_data = []

                # Extract timespent by user from tasks
                timespent_by_user_dict = {}
                try:
                    if tasks:
                        for task in tasks:
                            if not isinstance(task, dict):
                                continue
                            # Check for timespent lines in the task
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

                timespent_by_user = list(timespent_by_user_dict.values())

                # Calculate total invoiced amount and get invoice details
                invoiced_amount = 0.0
                invoices_data = []
                try:
                    invoices = dolibarr.get_project_invoices(project_id)
                    if invoices:
                        for invoice in invoices:
                            total_ttc = invoice.get("total_ttc", 0) or 0
                            try:
                                invoiced_amount += float(total_ttc)
                                # Store invoice details with ref and id for modal
                                invoices_data.append(
                                    {
                                        "id": invoice.get("id"),
                                        "ref": invoice.get("ref"),
                                        "total": float(total_ttc),
                                        "total_ht": float(
                                            invoice.get("total_ht", 0) or 0,
                                        ),
                                        "date_validation": invoice.get(
                                            "date_validation",
                                        ),
                                        "status": invoice.get("status"),
                                    },
                                )
                            except (ValueError, TypeError):
                                continue
                except Exception as e:
                    logger.warning(
                        f"Error fetching invoices for project {project_id}: {e}",
                    )
                    invoiced_amount = 0.0
                    invoices_data = []

                # Get proposal details
                proposals_data = []
                try:
                    proposals = dolibarr.get_project_proposals(project_id)
                    if proposals:
                        for proposal in proposals:
                            try:
                                # Get lines details
                                lines_total = 0.0
                                lines_details = []
                                proposal_lines = proposal.get("lines", [])
                                if proposal_lines:
                                    for line in proposal_lines:
                                        line_total = float(
                                            line.get("total_ttc", 0) or 0,
                                        )
                                        lines_total += line_total
                                        lines_details.append(
                                            {
                                                "description": line.get(
                                                    "description",
                                                    "",
                                                ),
                                                "total": line_total,
                                                "rang": line.get("rang", 1),
                                            },
                                        )

                                proposals_data.append(
                                    {
                                        "id": proposal.get("id"),
                                        "ref": proposal.get("ref"),
                                        "total": float(
                                            proposal.get("total_ttc", 0) or 0,
                                        ),
                                        "total_ht": float(
                                            proposal.get("total_ht", 0) or 0,
                                        ),
                                        "date_creation": proposal.get("date_creation"),
                                        "date_signature": proposal.get(
                                            "date_signature",
                                        ),
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
                        f"Error fetching proposals for project {project_id}: {e}",
                    )
                    proposals_data = []

                proj_enriched = {
                    "id": proj.get("id"),
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
