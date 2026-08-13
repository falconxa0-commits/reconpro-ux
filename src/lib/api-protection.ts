/**
 * Centralized API route protection middleware.
 * Provides authentication, rate limiting, and request validation for all API routes.
 *
 * Usage in any API route handler:
 * ```ts
 * import { withProtection } from '@/lib/api-protection';
 * 
 * export async function POST(request: NextRequest) {
 *   const { error, clientIp } = await withProtection(request, {
 *     requireAuth: true,
 *     rateLimit: { maxRequests: 10, windowMs: 60_000 },
 *   });
 *   if (error) return error;
 *   // ... proceed with route logic
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { checkRateLimit, parseValidatedBody, sanitizeDomain, isPrivateIP } from './api-security';

// ── Configuration ──────────────────────────────────────────────

const API_KEY_HEADER = 'x-api-key';
const AUTHORIZATION_HEADER = 'authorization';

interface ProtectionOptions {
  /** Whether authentication is required (default: false for demo/public endpoints) */
  requireAuth?: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    maxRequests?: number;
    windowMs?: number;
    /** Use IP-based key instead of domain-based (default: true) */
    keyByIP?: boolean;
  };
  /** Validate domain input from request body */
  validateDomainFromBody?: boolean;
  /** Maximum request body size */
  maxBodySize?: number;
}

interface ProtectionResult {
  error: NextResponse | null;
  clientIp: string;
  domain?: string | null;
}

/**
 * Extract client IP from request headers.
 * Handles standard proxy headers with spoofing resistance.
 *
 * v2: Trusts only the last non-private IP in x-forwarded-for chain
 * (closest to the app) to prevent IP spoofing bypass.
 */
export function extractClientIP(request: NextRequest): string {
  // Priority: CF-Connecting-IP > True-Client-IP > X-Real-IP > X-Forwarded-For (last non-private)
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP.trim();

  const trueClientIP = request.headers.get('true-client-ip');
  if (trueClientIP) return trueClientIP.trim();

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  // X-Forwarded-For: client, proxy1, proxy2
  // The rightmost non-private IP is closest to our infrastructure
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map(s => s.trim()).filter(Boolean);
    // Walk from right to left, find first non-private IP
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i];
      // Basic IP format check
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip)) {
        // If it's a known private range, skip (likely a proxy)
        if (isPrivateIP(ip)) continue;
        return ip;
      }
    }
    // If all are private, return the last one (closest proxy)
    return ips[ips.length - 1] || 'unknown';
  }

  // Fallback to connection remote address (may not be available in Next.js)
  return 'unknown';
}

/**
 * Centralized protection middleware for API routes.
 * Validates authentication, rate limiting, and input.
 */
export async function withProtection(
  request: NextRequest,
  options: ProtectionOptions = {}
): Promise<ProtectionResult> {
  const {
    requireAuth = false,
    rateLimit: rateLimitOpts,
    validateDomainFromBody = false,
    maxBodySize,
  } = options;

  const clientIp = extractClientIP(request);

  // ── 1. Rate Limiting ─────────────────────────────────────────────
  if (rateLimitOpts) {
    const key = rateLimitOpts.keyByIP !== false ? `ip:${clientIp}` : `global`;
    const result = checkRateLimit(
      key,
      rateLimitOpts.maxRequests ?? 30,
      rateLimitOpts.windowMs ?? 60_000
    );

    if (!result.allowed) {
      return {
        error: NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
            },
          }
        ),
        clientIp,
      };
    }
  }

  // ── 2. Authentication ──────────────────────────────────────────
  if (requireAuth) {
    const apiKey = request.headers.get(API_KEY_HEADER);
    const authHeader = request.headers.get(AUTHORIZATION_HEADER);

    if (!apiKey && !authHeader?.startsWith('Bearer ')) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required. Provide X-API-Key header or Bearer token.' },
          { status: 401 }
        ),
        clientIp,
      };
    }

    // Verify the full API key by comparing its SHA-256 hash against the stored keyHash.
    // The keyPrefix field is used ONLY for display/identification, never for auth.
    if (apiKey) {
      try {
        const { db } = await import('@/lib/db');

        // Hash the provided key with SHA-256
        const sha256 = createHash('sha256');
        sha256.update(apiKey);
        const hashHex = sha256.digest('hex');

        // Look up by exact hash (keyHash is @unique in the schema)
        const keyRecord = await db.apiKey.findUnique({
          where: { keyHash: hashHex },
        });

        if (!keyRecord || !keyRecord.isActive) {
          return {
            error: NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 }),
            clientIp,
          };
        }

        // Check expiry
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
          return {
            error: NextResponse.json({ error: 'API key has expired' }, { status: 401 }),
            clientIp,
          };
        }

        // Update usage
        await db.apiKey.update({
          where: { id: keyRecord.id },
          data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
        });
      } catch {
        // DB error — allow in development, block in production
        if (process.env.NODE_ENV === 'production') {
          return {
            error: NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 }),
            clientIp,
          };
        }
      }
    }
  }

  // ── 3. Domain Validation ─────────────────────────────────────────
  if (validateDomainFromBody) {
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.json().catch(() => null);
        if (body?.domain) {
          const sanitized = sanitizeDomain(body.domain);
          if (!sanitized) {
            return {
              error: NextResponse.json(
                { error: 'Invalid domain format. Must be a public FQDN.' },
                { status: 400 }
              ),
              clientIp,
            };
          }
          return { error: null, clientIp, domain: sanitized };
        }
      }
    } catch {
      // JSON parsing failed — will be handled by route
    }
  }

  // ── 4. Request Size Validation ────────────────────────────────────
  if (maxBodySize) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
      return {
        error: NextResponse.json({ error: 'Request body too large' }, { status: 413 }),
        clientIp,
      };
    }
  }

  return { error: null, clientIp };
}

/**
 * Create a safe error response that doesn't leak internals.
 */
export function safeError(message: string, status = 500): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production';
  return NextResponse.json(
    {
      error: isDev ? message : 'An internal error occurred',
      ...(isDev ? {} : { requestId: crypto.randomUUID() }),
    },
    { status }
  );
}
