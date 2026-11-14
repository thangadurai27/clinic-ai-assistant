"""
Notifications API.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_staff_user
from app.demo import data as demo_data
from app.demo.service import is_demo_user
from app.repositories import notification_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", status_code=200)
async def list_notifications(limit: int = 50, user: dict = Depends(get_staff_user)) -> list:
    if is_demo_user(user):
        return demo_data.notifications(limit)
    try:
        return await notification_repo.get_all(limit=limit)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/unread-count", status_code=200)
async def unread_count(user: dict = Depends(get_staff_user)) -> dict:
    if is_demo_user(user):
        return {"count": demo_data.unread_notification_count()}
    count = await notification_repo.count_unread()
    return {"count": count}


@router.patch("/{notification_id}/read", status_code=200)
async def mark_read(notification_id: str, user: dict = Depends(get_staff_user)) -> dict:
    if is_demo_user(user):
        return demo_data.mark_notification_read(notification_id)
    try:
        return await notification_repo.mark_read(notification_id)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/mark-all-read", status_code=200)
async def mark_all_read(user: dict = Depends(get_staff_user)) -> dict:
    if is_demo_user(user):
        demo_data.mark_all_notifications_read()
        return {"ok": True, "simulated": True}
    await notification_repo.mark_all_read()
    return {"ok": True}
