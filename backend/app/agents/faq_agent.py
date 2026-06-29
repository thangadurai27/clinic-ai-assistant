"""
FAQ Agent — answers clinic information questions.
"""
import logging
from app.prompts.templates import FAQ_AGENT_PROMPT
from app.utils.llm_client import call_llm
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def run_faq_agent(message: str, patient_name: str = "Patient") -> str:
    """
    Run the FAQ agent and return a response string.
    """
    system_prompt = (
        "You are a helpful and knowledgeable clinic information assistant. "
        "Answer questions accurately and warmly. If unsure, direct to the clinic phone."
    )
    human_prompt = FAQ_AGENT_PROMPT.format(
        clinic_name=settings.CLINIC_NAME,
        clinic_address=settings.CLINIC_ADDRESS,
        clinic_phone=settings.CLINIC_PHONE,
        clinic_email=settings.CLINIC_EMAIL,
        clinic_hours=settings.CLINIC_HOURS,
        clinic_emergency=settings.CLINIC_EMERGENCY,
        message=message,
    )

    try:
        response = await call_llm(system_prompt, human_prompt, temperature=0.3)
        logger.info("FAQ agent response generated")
        return response
    except Exception as e:
        logger.error(f"FAQ agent error: {e}")
        return (
            f"I'd be happy to help! For the most accurate information, please contact us at "
            f"{settings.CLINIC_PHONE} or {settings.CLINIC_EMAIL}."
        )
