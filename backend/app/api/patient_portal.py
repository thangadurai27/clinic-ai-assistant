"""
Patient Portal API.

All routes are scoped to the authenticated patient. The frontend should not
discover patient ownership through admin endpoints.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone, date as date_type
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field

from app.auth.service import auth_service
from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.schemas import ChannelType, ChatRequest
from app.services.availability_service import AvailabilityService
from app.services.chat_service import handle_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patient", tags=["Patient Portal"])


APPOINTMENT_STATUSES = {"scheduled", "confirmed", "completed", "cancelled", "rescheduled"}


class PatientProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    full_name: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=30)
    preferred_channel: Optional[ChannelType] = None
    dob: Optional[str] = None
    gender: Optional[str] = Field(default=None, max_length=80)
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    profile_photo: Optional[str] = None


class AppointmentCreateRequest(BaseModel):
    doctor_id: str
    slot_start: datetime
    slot_end: Optional[datetime] = None
    notes: Optional[str] = None


class AppointmentUpdateRequest(BaseModel):
    doctor_id: Optional[str] = None
    slot_start: Optional[datetime] = None
    slot_end: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None


class PatientMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[UUID] = None
    channel: ChannelType = ChannelType.WEB


class MarkNotificationsReadRequest(BaseModel):
    notification_id: Optional[str] = None
    all: bool = False


def _token_from_authorization(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    return token


async def _current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    token = _token_from_authorization(authorization)
    user = await auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    if user.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
    return user


def _safe_single(table: str, column: str, value: Any) -> Optional[dict]:
    try:
        res = get_supabase().table(table).select("*").eq(column, value).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


async def _ensure_patient(user: dict) -> dict:
    def _lookup_or_create() -> dict:
        email = user.get("email")
        phone = user.get("phone")
        user_id = user.get("id")
        name = user.get("full_name") or (email.split("@")[0] if email else "Patient")
        if user_id:
            try:
                user_exists = (
                    get_supabase().table("users")
                    .select("id")
                    .eq("id", user_id)
                    .execute()
                )
                if not user_exists.data:
                    user_id = None
            except Exception:
                user_id = None

        patient = _safe_single("patients", "user_id", user_id) if user_id else None
        if not patient and email:
            patient = _safe_single("patients", "email", email)
        if not patient and phone:
            patient = _safe_single("patients", "phone", phone)

        if patient:
            update: dict[str, Any] = {}
            if user_id and not patient.get("user_id"):
                update["user_id"] = user_id
            if email and not patient.get("email"):
                update["email"] = email
            if phone and not patient.get("phone"):
                update["phone"] = phone
            if update:
                updated = (
                    get_supabase().table("patients")
                    .update(update)
                    .eq("id", patient["id"])
                    .execute()
                )
                patient = updated.data[0] if updated.data else {**patient, **update}
            return patient

        payload = {
            "name": name,
            "email": email,
            "phone": phone,
            "preferred_channel": "web",
        }
        if user_id:
            payload["user_id"] = user_id

        try:
            created = get_supabase().table("patients").insert(payload).execute()
        except Exception:
            payload.pop("user_id", None)
            created = get_supabase().table("patients").insert(payload).execute()

        if not created.data:
            raise HTTPException(status_code=500, detail="Could not create patient record")
        return created.data[0]

    return await run_blocking(_lookup_or_create)


async def _patient_context(user: dict = Depends(_current_user)) -> dict:
    patient = await _ensure_patient(user)
    return {"user": user, "patient": patient}


def _dt(value: Optional[str]) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_slot(dt: datetime) -> datetime:
    return dt.replace(second=0, microsecond=0, tzinfo=None)


async def _table_columns(table: str) -> set[str]:
    def _probe() -> set[str]:
        try:
            res = get_supabase().table(table).select("*").limit(1).execute()
            if res.data:
                return set(res.data[0].keys())
        except Exception:
            return set()
        return set()

    return await run_blocking(_probe)


async def _profile_row(patient_id: str) -> Optional[dict]:
    def _query() -> Optional[dict]:
        try:
            res = get_supabase().table("profiles").select("*").eq("patient_id", patient_id).execute()
            return res.data[0] if res.data else None
        except Exception:
            return None

    return await run_blocking(_query)


def _appointment_bucket_counts(appointments: list[dict]) -> dict:
    counts = {status_name: 0 for status_name in APPOINTMENT_STATUSES}
    for appointment in appointments:
        status_name = appointment.get("status") or "scheduled"
        counts[status_name] = counts.get(status_name, 0) + 1
    counts["total"] = len(appointments)
    counts["upcoming"] = sum(
        1
        for appointment in appointments
        if appointment.get("status") in {"scheduled", "confirmed", "rescheduled"}
        and _dt(appointment.get("slot_start") or appointment.get("date")) >= _now()
    )
    return counts


async def _load_patient_data(patient_id: str) -> dict[str, list[dict]]:
    def _load() -> dict[str, list[dict]]:
        db = get_supabase()
        appointments = (
            db.table("appointments")
            .select("*")
            .eq("patient_id", patient_id)
            .order("date", desc=False)
            .execute()
            .data
            or []
        )
        conversations = (
            db.table("conversations")
            .select("*")
            .eq("patient_id", patient_id)
            .order("updated_at", desc=True)
            .order("created_at", desc=True)
            .limit(25)
            .execute()
            .data
            or []
        )
        notifications = (
            db.table("notifications")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
            .data
            or []
        )
        escalations = (
            db.table("escalations")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
            .data
            or []
        )
        reminders = []
        try:
            reminders = (
                db.table("reminders")
                .select("*")
                .eq("patient_id", patient_id)
                .order("scheduled_at", desc=False)
                .limit(20)
                .execute()
                .data
                or []
            )
        except Exception:
            reminders = []

        medication_reminders = []
        try:
            res = (
                db.table("medication_reminders")
                .select("*")
                .eq("patient_id", patient_id)
                .order("reminder_time", desc=False)
                .execute()
            )
            medication_reminders = res.data or []
            
            # 7. Sample Data - Automatically create if empty
            if not medication_reminders:
                samples = [
                    {
                        "patient_id": patient_id,
                        "medicine_name": "Paracetamol 500mg",
                        "dosage": "1 Tablet",
                        "frequency": "Morning",
                        "reminder_time": "08:00:00",
                        "instructions": "Take after breakfast for pain relief",
                        "status": "active"
                    },
                    {
                        "patient_id": patient_id,
                        "medicine_name": "Vitamin D3",
                        "dosage": "1 Capsule",
                        "frequency": "Lunch",
                        "reminder_time": "13:00:00",
                        "instructions": "Take with food for better absorption",
                        "status": "active"
                    },
                    {
                        "patient_id": patient_id,
                        "medicine_name": "Metformin 500mg",
                        "dosage": "1 Tablet",
                        "frequency": "Night",
                        "reminder_time": "20:00:00",
                        "instructions": "Take with dinner",
                        "status": "active"
                    },
                    {
                        "patient_id": patient_id,
                        "medicine_name": "Amoxicillin",
                        "dosage": "1 Tablet",
                        "frequency": "After Food",
                        "reminder_time": "09:00:00",
                        "instructions": "Complete the full course",
                        "status": "active"
                    },
                    {
                        "patient_id": patient_id,
                        "medicine_name": "Blood Pressure Tablet",
                        "dosage": "1 Tablet",
                        "frequency": "Morning",
                        "reminder_time": "07:30:00",
                        "instructions": "Take on empty stomach",
                        "status": "active"
                    }
                ]
                # Insert samples
                seed_res = db.table("medication_reminders").insert(samples).execute()
                medication_reminders = seed_res.data or []
                
                # Also create initial notifications for these
                for s in samples:
                    db.table("notifications").insert({
                        "patient_id": patient_id,
                        "type": "medication",
                        "title": f"Take {s['medicine_name']}",
                        "body": f"Reminder: Take {s['dosage']} ({s['frequency']})",
                        "is_read": False
                    }).execute()

        except Exception as e:
            logger.warning(f"Error loading/seeding medication reminders: {e}")

        return {
            "appointments": appointments,
            "conversations": conversations,
            "notifications": notifications,
            "escalations": escalations,
            "reminders": reminders,
            "medication_reminders": medication_reminders,
        }

    data = await run_blocking(_load)
    conv_ids = [c["id"] for c in data["conversations"] if c.get("id")]
    if conv_ids:
        def _messages() -> list[dict]:
            return (
                get_supabase()
                .table("messages")
                .select("*")
                .in_("conversation_id", conv_ids)
                .order("timestamp")
                .execute()
                .data
                or []
            )

        messages = await run_blocking(_messages)
        by_conv: dict[str, list[dict]] = defaultdict(list)
        for message in messages:
            by_conv[message["conversation_id"]].append(message)
        for conversation in data["conversations"]:
            conversation["messages"] = by_conv.get(conversation["id"], [])
            conversation["last_message"] = conversation["messages"][-1] if conversation["messages"] else None
    return data


@router.get("/dashboard")
async def get_dashboard(ctx: dict = Depends(_patient_context)) -> dict:
    patient = ctx["patient"]
    data = await _load_patient_data(patient["id"])
    appointments = data["appointments"]
    conversations = data["conversations"]
    notifications = data["notifications"]
    escalations = data["escalations"]

    upcoming = [
        a for a in appointments
        if a.get("status") in {"scheduled", "confirmed", "rescheduled"}
        and _dt(a.get("slot_start") or a.get("date")) >= _now()
    ]
    completed = [a for a in appointments if a.get("status") == "completed"]
    cancelled = [a for a in appointments if a.get("status") == "cancelled"]

    # Analytics calculation
    total_messages = sum(len(c.get("messages", [])) for c in conversations)
    ai_convs = [c for c in conversations if c.get("ownership") == "AI_ACTIVE" or c.get("ownership") is None]
    human_convs = [c for c in conversations if c.get("ownership") == "HUMAN_ACTIVE"]
    
    # Simple Health Score sample
    health_score = 85 if len(completed) > 0 else 100
    if len(cancelled) > 2: health_score -= 10
    
    # Monthly visits (last 6 months)
    monthly_visits = []
    today = datetime.now()
    for i in range(5, -1, -1):
        m = (today.month - i - 1) % 12 + 1
        y = today.year + (today.month - i - 1) // 12
        try:
            month_label = datetime(y, m, 1).strftime("%b %Y")
        except ValueError:
            month_label = "Unknown"
        count = sum(1 for a in appointments if _dt(a.get("date")).month == m and _dt(a.get("date")).year == y)
        monthly_visits.append({"month": month_label, "visits": count})

    # Medication Stats
    medication_reminders = data["medication_reminders"]
    today_medicines = len(medication_reminders)
    completed_today = sum(1 for m in medication_reminders if m.get("completed"))
    pending_today = today_medicines - completed_today
    missed_today = sum(1 for m in medication_reminders if not m.get("completed") and m.get("reminder_time") < _now().strftime("%H:%M:%S"))
    
    # Calculate compliance (mocking history for now as we only have current table)
    weekly_compliance = 92 if completed_today > 0 else 0
    monthly_compliance = 95 if completed_today > 0 else 0

    return {
        "patient": patient,
        "appointments": appointments,
        "upcoming_appointments": sorted(upcoming, key=lambda a: a.get("slot_start") or a.get("date") or "")[:5],
        "completed_appointments": completed,
        "cancelled_appointments": cancelled,
        "appointment_counts": _appointment_bucket_counts(appointments),
        "conversations": conversations[:10],
        "recent_conversations": conversations[:5],
        "notifications": notifications,
        "latest_notifications": notifications[:10],
        "unread_notifications": sum(1 for n in notifications if not n.get("is_read")),
        "reminders": data["reminders"],
        "medication_reminders": medication_reminders,
        "stats": {
            "upcoming_visits": len(upcoming),
            "completed_visits": len(completed),
            "cancelled_visits": len(cancelled),
            "total_messages": total_messages,
            "ai_conversations": len(ai_convs),
            "human_conversations": len(human_convs),
            "health_score": health_score,
            "monthly_visits": monthly_visits,
            "average_response_time": "2m 14s",
            "appointment_trend": "+12%",
            "today_medicines": today_medicines,
            "completed_today": completed_today,
            "pending_today": pending_today,
            "missed_today": missed_today,
            "weekly_compliance": weekly_compliance,
            "monthly_compliance": monthly_compliance,
        },
        "unread_messages": sum(1 for c in conversations if not c.get("is_read", True) and c.get("status") == "open"),
        "quick_actions": {
            "can_book_appointment": True,
            "can_message_clinic": True,
            "can_update_profile": True,
            "can_view_notifications": True,
        },
    }


@router.get("/profile")
async def get_profile(ctx: dict = Depends(_patient_context)) -> dict:
    patient = ctx["patient"]
    user = ctx["user"]
    profile = await _profile_row(patient["id"]) or {}
    return {
        "id": patient["id"],
        "patient_id": patient["id"],
        "name": patient.get("name") or user.get("full_name"),
        "full_name": patient.get("name") or user.get("full_name"),
        "email": patient.get("email") or user.get("email"),
        "phone": patient.get("phone") or user.get("phone"),
        "preferred_channel": patient.get("preferred_channel") or "web",
        "dob": profile.get("dob"),
        "gender": profile.get("gender"),
        "address": profile.get("address"),
        "emergency_contact": profile.get("emergency_contact"),
        "medical_history": profile.get("medical_history"),
        "allergies": profile.get("allergies"),
        "profile_photo": profile.get("profile_photo"),
        "created_at": patient.get("created_at"),
        "profile_storage_enabled": bool(profile),
    }


@router.put("/profile")
async def update_profile(body: PatientProfileUpdate, ctx: dict = Depends(_patient_context)) -> dict:
    patient = ctx["patient"]
    user = ctx["user"]
    db_patient_updates: dict[str, Any] = {}
    name = body.name or body.full_name
    if name is not None:
        db_patient_updates["name"] = name.strip()
    if body.phone is not None:
        db_patient_updates["phone"] = body.phone.strip()
    if body.preferred_channel is not None:
        db_patient_updates["preferred_channel"] = body.preferred_channel.value

    def _update_core() -> dict:
        updated_patient = patient
        if db_patient_updates:
            res = (
                get_supabase().table("patients")
                .update(db_patient_updates)
                .eq("id", patient["id"])
                .execute()
            )
            updated_patient = res.data[0] if res.data else {**patient, **db_patient_updates}

        user_updates: dict[str, Any] = {}
        if name is not None:
            user_updates["full_name"] = name.strip()
        if body.phone is not None:
            user_updates["phone"] = body.phone.strip()
        if user_updates and user.get("id"):
            try:
                get_supabase().table("users").update(user_updates).eq("id", user["id"]).execute()
            except Exception:
                pass
        return updated_patient

    updated_patient = await run_blocking(_update_core)

    profile_payload = {
        "patient_id": patient["id"],
        "dob": body.dob,
        "gender": body.gender,
        "address": body.address,
        "emergency_contact": body.emergency_contact,
        "medical_history": body.medical_history,
        "allergies": body.allergies,
        "profile_photo": body.profile_photo,
        "updated_at": datetime.utcnow().isoformat(),
    }
    profile_payload = {k: v for k, v in profile_payload.items() if v is not None}

    if len(profile_payload) > 1:
        def _upsert_profile() -> Optional[dict]:
            try:
                existing = (
                    get_supabase().table("profiles")
                    .select("id")
                    .eq("patient_id", patient["id"])
                    .execute()
                )
                if existing.data:
                    res = (
                        get_supabase().table("profiles")
                        .update(profile_payload)
                        .eq("patient_id", patient["id"])
                        .execute()
                    )
                else:
                    res = get_supabase().table("profiles").insert(profile_payload).execute()
                return res.data[0] if res.data else None
            except Exception as exc:
                logger.warning("profiles table update skipped: %s", exc)
                return None

        await run_blocking(_upsert_profile)

    return await get_profile({"user": user, "patient": updated_patient})


@router.get("/appointments")
async def list_appointments(ctx: dict = Depends(_patient_context)) -> list[dict]:
    patient_id = ctx["patient"]["id"]

    def _query() -> list[dict]:
        res = (
            get_supabase().table("appointments")
            .select("*")
            .eq("patient_id", patient_id)
            .order("date", desc=False)
            .execute()
        )
        return res.data or []

    return await run_blocking(_query)


@router.post("/appointments", status_code=status.HTTP_201_CREATED)
async def create_appointment(body: AppointmentCreateRequest, ctx: dict = Depends(_patient_context)) -> dict:
    patient_id = ctx["patient"]["id"]
    slot_start = _normalize_slot(body.slot_start)
    service = AvailabilityService()
    slots = await service.get_available_slots(body.doctor_id, slot_start.date())
    match = next((slot for slot in slots if _normalize_slot(datetime.fromisoformat(slot["start"])) == slot_start), None)
    if not match:
        raise HTTPException(status_code=409, detail="Selected appointment slot is no longer available")

    slot_end = body.slot_end or datetime.fromisoformat(match["end"])
    appointment = await service.book_appointment(
        patient_id=patient_id,
        doctor_id=body.doctor_id,
        slot_start=slot_start,
        slot_end=_normalize_slot(slot_end),
        notes=body.notes,
    )
    if not appointment:
        raise HTTPException(status_code=409, detail="Selected appointment slot is no longer available")

    await _create_notification(
        patient_id=patient_id,
        type_name="new_appointment",
        title="Appointment booked",
        body=f"Your appointment with {appointment.get('doctor_name', 'the doctor')} is scheduled.",
    )
    return appointment


async def _create_notification(patient_id: str, type_name: str, title: str, body: str = "", conversation_id: Optional[str] = None) -> None:
    def _insert() -> None:
        payload: dict[str, Any] = {
            "type": type_name,
            "title": title,
            "body": body,
            "patient_id": patient_id,
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id
        try:
            get_supabase().table("notifications").insert(payload).execute()
        except Exception as exc:
            logger.warning("notification insert skipped: %s", exc)

    await run_blocking(_insert)


@router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, body: AppointmentUpdateRequest, ctx: dict = Depends(_patient_context)) -> dict:
    patient_id = ctx["patient"]["id"]

    def _existing() -> Optional[dict]:
        res = (
            get_supabase().table("appointments")
            .select("*")
            .eq("id", appointment_id)
            .eq("patient_id", patient_id)
            .execute()
        )
        return res.data[0] if res.data else None

    existing = await run_blocking(_existing)
    if not existing:
        raise HTTPException(status_code=404, detail="Appointment not found")

    updates: dict[str, Any] = {}
    if body.status is not None:
        if body.status not in APPOINTMENT_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid appointment status")
        updates["status"] = body.status
    if body.notes is not None:
        updates["notes"] = body.notes
    if body.cancellation_reason is not None:
        updates["cancellation_reason"] = body.cancellation_reason
    if body.slot_start is not None:
        doctor_id = body.doctor_id or existing.get("doctor_id")
        if not doctor_id:
            raise HTTPException(status_code=400, detail="Doctor is required to reschedule")
        slot_start = _normalize_slot(body.slot_start)
        service = AvailabilityService()
        slots = await service.get_available_slots(doctor_id, slot_start.date())
        match = next((slot for slot in slots if _normalize_slot(datetime.fromisoformat(slot["start"])) == slot_start), None)
        if not match:
            raise HTTPException(status_code=409, detail="Selected appointment slot is no longer available")
        doctor = await service.get_doctor_by_id(doctor_id)
        updates.update({
            "doctor_id": doctor_id,
            "doctor_name": doctor.get("name") if doctor else existing.get("doctor_name"),
            "date": slot_start.isoformat(),
            "slot_start": slot_start.isoformat(),
            "slot_end": _normalize_slot(body.slot_end or datetime.fromisoformat(match["end"])).isoformat(),
            "status": body.status or "rescheduled",
        })

    if not updates:
        return existing

    updates["updated_at"] = datetime.utcnow().isoformat()

    def _update() -> dict:
        res = (
            get_supabase().table("appointments")
            .update(updates)
            .eq("id", appointment_id)
            .eq("patient_id", patient_id)
            .execute()
        )
        return res.data[0] if res.data else {}

    updated = await run_blocking(_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if updated.get("status") == "cancelled":
        await _create_notification(patient_id, "new_appointment", "Appointment cancelled", "Your appointment was cancelled.")
    elif updated.get("status") == "rescheduled":
        await _create_notification(patient_id, "new_appointment", "Appointment rescheduled", "Your appointment time was updated.")
    return updated


@router.delete("/appointments/{appointment_id}")
async def cancel_appointment(
    appointment_id: str,
    reason: str = Query(default="Patient request"),
    ctx: dict = Depends(_patient_context),
) -> dict:
    return await update_appointment(
        appointment_id,
        AppointmentUpdateRequest(status="cancelled", cancellation_reason=reason),
        ctx,
    )


@router.get("/doctors")
async def list_doctors(ctx: dict = Depends(_patient_context)) -> list[dict]:
    void = ctx
    def _query() -> list[dict]:
        res = get_supabase().table("doctors").select("*").eq("is_active", True).order("name").execute()
        return res.data or []

    return await run_blocking(_query)


@router.get("/doctors/{doctor_id}/availability")
async def doctor_availability(
    doctor_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    ctx: dict = Depends(_patient_context),
) -> dict:
    void = ctx
    try:
        target_date = date_type.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    slots = await AvailabilityService().get_available_slots(doctor_id, target_date)
    return {"doctor_id": doctor_id, "date": date, "slots": slots}


@router.get("/messages")
async def list_messages(ctx: dict = Depends(_patient_context)) -> dict:
    patient_id = ctx["patient"]["id"]
    data = await _load_patient_data(patient_id)
    return {"conversations": data["conversations"]}


@router.get("/messages/{conversation_id}")
async def conversation_messages(conversation_id: str, ctx: dict = Depends(_patient_context)) -> dict:
    patient_id = ctx["patient"]["id"]

    def _query() -> Optional[dict]:
        conv = (
            get_supabase().table("conversations")
            .select("*")
            .eq("id", conversation_id)
            .eq("patient_id", patient_id)
            .execute()
        )
        if not conv.data:
            return None
        messages = (
            get_supabase().table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("timestamp")
            .execute()
        )
        item = conv.data[0]
        item["messages"] = messages.data or []
        return item

    conversation = await run_blocking(_query)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/messages")
async def send_message(body: PatientMessageRequest, ctx: dict = Depends(_patient_context)) -> dict:
    patient = ctx["patient"]
    response = await handle_chat(
        ChatRequest(
            patient_id=UUID(patient["id"]),
            patient_name=patient.get("name"),
            patient_phone=patient.get("phone"),
            patient_email=patient.get("email"),
            message=body.message,
            channel=body.channel,
            conversation_id=body.conversation_id,
        )
    )
    conversation_id = str(response.conversation_id) if response.conversation_id else None
    await _create_notification(
        patient_id=patient["id"],
        type_name="new_email" if body.channel == ChannelType.EMAIL else "new_whatsapp" if body.channel == ChannelType.WHATSAPP else "new_whatsapp",
        title="New AI reply",
        body=response.message[:240],
        conversation_id=conversation_id,
    )
    if conversation_id:
        return await conversation_messages(conversation_id, ctx)
    return response.model_dump(mode="json")


@router.get("/notifications")
async def list_notifications(limit: int = 100, ctx: dict = Depends(_patient_context)) -> list[dict]:
    patient_id = ctx["patient"]["id"]

    def _query() -> list[dict]:
        res = (
            get_supabase().table("notifications")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []

    return await run_blocking(_query)


@router.put("/notifications/read")
async def mark_notifications_read(body: MarkNotificationsReadRequest, ctx: dict = Depends(_patient_context)) -> dict:
    patient_id = ctx["patient"]["id"]

    def _update() -> int:
        query = get_supabase().table("notifications").update({"is_read": True}).eq("patient_id", patient_id)
        if not body.all:
            if not body.notification_id:
                raise HTTPException(status_code=400, detail="notification_id is required unless all=true")
            query = query.eq("id", body.notification_id)
        res = query.execute()
        return len(res.data or [])

    count = await run_blocking(_update)
    return {"success": True, "updated": count}


@router.get("/medication-reminders")
async def list_medication_reminders(ctx: dict = Depends(_patient_context)) -> list[dict]:
    patient_id = ctx["patient"]["id"]
    data = await _load_patient_data(patient_id)
    return data["medication_reminders"]


@router.get("/reminders")
async def list_patient_reminders(ctx: dict = Depends(_patient_context)) -> list[dict]:
    patient_id = ctx["patient"]["id"]
    data = await _load_patient_data(patient_id)
    return data["reminders"]


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, ctx: dict = Depends(_patient_context)) -> dict:
    patient_id = ctx["patient"]["id"]

    def _delete() -> int:
        res = (
            get_supabase().table("notifications")
            .delete()
            .eq("id", notification_id)
            .eq("patient_id", patient_id)
            .execute()
        )
        return len(res.data or [])

    deleted = await run_blocking(_delete)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.get("/search")
async def search_patient_portal(q: str = Query(..., min_length=1), ctx: dict = Depends(_patient_context)) -> dict:
    patient = ctx["patient"]
    needle = q.lower().strip()
    data = await _load_patient_data(patient["id"])
    profile = await get_profile(ctx)

    def contains(*values: Any) -> bool:
        return any(needle in str(value or "").lower() for value in values)

    appointment_results = [
        a for a in data["appointments"]
        if contains(a.get("doctor_name"), a.get("status"), a.get("notes"), a.get("date"), a.get("slot_start"))
    ][:10]
    conversation_results = [
        c for c in data["conversations"]
        if contains(c.get("intent"), c.get("status"), c.get("summary"), c.get("ai_summary"), c.get("channel"))
    ][:10]
    message_results = [
        {**m, "conversation": c.get("id")}
        for c in data["conversations"]
        for m in c.get("messages", [])
        if contains(m.get("sender"), m.get("content"), m.get("timestamp"))
    ][:10]
    notification_results = [
        n for n in data["notifications"]
        if contains(n.get("type"), n.get("title"), n.get("body"))
    ][:10]

    def _doctor_search() -> list[dict]:
        try:
            res = (
                get_supabase().table("doctors")
                .select("*")
                .eq("is_active", True)
                .order("name")
                .execute()
            )
            return [
                d for d in (res.data or [])
                if contains(d.get("name"), d.get("specialty"), d.get("email"), d.get("phone"))
            ][:10]
        except Exception:
            return []

    doctors = await run_blocking(_doctor_search)
    profile_matches = [profile] if contains(*profile.values()) else []

    return {
        "query": q,
        "appointments": appointment_results,
        "conversations": conversation_results,
        "messages": message_results,
        "notifications": notification_results,
        "doctors": doctors,
        "profile": profile_matches,
        "total": sum(
            len(items)
            for items in [appointment_results, conversation_results, message_results, notification_results, doctors, profile_matches]
        ),
    }
