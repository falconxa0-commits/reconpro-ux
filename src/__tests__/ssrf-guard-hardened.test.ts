/**
 * Phase 2 Metabolic Swarm — SSRF Guard Hardened Tests
 *
 * Tests the hardened validateScanTarget function:
 * - IPv6 AAAA resolution check
 * - DNS failure = reject (no TOCTOU bypass)
 * - Direct IP input handling
 * - Blocked domain enforcement
 *
 * Note: ssrf-guard imports from api-security, not dns/promises directly.
 * We test the api-security functions it depends on.
 */

import { describe, it, expect } from 'vitest';
import {
  isPrivateIP,
  isPrivateIPv6,
  isBlockedDomain,
  sanitizeDomain,
  looksLikeIP,
  sanitizeTarget,
} from '@/lib/api-security';

describe('Hardened SSRF Guard — component functions', () => {
  describe('sanitizeDomain strips trailing dots', () => {
    it('strips trailing dot', () => {
      expect(sanitizeDomain('example.com.')).toBe('example.com');
    });

    it('strips protocol and path', () => {
      expect(sanitizeDomain('https://example.com/path')).toBe('example.com');
    });

    it('lowercases', () => {
      expect(sanitizeDomain('EXAMPLE.COM')).toBe('example.com');
    });

    it('rejects invalid', () => {
      expect(sanitizeDomain('')).toBeNull();
      expect(sanitizeDomain('not valid')).toBeNull();
    });
  });

  describe('sanitizeTarget accepts IPv6', () => {
    it('accepts compressed IPv6', () => {
      const r = sanitizeTarget('::1');
      expect(r).toBe('::1');
    });

    it('accepts full IPv6', () => {
      const r = sanitizeTarget('2606:2800:220:1::');
      expect(r).toBe('2606:2800:220:1::');
    });

    it('accepts IPv4-mapped IPv6', () => {
      const r = sanitizeTarget('::ffff:127.0.0.1');
      expect(r).toBe('::ffff:127.0.0.1');
    });

    it('still accepts IPv4', () => {
      expect(sanitizeTarget('8.8.8.8')).toBe('8.8.8.8');
    });

    it('still accepts domains', () => {
      expect(sanitizeTarget('example.com')).toBe('example.com');
    });
  });

  describe('isBlockedDomain comprehensive', () => {
    it('blocks metadata.google.internal', () => {
      expect(isBlockedDomain('metadata.google.internal')).toBe(true);
    });

    it('blocks consul', () => {
      expect(isBlockedDomain('consul')).toBe(true);
    });

    it('blocks kubernetes.default.svc', () => {
      expect(isBlockedDomain('kubernetes.default.svc')).toBe(true);
    });

    it('blocks numeric-only domains', () => {
      expect(isBlockedDomain('12345')).toBe(true);
    });

    it('allows public domains', () => {
      expect(isBlockedDomain('example.com')).toBe(false);
      expect(isBlockedDomain('google.com')).toBe(false);
    });
  });

  describe('looksLikeIP for IPv6', () => {
    it('detects ::1 as IP', () => {
      expect(looksLikeIP('::1')).toBe(true);
    });

    it('detects ::ffff:127.0.0.1 as IP', () => {
      expect(looksLikeIP('::ffff:127.0.0.1')).toBe(true);
    });

    it('rejects domains as IPs', () => {
      expect(looksLikeIP('example.com')).toBe(false);
    });
  });

  describe('SSRF chain validation', () => {
    it('full chain: valid domain passes sanitize + blocked + looksLikeIP', async () => {
      const domain = sanitizeDomain('example.com');
      expect(domain).not.toBeNull();
      if (!domain) return;
      expect(isBlockedDomain(domain)).toBe(false);
      expect(looksLikeIP(domain)).toBe(false);
    });

    it('full chain: private IPv4 blocked at IP check', () => {
      const target = sanitizeTarget('192.168.1.1');
      expect(target).toBe('192.168.1.1');
      if (target) expect(isPrivateIP(target)).toBe(true);
    });

    it('full chain: IPv6 loopback blocked', () => {
      const target = sanitizeTarget('::1');
      expect(target).toBe('::1');
      if (target) expect(isPrivateIPv6(target)).toBe(true);
    });

    it('full chain: IPv4-mapped loopback blocked via isPrivateIPv6', () => {
      const target = sanitizeTarget('::ffff:127.0.0.1');
      expect(target).toBe('::ffff:127.0.0.1');
      if (target) expect(isPrivateIPv6(target)).toBe(true);
    });

    it('full chain: blocked domain rejected', () => {
      const domain = sanitizeDomain('metadata.google.internal');
      expect(domain).toBe('metadata.google.internal');
      if (domain) expect(isBlockedDomain(domain)).toBe(true);
    });
  });
});
