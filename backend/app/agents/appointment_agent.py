"""
Appointment Agent — handles booking, rescheduling, cancellations.
Now integrated with the AI scheduling engine for real availability checks.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Optional

from app.prompts.templates import APPOINTMENT_AGENT_PROMPT
from app.utils.llm_client import call_llm
from app.config.settings import settings
from app.schemas import IntentType

logger = logging.getLogger(__name__)


def _extract_requested_datetime(message: str) -> Optional[datetime]:
    """Attempt to extract a requested date/time from the message."""
    now = datetime.now()
    msg_lower = message.lower()

    # tomorrow
    if "tomorrow" in msg_lower:
        base = now + timedelta(days=1)
        # look for time like 10am, 2:30pm
        t = _extract_time(msg_lower)
        if t:
            return base.replace(hour=t[0], minute=t[1], second=0, microsecond=0)
        return base.replace(hour=9, minute=0)

    # today
    if "today" in msg_lower:
        t = _extract_time(msg_lower)
        if t:
            return now.replace(hour=t[0], minute=t[1], second=0, microsecond=0)

    # next week
    if "next week" in msg_lower:
        return now + timedelta(days=7)

    return None


def _extract_time(text: str):
    """Extract hour/minute from text like '10am', '2:30 pm'."""
    pattern = r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?"
    match = re.search(pattern, text)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2)) if match.group(2) else 0
        meridian = match.group(3)
        if meridian == "pm" and hour != 12:
            hour += 12
        if meridian == "am" and hour == 12:
            hour = 0
        return hour, minute
    return None


async def run_appointment_agent(
    message: str,
    intent: IntentType,
    patient_name: str = "Patient",
    doctor_id: Optional[str] = None,
) -> str:
    """
    Run the appointment agent.
    If booking intent and doctor_id provided, check real availability.
    """
    # For booking: try to do smart scheduling
    if intent == IntentType.BOOK_APPOINTMENT and doctor_id:
        try:
            from app.services.availability_service import AvailabilityService
            svc = AvailabilityService()
            requested_dt = _extract_requested_datetime(message)

            if requested_dt:
                # Check if requested slot is available
                slots = await svc.get_available_slots(doctor_id, requested_dt.date())
                req_iso = requested_dt.replace(second=0, microsecond=0).isoformat()

                exact_match = next((s for s in slots if s["start"][:16] == req_iso[:16]), None)

                if exact_match:
                    # Slot is available — confirm
                    time_str = requested_dt.strftime("%I:%M %p")
                    date_str = requested_dt.strftime("%A, %B %d")
                    return (
                        f"Great news, {patient_name}! I've found an available slot for you:\n\n"
                        f"📅 **{date_str}** at **{time_str}**\n\n"
                        f"Shall I confirm this appointment for you? Please reply 'Yes' to confirm."
                    )
                else:
                    # Suggest nearest alternatives
                    nearest = await svc.find_nearest_slots(doctor_id, requested_dt, count=3)
                    if nearest:
                        suggestions = "\n".join(
                            f"  • {datetime.fromisoformat(s['start']).strftime('%A %b %d at %I:%M %p')}"
                            for s in nearest
                        )
                        req_time = requested_dt.strftime("%I:%M %p on %B %d")
                        return (
                            f"I'm sorry, {patient_name}. The doctor is not available at {req_time}.\n\n"
                            f"The nearest available slots are:\n{suggestions}\n\n"
                            f"Which would you prefer? Please reply with your choice."
                        )
                    else:
                        return (
                            f"I'm sorry, {patient_name}. There are no available slots in the near future for that doctor. "
                            f"Please call us at {settings.CLINIC_PHONE} to arrange an appointment."
                        )
        except Exception as e:
            logger.warning(f"Availability check failed, falling back to LLM: {e}")

    # Fallback: standard LLM-based appointment response
    system_prompt = (
        "You are a warm, professional appointment coordinator at a medical clinic. "
        "Always be empathetic and efficient. Never provide medical advice."
    )
    human_prompt = APPOINTMENT_AGENT_PROMPT.format(
        clinic_name=settings.CLINIC_NAME,
        patient_name=patient_name,
        intent=intent.value,
        message=message,
    )

    try:
        response = await call_llm(system_prompt, human_prompt, temperature=0.4)
        logger.info(f"Appointment agent response generated for intent={intent}")
        return response
    except Exception as e:
        logger.error(f"Appointment agent error: {e}")
        return (
            "I'm sorry, I'm having trouble accessing our scheduling system right now. "
            f"Please call us directly at {settings.CLINIC_PHONE} to manage your appointment."
        )
