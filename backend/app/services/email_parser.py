"""
Email parsing utilities for Gmail IMAP inbound messages.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from email.utils import parseaddr, parsedate_to_datetime
from typing import Any

from pyzmail import PyzMessage

from app.config.settings import settings

logger = logging.getLogger(__name__)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


@dataclass
class ParsedEmail:
    uid: int
    message_id: str
    sender_email: str
    sender_name: str
    subject: str
    body: str
    received_at: datetime
    in_reply_to: str | None = None
    references: str | None = None
    thread_id: str | None = None
    has_attachments: bool = False
    attachment_names: list[str] = field(default_factory=list)


def parse_address(raw: str) -> tuple[str, str]:
    """Parse 'Name <email>' into (name, email)."""
    name, email = parseaddr(raw or "")
    return name.strip(), email.strip().lower()


def should_ignore_email(sender_email: str) -> bool:
    """Skip automated senders, bounces, and our own clinic inbox."""
    if not sender_email:
        return True

    addr = sender_email.lower().strip()
    local, _, domain = addr.partition("@")

    own = {
        settings.CLINIC_EMAIL.lower(),
        (settings.IMAP_EMAIL or "").lower(),
    }
    own.discard("")

    if addr in own:
        return True

    if local in {"mailer-daemon", "postmaster", "noreply", "no-reply", "donotreply"}:
        return True

    auto_domains = (
        "googlemail.com",
        "accounts.google.com",
    )
    if any(domain.endswith(d) for d in auto_domains):
        return True

    return False


def _decode_part(part: Any) -> str:
    charset = part.charset or "utf-8"
    payload = part.get_payload()
    if isinstance(payload, bytes):
        return payload.decode(charset, errors="replace")
    return str(payload)


def extract_body(message: PyzMessage) -> str:
    """Prefer plain text; fall back to stripped HTML."""
    if message.text_part:
        return _decode_part(message.text_part).strip()

    if message.html_part:
        html = _decode_part(message.html_part)
        text = _HTML_TAG_RE.sub(" ", html)
        return re.sub(r"\s+", " ", text).strip()

    return ""


def parse_raw_email(uid: int, raw: bytes, thread_id: str | None = None) -> ParsedEmail | None:
    """Parse raw RFC822 bytes into a ParsedEmail."""
    try:
        message = PyzMessage.factory(raw)
    except Exception as e:
        logger.error("Failed to parse email UID %s: %s", uid, e)
        return None

    from_header = message.get_decoded_header("from", "")
    sender_name, sender_email = parse_address(from_header)
    if not sender_email:
        logger.warning("Email UID %s has no sender — skipping", uid)
        return None

    subject = message.get_subject() or "(No Subject)"
    body = extract_body(message)
    if not body:
        logger.warning("Email UID %s from %s has empty body — skipping", uid, sender_email)
        return None

    if len(body) > 4000:
        body = body[:3997] + "..."

    message_id = (message.get_decoded_header("message-id", "") or f"uid-{uid}").strip()
    in_reply_to = message.get_decoded_header("in-reply-to", "") or None
    references = message.get_decoded_header("references", "") or None
    
    # Use provided thread_id (e.g. from X-GM-THRID) or fallback to in_reply_to/message_id
    if not thread_id:
        thread_id = in_reply_to or message_id

    received_at = datetime.utcnow()
    date_header = message.get_decoded_header("date", "")
    if date_header:
        try:
            received_at = parsedate_to_datetime(date_header)
        except Exception:
            pass

    attachment_names: list[str] = []
    for part in message.mailparts:
        if part.filename:
            attachment_names.append(part.filename)

    return ParsedEmail(
        uid=uid,
        message_id=message_id,
        sender_email=sender_email,
        sender_name=sender_name or sender_email.split("@")[0],
        subject=subject,
        body=body,
        received_at=received_at,
        in_reply_to=in_reply_to,
        references=references,
        thread_id=thread_id,
        has_attachments=bool(attachment_names),
        attachment_names=attachment_names,
    )
