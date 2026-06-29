"""
AI Log Repository — tracks every AI interaction.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.schemas import AILogCreate

logger = logging.getLogger(__name__)


class AILogRepository:
    TABLE = "ai_logs"

    async def create(self, data: AILogCreate) -> dict:
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table(self.TABLE)
                .insert(data.model_dump(mode="json"))
                .execute()
            )
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"ai_logs.create skipped (table may not exist): {e}")
            return {}

    async def get_all(self, limit: int = 100) -> list[dict]:
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table(self.TABLE)
                .select("*")
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"ai_logs.get_all skipped: {e}")
            return []

    async def get_by_conversation(self, conv_id: str) -> list[dict]:
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table(self.TABLE)
                .select("*")
                .eq("conversation_id", conv_id)
                .order("timestamp", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"ai_logs.get_by_conversation skipped: {e}")
            return []


ai_log_repo = AILogRepository()
