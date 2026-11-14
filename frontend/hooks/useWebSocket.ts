import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getWebSocketUrl } from '@/lib/apiBase';

interface WebSocketEvent {
  type: string;
  data: unknown;
}

const WS_URL = getWebSocketUrl();
const MAX_RECONNECT_ATTEMPTS = 8;

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  const [isConnected, setIsConnected] = useState(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case 'new_message':
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        break;
      case 'appointment_created':
      case 'appointment_updated':
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        break;
      case 'conversation_updated':
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        break;
      case 'patient_created':
      case 'patient_updated':
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        break;
      case 'notification_created':
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        break;
      case 'analytics_updated':
      case 'dashboard_updated':
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        break;
      case 'escalation_created':
      case 'escalation_resolved':
        queryClient.invalidateQueries({ queryKey: ['escalations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        break;
      default:
        break;
    }
  }, [queryClient]);

  const connect = useCallback(() => {
    if (!mountedRef.current || !WS_URL) return;

    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        clearHeartbeat();
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          handleWebSocketEvent(JSON.parse(event.data) as WebSocketEvent);
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[WebSocket] Failed to parse message:', err);
          }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearHeartbeat();
        wsRef.current = null;

        if (!mountedRef.current) return;

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[WebSocket] Reconnect limit reached; realtime updates disabled.');
          }
          return;
        }

        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), delay);
      };

      ws.onerror = () => {
        // The close handler owns reconnection; just surface state.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[WebSocket] Connection error; will retry if possible.');
        }
      };
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[WebSocket] Connection failed:', err);
      }
    }
  }, [clearHeartbeat, handleWebSocketEvent]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendMessage = useCallback((message: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearHeartbeat();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'Component unmounted');
      }
    };
  }, [connect, clearHeartbeat]);

  return { isConnected, sendMessage };
}
