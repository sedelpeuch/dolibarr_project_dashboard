"""Main FastAPI Application"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.infrastructure import initialize_data
from src.routes import dashboard, meta_projects, opportunities, projects

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disable verbose httpx logging
logging.getLogger("httpx").setLevel(logging.WARNING)

# Initialize data files
initialize_data()

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

# Include routers
app.include_router(meta_projects.router)
app.include_router(projects.router)
app.include_router(dashboard.router)
app.include_router(opportunities.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        reload=(settings.fastapi_env == "development"),
    )
