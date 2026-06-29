"""
Production Seeder v3 — Generates realistic sample data for all tables.

Generates:
- 20 Doctors with realistic specialties
- Complete schedules for all doctors
- 500 Patients
- 2000 Conversations with realistic intents
- 5000 Messages
- 500 Appointments (properly scheduled)
- 200 Reminders
- 100 Escalations
- Clinic Holidays
- Doctor Leaves
- Notifications
- Conversation Timeline Events

Run: python -m app.utils.seeder_v3_production
"""
from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, date, time, timedelta
from uuid import uuid4

from app.db.supabase_client import get_supabase
from app.config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Sample Data ──────────────────────────────────────────────────────────────

DOCTOR_NAMES = [
    ("Dr. Sarah Johnson", "Cardiology"),
    ("Dr. Michael Chen", "Pediatrics"),
    ("Dr. Emily Rodriguez", "Dermatology"),
    ("Dr. James Wilson", "Orthopedics"),
    ("Dr. Lisa Anderson", "Neurology"),
    ("Dr. David Kumar", "General Practice"),
    ("Dr. Jennifer Brown", "Obstetrics"),
    ("Dr. Robert Taylor", "Psychiatry"),
    ("Dr. Maria Garcia", "Endocrinology"),
    ("Dr. Thomas Lee", "Gastroenterology"),
    ("Dr. Patricia Martinez", "Oncology"),
    ("Dr. Christopher White", "Urology"),
    ("Dr. Amanda Davis", "Rheumatology"),
    ("Dr. Daniel Thompson", "Pulmonology"),
    ("Dr. Michelle King", "Ophthalmology"),
    ("Dr. Kevin Moore", "ENT"),
    ("Dr. Laura Jackson", "General Practice"),
    ("Dr. Steven Harris", "Emergency Medicine"),
    ("Dr. Jessica Clark", "Nephrology"),
    ("Dr. Brian Lewis", "General Surgery"),
]

FIRST_NAMES = [
    "John", "Mary", "Michael", "Jennifer", "William", "Linda", "David", "Patricia",
    "James", "Maria", "Robert", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Paul", "Emily", "Steven", "Donna", "Andrew", "Michelle", "Joshua", "Carol",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White",
    "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
]

SYMPTOMS = [
    "headache", "fever", "cough", "back pain", "chest pain", "sore throat",
    "stomach ache", "dizziness", "fatigue", "shortness of breath", "nausea",
]

FAQ_QUESTIONS = [
    "What are your hours?",
    "Do you accept insurance?",
    "Where is the clinic located?",
    "Can I get a prescription refill?",
    "Do you offer telemedicine?",
    "What should I bring to my appointment?",
]

HOLIDAYS_2025 = [
    ("New Year's Day", "2025-01-01"),
    ("Martin Luther King Jr. Day", "2025-01-20"),
    ("Presidents' Day", "2025-02-17"),
    ("Memorial Day", "2025-05-26"),
    ("Independence Day", "2025-07-04"),
    ("Labor Day", "2025-09-01"),
    ("Thanksgiving", "2025-11-27"),
    ("Christmas", "2025-12-25"),
]

AVATAR_COLORS = [
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#ef4444", "#6366f1", "#84cc16", "#f97316",
]

DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]


# ─── Helper Functions ─────────────────────────────────────────────────────────


def get_initials(name: str) -> str:
    """Extract initials from name."""
    parts = name.replace("Dr. ", "").split()
    return "".join(p[0].upper() for p in parts[:2])


def random_phone() -> str:
    """Generate random phone number."""
    return f"+1-{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}"


def random_email(first: str, last: str) -> str:
    """Generate random email."""
    domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
    return f"{first.lower()}.{last.lower()}@{random.choice(domains)}"


def random_date_past(days: int = 30) -> datetime:
    """Generate random datetime in the past."""
    delta = timedelta(days=random.randint(0, days))
    return datetime.now() - delta


def random_date_future(days: int = 30) -> datetime:
    """Generate random datetime in the future."""
    delta = timedelta(days=random.randint(1, days))
    return datetime.now() + delta


# ─── Seeder Functions ─────────────────────────────────────────────────────────


async def seed_holidays():
    """Seed clinic holidays."""
    db = get_supabase()
    logger.info("Seeding holidays...")
    
    for name, date_str in HOLIDAYS_2025:
        try:
            db.table("clinic_holidays").insert({
                "name": name,
                "date": date_str,
                "is_active": True,
            }).execute()
        except Exception as e:
            logger.warning(f"Holiday {name} may already exist: {e}")
    
    logger.info(f"✅ Seeded {len(HOLIDAYS_2025)} holidays")


async def seed_doctors():
    """Seed doctors."""
    db = get_supabase()
    logger.info("Seeding doctors...")
    
    doctors = []
    for name, specialty in DOCTOR_NAMES:
        doctor_data = {
            "name": name,
            "specialty": specialty,
            "email": f"{name.lower().replace('dr. ', '').replace(' ', '.')}@{settings.CLINIC_NAME.lower().replace(' ', '')}.com",
            "phone": random_phone(),
            "avatar_color": random.choice(AVATAR_COLORS),
            "initials": get_initials(name),
            "is_active": True,
            "emergency_only": False,
        }
        try:
            res = db.table("doctors").insert(doctor_data).execute()
            if res.data:
                doctors.append(res.data[0])
        except Exception as e:
            logger.warning(f"Doctor {name} may already exist: {e}")
    
    logger.info(f"✅ Seeded {len(doctors)} doctors")
    return doctors


async def seed_doctor_schedules(doctors: list[dict]):
    """Seed doctor schedules."""
    db = get_supabase()
    logger.info("Seeding doctor schedules...")
    
    count = 0
    for doctor in doctors:
        for day in DAYS_OF_WEEK:
            # Most doctors work Mon-Fri, some work Sat
            if day == "saturday" and random.random() > 0.3:
                continue
            
            schedule_data = {
                "doctor_id": doctor["id"],
                "day_of_week": day,
                "start_time": "08:00" if day != "saturday" else "09:00",
                "end_time": "17:00" if day != "saturday" else "14:00",
                "lunch_start": "12:00",
                "lunch_end": "13:00",
                "slot_duration": random.choice([15, 30, 45]),
                "is_active": True,
            }
            try:
                db.table("doctor_schedules").insert(schedule_data).execute()
                count += 1
            except Exception as e:
                logger.warning(f"Schedule may already exist: {e}")
    
    logger.info(f"✅ Seeded {count} doctor schedules")


async def seed_doctor_leaves(doctors: list[dict]):
    """Seed doctor leaves."""
    db = get_supabase()
    logger.info("Seeding doctor leaves...")
    
    count = 0
    for doctor in random.sample(doctors, min(10, len(doctors))):
        # Add 1-2 leaves per doctor
        for _ in range(random.randint(1, 2)):
            start = random_date_future(60)
            end = start + timedelta(days=random.randint(1, 7))
            leave_data = {
                "doctor_id": doctor["id"],
                "start_date": start.date().isoformat(),
                "end_date": end.date().isoformat(),
                "reason": random.choice(["Vacation", "Conference", "Personal", "Medical"]),
            }
            try:
                db.table("doctor_leaves").insert(leave_data).execute()
                count += 1
            except Exception as e:
                logger.warning(f"Leave insertion error: {e}")
    
    logger.info(f"✅ Seeded {count} doctor leaves")


async def seed_patients(count: int = 500):
    """Seed patients."""
    db = get_supabase()
    logger.info(f"Seeding {count} patients...")
    
    patients = []
    for _ in range(count):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        patient_data = {
            "name": f"{first} {last}",
            "phone": random_phone(),
            "email": random_email(first, last),
            "preferred_channel": random.choice(["whatsapp", "email", "web"]),
        }
        try:
            res = db.table("patients").insert(patient_data).execute()
            if res.data:
                patients.append(res.data[0])
        except Exception as e:
            logger.warning(f"Patient insertion error: {e}")
    
    logger.info(f"✅ Seeded {len(patients)} patients")
    return patients


async def seed_conversations_and_messages(patients: list[dict], count: int = 2000):
    """Seed conversations and messages."""
    db = get_supabase()
    logger.info(f"Seeding {count} conversations...")
    
    intents = [
        "BOOK_APPOINTMENT", "RESCHEDULE_APPOINTMENT", "CANCEL_APPOINTMENT",
        "FAQ", "REMINDER", "FOLLOW_UP", "SYMPTOM_QUERY", "HUMAN_SUPPORT"
    ]
    statuses = ["open", "closed", "escalated"]
    ownerships = ["AI_ACTIVE", "HUMAN_ACTIVE", "CLOSED"]
    
    conversations = []
    for _ in range(count):
        patient = random.choice(patients)
        created_at = random_date_past(60)
        
        conv_data = {
            "patient_id": patient["id"],
            "channel": random.choice(["whatsapp", "email", "web"]),
            "intent": random.choice(intents),
            "status": random.choice(statuses),
            "ownership": random.choice(ownerships) if random.random() > 0.9 else "AI_ACTIVE",
            "ai_confidence": round(random.uniform(0.5, 1.0), 2),
            "created_at": created_at.isoformat(),
        }
        
        try:
            res = db.table("conversations").insert(conv_data).execute()
            if res.data:
                conversations.append(res.data[0])
        except Exception as e:
            logger.warning(f"Conversation insertion error: {e}")
    
    logger.info(f"✅ Seeded {len(conversations)} conversations")
    
    # Seed messages for each conversation
    logger.info("Seeding messages...")
    msg_count = 0
    for conv in conversations:
        num_msgs = random.randint(2, 10)
        msg_created = datetime.fromisoformat(conv["created_at"])
        
        for i in range(num_msgs):
            sender = "patient" if i % 2 == 0 else "ai"
            if conv.get("ownership") == "HUMAN_ACTIVE" and random.random() > 0.5:
                sender = "staff"
            
            if sender == "patient":
                content = random.choice(FAQ_QUESTIONS + [f"I have {random.choice(SYMPTOMS)}"])
            elif sender == "ai":
                content = "I understand. Let me help you with that."
            else:
                content = "I'm here to assist you personally."
            
            msg_data = {
                "conversation_id": conv["id"],
                "sender": sender,
                "content": content,
                "timestamp": (msg_created + timedelta(minutes=i*5)).isoformat(),
            }
            
            try:
                db.table("messages").insert(msg_data).execute()
                msg_count += 1
            except Exception as e:
                pass
    
    logger.info(f"✅ Seeded {msg_count} messages")
    return conversations


async def seed_appointments(patients: list[dict], doctors: list[dict], count: int = 500):
    """Seed appointments."""
    db = get_supabase()
    logger.info(f"Seeding {count} appointments...")
    
    statuses = ["scheduled", "confirmed", "cancelled", "completed"]
    
    appointments = []
    for _ in range(count):
        patient = random.choice(patients)
        doctor = random.choice(doctors)
        
        # Mix of past and future appointments
        if random.random() > 0.3:
            appt_date = random_date_future(60)
            status = random.choice(["scheduled", "confirmed"])
        else:
            appt_date = random_date_past(30)
            status = random.choice(["completed", "cancelled"])
        
        # Set slot times (30 min slots)
        slot_start = appt_date.replace(hour=random.randint(8, 16), minute=random.choice([0, 30]), second=0, microsecond=0)
        slot_end = slot_start + timedelta(minutes=30)
        
        appt_data = {
            "patient_id": patient["id"],
            "doctor_id": doctor["id"],
            "doctor_name": doctor["name"],
            "date": slot_start.isoformat(),
            "slot_start": slot_start.isoformat(),
            "slot_end": slot_end.isoformat(),
            "status": status,
            "notes": random.choice([None, "First visit", "Follow-up", "Annual checkup"]),
        }
        
        try:
            res = db.table("appointments").insert(appt_data).execute()
            if res.data:
                appointments.append(res.data[0])
        except Exception as e:
            pass
    
    logger.info(f"✅ Seeded {len(appointments)} appointments")
    return appointments


async def seed_reminders(patients: list[dict], count: int = 200):
    """Seed reminders."""
    db = get_supabase()
    logger.info(f"Seeding {count} reminders...")
    
    types = ["medication", "appointment", "follow_up"]
    statuses = ["pending", "sent", "failed"]
    
    reminders = []
    for _ in range(count):
        patient = random.choice(patients)
        reminder_data = {
            "patient_id": patient["id"],
            "type": random.choice(types),
            "scheduled_at": random_date_future(14).isoformat(),
            "message": f"Reminder: {random.choice(['Take medication', 'Upcoming appointment', 'Follow-up needed'])}",
            "status": random.choice(statuses),
        }
        
        try:
            res = db.table("reminders").insert(reminder_data).execute()
            if res.data:
                reminders.append(res.data[0])
        except Exception as e:
            pass
    
    logger.info(f"✅ Seeded {len(reminders)} reminders")
    return reminders


async def seed_escalations(patients: list[dict], conversations: list[dict], count: int = 100):
    """Seed escalations."""
    db = get_supabase()
    logger.info(f"Seeding {count} escalations...")
    
    priorities = ["low", "medium", "high", "critical"]
    statuses = ["open", "in_progress", "resolved"]
    reasons = [
        "emergency_detected", "low_confidence", "human_requested",
        "safety_violation", "complex_query", "angry_patient"
    ]
    
    escalations = []
    for _ in range(count):
        patient = random.choice(patients)
        conv = random.choice(conversations) if conversations and random.random() > 0.3 else None
        
        escalation_data = {
            "patient_id": patient["id"],
            "conversation_id": conv["id"] if conv else None,
            "reason": random.choice(reasons),
            "priority": random.choice(priorities),
            "status": random.choice(statuses),
            "summary": f"Escalation summary for {patient['name']}",
        }
        
        try:
            res = db.table("escalations").insert(escalation_data).execute()
            if res.data:
                escalations.append(res.data[0])
        except Exception as e:
            pass
    
    logger.info(f"✅ Seeded {len(escalations)} escalations")
    return escalations


async def seed_notifications(patients: list[dict], conversations: list[dict], count: int = 150):
    """Seed notifications."""
    db = get_supabase()
    logger.info(f"Seeding {count} notifications...")
    
    types = ["emergency", "new_appointment", "human_takeover", "new_email", "new_whatsapp", "low_confidence"]
    
    notifications = []
    for _ in range(count):
        patient = random.choice(patients)
        conv = random.choice(conversations) if conversations and random.random() > 0.5 else None
        notif_type = random.choice(types)
        
        notif_data = {
            "type": notif_type,
            "title": f"{notif_type.replace('_', ' ').title()} - {patient['name']}",
            "body": f"Notification body for {notif_type}",
            "patient_id": patient["id"],
            "conversation_id": conv["id"] if conv else None,
            "is_read": random.random() > 0.3,
        }
        
        try:
            res = db.table("notifications").insert(notif_data).execute()
            if res.data:
                notifications.append(res.data[0])
        except Exception as e:
            pass
    
    logger.info(f"✅ Seeded {len(notifications)} notifications")
    return notifications


async def seed_timeline_events(conversations: list[dict]):
    """Seed conversation timeline events."""
    db = get_supabase()
    logger.info("Seeding timeline events...")
    
    event_types = ["created", "ai_reply", "human_reply", "takeover_started", "takeover_ended", "escalated", "closed"]
    
    count = 0
    for conv in random.sample(conversations, min(500, len(conversations))):
        num_events = random.randint(2, 8)
        event_time = datetime.fromisoformat(conv["created_at"])
        
        for i in range(num_events):
            event_type = random.choice(event_types)
            actor = "AI" if "ai" in event_type else random.choice(["Staff", "System", "Patient"])
            
            timeline_data = {
                "conversation_id": conv["id"],
                "event_type": event_type,
                "actor": actor,
                "note": f"{event_type.replace('_', ' ').title()} event",
                "created_at": (event_time + timedelta(minutes=i*10)).isoformat(),
            }
            
            try:
                db.table("conversation_timeline").insert(timeline_data).execute()
                count += 1
            except Exception as e:
                pass
    
    logger.info(f"✅ Seeded {count} timeline events")


# ─── Main Seeder ──────────────────────────────────────────────────────────────


async def main():
    """Run all seeders in order."""
    logger.info("=" * 60)
    logger.info("Starting Production Seeder v3")
    logger.info("=" * 60)
    
    try:
        # 1. Holidays
        await seed_holidays()
        
        # 2. Doctors
        doctors = await seed_doctors()
        await seed_doctor_schedules(doctors)
        await seed_doctor_leaves(doctors)
        
        # 3. Patients
        patients = await seed_patients(500)
        
        # 4. Conversations & Messages
        conversations = await seed_conversations_and_messages(patients, 2000)
        
        # 5. Appointments
        appointments = await seed_appointments(patients, doctors, 500)
        
        # 6. Reminders
        reminders = await seed_reminders(patients, 200)
        
        # 7. Escalations
        escalations = await seed_escalations(patients, conversations, 100)
        
        # 8. Notifications
        notifications = await seed_notifications(patients, conversations, 150)
        
        # 9. Timeline Events
        await seed_timeline_events(conversations)
        
        logger.info("=" * 60)
        logger.info("✅ Production Seeding Complete!")
        logger.info(f"   Doctors: {len(doctors)}")
        logger.info(f"   Patients: {len(patients)}")
        logger.info(f"   Conversations: {len(conversations)}")
        logger.info(f"   Appointments: {len(appointments)}")
        logger.info(f"   Reminders: {len(reminders)}")
        logger.info(f"   Escalations: {len(escalations)}")
        logger.info(f"   Notifications: {len(notifications)}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Seeding failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
