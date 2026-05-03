/**
 * Singleton WebSocket provider — ONE connection for the entire app.
 * Components subscribe via useRealtimeMessage() instead of creating
 * their own connections.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useRealtimeStore } from "@/store/realtimeStore";
import { useDecisionStore } from "@/store/decisionStore";
import { queryClient } from "@/lib/queryClient";

type MessageHandler = (message: any) => void;

interface WSContextValue {
  sendMessage: (msg: any) => void;
  subscribe: (handler: MessageHandler) => () => void;
  isConnected: boolean;
}

const WSContext = createContext<WSContextValue>({
  sendMessage: () => {},
  subscribe: () => () => {},
  isConnected: false,
});

const RECONNECT_BASE_DELAY = 2_000;
const RECONNECT_MAX_DELAY = 30_000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef             = useRef<WebSocket | null>(null);
  const handlersRef       = useRef<Set<MessageHandler>>(new Set());
  const reconnectDelayRef = useRef(RECONNECT_BASE_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef        = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  // Keep a stable ref to connect so onclose can always schedule the latest version
  const connectRef = useRef<() => void>(() => {});

  const broadcast = useCallback((message: any) => {
    handlersRef.current.forEach((h) => {
      try { h(message); } catch (_) {}
    });
  }, []);

  // connect is defined once; it reads Zustand actions lazily inside via getState()
  // so there are no reactive dependencies that could recreate it on re-renders.
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url   = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      const ws    = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        reconnectDelayRef.current = RECONNECT_BASE_DELAY;
        setIsConnected(true);
        // Read actions lazily — avoids listing them as deps
        useRealtimeStore.getState().setConnected(true);
        if (import.meta.env.DEV) console.log("[WS] connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg   = JSON.parse(event.data);
          const store = useRealtimeStore.getState();
          store.ping();

          const ds = useDecisionStore.getState();
          switch (msg.type) {
            case "new_report":
              queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              if (msg.data?.id) {
                ds.markReportNew(msg.data.id);
                setTimeout(() => ds.unmarkReportNew(msg.data.id), 4000);
              }
              ds.pushEvent({
                type: "new_report",
                message: msg.data?.title ? `New report: ${msg.data.title}` : "New emergency report",
                subtext: msg.data?.location,
                severity: msg.data?.severity,
                timestamp: Date.now(),
                url: msg.data?.id ? `/reports/${msg.data.id}` : "/reports",
              });
              break;
            case "report_updated":
            case "report_verified":
              queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              ds.pushEvent({
                type: "report_updated",
                message: msg.type === "report_verified" ? "Report verified by community" : "Report status updated",
                subtext: msg.data?.location,
                timestamp: Date.now(),
                url: msg.data?.id ? `/reports/${msg.data.id}` : undefined,
              });
              break;
            case "new_notification":
              queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
              queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
              store.incrementUnread();
              ds.pushEvent({
                type: "notification",
                message: msg.data?.title || "New notification",
                timestamp: Date.now(),
                url: "/notifications",
              });
              break;
            case "sos_alert":
              queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              ds.pushEvent({
                type: "sos_alert",
                message: "SOS alert activated",
                subtext: msg.data?.location,
                severity: "critical",
                timestamp: Date.now(),
                url: "/reports",
              });
              break;
            case "notification_count":
              if (typeof msg.data?.count === "number") {
                store.setUnreadCount(msg.data.count);
              }
              break;
            case "batch_matching_complete":
              queryClient.invalidateQueries({ queryKey: ["/api/matching/analytics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/aid-offers"] });
              queryClient.invalidateQueries({ queryKey: ["/api/resource-requests"] });
              ds.pushEvent({
                type: "system",
                message: "AI matching cycle complete",
                timestamp: Date.now(),
                url: "/aid-matching",
              });
              break;
            case "ALERT_BROADCAST":
            case "alert_broadcast":
              ds.pushEvent({
                type: "broadcast",
                message: msg.message || "Emergency broadcast sent",
                severity: msg.severity,
                timestamp: Date.now(),
                url: "/broadcast-alerts",
              });
              break;
            case "SOS_ACTIVATED":
              queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              ds.pushEvent({
                type: "sos_alert",
                message: "SOS activated",
                subtext: msg.location,
                severity: "critical",
                timestamp: Date.now(),
              });
              break;
          }

          broadcast(msg);
        } catch (_) {}
      };

      ws.onclose = (e) => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        useRealtimeStore.getState().setConnected(false);
        wsRef.current = null;
        if (import.meta.env.DEV) console.log(`[WS] closed (${e.code})`);

        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 1.5, RECONNECT_MAX_DELAY);
        // Always schedule the latest version of connect via the ref
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), delay);
      };

      ws.onerror = () => {};
    } catch (_) {}
  }, [broadcast]); // only depends on broadcast (stable)

  // Keep ref in sync so onclose closure always calls latest connect
  useEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]); // connect is stable (only dep is broadcast)

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  return (
    <WSContext.Provider value={{ sendMessage, subscribe, isConnected }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWSContext() {
  return useContext(WSContext);
}

/** Subscribe to realtime messages without creating a new WS connection. */
export function useRealtimeMessage(handler: MessageHandler) {
  const { subscribe } = useWSContext();
  const handlerRef    = useRef(handler);

  // Always keep the ref current without triggering re-subscriptions
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    return subscribe((msg) => handlerRef.current(msg));
  }, [subscribe]);
}
