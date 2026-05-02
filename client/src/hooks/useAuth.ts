import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@shared/schema";

/**
 * Primary auth hook.
 * - Fetches current user from /api/auth/me via React Query
 * - Syncs into Zustand via stable selectors (avoids over-subscription)
 *
 * Uses fine-grained selectors so only the exact slice of state that
 * each consumer cares about triggers a re-render.
 */

// Stable selectors — defined outside the hook so they never change identity
const selectUser          = (s: any) => s.user;
const selectIsAuth        = (s: any) => s.isAuthenticated;
const selectIsLoading     = (s: any) => s.isLoading;
const selectSetUser       = (s: any) => s.setUser;
const selectSetLoading    = (s: any) => s.setLoading;

export function useAuth() {
  const user           = useAuthStore(selectUser);
  const isAuthenticated= useAuthStore(selectIsAuth);
  const isLoading      = useAuthStore(selectIsLoading);
  const setUser        = useAuthStore(selectSetUser);
  const setLoading     = useAuthStore(selectSetLoading);

  const { data, isLoading: queryLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 60_000,
  });

  // Single combined effect — avoids two separate setState calls per cycle
  useEffect(() => {
    setLoading(queryLoading);
    if (!queryLoading) {
      setUser(data ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, queryLoading]);

  return {
    user: user ?? data ?? undefined,
    isLoading: isLoading || queryLoading,
    isAuthenticated,
  };
}
