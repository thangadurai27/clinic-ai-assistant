"""
Doctors & Availability API endpoints.
"""
from __future__ import annotations
import logging
from datetime import date, datetime, time, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, UUID4
from app.auth.dependencies import get_staff_user, get_staff_user_for_write
from app.demo import data as demo_data
from app.demo.service import is_demo_user
from app.services.availability_service import AvailabilityService
from app.repositories import doctor_repo, schedule_repo, leave_repo, holiday_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctors", tags=["Doctors"])

availability_svc = AvailabilityService()


# ── Schemas ────────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str
    specialty: str = "General Practice"
    qualification: Optional[str] = None
    experience_years: int = 0
    consultation_fee: float = 500.0
    profile_image: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_color: str = "#14b8a6"
    emergency_only: bool = False

class ScheduleCreate(BaseModel):
    doctor_id: str
    day_of_week: str
    start_time: str = "08:00"
    end_time: str   = "17:00"
    lunch_start: Optional[str] = "12:00"
    lunch_end:   Optional[str] = "13:00"
    slot_duration: int = 30
    is_active: bool = True

class LeaveCreate(BaseModel):
    doctor_id: str
    start_date: str  # YYYY-MM-DD
    end_date: str
    reason: Optional[str] = None

class HolidayCreate(BaseModel):
    name: str
    date: str  # YYYY-MM-DD


# ── Static routes must be declared before /{doctor_id} ─────────────────────

@router.get("/holidays", status_code=200)
async def list_holidays(user: dict = Depends(get_staff_user)) -> list:
    if is_demo_user(user):
        return [
            {"id": "demo-holiday-1", "name": "Demo Clinic Holiday", "date": "2026-12-25", "is_demo": True}
        ]
    return await holiday_repo.get_all()


@router.post("/holidays", status_code=201)
async def create_holiday(data: HolidayCreate, user: dict = Depends(get_staff_user_for_write)) -> dict:
    try:
        return await holiday_repo.create(data.model_dump())
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/holidays/{holiday_id}", status_code=204)
async def delete_holiday(holiday_id: str, user: dict = Depends(get_staff_user_for_write)):
    await holiday_repo.delete(holiday_id)


@router.post("/schedule", status_code=201)
async def create_schedule(data: ScheduleCreate, user: dict = Depends(get_staff_user_for_write)) -> dict:
    try:
        return await schedule_repo.upsert(data.model_dump())
    except Exception as e:
        raise HTTPException(500, str(e))


@router.put("/schedule/{schedule_id}", status_code=200)
async def update_schedule(
    schedule_id: str,
    data: ScheduleCreate,
    user: dict = Depends(get_staff_user_for_write),
) -> dict:
    try:
        return await schedule_repo.update(schedule_id, data.model_dump())
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/schedule/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: str, user: dict = Depends(get_staff_user_for_write)):
    await schedule_repo.delete(schedule_id)


@router.post("/leave", status_code=201)
async def add_leave(data: LeaveCreate, user: dict = Depends(get_staff_user_for_write)) -> dict:
    try:
        return await leave_repo.create(data.model_dump())
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/leave/{leave_id}", status_code=204)
async def delete_leave(leave_id: str, user: dict = Depends(get_staff_user_for_write)):
    await leave_repo.delete(leave_id)


# ── Doctor CRUD ────────────────────────────────────────────────────────────

@router.get("", status_code=200)
async def list_doctors(user: dict = Depends(get_staff_user)) -> list:
    if is_demo_user(user):
        return demo_data.doctors()
    try:
        return await doctor_repo.get_all()
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("", status_code=201)
async def create_doctor(data: DoctorCreate, user: dict = Depends(get_staff_user_for_write)) -> dict:
    try:
        initials = "".join(w[0].upper() for w in data.name.split()[:2])
        payload = data.model_dump()
        payload["initials"] = initials
        return await doctor_repo.create(payload)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{doctor_id}", status_code=200)
async def get_doctor(doctor_id: str, user: dict = Depends(get_staff_user)) -> dict:
    if is_demo_user(user):
        for doctor in demo_data.doctors():
            if doctor["id"] == doctor_id:
                return doctor
        raise HTTPException(404, "Demo doctor not found")
    doc = await doctor_repo.get_by_id(doctor_id)
    if not doc:
        raise HTTPException(404, "Doctor not found")
    return doc


# ── Availability ───────────────────────────────────────────────────────────

@router.get("/{doctor_id}/availability", status_code=200)
@router.get("/{doctor_id}/slots", status_code=200)
async def get_availability(
    doctor_id: str,
    date_str: str = Query(..., alias="date", description="YYYY-MM-DD"),
    user: dict = Depends(get_staff_user),
) -> dict:
    """Return available slots for a doctor on a given date."""
    if is_demo_user(user):
        return demo_data.availability(doctor_id, date_str)
    try:
        target = date.fromisoformat(date_str)
        slots = await availability_svc.get_available_slots(doctor_id, target)
        return {"doctor_id": doctor_id, "date": date_str, "slots": slots}
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


@router.get("/{doctor_id}/availability/range", status_code=200)
async def get_availability_range(
    doctor_id: str,
    start: str = Query(..., description="YYYY-MM-DD"),
    end:   str = Query(..., description="YYYY-MM-DD"),
    user: dict = Depends(get_staff_user),
) -> dict:
    """Return available slots for a doctor over a date range (max 14 days)."""
    if is_demo_user(user):
        try:
            s = date.fromisoformat(start)
            e = date.fromisoformat(end)
            if (e - s).days > 14:
                raise HTTPException(400, "Range must be 14 days or less")
            result = {}
            cur = s
            while cur <= e:
                result[cur.isoformat()] = demo_data.availability(doctor_id, cur.isoformat())["slots"]
                cur += timedelta(days=1)
            return {"doctor_id": doctor_id, "range": result, "is_demo": True}
        except HTTPException:
            raise
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    try:
        s = date.fromisoformat(start)
        e = date.fromisoformat(end)
        if (e - s).days > 14:
            raise HTTPException(400, "Range must be 14 days or less")
        result = {}
        cur = s
        while cur <= e:
            slots = await availability_svc.get_available_slots(doctor_id, cur)
            result[cur.isoformat()] = slots
            cur += timedelta(days=1)
        return {"doctor_id": doctor_id, "range": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{doctor_id}/schedule", status_code=200)
async def get_doctor_schedule(doctor_id: str, user: dict = Depends(get_staff_user)) -> list:
    if is_demo_user(user):
        return []
    return await schedule_repo.get_by_doctor(doctor_id)


@router.get("/{doctor_id}/leaves", status_code=200)
async def get_doctor_leaves(doctor_id: str, user: dict = Depends(get_staff_user)) -> list:
    if is_demo_user(user):
        return []
    return await leave_repo.get_by_doctor(doctor_id)
