/**
 * Shared API client — thin typed wrapper over the core fetch helper.
 * All feature service files import from here, never from lib/queryClient directly.
 */
import { apiRequest } from "@/lib/queryClient";

export type ApiOptions = RequestInit;

export const api = {
  get:    <T = any>(url: string, opts?: ApiOptions) =>
    apiRequest<T>(url, { method: "GET",    ...opts }),

  post:   <T = any>(url: string, body?: unknown, opts?: ApiOptions) =>
    apiRequest<T>(url, { method: "POST",   body: JSON.stringify(body),   ...opts }),

  patch:  <T = any>(url: string, body?: unknown, opts?: ApiOptions) =>
    apiRequest<T>(url, { method: "PATCH",  body: JSON.stringify(body),   ...opts }),

  put:    <T = any>(url: string, body?: unknown, opts?: ApiOptions) =>
    apiRequest<T>(url, { method: "PUT",    body: JSON.stringify(body),   ...opts }),

  delete: <T = any>(url: string, opts?: ApiOptions) =>
    apiRequest<T>(url, { method: "DELETE", ...opts }),
};
