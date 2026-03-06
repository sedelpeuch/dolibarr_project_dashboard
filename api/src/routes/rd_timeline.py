"""Routes for RD timeline management"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from src.infrastructure import load_data, save_data

logger = logging.getLogger(__name__)

router = APIRouter(tags=["rd-timeline"])


@router.get("/api/rd-timeline")
def get_rd_timeline():
    try:
        data = load_data()
        rd = data.get("rdTimeline", [])

        # Remove items whose date is older than 3 months and persist the change
        now = datetime.utcnow()
        cutoff = now - timedelta(days=90)

        def to_dt(ts):
            try:
                # support seconds or milliseconds
                ts = int(ts)
                if ts > 1_000_000_000_000:
                    return datetime.utcfromtimestamp(ts / 1000)
                return datetime.utcfromtimestamp(ts)
            except Exception:
                return None

        cleaned = []
        removed = False
        for it in rd:
            dt = to_dt(it.get("date"))
            if dt is None:
                # keep items with invalid date formats
                cleaned.append(it)
                continue
            if dt >= cutoff:
                cleaned.append(it)
            else:
                removed = True

        if removed:
            data["rdTimeline"] = cleaned
            save_data(data)

        return cleaned
    except Exception as e:
        logger.error(f"Error loading rd timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/rd-timeline")
def add_rd_item(item: dict):
    try:
        data = load_data()
        rd = data.get("rdTimeline", [])
        rd.append(item)
        data["rdTimeline"] = rd
        save_data(data)
        return item
    except Exception as e:
        logger.error(f"Error saving rd item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/rd-timeline/{item_id}")
def update_rd_item(item_id: str, item: dict):
    try:
        data = load_data()
        rd = data.get("rdTimeline", [])
        updated = []
        found = False
        for it in rd:
            if it.get("id") == item_id:
                updated.append(item)
                found = True
            else:
                updated.append(it)
        if not found:
            raise HTTPException(status_code=404, detail="Item not found")
        data["rdTimeline"] = updated
        save_data(data)
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rd item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/rd-timeline/{item_id}")
def delete_rd_item(item_id: str):
    try:
        data = load_data()
        rd = data.get("rdTimeline", [])
        new = [it for it in rd if it.get("id") != item_id]
        if len(new) == len(rd):
            raise HTTPException(status_code=404, detail="Item not found")
        data["rdTimeline"] = new
        save_data(data)
        return {"deleted": item_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting rd item: {e}")
        raise HTTPException(status_code=500, detail=str(e))
