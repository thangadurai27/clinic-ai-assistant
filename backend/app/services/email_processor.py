"""
Inbound email orchestration: IMAP → LangGraph → Supabase → Gmail API → dashboard notification.
"""
from __future__ import annotations

import asyncio
import logging

from app.config.settings import settings
from app.repositories import notification_repo, timeline_repo
from app.repositories.processed_emails import processed_email_repo
from app.schemas import ChannelType, ChatRequest, NotificationType
from app.services.chat_service import handle_chat
from app.services.email_imap import fetch_unseen_emails, mark_emails_seen
from app.services.email_parser import ParsedEmail, should_ignore_email
from app.services.gmail_service import gmail_service

logger = logging.getLogger(__name__)


def _reply_subject(subject: str) -> str:
    if subject.lower().startswith("re:"):
        return subject
    return f"Re: {subject}"


async def process_single_email(parsed: ParsedEmail) -> bool:
    """
    Process one inbound email end-to-end.
    Returns True if fully handled (reply sent + marked for dedup).
    """
    if should_ignore_email(parsed.sender_email):
        logger.info("Ignoring email from %s (loop/automated)", parsed.sender_email)
        await asyncio.to_thread(mark_emails_seen, [parsed.uid])
        return True

    if await processed_email_repo.exists(parsed.message_id):
        logger.info("Duplicate email skipped message_id=%s", parsed.message_id)
        await asyncio.to_thread(mark_emails_seen, [parsed.uid])
        return True

    logger.info(
        "Email received | from=%s <%s> | subject=%r | message_id=%s",
        parsed.sender_name,
        parsed.sender_email,
        parsed.subject,
        parsed.message_id,
    )

    chat_req = ChatRequest(
        message=parsed.body,
        channel=ChannelType.EMAIL,
        patient_email=parsed.sender_email,
        patient_name=parsed.sender_name,
        gmail_thread_id=parsed.thread_id,
    )

    logger.info("AI workflow started for %s", parsed.sender_email)
    ai_response = await handle_chat(chat_req)
    logger.info(
        "AI workflow completed | intent=%s | confidence=%.2f | escalated=%s",
        ai_response.intent,
        ai_response.confidence,
        ai_response.escalated,
    )

    reply_body = ai_response.message
    if ai_response.escalated:
        reply_body += (
            "\n\n---\n"
            "Your message has been forwarded to our clinic staff. "
            "A team member will contact you shortly if needed."
        )

    reply_subject = _reply_subject(parsed.subject)
    # Use Gmail API to reply, preserving the thread
    sent = await gmail_service.reply_email(
        to_email=parsed.sender_email,
        subject=reply_subject,
        body=reply_body,
        thread_id=parsed.thread_id,
        in_reply_to=parsed.message_id,
        references=parsed.references or parsed.message_id
    )

    if not sent:
        logger.error("Gmail API failed for %s — email left UNSEEN for retry", parsed.sender_email)
        return False

    logger.info("Gmail API reply delivered to %s", parsed.sender_email)

    await processed_email_repo.record(
        message_id=parsed.message_id,
        sender_email=parsed.sender_email,
        subject=parsed.subject,
        gmail_thread_id=parsed.thread_id,
        imap_uid=parsed.uid,
    )

    patient_id = str(ai_response.patient_id) if ai_response.patient_id else None
    conv_id = str(ai_response.conversation_id) if ai_response.conversation_id else None

    summary = ai_response.metadata.get("escalation_summary") or parsed.subject
    await notification_repo.create(
        type=NotificationType.NEW_EMAIL.value,
        title=f"Email from {parsed.sender_name}",
        body=f"{parsed.subject} — {summary[:120]}",
        patient_id=patient_id,
        conversation_id=conv_id,
    )

    if conv_id:
        await timeline_repo.log(
            conv_id,
            event_type="ai_reply",
            actor="AI",
            note=f"Email reply sent to {parsed.sender_email}",
        )

    await asyncio.to_thread(mark_emails_seen, [parsed.uid])
    logger.info(
        "Conversation saved | patient=%s | conversation=%s | dashboard notification created",
        patient_id,
        conv_id,
    )
    return True


async def poll_and_process_inbox() -> None:
    """Fetch unseen Gmail messages and process each (runs in thread for IMAP)."""
    if not settings.IMAP_EMAIL or not settings.GOOGLE_REFRESH_TOKEN:
        logger.debug("Email poller: IMAP or Google API credentials not configured")
        return

    try:
        emails = await asyncio.to_thread(fetch_unseen_emails)
    except ValueError:
        logger.warning("Email poller: missing IMAP credentials")
        return
    except Exception as e:
        logger.exception("Email poller: IMAP connection error: %s", e)
        return

    for parsed in emails:
        try:
            await process_single_email(parsed)
        except Exception as e:
            logger.exception(
                "Email processing failed for UID %s from %s: %s",
                parsed.uid,
                parsed.sender_email,
                e,
            )
