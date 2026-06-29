"""
Notifications API.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException
from app.repositories import notification_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", status_code=200)
async def list_notifications(limit: int = 50) -> list:
    try:
        return await notification_repo.get_all(limit=limit)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/unread-count", status_code=200)
async def unread_count() -> dict:
    count = await notification_repo.count_unread()
    return {"count": count}


@router.patch("/{notification_id}/read", status_code=200)
async def mark_read(notification_id: str) -> dict:
    try:
        return await notification_repo.mark_read(notification_id)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/mark-all-read", status_code=200)
async def mark_all_read() -> dict:
    await notification_repo.mark_all_read()
    return {"ok": True}
