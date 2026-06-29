"""
Lightweight in-process TTL cache for read-heavy dashboard endpoints.
"""
from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")

_store: dict[str, tuple[float, object]] = {}
_lock = asyncio.Lock()


async def cached_async(key: str, ttl_seconds: int, factory: Callable[[], Awaitable[T]]) -> T:
    """Return cached value or await factory and store with TTL."""
    now = time.monotonic()
    hit = _store.get(key)
    if hit and hit[0] > now:
        return hit[1]  # type: ignore[return-value]

    async with _lock:
        hit = _store.get(key)
        if hit and hit[0] > now:
            return hit[1]  # type: ignore[return-value]
        value = await factory()
        _store[key] = (now + ttl_seconds, value)
        return value


def invalidate_prefix(prefix: str) -> None:
    """Drop cache entries whose key starts with prefix."""
    for k in list(_store):
        if k.startswith(prefix):
            del _store[k]
