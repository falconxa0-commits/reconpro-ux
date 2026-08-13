/**
 * ReconPro API Security Layer
 *
 * Centralized input validation, rate limiting, and abuse protection
 * for all API routes.
 */

import { NextResponse } from 'next/server';

// ── Domain Validation ──────────────────────────────────────────────

/** Strict domain regex — prevents injection via query params and body */
export const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;

/** IPv4 regex */
export const IPV4_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/** Combined target validation (domain or IP) */
export function isValidTarget(target: string): boolean {
  if (!target || typeof target !== 'string') return false;
  const trimmed = target.trim();
  return DOMAIN_REGEX.test(trimmed) || IPV4_REGEX.test(trimmed);
}

/** Validate and sanitize a domain string */
export function sanitizeDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!DOMAIN_REGEX.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

/** Validate and sanitize a target (domain or IP) */
export function sanitizeTarget(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (DOMAIN_REGEX.test(trimmed)) return trimmed.toLowerCase();
  if (IPV4_REGEX.test(trimmed)) return trimmed;
  return null;
}

// ── SSRF Protection ────────────────────────────────────────────────

/** Block private/reserved/link-local/multicast IP ranges */
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;

  // RFC 1918 private ranges
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  // Loopback
  if (a === 127) return true;

  // Link-local (includes cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true;

  // Documentation/benchmark ranges
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // Multicast
  if (a >= 224 && a <= 239) return true;

  // Reserved
  if (a >= 240) return true;

  // Default unreachable
  if (a === 0) return true;

  return false;
}

/** Domains that must never be scanned (internal infrastructure) */
const BLOCKED_DOMAINS = [
  'localhost', 'internal', 'metadata', 'kube-system',
  'consul', 'vault', 'etcd', 'kubernetes', 'kubernetes.default',
];

/** Check if a domain is blocked */
export function isBlockedDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  // Exact match for single-label blocked names
  if (BLOCKED_DOMAINS.includes(lower)) return true;
  // Block subdomains of blocked names (e.g., metadata.google.internal)
  if (BLOCKED_DOMAINS.some(d => lower.endsWith('.' + d))) return true;
  // Block special-use TLDs
  if (lower.endsWith('.local')) return true;
  if (lower.endsWith('.internal')) return true;
  if (lower.endsWith('.localhost')) return true;
  if (lower.endsWith('.onion')) return true;
  return false;
}

// ── Rate Limiting ──────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check and increment rate limit for a given key.
 * Returns true if the request should be allowed, false if rate limited.
 *
 * @param key - Unique identifier (e.g., IP address, API key)
 * @param maxRequests - Maximum requests in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entry
  if (entry && entry.resetAt <= now) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count++;
  return { allowed: true, remaining: maxRequests - current.count, resetAt: current.resetAt };
}

/** Periodically clean up expired rate limit entries (call from setInterval) */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Start cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
  const interval = (globalThis as Record<string, unknown>).__reconpro_rate_cleanup as ReturnType<typeof setInterval> | undefined;
  if (interval) clearInterval(interval);
  (globalThis as Record<string, unknown>).__reconpro_rate_cleanup = setInterval(cleanupRateLimits, 300_000);
}

// ── Request Size Validation ─────────────────────────────────────────

const MAX_JSON_SIZE = 1_000_000; // 1MB

/** Validate JSON request body size and structure */
export async function parseValidatedBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number = MAX_JSON_SIZE
): Promise<{ body: T; error: Response | null }> {
  // Check Content-Length header if available
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      body: {} as T,
      error: new Response(JSON.stringify({ error: 'Request body too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  try {
    const body = await request.json() as T;
    return { body, error: null };
  } catch {
    return {
      body: {} as T,
      error: new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
}

// ── Safe Error Response ─────────────────────────────────────────────

/**
 * Create a safe error response that does not leak internal details.
 * In development, includes more detail for debugging.
 */
export function safeErrorResponse(
  error: unknown,
  status: number = 500,
  context: string = 'api'
): Response {
  const isDev = process.env.NODE_ENV !== 'production';

  // Log the full error internally
  console.error(`[${context}]`, error);

  // Return a safe message to the client
  const message = isDev && error instanceof Error
    ? error.message
    : 'An internal error occurred';

  const detail = isDev && error instanceof Error
    ? error.stack
    : undefined;

  return new Response(
    JSON.stringify({
      error: message,
      ...(detail ? { detail } : {}),
      requestId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ── Defense-in-Depth Headers ──────────────────────────────────────────

/**
 * Apply security headers directly to a NextResponse as defense-in-depth.
 * These supplement the middleware headers — if middleware is somehow bypassed,
 * the route handler still provides basic security headers.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}
