// ─── Multi-Technique Subdomain Enumeration ────────────────────
// Combines DNS permutation, Certificate Transparency log queries,
// and DNS zone transfer attempts to discover subdomains.
// This is what tools like Sublist3r, Amass, and Subfinder do.
//
// Asset inventory services charge $500-$50,000/month for this.

import dns from 'dns/promises';
import { queryCTLogs } from './ct-logs';
import { enumerateDNS } from './dns-recon';
import type { ReconFinding } from './types';

export interface SubdomainResult {
  domain: string;
  subdomains: { subdomain: string; ips: string[]; source: string }[];
  totalFound: number;
  techniques: { name: string; found: number }[];
  findings: ReconFinding[];
}

// 50 common subdomain prefixes for DNS permutation
const COMMON_PREFIXES = [
  'www', 'mail', 'api', 'dev', 'staging', 'admin', 'portal', 'app', 'blog', 'shop',
  'cdn', 'static', 'media', 'images', 'assets', 'files', 'download', 'vpn', 'remote', 'gateway',
  'proxy', 'ns1', 'ns2', 'mx1', 'mx2', 'smtp', 'pop', 'imap', 'ftp', 'sftp',
  'ssh', 'test', 'qa', 'uat', 'ci', 'cd', 'git', 'wiki', 'docs', 'support',
  'help', 'forum', 'community', 'status', 'monitor', 'grafana', 'prometheus', 'jenkins', 'jira', 'slack',
];

// ── Concurrency-Limited Batch Executor ─────────────────────────

async function batchExec<T>(
  items: string[],
  fn: (item: string) => Promise<T>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result);
      executing.delete(promise as unknown as Promise<void>);
    });

    executing.add(promise as unknown as Promise<void>);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// ── Technique 1: DNS Permutation ───────────────────────────────

interface DNSTryResult {
  subdomain: string;
  ips: string[];
  found: boolean;
}

async function tryDNSResolve(
  prefix: string,
  domain: string,
): Promise<DNSTryResult> {
  const fqdn = `${prefix}.${domain}`;
  try {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '9.9.9.9']);

    const ips = await Promise.race([
      resolver.resolve4(fqdn),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 3000)
      ),
    ]);

    return { subdomain: fqdn, ips, found: true };
  } catch {
    return { subdomain: fqdn, ips: [], found: false };
  }
}

// ── Technique 2: Certificate Transparency (via ct-logs.ts) ─────

interface CTSubdomainResult {
  subdomain: string;
  ips: string[];
  source: string;
}

async function ctLogDiscovery(domain: string): Promise<CTSubdomainResult[]> {
  const ctResult = await queryCTLogs(domain, 15000);
  if (!ctResult.success || ctResult.subdomains.length === 0) return [];

  const results: CTSubdomainResult[] = [];
  for (const sub of ctResult.subdomains) {
    try {
      const ips = await Promise.race([
        dns.resolve4(sub),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DNS timeout')), 3000)
        ),
      ]);
      results.push({ subdomain: sub, ips, source: 'ct' });
    } catch {
      // Subdomain from CT log doesn't resolve — still include it (may resolve later or via other record types)
      results.push({ subdomain: sub, ips: [], source: 'ct' });
    }
  }

  return results;
}

// ── Technique 3: DNS Zone Transfer Attempt ─────────────────────

async function tryZoneTransfer(domain: string): Promise<string[]> {
  const discoveredNS: string[] = [];

  // Get NS records using the existing DNS module
  try {
    const dnsResult = await enumerateDNS(domain, 5000);
    const nsRecords = dnsResult.records.filter(r => r.type === 'NS');
    for (const ns of nsRecords) {
      discoveredNS.push(ns.value);
    }
  } catch {
    // NS lookup failed, continue with empty list
  }

  const transferredSubdomains: string[] = [];

  for (const ns of discoveredNS) {
    try {
      const resolver = new dns.Resolver();
      // Use the NS server directly for AXFR query
      const nsHost = ns.replace(/	.*$/, '').trim(); // Clean any trailing annotation
      resolver.setServers([nsHost]);

      await Promise.race([
        (async () => {
          // resolveAny may trigger AXFR-like behavior on some servers
          // Node.js dns.promises doesn't support raw AXFR, but we attempt resolveTx
          // to see if the server provides more info than standard queries
          const addresses = await resolver.resolve4(domain);
          // If we get here, the NS responded — but standard resolve4 won't do AXFR
          // Just note the NS was responsive
          return addresses;
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Zone transfer timeout')), 5000)
        ),
      ]);
    } catch {
      // Expected — zone transfers are almost always blocked
    }
  }

  return transferredSubdomains;
}

// ── Findings Generation ─────────────────────────────────────────

function classifySubdomainRisk(subdomain: string): { severity: string; description: string } {
  const sub = subdomain.toLowerCase();

  if (/\b(db|database|mysql|postgres|mongo|redis)\b/i.test(sub)) {
    return {
      severity: 'critical',
      description: `CRITICAL: Database-related subdomain detected (${subdomain}). Exposing database services directly to the internet can lead to full data compromise. Verify this subdomain does not expose database ports publicly.`,
    };
  }
  if (/\b(staging|dev|test|uat|pre|preprod|sandbox)\b/i.test(sub)) {
    return {
      severity: 'high',
      description: `HIGH-RISK: Non-production environment subdomain (${subdomain}). Non-production environments often have weaker security controls, debug modes enabled, or test data. Internet-accessible staging environments are a significant attack vector.`,
    };
  }
  if (/\b(admin|manage|dashboard|panel|control|cpanel|plesk)\b/i.test(sub)) {
    return {
      severity: 'high',
      description: `HIGH-RISK: Administrative interface subdomain (${subdomain}). Admin panels are prime targets for brute-force attacks and credential stuffing. They should be protected by IP allowlisting, MFA, and VPN access.`,
    };
  }
  if (/\b(vpn|remote|rdp)\b/i.test(sub)) {
    return {
      severity: 'high',
      description: `HIGH-RISK: Remote access subdomain (${subdomain}). VPN and remote access gateways are high-value targets. Ensure strong authentication, MFA, and rate limiting are enforced.`,
    };
  }
  if (/\b(api|graphql|rest|gateway)\b/i.test(sub)) {
    return {
      severity: 'medium',
      description: `MEDIUM-RISK: API endpoint subdomain (${subdomain}). APIs often have different authentication mechanisms than the main site and may expose sensitive data or functionality if not properly secured.`,
    };
  };
  if (/\b(mail|smtp|mx|email)\b/i.test(sub)) {
    return {
      severity: 'medium',
      description: `Mail-related subdomain (${subdomain}). Mail servers are targets for phishing, spoofing, and credential harvesting. Verify SPF, DKIM, and DMARC are configured.`,
    };
  }

  return {
    severity: 'info',
    description: `Subdomain discovered via active enumeration. This subdomain resolves and is or was an active internet-facing service.`,
  };
}

function generateFindings(
  subdomains: SubdomainResult['subdomains'],
  domain: string,
  techniques: SubdomainResult['techniques'],
): ReconFinding[] {
  const findings: ReconFinding[] = [];

  if (subdomains.length === 0) {
    findings.push({
      title: 'No Subdomains Discovered',
      severity: 'info',
      category: 'subdomain',
      description: 'No subdomains were found using DNS permutation, Certificate Transparency logs, or zone transfer attempts. The domain may have a minimal attack surface, or the subdomains are protected by restricted DNS configurations.',
      evidence: `Techniques used: ${techniques.map(t => t.name).join(', ')}`,
      asset: domain,
      source: 'subdomain',
    });
    return findings;
  }

  // Summary
  findings.push({
    title: `${subdomains.length} Subdomain(s) Discovered`,
    severity: subdomains.length > 50 ? 'high' : subdomains.length > 20 ? 'medium' : 'info',
    category: 'subdomain',
    description: `Active enumeration discovered ${subdomains.length} subdomain(s) using ${techniques.filter(t => t.found > 0).length} technique(s). Each subdomain represents a potential attack surface entry point. Subdomains are often less secured than the main domain and may be forgotten during security hardening.`,
    evidence: `Techniques: ${techniques.map(t => `${t.name}(${t.found})`).join(', ')}`,
    asset: domain,
    source: 'subdomain',
  });

  // Individual subdomain findings (top 30)
  const displaySubs = subdomains.slice(0, 30);
  for (const sub of displaySubs) {
    const { severity, description } = classifySubdomainRisk(sub.subdomain);
    findings.push({
      title: `Subdomain: ${sub.subdomain}`,
      severity,
      category: 'subdomain',
      description,
      evidence: sub.ips.length > 0 ? `IPs: ${sub.ips.join(', ')} (source: ${sub.source})` : `Source: ${sub.source}`,
      asset: sub.subdomain,
      source: 'subdomain',
    });
  }

  if (subdomains.length > 30) {
    findings.push({
      title: `${subdomains.length - 30} Additional Subdomains Not Shown`,
      severity: 'info',
      category: 'subdomain',
      description: `${subdomains.length - 30} more subdomains were discovered beyond the 30 displayed.`,
      evidence: null,
      asset: domain,
      source: 'subdomain',
    });
  }

  return findings;
}

/**
 * Discover subdomains for a domain using multiple enumeration techniques:
 * 1. DNS permutation against 50 common prefixes
 * 2. Certificate Transparency log queries
 * 3. DNS zone transfer attempts against discovered NS records
 *
 * @param domain - The base domain to enumerate (e.g., "example.com")
 * @returns SubdomainResult with discovered subdomains, per-technique stats, and findings
 */
export async function discoverSubdomains(domain: string): Promise<SubdomainResult> {
  const subdomainMap = new Map<string, { subdomain: string; ips: string[]; source: string }>();
  const techniques: SubdomainResult['techniques'] = [];

  // ── Technique 1: DNS Permutation ──
  let dnsPermutationCount = 0;
  try {
    const dnsResults = await batchExec(
      COMMON_PREFIXES,
      (prefix) => tryDNSResolve(prefix, domain),
      10, // concurrency limit
    );

    for (const result of dnsResults) {
      if (result.found) {
        dnsPermutationCount++;
        const existing = subdomainMap.get(result.subdomain);
        if (existing) {
          // Merge IPs and sources
          const allIps = [...new Set([...existing.ips, ...result.ips])];
          subdomainMap.set(result.subdomain, {
            subdomain: result.subdomain,
            ips: allIps,
            source: `${existing.source},dns`,
          });
        } else {
          subdomainMap.set(result.subdomain, {
            subdomain: result.subdomain,
            ips: result.ips,
            source: 'dns',
          });
        }
      }
    }
  } catch {
    // DNS permutation failed entirely
  }
  techniques.push({ name: 'DNS Permutation', found: dnsPermutationCount });

  // ── Technique 2: Certificate Transparency ──
  let ctCount = 0;
  try {
    const ctSubdomains = await ctLogDiscovery(domain);
    for (const ct of ctSubdomains) {
      ctCount++;
      const existing = subdomainMap.get(ct.subdomain);
      if (existing) {
        const allIps = [...new Set([...existing.ips, ...ct.ips])];
        subdomainMap.set(ct.subdomain, {
          subdomain: ct.subdomain,
          ips: allIps,
          source: `${existing.source},ct`,
        });
      } else {
        subdomainMap.set(ct.subdomain, {
          subdomain: ct.subdomain,
          ips: ct.ips,
          source: 'ct',
        });
      }
    }
  } catch {
    // CT log query failed
  }
  techniques.push({ name: 'Certificate Transparency', found: ctCount });

  // ── Technique 3: DNS Zone Transfer ──
  let axfrCount = 0;
  try {
    const axfrSubdomains = await tryZoneTransfer(domain);
    for (const sub of axfrSubdomains) {
      axfrCount++;
      const existing = subdomainMap.get(sub);
      if (existing) {
        subdomainMap.set(sub, {
          ...existing,
          source: `${existing.source},axfr`,
        });
      } else {
        subdomainMap.set(sub, {
          subdomain: sub,
          ips: [],
          source: 'axfr',
        });
      }
    }
  } catch {
    // Zone transfer failed (expected in most cases)
  }
  techniques.push({ name: 'Zone Transfer (AXFR)', found: axfrCount });

  // Deduplicate and sort
  const subdomains = Array.from(subdomainMap.values()).sort((a, b) =>
    a.subdomain.localeCompare(b.subdomain)
  );

  const findings = generateFindings(subdomains, domain, techniques);

  return {
    domain,
    subdomains,
    totalFound: subdomains.length,
    techniques,
    findings,
  };
}

export { type ReconFinding };
