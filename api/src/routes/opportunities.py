"""Opportunities routes"""

import logging

from fastapi import APIRouter, HTTPException

from src.config import settings
from src.infrastructure import DolibarrClient
from src.services.opportunity_service import OpportunitiesService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["opportunities"])

# Initialize Dolibarr client
dolibarr = DolibarrClient(settings.dolibarr_url, settings.doliapikey)

# Initialize opportunities service
opportunities_service = OpportunitiesService(dolibarr)


@router.get("/api/opportunities/stats")
def get_opportunities_stats():
    """Get opportunity statistics (conversion rate, amounts, etc.)"""
    try:
        return opportunities_service.get_stats()
    except Exception as e:
        logger.error(f"Error getting opportunity stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/opportunities/pipeline")
def get_opportunities_pipeline():
    """Get opportunities grouped by pipeline stage"""
    try:
        return opportunities_service.get_pipeline()
    except Exception as e:
        logger.error(f"Error getting opportunity pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
