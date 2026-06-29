"""
APScheduler background job — poll Gmail IMAP every 15 seconds.
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config.settings import settings
from app.services.email_processor import poll_and_process_inbox
from app.utils.network import can_connect_to_host

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

POLL_INTERVAL_SECONDS = 15


def start_email_scheduler() -> AsyncIOScheduler | None:
    """Start the background Gmail IMAP poller. Returns scheduler instance."""
    global _scheduler

    if not settings.IMAP_EMAIL or not settings.GOOGLE_REFRESH_TOKEN:
        logger.warning("Email scheduler not started — configure IMAP_EMAIL and GOOGLE_REFRESH_TOKEN in .env")
        return None

    if not can_connect_to_host(settings.IMAP_SERVER, settings.IMAP_PORT):
        logger.warning(
            "Email scheduler not started — cannot reach %s:%s from this machine",
            settings.IMAP_SERVER,
            settings.IMAP_PORT,
        )
        return None

    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        poll_and_process_inbox,
        "interval",
        seconds=POLL_INTERVAL_SECONDS,
        id="gmail_imap_poller",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=30,
    )
    _scheduler.start()
    logger.info(
        "Gmail IMAP scheduler started — polling every %ds (%s)",
        POLL_INTERVAL_SECONDS,
        settings.IMAP_EMAIL,
    )
    return _scheduler


def stop_email_scheduler() -> None:
    """Shut down the background scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Gmail IMAP scheduler stopped")
    _scheduler = None
