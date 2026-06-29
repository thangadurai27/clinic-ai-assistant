"""
Conversations API endpoints.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from app.repositories import conversation_repo, message_repo, timeline_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_conversations(limit: int = 100, status_filter: str | None = None) -> list:
    """List conversations ordered by updated_at DESC (newest first)."""
    try:
        return await conversation_repo.get_all(limit=limit, status=status_filter)
    except Exception as e:
        logger.exception(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}", status_code=status.HTTP_200_OK)
async def get_conversation(conversation_id: str) -> dict:
    try:
        conv = await conversation_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = await message_repo.get_by_conversation(conversation_id)
        return {**conv, "messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}/timeline", status_code=status.HTTP_200_OK)
async def get_conversation_timeline(conversation_id: str) -> list:
    """Get timeline events for a conversation."""
    try:
        return await timeline_repo.get_by_conversation(conversation_id)
    except Exception as e:
        logger.exception(f"Error fetching timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
