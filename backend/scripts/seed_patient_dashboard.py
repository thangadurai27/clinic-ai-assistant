"""
Seed Patient Dashboard Data — 12 Doctors, realistic schedules, reminders, and notifications.
"""
import asyncio
import logging
import random
from datetime import datetime, date, time, timedelta
from uuid import uuid4

from app.db.supabase_client import get_supabase
from app.config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOCTORS_DATA = [
    {
        "name": "Dr. Priya Sharma",
        "specialty": "Cardiologist",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience_years": 12,
        "consultation_fee": 1200.00,
        "avatar_color": "#ef4444",
        "initials": "PS",
    },
    {
        "name": "Dr. Arjun Kumar",
        "specialty": "General Physician",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience_years": 8,
        "consultation_fee": 600.00,
        "avatar_color": "#10b981",
        "initials": "AK",
    },
    {
        "name": "Dr. Meera Nair",
        "specialty": "Dermatologist",
        "qualification": "MBBS, MD (Dermatology)",
        "experience_years": 10,
        "consultation_fee": 800.00,
        "avatar_color": "#ec4899",
        "initials": "MN",
    },
    {
        "name": "Dr. Rahul Menon",
        "specialty": "Orthopedic Surgeon",
        "qualification": "MBBS, MS (Ortho), DNB",
        "experience_years": 15,
        "consultation_fee": 1000.00,
        "avatar_color": "#3b82f6",
        "initials": "RM",
    },
    {
        "name": "Dr. Sneha Iyer",
        "specialty": "Pediatrician",
        "qualification": "MBBS, MD (Pediatrics), DCH",
        "experience_years": 9,
        "consultation_fee": 700.00,
        "avatar_color": "#f59e0b",
        "initials": "SI",
    },
    {
        "name": "Dr. Vikram Singh",
        "specialty": "Neurologist",
        "qualification": "MBBS, MD, DM (Neurology)",
        "experience_years": 14,
        "consultation_fee": 1500.00,
        "avatar_color": "#8b5cf6",
        "initials": "VS",
    },
    {
        "name": "Dr. Kavitha Reddy",
        "specialty": "Gynecologist",
        "qualification": "MBBS, MD (OBGYN)",
        "experience_years": 11,
        "consultation_fee": 900.00,
        "avatar_color": "#ec4899",
        "initials": "KR",
    },
    {
        "name": "Dr. Akash Patel",
        "specialty": "ENT Specialist",
        "qualification": "MBBS, MS (ENT)",
        "experience_years": 7,
        "consultation_fee": 600.00,
        "avatar_color": "#14b8a6",
        "initials": "AP",
    },
    {
        "name": "Dr. Sanjay Verma",
        "specialty": "Pulmonologist",
        "qualification": "MBBS, MD (Chest Medicine)",
        "experience_years": 13,
        "consultation_fee": 1100.00,
        "avatar_color": "#6366f1",
        "initials": "SV",
    },
    {
        "name": "Dr. Nisha Rao",
        "specialty": "Psychiatrist",
        "qualification": "MBBS, MD (Psychiatry)",
        "experience_years": 9,
        "consultation_fee": 1200.00,
        "avatar_color": "#f97316",
        "initials": "NR",
    },
    {
        "name": "Dr. Harish Kumar",
        "specialty": "Ophthalmologist",
        "qualification": "MBBS, MS (Ophtho)",
        "experience_years": 10,
        "consultation_fee": 700.00,
        "avatar_color": "#10b981",
        "initials": "HK",
    },
    {
        "name": "Dr. Deepa Krishnan",
        "specialty": "Endocrinologist",
        "qualification": "MBBS, MD, DM (Endo)",
        "experience_years": 12,
        "consultation_fee": 1300.00,
        "avatar_color": "#8b5cf6",
        "initials": "DK",
    },
]

MEDICINES = [
    {"name": "Paracetamol", "dosage": "500mg", "frequency": "Once daily", "time": "08:00:00"},
    {"name": "Vitamin D", "dosage": "60K IU", "frequency": "Weekly", "time": "13:00:00"},
    {"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", "time": "20:00:00"},
    {"name": "Amoxicillin", "dosage": "250mg", "frequency": "Thrice daily", "time": "09:00:00"},
    {"name": "Lisinopril", "dosage": "10mg", "frequency": "Once daily", "time": "07:00:00"},
]

NOTIF_TITLES = [
    "Appointment Confirmed",
    "Appointment Reminder",
    "AI Reply Received",
    "Doctor Updated Notes",
    "Prescription Available",
    "Lab Report Ready",
    "Upcoming Visit Tomorrow",
]

async def seed():
    db = get_supabase()
    logger.info("Starting seed process...")

    # 1. Doctors & Schedules
    logger.info("Seeding doctors...")
    for d in DOCTORS_DATA:
        res = db.table("doctors").upsert({
            "name": d["name"],
            "specialty": d["specialty"],
            "qualification": d["qualification"],
            "experience_years": d["experience_years"],
            "consultation_fee": d["consultation_fee"],
            "avatar_color": d["avatar_color"],
            "initials": d["initials"],
            "is_active": True,
            "email": f"{d['initials'].lower()}@klmclinic.com"
        }, on_conflict="email").execute()
        
        doc_id = res.data[0]["id"]
        
        # Schedules
        for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]:
            db.table("doctor_schedules").upsert({
                "doctor_id": doc_id,
                "day_of_week": day,
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "lunch_start": "13:00:00",
                "lunch_end": "14:00:00",
                "slot_duration": 30,
            }, on_conflict="doctor_id,day_of_week").execute()

    # 2. Patients (get existing or seed few)
    res = db.table("patients").select("*").limit(10).execute()
    patients = res.data
    if not patients:
        logger.info("Seeding 50 patients...")
        for i in range(50):
            db.table("patients").insert({
                "name": f"Patient {i+1}",
                "email": f"patient{i+1}@example.com",
                "phone": f"+919876543{i:02d}",
                "preferred_channel": "web"
            }).execute()
        res = db.table("patients").select("*").limit(50).execute()
        patients = res.data

    # 3. Appointments
    logger.info("Seeding appointments...")
    res = db.table("doctors").select("*").execute()
    doctors = res.data
    
    for _ in range(150):
        p = random.choice(patients)
        d = random.choice(doctors)
        is_past = random.random() > 0.4
        if is_past:
            appt_date = datetime.now() - timedelta(days=random.randint(1, 30))
            status = "completed" if random.random() > 0.2 else "cancelled"
        else:
            appt_date = datetime.now() + timedelta(days=random.randint(0, 14))
            status = "scheduled" if random.random() > 0.1 else "confirmed"
            
        slot_start = appt_date.replace(hour=random.randint(9, 16), minute=random.choice([0, 30]), second=0, microsecond=0)
        
        db.table("appointments").insert({
            "patient_id": p["id"],
            "doctor_id": d["id"],
            "doctor_name": d["name"],
            "date": slot_start.isoformat(),
            "slot_start": slot_start.isoformat(),
            "slot_end": (slot_start + timedelta(minutes=30)).isoformat(),
            "status": status,
            "notes": "Regular checkup"
        }).execute()

    # 4. Medication Reminders
    logger.info("Seeding medication reminders...")
    for p in patients:
        for _ in range(random.randint(1, 3)):
            m = random.choice(MEDICINES)
            db.table("medication_reminders").insert({
                "patient_id": p["id"],
                "medicine": m["name"],
                "dosage": m["dosage"],
                "frequency": m["frequency"],
                "scheduled_at": m["time"],
                "remaining": random.randint(5, 30),
                "completed": random.randint(0, 10),
            }).execute()

    # 5. Notifications
    logger.info("Seeding notifications...")
    for p in patients:
        for _ in range(random.randint(3, 8)):
            title = random.choice(NOTIF_TITLES)
            db.table("notifications").insert({
                "patient_id": p["id"],
                "type": "new_appointment", # default
                "title": title,
                "body": f"Details about {title}",
                "is_read": random.random() > 0.5
            }).execute()

    # 6. Conversations & Messages
    logger.info("Seeding 300 messages...")
    for _ in range(100):
        p = random.choice(patients)
        res = db.table("conversations").insert({
            "patient_id": p["id"],
            "channel": "web",
            "status": "open",
            "intent": "FAQ"
        }).execute()
        conv_id = res.data[0]["id"]
        
        for i in range(3):
            sender = "patient" if i % 2 == 0 else "ai"
            db.table("messages").insert({
               "conversation_id": conv_id,
               "sender": sender,
               "content": f"Message {i+1} content",
                "timestamp": datetime.now().isoformat()
            }).execute()

    logger.info("✅ Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())
