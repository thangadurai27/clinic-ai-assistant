"""
Run blocking Supabase / IMAP calls off the asyncio event loop.
"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import TypeVar

import httpcore
import httpx

from app.db.supabase_client import reset_supabase

T = TypeVar("T")

TRANSIENT_ERRORS = (
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.ReadTimeout,
    httpcore.RemoteProtocolError,
    httpcore.ReadError,
    httpcore.ReadTimeout,
)


async def run_blocking(fn: Callable[[], T]) -> T:
    """
    Execute a synchronous callable in the default thread pool.

    Supabase occasionally drops pooled HTTP/2 connections under concurrent
    dashboard traffic. Retrying once after resetting the shared client makes
    those transient transport failures invisible to API consumers.
    """
    attempts = 2
    for attempt in range(1, attempts + 1):
        try:
            return await asyncio.to_thread(fn)
        except TRANSIENT_ERRORS:
            if attempt >= attempts:
                raise
            reset_supabase()
            await asyncio.sleep(0.1)

    raise RuntimeError("run_blocking retry loop exhausted unexpectedly")
