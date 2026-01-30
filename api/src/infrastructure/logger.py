"""Logging configuration"""

import json
import logging


class StructuredFormatter(logging.Formatter):
    """Formatter pour logs structurés en JSON"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Ajouter exception si présente
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Ajouter contexte personnalisé
        if hasattr(record, "context"):
            log_data.update(record.context)

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(level: str = "INFO") -> None:
    """Configure logging structuré pour l'application"""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Handler console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(console_handler)

    # Réduire le bruit des libs externes
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.LoggerAdapter:
    """Obtenir un logger avec contexte structuré"""
    logger = logging.getLogger(name)
    return logging.LoggerAdapter(logger, {})
