"""
Triage Agent — handles symptom queries safely without diagnosing.
"""
import logging
from app.prompts.templates import TRIAGE_AGENT_PROMPT
from app.utils.llm_client import call_llm
from app.config.settings import settings
from app.agents.intent_classifier import detect_emergency

logger = logging.getLogger(__name__)

EMERGENCY_RESPONSE = (
    "⚠️ Your symptoms may require URGENT medical attention.\n\n"
    "Please call **911** (emergency services) or go to the nearest Emergency Department immediately.\n\n"
    "A member of our clinical staff has been notified and will follow up with you shortly.\n\n"
    f"For non-emergency questions, you can reach us at {settings.CLINIC_PHONE}."
)


async def run_triage_agent(message: str, patient_name: str = "Patient") -> tuple[str, bool]:
    """
    Run the triage agent. Returns (response_text, is_emergency).
    """
    is_emergency = detect_emergency(message)

    if is_emergency:
        logger.warning(f"EMERGENCY detected for patient: {patient_name}")
        return EMERGENCY_RESPONSE, True

    system_prompt = (
        "You are a triage coordinator at a medical clinic — NOT a doctor. "
        "Acknowledge symptoms with empathy, classify urgency, but NEVER diagnose conditions, "
        "recommend medications, or interpret lab results. Always recommend professional consultation."
    )
    human_prompt = TRIAGE_AGENT_PROMPT.format(
        clinic_name=settings.CLINIC_NAME,
        message=message,
    )

    try:
        response = await call_llm(system_prompt, human_prompt, temperature=0.2)
        logger.info("Triage agent response generated")
        return response, False
    except Exception as e:
        logger.error(f"Triage agent error: {e}")
        return (
            f"Thank you for sharing your concern. For symptom assessment, please contact our clinic "
            f"directly at {settings.CLINIC_PHONE} or visit us. For emergencies, call 911 immediately."
        ), False
