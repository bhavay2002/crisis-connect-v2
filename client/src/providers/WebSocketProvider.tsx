/**
 * Singleton WebSocket provider — ONE connection for the entire app.
 *
 * Performance upgrades applied:
 * - `report_updated` / `report_verified` → surgical setQueryData patch
 *   (O(1) item update, zero network request) instead of full invalidate
 * - `new_report` → invalidate (item not in cache yet)
 * - All other events → targeted invalidations only for affected query keys
 * - broadcast() uses a Set of handlers (O(n) notify, no allocations)
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
import { useDecisionStore }  from "@/store/decisionStore";
import { queryClient }       from "@/lib/queryClient";

type MessageHandler = (message: any) => void;

interface WSContextValue {
  sendMessage: (msg: any) => void;
  subscribe:   (handler: MessageHandler) => () => void;
  isConnected: boolean;
}

const WSContext = createContext<WSContextValue>({
  sendMessage: () => {},
  subscribe:   () => () => {},
  isConnected: false,
});

const RECONNECT_BASE_DELAY = 2_000;
const RECONNECT_MAX_DELAY  = 30_000;

/** Surgically patch one report in the paginated cache — no network request */
function patchReport(updatedData: any) {
  if (!updatedData?.id) return;
  queryClient.setQueryData(["/api/reports"], (old: any) => {
    if (!old?.data) return old;
    const idx = old.data.findIndex((r: any) => r.id === updatedData.id);
    if (idx === -1) return old;
    const next = [...old.data];
    next[idx] = { ...next[idx], ...updatedData };
    return { ...old, data: next };
  });
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef             = useRef<WebSocket | null>(null);
  const handlersRef       = useRef<Set<MessageHandler>>(new Set());
  const reconnectDelayRef = useRef(RECONNECT_BASE_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef        = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const connectRef = useRef<() => void>(() => {});

  const broadcast = useCallback((message: any) => {
    handlersRef.current.forEach((h) => {
      try { h(message); } catch (_) {}
    });
  }, []);

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
            // ── New report → full invalidate (item not in cache yet) ──────────
            case "new_report":
              queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              if (msg.data?.id) {
                ds.markReportNew(msg.data.id);
                setTimeout(() => ds.unmarkReportNew(msg.data.id), 4000);
              }
              ds.pushEvent({
                type:      "new_report",
                message:   msg.data?.title ? `New report: ${msg.data.title}` : "New emergency report",
                subtext:   msg.data?.location,
                severity:  msg.data?.severity,
                timestamp: Date.now(),
                url:       msg.data?.id ? `/reports/${msg.data.id}` : "/reports",
              });
              break;

            // ── Status/verification update → surgical patch (no network) ─────
            case "report_updated":
            case "report_verified":
              patchReport(msg.data);
              // Only invalidate decisions panel — reports list already patched
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              ds.pushEvent({
                type:      "report_updated",
                message:   msg.type === "report_verified"
                  ? "Report verified by community"
                  : "Report status updated",
                subtext:   msg.data?.location,
                timestamp: Date.now(),
                url:       msg.data?.id ? `/reports/${msg.data.id}` : undefined,
              });
              break;

            // ── Notifications ─────────────────────────────────────────────────
            case "new_notification":
              queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
              queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
              store.incrementUnread();
              ds.pushEvent({
                type:      "notification",
                message:   msg.data?.title || "New notification",
                timestamp: Date.now(),
                url:       "/notifications",
              });
              break;

            // ── SOS alerts ───────────────────────────────────────────────────
            case "sos_alert":
              queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
              queryClient.invalidateQueries({ queryKey: ["/api/sos/active"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              ds.pushEvent({
                type:      "sos_alert",
                message:   "SOS alert activated",
                subtext:   msg.data?.location,
                severity:  "critical",
                timestamp: Date.now(),
                url:       "/reports",
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
                type:      "system",
                message:   "AI matching cycle complete",
                timestamp: Date.now(),
                url:       "/aid-matching",
              });
              break;

            case "ALERT_BROADCAST":
            case "alert_broadcast":
              ds.pushEvent({
                type:      "broadcast",
                message:   msg.message || "Emergency broadcast sent",
                severity:  msg.severity,
                timestamp: Date.now(),
                url:       "/broadcast-alerts",
              });
              break;

            case "SOS_ACTIVATED":
              queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
              queryClient.invalidateQueries({ queryKey: ["/api/sos/active"] });
              queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
              ds.pushEvent({
                type:      "sos_alert",
                message:   "SOS activated",
                subtext:   msg.location,
                severity:  "critical",
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
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), delay);
      };

      ws.onerror = () => {};
    } catch (_) {}
  }, [broadcast]);

  useEffect(() => { connectRef.current = connect; });

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

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

  // Always keep ref current — never triggers re-subscriptions
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    return subscribe((msg) => handlerRef.current(msg));
  }, [subscribe]);
}
