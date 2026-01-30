"""Meta-projects routes"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.storage import load_data, save_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["meta-projects"])


class MetaProject(BaseModel):
    id: str
    name: str
    projectIds: list[int]
    createdAt: str


@router.get("/meta-projects")
def list_meta_projects() -> list[MetaProject]:
    """List all meta-projects."""
    data = load_data()
    projects = data.get("meta_projects", [])
    return [MetaProject(**p) for p in projects]


@router.post("/meta-projects")
def create_meta_project(project: MetaProject) -> MetaProject:
    """Create a new meta-project."""
    data = load_data()
    projects = data.get("meta_projects", [])

    # Check for duplicate ID
    if any(p["id"] == project.id for p in projects):
        raise HTTPException(
            status_code=400,
            detail="Meta-project with this ID already exists",
        )

    # Add createdAt if not present
    project_dict = project.model_dump()
    if not project_dict.get("createdAt"):
        project_dict["createdAt"] = datetime.now().isoformat()

    projects.append(project_dict)
    data["meta_projects"] = projects
    save_data(data)

    return MetaProject(**project_dict)


@router.put("/meta-projects/{project_id}")
def update_meta_project(project_id: str, project: MetaProject) -> MetaProject:
    """Update an existing meta-project."""
    data = load_data()
    projects = data.get("meta_projects", [])

    # Find and update
    for i, p in enumerate(projects):
        if p["id"] == project_id:
            updated = project.model_dump()
            # Keep original createdAt
            updated["createdAt"] = p.get("createdAt", datetime.now().isoformat())
            projects[i] = updated
            data["meta_projects"] = projects
            save_data(data)
            return MetaProject(**updated)

    raise HTTPException(status_code=404, detail="Meta-project not found")


@router.delete("/meta-projects/{project_id}")
def delete_meta_project(project_id: str) -> dict:
    """Delete a meta-project."""
    data = load_data()
    projects = data.get("meta_projects", [])

    # Filter out the project
    original_count = len(projects)
    projects = [p for p in projects if p["id"] != project_id]

    if len(projects) == original_count:
        raise HTTPException(status_code=404, detail="Meta-project not found")

    data["meta_projects"] = projects
    save_data(data)

    return {"success": True}
