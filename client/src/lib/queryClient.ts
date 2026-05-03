import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";

// ─── Auth header helper ──────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Response validator ──────────────────────────────────────────────────────

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

// ─── Query function factory ──────────────────────────────────────────────────

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (on401 === "returnNull" && res.status === 401) return null as T;
    await throwIfResNotOk(res);
    return res.json();
  };

// ─── Global error handler ────────────────────────────────────────────────────

function handleGlobalError(error: Error) {
  // 401 → clear token and redirect to login
  if (error.message.startsWith("401:")) {
    localStorage.removeItem("accessToken");
    // Avoid redirect loop on auth endpoints
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return;
  }
  // 403 → optional: show toast (imported lazily to avoid circular deps)
  if (error.message.startsWith("403:")) {
    if (import.meta.env.DEV) console.warn("[API] 403 Forbidden:", error.message);
  }
}

// ─── QueryClient ─────────────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleGlobalError(error as Error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleGlobalError(error as Error),
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      // Crisis data: 30 s stale time — balance freshness vs. request rate
      staleTime: 30_000,
      // Retry up to 3× with exponential back-off — skip auth errors immediately
      retry: (failureCount, error: any) => {
        if (error?.message?.startsWith("401:") || error?.message?.startsWith("403:")) {
          return false; // auth errors are not retriable
        }
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: false,
    },
  },
});
