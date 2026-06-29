/* eslint-disable */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

type WebSocketMessage = {
  type: string;
  data?: unknown;
  message?: string;
};

type WebSocketHook = {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  error: Error | null;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'wss://clinic-ai-backend-t38f.onrender.com/api/v1/ws' 
    : 'ws://localhost:8001/api/v1/ws');

export function useWebSocket(clinicId: string = 'global'): WebSocketHook {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 10;

  // Use a ref to hold the connect function to avoid circular dependency issues
  const connect = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const url = `${WS_URL}?clinic_id=${clinicId}`;
      console.log(`[WebSocket] Connecting to ${url}`);
      const newWs = new WebSocket(url);

      newWs.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
      };

      newWs.onclose = (event) => {
        console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
        setIsConnected(false);
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`[WebSocket] Reconnecting in ${timeout / 1000}s (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connectRef.current?.();
          }, timeout);
        }
      };

      newWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('[WebSocket] Received:', message);
          setLastMessage(message);
        } catch {
          console.error('[WebSocket] Invalid JSON:', event.data);
        }
      };

      newWs.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError(new Error('WebSocket connection error'));
      };

      setWs(newWs);
    } catch (err) {
        console.error('[WebSocket] Connection error:', err);
        setError(err as Error);
      }
    }, [clinicId, reconnectAttempts]);

  // Update the ref whenever connect changes
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws && isConnected) {
      console.log('[WebSocket] Sending:', message);
      ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Not connected, message not sent:', message);
    }
  }, [ws, isConnected]);

  useEffect(() => {
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [clinicId, connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    error,
  };
}
