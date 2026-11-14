"""
Chat API endpoint — main entry point for patient messages.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_optional_user
from app.demo import data as demo_data
from app.demo.service import is_demo_user
from app.schemas import ChatRequest, ChatResponse, IntentType
from app.services.chat_service import handle_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


def _demo_reply(message: str) -> ChatResponse:
    """Deterministic, DB-free reply for the public demo account."""
    text = message.lower()
    emergency_terms = ("chest pain", "can't breathe", "cant breathe", "bleeding", "unconscious", "emergency")
    if any(term in text for term in emergency_terms):
        reply = (
            "This sounds potentially urgent. In a real deployment I would escalate "
            "this to clinic staff immediately. If this is a real emergency, call your "
            "local emergency number now. (Demo response — no real alert was sent.)"
        )
        intent = IntentType.HUMAN_SUPPORT
        escalated = True
        confidence = 0.55
    elif any(term in text for term in ("book", "appointment", "schedule", "slot")):
        reply = (
            "I can help with that. In this demo, appointments are sample records only. "
            "Try opening Appointments to see how the receptionist view looks. "
            "(Demo response — no real booking was made.)"
        )
        intent = IntentType.BOOK_APPOINTMENT
        escalated = False
        confidence = 0.94
    elif any(term in text for term in ("hour", "open", "address", "parking", "phone", "location")):
        reply = (
            "KLM AI Clinic is open Monday to Friday, 8 AM to 6 PM. This is a demo "
            "answer and does not contact a real clinic."
        )
        intent = IntentType.FAQ
        escalated = False
        confidence = 0.98
    else:
        reply = (
            "Thanks for your message. This is a simulated AI response for the public "
            "demo account, so no database records, emails, or WhatsApp messages are created."
        )
        intent = IntentType.FAQ
        escalated = False
        confidence = 0.9

    conversations = demo_data.conversations()
    first = conversations[0]
    return ChatResponse(
        message=reply,
        intent=intent,
        confidence=confidence,
        escalated=escalated,
        conversation_id=first["id"],
        patient_id=first["patient_id"],
        metadata={"demo": True, "simulated": True, "no_external_actions": True},
    )


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(request: ChatRequest, user: dict | None = Depends(get_optional_user)) -> ChatResponse:
    """
    Process a patient message through the AI Front Desk workflow.

    This is the primary endpoint consumed by WhatsApp/Email webhooks
    and the web chat widget. Demo-token requests are simulated and never write
    to production tables or trigger external messages.
    """
    if is_demo_user(user):
        logger.info("[Demo] Simulated chat response for channel=%s", request.channel)
        return _demo_reply(request.message)

    try:
        logger.info(f"Chat request from channel={request.channel}")
        result = await handle_chat(request)
        return result
    except Exception as e:
        logger.exception(f"Unhandled error in /chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again.",
        )
