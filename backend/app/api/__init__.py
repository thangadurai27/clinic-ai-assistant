"""
API package — exposes a single combined router.
"""
from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.appointments import router as appointments_router
from app.api.reminders import router as reminders_router
from app.api.conversations import router as conversations_router
from app.api.escalations import router as escalations_router
from app.api.dashboard import router as dashboard_router
from app.api.webhooks import router as webhooks_router
from app.api.doctors import router as doctors_router
from app.api.takeover import router as takeover_router
from app.api.notifications import router as notifications_router
from app.api.patient_portal import router as patient_portal_router
from app.api.admin import router as admin_router
from app.api.analytics import router as analytics_router
from app.api.medications import router as medications_router
from app.api.websocket import router as websocket_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(appointments_router)
api_router.include_router(reminders_router)
api_router.include_router(conversations_router)
api_router.include_router(escalations_router)
api_router.include_router(dashboard_router)
api_router.include_router(webhooks_router)
api_router.include_router(doctors_router)
api_router.include_router(takeover_router)
api_router.include_router(notifications_router)
api_router.include_router(patient_portal_router)
api_router.include_router(admin_router)
api_router.include_router(analytics_router)
api_router.include_router(medications_router)
api_router.include_router(websocket_router)

__all__ = ["api_router"]
