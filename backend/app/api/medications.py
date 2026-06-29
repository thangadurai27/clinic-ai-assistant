"""
Medication Management API.
"""
from __future__ import annotations

import logging
from uuid import UUID
from typing import List, Optional
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, status, Header

from app.auth.service import auth_service
from app.db.supabase_client import get_supabase
from app.db.async_utils import run_blocking
from app.schemas import (
    MedicationReminderRead, 
    MedicationReminderCreate, 
    MedicationReminderUpdate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/medications", tags=["Medications"])


async def _get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return user


async def _get_current_patient_id(user: dict) -> UUID:
    def _query():
        res = get_supabase().table("patients").select("id").eq("user_id", user["id"]).execute()
        if not res.data:
            return None
        return UUID(res.data[0]["id"])
    
    patient_id = await run_blocking(_query)
    if not patient_id:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient_id


@router.get("", response_model=List[MedicationReminderRead])
async def list_medications(user: dict = Depends(_get_current_user)):
    patient_id = await _get_current_patient_id(user)
    
    def _query():
        res = get_supabase().table("medication_reminders").select("*").eq("patient_id", str(patient_id)).execute()
        return res.data or []
    
    return await run_blocking(_query)


@router.get("/{medication_id}", response_model=MedicationReminderRead)
async def get_medication(medication_id: UUID, user: dict = Depends(_get_current_user)):
    patient_id = await _get_current_patient_id(user)
    
    def _query():
        res = get_supabase().table("medication_reminders").select("*").eq("id", str(medication_id)).eq("patient_id", str(patient_id)).execute()
        return res.data[0] if res.data else None
    
    result = await run_blocking(_query)
    if not result:
        raise HTTPException(status_code=404, detail="Medication not found")
    return result


@router.post("", response_model=MedicationReminderRead)
async def create_medication(body: MedicationReminderCreate, user: dict = Depends(_get_current_user)):
    patient_id = await _get_current_patient_id(user)
    
    # Ensure patient_id matches the authenticated user's patient profile
    body.patient_id = patient_id
    
    def _insert():
        res = get_supabase().table("medication_reminders").insert(body.model_dump(mode="json")).execute()
        return res.data[0] if res.data else None
    
    result = await run_blocking(_insert)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create medication")
    return result


@router.put("/{medication_id}", response_model=MedicationReminderRead)
async def update_medication(medication_id: UUID, body: MedicationReminderUpdate, user: dict = Depends(_get_current_user)):
    patient_id = await _get_current_patient_id(user)
    
    def _update():
        res = get_supabase().table("medication_reminders").update(body.model_dump(mode="json", exclude_unset=True)).eq("id", str(medication_id)).eq("patient_id", str(patient_id)).execute()
        return res.data[0] if res.data else None
    
    result = await run_blocking(_update)
    if not result:
        raise HTTPException(status_code=404, detail="Medication not found or update failed")
    return result


@router.patch("/{medication_id}/complete", response_model=MedicationReminderRead)
async def mark_complete(medication_id: UUID, user: dict = Depends(_get_current_user)):
    patient_id = await _get_current_patient_id(user)
    
    def _mark():
        res = get_supabase().table("medication_reminders").update({"completed": True}).eq("id", str(medication_id)).eq("patient_id", str(patient_id)).execute()
        if res.data:
            # Also create a notification
            name = res.data[0]["medicine_name"]
            notif_data = {
                "patient_id": str(patient_id),
                "type": "medication",
                "title": f"Medication Completed: {name}",
                "body": f"You have successfully taken your dose of {name}.",
                "is_read": False
            }
            get_supabase().table("notifications").insert(notif_data).execute()
            return res.data[0]
        return None
    
    result = await run_blocking(_mark)
    if not result:
        raise HTTPException(status_code=404, detail="Medication not found")
    return result


@router.delete("/{medication_id}")
async def delete_medication(medication_id: UUID, user: dict = Depends(_get_current_user)):
    patient_id = await _get_current_patient_id(user)
    
    def _delete():
        res = get_supabase().table("medication_reminders").delete().eq("id", str(medication_id)).eq("patient_id", str(patient_id)).execute()
        return len(res.data or [])
    
    deleted = await run_blocking(_delete)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    return {"success": True}
