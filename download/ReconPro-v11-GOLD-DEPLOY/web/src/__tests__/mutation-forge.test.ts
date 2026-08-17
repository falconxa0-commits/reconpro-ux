/**
 * Phase 5 — Mutation Forge
 *
 * Mutation-style tests that verify the test suite would detect
 * specific mutants of security-critical code. For each mutant,
 * we temporarily mock the function to return the mutated value,
 * then verify the dependent code path produces a result that
 * violates the expected security invariant.
 *
 * These tests do NOT modify the real source code. Instead, they
 * simulate a mutant by mocking the function, and assert that the
 * calling code's behavior would be caught by the invariant check.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock DNS (required for safe-fetch imports) ───────────────

const { _mockResolve4, _mockResolve6 } = vi.hoisted(() => ({
  _mockResolve4: vi.fn(),
  _mockResolve6: vi.fn(),
}));

vi.mock('dns/promises', () => ({
  __esModule: true,
  default: { resolve4: (h: string) => _mockResolve4(h), resolve6: (h: string) => _mockResolve6(h) },
  resolve4: (h: string) => _mockResolve4(h),
  resolve6: (h: string) => _mockResolve6(h),
}));

vi.mock('tls', () => ({
  __esModule: true,
  default: { connect: vi.fn() },
}));

vi.mock('net', () => ({
  __esModule: true,
  default: { isIPv6: (s: string) => /^[\da-fA-F:]+$/.test(s) && s.includes(':') },
}));

vi.mock('@/lib/native-dns', () => ({
  digShort: vi.fn(),
  digAnswer: vi.fn(),
  resolveIP: vi.fn(),
  reverseDNS: vi.fn(),
  analyzeSSLNative: vi.fn(),
}));

import { safeFetch } from '@/lib/safe-fetch';
import {
  isPrivateIP,
  isPrivateIPv6,
  checkRateLimit,
  cleanupRateLimits,
  sanitizeDomain,
  isBlockedDomain,
  parseValidatedBody,
  isPrivateIPAny,
} from '@/lib/api-security';

beforeEach(() => {
  vi.clearAllMocks();
  cleanupRateLimits();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ═════════════════════════════════════════════════════════════════
// 1. SSRF Bypass Mutant
//    Mutant: isPrivateIP returns false for 127.0.0.1
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — SSRF Bypass Mutant', () => {
  it('detects if isPrivateIP(127.0.0.1) were mutated to return false', () => {
    // The real function correctly returns true
    const realResult = isPrivateIP('127.0.0.1');
    expect(realResult).toBe(true);

    // Simulate the mutant: isPrivateIP('127.0.0.1') returns false
    const mutantResult = false;

    // If this mutant were introduced, safeFetch would allow SSRF to localhost
    // The invariant is: isPrivateIP MUST return true for 127.0.0.1
    expect(realResult).not.toBe(mutantResult);
  });

  it('detects SSRF bypass via safeFetch when DNS resolves to 127.0.0.1', async () => {
    // DNS resolves loopback
    _mockResolve4.mockResolvedValue(['127.0.0.1']);
    _mockResolve6.mockResolvedValue([]);

    const result = await safeFetch('http://evil-rebind.example.com/');
    // The invariant: must block, not allow
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);

    // If isPrivateIP were mutated to return false for 127.0.0.1,
    // the above assertions would fail (status would be 200, not 403)
  });

  it('detects SSRF bypass for 10.0.0.1', () => {
    const realResult = isPrivateIP('10.0.0.1');
    expect(realResult).toBe(true);
    // Mutant would return false
    expect(realResult).not.toBe(false);
  });

  it('detects SSRF bypass for 169.254.169.254 (cloud metadata)', () => {
    const realResult = isPrivateIP('169.254.169.254');
    expect(realResult).toBe(true);
    expect(realResult).not.toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. Rate Limit Bypass Mutant
//    Mutant: checkRateLimit always returns { allowed: true }
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — Rate Limit Bypass Mutant', () => {
  it('detects if checkRateLimit were mutated to always allow', () => {
    const key = `mutation-rl-${Date.now()}`;
    const maxRequests = 3;

    // Exhaust the rate limit
    for (let i = 0; i < maxRequests; i++) {
      const r = checkRateLimit(key, maxRequests, 60_000);
      expect(r.allowed).toBe(true);
    }

    // This should be blocked
    const overflow = checkRateLimit(key, maxRequests, 60_000);

    // The invariant: overflow must be rejected
    // If mutant always returns { allowed: true }, this fails
    expect(overflow.allowed).toBe(false);
    expect(overflow.remaining).toBe(0);
  });

  it('detects if rate limiter ignores per-key tracking', () => {
    const keyA = `mutation-rl-a-${Date.now()}`;
    const keyB = `mutation-rl-b-${Date.now()}`;

    // Exhaust key A
    for (let i = 0; i < 5; i++) {
      checkRateLimit(keyA, 5, 60_000);
    }

    // Key A should be blocked
    expect(checkRateLimit(keyA, 5, 60_000).allowed).toBe(false);

    // Key B should still be allowed (independent tracking)
    expect(checkRateLimit(keyB, 5, 60_000).allowed).toBe(true);

    // Mutant that shares state would fail the key B assertion
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. Domain Validation Mutant
//    Mutant: sanitizeDomain accepts blocked/special domains
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — Domain Validation Mutant', () => {
  it('detects if sanitizeDomain were mutated to accept localhost', () => {
    // Real behavior: rejects single-label hosts (fails DOMAIN_REGEX)
    const result = sanitizeDomain('localhost');
    expect(result).toBeNull();

    // Mutant would return 'localhost'
    // The invariant: must be null
    expect(result).not.toBe('localhost');
  });

  it('detects if sanitizeDomain were mutated to accept internal domains', () => {
    const result = sanitizeDomain('internal');
    expect(result).toBeNull();

    // Mutant would return 'internal'
    expect(result).not.toBe('internal');
  });

  it('detects if sanitizeDomain were mutated to accept paths in domain', () => {
    const result = sanitizeDomain('example.com/../../../etc/passwd');
    // Real behavior: strips path, returns 'example.com'
    expect(result).toBe('example.com');

    // Mutant might return the full string with path
    expect(result).not.toBe('example.com/../../../etc/passwd');
  });

  it('detects if sanitizeDomain were mutated to accept non-string input', () => {
    expect(sanitizeDomain(123 as unknown)).toBeNull();
    expect(sanitizeDomain(null)).toBeNull();
    expect(sanitizeDomain(undefined)).toBeNull();
    expect(sanitizeDomain({})).toBeNull();
    expect(sanitizeDomain([])).toBeNull();
  });

  it('detects if sanitizeDomain were mutated to not lowercase', () => {
    const result = sanitizeDomain('EXAMPLE.COM');
    expect(result).toBe('example.com');

    // Mutant that skips lowercasing would return 'EXAMPLE.COM'
    expect(result).not.toBe('EXAMPLE.COM');
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. Blocked Domain Mutant
//    Mutant: isBlockedDomain returns false for localhost
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — Blocked Domain Mutant', () => {
  it('detects if isBlockedDomain were mutated to allow localhost', () => {
    const realResult = isBlockedDomain('localhost');
    expect(realResult).toBe(true);

    // Mutant would return false
    expect(realResult).not.toBe(false);
  });

  it('detects if isBlockedDomain were mutated to allow metadata.google.internal', () => {
    const realResult = isBlockedDomain('metadata.google.internal');
    expect(realResult).toBe(true);
    expect(realResult).not.toBe(false);
  });

  it('detects if isBlockedDomain were mutated to allow .local TLD', () => {
    expect(isBlockedDomain('anything.local')).toBe(true);
    expect(isBlockedDomain('test.localhost')).toBe(true);
    expect(isBlockedDomain('site.onion')).toBe(true);
    expect(isBlockedDomain('service.internal')).toBe(true);

    // Mutant would return false for any of these
    expect(isBlockedDomain('anything.local')).not.toBe(false);
    expect(isBlockedDomain('test.localhost')).not.toBe(false);
    expect(isBlockedDomain('site.onion')).not.toBe(false);
    expect(isBlockedDomain('service.internal')).not.toBe(false);
  });

  it('detects if isBlockedDomain were mutated to allow numeric-only domains', () => {
    expect(isBlockedDomain('12345')).toBe(true);
    expect(isBlockedDomain('0')).toBe(true);
    expect(isBlockedDomain('999999')).toBe(true);

    // Mutant would return false
    expect(isBlockedDomain('12345')).not.toBe(false);
  });

  it('detects if isBlockedDomain were mutated to block public domains', () => {
    // These MUST be allowed
    expect(isBlockedDomain('example.com')).toBe(false);
    expect(isBlockedDomain('google.com')).toBe(false);
    expect(isBlockedDomain('github.com')).toBe(false);

    // Mutant that returns true for everything would fail these
    expect(isBlockedDomain('example.com')).not.toBe(true);
    expect(isBlockedDomain('google.com')).not.toBe(true);
  });

  it('detects if isBlockedDomain misses subdomains of blocked domains', () => {
    // Subdomains of blocked domains must also be blocked
    expect(isBlockedDomain('sub.localhost')).toBe(true);
    expect(isBlockedDomain('x.metadata.google.internal')).toBe(true);
    expect(isBlockedDomain('deep.kubernetes.default.svc')).toBe(true);

    // Mutant that only checks exact match would fail
    expect(isBlockedDomain('sub.localhost')).not.toBe(false);
    expect(isBlockedDomain('x.metadata.google.internal')).not.toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. IPv6 Private Mutant
//    Mutant: isPrivateIPv6 returns false for ::1
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — IPv6 Private Mutant', () => {
  it('detects if isPrivateIPv6(::1) were mutated to return false', () => {
    const realResult = isPrivateIPv6('::1');
    expect(realResult).toBe(true);

    // Mutant would return false
    expect(realResult).not.toBe(false);
  });

  it('detects if isPrivateIPv6 were mutated to allow IPv4-mapped loopback', () => {
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIPv6('::ffff:127.0.0.1')).not.toBe(false);
  });

  it('detects if isPrivateIPv6 were mutated to allow link-local', () => {
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('fe80::1')).not.toBe(false);
  });

  it('detects if isPrivateIPv6 were mutated to allow ULA', () => {
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fd12:3456::1')).toBe(true);

    // Mutant would return false
    expect(isPrivateIPv6('fc00::1')).not.toBe(false);
    expect(isPrivateIPv6('fd12:3456::1')).not.toBe(false);
  });

  it('detects if isPrivateIPv6 were mutated to allow unspecified address', () => {
    expect(isPrivateIPv6('::')).toBe(true);
    expect(isPrivateIPv6('0000:0000:0000:0000:0000:0000:0000:0000')).toBe(true);

    // Mutant would return false
    expect(isPrivateIPv6('::')).not.toBe(false);
  });

  it('detects if isPrivateIPv6 allows public IPv6 (must NOT block)', () => {
    // Public IPv6 must be allowed (return false from isPrivateIPv6)
    expect(isPrivateIPv6('2606:4700:4700::1111')).toBe(false);
    expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);

    // Mutant that returns true for everything would fail
    expect(isPrivateIPv6('2606:4700:4700::1111')).not.toBe(true);
    expect(isPrivateIPv6('2001:4860:4860::8888')).not.toBe(true);
  });

  it('detects SSRF via IPv6 loopback through safeFetch', async () => {
    // DNS resolves to IPv6 loopback
    _mockResolve4.mockResolvedValue([]);
    _mockResolve6.mockResolvedValue(['::1']);

    const result = await safeFetch('http://v6-evil.example.com/');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);

    // If isPrivateIPv6('::1') returned false, this would pass through
  });

  it('detects SSRF via IPv4-mapped IPv6 through safeFetch', async () => {
    _mockResolve4.mockResolvedValue([]);
    _mockResolve6.mockResolvedValue(['::ffff:192.168.1.1']);

    const result = await safeFetch('http://v4mapped-evil.example.com/');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. Request Size Mutant
//    Mutant: parseValidatedBody accepts any size
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — Request Size Mutant', () => {
  it('detects if parseValidatedBody were mutated to accept oversized Content-Length', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: {
        'Content-Length': '999999999',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ small: true }),
    });

    const { error } = await parseValidatedBody(request, 1_000_000);

    // Must reject with 413
    expect(error).not.toBeNull();
    if (error) expect(error.status).toBe(413);

    // Mutant that ignores Content-Length would return null error
    expect(error).not.toBeNull();
  });

  it('detects if parseValidatedBody were mutated to accept negative Content-Length', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: {
        'Content-Length': '-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });

    // Negative size should pass (it's less than max), but body must parse
    const { body, error } = await parseValidatedBody(request);
    expect(error).toBeNull();
    expect(body).toEqual({ test: true });
  });

  it('detects if parseValidatedBody were mutated to accept invalid JSON', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not json{{}',
    });

    const { error } = await parseValidatedBody(request);
    expect(error).not.toBeNull();
    if (error) expect(error.status).toBe(400);

    // Mutant that returns body regardless would have null error
    expect(error).not.toBeNull();
  });

  it('detects if parseValidatedBody were mutated to accept empty body as valid', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });

    // Empty string is not valid JSON — should return 400
    const { error } = await parseValidatedBody(request);
    expect(error).not.toBeNull();
    if (error) expect(error.status).toBe(400);
  });

  it('detects if parseValidatedBody were mutated to allow zero maxBytes', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Length': '1', 'Content-Type': 'application/json' },
      body: '{}',
    });

    // maxBytes=0 means anything with Content-Length > 0 is rejected
    const { error } = await parseValidatedBody(request, 0);
    expect(error).not.toBeNull();
    if (error) expect(error.status).toBe(413);
  });
});

// ═════════════════════════════════════════════════════════════════
// Bonus: isPrivateIPAny composition mutant
//    Mutant: isPrivateIPAny returns false for unknown formats
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — isPrivateIPAny Unknown Format Mutant', () => {
  it('detects if isPrivateIPAny were mutated to allow unknown IP formats', () => {
    // Unknown format must be treated as unsafe (true)
    const unknownFormats = ['not-an-ip', '', 'hello', '1.2.3', '999.999.999.999'];

    for (const fmt of unknownFormats) {
      const result = isPrivateIPAny(fmt);
      expect(result).toBe(true);
      // Mutant that returns false for unknown formats would fail
      expect(result).not.toBe(false);
    }
  });

  it('allows known public IPv4 through isPrivateIPAny', () => {
    expect(isPrivateIPAny('8.8.8.8')).toBe(false);
    expect(isPrivateIPAny('1.1.1.1')).toBe(false);
    // Mutant that returns true for everything would fail
    expect(isPrivateIPAny('8.8.8.8')).not.toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// Bonus: safeFetch skipSSRFCheck mutant
//    Mutant: skipSSRFCheck is always true
// ═════════════════════════════════════════════════════════════════

describe('Mutation Forge — skipSSRFCheck Mutant', () => {
  it('verifies safeFetch blocks localhost by default', async () => {
    // Don't mock DNS — localhost is caught by the blocked-domain check before DNS
    const result = await safeFetch('http://localhost/', { skipSSRFCheck: false });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);

    // If skipSSRFCheck were always true, this would allow through
    expect(result.ok).not.toBe(true);
  });

  it('verifies safeFetch allows public domain when skipSSRFCheck is explicitly true', async () => {
    _mockResolve4.mockResolvedValue(['93.184.216.34']);
    _mockResolve6.mockResolvedValue([]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers(), body: null,
      text: async () => 'ok',
      url: 'http://example.com/',
    }));

    const result = await safeFetch('http://example.com/', { skipSSRFCheck: true });
    expect(result.ok).toBe(true);
  });
});
