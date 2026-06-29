"""
Webhooks API — WhatsApp (Twilio) only.
Email is handled via Gmail IMAP polling (background service).
CloudMailin/webhook-based email has been removed.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Form, Response, BackgroundTasks
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client

from app.config.settings import settings
from app.repositories import notification_repo, timeline_repo, conversation_repo
from app.schemas import ChannelType, ChatRequest, NotificationType
from app.services.chat_service import handle_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# ── Twilio WhatsApp ────────────────────────────────────────────────────────────

@router.post("/twilio")
async def twilio_whatsapp_webhook(
    background_tasks: BackgroundTasks,
    Body:        Annotated[str,        Form()],
    From:        Annotated[str,        Form()],
    To:          Annotated[str,        Form()],
    ProfileName: Annotated[str | None, Form()] = None,
):
    """
    Incoming Twilio WhatsApp message. 
    Returns 200 immediately, processes in background to avoid Twilio timeouts.
    """
    logger.info(f"[WhatsApp] FROM={From} BODY={Body[:80]!r}")
    
    background_tasks.add_task(
        process_whatsapp_background,
        body=Body,
        from_number=From,
        profile_name=ProfileName
    )
    
    # Return empty TwiML or a placeholder "Thinking..." if desired.
    # For a real SaaS, we usually return 200 OK and send the message via REST API.
    return Response(content=str(MessagingResponse()), media_type="application/xml")


async def process_whatsapp_background(body: str, from_number: str, profile_name: str | None):
    """Process WhatsApp message in background and send reply via REST API."""
    try:
        clean_number = from_number.replace("whatsapp:", "")
        chat_req = ChatRequest(
            message=body,
            channel=ChannelType.WHATSAPP,
            patient_phone=clean_number,
            patient_name=profile_name or None,
        )
        ai_response = await handle_chat(chat_req)
        
        patient_id = str(ai_response.patient_id) if ai_response.patient_id else None
        conv_id = str(ai_response.conversation_id) if ai_response.conversation_id else None
        
        summary = ai_response.metadata.get("escalation_summary") or body[:50]
        await notification_repo.create(
            type=NotificationType.NEW_WHATSAPP.value,
            title=f"WhatsApp from {profile_name or clean_number}",
            body=f"{summary[:120]}",
            patient_id=patient_id,
            conversation_id=conv_id,
        )

        if conv_id:
            await timeline_repo.log(
                conversation_id=conv_id,
                event_type="ai_reply",
                actor="AI",
                note=f"WhatsApp reply sent to {clean_number}",
            )

        # Send response via Twilio REST API
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=ai_response.message,
                from_=settings.TWILIO_WHATSAPP_FROM,
                to=from_number
            )
            logger.info(f"[WhatsApp] Sent background reply to {from_number}")
        else:
            logger.warning("[WhatsApp] Twilio credentials missing, cannot send background reply")

    except Exception as e:
        logger.exception(f"[WhatsApp] Background processing error: {e}")
        # Fallback notification or message?
