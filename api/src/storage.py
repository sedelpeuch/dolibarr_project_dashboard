"""Data storage functions"""

import json
import logging
import os
from pathlib import Path

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def get_data_dir() -> Path:
    """Get the data directory from environment variable."""
    data_dir = os.getenv("DATA_DIR", "./data")
    path = Path(data_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_data_file() -> Path:
    """Get the path to the main data.json file."""
    return get_data_dir() / "data.json"


def initialize_data() -> None:
    """Initialize data.json with empty structure if it doesn't exist."""
    file_path = get_data_file()
    if not file_path.exists():
        default_data = {
            "meta_projects": [],
            "projects": [],
        }
        try:
            with open(file_path, "w") as f:
                json.dump(default_data, f, indent=2)
            logger.info(f"Initialized data file at {file_path}")
        except OSError as e:
            logger.error(f"Error initializing data file: {e}")


def load_data() -> dict:
    """Load all persistent data from JSON file."""
    file_path = get_data_file()
    if not file_path.exists():
        return {"meta_projects": [], "projects": []}

    try:
        with open(file_path) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logger.error(f"Error loading data: {e}")
        return {"meta_projects": [], "projects": []}


def save_data(data: dict) -> None:
    """Save all persistent data to JSON file."""
    file_path = get_data_file()
    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Error saving data: {e!s}")
