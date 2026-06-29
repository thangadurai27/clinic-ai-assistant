'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://clinic-ai-backend-t38f.onrender.com/api/v1' 
    : 'http://localhost:8001/api/v1');

// Helper function for API requests
async function apiRequest<T = unknown>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed: ${response.status}`);
  }

  return response.json();
}

// Conversations API
export function useConversations(): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<unknown[]>('/conversations'),
  });
}

export function useConversation(id: string): UseQueryResult<unknown, Error> {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiRequest<unknown>(`/conversations/${id}`),
  });
}

export function useCreateConversation(): UseMutationResult<unknown, Error, unknown, unknown> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiRequest<unknown>('/conversations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Appointments API
export function useAppointments(): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiRequest<unknown[]>('/appointments'),
  });
}

export function useCreateAppointment(): UseMutationResult<unknown, Error, unknown, unknown> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiRequest<unknown>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Escalations API
export function useEscalations(): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: ['escalations'],
    queryFn: () => apiRequest<unknown[]>('/escalations'),
  });
}

// Patients API
export function usePatients(): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => apiRequest<unknown[]>('/patients'),
  });
}

// Dashboard API
export function useDashboard(): UseQueryResult<unknown, Error> {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<unknown>('/dashboard'),
  });
}

// Analytics API
export function useAnalytics(): UseQueryResult<unknown, Error> {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiRequest<unknown>('/analytics'),
  });
}

// Notifications API
export function useNotifications(): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<unknown[]>('/notifications'),
  });
}
