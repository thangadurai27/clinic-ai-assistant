"""
Repository for deduplicating processed inbound emails by Message-ID.
"""
from __future__ import annotations

import logging

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

TABLE = "processed_emails"


class ProcessedEmailRepository:
    async def exists(self, message_id: str) -> bool:
        if not message_id:
            return False
        try:
            res = (
                get_supabase()
                .table(TABLE)
                .select("id")
                .eq("message_id", message_id)
                .limit(1)
                .execute()
            )
            return bool(res.data)
        except Exception as e:
            logger.warning("processed_emails.exists check failed (table may be missing): %s", e)
            return False

    async def record(
        self,
        message_id: str,
        sender_email: str,
        subject: str,
        gmail_thread_id: str | None = None,
        imap_uid: int | None = None,
    ) -> None:
        try:
            get_supabase().table(TABLE).insert({
                "message_id": message_id,
                "sender_email": sender_email,
                "subject": subject,
                "gmail_thread_id": gmail_thread_id,
                "imap_uid": imap_uid,
            }).execute()
        except Exception as e:
            logger.warning("processed_emails.record failed: %s", e)

    async def get_latest_thread_id(self, sender_email: str) -> str | None:
        try:
            res = (
                get_supabase()
                .table(TABLE)
                .select("gmail_thread_id")
                .eq("sender_email", sender_email)
                .not_.is_("gmail_thread_id", "null")
                .order("processed_at", desc=True)
                .limit(1)
                .execute()
            )
            return res.data[0]["gmail_thread_id"] if res.data else None
        except Exception as e:
            logger.warning("processed_emails.get_latest_thread_id failed: %s", e)
            return None


processed_email_repo = ProcessedEmailRepository()
