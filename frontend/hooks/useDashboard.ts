import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Conversation, Escalation, Appointment, DashboardStats, AnalyticsData, Patient, Notification } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: () => api.getDashboardStats(),
  });
}

export function useConversations(statusFilter?: string) {
    return useQuery<Conversation[]>({
        queryKey: ["conversations", statusFilter],
        queryFn: async () => {
            const data = await api.getConversations(statusFilter);
            console.log("[useConversations] Raw data from API:", data);
            const sorted = data.sort((a, b) => {
                const getTime = (c: Conversation) => 
                    new Date(c.last_message_at || c.updated_at || c.created_at).getTime();
                return getTime(b) - getTime(a);
            });
            console.log("[useConversations] Sorted data:", sorted);
            return sorted;
        },
    });
}

export function useEscalations(statusFilter?: string) {
  return useQuery<Escalation[]>({
    queryKey: ['escalations', statusFilter],
    queryFn: () => api.getEscalations(statusFilter),
  });
}

export function useAppointments(patientId?: string) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', patientId],
    queryFn: () => api.getAppointments(patientId),
  });
}

export function usePatients() {
  return useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: () => api.getPatients(),
  });
}

export function useNotifications(limit?: number, options?: any) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', limit],
    queryFn: () => api.getNotifications(limit),
    ...options
  });
}

export function useAnalytics(periodDays: number = 30) {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics', periodDays],
    queryFn: () => api.getAnalytics(periodDays),
  });
}

export function useAnalyticsIntents(periodDays: number = 30) {
  return useQuery({
    queryKey: ['analyticsIntents', periodDays],
    queryFn: () => api.getAnalyticsIntents(periodDays),
  });
}

export function useAnalyticsPerformance() {
  return useQuery({
    queryKey: ['analyticsPerformance'],
    queryFn: () => api.getAnalyticsPerformance(),
  });
}

export function useAnalyticsChannels() {
  return useQuery({
    queryKey: ['analyticsChannels'],
    queryFn: () => api.getAnalyticsChannels(),
  });
}

export function useAnalyticsMessages() {
  return useQuery({
    queryKey: ['analyticsMessages'],
    queryFn: () => api.getAnalyticsMessages(),
  });
}