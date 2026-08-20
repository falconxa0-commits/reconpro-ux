"use client";

import { useState, useEffect, useMemo } from "react";

/**
 * Returns the x-api-key header value stored during login.
 * Only returns the key if it looks like a full key (not a truncated stub).
 * Truncated stubs (ending with "...") are filtered out because they
 * would cause API key auth to fail and block the session-cookie fallback.
 */
export function useApiKey(): string | null {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("reconpro_api_key");
      if (!raw || raw.endsWith("...")) return null;
      return raw;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "reconpro_api_key") {
        const raw = e.newValue;
        if (!raw || raw.endsWith("...")) {
          setApiKey(null);
        } else {
          setApiKey(raw);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return apiKey;
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
