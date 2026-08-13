/**
 * Native DNS resolution module — drop-in replacement for `dig` shell commands.
 * Uses Node.js dns/promises for all lookups. No shell execution.
 *
 * Functions return data in formats compatible with the scan engine's parsing logic.
 */

import dns from 'dns/promises';
import type { PeerCertificate } from 'tls';

const DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];

function createResolver(): dns.Resolver {
  const resolver = new dns.Resolver();
  resolver.setServers(DNS_SERVERS);
  return resolver;
}

/**
 * Resolve a domain and return short-form records (equivalent to `dig +short`).
 */
export async function digShort(domain: string, type: string): Promise<string[]> {
  try {
    const resolver = createResolver();
    const timeoutMs = 5000;

    const result = await Promise.race([
      resolveType(resolver, domain, type),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), timeoutMs)
      ),
    ]);

    return result;
  } catch {
    return [];
  }
}

/**
 * Resolve a domain and return dig-style answer lines (equivalent to `dig +noall +answer`).
 */
export async function digAnswer(domain: string, type: string): Promise<string> {
  try {
    const resolver = createResolver();
    const timeoutMs = 5000;

    const records = await Promise.race([
      resolveType(resolver, domain, type),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), timeoutMs)
      ),
    ]);

    // Format as dig answer output
    return records.map(r => `${domain}\t${type}\t${r}`).join('\n');
  } catch {
    return '';
  }
}

/**
 * Resolve a domain's A record and return the first IPv4 address.
 */
export async function resolveIP(domain: string): Promise<string | null> {
  try {
    const resolver = createResolver();
    const addresses = await Promise.race([
      resolver.resolve4(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 3000)
      ),
    ]);
    return addresses.length > 0 ? addresses[0] : null;
  } catch {
    return null;
  }
}

/**
 * Resolve reverse DNS (PTR record) for an IP address.
 * Equivalent to `host <ip>` or `dig -x <ip>`.
 */
export async function reverseDNS(ip: string): Promise<string> {
  try {
    const resolver = createResolver();
    const hostnames = await Promise.race([
      resolver.resolvePtr(ip),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 5000)
      ),
    ]);
    return hostnames.length > 0 ? hostnames[0] : '';
  } catch {
    return '';
  }
}

/**
 * Native SSL/TLS analysis — drop-in replacement for `openssl s_client`.
 * Returns structured certificate data.
 */
export async function analyzeSSLNative(domain: string, port = 443): Promise<{
  certInfo: string;
  sslConnect: string;
  protocol: string;
  cipher: string;
  authorized: boolean;
  cert?: PeerCertificate;
  error?: string;
}> {
  const tlsModule = await import('tls');
  const tls = tlsModule.default;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ certInfo: '', sslConnect: '', protocol: '', cipher: '', authorized: false, error: 'TLS connection timeout' });
    }, 10000);

    const socket = tls.connect(port, domain, {
      servername: domain,
      rejectUnauthorized: false,
    }, () => {
      clearTimeout(timeout);
      const cert = socket.getPeerCertificate();
      const cipherInfo = socket.getCipher();
      const protocol = socket.getProtocol() || '';

      // Format cert info similar to openssl x509 output
      const subject = cert.subject ? formatDN(cert.subject) : '';
      const issuer = cert.issuer ? formatDN(cert.issuer) : '';
      const notBefore = cert.valid_from || '';
      const notAfter = cert.valid_to || '';
      const san = cert.subjectaltname || '';

      const certInfo = [
        `subject= ${subject}`,
        `issuer= ${issuer}`,
        `notBefore=${notBefore}`,
        `notAfter=${notAfter}`,
        san ? `Subject Alternative Name\n${san}` : '',
      ].filter(Boolean).join('\n');

      const sslConnect = [
        `Protocol  : ${protocol}`,
        `Cipher    : ${cipherInfo.name} ${cipherInfo.version}`,
        socket.authorized ? '' : `Authorization Error: ${socket.authorizationError?.message || 'self-signed or invalid cert'}`,
      ].filter(Boolean).join('\n');

      socket.destroy();
      resolve({
        certInfo,
        sslConnect,
        protocol,
        cipher: `${cipherInfo.name} ${cipherInfo.version}`,
        authorized: socket.authorized,
        cert,
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ certInfo: '', sslConnect: '', protocol: '', cipher: '', authorized: false, error: err.message });
    });
  });
}

/** Format a DN object (from tls.PeerCertificate) to a readable string */
function formatDN(dn: PeerCertificate['subject']): string {
  const parts: string[] = [];
  if (dn.CN) parts.push(`CN=${Array.isArray(dn.CN) ? dn.CN[0] : dn.CN}`);
  if (dn.O) parts.push(`O=${Array.isArray(dn.O) ? dn.O[0] : dn.O}`);
  if (dn.OU) parts.push(`OU=${Array.isArray(dn.OU) ? dn.OU[0] : dn.OU}`);
  if (dn.ST) parts.push(`ST=${Array.isArray(dn.ST) ? dn.ST[0] : dn.ST}`);
  if (dn.C) parts.push(`C=${Array.isArray(dn.C) ? dn.C[0] : dn.C}`);
  return parts.join(', ');
}

// ── Internal: Resolve by record type ─────────────────────────────

async function resolveType(resolver: dns.Resolver, domain: string, type: string): Promise<string[]> {
  const upperType = type.toUpperCase();

  switch (upperType) {
    case 'A':
      return (await resolver.resolve4(domain)).map(r => r);
    case 'AAAA':
      return (await resolver.resolve6(domain)).map(r => r);
    case 'MX':
      return (await resolver.resolveMx(domain)).map(r => `${r.exchange} (priority: ${r.priority})`);
    case 'NS':
      return (await resolver.resolveNs(domain));
    case 'TXT': {
      const txts = await resolver.resolveTxt(domain);
      return txts.map(r => r.join(''));
    }
    case 'CNAME': {
      try {
        return (await resolver.resolveCname(domain));
      } catch {
        return [];
      }
    }
    case 'SOA': {
      try {
        const soa = await resolver.resolveSoa(domain);
        return [`${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire}`];
      } catch {
        return [];
      }
    }
    default:
      return [];
  }
}
