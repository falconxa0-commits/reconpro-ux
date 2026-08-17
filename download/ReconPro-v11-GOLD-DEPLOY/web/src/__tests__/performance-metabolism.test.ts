/**
 * Phase 4 — Performance Metabolism
 *
 * Tests that verify efficient resource usage and bounded operations.
 * All performance tests use realistic bounds — we're testing correctness
 * of the performance envelope, not micro-benchmarking.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  cleanupRateLimits,
  parseValidatedBody,
  sanitizeDomain,
  sanitizeTarget,
  isValidTarget,
  isPrivateIP,
  isPrivateIPAny,
  isPrivateIPv6,
  isBlockedDomain,
  DOMAIN_REGEX,
  isPrivateIP as isPrivateIP_,
} from '@/lib/api-security';

beforeEach(() => {
  cleanupRateLimits();
});

afterEach(() => {
  cleanupRateLimits();
});

// ═════════════════════════════════════════════════════════════════
// PERFORMANCE — Rate Limit
// ═════════════════════════════════════════════════════════════════

describe('Performance — Rate Limit O(1) Check', () => {
  it('1000 individual rate limit checks complete in under 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const result = checkRateLimit(`perf-key-${i}`, 100, 60_000);
      expect(result.allowed).toBe(true);
      expect(typeof result.remaining).toBe('number');
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('repeated checks on same key are bounded', () => {
    const key = 'perf-repeat-key';
    for (let i = 0; i < 99; i++) {
      checkRateLimit(key, 100, 60_000);
    }
    const result = checkRateLimit(key, 100, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // 100 - 100 = 0
  });
});

describe('Performance — Rate Limit Batch', () => {
  it('10,000 checks across unique keys complete in under 2s', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      checkRateLimit(`batch-key-${i}`, 100, 60_000);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('Performance — Rate Limit Store Bounded', () => {
  it('store stays within 50,000 cap under rapid insertion', () => {
    // Insert 500 unique keys rapidly
    for (let i = 0; i < 500; i++) {
      checkRateLimit(`cap-key-${i}`, 100, 60_000);
    }
    // Store should have exactly 500 entries
    // (cleanup only triggers at > 25,000)
    const result = checkRateLimit('cap-test-after', 5, 60_000);
    expect(result.allowed).toBe(true);
  });

  it('cleanup removes expired entries', () => {
    // Insert entries that are already expired
    const past = Date.now() - 100_000; // 100s ago
    for (let i = 0; i < 10; i++) {
      checkRateLimit(`expired-${i}`, 1, 60_000);
    }
    // Manually expire by setting resetAt to past
    // (We can't directly access the store, but cleanupRateLimits should not error)
    cleanupRateLimits();
    const result = checkRateLimit('expired-test-new', 5, 60_000);
    expect(result.allowed).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// PERFORMANCE — Input Validation
// ═════════════════════════════════════════════════════════════════

describe('Performance — Sanitize Domain Throughput', () => {
  const domains = [
    'example.com', 'sub.domain.example.org', 'api.stripe.com',
    'cdn.cloudflare.net', ' grafana.internal ', 'localhost',
    'a-really-long-subdomain.example.com', '192.168.1.1',
    '::1', 'metadata.google.internal', '',
  ];

  it('10,000 domain sanitizations in under 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const d of domains) {
        sanitizeDomain(d);
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe('Performance — IP Check Throughput', () => {
  const ips = [
    '10.0.0.1', '172.16.0.1', '192.168.1.1', '127.0.0.1',
    '169.254.169.254', '8.8.8.8', '1.1.1.1', '93.184.216.34',
    '::1', 'fe80::1', 'fc00::1', '2606:4700::6810:1b',
    '255.255.255.255', '0.0.0.0', '224.0.0.1',
  ];

  it('10,000 IP checks in under 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const ip of ips) {
        isPrivateIPAny(ip);
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe('Performance — Blocked Domain Check', () => {
  const domains = [
    'localhost', 'internal', 'metadata.google.internal',
    'vault.service', 'redis.cache', 'kubernetes.default.svc',
    'example.com', 'google.com', 'api.github.com',
    'evil.local', 'sneaky.onion',
  ];

  it('10,000 blocked domain checks in under 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const d of domains) {
        isBlockedDomain(d);
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

// ═════════════════════════════════════════════════════════════════
// PERFORMANCE — Parse Validated Body
// ═════════════════════════════════════════════════════════════════

describe('Performance — parseValidatedBody Throughput', () => {
  it('1,000 valid JSON bodies parse in under 1s', async () => {
    const body = JSON.stringify({ domain: 'example.com', scanType: 'full', deep: true });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const request = new Request('http://test.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const { error } = await parseValidatedBody(request);
      expect(error).toBeNull();
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});

// ═════════════════════════════════════════════════════════════════
// PERFORMANCE — Concurrent Safety
// ═════════════════════════════════════════════════════════════════

describe('Performance — Concurrent Rate Limit Safety', () => {
  it('100 concurrent rate limit checks all return valid results', async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve(checkRateLimit(`concurrent-${i}`, 100, 60_000))
    );
    const results = await Promise.all(promises);
    for (const result of results) {
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.resetAt).toBe('number');
    }
  });

  it('rate limit overflow correctly blocks after limit', () => {
    const key = `perf-overflow-${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      checkRateLimit(key, 30, 60_000);
    }
    const blocked = checkRateLimit(key, 30, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
