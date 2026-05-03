/**
 * useCrisisRealtime — subscribes to WebSocket events and keeps the crisis
 * feature state fresh. Encapsulates all WS business logic so components
 * remain pure UI.
 */
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { useDecisionStore } from "@/store/decisionStore";
import type { CrisisEvent } from "../types/crisis.types";

export interface UseCrisisRealtimeOptions {
  /** Called when a new report arrives via WS */
  onNewReport?: (data: any) => void;
  /** Called when any SOS alert fires */
  onSOSAlert?: (data: any) => void;
}

export function useCrisisRealtime(options: UseCrisisRealtimeOptions = {}) {
  const queryClient = useQueryClient();

  const handler = useCallback(
    (msg: any) => {
      const ds = useDecisionStore.getState();

      switch (msg.type) {
        case "new_report":
          queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
          queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
          if (msg.data?.id) {
            ds.markReportNew(msg.data.id);
            setTimeout(() => ds.unmarkReportNew(msg.data.id), 4000);
          }
          options.onNewReport?.(msg.data);
          break;

        case "report_updated":
        case "report_verified":
          queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
          break;

        case "sos_alert":
        case "SOS_ACTIVATED":
          queryClient.invalidateQueries({ queryKey: ["/api/sos"] });
          queryClient.invalidateQueries({ queryKey: ["/api/decisions/active"] });
          options.onSOSAlert?.(msg.data);
          break;
      }
    },
    [queryClient, options]
  );

  useRealtimeMessage(handler);
}
