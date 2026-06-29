"""
Analytics API endpoints.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.services import analytics_service
from app.repositories import conversation_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("")
async def get_analytics_summary(period_days: int = Query(30, ge=7, le=365)):
    """Get complete analytics summary including all data needed for frontend."""
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
async def get_dashboard_analytics():
    """Get high-level dashboard metrics."""
    try:
        return await analytics_service.get_dashboard_stats()
    except Exception as e:
        logger.error(f"Dashboard analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard analytics")


@router.get("/intents")
async def get_intent_analytics(period_days: int = Query(30, ge=7, le=365)):
    """Get intent distribution analytics."""
    try:
        data = await analytics_service.get_analytics(period_days=period_days)
        return data.intent_distribution
    except Exception as e:
        logger.error(f"Intent analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch intent analytics")


@router.get("/messages")
async def get_message_analytics():
    """Get message volume and breakdown analytics."""
    try:
        return await analytics_service.get_message_stats()
    except Exception as e:
        logger.error(f"Message analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch message analytics")


@router.get("/performance")
async def get_performance_analytics():
    """Get AI performance and resolution analytics."""
    try:
        return await analytics_service.get_performance_metrics()
    except Exception as e:
        logger.error(f"Performance analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch performance analytics")


@router.get("/channels")
async def get_channel_analytics():
    """Get channel usage analytics."""
    try:
        return await analytics_service.get_channel_usage()
    except Exception as e:
        logger.error(f"Channel analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch channel analytics")


@router.get("/doctors")
async def get_doctor_analytics():
    """Get doctor workload and volume analytics."""
    try:
        return await analytics_service.get_doctor_stats()
    except Exception as e:
        logger.error(f"Doctor analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch doctor analytics")


@router.get("/export")
async def export_analytics(format: str = "json"):
    """Export analytics data."""
    # Simplified export, just returns all stats as JSON for now
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
