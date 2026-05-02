import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { User } from "@shared/schema";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        accessToken: typeof window !== "undefined" ? localStorage.getItem("accessToken") : null,

        setUser: (user) =>
          set({ user, isAuthenticated: !!user, isLoading: false }),

        setLoading: (isLoading) => set({ isLoading }),

        setAccessToken: (accessToken) => {
          if (accessToken) {
            localStorage.setItem("accessToken", accessToken);
          } else {
            localStorage.removeItem("accessToken");
          }
          set({ accessToken });
        },

        logout: () => {
          localStorage.removeItem("accessToken");
          set({ user: null, isAuthenticated: false, accessToken: null });
        },
      }),
      {
        name: "crisisconnect-auth",
        partialize: (state) => ({ accessToken: state.accessToken }),
      }
    )
  )
);

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectUserRole = (s: AuthState) => s.user?.role ?? "citizen";
