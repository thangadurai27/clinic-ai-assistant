"""
Conversations API endpoints.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_staff_user
from app.demo import data as demo_data
from app.demo.service import is_demo_user
from app.repositories import conversation_repo, message_repo, timeline_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_conversations(
    status_filter: str | None = None,
    user: dict = Depends(get_staff_user),
) -> list:
    """List conversations ordered by updated_at DESC (newest first)."""
    if is_demo_user(user):
        return demo_data.conversations(status_filter)

    try:
        logger.info("[DEBUG] Listing all conversations...")
        conversations = await conversation_repo.get_all(status=status_filter)
        logger.info(f"[DEBUG] Loaded {len(conversations)} conversations")
        return conversations
    except Exception as e:
        logger.exception(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}", status_code=status.HTTP_200_OK)
async def get_conversation(conversation_id: str, user: dict = Depends(get_staff_user)) -> dict:
    if is_demo_user(user):
        conversation = demo_data.conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Demo conversation not found")
        return conversation

    try:
        logger.info(f"[DEBUG] API get_conversation called with id: {conversation_id}")
        conv = await conversation_repo.get_by_id(conversation_id)
        logger.info(f"[DEBUG] Got conversation from repo: {conv}")
        if not conv:
            logger.warning(f"[DEBUG] Conversation {conversation_id} not found!")
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = await message_repo.get_by_conversation(conversation_id)
        logger.info(f"[DEBUG] Got messages from repo: {messages}")
        logger.info(f"[DEBUG] API returning conversation with {len(messages)} messages")
        result = {**conv, "messages": messages}
        logger.info(f"[DEBUG] Full API response: {result}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching conversation: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}/timeline", status_code=status.HTTP_200_OK)
async def get_conversation_timeline(conversation_id: str, user: dict = Depends(get_staff_user)) -> list:
    """Get timeline events for a conversation."""
    if is_demo_user(user):
        return demo_data.timeline(conversation_id)
    try:
        return await timeline_repo.get_by_conversation(conversation_id)
    except Exception as e:
        logger.exception(f"Error fetching timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
