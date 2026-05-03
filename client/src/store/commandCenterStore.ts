/**
 * commandCenterStore — bidirectional map ↔ panel sync.
 * Uses subscribeWithSelector so components only re-render when their
 * specific slice changes (selectedIncident vs routes are independent).
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type CCIncident = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string;
  severity: string;
  status: string;
  location: string;
  description: string;
  verificationCount: number;
  createdAt: string;
  aiValidationScore?: number | null;
  confirmedBy?: string | null;
};

type CommandCenterState = {
  selectedIncident: CCIncident | null;
  routes: Record<string, [number, number][]>;
  setSelected:  (i: CCIncident | null) => void;
  setRoute:     (incidentId: string, poly: [number, number][]) => void;
  clearRoute:   (incidentId: string) => void;
};

export const useCommandCenter = create<CommandCenterState>()(
  subscribeWithSelector((set) => ({
    selectedIncident: null,
    routes: {},

    setSelected: (i) => set({ selectedIncident: i }),

    setRoute: (incidentId, poly) =>
      set((s) => ({ routes: { ...s.routes, [incidentId]: poly } })),

    clearRoute: (incidentId) =>
      set((s) => {
        const next = { ...s.routes };
        delete next[incidentId];
        return { routes: next };
      }),
  }))
);

// ── Stable selectors (defined outside components) ─────────────────────────────
// Calling these prevents the "new object on every render" anti-pattern.
export const selectSelectedIncident = (s: CommandCenterState) => s.selectedIncident;
export const selectRoutes           = (s: CommandCenterState) => s.routes;
