"""
Reminder Agent — helps patients set up medication and appointment reminders.
"""
import logging
from app.prompts.templates import REMINDER_AGENT_PROMPT
from app.utils.llm_client import call_llm
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def run_reminder_agent(message: str, patient_name: str = "Patient") -> str:
    """
    Run the reminder agent and return a response string.
    """
    system_prompt = (
        "You are a caring patient care coordinator helping patients stay on top of their health routines. "
        "Set up reminders warmly and confirm all details clearly. Never give dosage or medication advice."
    )
    human_prompt = REMINDER_AGENT_PROMPT.format(
        clinic_name=settings.CLINIC_NAME,
        patient_name=patient_name,
        message=message,
    )

    try:
        response = await call_llm(system_prompt, human_prompt, temperature=0.4)
        logger.info("Reminder agent response generated")
        return response
    except Exception as e:
        logger.error(f"Reminder agent error: {e}")
        return (
            "I'd love to help you set up reminders! Please call us at "
            f"{settings.CLINIC_PHONE} and our staff will assist you."
        )
