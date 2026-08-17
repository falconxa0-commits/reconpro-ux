"use client";

import { useMemo } from "react";

/**
 * Returns the x-api-key header value stored during login.
 * The raw API key is stored in localStorage by the login flow.
 * All dashboard API calls must include this header for authenticated endpoints.
 */
export function useApiKey(): string | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("reconpro_api_key");
    } catch {
      return null;
    }
  }, []);
}

/**
 * Returns headers object with x-api-key for authenticated API calls.
 * Returns an empty object (no headers) when no key is stored.
 */
export function useAuthHeaders(): Record<string, string> {
  const apiKey = useApiKey();
  return useMemo((): Record<string, string> => {
    if (!apiKey) return {};
    return { "x-api-key": apiKey };
  }, [apiKey]);
}
