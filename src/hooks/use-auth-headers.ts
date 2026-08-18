"use client";

import { useMemo } from "react";

/**
 * Returns the x-api-key header value stored during login.
 * Only returns the key if it looks like a full key (not a truncated stub).
 * Truncated stubs (ending with "...") are filtered out because they
 * would cause API key auth to fail and block the session-cookie fallback.
 */
export function useApiKey(): string | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("reconpro_api_key");
      // Reject truncated stubs — they cause api-protection.ts to attempt
      // API-key auth (which fails) instead of falling through to session-cookie auth
      if (!raw || raw.endsWith("...")) return null;
      return raw;
    } catch {
      return null;
    }
  }, []);
}

/**
 * Returns headers object with x-api-key for authenticated API calls.
 * Returns an empty object (no headers) when no valid key is stored,
 * allowing the session-cookie fallback in api-protection.ts to work.
 */
export function useAuthHeaders(): Record<string, string> {
  const apiKey = useApiKey();
  return useMemo((): Record<string, string> => {
    if (!apiKey) return {};
    return { "x-api-key": apiKey };
  }, [apiKey]);
}
