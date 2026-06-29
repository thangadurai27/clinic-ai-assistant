"""
Integration tests for production features (requires Supabase data).

Run: pytest tests/test_production_features.py -v
"""
from __future__ import annotations

import asyncio
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.supabase_client import get_supabase
from app.repositories import (
    appointment_repo,
    doctor_repo,
    notification_repo,
    patient_repo,
    schedule_repo,
    timeline_repo,
)
from app.services.availability_service import AvailabilityService


@pytest.mark.asyncio
async def test_availability_service() -> None:
    service = AvailabilityService()
    doctors = await doctor_repo.get_all()
    if not doctors:
        pytest.skip("No doctors found. Run seeder first.")

    doctor = doctors[0]
    check_date = date.today() + timedelta(days=7)
    slots = await service.get_available_slots(doctor["id"], check_date)
    assert isinstance(slots, list)

    requested = datetime.now() + timedelta(days=1)
    nearest = await service.find_nearest_slots(doctor["id"], requested, count=3)
    assert isinstance(nearest, list)


@pytest.mark.asyncio
async def test_doctor_schedules() -> None:
    doctors = await doctor_repo.get_all()
    if not doctors:
        pytest.skip("No doctors found")

    doctor = doctors[0]
    schedules = await schedule_repo.get_by_doctor(doctor["id"])
    assert isinstance(schedules, list)


@pytest.mark.asyncio
async def test_human_takeover() -> None:
    db = get_supabase()
    res = db.table("conversations").select("*").limit(1).execute()
    if not res.data:
        pytest.skip("No conversations found")

    conv_id = res.data[0]["id"]
    original_ownership = res.data[0].get("ownership", "AI_ACTIVE")

    db.table("conversations").update({
        "ownership": "HUMAN_ACTIVE",
        "taken_over_by": "Test Receptionist",
    }).eq("id", conv_id).execute()

    await timeline_repo.log(
        conversation_id=conv_id,
        event_type="takeover_started",
        actor="Test Receptionist",
        note="Test takeover",
    )

    timeline = await timeline_repo.get_by_conversation(conv_id)
    assert isinstance(timeline, list)

    db.table("conversations").update({
        "ownership": original_ownership or "AI_ACTIVE",
        "taken_over_by": None,
    }).eq("id", conv_id).execute()


@pytest.mark.asyncio
async def test_notifications() -> None:
    notif = await notification_repo.create(
        type="emergency",
        title="Test Notification",
        body="This is a test notification",
    )
    assert notif.get("id")

    recent = await notification_repo.get_all(limit=5)
    assert isinstance(recent, list)

    unread_count = await notification_repo.count_unread()
    assert unread_count >= 0


@pytest.mark.asyncio
async def test_patient_portal_data() -> None:
    patients = await patient_repo.get_all(limit=1)
    if not patients:
        pytest.skip("No patients found")

    patient_id = patients[0]["id"]
    appointments = await appointment_repo.get_by_patient(patient_id)
    assert isinstance(appointments, list)

    db = get_supabase()
    conv_res = (
        db.table("conversations")
        .select("*")
        .eq("patient_id", patient_id)
        .limit(5)
        .execute()
    )
    assert isinstance(conv_res.data, list)


@pytest.mark.asyncio
async def test_database_stats() -> None:
    db = get_supabase()
    tables = [
        "doctors",
        "doctor_schedules",
        "doctor_leaves",
        "clinic_holidays",
        "patients",
        "conversations",
        "messages",
        "appointments",
        "reminders",
        "escalations",
        "notifications",
        "conversation_timeline",
    ]

    for table in tables:
        res = db.table(table).select("id", count="exact").execute()
        assert res.count is not None


if __name__ == "__main__":
    async def _run_all() -> None:
        await test_database_stats()
        await test_doctor_schedules()
        await test_availability_service()
        await test_human_takeover()
        await test_notifications()
        await test_patient_portal_data()
        print("All production feature tests passed.")

    asyncio.run(_run_all())
