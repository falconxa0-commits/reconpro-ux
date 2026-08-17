// ─── Real DNS Record Enumeration ──────────────────────────────────
// Performs actual DNS lookups using Node.js dns.promises module.
// This is the same technique used by SecurityTrails, DNSDumpster, etc.
// Companies charge $500-$50,000/month for bulk DNS intelligence.

import dns from 'dns/promises';
import type { DNSResult, DNSRecord, ReconFinding } from './types';

const DNS_TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'] as const;

const SECURITY_TXT_PATTERNS = [
  /v=spf1/i,
  /google-site-verification/i,
  /dmarc/i,
  /_dmarc/i,
  /domain-verification/i,
  /verify-domain/i,
  /ownership-verification/i,
  /ms=ms\/ies/i,
  /include:_spf/i,
  /redirect=_dmarc/i,
];

function classifyTXT(record: DNSRecord): { findings: ReconFinding[]; isSecurityRelated: boolean } {
  const findings: ReconFinding[] = [];
  let isSecurityRelated = false;

  const val = record.value.toLowerCase();

  // SPF records
  if (val.includes('v=spf1')) {
    isSecurityRelated = true;
    if (val.includes('+all') || val.includes('?all')) {
      findings.push({
        title: 'Weak SPF Policy - Allows All Senders',
        severity: 'high',
        category: 'dns',
        description: 'The SPF record uses +all or ?all which effectively allows any mail server to send email on behalf of this domain. This weakens email spoofing protection and makes the domain vulnerable to phishing attacks.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    } else if (val.includes('~all')) {
      findings.push({
        title: 'SPF Record Present (SoftFail)',
        severity: 'low',
        category: 'dns',
        description: 'SPF record uses ~all (SoftFail). While this provides some protection, receivers may still accept emails from unauthorized servers. Consider using -all (HardFail) for stricter enforcement.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    } else if (val.includes('-all')) {
      findings.push({
        title: 'SPF Record Present (HardFail)',
        severity: 'info',
        category: 'dns',
        description: 'SPF record is properly configured with -all (HardFail). This provides strong protection against email spoofing and unauthorized senders.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    } else {
      findings.push({
        title: 'SPF Record Without Explicit All Mechanism',
        severity: 'medium',
        category: 'dns',
        description: 'SPF record exists but does not have an explicit "all" mechanism. This means the SPF policy is incomplete and may not provide adequate protection against email spoofing.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    }
  }

  // DMARC
  if (val.includes('v=dmarc1')) {
    isSecurityRelated = true;
    if (val.includes('p=reject')) {
      findings.push({
        title: 'DMARC Policy: Reject (Strong Protection)',
        severity: 'info',
        category: 'dns',
        description: 'DMARC is configured with p=reject, the strongest policy. Emails that fail DMARC authentication will be rejected by receiving servers, providing maximum protection against domain spoofing.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    } else if (val.includes('p=quarantine')) {
      findings.push({
        title: 'DMARC Policy: Quarantine (Moderate Protection)',
        severity: 'low',
        category: 'dns',
        description: 'DMARC is configured with p=quarantine. Failing emails are sent to spam/junk rather than rejected. Consider upgrading to p=reject for full protection.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    } else {
      findings.push({
        title: 'DMARC Record Without Strong Policy',
        severity: 'medium',
        category: 'dns',
        description: 'DMARC record exists but does not use p=reject or p=quarantine. The domain may still be vulnerable to email-based attacks using spoofed sender addresses.',
        evidence: record.value,
        asset: record.name,
        source: 'dns',
      });
    }
  }

  // Google/site verification records
  if (val.includes('google-site-verification') || val.includes('domain-verification')) {
    findings.push({
      title: 'Domain Verification Record Detected',
      severity: 'info',
      category: 'dns',
      description: 'A domain verification TXT record was found. This is typically used for third-party service ownership verification (e.g., Google Search Console, Cloudflare, etc.).',
      evidence: record.value.length > 120 ? record.value.slice(0, 120) + '...' : record.value,
      asset: record.name,
      source: 'dns',
    });
  }

  // Generic security TXT (RFC 9116)
  if (record.name === '_security' || record.name.endsWith('._security')) {
    isSecurityRelated = true;
    findings.push({
      title: 'Security TXT Record Present',
      severity: 'info',
      category: 'dns',
      description: 'A security.txt DNS record was found following RFC 9116. This is used to publish security contact information and policy for security researchers.',
      evidence: record.value,
      asset: record.name,
      source: 'dns',
    });
  }

  return { findings, isSecurityRelated };
}

export async function enumerateDNS(domain: string, timeout = 5000): Promise<DNSResult> {
  const start = Date.now();
  const records: DNSRecord[] = [];
  const allFindings: ReconFinding[] = [];

  // Resolve each DNS record type concurrently with individual timeouts
  const promises = DNS_TYPES.map(async (recordType) => {
    try {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1', '9.9.9.9']);

      // Timeout wrapper
      const result = await Promise.race([
        (async () => {
          switch (recordType) {
            case 'A':
              return (await resolver.resolve4(domain)).map(r => ({ type: 'A' as const, name: domain, value: r, ttl: 300 }));
            case 'AAAA':
              return (await resolver.resolve6(domain)).map(r => ({ type: 'AAAA' as const, name: domain, value: r, ttl: 300 }));
            case 'MX':
              return (await resolver.resolveMx(domain)).map(r => ({ type: 'MX' as const, name: domain, value: `${r.exchange} (priority: ${r.priority})`, ttl: 300 }));
            case 'NS':
              return (await resolver.resolveNs(domain)).map(r => ({ type: 'NS' as const, name: domain, value: r, ttl: 300 }));
            case 'TXT':
              return (await resolver.resolveTxt(domain)).map(r => ({ type: 'TXT' as const, name: domain, value: r.join(''), ttl: 300 }));
            case 'CNAME':
              try {
                const cnames = await resolver.resolveCname(domain);
                return cnames.map(r => ({ type: 'CNAME' as const, name: domain, value: r, ttl: 300 }));
              } catch {
                return [] as DNSRecord[];
              }
            case 'SOA':
              try {
                const soa = await resolver.resolveSoa(domain);
                return [{ type: 'SOA' as const, name: domain, value: `${soa.nsname} (${soa.hostmaster}, serial: ${soa.serial})`, ttl: soa.refresh || 300 }];
              } catch {
                return [] as DNSRecord[];
              }
          }
        })(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), timeout)),
      ]);

      return result;
    } catch {
      return [];
    }
  });

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      records.push(...r.value);
    }
  }

  // Analyze records and generate findings
  // A/AAAA records
  const aRecords = records.filter(r => r.type === 'A');
  const aaaaRecords = records.filter(r => r.type === 'AAAA');

  if (aRecords.length > 0) {
    allFindings.push({
      title: `${aRecords.length} IPv4 Address(es) Resolved`,
      severity: 'info',
      category: 'dns',
      description: `The domain resolves to ${aRecords.length} IPv4 address(es). Multiple addresses may indicate load balancing, CDN usage, or failover configuration. Each IP address represents a potential attack surface entry point.`,
      evidence: aRecords.map(r => r.value).join(', '),
      asset: domain,
      source: 'dns',
    });
  }

  if (aaaaRecords.length > 0) {
    allFindings.push({
      title: `${aaaaRecords.length} IPv6 Address(es) Resolved`,
      severity: 'info',
      category: 'dns',
      description: `The domain has IPv6 support enabled via ${aaaaRecords.length} address(es). IPv6 connectivity expands the attack surface and requires separate security consideration as IPv6 networks often have different security configurations.`,
      evidence: aaaaRecords.map(r => r.value).join(', '),
      asset: domain,
      source: 'dns',
    });
  }

  // MX records
  const mxRecords = records.filter(r => r.type === 'MX');
  if (mxRecords.length > 0) {
    const mxValues = mxRecords.map(r => r.value).join(', ');
    allFindings.push({
      title: `${mxRecords.length} Mail Server(s) Configured`,
      severity: 'info',
      category: 'dns',
      description: `MX records point to ${mxRecords.length} mail server(s). Mail servers are high-value targets for phishing, spam relay, and credential harvesting attacks. Ensure SPF, DKIM, and DMARC are properly configured for each.`,
      evidence: mxValues,
      asset: domain,
      source: 'dns',
    });
  } else {
    allFindings.push({
      title: 'No MX Records Found',
      severity: 'info',
      category: 'dns',
      description: 'No MX records are configured for this domain. This means the domain cannot receive email, which eliminates email-based attack vectors but may also indicate the domain is not a primary business domain.',
      evidence: null,
      asset: domain,
      source: 'dns',
    });
  }

  // NS records
  const nsRecords = records.filter(r => r.type === 'NS');
  if (nsRecords.length > 0) {
    allFindings.push({
      title: `${nsRecords.length} Name Server(s) Configured`,
      severity: 'info',
      category: 'dns',
      description: `The domain uses ${nsRecords.length} name server(s). The DNS infrastructure is a critical component - compromised or misconfigured nameservers can lead to DNS hijacking, cache poisoning, or zone transfer attacks.`,
      evidence: nsRecords.map(r => r.value).join(', '),
      asset: domain,
      source: 'dns',
    });

    // Check if NS records are from well-known providers
    const nsValues = nsRecords.map(r => r.value.toLowerCase());
    const knownProviders = ['cloudflare', 'awsdns', 'google', 'azure', 'dynect', 'ns1.com', 'verisign'];
    const isUsingKnownProvider = nsValues.some(v => knownProviders.some(p => v.includes(p)));
    if (!isUsingKnownProvider) {
      allFindings.push({
        title: 'Self-Hosted or Unrecognized DNS Provider',
        severity: 'low',
        category: 'dns',
        description: 'The nameservers do not appear to belong to a major DNS provider. Self-hosted DNS may lack DDoS protection, anycast routing, and other security features provided by managed DNS services.',
        evidence: nsRecords.map(r => r.value).join(', '),
        asset: domain,
        source: 'dns',
      });
    }
  }

  // TXT records
  const txtRecords = records.filter(r => r.type === 'TXT');
  for (const txt of txtRecords) {
    const { findings } = classifyTXT(txt);
    allFindings.push(...findings);

    // Check if it's a security-related TXT but didn't match known patterns
    const hasSecurityPattern = SECURITY_TXT_PATTERNS.some(p => p.test(txt.value));
    if (!hasSecurityPattern && txt.value.length > 20) {
      allFindings.push({
        title: 'TXT Record Detected',
        severity: 'info',
        category: 'dns',
        description: `A TXT record was found which may contain domain verification, DKIM configuration, or other service-specific data. TXT records can reveal information about third-party services connected to the domain.`,
        evidence: txt.value.length > 150 ? txt.value.slice(0, 150) + '...' : txt.value,
        asset: txt.name,
        source: 'dns',
      });
    }
  }

  // Check for missing DMARC
  const hasDMARC = txtRecords.some(r => r.value.toLowerCase().includes('v=dmarc1'));
  if (!hasDMARC && mxRecords.length > 0) {
    allFindings.push({
      title: 'DMARC Record Not Configured',
      severity: 'medium',
      category: 'dns',
      description: 'No DMARC record was found. Without DMARC, the domain is vulnerable to email spoofing and phishing attacks. Attackers can forge emails from this domain without detection. Implement DMARC with p=reject policy.',
      evidence: null,
      asset: `_dmarc.${domain}`,
      source: 'dns',
    });
  }

  // Check for missing SPF
  const hasSPF = txtRecords.some(r => r.value.toLowerCase().includes('v=spf1'));
  if (!hasSPF && mxRecords.length > 0) {
    allFindings.push({
      title: 'SPF Record Not Configured',
      severity: 'high',
      category: 'dns',
      description: 'No SPF record was found for this domain. SPF is essential for preventing email spoofing. Without it, any mail server can claim to send email on behalf of this domain. This is a critical email security gap.',
      evidence: null,
      asset: domain,
      source: 'dns',
    });
  }

  return {
    type: 'dns',
    success: records.length > 0,
    domain,
    records,
    duration: Date.now() - start,
    // @ts-expect-error -- extra field for convenience, not in strict type
    findings: allFindings,
  };
}

export { type ReconFinding };