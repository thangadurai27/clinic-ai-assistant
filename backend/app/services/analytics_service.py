"""
Dashboard analytics service — Production-ready, all data from Supabase.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta

from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.repositories import (
    appointment_repo,
    conversation_repo,
    escalation_repo,
    patient_repo,
)
from app.schemas import AnalyticsResponse, DailyConversations, DashboardStats, IntentDistribution
from app.utils.cache import cached_async

logger = logging.getLogger(__name__)

STATS_CACHE_TTL = 60
ANALYTICS_CACHE_TTL = 120


async def _fetch_dashboard_stats() -> DashboardStats:
    """Aggregate live dashboard statistics from Supabase."""
    try:
        total_patients = await patient_repo.count()
        total_conversations = await conversation_repo.count_all()
        active_conversations = await conversation_repo.count_active()
        appointments_today = await appointment_repo.count_today()
        total_appointments = await appointment_repo.count_all()
        open_escalations = await escalation_repo.count_open()
        resolved_escalations = await escalation_repo.count_resolved()

        # Channel specific counts
        email_convs = await run_blocking(
            lambda: get_supabase().table("conversations").select("id", count="exact").eq("channel", "email").execute()
        )
        total_emails = email_convs.count or 0

        whatsapp_convs = await run_blocking(
            lambda: get_supabase().table("conversations").select("id", count="exact").eq("channel", "whatsapp").execute()
        )
        total_whatsapp = whatsapp_convs.count or 0

        # AI Responses count from messages table
        ai_msgs = await run_blocking(
            lambda: get_supabase().table("messages").select("id", count="exact").eq("sender", "ai").execute()
        )
        ai_responses = ai_msgs.count or 0

        # Human takeovers count
        human_takeovers = await run_blocking(
            lambda: get_supabase().table("conversations").select("id", count="exact").eq("ownership", "HUMAN_ACTIVE").execute()
        )
        total_takeovers = human_takeovers.count or 0

        # Doctors
        active_doctors = 0
        try:
            res = await run_blocking(
                lambda: get_supabase()
                .table("doctors")
                .select("id", count="exact")
                .eq("is_active", True)
                .execute()
            )
            active_doctors = res.count or 0
        except Exception:
            pass

        # Performance metrics for the stats object
        perf = await get_performance_metrics()

        return DashboardStats(
            total_patients=total_patients,
            total_conversations=total_conversations,
            active_conversations=active_conversations,
            appointments_today=appointments_today,
            total_appointments=total_appointments,
            open_escalations=open_escalations,
            resolved_escalations=resolved_escalations,
            active_doctors=active_doctors,
            total_emails=total_emails,
            total_whatsapp=total_whatsapp,
            ai_responses=ai_responses,
            human_takeovers=total_takeovers,
            avg_response_time=perf.get("avg_ai_response_time", 0.0),
            automation_rate=perf.get("automation_rate", 0.0),
            escalation_rate=perf.get("escalation_rate", 0.0)
        )
    except Exception as e:
        logger.error("Dashboard stats error: %s", e, exc_info=True)
        return DashboardStats(
            total_patients=0,
            total_conversations=0,
            active_conversations=0,
            appointments_today=0,
            total_appointments=0,
            open_escalations=0,
            resolved_escalations=0,
            active_doctors=0,
        )


async def get_dashboard_stats() -> DashboardStats:
    return await cached_async("dashboard:stats", STATS_CACHE_TTL, _fetch_dashboard_stats)


async def _daily_conversation_counts(period_days: int) -> list[DailyConversations]:
    start = date.today() - timedelta(days=period_days - 1)
    res = await run_blocking(
        lambda: get_supabase()
        .table("conversations")
        .select("created_at")
        .gte("created_at", f"{start.isoformat()}T00:00:00")
        .execute()
    )
    counts: dict[str, int] = defaultdict(int)
    for row in res.data or []:
        created = (row.get("created_at") or "")[:10]
        if created:
            counts[created] += 1

    daily: list[DailyConversations] = []
    for i in range(period_days - 1, -1, -1):
        target = date.today() - timedelta(days=i)
        daily.append(
            DailyConversations(
                date=target.strftime("%b %d"),
                count=counts.get(target.isoformat(), 0),
            )
        )
    return daily


async def get_analytics(period_days: int = 14) -> AnalyticsResponse:
    """
    Get analytics data for charts — all pulled from real database.

    Args:
        period_days: Number of days to include in daily conversation chart (7, 14, 30, 90)
    """
    cache_key = f"dashboard:analytics:{period_days}"

    async def _build() -> AnalyticsResponse:
        stats = await get_dashboard_stats()

        try:
            since = (date.today() - timedelta(days=90)).isoformat()
            conv_res = await run_blocking(
                lambda: get_supabase()
                .table("conversations")
                .select("intent")
                .gte("created_at", f"{since}T00:00:00")
                .not_.is_("intent", "null")
                .execute()
            )
            intent_counts: dict[str, int] = defaultdict(int)
            for row in conv_res.data or []:
                if row.get("intent"):
                    intent_counts[row["intent"]] += 1

            intent_dist = [
                IntentDistribution(intent=k, count=v)
                for k, v in sorted(intent_counts.items(), key=lambda x: -x[1])
            ] or [IntentDistribution(intent="No Data", count=0)]
        except Exception as e:
            logger.error("Intent distribution error: %s", e)
            intent_dist = []

        daily = await _daily_conversation_counts(period_days)

        return AnalyticsResponse(
            intent_distribution=intent_dist,
            daily_conversations=daily,
            stats=stats,
        )

    return await cached_async(cache_key, ANALYTICS_CACHE_TTL, _build)
async def get_performance_metrics() -> dict:
    """Calculate AI performance and resolution stats."""
    try:
        # 1. AI Response time and confidence from ai_logs
        logs_res = await run_blocking(
            lambda: get_supabase()
            .table("ai_logs")
            .select("response_time, confidence")
            .limit(1000)
            .execute()
        )
        logs = logs_res.data or []
        avg_rt = sum(l["response_time"] for l in logs) / len(logs) if logs else 0
        avg_conf = sum(l["confidence"] for l in logs) / len(logs) if logs else 0

        # 2. Automation rate (AI resolved vs human takeover)
        total_convs = await run_blocking(
            lambda: get_supabase().table("conversations").select("id", count="exact").execute()
        )
        total_count = total_convs.count or 0
        
        escalated_convs = await run_blocking(
            lambda: get_supabase().table("conversations").select("id", count="exact").eq("status", "escalated").execute()
        )
        escalated_count = escalated_convs.count or 0
        
        automation_rate = ((total_count - escalated_count) / total_count * 100) if total_count > 0 else 0

        # 3. Resolution time
        # This is complex to calculate without specific 'resolved' events, 
        # but we can estimate from created_at to updated_at for closed conversations.
        closed_convs = await run_blocking(
            lambda: get_supabase()
            .table("conversations")
            .select("created_at, updated_at")
            .eq("status", "closed")
            .limit(100)
            .execute()
        )
        res_times = []
        for c in closed_convs.data or []:
            if c.get("created_at") and c.get("updated_at"):
                start = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(c["updated_at"].replace("Z", "+00:00"))
                res_times.append((end - start).total_seconds() / 60) # minutes
        
        avg_res_time = sum(res_times) / len(res_times) if res_times else 0

        return {
            "avg_ai_response_time": round(avg_rt, 2),
            "avg_resolution_time": round(avg_res_time, 1),
            "ai_accuracy": round(avg_conf * 100, 1),
            "automation_rate": round(automation_rate, 1),
            "escalation_rate": round((escalated_count / total_count * 100) if total_count > 0 else 0, 1)
        }
    except Exception as e:
        logger.error("Performance metrics error: %s", e)
        return {}


async def get_channel_usage() -> list[dict]:
    """Channel usage breakdown."""
    try:
        res = await run_blocking(
            lambda: get_supabase().table("conversations").select("channel").execute()
        )
        counts = defaultdict(int)
        for row in res.data or []:
            counts[row["channel"]] += 1
        
        total = sum(counts.values())
        return [
            {"channel": k, "count": v, "percentage": round((v / total * 100), 1) if total > 0 else 0}
            for k, v in counts.items()
        ]
    except Exception:
        return []


async def get_message_stats() -> dict:
    """Total messages breakdown."""
    try:
        res = await run_blocking(
            lambda: get_supabase().table("messages").select("sender").execute()
        )
        counts = defaultdict(int)
        for row in res.data or []:
            counts[row["sender"]] += 1
        
        return {
            "total_messages": sum(counts.values()),
            "patient_messages": counts.get("patient", 0),
            "ai_responses": counts.get("ai", 0),
            "staff_responses": counts.get("staff", 0),
        }
    except Exception:
        return {}


async def get_doctor_stats() -> list[dict]:
    """Top doctors by appointment volume."""
    try:
        res = await run_blocking(
            lambda: get_supabase()
            .table("appointments")
            .select("doctor_name, status")
            .execute()
        )
        stats = defaultdict(lambda: {"total": 0, "completed": 0})
        for row in res.data or []:
            name = row["doctor_name"]
            stats[name]["total"] += 1
            if row["status"] == "completed":
                stats[name]["completed"] += 1
        
        sorted_stats = sorted(
            [{"name": k, **v} for k, v in stats.items()],
            key=lambda x: -x["total"]
        )
        return sorted_stats[:10]
    except Exception as e:
        logger.error("Doctor stats error: %s", e)
        return []
