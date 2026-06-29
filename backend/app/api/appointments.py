"""
Appointments API endpoints.
"""
from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.repositories import appointment_repo, notification_repo
from app.schemas import AppointmentCreate, AppointmentRead, NotificationType
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/appointments", tags=["Appointments"])


class AppointmentStatusUpdate(BaseModel):
    status: str


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(data: AppointmentCreate) -> dict:
    try:
        result = await appointment_repo.create(data)
        
        # Create notification
        try:
            await notification_repo.create(
                type=NotificationType.NEW_APPOINTMENT.value,
                title="New Appointment Scheduled",
                body=f"Appointment with {data.doctor_name} for {data.date}",
                patient_id=str(data.patient_id)
            )
        except Exception:
            pass
        return result
    except Exception as e:
        logger.exception(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", status_code=status.HTTP_200_OK)
async def list_appointments(
    limit: int = 100,
    patient_id: Optional[str] = None,
    doctor_id:  Optional[str] = None,
) -> list:
    """
    List appointments with optional filters:
    - patient_id: filter for a specific patient (patient portal)
    - doctor_id:  filter for a specific doctor (doctor dashboard)
    """
    try:
        db = get_supabase()
        query = (
            db.table("appointments")
            .select("*, patients(id, name, phone, email)")
            .limit(limit)
            .order("date", desc=False)
        )
        if patient_id:
            query = query.eq("patient_id", patient_id)
        if doctor_id:
            query = query.eq("doctor_id", doctor_id)

        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.exception(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{appointment_id}/status", status_code=status.HTTP_200_OK)
async def update_appointment_status(appointment_id: str, body: AppointmentStatusUpdate) -> dict:
    """Update appointment status (confirmed, cancelled, completed, rescheduled)."""
    allowed = {"scheduled", "confirmed", "cancelled", "completed", "rescheduled"}
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(allowed)}"
        )
    try:
        db = get_supabase()
        res = db.table("appointments").update({"status": body.status}).eq("id", appointment_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Create notification for cancellation
        if body.status == "cancelled":
            try:
                appt = res.data[0]
                await notification_repo.create(
                    type=NotificationType.EMERGENCY.value if "emergency" in (appt.get("notes") or "").lower() else "appointment_cancelled",
                    title="Appointment Cancelled",
                    body=f"Your appointment on {appt.get('date')} has been cancelled.",
                    patient_id=appt.get("patient_id")
                )
            except Exception:
                pass

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating appointment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{appointment_id}", status_code=status.HTTP_200_OK)
async def get_appointment(appointment_id: str) -> dict:
    """Get a specific appointment by ID."""
    try:
        db = get_supabase()
        res = (
            db.table("appointments")
            .select("*, patients(id, name, phone, email)")
            .eq("id", appointment_id)
            .single()
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
