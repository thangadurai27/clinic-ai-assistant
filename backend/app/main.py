"""
FastAPI application entry point.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.utils.logger import configure_logging
from app.api import api_router
from app.services.email_scheduler import start_email_scheduler, stop_email_scheduler

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("%s v%s starting up...", settings.APP_NAME, settings.APP_VERSION)
    logger.info("   Model  : %s", settings.GROQ_MODEL)
    logger.info("   Debug  : %s", settings.DEBUG)
    logger.info("   Docs   : http://localhost:8001/docs")
    logger.info("-" * 50)
    logger.info("Email inbound  -> Gmail IMAP (APScheduler, every 15s)")
    logger.info("Email outbound -> Gmail API (OAuth2)")
    logger.info("WhatsApp webhook -> POST /api/v1/webhooks/twilio")
    logger.info("-" * 50)

    start_email_scheduler()

    yield

    stop_email_scheduler()
    logger.info("Shutting down gracefully...")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AI-powered Front Desk Assistant for medical clinics. "
        "Automates patient communication via WhatsApp, Email, and Web chat "
        "while safely escalating sensitive situations to human staff."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS — allow credentials requires explicit origin list (not wildcard)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "https://clinic-ai-assistant-one.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "email": "gmail-imap-api",
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health_check() -> dict:
    return await health_check()


@app.get("/", tags=["Root"])
async def root() -> dict:
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )
