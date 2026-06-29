"""
Activity Log Repository — tracks system events and user actions.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.schemas import ActivityLogCreate

logger = logging.getLogger(__name__)


class ActivityLogRepository:
    TABLE = "activity_log"

    async def create(self, data: ActivityLogCreate) -> dict:
        """Log a system event or user action to Supabase."""
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table(self.TABLE)
                .insert(data.model_dump(mode="json"))
                .execute()
            )
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.warning(f"activity_log.create failed: {e}")
            return {}

    async def get_all(self, limit: int = 100) -> list[dict]:
        """Fetch recent activity logs."""
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table(self.TABLE)
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"activity_log.get_all failed: {e}")
            return []


activity_log_repo = ActivityLogRepository()
