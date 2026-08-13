/**
 * SSRF Guard — Reusable scan-target validation for all recon modules.
 *
 * Centralizes the three-step validation pattern that was duplicated
 * across bot-hunter, vuln-scan, and scan routes:
 *   1. Sanitize domain via api-security
 *   2. Check blocked-domain list
 *   3. Resolve DNS and reject private/reserved IPs (v4 + v6)
 *
 * v2 — Hardened: IPv6 private range checks, DNS failure treated as unsafe,
 * timer cleanup, consistent with api-security blocked list.
 *
 * Usage:
 *   const result = await validateScanTarget(rawInput);
 *   if (!result.safe) return NextResponse.json({ error: result.reason }, { status: 403 });
 *   const domain = result.domain;
 */

import dns from 'dns/promises';
import { isPrivateIP, isPrivateIPv6, isBlockedDomain, sanitizeDomain, looksLikeIP } from '@/lib/api-security';

export type ScanTargetResult =
  | { safe: true; domain: string }
  | { safe: false; reason: string };

/**
 * Validate that a target domain is safe to scan.
 *
 * - Sanitizes the input (strips protocols, paths, lowercases, trailing dots)
 * - Rejects blocked internal domains
 * - If target looks like an IP, checks it directly without DNS
 * - Resolves A + AAAA records and rejects any that point to private/reserved IPs
 *
 * DNS resolution failure is now treated as UNSAFE — prevents TOCTOU bypass
 * where an attacker causes SERVFAIL on validation query but resolves to a
 * private IP on the actual connection.
 */
export async function validateScanTarget(target: unknown): Promise<ScanTargetResult> {
  // 1. Sanitize domain
  const domain = sanitizeDomain(target);
  if (!domain) {
    return { safe: false, reason: 'Invalid domain format' };
  }

  // 2. Check blocked domains (localhost, metadata, kubernetes, etc.)
  if (isBlockedDomain(domain)) {
    return { safe: false, reason: 'Internal domains cannot be scanned' };
  }

  // 3. If it looks like an IP, check directly
  if (looksLikeIP(domain)) {
    if (isPrivateIPv6(domain) || isPrivateIP(domain)) {
      return { safe: false, reason: 'Private or reserved IP addresses cannot be scanned' };
    }
    return { safe: true, domain };
  }

  // 4. Resolve DNS and check both A (IPv4) and AAAA (IPv6) records
  const v4Promise = dns.resolve4(domain).catch(() => [] as string[]);
  const v6Promise = dns.resolve6(domain).catch(() => [] as string[]);

  const [v4Addresses, v6Addresses] = await Promise.all([v4Promise, v6Promise]);

  // If DNS resolves to ANYTHING, at least one record exists — use it for validation
  // If DNS fails entirely (both empty), treat as unsafe
  if (v4Addresses.length === 0 && v6Addresses.length === 0) {
    return { safe: false, reason: 'Domain does not resolve to any IP address' };
  }

  // Check IPv4
  if (v4Addresses.some((ip) => isPrivateIP(ip))) {
    return { safe: false, reason: 'Domain resolves to private IP address' };
  }

  // Check IPv6
  if (v6Addresses.some((ip) => isPrivateIPv6(ip))) {
    return { safe: false, reason: 'Domain resolves to private IPv6 address' };
  }

  return { safe: true, domain };
}
