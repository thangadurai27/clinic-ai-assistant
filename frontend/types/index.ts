// Central TypeScript type definitions

export type ChannelType = "whatsapp" | "email" | "web";
export type IntentType =
  | "BOOK_APPOINTMENT" | "RESCHEDULE_APPOINTMENT" | "CANCEL_APPOINTMENT"
  | "FAQ" | "REMINDER" | "FOLLOW_UP" | "SYMPTOM_QUERY" | "HUMAN_SUPPORT";

export type ConversationStatus = "open" | "closed" | "escalated";
export type ConversationOwnership = "AI_ACTIVE" | "HUMAN_ACTIVE" | "CLOSED";
export type MessageSender = "patient" | "ai" | "staff";
export type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "completed" | "rescheduled";
export type ReminderType = "medication" | "appointment" | "follow_up";
export type ReminderStatus = "pending" | "sent" | "failed";
export type EscalationPriority = "low" | "medium" | "high" | "critical";
export type EscalationStatus = "open" | "in_progress" | "resolved";

export interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  user_id?: string;
  preferred_channel: ChannelType;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read" | "failed";
  delivery_status?: string;
  read_at?: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  channel: ChannelType;
  intent?: IntentType;
  status: ConversationStatus;
  ownership?: ConversationOwnership;
  taken_over_by?: string;
  taken_over_at?: string;
  resumed_ai_at?: string;
  summary?: string;
  ai_summary?: string;
  ai_confidence?: number;
  created_at: string;
  updated_at?: string;
  last_message?: Message;
  patients?: Patient;
  messages?: Message[];
}

export interface ConversationTimelineEvent {
  id: string;
  conversation_id: string;
  event_type: string;
  actor?: string;
  note?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  doctor_name: string;
  date: string;
  slot_start?: string;
  slot_end?: string;
  status: AppointmentStatus;
  notes?: string;
  cancellation_reason?: string;
  conversation_id?: string;
  updated_at?: string;
  created_at: string;
  patients?: Patient;
}

export interface Reminder {
  id: string;
  patient_id: string;
  type: ReminderType;
  scheduled_at: string;
  message?: string;
  status: ReminderStatus;
  created_at: string;
}

export interface MedicationReminder {
  id: string;
  patient_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  start_date: string;
  end_date?: string;
  reminder_time: string;
  status: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Escalation {
  id: string;
  patient_id: string;
  conversation_id?: string;
  reason: string;
  priority: EscalationPriority;
  status: EscalationStatus;
  summary?: string;
  created_at: string;
  patients?: Patient;
  metadata?: Record<string, unknown>;
}

// ── Doctor types ────────────────────────────────────────────────────────────

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  avatar_color: string;
  initials: string;
  is_active: boolean;
  emergency_only: boolean;
  created_at: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
  slot_duration: number;
  is_active: boolean;
}

export interface DoctorLeave {
  id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface ClinicHoliday {
  id: string;
  name: string;
  date: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
  available: boolean;
  date?: string;
}

// ── Notification types ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  patient_id?: string;
  conversation_id?: string;
  escalation_id?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface PatientProfile {
  id: string;
  patient_id: string;
  name: string;
  full_name: string;
  email?: string;
  phone?: string;
  preferred_channel: ChannelType;
  dob?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  medical_history?: string;
  allergies?: string;
  profile_photo?: string;
  created_at?: string;
  profile_storage_enabled?: boolean;
}

export interface PatientDashboardData {
  patient: Patient;
  appointments: Appointment[];
  upcoming_appointments: Appointment[];
  completed_appointments: Appointment[];
  cancelled_appointments: Appointment[];
  appointment_counts: Record<string, number>;
  conversations: Conversation[];
  recent_conversations: Conversation[];
  notifications: Notification[];
  latest_notifications: Notification[];
  unread_notifications: number;
  ai_conversation_summaries: Array<{
    conversation_id: string;
    summary?: string;
    intent?: string;
    confidence?: number;
    updated_at?: string;
  }>;
  emergency_alerts: Array<Record<string, unknown>>;
  reminders: Reminder[];
  medication_reminders: MedicationReminder[];
  stats: {
    upcoming_visits: number;
    completed_visits: number;
    cancelled_visits: number;
    total_messages: number;
    ai_conversations: number;
    human_conversations: number;
    health_score: number;
    monthly_visits: Array<{ month: string; visits: number }>;
    average_response_time: string;
    appointment_trend: string;
    // Medication Stats
    today_medicines: number;
    completed_today: number;
    pending_today: number;
    missed_today: number;
    weekly_compliance: number;
    monthly_compliance: number;
  };
  unread_messages: number;
  quick_actions: Record<string, boolean>;
}

// ── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total_patients: number;
  total_conversations: number;
  active_conversations: number;
  appointments_today: number;
  total_appointments: number;
  open_escalations: number;
  resolved_escalations: number;
  active_doctors: number;
  total_emails: number;
  total_whatsapp: number;
  ai_responses: number;
  human_takeovers: number;
  avg_response_time: number;
  automation_rate: number;
  escalation_rate: number;
}

export interface IntentDistribution { intent: string; count: number; }
export interface DailyConversations { date: string; count: number; }

export interface AnalyticsResponse {
  intent_distribution: IntentDistribution[];
  daily_conversations: DailyConversations[];
  stats: DashboardStats;
}

export interface ChatRequest {
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string;
  patient_email?: string;
  message: string;
  channel: ChannelType;
  conversation_id?: string;
}

export interface ChatResponse {
  message: string;
  intent: IntentType;
  confidence: number;
  escalated: boolean;
  conversation_id?: string;
  patient_id?: string;
  metadata: Record<string, unknown>;
}
