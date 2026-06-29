"""
Reminders API endpoints.
"""
from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from app.schemas import ReminderCreate, NotificationType
from app.repositories import reminder_repo, notification_repo
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_reminder(data: ReminderCreate) -> dict:
    try:
        result = await reminder_repo.create(data)
        
        # Create notification for new reminder
        try:
            await notification_repo.create(
                type="reminder",
                title=f"New {data.type} Reminder",
                body=data.message or f"Reminder scheduled for {data.scheduled_at}",
                patient_id=str(data.patient_id)
            )
        except Exception:
            pass
            
        return result
    except Exception as e:
        logger.exception(f"Error creating reminder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", status_code=status.HTTP_200_OK)
async def get_pending_reminders(patient_id: Optional[str] = None) -> list:
    """Get pending reminders, optionally filtered by patient."""
    try:
        if patient_id:
            db = get_supabase()
            res = (
                db.table("reminders")
                .select("*")
                .eq("patient_id", patient_id)
                .eq("status", "pending")
                .order("scheduled_at", desc=False)
                .execute()
            )
            return res.data or []
        return await reminder_repo.get_pending()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
