"""
Human Takeover API — manages AI ↔ Human conversation ownership.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.db.supabase_client import get_supabase
from app.repositories import timeline_repo, notification_repo, conversation_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["Takeover"])


def _db():
    return get_supabase()


class TakeoverRequest(BaseModel):
    staff_name: str = "Staff"
    note: Optional[str] = None


class ResumeAIRequest(BaseModel):
    note: Optional[str] = None


class StaffMessageRequest(BaseModel):
    content: str
    staff_name: str = "Staff"


# ── Take Over ─────────────────────────────────────────────────────────────

@router.post("/{conversation_id}/takeover", status_code=200)
async def take_over(conversation_id: str, req: TakeoverRequest) -> dict:
    """Switch conversation ownership from AI to Human."""
    from datetime import datetime, timezone
    try:
        # Update conversation status
        _db().table("conversations").update({
            "ownership": "HUMAN_ACTIVE",
            "status": "open",
            "taken_over_by": req.staff_name,
            "taken_over_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", conversation_id).execute()

        # Log timeline event
        await timeline_repo.log(
            conversation_id=conversation_id,
            event_type="takeover_started",
            actor=req.staff_name,
            note=req.note or f"{req.staff_name} took over the conversation",
        )

        # Create notification
        await notification_repo.create(
            type="human_takeover",
            title=f"Human Takeover by {req.staff_name}",
            body=f"Conversation {conversation_id[:8]} is now managed by {req.staff_name}",
            conversation_id=conversation_id,
        )

        logger.info(f"[Takeover] Conversation {conversation_id} taken over by {req.staff_name}")
        return {"status": "HUMAN_ACTIVE", "taken_over_by": req.staff_name}

    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


# ── Resume AI ──────────────────────────────────────────────────────────────

@router.post("/{conversation_id}/resume-ai", status_code=200)
async def resume_ai(conversation_id: str, req: ResumeAIRequest) -> dict:
    """Switch conversation ownership back to AI."""
    from datetime import datetime, timezone
    try:
        _db().table("conversations").update({
            "ownership": "AI_ACTIVE",
            "resumed_ai_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", conversation_id).execute()

        await timeline_repo.log(
            conversation_id=conversation_id,
            event_type="takeover_ended",
            actor="Staff",
            note=req.note or "AI resumed control",
        )

        logger.info(f"[Takeover] AI resumed for conversation {conversation_id}")
        return {"status": "AI_ACTIVE"}

    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


# ── Staff Message ──────────────────────────────────────────────────────────

@router.post("/{conversation_id}/staff-message", status_code=201)
async def send_staff_message(conversation_id: str, req: StaffMessageRequest) -> dict:
    """Send a message as staff (only valid when HUMAN_ACTIVE)."""
    try:
        # Check ownership
        conv = _db().table("conversations").select("ownership").eq("id", conversation_id).single().execute()
        if not conv.data:
            raise HTTPException(404, "Conversation not found")
        if conv.data.get("ownership") != "HUMAN_ACTIVE":
            raise HTTPException(400, "Conversation is not in human takeover mode")

        # Insert staff message
        res = _db().table("messages").insert({
            "conversation_id": conversation_id,
            "sender": "staff",
            "content": req.content,
        }).execute()

        try:
            conv_details = await conversation_repo.get_by_id(conversation_id)
            if conv_details:
                channel = conv_details.get("channel")
                patient_info = conv_details.get("patients", {})
                
                if channel == "email":
                    patient_email = patient_info.get("email")
                    if patient_email:
                        from app.services.gmail_service import gmail_service
                        from app.repositories.processed_emails import processed_email_repo
                        
                        thread_id = await processed_email_repo.get_latest_thread_id(patient_email)
                        if thread_id:
                            logger.info(f"Sending staff email reply to {patient_email} in thread {thread_id}")
                            await gmail_service.reply_email(
                                to_email=patient_email,
                                subject="Re: Clinic Follow-up",
                                body=req.content,
                                thread_id=thread_id,
                                in_reply_to=thread_id
                            )
                        else:
                            logger.info(f"Sending new staff email to {patient_email}")
                            await gmail_service.send_email(
                                to_email=patient_email,
                                subject="Clinic Follow-up",
                                body=req.content
                            )
                            
                elif channel == "whatsapp":
                    patient_phone = patient_info.get("phone")
                    if patient_phone:
                        from twilio.rest import Client
                        from app.config.settings import settings
                        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
                            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                            # Ensure phone starts with + or add it if missing
                            to_number = f"whatsapp:{patient_phone}" if patient_phone.startswith("+") else f"whatsapp:+{patient_phone}"
                            client.messages.create(
                                body=req.content,
                                from_=settings.TWILIO_WHATSAPP_FROM,
                                to=to_number
                            )
                            logger.info(f"Sending staff WhatsApp reply to {to_number}")
                        else:
                            logger.warning("Twilio credentials not configured, skipping WhatsApp staff reply")
                            
        except Exception as e:
            logger.error(f"Failed to send staff message via external channel: {e}")

        # Log timeline
        await timeline_repo.log(
            conversation_id=conversation_id,
            event_type="human_reply",
            actor=req.staff_name,
            note=req.content[:100],
        )

        return res.data[0] if res.data else {}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


# ── Get Timeline ───────────────────────────────────────────────────────────

@router.get("/{conversation_id}/timeline", status_code=200)
async def get_timeline(conversation_id: str) -> list:
    try:
        return await timeline_repo.get_by_conversation(conversation_id)
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Ownership Status ───────────────────────────────────────────────────────

@router.get("/{conversation_id}/ownership", status_code=200)
async def get_ownership(conversation_id: str) -> dict:
    try:
        res = _db().table("conversations").select(
            "id, ownership, taken_over_by, taken_over_at, resumed_ai_at, status"
        ).eq("id", conversation_id).single().execute()
        if not res.data:
            raise HTTPException(404, "Conversation not found")
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
