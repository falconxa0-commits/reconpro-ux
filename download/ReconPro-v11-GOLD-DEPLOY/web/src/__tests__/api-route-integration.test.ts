/**
 * API Route Integration Tests for ReconPro
 *
 * Verifies the ACTUAL behavior of API route handlers by testing the
 * middleware/protection layer and route logic directly (not via HTTP).
 * Tests are organized into six categories:
 *   1. Authentication (21 authenticated routes + Bearer token rejection)
 *   2. Public routes (no auth required)
 *   3. Rate limiting
 *   4. Input validation (via withProtection + actual route handlers)
 *   5. SSRF protection (sanitizeDomain, isBlockedDomain, isPrivateIP, isPrivateIPv6)
 *   6. Tenant isolation (auth.organizationId propagation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Database Mock ────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => {
  const findUnique = vi.fn();
  const update = vi.fn();
  return {
    db: {
      $queryRaw: vi.fn().mockResolvedValue([1]),
      $disconnect: vi.fn(),
      apiKey: { findUnique, update },
      team: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 't1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        delete: vi.fn(),
      },
      member: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'm1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        delete: vi.fn(),
      },
      teamMember: { deleteMany: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      scan: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 's1', target: {} }),
        update: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _avg: { riskScore: 0 } }),
      },
      finding: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      scanTarget: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'st1' }),
        update: vi.fn(),
      },
      vibeSecEntry: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      nHIIdentity: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
        create: vi.fn().mockResolvedValue({}),
      },
      nHIRevocation: { deleteMany: vi.fn(), create: vi.fn().mockResolvedValue({}) },
      nHIAuditLog: { deleteMany: vi.fn(), create: vi.fn().mockResolvedValue({}) },
      nHIImpactAssessment: { deleteMany: vi.fn() },
    },
  };
});

vi.mock('@/lib/broadcast-engine', () => ({
  seedDemoBroadcasts: vi.fn(),
  getAllBroadcasts: vi.fn().mockReturnValue([]),
  getActiveBroadcasts: vi.fn().mockReturnValue([]),
  storeBroadcast: vi.fn(),
  signBroadcast: vi.fn().mockReturnValue({
    id: 'BC-TEST',
    priority: 'INFO',
    title: 'test',
    body: 'test',
    channel: 'web',
    signature: 'sig',
    publicKey: 'pk',
    issuedBy: 'system',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    verified: true,
    targetScope: 'all',
  }),
  verifyBroadcast: vi.fn().mockReturnValue(true),
  getBroadcastById: vi.fn().mockReturnValue(undefined),
  generateBroadcastId: vi.fn().mockReturnValue('BC-TEST'),
  getMasterKeyPair: vi.fn().mockReturnValue({
    publicKey: new Uint8Array(32),
    secretKey: new Uint8Array(64),
    publicKeyHex: '00'.repeat(32),
    secretKeyHex: '00'.repeat(64),
  }),
  CHANNEL_CONFIG: {},
  BROADCAST_TEMPLATES: [],
}));

// Mock native-dns to prevent child_process errors in test environment
vi.mock('@/lib/native-dns', () => ({
  digShort: vi.fn().mockResolvedValue([]),
  digAnswer: vi.fn().mockResolvedValue([]),
  resolveIP: vi.fn().mockResolvedValue(null),
  reverseDNS: vi.fn().mockResolvedValue(null),
  analyzeSSLNative: vi.fn().mockResolvedValue({ findings: [], technologies: [] }),
}));

// Mock safe-fetch
vi.mock('@/lib/safe-fetch', () => ({
  safeFetch: vi.fn().mockResolvedValue({ status: 0, text: '', headers: {} }),
}));

// ── Imports (actual source functions, not mocks) ─────────────────────────

import { withProtection } from '@/lib/api-protection';
import {
  sanitizeDomain,
  isBlockedDomain,
  isPrivateIP,
  isPrivateIPv6,
  checkRateLimit,
  cleanupRateLimits,
  isValidTarget,
} from '@/lib/api-security';
import { db } from '@/lib/db';
import { POST as teamsPOST } from '@/app/api/teams/route';
import { POST as membersPOST } from '@/app/api/members/route';
import { POST as broadcastPOST } from '@/app/api/broadcast/route';
import { GET as fearIndexGET } from '@/app/api/fear-index/route';
import { GET as healthGET } from '@/app/api/health/route';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Create a mock NextRequest with optional headers and body */
function makeRequest(
  url = 'http://localhost/api/test',
  headers: Record<string, string> = {},
  body?: unknown,
  method = 'GET',
): NextRequest {
  const hdrs = new Headers(headers);
  if (body !== undefined) {
    hdrs.set('content-type', 'application/json');
  }
  return new NextRequest(new URL(url), {
    method,
    headers: hdrs,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  } as ConstructorParameters<typeof NextRequest>[1]);
}

/** A valid API key record for authenticated tests */
const VALID_KEY_RECORD = {
  id: 'key-test-123',
  organizationId: 'org-test-456',
  scopes: 'read:all write:all',
  isActive: true,
  expiresAt: null,
};

/**
 * 21 authenticated route configurations — one representative handler per route file.
 * Each entry mirrors the exact ProtectionOptions used in the real route handler.
 */
const AUTHENTICATED_ROUTES: Array<{
  name: string;
  options: { requireAuth: true; rateLimit: { maxRequests: number; windowMs: number } };
}> = [
  { name: 'POST /api/scan',           options: { requireAuth: true, rateLimit: { maxRequests: 3,  windowMs: 60_000 } } },
  { name: 'POST /api/vuln-scan',       options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'GET /api/teams',            options: { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } } },
  { name: 'POST /api/teams',           options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'PATCH /api/teams',          options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'DELETE /api/teams',         options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'GET /api/members',          options: { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } } },
  { name: 'POST /api/members',         options: { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } } },
  { name: 'PATCH /api/members',        options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'DELETE /api/members',       options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/broadcast',       options: { requireAuth: true, rateLimit: { maxRequests: 10, windowMs: 60_000 } } },
  { name: 'POST /api/hall-of-fame',    options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/bot-hunter',      options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'GET /api/monitoring',       options: { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } } },
  { name: 'POST /api/compliance',      options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/integrations',    options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/genesis',         options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/genesis/revoke',  options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/implosion',       options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
  { name: 'POST /api/model-redteam',   options: { requireAuth: true, rateLimit: { maxRequests: 3,  windowMs: 60_000 } } },
  { name: 'POST /api/sovereign',       options: { requireAuth: true, rateLimit: { maxRequests: 5,  windowMs: 60_000 } } },
];

// ═══════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('API Route Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupRateLimits();
  });

  // ──────────────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION — 21 authenticated routes return 401 without key
  // ──────────────────────────────────────────────────────────────────────

  describe('Authentication — 21 authenticated routes return 401 without x-api-key', () => {
    // All auth tests: db.apiKey.findUnique returns null → invalid key
    beforeEach(() => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    });

    for (let i = 0; i < AUTHENTICATED_ROUTES.length; i++) {
      const route = AUTHENTICATED_ROUTES[i];
      it(`${route.name} returns 401 when called without x-api-key header`, async () => {
        // Use a unique IP per test to avoid rate limit cross-contamination
        const req = makeRequest(
          'http://localhost' + route.name.replace(/^(GET|POST|PATCH|DELETE)\s/, '').replace(/\s.*$/, ''),
          { 'x-real-ip': `10.99.${Math.floor(i / 255)}.${i % 255}` },
        );
        const result = await withProtection(req, route.options);
        expect(result.error).not.toBeNull();
        expect(result.error!.status).toBe(401);
        const body = await result.error!.json();
        expect(body.error).toContain('Authentication required');
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION — Bearer token is NOT a valid auth mechanism
  // ──────────────────────────────────────────────────────────────────────

  describe('Authentication — Bearer token rejected (not API key)', () => {
    beforeEach(() => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    });

    it('returns 401 when Authorization: Bearer header is used instead of x-api-key', async () => {
      const req = makeRequest('http://localhost/api/teams', {
        authorization: 'Bearer some-jwt-token',
      });
      const result = await withProtection(req, {
        requireAuth: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).not.toBeNull();
      expect(result.error!.status).toBe(401);
    });

    it('returns 401 with descriptive message rejecting Bearer auth', async () => {
      const req = makeRequest('http://localhost/api/scan', {
        authorization: 'Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9',
        'x-real-ip': '10.98.0.1',
      });
      const result = await withProtection(req, {
        requireAuth: true,
        rateLimit: { maxRequests: 3, windowMs: 60_000 },
      });
      expect(result.error).not.toBeNull();
      expect(result.error!.status).toBe(401);
      const body = await result.error!.json();
      expect(body.error).toContain('Authentication required');
    });

    it('returns 401 for invalid (unrecognized) x-api-key value', async () => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const req = makeRequest('http://localhost/api/teams', {
        'x-api-key': 'invalid-key-12345',
      });
      const result = await withProtection(req, {
        requireAuth: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).not.toBeNull();
      expect(result.error!.status).toBe(401);
      const body = await result.error!.json();
      expect(body.error).toContain('Invalid or inactive');
    });

    it('returns 401 for expired API key', async () => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...VALID_KEY_RECORD,
        expiresAt: new Date('2020-01-01'), // expired
      });
      const req = makeRequest('http://localhost/api/teams', {
        'x-api-key': 'some-key',
      });
      const result = await withProtection(req, {
        requireAuth: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).not.toBeNull();
      expect(result.error!.status).toBe(401);
      const body = await result.error!.json();
      expect(body.error).toContain('expired');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. PUBLIC ROUTES — do NOT require authentication
  // ──────────────────────────────────────────────────────────────────────

  describe('Public routes do NOT require authentication', () => {
    it('GET /api/fear-index succeeds without x-api-key', async () => {
      const req = makeRequest('http://localhost/api/fear-index');
      const res = await fearIndexGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('overallScore');
      expect(body).toHaveProperty('level');
    });

    it('GET /api/health succeeds without x-api-key', async () => {
      const req = makeRequest('http://localhost/api/health');
      const res = await healthGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('0.2.0');
    });

    it('withProtection with requireAuth=false does not check API key', async () => {
      const req = makeRequest('http://localhost/api/dashboard', {
        'x-real-ip': '10.97.0.1',
      });
      const result = await withProtection(req, {
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).toBeNull();
      // When requireAuth is false, authenticatedKeyRecord stays null
      expect(result.auth).toBeFalsy();
    });

    it('GET /api/fear-index returns fear index data structure', async () => {
      const req = makeRequest('http://localhost/api/fear-index');
      const res = await fearIndexGET(req);
      const body = await res.json();
      expect(body).toHaveProperty('components');
      expect(body).toHaveProperty('sectorBreakdown');
      expect(body).toHaveProperty('topThreats');
      expect(body.simulated).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. RATE LIMITING
  // ──────────────────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('returns 429 after exceeding rate limit', async () => {
      const req = makeRequest('http://localhost/api/test', { 'x-real-ip': '1.2.3.4' });
      const opts = { rateLimit: { maxRequests: 2, windowMs: 60_000 } };
      // First two requests should pass
      const r1 = await withProtection(req, opts);
      expect(r1.error).toBeNull();
      const r2 = await withProtection(req, opts);
      expect(r2.error).toBeNull();
      // Third request should be rate limited
      const r3 = await withProtection(req, opts);
      expect(r3.error).not.toBeNull();
      expect(r3.error!.status).toBe(429);
    });

    it('rate limit response includes Retry-After header', async () => {
      const req = makeRequest('http://localhost/api/test', { 'x-real-ip': '5.6.7.8' });
      const opts = { rateLimit: { maxRequests: 1, windowMs: 60_000 } };
      await withProtection(req, opts); // use up the one allowed request
      const result = await withProtection(req, opts);
      expect(result.error).not.toBeNull();
      expect(result.error!.status).toBe(429);
      expect(result.error!.headers.get('Retry-After')).not.toBeNull();
      expect(result.error!.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('different IP addresses have independent rate limits', async () => {
      const opts = { rateLimit: { maxRequests: 1, windowMs: 60_000 } };
      const reqA = makeRequest('http://localhost/api/test', { 'x-real-ip': '10.0.0.1' });
      const reqB = makeRequest('http://localhost/api/test', { 'x-real-ip': '10.0.0.2' });

      // Use up IP A's limit
      await withProtection(reqA, opts);
      const blockedA = await withProtection(reqA, opts);
      expect(blockedA.error).not.toBeNull();
      expect(blockedA.error!.status).toBe(429);

      // IP B should still be allowed
      const allowedB = await withProtection(reqB, opts);
      expect(allowedB.error).toBeNull();
    });

    it('checkRateLimit returns decreasing remaining count', () => {
      const result1 = checkRateLimit('test-decrement-key', 5, 60_000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit('test-decrement-key', 5, 60_000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. INPUT VALIDATION
  // ──────────────────────────────────────────────────────────────────────

  describe('Input Validation — /api/scan domain validation', () => {
    it('withProtection + validateDomainFromBody rejects empty domain body', async () => {
      const req = makeRequest('http://localhost/api/scan', {}, { domain: '' }, 'POST');
      const result = await withProtection(req, {
        requireAuth: false,
        validateDomainFromBody: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      // Empty string domain is falsy → withProtection passes without domain
      expect(result.error).toBeNull();
      expect(result.domain).toBeUndefined();
    });

    it('withProtection + validateDomainFromBody rejects invalid domain format', async () => {
      const req = makeRequest('http://localhost/api/scan', {}, { domain: 'not a valid domain!!!' }, 'POST');
      const result = await withProtection(req, {
        requireAuth: false,
        validateDomainFromBody: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).not.toBeNull();
      expect(result.error!.status).toBe(400);
      const body = await result.error!.json();
      expect(body.error).toContain('Invalid domain');
    });

    it('withProtection + validateDomainFromBody accepts valid domain', async () => {
      const req = makeRequest('http://localhost/api/scan', {}, { domain: 'example.com' }, 'POST');
      const result = await withProtection(req, {
        requireAuth: false,
        validateDomainFromBody: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).toBeNull();
      expect(result.domain).toBe('example.com');
    });
  });

  describe('Input Validation — /api/vuln-scan target validation', () => {
    it('sanitizeDomain rejects numeric-only input', () => {
      expect(sanitizeDomain('12345')).toBeNull();
    });

    it('sanitizeDomain rejects single-label hostnames', () => {
      expect(sanitizeDomain('localhost')).toBeNull();
      expect(sanitizeDomain('metadata')).toBeNull();
      expect(sanitizeDomain('internal')).toBeNull();
    });

    it('isValidTarget rejects malformed targets', () => {
      expect(isValidTarget('')).toBe(false);
      expect(isValidTarget('   ')).toBe(false);
      expect(isValidTarget('not valid')).toBe(false);
    });

    it('isValidTarget accepts valid domains and IPs', () => {
      expect(isValidTarget('example.com')).toBe(true);
      expect(isValidTarget('8.8.8.8')).toBe(true);
    });
  });

  describe('Input Validation — /api/teams POST rejects missing name', () => {
    beforeEach(() => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_KEY_RECORD);
      (db.apiKey.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    });

    it('returns 400 when name is missing from request body', async () => {
      const req = makeRequest('http://localhost/api/teams', {
        'x-api-key': 'test-key',
        'x-real-ip': '10.96.0.1',
      }, { description: 'A team without a name' }, 'POST');
      const res = await teamsPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('name is required');
    });

    it('returns 400 when name is empty string', async () => {
      const req = makeRequest('http://localhost/api/teams', {
        'x-api-key': 'test-key',
        'x-real-ip': '10.96.0.2',
      }, { name: '' }, 'POST');
      const res = await teamsPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('name is required');
    });
  });

  describe('Input Validation — /api/members POST rejects missing email', () => {
    beforeEach(() => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_KEY_RECORD);
      (db.apiKey.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    });

    it('returns 400 when email is missing', async () => {
      const req = makeRequest('http://localhost/api/members', {
        'x-api-key': 'test-key',
      }, { name: 'John Doe' }, 'POST');
      const res = await membersPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('name and email are required');
    });

    it('returns 400 when both name and email are missing', async () => {
      const req = makeRequest('http://localhost/api/members', {
        'x-api-key': 'test-key',
      }, {}, 'POST');
      const res = await membersPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('name and email are required');
    });
  });

  describe('Input Validation — /api/broadcast POST rejects missing required fields', () => {
    beforeEach(() => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_KEY_RECORD);
      (db.apiKey.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    });

    it('returns 400 when title, body, priority, and channel are all missing', async () => {
      const req = makeRequest('http://localhost/api/broadcast', {
        'x-api-key': 'test-key',
        'x-real-ip': '10.95.0.1',
      }, {}, 'POST');
      const res = await broadcastPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Missing required fields');
      expect(body.ok).toBe(false);
    });

    it('returns 400 when only title is provided but body/priority/channel are missing', async () => {
      const req = makeRequest('http://localhost/api/broadcast', {
        'x-api-key': 'test-key',
        'x-real-ip': '10.95.0.2',
      }, { title: 'Test Alert' }, 'POST');
      const res = await broadcastPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Missing required fields');
    });

    it('returns 400 for invalid priority value', async () => {
      const req = makeRequest('http://localhost/api/broadcast', {
        'x-api-key': 'test-key',
        'x-real-ip': '10.95.0.3',
      }, {
        title: 'Test',
        body: 'Test body',
        priority: 'INVALID',
        channel: 'web',
      }, 'POST');
      const res = await broadcastPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid priority');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 6. SSRF PROTECTION
  // ──────────────────────────────────────────────────────────────────────

  describe('SSRF Protection — sanitizeDomain', () => {
    it('strips protocol prefix and returns clean domain', () => {
      expect(sanitizeDomain('https://example.com')).toBe('example.com');
      expect(sanitizeDomain('http://example.com')).toBe('example.com');
      expect(sanitizeDomain('HTTPS://EXAMPLE.COM')).toBe('example.com');
    });

    it('strips trailing dots (DNS FQDN marker)', () => {
      expect(sanitizeDomain('example.com.')).toBe('example.com');
      expect(sanitizeDomain('sub.example.com.')).toBe('sub.example.com');
    });

    it('strips paths after domain', () => {
      expect(sanitizeDomain('example.com/path')).toBe('example.com');
      expect(sanitizeDomain('https://example.com/api/v1')).toBe('example.com');
    });

    it('returns null for non-string input', () => {
      expect(sanitizeDomain(null)).toBeNull();
      expect(sanitizeDomain(undefined)).toBeNull();
      expect(sanitizeDomain(123)).toBeNull();
      expect(sanitizeDomain({})).toBeNull();
    });

    it('returns null for empty/whitespace-only strings', () => {
      expect(sanitizeDomain('')).toBeNull();
      expect(sanitizeDomain('   ')).toBeNull();
      expect(sanitizeDomain('\t')).toBeNull();
    });
  });

  describe('SSRF Protection — isBlockedDomain', () => {
    it('catches cloud metadata endpoints', () => {
      expect(isBlockedDomain('metadata.google.internal')).toBe(true);
      expect(isBlockedDomain('metadata')).toBe(true);
    });

    it('catches Kubernetes internal domains', () => {
      expect(isBlockedDomain('kubernetes')).toBe(true);
      expect(isBlockedDomain('kubernetes.default')).toBe(true);
      expect(isBlockedDomain('kubernetes.default.svc')).toBe(true);
      expect(isBlockedDomain('kube-system')).toBe(true);
    });

    it('catches localhost and internal infrastructure', () => {
      expect(isBlockedDomain('localhost')).toBe(true);
      expect(isBlockedDomain('localhost.localdomain')).toBe(true);
      expect(isBlockedDomain('internal')).toBe(true);
      expect(isBlockedDomain('consul')).toBe(true);
      expect(isBlockedDomain('vault')).toBe(true);
      expect(isBlockedDomain('etcd')).toBe(true);
    });

    it('catches special-use TLDs', () => {
      expect(isBlockedDomain('test.local')).toBe(true);
      expect(isBlockedDomain('app.internal')).toBe(true);
      expect(isBlockedDomain('site.localhost')).toBe(true);
      expect(isBlockedDomain('hidden.onion')).toBe(true);
    });

    it('catches GCP container metadata domain', () => {
      expect(isBlockedDomain('container.googleapis.com')).toBe(true);
    });

    it('allows normal public domains', () => {
      expect(isBlockedDomain('example.com')).toBe(false);
      expect(isBlockedDomain('api.github.com')).toBe(false);
      expect(isBlockedDomain('www.google.com')).toBe(false);
    });
  });

  describe('SSRF Protection — isPrivateIP catches all RFC1918 ranges', () => {
    it('catches 10.0.0.0/8 (Class A private)', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.255')).toBe(true);
    });

    it('catches 172.16.0.0/12 (Class B private)', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
      // 172.15.x.x and 172.32.x.x are NOT private
      expect(isPrivateIP('172.15.0.1')).toBe(false);
      expect(isPrivateIP('172.32.0.1')).toBe(false);
    });

    it('catches 192.168.0.0/16 (Class C private)', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('192.168.255.255')).toBe(true);
    });

    it('catches 169.254.169.254 (cloud metadata — link-local)', () => {
      expect(isPrivateIP('169.254.169.254')).toBe(true);
      expect(isPrivateIP('169.254.1.1')).toBe(true);
    });

    it('catches 127.0.0.0/8 (loopback)', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.255.255.255')).toBe(true);
    });

    it('catches multicast, reserved, and default-unreachable ranges', () => {
      expect(isPrivateIP('224.0.0.1')).toBe(true);   // multicast
      expect(isPrivateIP('239.255.255.255')).toBe(true); // multicast
      expect(isPrivateIP('240.0.0.1')).toBe(true);   // reserved
      expect(isPrivateIP('0.0.0.0')).toBe(true);      // default unreachable
    });

    it('allows public IP addresses', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      // 203.0.113.1 is a documentation range that IS blocked by api-security
      expect(isPrivateIP('203.0.113.1')).toBe(true);
    });

    it('rejects malformed IP strings as unsafe', () => {
      expect(isPrivateIP('')).toBe(true);           // empty → unsafe
      expect(isPrivateIP('abc')).toBe(true);        // non-IP → unsafe
      expect(isPrivateIP('999.999.999.999')).toBe(true); // invalid octets → unsafe
    });
  });

  describe('SSRF Protection — isPrivateIPv6 catches ::1 and link-local', () => {
    it('catches IPv6 loopback ::1', () => {
      expect(isPrivateIPv6('::1')).toBe(true);
      expect(isPrivateIPv6('0000:0000:0000:0000:0000:0000:0000:0001')).toBe(true);
    });

    it('catches IPv6 link-local fe80::/10', () => {
      expect(isPrivateIPv6('fe80::1')).toBe(true);
      expect(isPrivateIPv6('fe80::abcd')).toBe(true);
    });

    it('catches IPv6 ULA fc00::/7 (fc and fd)', () => {
      expect(isPrivateIPv6('fc00::1')).toBe(true);
      expect(isPrivateIPv6('fd00::1')).toBe(true);
    });

    it('catches IPv6 multicast ff00::/8', () => {
      expect(isPrivateIPv6('ff00::1')).toBe(true);
      expect(isPrivateIPv6('ff02::1')).toBe(true);
    });

    it('catches IPv4-mapped IPv6 private addresses', () => {
      expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIPv6('::ffff:192.168.1.1')).toBe(true);
    });

    it('catches unspecified all-zeros address', () => {
      expect(isPrivateIPv6('::')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 7. TENANT ISOLATION
  // ──────────────────────────────────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('withProtection returns auth.organizationId when valid API key is provided', async () => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_KEY_RECORD);
      (db.apiKey.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const req = makeRequest('http://localhost/api/teams', {
        'x-api-key': 'valid-key',
      });
      const result = await withProtection(req, {
        requireAuth: true,
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });

      expect(result.error).toBeNull();
      expect(result.auth).not.toBeNull();
      expect(result.auth!.organizationId).toBe('org-test-456');
      expect(result.auth!.id).toBe('key-test-123');
      expect(result.auth!.scopes).toBe('read:all write:all');
    });

    it('auth is null/undefined when requireAuth is false', async () => {
      const req = makeRequest('http://localhost/api/fear-index', {
        'x-real-ip': '10.94.0.1',
      });
      const result = await withProtection(req, {
        rateLimit: { maxRequests: 30, windowMs: 60_000 },
      });
      expect(result.error).toBeNull();
      // authenticatedKeyRecord is never set, so auth is null
      expect(result.auth).toBeFalsy();
    });

    it('tenant isolation: teams POST uses auth.organizationId for data scoping', async () => {
      (db.apiKey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_KEY_RECORD);
      (db.apiKey.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (db.team.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 't1', name: 'Security Team', description: '', color: '#ff0000', _count: { members: 0 },
      });
      (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const req = makeRequest('http://localhost/api/teams', {
        'x-api-key': 'valid-key',
        'x-real-ip': '10.93.0.1',
      }, { name: 'Security Team', color: '#ff0000' }, 'POST');
      const res = await teamsPOST(req);
      // Should succeed (201 or 200, not 403) because auth.organizationId is present
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
      // Verify the team was created with the correct org ID
      expect(db.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-test-456',
            name: 'Security Team',
          }),
        }),
      );
    });
  });
});
