from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.schemas import ChannelType, ChatRequest
from app.services.chat_service import handle_chat


@pytest.mark.asyncio
async def test_handle_chat_func() -> None:
    req = ChatRequest(
        message="Hi, can you tell me your hours again?",
        channel=ChannelType.WHATSAPP,
        patient_phone="+15551234567",
        patient_name="Jane Smith",
    )
    resp = await handle_chat(req)
    assert resp.message
    assert resp.conversation_id
    assert resp.patient_id


if __name__ == "__main__":
    asyncio.run(test_handle_chat_func())
