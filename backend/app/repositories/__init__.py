"""Data access layer — Supabase repositories."""
from app.repositories.core import (
    appointment_repo,
    conversation_repo,
    escalation_repo,
    message_repo,
    patient_repo,
    reminder_repo,
)
from app.repositories.extended import (
    doctor_repo,
    holiday_repo,
    leave_repo,
    notification_repo,
    schedule_repo,
    timeline_repo,
)
from app.repositories.ai_log_repo import ai_log_repo
from app.repositories.activity_log_repo import activity_log_repo

__all__ = [
    "patient_repo",
    "conversation_repo",
    "message_repo",
    "appointment_repo",
    "reminder_repo",
    "escalation_repo",
    "doctor_repo",
    "schedule_repo",
    "leave_repo",
    "holiday_repo",
    "notification_repo",
    "timeline_repo",
    "ai_log_repo",
    "activity_log_repo",
]
