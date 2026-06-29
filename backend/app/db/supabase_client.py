"""
Supabase client initialization and connection management.
"""
import logging
from supabase import create_client, Client
from app.config.settings import settings

logger = logging.getLogger(__name__)

def get_supabase() -> Client:
    """
    Create a fresh Supabase client for each call.

    The sync Supabase stack uses an HTTP/2 connection pool underneath. Reusing a
    global client across many concurrent threadpool tasks caused intermittent
    `ConnectionTerminated`, pseudo-header trailer, and stream state errors in the
    dashboard endpoints. A fresh client per operation is more stable here.
    """
    try:
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        raise


def reset_supabase() -> None:
    """Compatibility no-op now that clients are created per call."""
    logger.warning("Supabase client reset requested after transient transport failure.")


def get_supabase_anon() -> Client:
    """Get an anonymous Supabase client (for public operations)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
