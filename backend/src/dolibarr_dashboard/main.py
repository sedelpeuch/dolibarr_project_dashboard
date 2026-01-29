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

                proj_enriched = {
                    "id": proj.get("id"),
                    "ref": ref,
                    "title": proj.get("title"),
                    "client_name": proj.get("socid", ""),
                    "status": proj.get("status"),
                    "deadline": proj.get("date_end"),
                    "budget_total": budget,
                    "total_invoiced": 0,
                    "budget_remaining": budget,
                    "is_opportunity": is_opportunity,
                    "is_rd": is_rd,
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
