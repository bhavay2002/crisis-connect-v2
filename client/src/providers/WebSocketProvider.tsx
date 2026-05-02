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
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectDelayRef = useRef(RECONNECT_BASE_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const { setConnected, ping, incrementUnread, setUnreadCount } = useRealtimeStore.getState();

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
      const url = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        reconnectDelayRef.current = RECONNECT_BASE_DELAY;
        setIsConnected(true);
        setConnected(true);
        if (import.meta.env.DEV) console.log("[WS] connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          ping();

          // Global side-effects driven by message type
          switch (msg.type) {
            case "new_report":
            case "report_updated":
            case "report_verified":
              queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
              break;
            case "new_notification":
              queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
              queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
              incrementUnread();
              break;
            case "sos_alert":
              queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
              break;
            case "notification_count":
              if (typeof msg.data?.count === "number") {
                setUnreadCount(msg.data.count);
              }
              break;
            case "batch_matching_complete":
              queryClient.invalidateQueries({ queryKey: ["/api/matching/analytics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/aid-offers"] });
              queryClient.invalidateQueries({ queryKey: ["/api/resource-requests"] });
              break;
          }

          broadcast(msg);
        } catch (_) {}
      };

      ws.onclose = (e) => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        setConnected(false);
        wsRef.current = null;
        if (import.meta.env.DEV) console.log(`[WS] closed (${e.code})`);

        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 1.5, RECONNECT_MAX_DELAY);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {};
    } catch (_) {}
  }, [broadcast, ping, incrementUnread, setConnected, setUnreadCount]);

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
  const handlerRef = useRef(handler);

  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    return subscribe((msg) => handlerRef.current(msg));
  }, [subscribe]);
}
