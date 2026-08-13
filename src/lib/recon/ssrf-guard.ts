/**
 * SSRF Guard — Reusable scan-target validation for all recon modules.
 *
 * Centralizes the three-step validation pattern that was duplicated
 * across bot-hunter, vuln-scan, and scan routes:
 *   1. Sanitize domain via api-security
 *   2. Check blocked-domain list
 *   3. Resolve DNS and reject private/reserved IPs
 *
 * Usage:
 *   const result = await validateScanTarget(rawInput);
 *   if (!result.safe) return NextResponse.json({ error: result.reason }, { status: 403 });
 *   const domain = result.domain;
 */

import dns from 'dns/promises';
import { isPrivateIP, isBlockedDomain, sanitizeDomain } from '@/lib/api-security';

export type ScanTargetResult =
  | { safe: true; domain: string }
  | { safe: false; reason: string };

/**
 * Validate that a target domain is safe to scan.
 *
 * - Sanitizes the input (strips protocols, paths, lowercases)
 * - Rejects blocked internal domains
 * - Resolves A records and rejects any that point to private/reserved IPs
 *
 * DNS resolution failure is *not* treated as an error — the connection
 * will naturally fail later.  This avoids false negatives on temporarily
 * unreachable targets.
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

  // 3. Resolve and check IPs (SSRF protection)
  try {
    const addresses = await dns.resolve4(domain);
    if (addresses.some((ip) => isPrivateIP(ip))) {
      return { safe: false, reason: 'Domain resolves to private IP address' };
    }
  } catch {
    // DNS resolution failed — allow (will fail at connection time)
  }

  return { safe: true, domain };
}
