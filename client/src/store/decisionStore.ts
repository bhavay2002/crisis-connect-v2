import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface RecommendedAction {
  id: string;
  label: string;
  type: "primary" | "secondary" | "danger";
  confidence: number;
  url: string;
}

export interface ActiveDecision {
  incidentId: string;
  title: string;
  type: string;
  severity: number;
  priority: "CRITICAL" | "HIGH";
  location: string;
  status: string;
  recommendedActions: RecommendedAction[];
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  message: string;
  subtext?: string;
  type: "new_report" | "report_updated" | "sos_alert" | "broadcast" | "notification" | "system";
  severity?: string;
  timestamp: number;
  url?: string;
}

interface DecisionState {
  activeDecision: ActiveDecision | null;
  eventLog: TimelineEvent[];
  newReportIds: Set<string>;

  setDecision: (decision: ActiveDecision | null) => void;
  clearDecision: () => void;
  pushEvent: (event: Omit<TimelineEvent, "id">) => void;
  markReportNew: (reportId: string) => void;
  unmarkReportNew: (reportId: string) => void;
}

export const useDecisionStore = create<DecisionState>()(
  subscribeWithSelector((set) => ({
    activeDecision: null,
    eventLog: [],
    newReportIds: new Set<string>(),

    setDecision: (activeDecision) => set({ activeDecision }),
    clearDecision: () => set({ activeDecision: null }),

    pushEvent: (event) =>
      set((state) => ({
        eventLog: [
          { ...event, id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
          ...state.eventLog,
        ].slice(0, 40),
      })),

    markReportNew: (reportId) =>
      set((state) => {
        const next = new Set(state.newReportIds);
        next.add(reportId);
        return { newReportIds: next };
      }),

    unmarkReportNew: (reportId) =>
      set((state) => {
        const next = new Set(state.newReportIds);
        next.delete(reportId);
        return { newReportIds: next };
      }),
  }))
);

export const selectActiveDecision = (s: DecisionState) => s.activeDecision;
export const selectEventLog = (s: DecisionState) => s.eventLog;
export const selectNewReportIds = (s: DecisionState) => s.newReportIds;
