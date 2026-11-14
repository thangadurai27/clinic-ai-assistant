"""
Isolated sample data for the public demo account.

Nothing in this module reads or writes real clinic tables. Demo API responses are
built from these deterministic, fictional records so a public visitor can never
see genuine patient information. Demo state that is allowed to change during a
session (takeover ownership, read notifications, simulated messages) lives in
memory only and disappears when the backend restarts.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid5

DEMO_NAMESPACE = UUID("f1e7c1d2-5d8b-4b2e-9a51-5a7c2d9f0e11")

AVATAR_COLORS = ["#14b8a6", "#6366f1", "#22c55e", "#f59e0b", "#8b5cf6", "#3b82f6", "#ef4444", "#ec4899"]


def _uuid(key: str) -> str:
    return str(uuid5(DEMO_NAMESPACE, key))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _days_ago(days: int, hour: int = 10, minute: int = 15) -> str:
    value = (_now() - timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return _iso(value)


def _days_ahead(days: int, hour: int = 10, minute: int = 30) -> str:
    value = (_now() + timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return _iso(value)


def _today(hour: int, minute: int = 0) -> str:
    value = _now().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return _iso(value)


# ── Patients ─────────────────────────────────────────────────────────────────

_PATIENT_ROWS = [
    ("patient-1", "Aarav Demo", "+1-555-0101", "aarav.demo@example.com", "whatsapp"),
    ("patient-2", "Meera Sample", "+1-555-0102", "meera.sample@example.com", "email"),
    ("patient-3", "Daniel Example", "+1-555-0103", "daniel.example@example.com", "web"),
    ("patient-4", "Sofia Testcase", "+1-555-0104", "sofia.testcase@example.com", "whatsapp"),
    ("patient-5", "Noah Playground", "+1-555-0105", "noah.playground@example.com", "email"),
    ("patient-6", "Ishita Sandbox", "+1-555-0106", "ishita.sandbox@example.com", "web"),
]


def patients() -> list[dict]:
    rows = []
    for index, (key, name, phone, email, channel) in enumerate(_PATIENT_ROWS):
        rows.append(
            {
                "id": _uuid(key),
                "name": name,
                "phone": phone,
                "email": email,
                "preferred_channel": channel,
                "created_at": _days_ago(90 - index * 9),
                "is_demo": True,
            }
        )
    return rows


def _patient(patient_id: str) -> dict:
    return next((p for p in patients() if p["id"] == patient_id), patients()[0])


# ── Doctors ──────────────────────────────────────────────────────────────────

_DOCTOR_ROWS = [
    ("doctor-1", "Dr. Maya Demo", "General Medicine", "Dr. Maya Demo", "MD", "#14b8a6"),
    ("doctor-2", "Dr. Arjun Sample", "Cardiology", "Dr. Arjun Sample", "AS", "#6366f1"),
    ("doctor-3", "Dr. Elena Testcase", "Pediatrics", "Dr. Elena Testcase", "ET", "#f59e0b"),
    ("doctor-4", "Dr. Victor Playground", "Dermatology", "Dr. Victor Playground", "VP", "#3b82f6"),
]


def doctors() -> list[dict]:
    rows = []
    for index, (key, name, specialty, _full, initials, color) in enumerate(_DOCTOR_ROWS):
        rows.append(
            {
                "id": _uuid(key),
                "name": name,
                "specialty": specialty,
                "email": f"{key}@demo-clinic.example",
                "phone": f"+1-555-02{index:02d}",
                "avatar_color": color,
                "initials": initials,
                "is_active": True,
                "emergency_only": index == 1,
                "created_at": _days_ago(120),
                "is_demo": True,
            }
        )
    return rows


def availability(doctor_id: str, target_date: str) -> dict:
    slots = []
    try:
        day = date.fromisoformat(target_date)
    except ValueError:
        day = date.today()
    for hour in (9, 9, 10, 11, 14, 15, 16):
        start = datetime.combine(day, datetime.min.time()).replace(hour=hour, minute=0)
        slots.append(
            {
                "start": start.isoformat(),
                "end": (start + timedelta(minutes=30)).isoformat(),
                "label": start.strftime("%I:%M %p"),
                "available": hour not in (9, 15),
                "date": target_date,
            }
        )
    return {"doctor_id": doctor_id, "date": target_date, "slots": slots}


# ── Conversations & messages ─────────────────────────────────────────────────

_CONVERSATIONS = [
    {
        "id": "conversation-1",
        "patient_id": "patient-1",
        "channel": "whatsapp",
        "intent": "BOOK_APPOINTMENT",
        "status": "open",
        "ownership": "AI_ACTIVE",
        "taken_over_by": None,
        "summary": "Patient asked for an appointment with Dr. Maya Demo this week.",
        "ai_summary": "Booked a follow-up slot and confirmed insurance details.",
        "ai_confidence": 0.94,
        "last_message": "Great, I have reserved Thursday at 10:30 AM for you.",
        "last_message_minutes": 8,
        "created_days": 1,
    },
    {
        "id": "conversation-2",
        "patient_id": "patient-2",
        "channel": "email",
        "intent": "SYMPTOM_QUERY",
        "status": "escalated",
        "ownership": "HUMAN_ACTIVE",
        "taken_over_by": "Demo Receptionist",
        "summary": "Patient reported persistent chest tightness after exercise.",
        "ai_summary": "Escalated to human staff because symptoms could be urgent.",
        "ai_confidence": 0.62,
        "last_message": "A receptionist is reviewing your message now.",
        "last_message_minutes": 24,
        "created_days": 0,
    },
    {
        "id": "conversation-3",
        "patient_id": "patient-3",
        "channel": "web",
        "intent": "FAQ",
        "status": "open",
        "ownership": "AI_ACTIVE",
        "taken_over_by": None,
        "summary": "Asked about clinic opening hours and parking.",
        "ai_summary": "Shared clinic hours, address, and parking guidance.",
        "ai_confidence": 0.98,
        "last_message": "We are open Monday to Friday, 8 AM to 6 PM.",
        "last_message_minutes": 65,
        "created_days": 2,
    },
    {
        "id": "conversation-4",
        "patient_id": "patient-4",
        "channel": "whatsapp",
        "intent": "RESCHEDULE_APPOINTMENT",
        "status": "open",
        "ownership": "AI_ACTIVE",
        "taken_over_by": None,
        "summary": "Requested to move an appointment to next week.",
        "ai_summary": "Offered three replacement slots.",
        "ai_confidence": 0.89,
        "last_message": "I can move you to Tuesday or Wednesday afternoon.",
        "last_message_minutes": 120,
        "created_days": 3,
    },
    {
        "id": "conversation-5",
        "patient_id": "patient-5",
        "channel": "email",
        "intent": "REMINDER",
        "status": "closed",
        "ownership": "CLOSED",
        "taken_over_by": None,
        "summary": "Appointment reminder confirmation.",
        "ai_summary": "Patient confirmed the reminder.",
        "ai_confidence": 0.97,
        "last_message": "Thank you, I will be there.",
        "last_message_minutes": 1440,
        "created_days": 6,
    },
]

_MESSAGES = {
    "conversation-1": [
        ("patient", "Hi, can I book a follow-up with Dr. Maya Demo this week?"),
        ("ai", "Of course. I have Thursday 10:30 AM or Friday 2:00 PM available. Which do you prefer?"),
        ("patient", "Thursday works. My insurance is unchanged."),
        ("ai", "Great, I have reserved Thursday at 10:30 AM for you."),
    ],
    "conversation-2": [
        ("patient", "I felt chest tightness after my run yesterday. It eased, but I am worried."),
        ("ai", "Thank you for telling me. Because this could be urgent, I am connecting you with clinic staff now."),
        ("staff", "A receptionist is reviewing your message now."),
    ],
    "conversation-3": [
        ("patient", "What are your opening hours and is parking available?"),
        ("ai", "We are open Monday to Friday, 8 AM to 6 PM. Free patient parking is available behind the building."),
        ("patient", "Perfect, thank you."),
    ],
    "conversation-4": [
        ("patient", "Can I move my appointment from Friday to next week?"),
        ("ai", "I can move you to Tuesday or Wednesday afternoon. Would 2:30 PM work?"),
        ("patient", "Tuesday 2:30 is good."),
    ],
    "conversation-5": [
        ("ai", "Reminder: your appointment with Dr. Maya Demo is tomorrow at 10:30 AM."),
        ("patient", "Thank you, I will be there."),
    ],
}

_TIMELINE = {
    "conversation-1": [
        ("created", "AI", "Conversation started on WhatsApp"),
        ("ai_reply", "AI", "Collected appointment preference"),
        ("ai_reply", "AI", "Reserved Thursday 10:30 AM"),
    ],
    "conversation-2": [
        ("created", "AI", "Conversation started via email"),
        ("escalated", "AI", "Chest tightness flagged as potentially urgent"),
        ("takeover_started", "Demo Receptionist", "Receptionist took over for safety review"),
    ],
    "conversation-3": [("created", "AI", "Web chat started"), ("ai_reply", "AI", "Answered FAQ")],
    "conversation-4": [("created", "AI", "WhatsApp conversation started"), ("ai_reply", "AI", "Offered replacement slots")],
    "conversation-5": [("created", "AI", "Reminder delivered"), ("closed", "AI", "Conversation closed")],
}

# Runtime-only demo overrides. These never touch Supabase.
_OWNERSHIP_OVERRIDES: dict[str, dict] = {}
_EXTRA_MESSAGES: dict[str, list[dict]] = {}
_EXTRA_TIMELINE: dict[str, list[dict]] = {}
_ESCALATION_OVERRIDES: dict[str, str] = {}
_READ_NOTIFICATIONS: set[str] = set()


def reset_demo_state() -> None:
    _OWNERSHIP_OVERRIDES.clear()
    _EXTRA_MESSAGES.clear()
    _EXTRA_TIMELINE.clear()
    _ESCALATION_OVERRIDES.clear()
    _READ_NOTIFICATIONS.clear()


def conversations(status: str | None = None) -> list[dict]:
    rows = []
    now = _now()
    for index, source in enumerate(_CONVERSATIONS):
        item = {
            "id": _uuid(source["id"]),
            "patient_id": _uuid(source["patient_id"]),
            "channel": source["channel"],
            "intent": source["intent"],
            "status": source["status"],
            "ownership": source["ownership"],
            "taken_over_by": source["taken_over_by"],
            "summary": source["summary"],
            "ai_summary": source["ai_summary"],
            "ai_confidence": source["ai_confidence"],
            "last_message": source["last_message"],
            "last_message_at": _iso(now - timedelta(minutes=source["last_message_minutes"])),
            "updated_at": _iso(now - timedelta(minutes=source["last_message_minutes"])),
            "created_at": _days_ago(source["created_days"], 9, index * 7),
            "patients": _patient(_uuid(source["patient_id"])),
            "is_demo": True,
        }
        item.update(_OWNERSHIP_OVERRIDES.get(item["id"], {}))
        rows.append(item)
    if status:
        rows = [row for row in rows if row["status"] == status]
    return rows


def conversation(conversation_id: str) -> dict | None:
    for item in conversations():
        if item["id"] == conversation_id:
            messages = _messages_for(item["id"])
            return {**item, "messages": messages}
    return None


def _messages_for(conversation_id: str) -> list[dict]:
    source_key = next(
        (key for key in _MESSAGES if _uuid(key) == conversation_id),
        None,
    )
    if not source_key:
        return list(_EXTRA_MESSAGES.get(conversation_id, []))

    base = []
    for index, (sender, content) in enumerate(_MESSAGES[source_key]):
        base.append(
            {
                "id": _uuid(f"{source_key}-message-{index}"),
                "conversation_id": conversation_id,
                "sender": sender,
                "content": content,
                "channel": next(c["channel"] for c in _CONVERSATIONS if c["id"] == source_key),
                "timestamp": _days_ago(1, 9 + index, 5),
                "status": "delivered",
            }
        )
    base.extend(_EXTRA_MESSAGES.get(conversation_id, []))
    return base


def timeline(conversation_id: str) -> list[dict]:
    source_key = next((key for key in _TIMELINE if _uuid(key) == conversation_id), None)
    rows = []
    if source_key:
        for index, (event_type, actor, note) in enumerate(_TIMELINE[source_key]):
            rows.append(
                {
                    "id": _uuid(f"{source_key}-timeline-{index}"),
                    "conversation_id": conversation_id,
                    "event_type": event_type,
                    "actor": actor,
                    "note": note,
                    "created_at": _days_ago(1, 9 + index, 10),
                    "is_demo": True,
                }
            )
    rows.extend(_EXTRA_TIMELINE.get(conversation_id, []))
    return rows


def takeover(conversation_id: str, staff_name: str, note: str | None = None) -> dict:
    _OWNERSHIP_OVERRIDES[conversation_id] = {
        "ownership": "HUMAN_ACTIVE",
        "taken_over_by": staff_name,
        "taken_over_at": _iso(_now()),
        "status": "open",
    }
    _EXTRA_TIMELINE.setdefault(conversation_id, []).append(
        {
            "id": _uuid(f"takeover-{conversation_id}-{len(_EXTRA_TIMELINE.get(conversation_id, []))}"),
            "conversation_id": conversation_id,
            "event_type": "takeover_started",
            "actor": staff_name,
            "note": note or f"{staff_name} took over the conversation",
            "created_at": _iso(_now()),
            "is_demo": True,
        }
    )
    return {"status": "HUMAN_ACTIVE", "taken_over_by": staff_name}


def resume_ai(conversation_id: str, note: str | None = None) -> dict:
    _OWNERSHIP_OVERRIDES[conversation_id] = {
        "ownership": "AI_ACTIVE",
        "taken_over_by": None,
        "resumed_ai_at": _iso(_now()),
        "status": "open",
    }
    _EXTRA_TIMELINE.setdefault(conversation_id, []).append(
        {
            "id": _uuid(f"resume-{conversation_id}-{len(_EXTRA_TIMELINE.get(conversation_id, []))}"),
            "conversation_id": conversation_id,
            "event_type": "takeover_ended",
            "actor": "Staff",
            "note": note or "AI resumed control",
            "created_at": _iso(_now()),
            "is_demo": True,
        }
    )
    return {"status": "AI_ACTIVE"}


def add_staff_message(conversation_id: str, content: str, staff_name: str) -> dict:
    message = {
        "id": _uuid(f"staff-message-{conversation_id}-{len(_EXTRA_MESSAGES.get(conversation_id, []))}"),
        "conversation_id": conversation_id,
        "sender": "staff",
        "content": content,
        "channel": "web",
        "timestamp": _iso(_now()),
        "status": "delivered",
        "staff_name": staff_name,
        "is_demo": True,
    }
    _EXTRA_MESSAGES.setdefault(conversation_id, []).append(message)
    _EXTRA_TIMELINE.setdefault(conversation_id, []).append(
        {
            "id": _uuid(f"staff-timeline-{conversation_id}-{len(_EXTRA_TIMELINE.get(conversation_id, []))}"),
            "conversation_id": conversation_id,
            "event_type": "human_reply",
            "actor": staff_name,
            "note": content[:100],
            "created_at": _iso(_now()),
            "is_demo": True,
        }
    )
    return message


# ── Appointments ─────────────────────────────────────────────────────────────

_APPOINTMENT_ROWS = [
    ("appointment-1", "patient-1", "Dr. Maya Demo", 0, 10, 30, "confirmed", "Follow-up consultation"),
    ("appointment-2", "patient-3", "Dr. Arjun Sample", 0, 14, 0, "scheduled", "Blood pressure review"),
    ("appointment-3", "patient-2", "Dr. Elena Testcase", 1, 9, 30, "scheduled", "Pediatric consultation"),
    ("appointment-4", "patient-4", "Dr. Victor Playground", 2, 11, 0, "confirmed", "Skin allergy review"),
    ("appointment-5", "patient-5", "Dr. Maya Demo", -2, 15, 0, "completed", "Routine checkup"),
    ("appointment-6", "patient-6", "Dr. Arjun Sample", -4, 10, 0, "cancelled", "Rescheduled by patient"),
]


def appointments() -> list[dict]:
    rows = []
    for key, patient_id, doctor_name, offset, hour, minute, status, notes in _APPOINTMENT_ROWS:
        if offset == 0:
            start = _today(hour, minute)
        elif offset > 0:
            start = _days_ahead(offset, hour, minute)
        else:
            start = _days_ago(abs(offset), hour, minute)
        rows.append(
            {
                "id": _uuid(key),
                "patient_id": _uuid(patient_id),
                "doctor_id": _uuid("doctor-1"),
                "doctor_name": doctor_name,
                "date": start,
                "slot_start": start,
                "slot_end": _iso(datetime.fromisoformat(start.replace("Z", "+00:00")) + timedelta(minutes=30)),
                "status": status,
                "notes": notes,
                "created_at": _days_ago(4),
                "patients": _patient(_uuid(patient_id)),
                "is_demo": True,
            }
        )
    return rows


# ── Escalations ──────────────────────────────────────────────────────────────

_ESCALATION_ROWS = [
    (
        "escalation-1",
        "patient-2",
        "conversation-2",
        "Chest tightness after exercise — possible cardiac symptom",
        "critical",
        "open",
        "Patient reports intermittent chest tightness. Safety layer escalated immediately.",
        15,
    ),
    (
        "escalation-2",
        "patient-4",
        "conversation-4",
        "Patient requested urgent reschedule",
        "medium",
        "in_progress",
        "Patient needs a sooner appointment due to travel.",
        180,
    ),
    (
        "escalation-3",
        "patient-5",
        "conversation-5",
        "Low AI confidence on insurance question",
        "low",
        "resolved",
        "Receptionist clarified coverage details.",
        1440,
    ),
]


def escalations(status: str | None = None) -> list[dict]:
    rows = []
    for key, patient_id, conversation_key, reason, priority, status_value, summary, minutes in _ESCALATION_ROWS:
        actual_status = _ESCALATION_OVERRIDES.get(_uuid(key), status_value)
        rows.append(
            {
                "id": _uuid(key),
                "patient_id": _uuid(patient_id),
                "conversation_id": _uuid(conversation_key),
                "reason": reason,
                "priority": priority,
                "status": actual_status,
                "summary": summary,
                "created_at": _iso(_now() - timedelta(minutes=minutes)),
                "patients": _patient(_uuid(patient_id)),
                "is_demo": True,
            }
        )
    if status:
        rows = [row for row in rows if row["status"] == status]
    return rows


def update_escalation(escalation_id: str, status_value: str) -> dict:
    _ESCALATION_OVERRIDES[escalation_id] = status_value
    for row in escalations():
        if row["id"] == escalation_id:
            return row
    return {"id": escalation_id, "status": status_value}


# ── Notifications ────────────────────────────────────────────────────────────

_NOTIFICATION_ROWS = [
    ("notification-1", "emergency", "Emergency escalation", "Chest tightness reported by Meera Sample.", False, 15),
    ("notification-2", "new_appointment", "New appointment booked", "Aarav Demo booked Thursday 10:30 AM with Dr. Maya Demo.", False, 28),
    ("notification-3", "human_takeover", "Human takeover", "Demo Receptionist is handling a symptomatic patient.", False, 35),
    ("notification-4", "new_email", "New email received", "Daniel Example asked about clinic hours.", True, 80),
    ("notification-5", "new_whatsapp", "New WhatsApp message", "Sofia Testcase requested a reschedule.", True, 130),
    ("notification-6", "escalation", "Escalation resolved", "Insurance question was resolved.", True, 300),
    ("notification-7", "new_appointment", "Appointment confirmed", "Noah Playground confirmed tomorrow at 9:30 AM.", True, 420),
    ("notification-8", "new_whatsapp", "Reminder delivered", "Appointment reminder was delivered successfully.", True, 1440),
]


def notifications(limit: int = 50) -> list[dict]:
    rows = []
    for key, type_value, title, body, is_read, minutes in _NOTIFICATION_ROWS:
        notification_id = _uuid(key)
        rows.append(
            {
                "id": notification_id,
                "type": type_value,
                "title": title,
                "body": body,
                "patient_id": None,
                "conversation_id": None,
                "escalation_id": None,
                "is_read": True if notification_id in _READ_NOTIFICATIONS else is_read,
                "metadata": {"demo": True},
                "created_at": _iso(_now() - timedelta(minutes=minutes)),
                "is_demo": True,
            }
        )
    return rows[:limit]


def mark_notification_read(notification_id: str) -> dict:
    _READ_NOTIFICATIONS.add(notification_id)
    return {"id": notification_id, "is_read": True}


def mark_all_notifications_read() -> None:
    for row in notifications():
        _READ_NOTIFICATIONS.add(row["id"])


def unread_notification_count() -> int:
    return sum(1 for row in notifications() if not row["is_read"])


# ── Dashboard & analytics ────────────────────────────────────────────────────

def dashboard_stats() -> dict:
    convs = conversations()
    escs = escalations()
    appts = appointments()
    today_prefix = _now().date().isoformat()
    return {
        "total_patients": len(patients()),
        "total_conversations": len(convs),
        "active_conversations": sum(1 for c in convs if c["status"] == "open"),
        "appointments_today": sum(1 for a in appts if str(a["date"]).startswith(today_prefix)),
        "total_appointments": len(appts),
        "open_escalations": sum(1 for e in escs if e["status"] == "open"),
        "resolved_escalations": sum(1 for e in escs if e["status"] == "resolved"),
        "active_doctors": len(doctors()),
        "total_emails": sum(1 for c in convs if c["channel"] == "email"),
        "total_whatsapp": sum(1 for c in convs if c["channel"] == "whatsapp"),
        "ai_responses": 34,
        "human_takeovers": sum(1 for c in convs if c["ownership"] == "HUMAN_ACTIVE"),
        "avg_response_time": 1.8,
        "automation_rate": 87.5,
        "escalation_rate": 12.5,
    }


def _intent_distribution() -> list[dict]:
    counts: dict[str, int] = {}
    for row in conversations():
        intent = row.get("intent") or "FAQ"
        counts[intent] = counts.get(intent, 0) + 1
    return [{"intent": key, "count": value} for key, value in sorted(counts.items(), key=lambda item: -item[1])]


def _daily_conversations(period_days: int = 14) -> list[dict]:
    rows = []
    for offset in range(period_days - 1, -1, -1):
        day = date.today() - timedelta(days=offset)
        rows.append(
            {
                "date": day.strftime("%b %d"),
                "count": 8 + ((offset * 7 + 3) % 17),
            }
        )
    return rows


def _performance() -> dict:
    return {
        "ai_accuracy": 94.2,
        "automation_rate": 87.5,
        "avg_ai_response_time": 1.8,
        "avg_resolution_time": 12.4,
        "escalation_rate": 12.5,
    }


def _channels() -> list[dict]:
    return [
        {"channel": "whatsapp", "count": 126, "percentage": 52.5},
        {"channel": "email", "count": 72, "percentage": 30.0},
        {"channel": "web", "count": 42, "percentage": 17.5},
    ]


def _messages() -> dict:
    return {
        "total_messages": 842,
        "patient_messages": 361,
        "ai_responses": 438,
        "staff_responses": 43,
    }


def analytics_summary(period_days: int = 14) -> dict:
    stats = dashboard_stats()
    intents = _intent_distribution()
    timeline = [
        {"date": row["date"], "ai_handled": max(row["count"] - 1, 0), "escalated": min(row["count"], 2)}
        for row in _daily_conversations(period_days)
    ]
    return {
        "intent_distribution": intents,
        "daily_conversations": _daily_conversations(period_days),
        "stats": stats,
        "total_patients": stats["total_patients"],
        "total_appointments": stats["total_appointments"],
        "ai_resolved": stats["ai_responses"],
        "active_escalations": stats["open_escalations"],
        "accuracy_timeline": timeline,
        "top_patient_intents": intents[:10],
        "performance": _performance(),
        "channels": _channels(),
        "messages": _messages(),
    }


def analytics_payload(period_days: int = 30) -> dict:
    summary = analytics_summary(period_days)
    return {
        "total_patients": summary["stats"]["total_patients"],
        "total_appointments": summary["stats"]["total_appointments"],
        "ai_resolved": summary["stats"]["ai_responses"],
        "active_escalations": summary["stats"]["open_escalations"],
        "accuracy_timeline": summary["accuracy_timeline"],
        "intent_distribution": summary["intent_distribution"],
        "top_patient_intents": summary["top_patient_intents"],
        "performance": summary["performance"],
        "channels": summary["channels"],
        "messages": summary["messages"],
        "stats": summary["stats"],
    }


# ── Users shown in demo administration screens ───────────────────────────────

def admin_users() -> list[dict]:
    rows = [
        {
            "id": _uuid("user-demo-receptionist"),
            "auth_user_id": _uuid("auth-demo-receptionist"),
            "email": "demo@gmail.com",
            "full_name": "Demo Receptionist",
            "phone": "+1-555-0000",
            "role": "receptionist",
            "is_active": True,
            "is_verified": True,
            "last_login": _iso(_now()),
            "created_at": _days_ago(30),
            "is_demo": True,
        }
    ]
    for index, patient in enumerate(patients()):
        rows.append(
            {
                "id": _uuid(f"user-{index}"),
                "auth_user_id": _uuid(f"auth-{index}"),
                "email": patient["email"],
                "full_name": patient["name"],
                "phone": patient["phone"],
                "role": "patient",
                "is_active": True,
                "is_verified": True,
                "last_login": _days_ago(index + 1),
                "created_at": patient["created_at"],
                "is_demo": True,
            }
        )
    return rows


def system_stats() -> dict:
    users = admin_users()
    counts: dict[str, int] = {}
    for user in users:
        counts[user["role"]] = counts.get(user["role"], 0) + 1
    return {"total_users": len(users), "users_by_role": counts, "is_demo": True}
