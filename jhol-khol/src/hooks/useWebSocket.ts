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

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 3000;

function confidenceToSeverity(score: number): AnomalyAlert['severity'] {
  if (score >= 0.9) return 'CRITICAL';
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.5) return 'MEDIUM';
  return 'LOW';
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [lastAlert, setLastAlert] = useState<AnomalyAlert | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const retryCountRef = useRef(0);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    const connect = () => {
      if (unmountedRef.current) return;

      try {
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
          if (unmountedRef.current) return;
          retryCountRef.current = 0;
          setConnected(true);
        };

        ws.current.onmessage = (event) => {
          if (unmountedRef.current) return;
          try {
            const envelope = JSON.parse(event.data);
            // Backend sends { type: 'new_anomaly', data: { alert_id, alert_type, ... } }
            const raw = (envelope?.data ?? envelope) as Record<string, unknown>;

            const confidence = parseFloat(String(raw.confidence_score ?? 0));
            const alert: AnomalyAlert = {
              id: String(raw.alert_id ?? raw.id ?? `alert-${Date.now()}`),
              timestamp: String(raw.timestamp ?? new Date().toISOString()),
              department: String(raw.dept_id ?? raw.department ?? 'Unknown'),
              type: String(raw.alert_type ?? raw.type ?? 'ANOMALY'),
              severity: (raw.severity as AnomalyAlert['severity']) ?? confidenceToSeverity(confidence),
              amount: Number(raw.amount ?? raw.flagged_amount ?? 0),
              description: String(raw.description ?? raw.message ?? 'Anomaly detected'),
            };

            setLastAlert(alert);
            setAlerts((prev) => [alert, ...prev].slice(0, 50));
          } catch (err) {
            console.error('[WebSocket] Failed to parse message:', err);
          }
        };

        ws.current.onerror = () => {
          // Browser WebSocket error events carry no useful detail; the close
          // event (which always follows) has the code/reason.
          if (retryCountRef.current === 0) {
            console.warn(`[WebSocket] Connection to ${url} failed — will retry (max ${MAX_RETRIES})`);
          }
        };

        ws.current.onclose = (event) => {
          if (unmountedRef.current) return;
          setConnected(false);

          if (retryCountRef.current >= MAX_RETRIES) {
            console.warn(`[WebSocket] Gave up after ${MAX_RETRIES} retries.`);
            return;
          }

          const delay = BASE_DELAY_MS * 2 ** retryCountRef.current;
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };
      } catch (err) {
        console.error('[WebSocket] Failed to create connection:', err);
      }
    };

    connect();

    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimeoutRef.current);
      ws.current?.close();
    };
  }, [url]);

  return { connected, alerts, lastAlert };
}

