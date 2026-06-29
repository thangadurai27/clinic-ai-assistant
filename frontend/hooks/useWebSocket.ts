import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketEvent {
  type: string;
  data: unknown;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/api/v1/ws';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      console.log('[WebSocket] Connecting...');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Start heartbeat (30 seconds)
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);
          handleWebSocketEvent(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code);
        setIsConnected(false);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
        setTimeout(connect, delay);
        reconnectAttemptsRef.current += 1;
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
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
        console.log('[WebSocket] Unknown event type:', event.type);
    }
  }, [queryClient]);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connect]);

  return { isConnected, sendMessage };
}