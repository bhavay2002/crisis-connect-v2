import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@shared/schema";

/**
 * Primary auth hook.
 * - Fetches current user from /api/auth/me
 * - Syncs result into Zustand authStore so any component can read it
 *   without issuing additional network requests.
 */
export function useAuth() {
  const { setUser, setLoading, user, isAuthenticated, isLoading } = useAuthStore();

  const { data, isLoading: queryLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 60_000,
  });

  // Keep Zustand store in sync with React Query result
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  useEffect(() => {
    if (!queryLoading) {
      setUser(data ?? null);
    }
  }, [data, queryLoading, setUser]);

  return {
    user: user ?? data ?? undefined,
    isLoading: isLoading || queryLoading,
    isAuthenticated,
  };
}
