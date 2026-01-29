"""Main FastAPI Application"""

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from dolibarr_dashboard.config import settings
from dolibarr_dashboard.dolibarr_client import DolibarrClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
                    "total_invoiced": 0,
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        reload=(settings.fastapi_env == "development"),
    )
