"""
Repository layer — extended tables (doctors, schedules, notifications, timeline).
"""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Optional

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _db():
    return get_supabase()


# ── Doctor Repository ──────────────────────────────────────────────────────

class DoctorRepository:
    TABLE = "doctors"

    async def create(self, data: dict) -> dict:
        try:
            res = _db().table(self.TABLE).insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"doctors.create skipped: {e}")
            return {}

    async def get_by_id(self, doc_id: str) -> Optional[dict]:
        try:
            res = _db().table(self.TABLE).select("*").eq("id", doc_id).single().execute()
            return res.data
        except Exception:
            return None

    async def get_all(self) -> list[dict]:
        try:
            res = _db().table(self.TABLE).select("*").eq("is_active", True).order("name").execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"doctors.get_all skipped: {e}")
            return []

    async def update(self, doc_id: str, data: dict) -> dict:
        try:
            res = _db().table(self.TABLE).update(data).eq("id", doc_id).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"doctors.update skipped: {e}")
            return {}

    async def delete(self, doc_id: str):
        try:
            _db().table(self.TABLE).update({"is_active": False}).eq("id", doc_id).execute()
        except Exception as e:
            logger.warning(f"doctors.delete skipped: {e}")


# ── Doctor Schedule Repository ─────────────────────────────────────────────

class ScheduleRepository:
    TABLE = "doctor_schedules"

    async def upsert(self, data: dict) -> dict:
        # Check existing
        existing = (
            _db().table(self.TABLE)
            .select("id")
            .eq("doctor_id", data["doctor_id"])
            .eq("day_of_week", data["day_of_week"])
            .execute()
        )
        if existing.data:
            sid = existing.data[0]["id"]
            res = _db().table(self.TABLE).update(data).eq("id", sid).execute()
        else:
            res = _db().table(self.TABLE).insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_by_doctor(self, doctor_id: str) -> list[dict]:
        res = _db().table(self.TABLE).select("*").eq("doctor_id", doctor_id).execute()
        return res.data or []

    async def update(self, schedule_id: str, data: dict) -> dict:
        res = _db().table(self.TABLE).update(data).eq("id", schedule_id).execute()
        return res.data[0] if res.data else {}

    async def delete(self, schedule_id: str):
        _db().table(self.TABLE).delete().eq("id", schedule_id).execute()


# ── Doctor Leave Repository ────────────────────────────────────────────────

class LeaveRepository:
    TABLE = "doctor_leaves"

    async def create(self, data: dict) -> dict:
        res = _db().table(self.TABLE).insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_by_doctor(self, doctor_id: str) -> list[dict]:
        res = _db().table(self.TABLE).select("*").eq("doctor_id", doctor_id).execute()
        return res.data or []

    async def delete(self, leave_id: str):
        _db().table(self.TABLE).delete().eq("id", leave_id).execute()


# ── Clinic Holiday Repository ──────────────────────────────────────────────

class HolidayRepository:
    TABLE = "clinic_holidays"

    async def create(self, data: dict) -> dict:
        res = _db().table(self.TABLE).insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_all(self) -> list[dict]:
        res = _db().table(self.TABLE).select("*").order("date").execute()
        return res.data or []

    async def delete(self, holiday_id: str):
        _db().table(self.TABLE).delete().eq("id", holiday_id).execute()


# ── Conversation Timeline Repository ──────────────────────────────────────

class TimelineRepository:
    TABLE = "conversation_timeline"

    async def log(self, conversation_id: str, event_type: str, actor: str = "AI", note: str = "") -> dict:
        try:
            res = _db().table(self.TABLE).insert({
                "conversation_id": conversation_id,
                "event_type": event_type,
                "actor": actor,
                "note": note,
            }).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"timeline.log skipped (table may not exist): {e}")
            return {}

    async def get_by_conversation(self, conversation_id: str) -> list[dict]:
        try:
            res = (
                _db().table(self.TABLE)
                .select("*")
                .eq("conversation_id", conversation_id)
                .order("created_at")
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"timeline.get_by_conversation skipped: {e}")
            return []


# ── Notification Repository ────────────────────────────────────────────────

class NotificationRepository:
    TABLE = "notifications"

    async def create(self, type: str, title: str, body: str = "",
                     patient_id: str | None = None,
                     conversation_id: str | None = None) -> dict:
        payload: dict[str, Any] = {"type": type, "title": title, "body": body}
        if patient_id:
            payload["patient_id"] = patient_id
        if conversation_id:
            payload["conversation_id"] = conversation_id
        try:
            res = _db().table(self.TABLE).insert(payload).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"notifications.create skipped (table may not exist): {e}")
            return {}

    async def get_all(self, limit: int = 50) -> list[dict]:
        try:
            res = (
                _db().table(self.TABLE)
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"notifications.get_all skipped: {e}")
            return []

    async def mark_read(self, notification_id: str) -> dict:
        try:
            res = _db().table(self.TABLE).update({"is_read": True}).eq("id", notification_id).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"notifications.mark_read skipped: {e}")
            return {}

    async def mark_all_read(self) -> None:
        try:
            _db().table(self.TABLE).update({"is_read": True}).eq("is_read", False).execute()
        except Exception as e:
            logger.warning(f"notifications.mark_all_read skipped: {e}")

    async def count_unread(self) -> int:
        try:
            res = _db().table(self.TABLE).select("id", count="exact").eq("is_read", False).execute()
            return res.count or 0
        except Exception as e:
            logger.warning(f"notifications.count_unread skipped: {e}")
            return 0


# ── Singletons ─────────────────────────────────────────────────────────────

doctor_repo        = DoctorRepository()
schedule_repo      = ScheduleRepository()
leave_repo         = LeaveRepository()
holiday_repo       = HolidayRepository()
timeline_repo      = TimelineRepository()
notification_repo  = NotificationRepository()
