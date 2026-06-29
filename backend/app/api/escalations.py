"""
Escalations API endpoints.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas import EscalationCreate
from app.repositories import escalation_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/escalations", tags=["Escalations"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_escalations(limit: int = 100, status_filter: str | None = None) -> list:
    try:
        return await escalation_repo.get_all(limit=limit, status=status_filter)
    except Exception as e:
        logger.exception(f"Error fetching escalations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escalate", status_code=status.HTTP_201_CREATED)
async def create_escalation(data: EscalationCreate) -> dict:
    try:
        result = await escalation_repo.create(data)
        return result
    except Exception as e:
        logger.exception(f"Error creating escalation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{escalation_id}/status", status_code=status.HTTP_200_OK)
async def update_escalation_status(escalation_id: str, status_value: str) -> dict:
    try:
        result = await escalation_repo.update_status(escalation_id, status_value)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
