"""
Safety Layer — validates AI responses before sending to patients.
"""
import logging
from app.prompts.templates import SAFETY_VALIDATOR_PROMPT
from app.utils.llm_client import call_llm_json

logger = logging.getLogger(__name__)

# Known diagnosis/prescription keywords for fast pre-scan
FORBIDDEN_PATTERNS = [
    "you have diabetes",
    "you have cancer",
    "you have pneumonia",
    "you have covid",
    "take aspirin",
    "take ibuprofen",
    "take acetaminophen",
    "take amoxicillin",
    "mg twice daily",
    "mg three times",
    "this indicates",
    "this means your",
    "your hba1c",
    "your blood sugar",
    "diagnosis is",
    "you are diagnosed",
    "i diagnose",
]


def fast_safety_check(response: str) -> tuple[bool, str]:
    """
    Quick keyword scan before calling the LLM safety validator.
    Returns (is_safe, violation_text).
    """
    lower = response.lower()
    for pattern in FORBIDDEN_PATTERNS:
        if pattern in lower:
            return False, f"Contains forbidden medical advice: '{pattern}'"
    return True, ""


async def validate_response(response: str) -> tuple[bool, str]:
    """
    Validate an AI response through the safety layer.
    Returns (is_safe, reason).
    Uses LLM-based validation with a fast keyword pre-scan.
    """
    # Fast check first
    is_safe_fast, violation = fast_safety_check(response)
    if not is_safe_fast:
        logger.warning(f"Fast safety check failed: {violation}")
        return False, violation

    # LLM-based validation
    try:
        result = await call_llm_json(
            system_prompt=(
                "You are a medical safety validator. Review responses for unsafe medical content. "
                "Always respond with valid JSON only."
            ),
            human_prompt=SAFETY_VALIDATOR_PROMPT.format(response=response),
            temperature=0.0,
        )
        is_safe = result.get("is_safe", True)
        reason = result.get("reason", "")
        violations = result.get("violations", [])

        if not is_safe:
            logger.warning(f"LLM safety check failed: {reason} | Violations: {violations}")
            return False, reason or "; ".join(violations)

        return True, ""

    except Exception as e:
        logger.error(f"Safety validation error: {e} — defaulting to safe")
        # On error, allow the response through (fail open) — log it
        return True, ""


def get_safe_fallback_response() -> str:
    """Return a safe fallback when the safety check fails."""
    return (
        "I want to make sure I give you the most accurate information. "
        "For your specific situation, I'd recommend speaking directly with one of our healthcare professionals. "
        "Please call us or I can connect you with a staff member right now."
    )
