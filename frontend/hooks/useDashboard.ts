import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Conversation, Escalation, Appointment, DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: () => api.getDashboardStats(),
  });
}

export function useConversations(statusFilter?: string) {
  return useQuery<Conversation[]>({
    queryKey: ['conversations', statusFilter],
    queryFn: () => api.getConversations(statusFilter),
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
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => api.getPatients(),
  });
}

export function useNotifications(limit?: number) {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => api.getNotifications(limit),
  });
}

export function useAnalytics(periodDays: number = 30) {
  return useQuery({
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