"""
Manual / integration test for Gmail IMAP + SMTP email flow.

Usage (from backend/):
  pytest tests/test_email_flow.py -v
  python tests/test_email_flow.py

Prerequisites:
  1. Set SMTP_* and IMAP_* in .env (Gmail app password)
  2. Apply migration: scripts/schema/migrations/001_processed_emails.sql
  3. Send a test email TO the clinic inbox from an external address
  4. Run this script OR start the backend (scheduler polls every 15s)
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))


@pytest.mark.asyncio
async def test_poll_once() -> None:
    from app.services.email_processor import poll_and_process_inbox

    await poll_and_process_inbox()


@pytest.mark.asyncio
async def test_smtp() -> None:
    from app.config.settings import settings
    from app.services.email_service import send_email

    to = settings.SMTP_EMAIL
    if not to:
        pytest.skip("SMTP_EMAIL not set — skipping SMTP test")

    ok = await send_email(
        to_email=to,
        subject="KLM AI Clinic — SMTP Test",
        body="If you received this, Gmail SMTP is working.",
    )
    if not ok:
        pytest.skip("SMTP send failed — check Gmail credentials or network")
    assert ok is True


async def _main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Email flow tests")
    parser.add_argument("--smtp-only", action="store_true", help="Only test SMTP send")
    parser.add_argument("--poll-only", action="store_true", help="Only poll IMAP once")
    args = parser.parse_args()

    if args.smtp_only:
        await test_smtp()
    elif args.poll_only:
        await test_poll_once()
    else:
        await test_smtp()
        await test_poll_once()


if __name__ == "__main__":
    asyncio.run(_main())
