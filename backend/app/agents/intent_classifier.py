"""
Intent classification agent using Groq LLM.
"""
import logging
from app.schemas import IntentType
from app.prompts.templates import INTENT_CLASSIFIER_PROMPT
from app.utils.llm_client import call_llm_json
from app.config.settings import settings

logger = logging.getLogger(__name__)

EMERGENCY_PHRASES = [
    "chest pain",
    "difficulty breathing",
    "can't breathe",
    "severe bleeding",
    "unconscious",
    "unconsciousness",
    "allergic reaction",
    "anaphylaxis",
    "stroke",
    "heart attack",
    "overdose",
    "poisoning",
    "not breathing",
    "passing out",
    "collapsed",
]


def detect_emergency(message: str) -> bool:
    """Fast keyword scan before hitting the LLM."""
    lower = message.lower()
    return any(phrase in lower for phrase in EMERGENCY_PHRASES)


async def classify_intent(message: str) -> tuple[IntentType, float]:
    """
    Classify the intent of a patient message using the Groq LLM.
    
    Returns:
        (IntentType, confidence_float)
    """
    # Fast-path: emergency detection bypasses LLM
    if detect_emergency(message):
        logger.info("Emergency phrase detected — fast-path to SYMPTOM_QUERY")
        return IntentType.SYMPTOM_QUERY, 0.99

    prompt = INTENT_CLASSIFIER_PROMPT.format(
        clinic_name=settings.CLINIC_NAME,
        message=message,
    )

    try:
        result = await call_llm_json(
            system_prompt="You are a precise medical intake classifier. Always respond in valid JSON.",
            human_prompt=prompt,
            temperature=0.05,
        )
        intent_str = result.get("intent", "FAQ")
        confidence = float(result.get("confidence", 0.5))

        try:
            intent = IntentType(intent_str)
        except ValueError:
            logger.warning(f"Unknown intent '{intent_str}' — defaulting to FAQ")
            intent = IntentType.FAQ
            confidence = 0.4

        logger.info(f"Intent classified: {intent} (confidence={confidence:.2f})")
        return intent, confidence

    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return IntentType.FAQ, 0.3
