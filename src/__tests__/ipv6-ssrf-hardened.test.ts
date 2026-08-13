/**
 * Phase 2 Metabolic Swarm — IPv6 SSRF Protection Tests
 *
 * Tests that the hardened IPv6 private IP detection works correctly.
 */

import { describe, it, expect } from 'vitest';
import { isPrivateIPv6, isPrivateIPAny, looksLikeIP, IPV4_REGEX, IPV6_REGEX, checkRateLimit } from '@/lib/api-security';

describe('IPv6 SSRF Protection — isPrivateIPv6', () => {
  it('blocks loopback ::1', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
  });

  it('blocks full-form loopback', () => {
    expect(isPrivateIPv6('0000:0000:0000:0000:0000:0000:0000:0001')).toBe(true);
  });

  it('blocks IPv4-mapped loopback', () => {
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
  });

  it('blocks IPv4-mapped RFC1918', () => {
    expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateIPv6('::ffff:192.168.1.1')).toBe(true);
    expect(isPrivateIPv6('::ffff:172.16.0.1')).toBe(true);
  });

  it('blocks IPv4-mapped cloud metadata', () => {
    expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true);
  });

  it('blocks link-local fe80::', () => {
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('fe80::dead:beef')).toBe(true);
  });

  it('blocks ULA fc00::/7', () => {
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fd00::1')).toBe(true);
    expect(isPrivateIPv6('fd12:3456::1')).toBe(true);
  });

  it('blocks multicast ff00::/8', () => {
    expect(isPrivateIPv6('ff01::1')).toBe(true);
    expect(isPrivateIPv6('ff02::1')).toBe(true);
  });

  it('blocks documentation range 2001:db8::/32', () => {
    expect(isPrivateIPv6('2001:db8::1')).toBe(true);
  });

  it('blocks unspecified address ::', () => {
    expect(isPrivateIPv6('::')).toBe(true);
  });

  it('allows public IPv6 addresses', () => {
    expect(isPrivateIPv6('2606:2800:220:1:248:1893:25c8:1946')).toBe(false);
    expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);
    expect(isPrivateIPv6('2606:4700:4700::1111')).toBe(false);
  });
});

describe('isPrivateIPAny — unified check', () => {
  it('blocks IPv4 private', () => {
    expect(isPrivateIPAny('127.0.0.1')).toBe(true);
    expect(isPrivateIPAny('10.0.0.1')).toBe(true);
    expect(isPrivateIPAny('192.168.1.1')).toBe(true);
    expect(isPrivateIPAny('169.254.169.254')).toBe(true);
  });

  it('blocks IPv6 private', () => {
    expect(isPrivateIPAny('::1')).toBe(true);
    expect(isPrivateIPAny('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIPAny('fe80::1')).toBe(true);
    expect(isPrivateIPAny('fd00::1')).toBe(true);
  });

  it('allows public IPv4', () => {
    expect(isPrivateIPAny('8.8.8.8')).toBe(false);
    expect(isPrivateIPAny('1.1.1.1')).toBe(false);
    expect(isPrivateIPAny('93.184.216.34')).toBe(false);
  });

  it('allows public IPv6', () => {
    expect(isPrivateIPAny('2606:2800:220:1::')).toBe(false);
    expect(isPrivateIPAny('2001:4860:4860::8888')).toBe(false);
  });

  it('treats unknown formats as unsafe', () => {
    expect(isPrivateIPAny('not-an-ip')).toBe(true);
    expect(isPrivateIPAny('')).toBe(true);
    expect(isPrivateIPAny('999.999.999.999')).toBe(true);
  });
});

describe('looksLikeIP — format detection', () => {
  it('detects IPv4', () => {
    expect(looksLikeIP('8.8.8.8')).toBe(true);
    expect(looksLikeIP('127.0.0.1')).toBe(true);
  });

  it('detects IPv6', () => {
    expect(looksLikeIP('::1')).toBe(true);
    expect(looksLikeIP('2606:2800:220:1:248:1893:25c8:1946')).toBe(true);
    expect(looksLikeIP('::ffff:127.0.0.1')).toBe(true);
  });

  it('rejects domains', () => {
    expect(looksLikeIP('example.com')).toBe(false);
    expect(looksLikeIP('localhost')).toBe(false);
  });
});

describe('IPV4_REGEX — pattern coverage', () => {
  it('accepts valid IPv4', () => {
    expect(IPV4_REGEX.test('8.8.8.8')).toBe(true);
    expect(IPV4_REGEX.test('192.168.1.1')).toBe(true);
    expect(IPV4_REGEX.test('0.0.0.0')).toBe(true);
  });

  it('rejects non-IPv4', () => {
    expect(IPV4_REGEX.test('example.com')).toBe(false);
    expect(IPV4_REGEX.test('')).toBe(false);
  });
});

describe('IPV6_REGEX — basic pattern coverage', () => {
  // IPV6_REGEX is a simple heuristic for full-form IPv6 (8 groups).
  // Compressed forms (::, ::1, ::ffff:x.x.x.x) are handled by net.isIPv6()
  // in the actual code paths (sanitizeTarget, looksLikeIP, isIPv6).

  it('accepts full-form 8-group IPv6', () => {
    expect(IPV6_REGEX.test('2606:2800:220:1:248:1893:25c8:1946')).toBe(true);
  });

  it('accepts 7-group IPv6 (trailing empty)', () => {
    expect(IPV6_REGEX.test('2606:2800:220:1:248:1893:25c8:')).toBe(true);
  });

  it('rejects non-IPv6', () => {
    expect(IPV6_REGEX.test('example.com')).toBe(false);
    expect(IPV6_REGEX.test('8.8.8.8')).toBe(false);
    expect(IPV6_REGEX.test('')).toBe(false);
  });

  it('does not cover compressed forms (handled by net.isIPv6)', () => {
    // ::1, ::ffff:x.x.x.x, and :: are NOT matched by this simple regex.
    // They are handled by net.isIPv6() in sanitizeTarget, looksLikeIP, isValidTarget.
    expect(IPV6_REGEX.test('::1')).toBe(false);
    expect(IPV6_REGEX.test('::')).toBe(false);
    expect(IPV6_REGEX.test('::ffff:192.168.1.1')).toBe(false);
  });
});

describe('Bounded Rate Limit Store', () => {
  it('checkRateLimit returns correct structure', () => {
    const result = checkRateLimit('test-bounded-ipv6', 5, 60_000);
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('resetAt');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('rate limit blocks after max requests', () => {
    const key = `test-block-ipv6-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
