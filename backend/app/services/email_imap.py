"""
Gmail IMAP client — fetch UNSEEN messages and mark as read.
Uses App Password authentication for reliability.
"""
from __future__ import annotations

import logging
from imapclient import IMAPClient

from app.config.settings import settings
from app.services.email_parser import ParsedEmail, parse_raw_email
from app.utils.network import prefer_ipv4_for_hosts

logger = logging.getLogger(__name__)

IMAP_TIMEOUT_SECONDS = 15

def _imap_credentials() -> tuple[str, str, str, int]:
    email = settings.IMAP_EMAIL or settings.CLINIC_EMAIL
    password = settings.IMAP_PASSWORD
    if not email or not password:
        logger.error("IMAP: Missing IMAP_EMAIL or IMAP_PASSWORD in settings")
        raise ValueError("IMAP_EMAIL and IMAP_PASSWORD must be set in .env for inbound loop")
    return email, password, settings.IMAP_SERVER, settings.IMAP_PORT


def fetch_unseen_emails() -> list[ParsedEmail]:
    """
    Connect to Gmail IMAP, fetch UNSEEN messages, return parsed emails.
    """
    email, password, host, port = _imap_credentials()
    parsed: list[ParsedEmail] = []

    try:
        with prefer_ipv4_for_hosts(host):
            with IMAPClient(host, port=port, ssl=True, timeout=IMAP_TIMEOUT_SECONDS) as client:
                client.login(email, password)
                client.select_folder("INBOX", readonly=False)

                uids = client.search(["UNSEEN"])
                if not uids:
                    return []

                logger.info("IMAP: found %d unseen email(s)", len(uids))
                fetch_data = client.fetch(uids, ["RFC822", "X-GM-THRID"])

                for uid in uids:
                    data = fetch_data.get(uid, {})
                    raw = data.get(b"RFC822")
                    thread_id_int = data.get(b"X-GM-THRID")
                    
                    if not raw:
                        continue
                    
                    # Convert X-GM-THRID (uint64) to hex string for Gmail API compatibility
                    thread_id_str = hex(thread_id_int)[2:] if thread_id_int else None

                    item = parse_raw_email(uid, raw, thread_id=thread_id_str)
                    if item:
                        parsed.append(item)

    except Exception as e:
        logger.exception("IMAP fetch failed: %s", e)
        raise

    return parsed


def mark_emails_seen(uids: list[int]) -> None:
    """Mark processed message UIDs as \\Seen."""
    if not uids:
        return

    email, password, host, port = _imap_credentials()
    try:
        with prefer_ipv4_for_hosts(host):
            with IMAPClient(host, port=port, ssl=True, timeout=IMAP_TIMEOUT_SECONDS) as client:
                client.login(email, password)
                client.select_folder("INBOX", readonly=False)
                client.add_flags(uids, ["\\Seen"])
                logger.info("IMAP: marked %d email(s) as read", len(uids))
    except Exception as e:
        logger.exception("IMAP mark-seen failed for UIDs %s: %s", uids, e)
        raise
