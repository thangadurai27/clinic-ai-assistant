// API client — typed fetch wrapper for the FastAPI backend
import type { DashboardStats, Conversation, Escalation, Appointment, Patient, Notification } from "@/types";
import { tokenManager, authAPI } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return tokenManager.getToken();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseError(res: Response) {
  const fallback = { detail: `HTTP ${res.status}` };
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json().catch(() => fallback);
  }

  const text = await res.text().catch(() => "");
  return { detail: text || fallback.detail };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const method = options.method || "GET";
  const canRetry = method === "GET";

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        keepalive: method === "GET",
      });
    } catch (error) {
      if (canRetry && attempt < MAX_RETRIES) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw error;
    }

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        // Try to refresh token if we have one!
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            console.log("[Request] Trying to refresh token...");
            const refreshResponse = await authAPI.refreshToken(refreshToken);
            if (refreshResponse.access_token) {
              tokenManager.setToken(refreshResponse.access_token);
              if (refreshResponse.refresh_token) {
                tokenManager.setRefreshToken(refreshResponse.refresh_token);
              }
              if (refreshResponse.user) {
                tokenManager.setUser(refreshResponse.user);
              }
              // Retry the original request!
              token = refreshResponse.access_token;
              headers["Authorization"] = `Bearer ${token}`;
              continue; // Retry the request!
            }
          } catch (refreshErr) {
            console.error("[Request] Token refresh failed:", refreshErr);
          }
        }

        // If we're here, either no refresh token or refresh failed
        tokenManager.clear();
        document.cookie = "clinic_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const err = await parseError(res);
      if (canRetry && RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }

  throw new Error("Request failed after retries");
}

/** Parallel fetch for dashboard overview — reduces waterfall latency. */
export function fetchDashboardOverview() {
  return Promise.all([
    request("/dashboard/stats"),
    request("/conversations"),
    request("/escalations"),
    request("/notifications?limit=20"),
    request("/appointments"),
  ]);
}

export const api = {
  chat: (body: unknown) =>
    request("/chat", { method: "POST", body: JSON.stringify(body) }),

  getConversations: (statusFilter?: string) =>
    request<Conversation[]>(`/conversations${statusFilter ? `?status_filter=${statusFilter}` : ""}`),
  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),
  getConversationTimeline: (id: string) => request(`/conversations/${id}/timeline`),

  takeOver: (conversationId: string, staffName: string, note?: string) =>
    request(`/conversations/${conversationId}/takeover`, {
      method: "POST",
      body: JSON.stringify({ staff_name: staffName, note }),
    }),
  resumeAI: (conversationId: string, note?: string) =>
    request(`/conversations/${conversationId}/resume-ai`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  sendStaffMessage: (conversationId: string, content: string, staffName = "Staff") =>
    request(`/conversations/${conversationId}/staff-message`, {
      method: "POST",
      body: JSON.stringify({ content, staff_name: staffName }),
    }),

  getAppointments: (patientId?: string) =>
    request<Appointment[]>(`/appointments${patientId ? `?patient_id=${patientId}` : ""}`),
  createAppointment: (body: unknown) =>
    request("/appointments", { method: "POST", body: JSON.stringify(body) }),

  getEscalations: (statusFilter?: string) =>
    request<Escalation[]>(`/escalations${statusFilter ? `?status_filter=${statusFilter}` : ""}`),
  updateEscalationStatus: (id: string, status: string) =>
    request(`/escalations/${id}/status?status_value=${status}`, { method: "PATCH" }),

  getDoctors: () => request("/doctors"),

  getNotifications: (limit = 50) => request<Notification[]>(`/notifications?limit=${limit}`),
  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request("/notifications/mark-all-read", { method: "POST" }),

  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),
  getPatients: () => request<Patient[]>("/dashboard/patients"),

  getPatientDashboard: () => request("/patient/dashboard"),
  getPatientProfile: () => request("/patient/profile"),
  updatePatientProfile: (body: unknown) =>
    request("/patient/profile", { method: "PUT", body: JSON.stringify(body) }),
  getPatientAppointments: () => request("/patient/appointments"),
  createPatientAppointment: (body: unknown) =>
    request("/patient/appointments", { method: "POST", body: JSON.stringify(body) }),
  updatePatientAppointment: (appointmentId: string, body: unknown) =>
    request(`/patient/appointments/${appointmentId}`, { method: "PUT", body: JSON.stringify(body) }),
  cancelPatientAppointment: (appointmentId: string, reason = "Patient request") =>
    request(`/patient/appointments/${appointmentId}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" }),
  getPatientDoctors: () => request("/patient/doctors"),
  getPatientDoctorAvailability: (doctorId: string, date: string) =>
    request(`/patient/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`),
  getPatientConversations: () => request("/patient/messages"),
  getPatientConversation: (conversationId: string) => request(`/patient/messages/${conversationId}`),
  sendPatientMessage: (body: unknown) =>
    request("/patient/messages", { method: "POST", body: JSON.stringify(body) }),
  getPatientNotifications: (limit = 100) => request(`/patient/notifications?limit=${limit}`),
  getPatientMedicationReminders: () => request("/patient/medication-reminders"),
  markPatientNotificationRead: (notificationId: string) =>
    request("/patient/notifications/read", {
      method: "PUT",
      body: JSON.stringify({ notification_id: notificationId }),
    }),
  markAllPatientNotificationsRead: () =>
    request("/patient/notifications/read", { method: "PUT", body: JSON.stringify({ all: true }) }),
  deletePatientNotification: (notificationId: string) =>
    request(`/patient/notifications/${notificationId}`, { method: "DELETE" }),
  searchPatient: (query: string) => request(`/patient/search?q=${encodeURIComponent(query)}`),

  updateProfile: (body: { full_name?: string; phone?: string }) =>
    request("/admin/profile", { method: "PATCH", body: JSON.stringify(body) }),

  // Medications
  getMedications: () => request("/medications"),
  getMedication: (id: string) => request(`/medications/${id}`),
  createMedication: (body: unknown) => request("/medications", { method: "POST", body: JSON.stringify(body) }),
  updateMedication: (id: string, body: unknown) => request(`/medications/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  completeMedication: (id: string) => request(`/medications/${id}/complete`, { method: "PATCH" }),
  deleteMedication: (id: string) => request(`/medications/${id}`, { method: "DELETE" }),

  // Analytics
  getAnalytics: (days: number = 30) => request(`/analytics?period_days=${days}`),
  getAnalyticsDashboard: () => request("/analytics/dashboard"),
  getAnalyticsIntents: (days: number = 30) => request(`/analytics/intents?period_days=${days}`),
  getAnalyticsPerformance: () => request("/analytics/performance"),
  getAnalyticsChannels: () => request("/analytics/channels"),
  getAnalyticsMessages: () => request("/analytics/messages"),
};
