"""
Application configuration and settings management.
"""
from functools import lru_cache
from typing import Any, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Clinic AI Front Desk Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "your-secret-key-change-in-production"

    # Groq LLM
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # LangChain / LangSmith (optional)
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_PROJECT: str = "clinic-ai-assistant"

    # Twilio (WhatsApp)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"  # Twilio sandbox default

    # Gmail API (OAuth2) and IMAP
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REFRESH_TOKEN: Optional[str] = None
    IMAP_SERVER: str = "imap.gmail.com"
    IMAP_PORT: int = 993
    IMAP_EMAIL: Optional[str] = None
    IMAP_PASSWORD: Optional[str] = None

    # Clinic Info (used by FAQ agent)
    CLINIC_NAME: str = "KLM AI Clinic"
    CLINIC_ADDRESS: str = "123 Health Street, Medical District, NY 10001"
    CLINIC_PHONE: str = "+91-7871691614"
    CLINIC_EMAIL: str = "klmaiclinic@gmail.com"
    CLINIC_HOURS: str = "Monday-Friday: 8AM-6PM, Saturday: 9AM-2PM, Sunday: Closed"
    CLINIC_EMERGENCY: str = "+1-212-555-0911"

    # Safety
    CONFIDENCE_THRESHOLD: float = 0.6

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        """Accept common deployment-style DEBUG values from shell environments."""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod"}:
                return False
        return bool(value)


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
