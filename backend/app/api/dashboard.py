"""
Dashboard & Analytics API endpoints.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas import DashboardStats, AnalyticsResponse
from app.services.analytics_service import get_dashboard_stats, get_analytics
from app.repositories import patient_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats() -> DashboardStats:
    try:
        return await get_dashboard_stats()
    except Exception as e:
        logger.exception(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=AnalyticsResponse)
async def analytics(period_days: int = 14) -> AnalyticsResponse:
    """
    Get analytics data for charts.
    
    Args:
        period_days: Number of days for daily chart (7, 14, 30, 90)
    """
    if period_days not in (7, 14, 30, 90):
        period_days = 14
    try:
        return await get_analytics(period_days=period_days)
    except Exception as e:
        logger.exception(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patients", status_code=status.HTTP_200_OK)
async def list_patients(limit: int = 100) -> list:
    try:
        return await patient_repo.get_all(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
