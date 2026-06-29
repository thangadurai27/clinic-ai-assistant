"""
Chat API endpoint — main entry point for patient messages.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas import ChatRequest, ChatResponse
from app.services.chat_service import handle_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Process a patient message through the AI Front Desk workflow.
    
    This is the primary endpoint consumed by WhatsApp/Email webhooks
    and the web chat widget.
    """
    try:
        logger.info(f"Chat request from channel={request.channel}")
        result = await handle_chat(request)
        return result
    except Exception as e:
        logger.exception(f"Unhandled error in /chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again.",
        )
