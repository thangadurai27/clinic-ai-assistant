"""Public demo mode — provisioning, sample data, and safe simulated actions."""
from app.demo.data import (  # noqa: F401
    analytics_payload,
    analytics_summary,
    appointments,
    conversations,
    dashboard_stats,
    doctors,
    escalations,
    notifications,
    patients,
)
from app.demo.service import (  # noqa: F401
    DemoProvisioningError,
    demo_email,
    demo_enabled,
    demo_password,
    demo_public_config,
    ensure_demo_user_session,
    ensure_demo_user_sync,
    is_demo_user,
)
