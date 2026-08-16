// ─── IP Geolocation & Infrastructure Analysis ─────────────
// Resolves domain IPs, queries free geolocation APIs, and
// fingerprints cloud/CDN infrastructure.

import dns from 'dns/promises';
import { isPrivateIP, isPrivateIPv6, isBlockedDomain, looksLikeIP } from '@/lib/api-security';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────

export interface GeoLocation {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  isp?: string;
  org?: string;
  as?: string;
  cloudProvider?: 'aws' | 'gcp' | 'azure' | 'cloudflare' | 'akamai' | null;
}

export interface GeoResult {
  domain: string;
  ipv4: string[];
  ipv6: string[];
  locations: GeoLocation[];
  cloudProviders: string[];
  isBehindCDN: boolean;
  sharedHosting: boolean;
  findings: ReconFinding[];
}

// ── Cloud Detection ────────────────────────────────────────────

const CDN_KEYWORDS = ['cloudflare', 'akamai', 'cloudfront'];

function detectCloudProvider(
  isp?: string,
  org?: string,
): 'aws' | 'gcp' | 'azure' | 'cloudflare' | 'akamai' | null {
  const combined = `${isp || ''} ${org || ''}`.toLowerCase();

  if (combined.includes('cloudflare')) return 'cloudflare';
  if (combined.includes('akamai')) return 'akamai';
  if (combined.includes('amazon') || combined.includes('aws') || combined.includes('amazonaws.com')) return 'aws';
  if (combined.includes('google cloud') || combined.includes('google')) return 'gcp';
  if (combined.includes('microsoft') || combined.includes('azure')) return 'azure';

  return null;
}

function isCDN(provider: string | null): boolean {
  if (!provider) return false;
  return CDN_KEYWORDS.some(k => provider.toLowerCase().includes(k));
}

// ── Geolocation API ────────────────────────────────────────────

interface IPApiResult {
  status?: string;
  country?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  isp?: string;
  org?: string;
  as?: string;
  message?: string;
}

async function queryGeoLocation(ip: string, timeoutMs = 5000): Promise<GeoLocation> {
  const location: GeoLocation = { ip };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,org,as`, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!resp.ok) return location;

    const data: IPApiResult = await resp.json();

    if (data.status === 'success') {
      location.country = data.country;
      location.region = data.regionName;
      location.city = data.city;
      location.lat = data.lat;
      location.lon = data.lon;
      location.isp = data.isp;
      location.org = data.org;
      location.as = data.as;
      location.cloudProvider = detectCloudProvider(data.isp, data.org);
    }
  } catch {
    // API failed — return null fields
  }

  return location;
}

// ── Shared Hosting Check ───────────────────────────────────────

// We can't reliably detect shared hosting without reverse DNS on
// every IP, but if multiple distinct IP ranges resolve to the same
// domain, or if the org string suggests shared hosting, we flag it.
// For a more reliable check, we'd use a reverse DNS lookup.

async function checkSharedHosting(ips: string[]): Promise<boolean> {
  // If the org field from geolocation contains "hosting", "datacenter",
  // "server", or similar, it's likely shared infrastructure
  // We'll do a reverse DNS check on the first IP
  if (ips.length === 0) return false;

  try {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);

    // Reverse DNS lookup
    const hostnames = await Promise.race([
      Promise.all(ips.slice(0, 3).map(ip =>
        dns.reverse(ip).catch(() => [] as string[]),
      )),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('reverse DNS timeout')), 5000),
      ),
    ]);

    // If any hostname suggests shared hosting (generic hosting patterns)
    for (const names of hostnames) {
      for (const name of names) {
        const lower = name.toLowerCase();
        if (
          /\b(hosting|host|server|cloud|vps|dedicated|colo|datacenter)\b/.test(lower)
        ) {
          return true;
        }
      }
    }
  } catch {
    // reverse DNS failed — can't determine
  }

  return false;
}

// ── Main Function ──────────────────────────────────────────────

export async function analyzeGeolocation(domain: string): Promise<GeoResult> {
  const findings: ReconFinding[] = [];
  const ipv4: string[] = [];
  const ipv6: string[] = [];

  // SSRF protection
  if (isBlockedDomain(domain)) {
    return {
      domain,
      ipv4: [],
      ipv6: [],
      locations: [],
      cloudProviders: [],
      isBehindCDN: false,
      sharedHosting: false,
      findings: [{
        title: 'Target domain blocked by security policy',
        severity: 'high',
        category: 'infrastructure',
        description: `The domain "${domain}" is on the blocked domain list and cannot be scanned.`,
        evidence: null,
        asset: domain,
        source: 'geo',
      }],
    };
  }

  // ── 1. DNS Resolution ──
  if (looksLikeIP(domain)) {
    if (isPrivateIP(domain)) {
      ipv4.push(domain);
    } else if (isPrivateIPv6(domain)) {
      ipv6.push(domain);
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
      ipv4.push(domain);
    } else {
      ipv6.push(domain);
    }
  } else {
    try {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1', '9.9.9.9']);

      const [v4, v6] = await Promise.all([
        resolver.resolve4(domain).catch(() => [] as string[]),
        resolver.resolve6(domain).catch(() => [] as string[]),
      ]);

      // Filter out private IPs
      ipv4.push(...v4.filter(ip => !isPrivateIP(ip)));
      ipv6.push(...v6.filter(ip => !isPrivateIPv6(ip)));
    } catch {
      // DNS resolution failed
    }
  }

  const allIPs = [...ipv4, ...ipv6];

  if (allIPs.length === 0) {
    return {
      domain,
      ipv4: [],
      ipv6: [],
      locations: [],
      cloudProviders: [],
      isBehindCDN: false,
      sharedHosting: false,
      findings: [{
        title: 'Domain Does Not Resolve',
        severity: 'high',
        category: 'infrastructure',
        description: `The domain "${domain}" does not resolve to any public IP address. It may be offline, using internal-only DNS, or behind a firewall that blocks external resolution.`,
        evidence: null,
        asset: domain,
        source: 'geo',
      }],
    };
  }

  // ── 2. Geolocation Lookup for each IP ──
  const locations: GeoLocation[] = [];
  const geoResults = await Promise.allSettled(
    allIPs.map(ip => queryGeoLocation(ip, 5000)),
  );

  for (const r of geoResults) {
    if (r.status === 'fulfilled') {
      locations.push(r.value);
    }
  }

  // ── 3. Generate Findings ──

  // Per-IP geolocation findings
  for (const loc of locations) {
    const parts = [loc.city, loc.region, loc.country].filter(Boolean);
    const geoStr = parts.join(', ') || 'Unknown location';

    findings.push({
      title: `IP Geolocation: ${loc.ip}`,
      severity: 'info',
      category: 'infrastructure',
      description: `IP ${loc.ip} is located in ${geoStr}. ${loc.isp ? `ISP: ${loc.isp}.` : ''} ${loc.as ? `ASN: ${loc.as}.` : ''} Geographic location can inform attack surface assessment — different jurisdictions have different compliance requirements and threat profiles.`,
      evidence: `${geoStr}${loc.isp ? ` | ${loc.isp}` : ''}${loc.org ? ` | ${loc.org}` : ''}`,
      asset: loc.ip,
      source: 'geo',
    });
  }

  // ── 4. Cloud & CDN Detection ──
  const cloudProvidersSet = new Set<string>();
  let isBehindCDN = false;

  for (const loc of locations) {
    if (loc.cloudProvider) {
      cloudProvidersSet.add(loc.cloudProvider);
      if (isCDN(loc.cloudProvider)) {
        isBehindCDN = true;
      }
    }
  }

  const cloudProviders = Array.from(cloudProvidersSet);

  // Multi-cloud
  if (cloudProviders.length > 1) {
    findings.push({
      title: `Multi-Cloud Infrastructure Detected (${cloudProviders.length} providers)`,
      severity: 'medium',
      category: 'infrastructure',
      description: `The domain resolves to IPs from ${cloudProviders.length} different cloud providers: ${cloudProviders.join(', ')}. Multi-cloud deployments increase complexity and potential misconfiguration risk. Each provider has different security controls, IAM models, and compliance tools.`,
      evidence: cloudProviders.join(', '),
      asset: domain,
      source: 'geo',
    });
  } else if (cloudProviders.length === 1) {
    findings.push({
      title: `Cloud Hosting Detected: ${cloudProviders[0].toUpperCase()}`,
      severity: 'low',
      category: 'infrastructure',
      description: `The domain is hosted on ${cloudProviders[0].toUpperCase()}. Cloud infrastructure offers built-in security features but also introduces shared-responsibility model risks. Ensure cloud security best practices are followed, including proper IAM, network segmentation, and logging.`,
      evidence: locations.find(l => l.cloudProvider === cloudProviders[0])?.isp || cloudProviders[0],
      asset: domain,
      source: 'geo',
    });
  }

  if (isBehindCDN) {
    findings.push({
      title: 'CDN Detected',
      severity: 'info',
      category: 'infrastructure',
      description: `The domain is behind a Content Delivery Network. CDNs provide DDoS protection, performance optimization, and can hide the origin server's IP. However, misconfigured CDN policies can expose the origin IP. Ensure "origin shield" is enabled and real IP is not leaked via headers or DNS.`,
      evidence: cloudProviders.filter(p => isCDN(p)).join(', '),
      asset: domain,
      source: 'geo',
    });
  }

  // ── 5. Shared Hosting Check ──
  const sharedHosting = await checkSharedHosting(allIPs);
  if (sharedHosting) {
    findings.push({
      title: 'Shared Hosting Infrastructure Indicator',
      severity: 'info',
      category: 'infrastructure',
      description: `Reverse DNS records suggest the domain is hosted on shared infrastructure. Shared hosting environments may expose the domain to risks from neighboring tenants, such as IP-based blacklisting affecting multiple customers.`,
      evidence: allIPs.slice(0, 3).join(', '),
      asset: domain,
      source: 'geo',
    });
  }

  // Multiple IPs (load balanced)
  if (allIPs.length > 1) {
    findings.push({
      title: `${allIPs.length} IP Address(es) Resolved (Load Balancing/Anycast)`,
      severity: 'info',
      category: 'infrastructure',
      description: `The domain resolves to ${allIPs.length} IP address(es). This may indicate DNS-based load balancing, anycast routing (common for CDNs), or multi-region deployment. Each IP represents a potential independent attack surface.`,
      evidence: allIPs.join(', '),
      asset: domain,
      source: 'geo',
    });
  }

  return {
    domain,
    ipv4,
    ipv6,
    locations,
    cloudProviders,
    isBehindCDN,
    sharedHosting,
    findings,
  };
}

export { type ReconFinding };
