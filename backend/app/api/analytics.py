"""
Analytics API endpoints.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import get_staff_user
from app.demo import data as demo_data
from app.demo.service import is_demo_user
from app.services import analytics_service
from app.repositories import conversation_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("")
async def get_analytics_summary(
    period_days: int = Query(30, ge=7, le=365),
    user: dict = Depends(get_staff_user),
):
    """Get complete analytics summary including all data needed for frontend."""
    if is_demo_user(user):
        return demo_data.analytics_payload(period_days)
    try:
        stats = await analytics_service.get_dashboard_stats()
        perf = await analytics_service.get_performance_metrics()
        channels = await analytics_service.get_channel_usage()
        messages = await analytics_service.get_message_stats()
        analytics_data = await analytics_service.get_analytics(period_days=period_days)
        
        # Get top intents (already sorted descending)
        top_intents = analytics_data.intent_distribution
        
        # Calculate AI vs Escalation timeline (simplified)
        accuracy_timeline = []
        daily_conversations = analytics_data.daily_conversations
        for day in daily_conversations:
            # For now, we'll use a simple approximation, but we could calculate per-day metrics
            # if we stored them
            accuracy_timeline.append({
                "date": day.date,
                "ai_handled": day.count - 1,  # approximation
                "escalated": 1,  # approximation
            })
        
        return {
            "total_patients": stats.total_patients,
            "total_appointments": stats.total_appointments,
            "ai_resolved": stats.ai_responses,
            "active_escalations": stats.open_escalations,
            "accuracy_timeline": accuracy_timeline,
            "intent_distribution": top_intents,
            "top_patient_intents": top_intents[:10],  # take top 10
            "performance": perf,
            "channels": channels,
            "messages": messages,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Analytics summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")


@router.get("/dashboard")
async def get_dashboard_analytics(user: dict = Depends(get_staff_user)):
    """Get high-level dashboard metrics."""
    if is_demo_user(user):
        return demo_data.dashboard_stats()
    try:
        return await analytics_service.get_dashboard_stats()
    except Exception as e:
        logger.error(f"Dashboard analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard analytics")


@router.get("/intents")
async def get_intent_analytics(
    period_days: int = Query(30, ge=7, le=365),
    user: dict = Depends(get_staff_user),
):
    """Get intent distribution analytics."""
    if is_demo_user(user):
        return demo_data.analytics_summary(period_days)["intent_distribution"]
    try:
        data = await analytics_service.get_analytics(period_days=period_days)
        return data.intent_distribution
    except Exception as e:
        logger.error(f"Intent analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch intent analytics")


@router.get("/messages")
async def get_message_analytics(user: dict = Depends(get_staff_user)):
    """Get message volume and breakdown analytics."""
    if is_demo_user(user):
        return demo_data.analytics_summary()["messages"]
    try:
        return await analytics_service.get_message_stats()
    except Exception as e:
        logger.error(f"Message analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch message analytics")


@router.get("/performance")
async def get_performance_analytics(user: dict = Depends(get_staff_user)):
    """Get AI performance and resolution analytics."""
    if is_demo_user(user):
        return demo_data.analytics_summary()["performance"]
    try:
        return await analytics_service.get_performance_metrics()
    except Exception as e:
        logger.error(f"Performance analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch performance analytics")


@router.get("/channels")
async def get_channel_analytics(user: dict = Depends(get_staff_user)):
    """Get channel usage analytics."""
    if is_demo_user(user):
        return demo_data.analytics_summary()["channels"]
    try:
        return await analytics_service.get_channel_usage()
    except Exception as e:
        logger.error(f"Channel analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch channel analytics")


@router.get("/doctors")
async def get_doctor_analytics(user: dict = Depends(get_staff_user)):
    """Get doctor workload and volume analytics."""
    if is_demo_user(user):
        return [{"name": doctor["name"], "total": 18, "completed": 14} for doctor in demo_data.doctors()]
    try:
        return await analytics_service.get_doctor_stats()
    except Exception as e:
        logger.error(f"Doctor analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch doctor analytics")


@router.get("/export")
async def export_analytics(format: str = "json", user: dict = Depends(get_staff_user)):
    """Export analytics data."""
    if is_demo_user(user):
        payload = demo_data.analytics_summary()
        return {**payload, "exported_at": datetime.utcnow().isoformat(), "demo": True}
    try:
        stats = await analytics_service.get_dashboard_stats()
        perf = await analytics_service.get_performance_metrics()
        channels = await analytics_service.get_channel_usage()
        messages = await analytics_service.get_message_stats()
        
        return {
            "stats": stats,
            "performance": perf,
            "channels": channels,
            "messages": messages,
            "exported_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Export analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to export analytics")
