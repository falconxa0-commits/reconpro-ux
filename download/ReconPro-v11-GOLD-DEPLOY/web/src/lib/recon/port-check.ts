// ─── Real TCP Port Probing ────────────────────────────────────
// Attempts actual TCP connections to common service ports.
// This is what Nmap, Masscan, and Shodan do.
// Open ports are the #1 attack vector in the MITRE ATT&CK framework.
//
// Shodan charges $10K-$100K/year for their internet-wide port scan data.
// We perform targeted port scanning of the specified domain.

import net from 'net';
import dns from 'dns/promises';
import { isPrivateIP, isPrivateIPv6, isBlockedDomain, looksLikeIP } from '@/lib/api-security';
import type { PortResult, PortScanResult, ReconFinding } from './types';

// Top ports to scan (the ones that matter for security assessments)
// Ordered by prevalence and risk
const SCAN_PORTS: Array<{ port: number; service: string; risk: string; description: string }> = [
  { port: 80, service: 'HTTP', risk: 'low', description: 'Web server (unencrypted). If open alongside 443, ensure proper redirect is in place.' },
  { port: 443, service: 'HTTPS', risk: 'low', description: 'Web server (encrypted). The primary secure web port.' },
  { port: 21, service: 'FTP', risk: 'high', description: 'FTP server. Often misconfigured, may allow anonymous access. File transfers are unencrypted by default.' },
  { port: 22, service: 'SSH', risk: 'medium', description: 'SSH remote access. Check for weak ciphers, password auth (use keys instead), and brute-force protection.' },
  { port: 23, service: 'Telnet', risk: 'critical', description: 'Telnet server. Transmits credentials in PLAINTEXT. Should never be exposed to the internet.' },
  { port: 25, service: 'SMTP', risk: 'medium', description: 'Mail server. Check for open relay, STARTTLS support, and authentication requirements.' },
  { port: 53, service: 'DNS', risk: 'medium', description: 'DNS server. Check for zone transfer, recursion, and amplification attack vulnerability.' },
  { port: 110, service: 'POP3', risk: 'medium', description: 'POP3 mail retrieval. Credentials sent in plaintext unless TLS is used.' },
  { port: 143, service: 'IMAP', risk: 'medium', description: 'IMAP mail retrieval. Supports STARTTLS for encryption.' },
  { port: 389, service: 'LDAP', risk: 'high', description: 'LDAP directory service. May expose user/computer information. Should use TLS (636).' },
  { port: 443, service: 'HTTPS (alt)', risk: 'low', description: 'Duplicate HTTPS check.' },
  { port: 445, service: 'SMB', risk: 'critical', description: 'SMB/CIFS file sharing. One of the most exploited protocols (WannaCry, EternalBlue). Should NEVER be internet-facing.' },
  { port: 465, service: 'SMTPS', risk: 'low', description: 'SMTP over TLS. Secure mail submission.' },
  { port: 587, service: 'Submission', risk: 'low', description: 'SMTP submission port with STARTTLS.' },
  { port: 993, service: 'IMAPS', risk: 'low', description: 'IMAP over TLS. Secure mail retrieval.' },
  { port: 995, service: 'POP3S', risk: 'low', description: 'POP3 over TLS. Secure mail retrieval.' },
  { port: 1433, service: 'MSSQL', risk: 'critical', description: 'Microsoft SQL Server. Database ports exposed to the internet are a critical finding.' },
  { port: 1521, service: 'Oracle DB', risk: 'critical', description: 'Oracle database listener. Exposing database ports to the internet can lead to full data compromise.' },
  { port: 2049, service: 'NFS', risk: 'high', description: 'Network File System. May allow unauthorized file access or information disclosure.' },
  { port: 3306, service: 'MySQL', risk: 'critical', description: 'MySQL database. Exposed database ports are a critical security finding.' },
  { port: 3389, service: 'RDP', risk: 'critical', description: 'Remote Desktop Protocol. Heavily targeted by brute-force attacks. Use VPN + MFA instead.' },
  { port: 5432, service: 'PostgreSQL', risk: 'critical', description: 'PostgreSQL database. Exposed database ports are a critical security finding.' },
  { port: 5900, service: 'VNC', risk: 'critical', description: 'VNC remote desktop. Often configured without encryption or strong authentication.' },
  { port: 6379, service: 'Redis', risk: 'critical', description: 'Redis in-memory database. Often misconfigured to allow unauthenticated access, leading to full server compromise.' },
  { port: 8080, service: 'HTTP-Alt', risk: 'medium', description: 'Alternative HTTP port. Common for web apps, proxy servers, admin panels, and development servers.' },
  { port: 8443, service: 'HTTPS-Alt', risk: 'medium', description: 'Alternative HTTPS port. Common for admin interfaces, webmail, and management consoles.' },
  { port: 8888, service: 'HTTP-Proxy', risk: 'medium', description: 'Alternative web port. Often used for Jupyter notebooks, development servers, or proxy services.' },
  { port: 9090, service: 'Prometheus', risk: 'medium', description: 'Common monitoring/metrics port (Prometheus, Cockpit, etc.). May expose sensitive operational data.' },
  { port: 27017, service: 'MongoDB', risk: 'critical', description: 'MongoDB database. Thousands of MongoDB instances have been ransomed due to misconfigured access controls.' },
];

// Deduplicate ports
const UNIQUE_PORTS = SCAN_PORTS.filter((p, i, arr) => arr.findIndex(x => x.port === p.port) === i);

function probePort(host: string, port: number, timeoutMs = 2000): Promise<PortScanResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ port, state: 'filtered', responseTime: Date.now() - start });
    }, timeoutMs);

    socket.connect(port, host, () => {
      const responseTime = Date.now() - start;
      clearTimeout(timer);
      socket.destroy();
      resolve({ port, state: 'open', responseTime });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      const responseTime = Date.now() - start;
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ECONNREFUSED') {
        resolve({ port, state: 'closed', responseTime });
      } else {
        resolve({ port, state: 'filtered', responseTime });
      }
      socket.destroy();
    });
  });
}

export async function scanPorts(domain: string, timeoutPerPort = 2000): Promise<PortResult> {
  const start = Date.now();
  const ports: PortScanResult[] = [];

  // SSRF protection: reject private IPs, blocked domains, and IP-looking inputs
  if (looksLikeIP(domain)) {
    if (isPrivateIP(domain) || isPrivateIPv6(domain)) {
      return {
        type: 'port',
        success: false,
        domain,
        ports: [],
        duration: Date.now() - start,
      };
    }
    // Allow scanning of public IPs (already validated above)
    // But block if it's an IP that was passed as a domain disguise
  }
  if (isBlockedDomain(domain)) {
    return {
      type: 'port',
      success: false,
      domain,
      ports: [],
      duration: Date.now() - start,
    };
  }

  // Resolve domain to IP first
  let host = domain;
  try {
    const [v4Addresses, v6Addresses] = await Promise.all([
      dns.resolve4(domain).catch(() => [] as string[]),
      dns.resolve6(domain).catch(() => [] as string[]),
    ]);

    const allIPs = [...v4Addresses, ...v6Addresses];
    if (allIPs.length === 0) {
      // DNS failure — do not fall back to raw domain (SSRF prevention)
      return {
        type: 'port',
        success: false,
        domain,
        ports: [],
        duration: Date.now() - start,
      };
    }

    // Check ALL resolved IPs — if ANY is private, reject the scan
    if (v4Addresses.some(ip => isPrivateIP(ip)) || v6Addresses.some(ip => isPrivateIPv6(ip))) {
      return {
        type: 'port',
        success: false,
        domain,
        ports: [],
        duration: Date.now() - start,
      };
    }

    // Use first IPv4 address for scanning
    if (v4Addresses.length > 0) host = v4Addresses[0];
    else host = v6Addresses[0];
  } catch {
    // DNS resolution threw — do not allow fallback
    return {
      type: 'port',
      success: false,
      domain,
      ports: [],
      duration: Date.now() - start,
    };
  }

  // Scan all ports concurrently (with per-port timeout)
  const promises = UNIQUE_PORTS.map(p =>
    probePort(host, p.port, timeoutPerPort).then(result => ({
      ...result,
      service: p.service,
    }))
  );

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      ports.push(r.value);
    }
  }

  return {
    type: 'port',
    success: true,
    domain,
    ports,
    duration: Date.now() - start,
  };
}

// ── Convert port results to ReconFindings ──────────────────────

export function portsToFindings(result: PortResult, domain: string): ReconFinding[] {
  const findings: ReconFinding[] = [];

  const openPorts = result.ports.filter(p => p.state === 'open');
  const filteredPorts = result.ports.filter(p => p.state === 'filtered');
  const criticalPorts = openPorts.filter(p => {
    const info = UNIQUE_PORTS.find(up => up.port === p.port);
    return info?.risk === 'critical';
  });

  // Summary
  if (openPorts.length === 0) {
    findings.push({
      title: 'No Open Ports Detected',
      severity: 'info',
      category: 'port',
      description: `No common service ports responded to TCP connection attempts on ${domain}. The host may be behind a firewall, or the domain may not resolve to a reachable IP address. ${filteredPorts.length > 0 ? `${filteredPorts.length} ports showed filtered responses (firewall likely present).` : ''}`,
      evidence: `Scanned ${result.ports.length} ports in ${result.duration}ms`,
      asset: domain,
      source: 'port',
    });
    return findings;
  }

  findings.push({
    title: `${openPorts.length} Open Port(s) Discovered`,
    severity: criticalPorts.length > 0 ? 'high' : openPorts.length > 5 ? 'medium' : 'info',
    category: 'port',
    description: `TCP port scanning revealed ${openPorts.length} open port(s) out of ${result.ports.length} scanned. ${criticalPorts.length > 0 ? `${criticalPorts.length} CRITICAL-RISK ports are open.` : ''} ${filteredPorts.length > 0 ? `${filteredPorts.length} ports returned filtered responses, indicating a firewall.` : 'No firewall filtering was detected.'} Each open port represents a potential entry point for attackers.`,
    evidence: `Open: ${openPorts.map(p => p.port).join(', ')} | Scanned in ${result.duration}ms`,
    asset: domain,
    source: 'port',
  });

  // Individual port findings
  for (const portResult of openPorts) {
    const info = UNIQUE_PORTS.find(up => up.port === portResult.port);
    if (!info) continue;

    findings.push({
      title: `Port ${portResult.port}/${info.service} is OPEN`,
      severity: info.risk,
      category: 'port',
      description: info.description,
      evidence: `Response time: ${portResult.responseTime}ms`,
      asset: `${domain}:${portResult.port}`,
      source: 'port',
    });
  }

  // Firewall detection
  if (filteredPorts.length > result.ports.length * 0.3) {
    findings.push({
      title: 'Firewall Detected (Port Filtering)',
      severity: 'low',
      category: 'port',
      description: `${filteredPorts.length} ports returned filtered responses (no RST, no SYN-ACK), indicating the presence of a network firewall or security group. This is good security practice but does not eliminate risk for open ports.`,
      evidence: `${filteredPorts.length}/${result.ports.length} ports filtered`,
      asset: domain,
      source: 'port',
    });
  }

  return findings;
}

export { type ReconFinding };