// ─── Comprehensive Certificate Analysis ───────────────────────
// Goes beyond basic SSL checks to analyze CT log certificates,
// TLS protocol/cipher details, certificate chain, and historical
// certificate patterns.

import tls from 'tls';
import dns from 'dns/promises';
import { queryCTLogs } from './ct-logs';
import { isPrivateIP, isPrivateIPv6, isBlockedDomain, looksLikeIP } from '@/lib/api-security';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────

export interface CertInfo {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  sans: string[];
  isSelfSigned: boolean;
  isWildcard: boolean;
}

export interface CertResult {
  domain: string;
  currentCert: CertInfo | null;
  historicalCerts: CertInfo[];
  totalCertsFound: number;
  uniqueIssuers: string[];
  recentCerts: CertInfo[];
  protocolVersion?: string;
  cipherSuite?: string;
  chainDepth?: number;
  findings: ReconFinding[];
}

// ── Helpers ────────────────────────────────────────────────────

function parseASN1Date(dateStr: string): Date | null {
  try {
    const cleaned = dateStr.replace(/\s/g, '');
    if (cleaned.length === 13) {
      const year = parseInt(cleaned.slice(0, 2));
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      const isoStr = `${fullYear}${cleaned.slice(2)}`;
      return new Date(isoStr.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
    }
    if (cleaned.length === 15) {
      return new Date(cleaned.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
    }
    return new Date(dateStr);
  } catch {
    return null;
  }
}

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function extractSans(cert: tls.PeerCertificate): string[] {
  try {
    if (!cert.subjectaltname) return [];
    return cert.subjectaltname
      .split(', ')
      .map(s => s.replace(/^(DNS:|IP Address:|email:)/, '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function peerCertToCertInfo(cert: tls.PeerCertificate, isSelfSigned: boolean): CertInfo {
  const sans = extractSans(cert);
  return {
    issuer: cert.issuer.O || cert.issuer.CN || 'Unknown',
    subject: cert.subject.CN || cert.subject.O || 'Unknown',
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    serialNumber: cert.serialNumber || 'N/A',
    sans,
    isSelfSigned,
    isWildcard: sans.some(s => s.startsWith('*.')),
  };
}

interface TLSConnectInfo {
 cert: tls.PeerCertificate;
 authorized: boolean;
 authorizationError?: Error;
 protocol?: string;
 cipher?: { name: string; version: string; standardName?: string };
}

function connectTLS(
  domain: string,
  port = 443,
  timeout = 7000,
): Promise<TLSConnectInfo | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, timeout);

    const socket = tls.connect(port, domain, {
      servername: domain,
      rejectUnauthorized: false,
    }, () => {
      clearTimeout(timer);
      const result: TLSConnectInfo = {
        cert: socket.getPeerCertificate(),
        authorized: socket.authorized,
        authorizationError: socket.authorizationError || undefined,
        protocol: socket.getProtocol() ?? undefined,
        cipher: socket.getCipher(),
      };
      socket.destroy();
      resolve(result);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(null);
    });
  });
}

// ── Main Function ──────────────────────────────────────────────

export async function analyzeCertificates(domain: string): Promise<CertResult> {
  const findings: ReconFinding[] = [];
  let currentCert: CertInfo | null = null;
  let protocolVersion: string | undefined;
  let cipherSuite: string | undefined;
  let chainDepth: number | undefined;

  // SSRF protection
  if (isBlockedDomain(domain)) {
    return {
      domain,
      currentCert: null,
      historicalCerts: [],
      totalCertsFound: 0,
      uniqueIssuers: [],
      recentCerts: [],
      findings: [{
        title: 'Target domain blocked by security policy',
        severity: 'high',
        category: 'ssl',
        description: `The domain "${domain}" is on the blocked domain list and cannot be scanned.`,
        evidence: null,
        asset: domain,
        source: 'cert',
      }],
    };
  }

  if (looksLikeIP(domain)) {
    if (isPrivateIP(domain) || isPrivateIPv6(domain)) {
      return {
        domain,
        currentCert: null,
        historicalCerts: [],
        totalCertsFound: 0,
        uniqueIssuers: [],
        recentCerts: [],
        findings: [{
          title: 'Private/reserved IP addresses cannot be scanned',
          severity: 'high',
          category: 'ssl',
          description: `The IP address "${domain}" is private or reserved.`,
          evidence: null,
          asset: domain,
          source: 'cert',
        }],
      };
    }
  } else {
    // DNS validation
    try {
      const [v4, v6] = await Promise.all([
        dns.resolve4(domain).catch(() => [] as string[]),
        dns.resolve6(domain).catch(() => [] as string[]),
      ]);
      if (v4.some(ip => isPrivateIP(ip)) || v6.some(ip => isPrivateIPv6(ip))) {
        return {
          domain,
          currentCert: null,
          historicalCerts: [],
          totalCertsFound: 0,
          uniqueIssuers: [],
          recentCerts: [],
          findings: [{
            title: 'Domain resolves to private IP',
            severity: 'high',
            category: 'ssl',
            description: `The domain "${domain}" resolves to a private or reserved IP address and cannot be scanned.`,
            evidence: null,
            asset: domain,
            source: 'cert',
          }],
        };
      }
      if (v4.length === 0 && v6.length === 0) {
        return {
          domain,
          currentCert: null,
          historicalCerts: [],
          totalCertsFound: 0,
          uniqueIssuers: [],
          recentCerts: [],
          findings: [{
            title: 'Domain does not resolve',
            severity: 'high',
            category: 'ssl',
            description: `The domain "${domain}" does not resolve to any IP address.`,
            evidence: null,
            asset: domain,
            source: 'cert',
          }],
        };
      }
    } catch {
      return {
        domain,
        currentCert: null,
        historicalCerts: [],
        totalCertsFound: 0,
        uniqueIssuers: [],
        recentCerts: [],
        findings: [{
          title: 'DNS resolution failed',
          severity: 'high',
          category: 'ssl',
          description: `Could not resolve "${domain}" for certificate analysis.`,
          evidence: null,
          asset: domain,
          source: 'cert',
        }],
      };
    }
  }

  // ── 1. CT Log Discovery ──
  const ctResult = await queryCTLogs(domain, 10000);

  interface RawCTEntry {
    issuer_name?: string;
    common_name?: string;
    not_before?: string;
    not_after?: string;
    name_value?: string;
  }

  let rawEntries: RawCTEntry[] = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const ctUrl = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
    const ctResp = await fetch(ctUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (ctResp.ok) {
      rawEntries = await ctResp.json().catch(() => [] as RawCTEntry[]);
    }
  } catch {
    rawEntries = [];
  }

  // Build historical certs from CT data
  const historicalCerts: CertInfo[] = [];
  const issuerSet = new Set<string>();
  const recentCerts: CertInfo[] = [];
  const seenSerials = new Set<string>();

  for (const entry of rawEntries) {
    const serial = entry.common_name || entry.issuer_name || '';
    // Simple dedup by issuer + common_name combo
    const dedupKey = `${entry.issuer_name || ''}|${entry.common_name || ''}|${entry.not_before || ''}`;
    if (seenSerials.has(dedupKey)) continue;
    seenSerials.add(dedupKey);

    const sans: string[] = [];
    if (entry.name_value) {
      const names = entry.name_value.split('\n').map(n => n.trim()).filter(Boolean);
      for (const name of names) {
        if (!sans.includes(name)) sans.push(name);
      }
    }

    const issuer = entry.issuer_name || 'Unknown';
    issuerSet.add(issuer);

    const isSelfSigned = issuer.toLowerCase().includes(entry.common_name?.toLowerCase() || '');
    const isWildcard = sans.some(s => s.startsWith('*.'));

    const validTo = entry.not_after ? parseASN1Date(entry.not_after) : null;
    const isRecent = validTo
      ? (Date.now() - validTo.getTime()) < 30 * 24 * 60 * 60 * 1000 && daysUntil(validTo) > -90
      : false;

    const cert: CertInfo = {
      issuer,
      subject: entry.common_name || 'Unknown',
      validFrom: entry.not_before || 'Unknown',
      validTo: entry.not_after || 'Unknown',
      serialNumber: 'N/A',
      sans,
      isSelfSigned,
      isWildcard,
    };

    historicalCerts.push(cert);
    if (isRecent) recentCerts.push(cert);
  }

  // ── 2. TLS Connection Analysis ──
  const tlsResult = await connectTLS(domain, 443, 7000);

  if (tlsResult && tlsResult.cert && tlsResult.cert.subject) {
    const cert = tlsResult.cert;
    const isSelfSigned = !!(!tlsResult.authorized && (
      tlsResult.authorizationError?.message.includes('self signed') ||
      tlsResult.authorizationError?.message.includes('SELF_SIGNED')
    ));

    currentCert = peerCertToCertInfo(cert, isSelfSigned);
    protocolVersion = tlsResult.protocol;
    cipherSuite = tlsResult.cipher?.name;

    // Estimate chain depth (1 = leaf only, we can't get intermediate certs easily with Node.js tls)
    chainDepth = 1;

    // ── Current Cert Findings ──

    // Expiry
    const validToDate = parseASN1Date(cert.valid_to) || new Date(cert.valid_to);
    const days = daysUntil(validToDate);

    if (days <= 0) {
      findings.push({
        title: 'Certificate Has Expired',
        severity: 'critical',
        category: 'ssl',
        description: `The currently served certificate for ${domain} expired ${Math.abs(days)} day(s) ago. Browsers will show security warnings and users may be unable to access the site.`,
        evidence: `Expired ${Math.abs(days)} days ago`,
        asset: domain,
        source: 'cert',
      });
    } else if (days <= 7) {
      findings.push({
        title: 'Certificate Expiring Within 7 Days',
        severity: 'critical',
        category: 'ssl',
        description: `The certificate expires in ${days} day(s). Immediate renewal is required.`,
        evidence: `${days} days remaining`,
        asset: domain,
        source: 'cert',
      });
    } else if (days <= 30) {
      findings.push({
        title: 'Certificate Expiring Within 30 Days',
        severity: 'high',
        category: 'ssl',
        description: `The certificate expires in ${days} day(s). Plan renewal immediately.`,
        evidence: `${days} days remaining`,
        asset: domain,
        source: 'cert',
      });
    } else if (days <= 90) {
      findings.push({
        title: 'Certificate Expiring Within 90 Days',
        severity: 'medium',
        category: 'ssl',
        description: `The certificate expires in ${days} day(s). Consider implementing ACME-based auto-renewal.`,
        evidence: `${days} days remaining`,
        asset: domain,
        source: 'cert',
      });
    }

    // Self-signed
    if (isSelfSigned) {
      findings.push({
        title: 'Self-Signed Certificate in Use',
        severity: 'high',
        category: 'ssl',
        description: `The certificate for ${domain} is self-signed. It provides no identity assurance and browsers will show warnings. Use Let's Encrypt for free trusted certificates.`,
        evidence: `Issuer: ${cert.issuer.O || cert.issuer.CN || 'Unknown'}`,
        asset: domain,
        source: 'cert',
      });
    }

    // Wildcard
    if (currentCert.isWildcard) {
      findings.push({
        title: 'Wildcard Certificate Detected',
        severity: 'low',
        category: 'ssl',
        description: `The certificate for ${domain} uses a wildcard (*.domain). A compromised private key exposes all subdomains covered by the cert. Consider individual certificates for high-security subdomains.`,
        evidence: currentCert.sans.filter(s => s.startsWith('*.'))[0] || 'wildcard',
        asset: domain,
        source: 'cert',
      });
    }

    // SAN sprawl
    if (currentCert.sans.length > 100) {
      findings.push({
        title: `Excessive SANs (${currentCert.sans.length} entries) — Certificate Sprawl`,
        severity: 'high',
        category: 'ssl',
        description: `The certificate contains ${currentCert.sans.length} Subject Alternative Names. This could indicate certificate sprawl — an overly broad certificate that covers many domains. If the private key is compromised, all covered domains are at risk.`,
        evidence: `${currentCert.sans.length} SANs`,
        asset: domain,
        source: 'cert',
      });
    } else if (currentCert.sans.length > 20) {
      findings.push({
        title: `Large Number of SANs (${currentCert.sans.length} entries)`,
        severity: 'medium',
        category: 'ssl',
        description: `The certificate contains ${currentCert.sans.length} Subject Alternative Names. Consider whether all covered names are necessary.`,
        evidence: `${currentCert.sans.length} SANs`,
        asset: domain,
        source: 'cert',
      });
    }

    // Protocol version
    if (protocolVersion === 'TLSv1' || protocolVersion === 'TLSv1.1') {
      findings.push({
        title: `Outdated TLS Protocol: ${protocolVersion}`,
        severity: 'high',
        category: 'ssl',
        description: `The server is using ${protocolVersion}, which has known vulnerabilities (BEAST, POODLE). Both TLS 1.0 and 1.1 were deprecated by the IETF. Upgrade to TLS 1.2 minimum, preferably TLS 1.3.`,
        evidence: `Protocol: ${protocolVersion}`,
        asset: domain,
        source: 'cert',
      });
    } else if (protocolVersion === 'TLSv1.2') {
      findings.push({
        title: 'TLS 1.2 — Consider Upgrading to TLS 1.3',
        severity: 'info',
        category: 'ssl',
        description: `The server supports TLS 1.2 which is secure. TLS 1.3 provides better security and performance.`,
        evidence: `Protocol: ${protocolVersion} | Cipher: ${cipherSuite || 'unknown'}`,
        asset: domain,
        source: 'cert',
      });
    } else if (protocolVersion === 'TLSv1.3') {
      findings.push({
        title: 'TLS 1.3 — Modern and Secure',
        severity: 'info',
        category: 'ssl',
        description: `The server supports TLS 1.3, the latest and most secure TLS version with improved handshake performance.`,
        evidence: `Protocol: ${protocolVersion} | Cipher: ${cipherSuite || 'unknown'}`,
        asset: domain,
        source: 'cert',
      });
    }

    // Cipher suite
    if (cipherSuite) {
      const weakPatterns = [/RC4/i, /DES/i, /3DES/i, /MD5/i, /NULL/i, /EXPORT/i, /anon/i];
      for (const weak of weakPatterns) {
        if (weak.test(cipherSuite)) {
          findings.push({
            title: `Weak Cipher Suite: ${cipherSuite}`,
            severity: 'critical',
            category: 'ssl',
            description: `The server negotiated the weak cipher "${cipherSuite}". This cipher provides inadequate encryption and should be disabled.`,
            evidence: cipherSuite,
            asset: domain,
            source: 'cert',
          });
        }
      }
    }
  } else {
    findings.push({
      title: 'Could Not Retrieve TLS Certificate',
      severity: 'high',
      category: 'ssl',
      description: `Could not establish a TLS connection to ${domain}:443 to retrieve the certificate. The site may not support HTTPS.`,
      evidence: null,
      asset: domain,
      source: 'cert',
    });
  }

  // ── 3. Historical Analysis Findings ──
  if (historicalCerts.length > 0) {
    const uniqueIssuers = Array.from(issuerSet);

    // Multiple CAs could indicate unauthorized certs
    if (uniqueIssuers.length > 3) {
      findings.push({
        title: `Certificates Issued by ${uniqueIssuers.length} Different CAs`,
        severity: 'medium',
        category: 'ssl',
        description: `Historical CT logs show certificates for ${domain} were issued by ${uniqueIssuers.length} different Certificate Authorities. This could indicate multiple legitimate services or potentially unauthorized certificate issuance.`,
        evidence: uniqueIssuers.slice(0, 5).join(', '),
        asset: domain,
        source: 'cert',
      });
    }

    // Recently issued certs
    if (recentCerts.length > 0) {
      findings.push({
        title: `${recentCerts.length} Recently Issued Certificate(s) Detected`,
        severity: 'info',
        category: 'ssl',
        description: `${recentCerts.length} certificate(s) issued in the last 30 days were found in CT logs. Verify these were authorized — newly issued certificates could indicate a compromised account at a CA or an infrastructure change.`,
        evidence: recentCerts.map(c => c.subject).join(', '),
        asset: domain,
        source: 'cert',
      });
    }

    // Self-signed in history
    const selfSignedHistorical = historicalCerts.filter(c => c.isSelfSigned);
    if (selfSignedHistorical.length > 0) {
      findings.push({
        title: `${selfSignedHistorical.length} Self-Signed Certificate(s) in CT History`,
        severity: 'medium',
        category: 'ssl',
        description: `${selfSignedHistorical.length} self-signed certificate(s) were found in CT logs for ${domain}. Self-signed certificates in CT logs could indicate internal services inadvertently logging to public CT, development environments, or misconfigured infrastructure.`,
        evidence: selfSignedHistorical.map(c => c.subject).join(', '),
        asset: domain,
        source: 'cert',
      });
    }
  }

  // If no certs found anywhere
  if (historicalCerts.length === 0 && !currentCert) {
    findings.push({
      title: 'No Certificates Found',
      severity: 'info',
      category: 'ssl',
      description: `No certificates were found in CT logs and no TLS connection could be established. The domain may not use HTTPS or may be offline.`,
      evidence: null,
      asset: domain,
      source: 'cert',
    });
  }

  return {
    domain,
    currentCert,
    historicalCerts,
    totalCertsFound: historicalCerts.length,
    uniqueIssuers: Array.from(issuerSet),
    recentCerts,
    protocolVersion,
    cipherSuite,
    chainDepth,
    findings,
  };
}

export { type ReconFinding };
