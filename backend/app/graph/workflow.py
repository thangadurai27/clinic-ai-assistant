"""
LangGraph Workflow Orchestration for the AI Front Desk Assistant.

Flow:
  receive_message
      ↓
  classify_intent
      ↓
  route_to_agent
      ↓
  generate_response
      ↓
  validate_safety
      ↓
  [safe] → return_response
  [unsafe / low-confidence / emergency] → escalate
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from langgraph.graph import StateGraph, END

from app.schemas import (
    IntentType,
)
from app.agents.intent_classifier import classify_intent
from app.agents.appointment_agent import run_appointment_agent
from app.agents.faq_agent import run_faq_agent
from app.agents.reminder_agent import run_reminder_agent
from app.agents.triage_agent import run_triage_agent
from app.agents.escalation_agent import run_escalation_agent, get_escalation_response
from app.agents.safety_layer import validate_response, get_safe_fallback_response
from app.config.settings import settings

logger = logging.getLogger(__name__)


# ─── Node Functions ───────────────────────────────────────────────────────────


async def node_classify_intent(state: dict[str, Any]) -> dict[str, Any]:
    """Classify the intent of the incoming patient message."""
    logger.info(f"[Graph] Classifying intent for message: {state['message'][:80]}...")
    try:
        intent, confidence = await classify_intent(state["message"])
        return {**state, "intent": intent, "confidence": confidence}
    except Exception as e:
        logger.error(f"[Graph] Intent classification error: {e}")
        return {**state, "intent": IntentType.HUMAN_SUPPORT, "confidence": 0.0, "error": str(e)}


async def node_run_agent(state: dict[str, Any]) -> dict[str, Any]:
    """Route to the appropriate agent based on classified intent."""
    intent: IntentType = state.get("intent", IntentType.FAQ)
    message: str = state["message"]
    patient_name: str = state.get("metadata", {}).get("patient_name", "Patient")

    logger.info(f"[Graph] Running agent for intent: {intent}")

    response: str = ""
    emergency: bool = False

    try:
        if intent in (
            IntentType.BOOK_APPOINTMENT,
            IntentType.RESCHEDULE_APPOINTMENT,
            IntentType.CANCEL_APPOINTMENT,
        ):
            response = await run_appointment_agent(message, intent, patient_name)

        elif intent == IntentType.FAQ:
            response = await run_faq_agent(message, patient_name)

        elif intent in (IntentType.REMINDER, IntentType.FOLLOW_UP):
            response = await run_reminder_agent(message, patient_name)

        elif intent == IntentType.SYMPTOM_QUERY:
            response, emergency = await run_triage_agent(message, patient_name)

        elif intent == IntentType.HUMAN_SUPPORT:
            response = get_escalation_response("human_requested")
            emergency = True  # treat human support as requiring escalation

        else:
            response = await run_faq_agent(message, patient_name)

    except Exception as e:
        logger.error(f"[Graph] Agent execution error: {e}")
        response = (
            "I apologize for the inconvenience. Please contact us directly at "
            f"{settings.CLINIC_PHONE} and our team will assist you."
        )

    return {
        **state,
        "response": response,
        "escalated": emergency,
        "escalation_reason": "emergency_detected" if emergency else None,
    }


async def node_validate_safety(state: dict[str, Any]) -> dict[str, Any]:
    """Validate the generated response through the safety layer."""
    response: str = state.get("response", "")
    confidence: float = state.get("confidence", 1.0)

    logger.info("[Graph] Validating response safety...")

    # Low confidence → escalate
    if confidence < settings.CONFIDENCE_THRESHOLD:
        logger.warning(f"[Graph] Low confidence ({confidence:.2f}) → escalating")
        return {
            **state,
            "escalated": True,
            "escalation_reason": f"low_confidence_{confidence:.2f}",
            "response": get_escalation_response("low_confidence"),
        }

    # Already escalated (e.g., emergency)
    if state.get("escalated", False):
        return state

    # Safety validation
    try:
        is_safe, reason = await validate_response(response)
        if not is_safe:
            logger.warning(f"[Graph] Safety check failed: {reason}")
            return {
                **state,
                "escalated": True,
                "escalation_reason": f"safety_violation: {reason}",
                "response": get_safe_fallback_response(),
            }
    except Exception as e:
        logger.error(f"[Graph] Safety validation error: {e}")

    return state


async def node_escalate(state: dict[str, Any]) -> dict[str, Any]:
    """Generate escalation summary and set final escalated state."""
    logger.info(f"[Graph] Escalating conversation — reason: {state.get('escalation_reason')}")
    patient_name = state.get("metadata", {}).get("patient_name", "Unknown Patient")
    intent = state.get("intent", IntentType.HUMAN_SUPPORT)
    reason = state.get("escalation_reason", "unspecified")

    try:
        summary = await run_escalation_agent(
            message=state["message"],
            patient_name=patient_name,
            intent=intent.value if hasattr(intent, "value") else str(intent),
            escalation_reason=reason,
        )
        metadata = {**state.get("metadata", {}), "escalation_summary": summary}
    except Exception as e:
        logger.error(f"[Graph] Escalation summary error: {e}")
        metadata = state.get("metadata", {})

    return {**state, "escalated": True, "metadata": metadata}


def should_escalate(state: dict[str, Any]) -> str:
    """Conditional edge: decide whether to escalate or return the response."""
    if state.get("escalated", False):
        return "escalate"
    return "end"


# ─── Graph Assembly ───────────────────────────────────────────────────────────


def build_graph() -> StateGraph:
    """Build and compile the LangGraph workflow."""
    builder = StateGraph(dict)

    builder.add_node("classify_intent", node_classify_intent)
    builder.add_node("run_agent", node_run_agent)
    builder.add_node("validate_safety", node_validate_safety)
    builder.add_node("escalate", node_escalate)

    builder.set_entry_point("classify_intent")
    builder.add_edge("classify_intent", "run_agent")
    builder.add_edge("run_agent", "validate_safety")
    builder.add_conditional_edges(
        "validate_safety",
        should_escalate,
        {"escalate": "escalate", "end": END},
    )
    builder.add_edge("escalate", END)

    return builder.compile()


# Compile graph at module load (singleton)
workflow = build_graph()


async def process_message(
    message: str,
    patient_id: str | None = None,
    conversation_id: str | None = None,
    channel: str = "web",
    patient_name: str = "Patient",
) -> dict[str, Any]:
    """
    Entry point: run a patient message through the full LangGraph workflow.
    Returns the final state dict.
    """
    initial_state = {
        "message": message,
        "patient_id": patient_id or str(uuid.uuid4()),
        "conversation_id": conversation_id or str(uuid.uuid4()),
        "channel": channel,
        "intent": None,
        "confidence": 1.0,
        "response": None,
        "escalated": False,
        "escalation_reason": None,
        "metadata": {"patient_name": patient_name},
        "error": None,
    }

    logger.info(f"[Graph] Processing message from patient_id={patient_id}")
    final_state = await workflow.ainvoke(initial_state)
    logger.info(f"[Graph] Workflow complete. intent={final_state.get('intent')}, escalated={final_state.get('escalated')}")
    return final_state
