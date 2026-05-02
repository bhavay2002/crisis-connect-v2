import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface LiveIncident {
  id: string;
  title: string;
  type: string;
  severity: string;
  location: string;
  timestamp: number;
}

interface RealtimeState {
  isConnected: boolean;
  lastPingAt: number | null;
  liveIncidents: LiveIncident[];
  unreadNotificationCount: number;
  activeSOSCount: number;

  setConnected: (connected: boolean) => void;
  ping: () => void;
  pushIncident: (incident: LiveIncident) => void;
  removeIncident: (id: string) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  setActiveSOSCount: (count: number) => void;
}

export const useRealtimeStore = create<RealtimeState>()(
  subscribeWithSelector((set, get) => ({
    isConnected: false,
    lastPingAt: null,
    liveIncidents: [],
    unreadNotificationCount: 0,
    activeSOSCount: 0,

    setConnected: (isConnected) => set({ isConnected }),
    ping: () => set({ lastPingAt: Date.now() }),

    pushIncident: (incident) =>
      set((state) => ({
        liveIncidents: [incident, ...state.liveIncidents].slice(0, 50),
      })),

    removeIncident: (id) =>
      set((state) => ({
        liveIncidents: state.liveIncidents.filter((i) => i.id !== id),
      })),

    setUnreadCount: (unreadNotificationCount) => set({ unreadNotificationCount }),
    incrementUnread: () =>
      set((state) => ({
        unreadNotificationCount: state.unreadNotificationCount + 1,
      })),
    resetUnread: () => set({ unreadNotificationCount: 0 }),
    setActiveSOSCount: (activeSOSCount) => set({ activeSOSCount }),
  }))
);

export const selectIsConnected = (s: RealtimeState) => s.isConnected;
export const selectUnreadCount = (s: RealtimeState) => s.unreadNotificationCount;
export const selectLiveIncidents = (s: RealtimeState) => s.liveIncidents;
