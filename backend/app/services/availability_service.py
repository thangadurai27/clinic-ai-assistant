"""
Availability Service — AI Smart Appointment Scheduling Engine

Features:
- Real-time doctor availability checking
- Conflict detection (appointments, leaves, holidays, blocked slots)
- Slot generation based on doctor schedules
- Nearest slot suggestion
- Prevention of double booking
"""
from __future__ import annotations

import logging
from datetime import datetime, date, time, timedelta
from typing import Optional
from uuid import UUID

from app.db.supabase_client import get_supabase
from app.schemas import DayOfWeek

logger = logging.getLogger(__name__)


class AvailabilityService:
    """Complete availability and scheduling logic."""

    def __init__(self):
        self.db = get_supabase()

    async def get_doctor_by_id(self, doctor_id: str) -> Optional[dict]:
        """Get doctor by ID."""
        try:
            res = self.db.table("doctors").select("*").eq("id", doctor_id).eq("is_active", True).single().execute()
            return res.data
        except Exception as e:
            logger.error(f"Error fetching doctor {doctor_id}: {e}")
            return None

    async def get_doctor_schedule(self, doctor_id: str, day_name: str) -> Optional[dict]:
        """Get doctor's schedule for a specific day."""
        try:
            res = (
                self.db.table("doctor_schedules")
                .select("*")
                .eq("doctor_id", doctor_id)
                .eq("day_of_week", day_name.lower())
                .eq("is_active", True)
                .execute()
            )
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching schedule for {doctor_id} on {day_name}: {e}")
            return None

    async def is_doctor_on_leave(self, doctor_id: str, check_date: date) -> bool:
        """Check if doctor is on leave on a specific date."""
        try:
            res = (
                self.db.table("doctor_leaves")
                .select("id")
                .eq("doctor_id", doctor_id)
                .lte("start_date", check_date.isoformat())
                .gte("end_date", check_date.isoformat())
                .execute()
            )
            return len(res.data) > 0
        except Exception as e:
            logger.error(f"Error checking leave for {doctor_id}: {e}")
            return False

    async def is_clinic_holiday(self, check_date: date) -> bool:
        """Check if date is a clinic holiday."""
        try:
            res = (
                self.db.table("clinic_holidays")
                .select("id")
                .eq("date", check_date.isoformat())
                .eq("is_active", True)
                .execute()
            )
            return len(res.data) > 0
        except Exception as e:
            logger.error(f"Error checking holiday for {check_date}: {e}")
            return False

    async def get_existing_appointments(self, doctor_id: str, check_date: date) -> list[dict]:
        """Get all appointments for a doctor on a specific date."""
        try:
            start_dt = datetime.combine(check_date, time.min).isoformat()
            end_dt = datetime.combine(check_date, time.max).isoformat()
            res = (
                self.db.table("appointments")
                .select("id, slot_start, slot_end, status")
                .eq("doctor_id", doctor_id)
                .gte("slot_start", start_dt)
                .lte("slot_start", end_dt)
                .in_("status", ["scheduled", "confirmed"])
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching appointments for {doctor_id} on {check_date}: {e}")
            return []

    async def get_blocked_slots(self, doctor_id: str, check_date: date) -> list[dict]:
        """Get blocked slots for a doctor on a specific date."""
        try:
            start_dt = datetime.combine(check_date, time.min).isoformat()
            end_dt = datetime.combine(check_date, time.max).isoformat()
            res = (
                self.db.table("blocked_slots")
                .select("id, start_time, end_time, reason")
                .eq("doctor_id", doctor_id)
                .gte("start_time", start_dt)
                .lte("start_time", end_dt)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching blocked slots for {doctor_id} on {check_date}: {e}")
            return []

    def _parse_time(self, time_str: str) -> time:
        """Parse HH:MM string to time object."""
        h, m = map(int, time_str.split(":"))
        return time(h, m)

    def _generate_slots(
        self,
        check_date: date,
        start_time: time,
        end_time: time,
        slot_duration: int,
        lunch_start: Optional[time] = None,
        lunch_end: Optional[time] = None,
    ) -> list[dict]:
        """Generate time slots for a day."""
        slots = []
        current = datetime.combine(check_date, start_time)
        end = datetime.combine(check_date, end_time)
        delta = timedelta(minutes=slot_duration)

        while current + delta <= end:
            slot_end = current + delta

            # Skip lunch break
            if lunch_start and lunch_end:
                lunch_start_dt = datetime.combine(check_date, lunch_start)
                lunch_end_dt = datetime.combine(check_date, lunch_end)
                if current >= lunch_start_dt and current < lunch_end_dt:
                    current = lunch_end_dt
                    continue

            slots.append({
                "start": current.isoformat(),
                "end": slot_end.isoformat(),
                "label": current.strftime("%I:%M %p"),
                "available": True
            })
            current = slot_end

        return slots

    def _is_slot_conflicted(self, slot_start: str, slot_end: str, appointments: list[dict], blocked: list[dict]) -> bool:
        """Check if a slot conflicts with existing appointments or blocked slots."""
        slot_start_dt = datetime.fromisoformat(slot_start)
        slot_end_dt = datetime.fromisoformat(slot_end)

        # Check appointments
        for appt in appointments:
            appt_start = datetime.fromisoformat(appt["slot_start"])
            appt_end = datetime.fromisoformat(appt["slot_end"])
            if slot_start_dt < appt_end and slot_end_dt > appt_start:
                return True

        # Check blocked slots
        for block in blocked:
            block_start = datetime.fromisoformat(block["start_time"])
            block_end = datetime.fromisoformat(block["end_time"])
            if slot_start_dt < block_end and slot_end_dt > block_start:
                return True

        return False

    async def get_available_slots(self, doctor_id: str, check_date: date) -> list[dict]:
        """
        Get all available slots for a doctor on a specific date.
        
        Returns list of {"start": ISO, "end": ISO} dicts.
        """
        # 1. Check doctor exists and is active
        doctor = await self.get_doctor_by_id(doctor_id)
        if not doctor:
            logger.warning(f"Doctor {doctor_id} not found or inactive")
            return []

        if doctor.get("emergency_only"):
            logger.warning(f"Doctor {doctor_id} is in emergency-only mode")
            return []

        # 2. Check holiday
        if await self.is_clinic_holiday(check_date):
            logger.info(f"Clinic is closed on {check_date} (holiday)")
            return []

        # 3. Check doctor leave
        if await self.is_doctor_on_leave(doctor_id, check_date):
            logger.info(f"Doctor {doctor_id} is on leave on {check_date}")
            return []

        # 4. Get doctor schedule for the day
        day_name = check_date.strftime("%A").lower()
        schedule = await self.get_doctor_schedule(doctor_id, day_name)
        if not schedule:
            logger.info(f"Doctor {doctor_id} has no schedule on {day_name}")
            return []

        # 5. Generate all possible slots
        start_time = self._parse_time(schedule["start_time"])
        end_time = self._parse_time(schedule["end_time"])
        slot_duration = schedule["slot_duration"]
        lunch_start = self._parse_time(schedule["lunch_start"]) if schedule.get("lunch_start") else None
        lunch_end = self._parse_time(schedule["lunch_end"]) if schedule.get("lunch_end") else None

        all_slots = self._generate_slots(check_date, start_time, end_time, slot_duration, lunch_start, lunch_end)

        # 6. Filter out conflicted slots
        appointments = await self.get_existing_appointments(doctor_id, check_date)
        blocked = await self.get_blocked_slots(doctor_id, check_date)

        available_slots = [
            slot for slot in all_slots
            if not self._is_slot_conflicted(slot["start"], slot["end"], appointments, blocked)
        ]

        # 7. Filter out past slots
        now = datetime.now()
        available_slots = [s for s in available_slots if datetime.fromisoformat(s["start"]) > now]

        logger.info(f"Found {len(available_slots)} available slots for doctor {doctor_id} on {check_date}")
        return available_slots

    async def find_nearest_slots(
        self,
        doctor_id: str,
        requested_datetime: datetime,
        count: int = 3,
        search_days: int = 14,
    ) -> list[dict]:
        """
        Find the nearest available slots starting from requested_datetime.
        
        Returns up to `count` slots within `search_days`.
        """
        results = []
        current_date = requested_datetime.date()
        end_date = current_date + timedelta(days=search_days)

        while current_date <= end_date and len(results) < count:
            slots = await self.get_available_slots(doctor_id, current_date)
            for slot in slots:
                slot_start = datetime.fromisoformat(slot["start"])
                if slot_start >= requested_datetime:
                    results.append(slot)
                    if len(results) >= count:
                        break
            current_date += timedelta(days=1)

        logger.info(f"Found {len(results)} nearest slots for doctor {doctor_id} from {requested_datetime}")
        return results

    async def is_slot_available(self, doctor_id: str, slot_start: datetime, slot_end: datetime) -> bool:
        """Check if a specific slot is available."""
        check_date = slot_start.date()
        available_slots = await self.get_available_slots(doctor_id, check_date)
        
        slot_start_iso = slot_start.isoformat()
        slot_end_iso = slot_end.isoformat()
        
        for slot in available_slots:
            if slot["start"] == slot_start_iso and slot["end"] == slot_end_iso:
                return True
        
        return False

    async def book_appointment(
        self,
        patient_id: str,
        doctor_id: str,
        slot_start: datetime,
        slot_end: datetime,
        notes: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Book an appointment after verifying availability.
        
        Returns the created appointment or None if slot is unavailable.
        """
        # Verify slot is available
        if not await self.is_slot_available(doctor_id, slot_start, slot_end):
            logger.warning(f"Slot {slot_start} - {slot_end} not available for doctor {doctor_id}")
            return None

        # Get doctor info
        doctor = await self.get_doctor_by_id(doctor_id)
        if not doctor:
            logger.error(f"Doctor {doctor_id} not found")
            return None

        # Create appointment
        try:
            appointment_data = {
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "doctor_name": doctor["name"],
                "date": slot_start.isoformat(),
                "slot_start": slot_start.isoformat(),
                "slot_end": slot_end.isoformat(),
                "status": "scheduled",
                "notes": notes,
                "conversation_id": conversation_id,
            }
            res = self.db.table("appointments").insert(appointment_data).execute()
            appointment = res.data[0] if res.data else None
            
            if appointment:
                logger.info(f"Appointment created: {appointment['id']}")
            
            return appointment
        except Exception as e:
            logger.error(f"Error creating appointment: {e}")
            return None

