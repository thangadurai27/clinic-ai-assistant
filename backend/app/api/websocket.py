"""
WebSocket API endpoint — real-time communication.
"""
from __future__ import annotations

import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from app.utils.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket, clinic_id: str = "global"):
    await manager.connect(websocket, clinic_id)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WebSocket message: {data}")
            # Echo back for now, or handle specific commands
            try:
                message = json.loads(data)
                await manager.broadcast(message, clinic_id)
            except json.JSONDecodeError:
                await manager.send_personal_message({"type": "error", "message": "Invalid JSON"}, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, clinic_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, clinic_id)
