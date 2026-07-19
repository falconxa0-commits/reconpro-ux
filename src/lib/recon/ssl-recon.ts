// ─── Real SSL/TLS Certificate Analysis ─────────────────────────
// Performs actual TLS handshake and analyzes the certificate chain.
// This is what Qualys SSL Labs, crt.sh, and Censys do.
// SSL misconfigurations account for 30%+ of data breaches.

import tls from 'tls';
import type { SSLResult, SSLIssue, ReconFinding } from './types';

interface TLSConnectResult {
  authorized: boolean;
  authorizationError?: Error;
  cert?: tls.PeerCertificate;
  cipher?: { name: string; version: string; standardName: string };
  protocol?: string;
}

function connectTLS(domain: string, port = 443, timeout = 5000): Promise<TLSConnectResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ authorized: false, authorizationError: new Error('TLS connection timeout') });
    }, timeout);

    const socket = tls.connect(port, domain, {
      servername: domain,
      rejectUnauthorized: false, // We want to analyze even self-signed/broken certs
    }, () => {
      clearTimeout(timer);
      const result: TLSConnectResult = {
        authorized: socket.authorized,
        authorizationError: socket.authorizationError || undefined,
        cert: socket.getPeerCertificate(),
        cipher: {
          name: socket.getCipher().name,
          version: socket.getCipher().version,
          standardName: (socket.getCipher() as Record<string, string>).standardName || socket.getCipher().name,
        },
        protocol: socket.getProtocol(),
      };
      socket.destroy();
      resolve(result);
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      resolve({ authorized: false, authorizationError: err });
    });
  });
}

function parseASN1Date(dateStr: string): Date | null {
  try {
    // ASN1UTCTime: YYMMDDHHmmSSZ
    // ASN1GeneralizedTime: YYYYMMDDHHmmSSZ
    const cleaned = dateStr.replace(/\s/g, '');
    if (cleaned.length === 13) {
      // UTCTime - add century
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
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Weak/broken cipher patterns
const WEAK_CIPHERS = [
  /RC4/i,
  /DES/i,
  /3DES/i,
  /MD5/i,
  /NULL/i,
  /EXPORT/i,
  /anon/i,
];

const OUTDATED_PROTOCOLS = ['TLSv1', 'TLSv1.1'];

export async function analyzeSSL(domain: string, port = 443): Promise<SSLResult> {
  const start = Date.now();
  const issues: SSLIssue[] = [];

  const result = await connectTLS(domain, port);

  if (!result.cert || !result.cert.subject) {
    return {
      type: 'ssl',
      success: false,
      domain,
      subject: 'N/A',
      issuer: 'N/A',
      validFrom: 'N/A',
      validTo: 'N/A',
      daysUntilExpiry: 0,
      protocol: result.protocol || 'unknown',
      cipher: result.cipher?.name || 'unknown',
      serialNumber: 'N/A',
      sans: [],
      chainLength: 0,
      issues: [{ finding: 'Could not retrieve SSL/TLS certificate', severity: 'high', detail: `TLS connection to ${domain}:${port} did not return a valid certificate. The site may not support HTTPS, or the connection was blocked.` }],
      duration: Date.now() - start,
    };
  }

  const cert = result.cert;
  const validFrom = parseASN1Date(cert.valid_from) || new Date(cert.valid_from);
  const validTo = parseASN1Date(cert.valid_to) || new Date(cert.valid_to);
  const days = daysUntil(validTo);

  // Extract SANs
  let sans: string[] = [];
  try {
    if (cert.subjectaltname) {
      sans = cert.subjectaltname
        .split(', ')
        .map(s => s.replace(/^(DNS:|IP Address:|email:)/, '').trim());
    }
  } catch {
    sans = [];
  }

  // ── Analyze Issues ──

  // 1. Certificate expiry
  if (days <= 0) {
    issues.push({
      finding: 'Certificate Has Expired',
      severity: 'critical',
      detail: `The SSL certificate expired ${Math.abs(days)} day(s) ago. Browsers will show security warnings, and users may be unable to access the site. This is an immediate security and availability issue.`,
    });
  } else if (days <= 7) {
    issues.push({
      finding: 'Certificate Expiring Within 7 Days',
      severity: 'critical',
      detail: `The SSL certificate expires in ${days} day(s). Immediate renewal is required to prevent service disruption and browser security warnings.`,
    });
  } else if (days <= 30) {
    issues.push({
      finding: 'Certificate Expiring Within 30 Days',
      severity: 'high',
      detail: `The SSL certificate expires in ${days} day(s). Plan renewal immediately to avoid service disruption. Automated certificate management (e.g., Let\'s Encrypt with certbot) is recommended.`,
    });
  } else if (days <= 90) {
    issues.push({
      finding: 'Certificate Expiring Within 90 Days',
      severity: 'medium',
      detail: `The SSL certificate expires in ${days} day(s). While not urgent, plan renewal soon. Consider implementing ACME-based auto-renewal.`,
    });
  }

  // 2. Protocol version
  if (result.protocol && OUTDATED_PROTOCOLS.includes(result.protocol)) {
    issues.push({
      finding: `Outdated TLS Protocol: ${result.protocol}`,
      severity: 'critical',
      detail: `The server is using ${result.protocol}, which has known vulnerabilities (BEAST, POODLE, etc.). Both TLS 1.0 and 1.1 were deprecated by the IETF in 2020 and 2021 respectively. Upgrade to TLS 1.2 minimum, preferably TLS 1.3.`,
    });
  } else if (result.protocol === 'TLSv1.2') {
    issues.push({
      finding: 'TLS 1.2 (Consider Upgrading to TLS 1.3)',
      severity: 'low',
      category: 'ssl',
      description: 'TLS 1.2 is secure but TLS 1.3 offers improved performance (0-RTT), stronger cipher suites, and removes legacy algorithms.',
      detail: 'TLS 1.2 is currently supported and secure. However, TLS 1.3 provides better security and performance. Consider enabling TLS 1.3 while keeping 1.2 for backwards compatibility.',
    });
  } else if (result.protocol === 'TLSv1.3') {
    issues.push({
      finding: 'TLS 1.3 (Modern and Secure)',
      severity: 'info',
      detail: 'The server supports TLS 1.3, the latest and most secure TLS version. TLS 1.3 removes legacy cipher suites and provides improved handshake performance.',
    });
  }

  // 3. Weak ciphers
  const cipherName = result.cipher?.name || '';
  for (const weakPattern of WEAK_CIPHERS) {
    if (weakPattern.test(cipherName)) {
      issues.push({
        finding: `Weak Cipher Suite: ${cipherName}`,
        severity: 'critical',
        detail: `The server negotiated the weak cipher "${cipherName}". ${weakPattern.source === 'RC4' ? 'RC4 is broken and was prohibited by RFC 7465 in 2015.' : weakPattern.source === 'DES' || weakPattern.source === '3DES' ? '3DES has a 64-bit block size vulnerable to Sweet32 attacks (CVE-2016-2183).' : 'This cipher suite provides inadequate encryption and should be disabled.'}`,
      });
    }
  }

  // 4. Self-signed certificate
  if (!result.authorized) {
    if (result.authorizationError) {
      const errMsg = result.authorizationError.message;
      if (errMsg.includes('self signed') || errMsg.includes('SELF_SIGNED')) {
        issues.push({
          finding: 'Self-Signed Certificate',
          severity: 'high',
          detail: 'The SSL certificate is self-signed and not trusted by any public Certificate Authority. Users will see browser warnings, and the certificate provides no identity assurance. Use Let\'s Encrypt for free trusted certificates.',
        });
      } else if (errMsg.includes('hostname') || errMsg.includes('IP')) {
        issues.push({
          finding: 'Certificate Name Mismatch',
          severity: 'high',
          detail: `The certificate does not match the requested hostname "${domain}". This could indicate a misconfigured server, a certificate intended for a different domain, or a potential man-in-the-middle attack.`,
        });
      } else if (errMsg.includes('expired')) {
        // Already covered by expiry check above
      } else if (errMsg.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
        issues.push({
          finding: 'Self-Signed Certificate in Chain',
          severity: 'high',
          detail: 'The TLS connection encountered a self-signed certificate. The certificate chain does not lead to a trusted root CA, meaning the server identity cannot be verified.',
        });
      }
    }
  }

  // 5. Certificate chain length
  const chainLen = cert.issuerCertificate ? 1 + (cert.issuerCertificate.issuerCertificate ? 1 : 0) : 0;

  // 6. SAN analysis
  if (sans.length > 50) {
    issues.push({
      finding: `Excessive SANs (${sans.length} entries)`,
      severity: 'medium',
      detail: `The certificate contains ${sans.length} Subject Alternative Names. Certificates with many SANs increase the attack surface - each SAN represents a domain that can be impersonated if the private key is compromised. Consider using separate certificates.`,
    });
  }

  // 7. Wildcard certificate
  const hasWildcard = sans.some(s => s.startsWith('*.'));
  if (hasWildcard) {
    issues.push({
      finding: 'Wildcard Certificate in Use',
      severity: 'low',
      detail: 'A wildcard certificate (*.domain) is in use. While convenient, wildcard certificates mean a compromise of one subdomain compromises all subdomains covered by the cert. Consider using individual certificates for high-security subdomains.',
    });
  }

  const duration = Date.now() - start;

  return {
    type: 'ssl',
    success: true,
    domain,
    subject: cert.subject.CN || cert.subject.O || 'Unknown',
    issuer: cert.issuer.O || cert.issuer.CN || 'Unknown',
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    daysUntilExpiry: days,
    protocol: result.protocol || 'unknown',
    cipher: cipherName,
    serialNumber: cert.serialNumber || 'N/A',
    sans,
    chainLength: chainLen,
    issues,
    duration,
  };
}

// ── Convert SSL results to ReconFindings ────────────────────────

export function sslToFindings(result: SSLResult, domain: string): ReconFinding[] {
  const findings: ReconFinding[] = [];

  if (!result.success) {
    findings.push({
      title: 'SSL/TLS Connection Failed',
      severity: 'high',
      category: 'ssl',
      description: `Could not establish a TLS connection to ${domain}. The target may not support HTTPS, or the connection was blocked. Sites without TLS expose all traffic to interception.`,
      evidence: null,
      asset: domain,
      source: 'ssl',
    });
    return findings;
  }

  // Certificate info
  findings.push({
    title: `SSL Certificate: ${result.subject}`,
    severity: 'info',
    category: 'ssl',
    description: `Certificate issued by "${result.issuer}". Protocol: ${result.protocol}, Cipher: ${result.cipher}. Serial: ${result.serialNumber}. Chain depth: ${result.chainLength}. ${result.sans.length > 0 ? `Covers ${result.sans.length} SAN(s).` : ''}`,
    evidence: result.daysUntilExpiry > 0 ? `${result.daysUntilExpiry} days until expiry` : `EXPIRED ${Math.abs(result.daysUntilExpiry)} days ago`,
    asset: domain,
    source: 'ssl',
  });

  // Issues
  for (const issue of result.issues) {
    findings.push({
      title: issue.finding,
      severity: issue.severity,
      category: 'ssl',
      description: issue.detail,
      evidence: `${result.protocol} | ${result.cipher}`,
      asset: domain,
      source: 'ssl',
    });
  }

  return findings;
}

export { type ReconFinding };