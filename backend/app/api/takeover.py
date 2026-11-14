"""Human Takeover API — manages AI ↔ Human conversation ownership."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.auth.dependencies import get_staff_user, get_staff_user_for_write
from app.demo import data as demo_data
from app.demo.service import is_demo_user
from app.db.supabase_client import get_supabase
from app.repositories import timeline_repo, notification_repo, conversation_repo
from app.utils.websocket_manager import manager

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
async def take_over(
    conversation_id: str,
    req: TakeoverRequest,
    user: dict = Depends(get_staff_user),
) -> dict:
    """Switch conversation ownership from AI to Human."""
    if is_demo_user(user):
        # Simulated only. No production row, notification, or external message.
        logger.info("[Demo] Simulated takeover for conversation %s", conversation_id)
        return demo_data.takeover(conversation_id, req.staff_name, req.note)

    try:
        now = datetime.now(timezone.utc).isoformat()
        _db().table("conversations").update({
            "ownership": "HUMAN_ACTIVE",
            "status": "open",
            "taken_over_by": req.staff_name,
            "taken_over_at": now,
            "updated_at": now,
        }).eq("id", conversation_id).execute()

        await timeline_repo.log(
            conversation_id=conversation_id,
            event_type="takeover_started",
            actor=req.staff_name,
            note=req.note or f"{req.staff_name} took over the conversation",
        )

        await notification_repo.create(
            type="human_takeover",
            title=f"Human Takeover by {req.staff_name}",
            body=f"Conversation {conversation_id[:8]} is now managed by {req.staff_name}",
            conversation_id=conversation_id,
        )

        await manager.broadcast({
            "type": "conversation_updated",
            "conversation_id": conversation_id
        })

        logger.info(f"[Takeover] Conversation {conversation_id} taken over by {req.staff_name}")
        return {"status": "HUMAN_ACTIVE", "taken_over_by": req.staff_name}

    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


# ── Resume AI ──────────────────────────────────────────────────────────────

@router.post("/{conversation_id}/resume-ai", status_code=200)
async def resume_ai(
    conversation_id: str,
    req: ResumeAIRequest,
    user: dict = Depends(get_staff_user),
) -> dict:
    """Switch conversation ownership back to AI."""
    if is_demo_user(user):
        logger.info("[Demo] Simulated resume-AI for conversation %s", conversation_id)
        return demo_data.resume_ai(conversation_id, req.note)

    try:
        now = datetime.now(timezone.utc).isoformat()
        _db().table("conversations").update({
            "ownership": "AI_ACTIVE",
            "resumed_ai_at": now,
            "updated_at": now,
        }).eq("id", conversation_id).execute()

        await timeline_repo.log(
            conversation_id=conversation_id,
            event_type="takeover_ended",
            actor="Staff",
            note=req.note or "AI resumed control",
        )

        await manager.broadcast({
            "type": "conversation_updated",
            "conversation_id": conversation_id
        })

        logger.info(f"[Takeover] AI resumed for conversation {conversation_id}")
        return {"status": "AI_ACTIVE"}

    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


# ── Staff Message ──────────────────────────────────────────────────────────

@router.post("/{conversation_id}/staff-message", status_code=201)
async def send_staff_message(
    conversation_id: str,
    req: StaffMessageRequest,
    user: dict = Depends(get_staff_user),
) -> dict:
    """Send a message as staff (only valid when HUMAN_ACTIVE)."""
    if is_demo_user(user):
        # Simulated only: never sends Gmail or WhatsApp messages.
        conversation = demo_data.conversation(conversation_id)
        if not conversation:
            raise HTTPException(404, "Demo conversation not found")
        if conversation.get("ownership") != "HUMAN_ACTIVE":
            raise HTTPException(400, "Conversation is not in human takeover mode")
        logger.info("[Demo] Simulated staff message for conversation %s", conversation_id)
        return demo_data.add_staff_message(conversation_id, req.content, req.staff_name)

    try:
        conv = _db().table("conversations").select("ownership, patient_id").eq("id", conversation_id).single().execute()
        if not conv.data:
            raise HTTPException(404, "Conversation not found")
        if conv.data.get("ownership") != "HUMAN_ACTIVE":
            raise HTTPException(400, "Conversation is not in human takeover mode")

        logger.info(f"[Staff Message] Sending staff message to conversation {conversation_id}")

        res = _db().table("messages").insert({
            "conversation_id": conversation_id,
            "sender": "staff",
            "content": req.content,
        }).execute()

        now = datetime.now(timezone.utc).isoformat()
        _db().table("conversations").update({
            "last_message": req.content,
            "last_message_at": now,
            "updated_at": now
        }).eq("id", conversation_id).execute()

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

        await timeline_repo.log(
            conversation_id=conversation_id,
            event_type="human_reply",
            actor=req.staff_name,
            note=req.content[:100],
        )
        
        await manager.broadcast({
            "type": "new_message",
            "conversation_id": conversation_id,
            "patient_id": conv.data.get("patient_id")
        })
        await manager.broadcast({
            "type": "conversation_updated",
            "conversation_id": conversation_id,
            "patient_id": conv.data.get("patient_id")
        })
        logger.info(f"[Staff Message] Sent staff message to conversation {conversation_id}")

        return res.data[0] if res.data else {}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


# ── Get Timeline ───────────────────────────────────────────────────────────

@router.get("/{conversation_id}/timeline", status_code=200)
async def get_timeline(conversation_id: str, user: dict = Depends(get_staff_user)) -> list:
    if is_demo_user(user):
        return demo_data.timeline(conversation_id)
    try:
        return await timeline_repo.get_by_conversation(conversation_id)
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Ownership Status ───────────────────────────────────────────────────────

@router.get("/{conversation_id}/ownership", status_code=200)
async def get_ownership(conversation_id: str, user: dict = Depends(get_staff_user)) -> dict:
    if is_demo_user(user):
        conversation = demo_data.conversation(conversation_id)
        if not conversation:
            raise HTTPException(404, "Demo conversation not found")
        return {
            "id": conversation["id"],
            "ownership": conversation.get("ownership"),
            "taken_over_by": conversation.get("taken_over_by"),
            "taken_over_at": conversation.get("taken_over_at"),
            "resumed_ai_at": conversation.get("resumed_ai_at"),
            "status": conversation.get("status"),
        }

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
