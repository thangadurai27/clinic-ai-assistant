"""
Chat service — orchestrates the LangGraph workflow and persists results to Supabase.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.graph.workflow import process_message
from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.repositories import (
    patient_repo,
    conversation_repo,
    message_repo,
    escalation_repo,
    ai_log_repo,
    activity_log_repo,
)
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationCreate,
    MessageCreate,
    EscalationCreate,
    IntentType,
    ChannelType,
    ConversationStatus,
    MessageSender,
    EscalationPriority,
    EscalationStatus,
    PatientCreate,
    AILogCreate,
    ActivityLogCreate,
)

logger = logging.getLogger(__name__)


def _get_priority(reason: str | None) -> EscalationPriority:
    """Determine escalation priority from reason."""
    if not reason:
        return EscalationPriority.MEDIUM
    reason_lower = reason.lower()
    if "emergency" in reason_lower or "chest" in reason_lower or "bleeding" in reason_lower:
        return EscalationPriority.CRITICAL
    if "low_confidence" in reason_lower:
        return EscalationPriority.LOW
    if "safety_violation" in reason_lower:
        return EscalationPriority.HIGH
    if "human_requested" in reason_lower:
        return EscalationPriority.MEDIUM
    return EscalationPriority.MEDIUM


async def handle_chat(request: ChatRequest) -> ChatResponse:
    """
    Full chat processing pipeline:
    1. Ensure patient exists in DB
    2. Create/continue conversation
    3. Persist patient message
    4. Run LangGraph workflow
    5. Persist AI response
    6. Handle escalation if needed
    7. Return structured response
    """
    # ── 1. Ensure patient ────────────────────────────────────────────────────
    patient = None
    patient_name = request.patient_name or "Patient"

    if request.patient_id:
        patient = await patient_repo.get_by_id(str(request.patient_id))

    if not patient and (request.patient_phone or request.patient_email):
        try:
            if request.patient_phone:
                patient = await patient_repo.get_by_phone(request.patient_phone)
            if not patient and request.patient_email:
                patient = await patient_repo.get_by_email(str(request.patient_email))
            if not patient:
                patient = await patient_repo.create(
                    PatientCreate(
                        name=patient_name,
                        phone=request.patient_phone,
                        email=str(request.patient_email) if request.patient_email else None,
                        preferred_channel=request.channel.value,
                    )
                )
        except Exception as e:
            logger.warning(f"Patient lookup/create failed: {e}")

    if patient:
        patient_name = patient.get("name", patient_name)
        patient_id_str = str(patient["id"])
    elif request.patient_id:
        patient_id_str = str(request.patient_id)
    else:
        patient_id_str = None

    # ── 2. Create / continue conversation ────────────────────────────────────
    conv_id_str = str(request.conversation_id) if request.conversation_id else None

    # Try to find by gmail_thread_id if provided
    if not conv_id_str and request.gmail_thread_id:
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table("conversations")
                .select("id")
                .eq("gmail_thread_id", request.gmail_thread_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data:
                conv_id_str = str(res.data[0]["id"])
                logger.info(f"Found existing conversation {conv_id_str} via gmail_thread_id")
        except Exception as e:
            logger.warning(f"Thread lookup failed: {e}")
    
    # Try to find existing conversation by patient_id (if patient exists)
    if not conv_id_str and patient_id_str:
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table("conversations")
                .select("id")
                .eq("patient_id", patient_id_str)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data:
                conv_id_str = str(res.data[0]["id"])
                logger.info(f"Found existing conversation {conv_id_str} via patient_id")
        except Exception as e:
            logger.warning(f"Patient conversation lookup failed: {e}")

    # ── 3. Run LangGraph workflow ─────────────────────────────────────────────
    start_time = time.perf_counter()
    try:
        final_state = await process_message(
            message=request.message,
            patient_id=patient_id_str,
            conversation_id=conv_id_str,
            channel=request.channel.value,
            patient_name=patient_name,
        )
    except Exception as e:
        logger.error(f"Workflow error: {e}")
        return ChatResponse(
            message="I apologize, our system is temporarily unavailable. Please call us directly.",
            intent=IntentType.HUMAN_SUPPORT,
            confidence=0.0,
            escalated=True,
        )
    duration = time.perf_counter() - start_time

    intent: IntentType = final_state.get("intent") or IntentType.FAQ
    confidence: float = final_state.get("confidence", 0.5)
    response_text: str = final_state.get("response") or "I'm here to help. Could you please rephrase your question?"
    escalated: bool = final_state.get("escalated", False)
    escalation_reason: str | None = final_state.get("escalation_reason")
    metadata: dict = final_state.get("metadata", {})

    # ── 4. Persist to Supabase (best-effort) ──────────────────────────────────
    new_conv_id = None
    try:
        if patient_id_str:
            conv_status = ConversationStatus.ESCALATED if escalated else ConversationStatus.OPEN
            existing_conv = None
            if conv_id_str:
                existing_conv = await conversation_repo.get_by_id(conv_id_str)
                if existing_conv and str(existing_conv.get("patient_id")) != patient_id_str:
                    existing_conv = None

            if existing_conv:
                new_conv_id = conv_id_str

                def _touch_conversation() -> None:
                    updates = {
                        "status": conv_status.value,
                        "intent": intent.value if hasattr(intent, "value") else intent,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    if request.gmail_thread_id:
                        updates["gmail_thread_id"] = request.gmail_thread_id
                    summary = metadata.get("escalation_summary")
                    if summary:
                        updates["summary"] = summary
                    try:
                        get_supabase().table("conversations").update(updates).eq("id", new_conv_id).execute()
                    except Exception:
                        pass

                await run_blocking(_touch_conversation)
            else:
                conv_data = await conversation_repo.create(
                    ConversationCreate(
                        patient_id=UUID(patient_id_str),
                        channel=request.channel,
                        intent=intent,
                        status=conv_status,
                        summary=metadata.get("escalation_summary"),
                        gmail_thread_id=request.gmail_thread_id,
                    )
                )
                new_conv_id = str(conv_data.get("id", ""))

            if new_conv_id:
                conv_uuid = UUID(new_conv_id)
                await message_repo.create(MessageCreate(
                    conversation_id=conv_uuid,
                    sender=MessageSender.PATIENT,
                    content=request.message,
                ))
                await message_repo.create(MessageCreate(
                    conversation_id=conv_uuid,
                    sender=MessageSender.AI,
                    content=response_text,
                ))

            if escalated and patient_id_str:
                await escalation_repo.create(EscalationCreate(
                    patient_id=UUID(patient_id_str),
                    conversation_id=UUID(new_conv_id) if new_conv_id else None,
                    reason=escalation_reason or "unspecified",
                    priority=_get_priority(escalation_reason),
                    status=EscalationStatus.OPEN,
                    summary=metadata.get("escalation_summary"),
                ))

            # ── 5. Log AI Interaction ─────────────────────────────────────────
            await ai_log_repo.create(AILogCreate(
                prompt=request.message,
                intent=intent.value if hasattr(intent, "value") else intent,
                confidence=confidence,
                response=response_text,
                response_time=duration,
                token_usage=metadata.get("token_usage"),
                escalated=escalated,
                ai_model=metadata.get("model", "groq-llama-3"),
                conversation_id=UUID(new_conv_id) if new_conv_id else None,
                patient_id=UUID(patient_id_str) if patient_id_str else None,
                metadata=metadata,
            ))

    except Exception as e:
        logger.error(f"Persistence error (non-fatal): {e}")

    # ── 6. Log System Activity ────────────────────────────────────────────────
    try:
        await activity_log_repo.create(ActivityLogCreate(
            action=f"chat_{request.channel.value}",
            resource="conversation",
            resource_id=UUID(new_conv_id) if new_conv_id else None,
            patient_id=UUID(patient_id_str) if patient_id_str else None,
            details={
                "intent": intent.value if hasattr(intent, "value") else intent,
                "escalated": escalated,
                "channel": request.channel.value,
            },
        ))
    except Exception:
        pass

    return ChatResponse(
        message=response_text,
        intent=intent,
        confidence=confidence,
        escalated=escalated,
        conversation_id=UUID(new_conv_id) if new_conv_id else None,
        patient_id=UUID(patient_id_str) if patient_id_str else None,
        metadata=metadata,
    )
