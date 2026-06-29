"""
Pydantic schemas — the single source of truth for all data structures.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ─── Enums ───────────────────────────────────────────────────────────────────


class IntentType(str, Enum):
    BOOK_APPOINTMENT = "BOOK_APPOINTMENT"
    RESCHEDULE_APPOINTMENT = "RESCHEDULE_APPOINTMENT"
    CANCEL_APPOINTMENT = "CANCEL_APPOINTMENT"
    FAQ = "FAQ"
    REMINDER = "REMINDER"
    FOLLOW_UP = "FOLLOW_UP"
    SYMPTOM_QUERY = "SYMPTOM_QUERY"
    HUMAN_SUPPORT = "HUMAN_SUPPORT"


class ChannelType(str, Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    WEB = "web"


class ConversationStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    ESCALATED = "escalated"


class MessageSender(str, Enum):
    PATIENT = "patient"
    AI = "ai"
    STAFF = "staff"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"


class ReminderType(str, Enum):
    MEDICATION = "medication"
    APPOINTMENT = "appointment"
    FOLLOW_UP = "follow_up"


class ReminderStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class EscalationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class ConversationOwnership(str, Enum):
    AI_ACTIVE = "AI_ACTIVE"
    HUMAN_ACTIVE = "HUMAN_ACTIVE"
    CLOSED = "CLOSED"


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class NotificationType(str, Enum):
    EMERGENCY = "emergency"
    NEW_APPOINTMENT = "new_appointment"
    HUMAN_TAKEOVER = "human_takeover"
    NEW_EMAIL = "new_email"
    NEW_WHATSAPP = "new_whatsapp"
    LOW_CONFIDENCE = "low_confidence"
    ESCALATION = "escalation"


class TimelineEventType(str, Enum):
    AI_REPLY = "ai_reply"
    HUMAN_REPLY = "human_reply"
    TAKEOVER_STARTED = "takeover_started"
    TAKEOVER_ENDED = "takeover_ended"
    ESCALATED = "escalated"
    CLOSED = "closed"
    CREATED = "created"
    REOPENED = "reopened"


# ─── Patient ──────────────────────────────────────────────────────────────────


class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[EmailStr] = None
    preferred_channel: ChannelType = ChannelType.WEB


class PatientCreate(PatientBase):
    pass


class PatientRead(PatientBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Conversation ─────────────────────────────────────────────────────────────


class ConversationCreate(BaseModel):
    patient_id: UUID
    channel: ChannelType
    intent: Optional[IntentType] = None
    status: ConversationStatus = ConversationStatus.OPEN
    summary: Optional[str] = None
    gmail_thread_id: Optional[str] = None


class ConversationRead(ConversationCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Message ──────────────────────────────────────────────────────────────────


class MessageCreate(BaseModel):
    conversation_id: UUID
    sender: MessageSender
    content: str = Field(..., min_length=1)


class MessageRead(MessageCreate):
    id: UUID
    timestamp: datetime

    model_config = {"from_attributes": True}


# ─── Appointment ──────────────────────────────────────────────────────────────


class AppointmentCreate(BaseModel):
    patient_id: UUID
    doctor_name: str
    date: datetime
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None


class AppointmentRead(AppointmentCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Reminder ─────────────────────────────────────────────────────────────────


class ReminderCreate(BaseModel):
    patient_id: UUID
    type: ReminderType
    scheduled_at: datetime
    message: Optional[str] = None
    status: ReminderStatus = ReminderStatus.PENDING


class ReminderRead(ReminderCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Escalation ───────────────────────────────────────────────────────────────


class EscalationCreate(BaseModel):
    patient_id: UUID
    conversation_id: Optional[UUID] = None
    reason: str
    priority: EscalationPriority = EscalationPriority.MEDIUM
    status: EscalationStatus = EscalationStatus.OPEN
    summary: Optional[str] = None


class EscalationRead(EscalationCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Chat Request / Response ──────────────────────────────────────────────────


class ChatRequest(BaseModel):
    patient_id: Optional[UUID] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=4000)
    channel: ChannelType = ChannelType.WEB
    conversation_id: Optional[UUID] = None
    gmail_thread_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    intent: IntentType
    confidence: float
    escalated: bool = False
    conversation_id: Optional[UUID] = None
    patient_id: Optional[UUID] = None
    metadata: dict = Field(default_factory=dict)


# ─── Email API ───────────────────────────────────────────────────────────────


class EmailRequest(BaseModel):
    email: str = Field(..., description="Patient email address")
    patient_name: str = Field(..., description="Patient name")
    message: str = Field(..., min_length=1, max_length=4000)


class EmailResponse(BaseModel):
    status: str
    response: str


# ─── Dashboard ────────────────────────────────────────────────────────────────


class DashboardStats(BaseModel):
    total_patients: int
    active_conversations: int
    total_conversations: int
    appointments_today: int
    total_appointments: int
    open_escalations: int
    resolved_escalations: int
    active_doctors: int = 0
    total_emails: int = 0
    total_whatsapp: int = 0
    ai_responses: int = 0
    human_takeovers: int = 0
    avg_response_time: float = 0.0
    automation_rate: float = 0.0
    escalation_rate: float = 0.0


class IntentDistribution(BaseModel):
    intent: str
    count: int


class DailyConversations(BaseModel):
    date: str
    count: int


class AnalyticsResponse(BaseModel):
    intent_distribution: list[IntentDistribution]
    daily_conversations: list[DailyConversations]
    stats: DashboardStats


# ─── Graph State ──────────────────────────────────────────────────────────────


class GraphState(BaseModel):
    """Shared state object passed through the LangGraph workflow."""

    message: str
    patient_id: Optional[str] = None
    conversation_id: Optional[str] = None
    channel: str = "web"
    intent: Optional[IntentType] = None
    confidence: float = 1.0
    response: Optional[str] = None
    escalated: bool = False
    escalation_reason: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    error: Optional[str] = None


# ─── Doctor ──────────────────────────────────────────────────────────────────


class DoctorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    specialty: str = Field(default="General Practice", max_length=200)
    qualification: Optional[str] = None
    experience_years: int = 0
    consultation_fee: float = 500.0
    profile_image: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    avatar_color: str = Field(default="#14b8a6", max_length=20)
    initials: Optional[str] = Field(default=None, max_length=5)
    is_active: bool = True
    emergency_only: bool = False


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_color: Optional[str] = None
    initials: Optional[str] = None
    is_active: Optional[bool] = None
    emergency_only: Optional[bool] = None


class DoctorRead(DoctorBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Doctor Schedule ─────────────────────────────────────────────────────────


class DoctorScheduleBase(BaseModel):
    doctor_id: UUID
    day_of_week: DayOfWeek
    start_time: str = Field(default="08:00", pattern=r"^\d{2}:\d{2}$")  # HH:MM
    end_time: str = Field(default="17:00", pattern=r"^\d{2}:\d{2}$")
    lunch_start: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    lunch_end: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    slot_duration: int = Field(default=30, ge=5, le=240)  # minutes
    is_active: bool = True


class DoctorScheduleCreate(DoctorScheduleBase):
    pass


class DoctorScheduleUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    lunch_start: Optional[str] = None
    lunch_end: Optional[str] = None
    slot_duration: Optional[int] = None
    is_active: Optional[bool] = None


class DoctorScheduleRead(DoctorScheduleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Doctor Leave ────────────────────────────────────────────────────────────


class DoctorLeaveBase(BaseModel):
    doctor_id: UUID
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None


class DoctorLeaveCreate(DoctorLeaveBase):
    pass


class DoctorLeaveRead(DoctorLeaveBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Clinic Holiday ──────────────────────────────────────────────────────────


class ClinicHolidayBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    date: datetime
    is_active: bool = True


class ClinicHolidayCreate(ClinicHolidayBase):
    pass


class ClinicHolidayRead(ClinicHolidayBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Blocked Slot ────────────────────────────────────────────────────────────


class BlockedSlotBase(BaseModel):
    doctor_id: UUID
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None


class BlockedSlotCreate(BlockedSlotBase):
    pass


class BlockedSlotRead(BlockedSlotBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Notification ────────────────────────────────────────────────────────────


class NotificationBase(BaseModel):
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=500)
    body: Optional[str] = None
    patient_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    escalation_id: Optional[UUID] = None
    metadata: dict = Field(default_factory=dict)


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase):
    id: UUID
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Conversation Timeline ───────────────────────────────────────────────────


class ConversationTimelineBase(BaseModel):
    conversation_id: UUID
    event_type: TimelineEventType
    actor: Optional[str] = None
    note: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class ConversationTimelineCreate(ConversationTimelineBase):
    pass


class ConversationTimelineRead(ConversationTimelineBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Takeover ────────────────────────────────────────────────────────────────


class TakeoverRequest(BaseModel):
    conversation_id: UUID
    staff_name: str = Field(..., min_length=1, max_length=200)


class TakeoverResponse(BaseModel):
    success: bool
    message: str
    conversation_id: UUID
    ownership: ConversationOwnership


class ResumeAIRequest(BaseModel):
    conversation_id: UUID


class SendHumanMessageRequest(BaseModel):
    conversation_id: UUID
    message: str = Field(..., min_length=1, max_length=4000)
    staff_name: str = Field(..., min_length=1, max_length=200)


# ─── Availability ────────────────────────────────────────────────────────────


class AvailableSlot(BaseModel):
    start: datetime
    end: datetime
    doctor_id: UUID
    doctor_name: str


class AvailabilityRequest(BaseModel):
    doctor_id: UUID
    date: datetime


class AvailabilityResponse(BaseModel):
    doctor_id: UUID
    doctor_name: str
    date: str
    slots: list[dict]


# ─── Patient Portal ──────────────────────────────────────────────────────────


class PatientLoginRequest(BaseModel):
    email: str
    password: str


class PatientLoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    patient: Optional[dict] = None
    message: Optional[str] = None


class PatientDashboardResponse(BaseModel):
    patient: dict
    appointments: list[dict]
    conversations: list[dict]
    reminders: list[dict]
    medication_reminders: list[dict] = Field(default_factory=list)
    stats: dict = Field(default_factory=dict)


# ─── Medication Reminder ──────────────────────────────────────────────────────


class MedicationReminderBase(BaseModel):
    patient_id: UUID
    medicine_name: str
    dosage: str
    frequency: str
    instructions: Optional[str] = None
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD
    reminder_time: str  # HH:MM or HH:MM:SS
    status: str = "active"
    completed: bool = False


class MedicationReminderCreate(MedicationReminderBase):
    pass


class MedicationReminderUpdate(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reminder_time: Optional[str] = None
    status: Optional[str] = None
    completed: Optional[bool] = None


class MedicationReminderRead(MedicationReminderBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── AI Logging ──────────────────────────────────────────────────────────────


class AILogBase(BaseModel):
    prompt: str
    intent: Optional[str] = None
    confidence: float = 0.0
    response: str
    response_time: float  # seconds
    token_usage: Optional[int] = None
    escalated: bool = False
    ai_model: str
    conversation_id: Optional[UUID] = None
    patient_id: Optional[UUID] = None
    metadata: dict = Field(default_factory=dict)


class AILogCreate(AILogBase):
    pass


class AILogRead(AILogBase):
    id: UUID
    timestamp: datetime

    model_config = {"from_attributes": True}


# ─── Activity Log ────────────────────────────────────────────────────────────


class ActivityLogBase(BaseModel):
    user_id: Optional[UUID] = None
    patient_id: Optional[UUID] = None
    action: str
    resource: Optional[str] = None
    resource_id: Optional[UUID] = None
    details: dict = Field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLogRead(ActivityLogBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
