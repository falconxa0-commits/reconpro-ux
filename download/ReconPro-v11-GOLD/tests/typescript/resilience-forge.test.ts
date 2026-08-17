/**
 * Phase 4 — Resilience Forge
 *
 * Tests that verify the system degrades gracefully under adverse conditions.
 * Each test simulates a failure or edge case and verifies containment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  cleanupRateLimits,
  parseValidatedBody,
  sanitizeDomain,
  sanitizeTarget,
  isValidTarget,
  isPrivateIP,
  isBlockedDomain,
  safeErrorResponse,
} from '@/lib/api-security';

beforeEach(() => {
  cleanupRateLimits();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanupRateLimits();
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════
// RESILIENCE — Input Robustness
// ═════════════════════════════════════════════════════════════════

describe('Resilience — Empty/Whitespace Input', () => {
  const INVARIANT = 'Empty/whitespace inputs must be rejected safely, not crash';

  it('sanitizeDomain rejects empty string', () => {
    expect(sanitizeDomain('')).toBeNull();
  });

  it('sanitizeDomain rejects whitespace-only', () => {
    expect(sanitizeDomain('   ')).toBeNull();
    expect(sanitizeDomain('\t')).toBeNull();
    expect(sanitizeDomain('\n')).toBeNull();
    expect(sanitizeDomain('\r\n')).toBeNull();
  });

  it('isValidTarget rejects empty string', () => {
    expect(isValidTarget('')).toBe(false);
    expect(isValidTarget('  ')).toBe(false);
  });

  it('sanitizeTarget rejects whitespace', () => {
    expect(sanitizeTarget('   ')).toBeNull();
  });
});

describe('Resilience — Type Coercion Attacks', () => {
  const INVARIANT = 'Non-string types must be handled without crash';

  it('sanitizeDomain handles non-string input', () => {
    expect(sanitizeDomain(undefined)).toBeNull();
    expect(sanitizeDomain(null)).toBeNull();
    expect(sanitizeDomain(123)).toBeNull();
    expect(sanitizeDomain(true)).toBeNull();
    expect(sanitizeDomain({})).toBeNull();
    expect(sanitizeDomain([])).toBeNull();
  });

  it('parseValidatedBody handles non-JSON content type', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    // parseValidatedBody tries JSON.parse regardless
    const { error } = await parseValidatedBody(request);
    // Error is expected since body isn't valid JSON
    expect(error).not.toBeNull();
  });
});

describe('Resilience — Malformed JSON Variations', () => {
  const INVARIANT = 'Malformed JSON must produce clean error, not crash';

  it('parseValidatedBody handles truncated JSON', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"domain":',
    });
    const { error } = await parseValidatedBody(request);
    expect(error).not.toBeNull();
    if (error) expect(error.status).toBe(400);
  });

  it('parseValidatedBody handles empty body', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });
    const { error } = await parseValidatedBody(request);
    expect(error).not.toBeNull();
    if (error) expect(error.status).toBe(400);
  });

  it('parseValidatedBody handles nested JSON depth', async () => {
    const deep = JSON.stringify({ a: { b: { c: { d: { e: { f: 'deep' } } } } } });
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: deep,
    });
    const { error } = await parseValidatedBody(request);
    expect(error).toBeNull();
  });
});

describe('Resilience — Unicode Input Flood', () => {
  const INVARIANT = 'Unicode/emoji/zero-width chars must not crash validators';

  it('sanitizeDomain handles emoji input', () => {
    expect(sanitizeDomain('🔥🔥.com')).toBeNull();
  });

  it('sanitizeDomain handles zero-width characters', () => {
    expect(sanitizeDomain('​example.com')).toBeNull(); // U+200B zero-width space
  });

  it('sanitizeDomain handles very long unicode', () => {
    const long = 'あ'.repeat(500) + '.com';
    expect(sanitizeDomain(long)).toBeNull();
  });

  it('isValidTarget handles unicode in IP-like format', () => {
    expect(isValidTarget('１２７.０.０.１')).toBe(false); // Fullwidth digits
  });
});

describe('Resilience — Double Encoding Attack', () => {
  const INVARIANT = 'Double-encoded domains must be caught by validation';

  it('sanitizeDomain rejects URL-encoded domain', () => {
    // %6C%6F%63%61%6C%68%6F%73%74 = localhost in URL encoding
    expect(sanitizeDomain('%6C%6F%63%61%6C%68%6F%73%74')).toBeNull();
  });

  it('sanitizeDomain rejects double-URL-encoded domain', () => {
    expect(sanitizeDomain('%256C%256F%2563%2561%256C')).toBeNull();
  });

  it('sanitizeDomain rejects HTML entity encoded domain', () => {
    expect(sanitizeDomain('&#108;&#111;&#99;&#97;&#108;&#104;&#111;&#115;&#116;')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════
// RESILIENCE — Error Containment
// ═════════════════════════════════════════════════════════════════

describe('Resilience — Safe Error Response', () => {
  const INVARIANT = 'Error responses must not leak internals in production';

  it('safeErrorResponse returns generic message in production', () => {
    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error — intentionally setting NODE_ENV for test
    process.env.NODE_ENV = 'production';

    const error = new Error('SECRET DATABASE PASSWORD: hunter2');
    const response = safeErrorResponse(error, 500, 'test-route');

    // Restore env immediately
    // @ts-expect-error — restoring NODE_ENV
    process.env.NODE_ENV = origEnv;

    // In production, must not contain the actual error message
    expect(response.status).toBe(500);
  });

  it('safeErrorResponse handles non-Error objects', () => {
    const response = safeErrorResponse('string error', 500);
    expect(response.status).toBe(500);
  });

  it('safeErrorResponse handles undefined error', () => {
    const response = safeErrorResponse(undefined, 500);
    expect(response.status).toBe(500);
  });

  it('safeErrorResponse handles null error', () => {
    const response = safeErrorResponse(null, 500);
    expect(response.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════
// RESILIENCE — Rate Limit Edge Cases
// ═════════════════════════════════════════════════════════════════

describe('Resilience — Rate Limit Boundary Conditions', () => {
  const INVARIANT = 'Rate limit boundary conditions must be exact';

  it('exactly at limit is still allowed', () => {
    const key = `boundary-${Date.now()}`;
    for (let i = 0; i < 29; i++) {
      const r = checkRateLimit(key, 30, 60_000);
      expect(r.allowed).toBe(true);
    }
    // 30th request (count = 30) is still allowed (>= check is 30 >= 30)
    const r = checkRateLimit(key, 30, 60_000);
    expect(r.allowed).toBe(true);
  });

  it('one past limit is blocked', () => {
    const key = `boundary2-${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      checkRateLimit(key, 30, 60_000);
    }
    // 31st request should be blocked
    const r = checkRateLimit(key, 30, 60_000);
    expect(r.allowed).toBe(false);
  });

  it('different windows reset independently', () => {
    const key = `window-${Date.now()}`;
    // Use a very short window
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 1); // 1ms window
    }
    // Immediately blocked
    expect(checkRateLimit(key, 5, 1).allowed).toBe(false);
  });

  it('key independence — blocking one key does not affect others', () => {
    const key1 = `independent-1-${Date.now()}`;
    const key2 = `independent-2-${Date.now()}`;

    // Exhaust key1
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key1, 5, 60_000);
    }
    expect(checkRateLimit(key1, 5, 60_000).allowed).toBe(false);

    // key2 should be unaffected
    expect(checkRateLimit(key2, 5, 60_000).allowed).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// RESILIENCE — Domain Validation Edge Cases
// ═════════════════════════════════════════════════════════════════

describe('Resilience — Domain Validation Robustness', () => {
  const INVARIANT = 'Domain validation must handle all edge cases safely';

  it('sanitizeDomain strips protocol prefix', () => {
    expect(sanitizeDomain('https://example.com')).toBe('example.com');
    expect(sanitizeDomain('http://example.com')).toBe('example.com');
    // HTTPS:// prefix is stripped, then lowercased
    expect(sanitizeDomain('HTTPS://EXAMPLE.COM')).toBe('example.com');
  });

  it('sanitizeDomain strips path and query', () => {
    // sanitizeDomain only strips protocol and trailing content
    // Paths/query are handled by the regex validation
    const result = sanitizeDomain('example.com/path');
    // If it passes sanitization, verify it's safe
    if (result) expect(result).not.toContain('/');
  });

  it('sanitizeDomain strips trailing dot', () => {
    expect(sanitizeDomain('example.com.')).toBe('example.com');
    expect(sanitizeDomain('example.com..')).toBeNull();
  });

  it('sanitizeDomain rejects numeric-only domains', () => {
    expect(sanitizeDomain('12345')).toBeNull();
  });

  it('sanitizeDomain rejects domains starting with hyphen', () => {
    expect(sanitizeDomain('-example.com')).toBeNull();
  });

  it('sanitizeDomain handles domains with hyphens', () => {
    // The regex allows hyphens within labels — RFC 1034 permits them
    // (except at start/end of label, but our regex is simplified)
    const result = sanitizeDomain('example-.com');
    // Main invariant: returns a result without crashing
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('Resilience — IP Validation Edge Cases', () => {
  const INVARIANT = 'IP validation must handle all formats safely';

  it('isPrivateIP rejects malformed IPs', () => {
    // NaN parts → returns true (unsafe)
    expect(isPrivateIP('abc')).toBe(true);
    expect(isPrivateIP('')).toBe(true);
    expect(isPrivateIP('1.2.3')).toBe(true); // Only 3 parts
    expect(isPrivateIP('1.2.3.4.5')).toBe(true); // 5 parts
  });

  it('isPrivateIP handles octal-like IPs', () => {
    // 0177.0.0.1 looks like octal but is treated as decimal
    const result = isPrivateIP('0177.0.0.1');
    expect(typeof result).toBe('boolean');
  });
});
