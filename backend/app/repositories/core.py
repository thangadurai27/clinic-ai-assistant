"""
Repository layer — core Supabase tables (patients, conversations, messages, appointments).
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Optional

from supabase import Client

from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.schemas import (
    PatientCreate,
    ConversationCreate,
    MessageCreate,
    AppointmentCreate,
    ReminderCreate,
    EscalationCreate,
)

logger = logging.getLogger(__name__)


def _db() -> Client:
    return get_supabase()


# ─── Patient Repository ───────────────────────────────────────────────────────

class PatientRepository:
    TABLE = "patients"

    async def create(self, data: PatientCreate) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).insert(data.model_dump()).execute()
        )
        return res.data[0] if res.data else {}

    async def get_by_id(self, patient_id: str) -> Optional[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("id", patient_id).single().execute()
        )
        return res.data

    async def get_by_phone(self, phone: str) -> Optional[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("phone", phone).execute()
        )
        return res.data[0] if res.data else None

    async def get_by_email(self, email: str) -> Optional[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("email", email).execute()
        )
        return res.data[0] if res.data else None

    async def get_all(self, limit: int = 100) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").limit(limit).order("created_at", desc=True).execute()
        )
        return res.data or []

    async def count(self) -> int:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("id", count="exact").execute()
        )
        return res.count or 0

    async def upsert_by_phone(self, phone: str, name: str, email: Optional[str] = None, channel: str = "web") -> dict:
        existing = await self.get_by_phone(phone)
        if existing:
            return existing
        data = PatientCreate(name=name, phone=phone, email=email, preferred_channel=channel)
        return await self.create(data)


# ─── Conversation Repository ──────────────────────────────────────────────────

class ConversationRepository:
    TABLE = "conversations"

    async def create(self, data: ConversationCreate) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).insert(data.model_dump(mode="json")).execute()
        )
        return res.data[0] if res.data else {}

    async def get_by_id(self, conv_id: str) -> Optional[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*, patients(*)").eq("id", conv_id).single().execute()
        )
        return res.data

    async def get_all(self, limit: int = 100, status: Optional[str] = None) -> list[dict]:
        def _query():
            query = (
                _db()
                .table(self.TABLE)
                .select("*, patients(id, name, phone, email)")
                .limit(limit)
                .order("updated_at", desc=True)
            )
            if status:
                query = query.eq("status", status)
            return query.execute()

        res = await run_blocking(_query)
        return res.data or []

    async def update_status(self, conv_id: str, status: str, summary: Optional[str] = None) -> dict:
        update_data: dict = {"status": status}
        if summary:
            update_data["summary"] = summary
        res = await run_blocking(
            lambda: _db().table(self.TABLE).update(update_data).eq("id", conv_id).execute()
        )
        return res.data[0] if res.data else {}

    async def count_active(self) -> int:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("id", count="exact").eq("status", "open").execute()
        )
        return res.count or 0

    async def count_by_date(self, target_date: str) -> int:
        res = await run_blocking(
            lambda: _db()
            .table(self.TABLE)
            .select("id", count="exact")
            .gte("created_at", f"{target_date}T00:00:00")
            .lte("created_at", f"{target_date}T23:59:59")
            .execute()
        )
        return res.count or 0

    async def count_all(self) -> int:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("id", count="exact").execute()
        )
        return res.count or 0


# ─── Message Repository ───────────────────────────────────────────────────────

class MessageRepository:
    TABLE = "messages"

    async def create(self, data: MessageCreate) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).insert(data.model_dump(mode="json")).execute()
        )
        return res.data[0] if res.data else {}

    async def get_by_conversation(self, conv_id: str) -> list[dict]:
        res = await run_blocking(
            lambda: _db()
            .table(self.TABLE)
            .select("*")
            .eq("conversation_id", conv_id)
            .order("timestamp", desc=False)
            .execute()
        )
        return res.data or []


# ─── Appointment Repository ───────────────────────────────────────────────────

class AppointmentRepository:
    TABLE = "appointments"

    async def create(self, data: AppointmentCreate) -> dict:
        payload = data.model_dump(mode="json")
        res = await run_blocking(
            lambda: _db().table(self.TABLE).insert(payload).execute()
        )
        return res.data[0] if res.data else {}

    async def get_all(self, limit: int = 100) -> list[dict]:
        res = await run_blocking(
            lambda: _db()
            .table(self.TABLE)
            .select("*, patients(id, name, phone, email)")
            .limit(limit)
            .order("date", desc=False)
            .execute()
        )
        return res.data or []

    async def get_by_patient(self, patient_id: str) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("patient_id", patient_id).execute()
        )
        return res.data or []

    async def count_today(self) -> int:
        today = date.today().isoformat()
        res = await run_blocking(
            lambda: _db()
            .table(self.TABLE)
            .select("id", count="exact")
            .gte("date", f"{today}T00:00:00")
            .lte("date", f"{today}T23:59:59")
            .execute()
        )
        return res.count or 0

    async def count_all(self) -> int:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("id", count="exact").execute()
        )
        return res.count or 0


# ─── Reminder Repository ──────────────────────────────────────────────────────

class ReminderRepository:
    TABLE = "reminders"

    async def create(self, data: ReminderCreate) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).insert(data.model_dump(mode="json")).execute()
        )
        return res.data[0] if res.data else {}

    async def get_pending(self) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*, patients(*)").eq("status", "pending").execute()
        )
        return res.data or []

    async def mark_sent(self, reminder_id: str) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).update({"status": "sent"}).eq("id", reminder_id).execute()
        )
        return res.data[0] if res.data else {}


# ─── Escalation Repository ────────────────────────────────────────────────────

class EscalationRepository:
    TABLE = "escalations"

    async def create(self, data: EscalationCreate) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).insert(data.model_dump(mode="json")).execute()
        )
        return res.data[0] if res.data else {}

    async def get_all(self, limit: int = 100, status: Optional[str] = None) -> list[dict]:
        def _query():
            query = (
                _db()
                .table(self.TABLE)
                .select("*, patients(id, name, phone, email)")
                .limit(limit)
                .order("created_at", desc=True)
            )
            if status:
                query = query.eq("status", status)
            return query.execute()

        res = await run_blocking(_query)
        return res.data or []

    async def update_status(self, esc_id: str, status: str) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).update({"status": status}).eq("id", esc_id).execute()
        )
        return res.data[0] if res.data else {}

    async def count_open(self) -> int:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("id", count="exact").eq("status", "open").execute()
        )
        return res.count or 0

    async def count_resolved(self) -> int:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("id", count="exact").eq("status", "resolved").execute()
        )
        return res.count or 0


# ─── Doctor Repository ────────────────────────────────────────────────────────


class DoctorRepository:
    TABLE = "doctors"

    async def get_all(self, limit: int = 100) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("is_active", True).limit(limit).execute()
        )
        return res.data or []

    async def get_by_id(self, doc_id: str) -> Optional[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("id", doc_id).single().execute()
        )
        return res.data


# ─── Doctor Schedule Repository ────────────────────────────────────────────────


class DoctorScheduleRepository:
    TABLE = "doctor_schedules"

    async def get_by_doctor(self, doc_id: str) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("doctor_id", doc_id).execute()
        )
        return res.data or []

    async def get_by_doctor_and_day(self, doc_id: str, day: str) -> Optional[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("doctor_id", doc_id).eq("day_of_week", day.lower()).execute()
        )
        return res.data[0] if res.data else None


# ─── Medication Reminder Repository ───────────────────────────────────────────


class MedicationReminderRepository:
    TABLE = "medication_reminders"

    async def get_by_patient(self, patient_id: str) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("patient_id", patient_id).eq("is_active", True).execute()
        )
        return res.data or []


# ─── Notification Repository ──────────────────────────────────────────────────


class NotificationRepository:
    TABLE = "notifications"

    async def get_by_patient(self, patient_id: str, limit: int = 50) -> list[dict]:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).select("*").eq("patient_id", patient_id).order("created_at", desc=True).limit(limit).execute()
        )
        return res.data or []

    async def mark_read(self, notif_id: str) -> dict:
        res = await run_blocking(
            lambda: _db().table(self.TABLE).update({"is_read": True}).eq("id", notif_id).execute()
        )
        return res.data[0] if res.data else {}


# ─── Singletons ───────────────────────────────────────────────────────────────

patient_repo = PatientRepository()
conversation_repo = ConversationRepository()
message_repo = MessageRepository()
appointment_repo = AppointmentRepository()
reminder_repo = ReminderRepository()
escalation_repo = EscalationRepository()
doctor_repo = DoctorRepository()
doctor_schedule_repo = DoctorScheduleRepository()
medication_reminder_repo = MedicationReminderRepository()
notification_repo = NotificationRepository()
