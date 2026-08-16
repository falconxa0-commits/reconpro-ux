// ─── Real WHOIS / RDAP Domain Registration Lookup ─────────────
// Queries RDAP (Registration Data Access Protocol) over HTTPS,
// with TCP WHOIS fallback on port 43.
// Domain registration data reveals ownership, expiry, and status
// information critical for security assessments.
//
// Services like DomainTools, WhoisXML, and SecurityTrails charge
// $500-$50,000/month for bulk WHOIS intelligence.

import net from 'net';
import type { ReconFinding } from './types';

export interface WHOISResult {
  domain: string;
  registrar?: string;
  createdDate?: string;
  expiryDate?: string;
  nameServers?: string[];
  registrant?: string;
  statusCodes?: string[];
  dnssec?: boolean;
  findings: ReconFinding[];
}

// ── RDAP WHOIS Lookup (HTTP-based, preferred) ──────────────────

interface RDAPResponse {
  ldhName?: string;
  handle?: string;
  status?: string[];
  events?: Array<{ eventAction: string; eventDate: string }>;
  nameservers?: Array<{ ldhName: string }[]>;
  entities?: Array<{
    roles?: string[];
    vcardArray?: unknown[];
    publicIds?: Array<{ type: string; identifier: string }>;
  }>;
  secureDNS?: { delegationSigned: boolean };
  notices?: Array<{ title?: string; description?: string[] }>;
}

async function queryRDAP(domain: string, timeout = 10000): Promise<Partial<WHOISResult>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rdap+json',
        'User-Agent': 'ReconPro-ASM/2.4.1 (Attack Surface Intelligence)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {};
    }

    const data: RDAPResponse = await response.json();
    const result: Partial<WHOISResult> = { domain };

    // Extract registrar from entities with 'registrar' role
    if (data.entities) {
      for (const entity of data.entities) {
        if (entity.roles?.includes('registrar')) {
          // Try vcardArray for organization name
          if (entity.vcardArray && Array.isArray(entity.vcardArray) && entity.vcardArray.length > 1) {
            const props = entity.vcardArray.slice(1);
            for (const prop of props) {
              if (Array.isArray(prop) && prop[0] === 'org' && prop[3]) {
                result.registrar = String(prop[3]);
                break;
              }
            }
          }
          // Try publicIds as fallback
          if (!result.registrar && entity.publicIds?.length) {
            result.registrar = entity.publicIds[0].identifier;
          }
        }

        // Extract registrant
        if (entity.roles?.includes('registrant')) {
          if (entity.vcardArray && Array.isArray(entity.vcardArray) && entity.vcardArray.length > 1) {
            const props = entity.vcardArray.slice(1);
            for (const prop of props) {
              if (Array.isArray(prop) && prop[0] === 'org' && prop[3]) {
                result.registrant = String(prop[3]);
                break;
              }
              if (Array.isArray(prop) && prop[0] === 'fn' && prop[3]) {
                result.registrant = String(prop[3]);
                break;
              }
            }
          }
        }
      }
    }

    // Extract dates from events
    if (data.events) {
      for (const event of data.events) {
        const action = event.eventAction.toLowerCase();
        if (action === 'registration' || action === 'creation') {
          result.createdDate = event.eventDate;
        } else if (action === 'expiration' || action === 'expiry') {
          result.expiryDate = event.eventDate;
        }
      }
    }

    // Extract name servers
    if (data.nameservers) {
      result.nameServers = data.nameservers
        .map(ns => {
          // nameservers entries can be arrays or direct objects
          if (Array.isArray(ns)) {
            const nsObj = ns[0] as { ldhName?: string } | undefined;
            return nsObj?.ldhName;
          }
          return (ns as { ldhName?: string }).ldhName;
        })
        .filter((ns): ns is string => typeof ns === 'string' && ns.length > 0);
    }

    // Extract status codes
    if (data.status) {
      result.statusCodes = data.status;
    }

    // DNSSEC
    if (data.secureDNS) {
      result.dnssec = data.secureDNS.delegationSigned;
    }

    return result;
  } catch {
    clearTimeout(timer);
    return {};
  }
}

// ── TCP WHOIS Fallback (port 43) ───────────────────────────────

async function queryWHOISTCP(domain: string, timeout = 10000): Promise<Partial<WHOISResult>> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({});
    }, timeout);

    let data = '';

    socket.connect(43, 'whois.iana.org', () => {
      socket.write(`${domain}\r\n`);
    });

    socket.on('data', (chunk) => {
      data += chunk.toString('utf-8');
    });

    socket.on('end', () => {
      clearTimeout(timer);
      resolve(parseWHOISText(data, domain));
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({});
    });
  });
}

function parseWHOISText(text: string, domain: string): Partial<WHOISResult> {
  const result: Partial<WHOISResult> = { domain };
  const lines = text.split('\n');
  const nameServers: string[] = [];
  const statusCodes: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%') || trimmed.startsWith('#') || trimmed.startsWith('>')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (key === 'registrar' || key === 'registrar organization' || key === 'sponsoring registrar') {
      result.registrar = value;
    } else if (key === 'creation date' || key === 'created' || key === 'registered on' || key === 'registration time') {
      result.createdDate = value;
    } else if (key === 'registry expiry date' || key === 'expiry date' || key === 'expires on' || key === 'expiration time') {
      result.expiryDate = value;
    } else if (key === 'registrar abuse contact email' || key === 'registrar abuse contact phone') {
      // Skip contact info, not needed
    } else if (key === 'name server' || key === 'nserver' || key === 'dns') {
      const ns = value.toLowerCase().replace(/\.$/, '');
      if (ns.includes('.')) nameServers.push(ns);
    } else if (key === 'domain status' || key === 'status') {
      // Extract status code (first word before space)
      const codeMatch = value.match(/^([a-zA-Z]+(?: [a-zA-Z]+)?)/);
      if (codeMatch) statusCodes.push(codeMatch[1].trim());
    } else if (key === 'registrant organization' || key === 'registrant' || key === 'organisation') {
      result.registrant = value;
    } else if (key === 'dnssec') {
      result.dnssec = value.toLowerCase() !== 'unsigned' && value.toLowerCase() !== 'no';
    }
  }

  if (nameServers.length > 0) result.nameServers = nameServers;
  if (statusCodes.length > 0) result.statusCodes = statusCodes;

  return result;
}

// ── Findings Generation ─────────────────────────────────────────

function generateFindings(data: Partial<WHOISResult>, domain: string): ReconFinding[] {
  const findings: ReconFinding[] = [];

  // Check if we got any data at all
  const hasData = data.registrar || data.createdDate || data.expiryDate ||
    (data.nameServers && data.nameServers.length > 0);

  if (!hasData) {
    findings.push({
      title: 'WHOIS/RDAP Lookup Failed',
      severity: 'info',
      category: 'dns',
      description: `Could not retrieve WHOIS/RDAP registration data for ${domain}. The domain may use privacy services, the registry may not support RDAP, or the query was blocked. Try alternative WHOIS servers for more data.`,
      evidence: null,
      asset: domain,
      source: 'whois',
    });
    return findings;
  }

  // INFO: Domain registration details found
  const details: string[] = [];
  if (data.registrar) details.push(`Registrar: ${data.registrar}`);
  if (data.createdDate) details.push(`Created: ${data.createdDate}`);
  if (data.expiryDate) details.push(`Expires: ${data.expiryDate}`);
  if (data.nameServers && data.nameServers.length > 0) details.push(`NS: ${data.nameServers.join(', ')}`);

  findings.push({
    title: 'Domain Registration Details Retrieved',
    severity: 'info',
    category: 'dns',
    description: `WHOIS/RDAP lookup succeeded. ${details.join(' | ')}. Domain registration data provides intelligence about the domain owner, infrastructure, and lifecycle. Expired or misconfigured domains can be taken over by attackers.`,
    evidence: details.join(' | ') || null,
    asset: domain,
    source: 'whois',
  });

  // Expiry analysis
  if (data.expiryDate) {
    const expiryDate = new Date(data.expiryDate);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      findings.push({
        title: 'Domain Has EXPIRED',
        severity: 'critical',
        category: 'dns',
        description: `The domain registration expired ${Math.abs(daysUntilExpiry)} day(s) ago. Expired domains can be purchased by attackers to impersonate the organization, intercept emails, or host phishing sites. This is an immediate security risk.`,
        evidence: `Expired: ${data.expiryDate} (${Math.abs(daysUntilExpiry)} days ago)`,
        asset: domain,
        source: 'whois',
      });
    } else if (daysUntilExpiry <= 30) {
      findings.push({
        title: `Domain Expiring in ${daysUntilExpiry} Days`,
        severity: 'high',
        category: 'dns',
        description: `The domain registration expires in ${daysUntilExpiry} day(s). Immediate renewal is required. Lapsed domains can be purchased by third parties, leading to brand impersonation, email interception, and supply chain attacks.`,
        evidence: `Expiry: ${data.expiryDate}`,
        asset: domain,
        source: 'whois',
      });
    } else if (daysUntilExpiry <= 90) {
      findings.push({
        title: `Domain Expiring in ${daysUntilExpiry} Days`,
        severity: 'medium',
        category: 'dns',
        description: `The domain registration expires in ${daysUntilExpiry} day(s). Plan renewal soon. Domains that lapse even briefly can be sniped by domain investors or attackers. Consider enabling auto-renewal with the registrar.`,
        evidence: `Expiry: ${data.expiryDate}`,
        asset: domain,
        source: 'whois',
      });
    }
  }

  // Status code analysis
  if (data.statusCodes && data.statusCodes.length > 0) {
    const holdStatuses = data.statusCodes.filter(
      s => s.toLowerCase().includes('clienthold') || s.toLowerCase().includes('serverhold')
    );

    if (holdStatuses.length > 0) {
      findings.push({
        title: 'Domain in HOLD Status',
        severity: 'critical',
        category: 'dns',
        description: `The domain has hold status codes: ${holdStatuses.join(', ')}. Domains in clientHold/serverHold status are suspended and do not resolve in DNS. This may indicate billing issues, disputes, or compliance actions. A suspended domain can be targeted for takeover.`,
        evidence: `Status: ${holdStatuses.join(', ')}`,
        asset: domain,
        source: 'whois',
      });
    }

    // Check for other notable statuses
    const otherNotable = data.statusCodes.filter(s => {
      const lower = s.toLowerCase();
      return lower.includes('pendingdelete') || lower.includes('redemptionperiod');
    });
    if (otherNotable.length > 0) {
      findings.push({
        title: 'Domain in Pending Deletion / Redemption',
        severity: 'high',
        category: 'dns',
        description: `The domain has special status codes: ${otherNotable.join(', ')}. These statuses indicate the domain is in the deletion process. PendingDelete and RedemptionPeriod domains will be released for registration and can be claimed by anyone.`,
        evidence: `Status: ${otherNotable.join(', ')}`,
        asset: domain,
        source: 'whois',
      });
    }
  }

  // Privacy protection detection
  if (data.registrant) {
    const privacyPatterns = /privacy|gdpr|redacted|whoisguard|domains by proxy|identity protect|disclosed|statutory|protected/i;
    if (privacyPatterns.test(data.registrant)) {
      findings.push({
        title: 'WHOIS Privacy Protection Detected',
        severity: 'low',
        category: 'dns',
        description: `The registrant information is protected by a privacy service (${data.registrant}). While this reduces social engineering risk from exposed contact data, it also means legitimate security researchers cannot contact the domain owner to report vulnerabilities.`,
        evidence: `Registrant: ${data.registrant}`,
        asset: domain,
        source: 'whois',
      });
    }
  }

  // DNSSEC
  if (data.dnssec === true) {
    findings.push({
      title: 'DNSSEC Enabled',
      severity: 'info',
      category: 'dns',
      description: 'DNSSEC is enabled for this domain. DNSSEC provides cryptographic authentication of DNS responses, protecting against DNS cache poisoning and spoofing attacks. This is a positive security indicator.',
      evidence: 'DNSSEC: signed',
      asset: domain,
      source: 'whois',
    });
  }

  return findings;
}

/**
 * Enumerate WHOIS registration data for a domain using RDAP protocol
 * with TCP WHOIS fallback on port 43.
 *
 * @param domain - The domain to look up (e.g., "example.com")
 * @returns WHOISResult containing registration details and security findings
 */
export async function enumerateWHOIS(domain: string): Promise<WHOISResult> {
  // Try RDAP first (HTTP-based, no shell commands)
  let data = await queryRDAP(domain, 10000);

  // If RDAP returned no useful data, fall back to TCP WHOIS
  const hasData = data.registrar || data.createdDate || data.expiryDate ||
    (data.nameServers && data.nameServers.length > 0);

  if (!hasData) {
    const whoisData = await queryWHOISTCP(domain, 10000);
    // Merge: RDAP fields take precedence, WHOIS fills in gaps
    data = { ...whoisData, ...data, domain };
  }

  const findings = generateFindings(data, domain);

  return {
    domain,
    registrar: data.registrar,
    createdDate: data.createdDate,
    expiryDate: data.expiryDate,
    nameServers: data.nameServers,
    registrant: data.registrant,
    statusCodes: data.statusCodes,
    dnssec: data.dnssec,
    findings,
  };
}

export { type ReconFinding };
