"""
Escalation Agent — summarizes and escalates conversations to human staff.
"""
import logging
from app.prompts.templates import ESCALATION_AGENT_PROMPT
from app.utils.llm_client import call_llm
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def run_escalation_agent(
    message: str,
    patient_name: str,
    intent: str,
    escalation_reason: str,
    conversation_history: str = "",
) -> str:
    """
    Generate a professional summary for human staff escalation.
    Returns the summary text.
    """
    system_prompt = (
        "You are a medical coordinator generating concise, professional escalation summaries "
        "for clinic staff. Be clear, objective, and include all relevant details."
    )
    human_prompt = ESCALATION_AGENT_PROMPT.format(
        conversation_history=conversation_history or f"Patient message: {message}",
        patient_name=patient_name,
        intent=intent,
        escalation_reason=escalation_reason,
    )

    try:
        summary = await call_llm(system_prompt, human_prompt, temperature=0.2)
        logger.info(f"Escalation summary generated for patient: {patient_name}")
        return summary
    except Exception as e:
        logger.error(f"Escalation agent error: {e}")
        return (
            f"ESCALATION REQUIRED\n"
            f"Patient: {patient_name}\n"
            f"Reason: {escalation_reason}\n"
            f"Message: {message}\n"
            f"Please review immediately."
        )


def get_escalation_response(reason: str = "escalated") -> str:
    """Standard patient-facing escalation message."""
    return (
        "I've connected you with a member of our medical staff who will be with you shortly. "
        "Your concern has been flagged as a priority. "
        f"If this is a medical emergency, please call 911 or visit our emergency department immediately. "
        f"You can also reach us directly at {settings.CLINIC_PHONE}."
    )
