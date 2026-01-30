"""Configuration management for Dolibarr Dashboard Backend"""

import json
import os
from pathlib import Path


class Settings:
    """Application settings loaded from environment variables"""

    def __init__(self):
        """Load settings from environment variables"""
        # Dolibarr API Configuration (required)
        self.dolibarr_url: str = os.getenv("DOLIBARR_URL", "")
        self.doliapikey: str = os.getenv("DOLIAPIKEY", "")

        if not self.dolibarr_url or not self.doliapikey:
            raise ValueError(
                "Missing required environment variables: DOLIBARR_URL and DOLIAPIKEY. "
                "Please source your .env file: source .env",
            )

        self.current_user_id: int = int(os.getenv("CURRENT_USER_ID", "42"))

        # FastAPI Configuration
        self.fastapi_host: str = os.getenv("FASTAPI_HOST", "0.0.0.0")
        self.fastapi_port: int = int(os.getenv("FASTAPI_PORT", "8000"))
        self.fastapi_env: str = os.getenv("FASTAPI_ENV", "development")

        # Load projects whitelist from file
        self.tracked_projects: list[int] = self._load_tracked_projects()

        # CORS Configuration
        cors_origins_str = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000",
        )
        self.cors_origins: list[str] = [
            origin.strip() for origin in cors_origins_str.split(",")
        ]

    def _load_tracked_projects(self) -> list[int]:
        """Load tracked projects list from data/data.json file"""
        data_dir = os.getenv("DATA_DIR", "./data")
        projects_file = Path(data_dir) / "data.json"
        if not projects_file.exists():
            return []

        try:
            with open(projects_file) as f:
                data = json.load(f)
                return data.get("projects", [])
        except (OSError, json.JSONDecodeError) as e:
            print(f"Warning: Could not load data.json: {e}")
            return []


settings = Settings()
