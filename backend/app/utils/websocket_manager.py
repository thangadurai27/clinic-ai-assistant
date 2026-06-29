"""
WebSocket Manager — handles real-time communication with frontend.
"""
from __future__ import annotations

import json
import logging
from typing import Dict, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # clinic_id (or "global") -> Set[WebSocket]

    async def connect(self, websocket: WebSocket, clinic_id: str = "global"):
        await websocket.accept()
        if clinic_id not in self.active_connections:
            self.active_connections[clinic_id] = set()
        self.active_connections[clinic_id].add(websocket)
        logger.info(f"WebSocket connected: clinic_id={clinic_id}, active={len(self.active_connections[clinic_id])}")

    def disconnect(self, websocket: WebSocket, clinic_id: str = "global"):
        if clinic_id in self.active_connections:
            if websocket in self.active_connections[clinic_id]:
                self.active_connections[clinic_id].remove(websocket)
                if not self.active_connections[clinic_id]:
                    del self.active_connections[clinic_id]
                logger.info(f"WebSocket disconnected: clinic_id={clinic_id}, remaining={len(self.active_connections.get(clinic_id, []))}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast(self, message: dict, clinic_id: str = "global"):
        if clinic_id not in self.active_connections:
            return
        connections = self.active_connections[clinic_id].copy()
        logger.info(f"Broadcasting to {len(connections)} connections for clinic_id={clinic_id}")
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                self.disconnect(connection, clinic_id)


# Singleton instance
manager = ConnectionManager()
