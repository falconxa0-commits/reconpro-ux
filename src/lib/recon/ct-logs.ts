// ─── Real Certificate Transparency Log Discovery ────────────────
// Queries crt.sh (Certificate Transparency logs operated by Sectigo)
// to discover subdomains. This is the #1 technique used by
// SecurityTrails, Sublist3r, and Assetnote for subdomain enumeration.
// CT logs are MANDATORY for all publicly-trusted certificates (RFC 6962).
//
// Companies charge $500-$50,000/month for this data. We query it live.

import type { CTLogResult, ReconFinding } from './types';

interface CRTshEntry {
  name_value: string;
  common_name: string;
  issuer_name: string;
  not_before: string;
  not_after: string;
}

export async function queryCTLogs(domain: string, timeout = 10000): Promise<CTLogResult> {
  const start = Date.now();

  try {
    // Query crt.sh API for all certificates matching this domain
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json&exclude=expired`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ReconPro-ASM/2.4.1 (Attack Surface Intelligence)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        type: 'ct',
        success: false,
        domain,
        subdomains: [],
        totalCertificates: 0,
        duration: Date.now() - start,
      };
    }

    const data: CRTshEntry[] = await response.json();

    // Parse and deduplicate subdomains
    const subdomainSet = new Set<string>();

    for (const entry of data) {
      // name_value can contain multiple names separated by newlines
      const names = entry.name_value.split('\n').map(n => n.trim().toLowerCase()).filter(Boolean);

      for (const name of names) {
        // Skip the root domain itself and wildcards
        if (name === domain || name === `*.${domain}` || name === '*.' + domain) continue;
        if (name.endsWith(`.${domain}`) || name === domain) {
          subdomainSet.add(name);
        }
      }
    }

    const subdomains = Array.from(subdomainSet).sort();

    return {
      type: 'ct',
      success: true,
      domain,
      subdomains,
      totalCertificates: data.length,
      duration: Date.now() - start,
    };
  } catch (err) {
    // Timeout or network error - return gracefully
    return {
      type: 'ct',
      success: false,
      domain,
      subdomains: [],
      totalCertificates: 0,
      duration: Date.now() - start,
    };
  }
}

// ── Convert CT results to ReconFindings ─────────────────────────

export function ctToFindings(result: CTLogResult, domain: string): ReconFinding[] {
  const findings: ReconFinding[] = [];

  if (!result.success || result.subdomains.length === 0) {
    findings.push({
      title: 'No CT Log Subdomains Found',
      severity: 'info',
      category: 'subdomain',
      description: 'No additional subdomains were found in Certificate Transparency logs. This could mean the domain has a minimal digital footprint, or CT log query was unavailable.',
      evidence: null,
      asset: domain,
      source: 'ct',
    });
    return findings;
  }

  // Summary finding
  findings.push({
    title: `${result.subdomains.length} Subdomains Discovered via CT Logs`,
    severity: result.subdomains.length > 50 ? 'high' : result.subdomains.length > 20 ? 'medium' : 'info',
    category: 'subdomain',
    description: `Certificate Transparency logs reveal ${result.subdomains.length} unique subdomains across ${result.totalCertificates} certificates. Each subdomain represents a potential attack surface entry point. Subdomains are often less secured than the main domain and can be forgotten during security hardening. This is the same data used by attackers during the reconnaissance phase.`,
    evidence: `Source: crt.sh | ${result.totalCertificates} certificates analyzed in ${result.duration}ms`,
    asset: domain,
    source: 'ct',
  });

  // Individual subdomain findings (top 30 to avoid flooding)
  const displaySubs = result.subdomains.slice(0, 30);
  for (const sub of displaySubs) {
    // Classify subdomain risk based on common patterns
    let severity = 'info';
    let desc = `Subdomain discovered in Certificate Transparency logs. This subdomain has been issued a publicly-trusted SSL certificate, confirming it is or was an active internet-facing service.`;

    const subLower = sub.toLowerCase();

    // High-risk subdomain patterns
    if (/\b(staging|dev|test|uat|pre|preprod|internal|local|sandbox)\b/i.test(subLower)) {
      severity = 'high';
      desc = `HIGH-RISK: This appears to be a non-production environment subdomain (${sub}). Non-production environments often have weaker security controls, debug modes enabled, or test data. If accessible from the internet, they represent a significant attack vector.`;
    } else if (/\b(admin|manage|dashboard|panel|control|cpanel|whm|plesk|webmin)\b/i.test(subLower)) {
      severity = 'high';
      desc = `HIGH-RISK: This appears to be an administrative interface subdomain (${sub}). Admin panels are prime targets for brute-force attacks, credential stuffing, and privilege escalation. They should be protected by IP allowlisting, MFA, and VPN access.`;
    } else if (/\b(api|graphql|rest|gateway)\b/i.test(subLower)) {
      severity = 'medium';
      desc = `MEDIUM-RISK: This appears to be an API endpoint subdomain (${sub}). APIs often have different authentication mechanisms than the main site and may expose sensitive data or functionality if not properly secured.`;
    } else if (/\b(mail|smtp|pop|imap|mx|email)\b/i.test(subLower)) {
      severity = 'medium';
      desc = `This appears to be a mail-related subdomain (${sub}). Mail servers are targets for phishing campaigns, spoofing attacks, and credential harvesting. Verify SPF, DKIM, and DMARC are properly configured.`;
    } else if (/\b(vpn|remote|rdp|ssh|ftp|sftp|ssh)\b/i.test(subLower)) {
      severity = 'high';
      desc = `HIGH-RISK: This appears to be a remote access subdomain (${sub}). VPN and remote access gateways are high-value targets. Ensure strong authentication, MFA, and rate limiting are enforced.`;
    } else if (/\b(db|database|mysql|postgres|mongo|redis)\b/i.test(subLower)) {
      severity = 'critical';
      desc = `CRITICAL: This appears to be a database-related subdomain (${sub}). Exposing database services directly to the internet is extremely dangerous. If this subdomain resolves to a publicly accessible database, it may lead to full data compromise.`;
    } else if (/\b(shop|store|pay|checkout|billing|invoice)\b/i.test(subLower)) {
      severity = 'medium';
      desc = `This appears to be a commerce-related subdomain (${sub}). E-commerce endpoints handle payment data and must comply with PCI-DSS. Ensure proper encryption, tokenization, and access controls.`;
    }

    findings.push({
      title: `Subdomain: ${sub}`,
      severity,
      category: 'subdomain',
      description: desc,
      evidence: null,
      asset: sub,
      source: 'ct',
    });
  }

  // If there are more, add a note
  if (result.subdomains.length > 30) {
    findings.push({
      title: `${result.subdomains.length - 30} Additional Subdomains Not Shown`,
      severity: 'info',
      category: 'subdomain',
      description: `${result.subdomains.length - 30} more subdomains were discovered beyond the 30 displayed. Upgrade to view all discovered subdomains and their individual risk assessments.`,
      evidence: null,
      asset: domain,
      source: 'ct',
    });
  }

  return findings;
}

export { type ReconFinding };