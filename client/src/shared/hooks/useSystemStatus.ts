/**
 * useSystemStatus — unified system state machine.
 *
 * Combines network status + WebSocket connection status into one
 * human-meaningful state:
 *
 *   CONNECTED  → everything working (no banner shown)
 *   DEGRADED   → network OK, but live WS feed is down
 *   OFFLINE    → no network at all
 *   RECOVERING → just came back online / WS just reconnected (2 s window)
 *
 * This is the same state machine pattern used in Slack, Figma, and Linear
 * for their connection status indicators.
 */
import { useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "./useNetworkStatus";
import { useWSContext }     from "@/providers/WebSocketProvider";
import { useOfflineSync }   from "@/context/OfflineSyncContext";

export type SystemState = "CONNECTED" | "DEGRADED" | "OFFLINE" | "RECOVERING";

export interface SystemStatus {
  state:       SystemState;
  isOnline:    boolean;
  wsConnected: boolean;
  queueLength: number;
  isSyncing:   boolean;
}

const RECOVERY_WINDOW_MS = 3_000; // how long to show "Recovering" before CONNECTED

export function useSystemStatus(): SystemStatus {
  const isOnline    = useNetworkStatus();
  const { isConnected: wsConnected } = useWSContext();
  const { queueLength, isSyncing }   = useOfflineSync();

  const prevOnline     = useRef(isOnline);
  const prevWS         = useRef(wsConnected);
  const recoveryTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<SystemState>(() => {
    if (!isOnline)   return "OFFLINE";
    if (!wsConnected) return "DEGRADED";
    return "CONNECTED";
  });

  useEffect(() => {
    const wasOffline    = !prevOnline.current  && isOnline;
    const wsReconnected = !prevWS.current      && wsConnected;

    prevOnline.current = isOnline;
    prevWS.current     = wsConnected;

    // Clear any pending recovery timer
    if (recoveryTimer.current) {
      clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
    }

    if (!isOnline) {
      setState("OFFLINE");
      return;
    }

    if (wasOffline || wsReconnected) {
      // Just came back — show recovery briefly
      setState("RECOVERING");
      recoveryTimer.current = setTimeout(() => {
        setState(wsConnected ? "CONNECTED" : "DEGRADED");
      }, RECOVERY_WINDOW_MS);
      return;
    }

    if (!wsConnected) {
      setState("DEGRADED");
      return;
    }

    setState("CONNECTED");
  }, [isOnline, wsConnected]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
  }, []);

  return { state, isOnline, wsConnected, queueLength, isSyncing };
}
