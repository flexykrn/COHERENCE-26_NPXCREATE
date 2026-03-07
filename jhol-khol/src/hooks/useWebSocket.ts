import { useEffect, useRef, useState } from 'react';

interface AnomalyAlert {
  id: string;
  timestamp: string;
  department: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  amount: number;
  description: string;
}

interface UseWebSocketReturn {
  connected: boolean;
  alerts: AnomalyAlert[];
  lastAlert: AnomalyAlert | null;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [lastAlert, setLastAlert] = useState<AnomalyAlert | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const connect = () => {
      try {
        console.log(`[WebSocket] Connecting to ${url}...`);
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
          console.log('[WebSocket] Connected');
          setConnected(true);
        };

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[WebSocket] Received:', message);
            
            // Extract actual alert data from the wrapper
            const data = message.data || message;
            
            const alert: AnomalyAlert = {
              id: data.id || `alert-${Date.now()}`,
              timestamp: data.timestamp || new Date().toISOString(),
              department: data.department || 'Unknown',
              type: data.type || 'ANOMALY',
              severity: data.severity || 'MEDIUM',
              amount: data.amount || 0,
              description: data.description || data.message || 'Anomaly detected',
            };

            setLastAlert(alert);
            setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
        };

        ws.current.onclose = () => {
          console.log('[WebSocket] Disconnected');
          setConnected(false);
          
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] Attempting to reconnect...');
            connect();
          }, 5000);
        };
      } catch (error) {
        console.error('[WebSocket] Connection error:', error);
        setConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return { connected, alerts, lastAlert };
}
