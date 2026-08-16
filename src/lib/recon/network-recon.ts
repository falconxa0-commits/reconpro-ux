// ─── Local Network Interface Analysis ────────────────────────────────
// Enumerates and analyzes network interfaces using Node.js `os` and `dns` modules.

import os from 'os';
import dns from 'dns/promises';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────────

export interface InterfaceInfo {
  name: string;
  family: 'IPv4' | 'IPv6';
  address: string;
  netmask: string;
  mac: string;
  internal: boolean;
  cidr: string;
  isPublic: boolean;
}

export interface NetworkResult {
  hostname: string;
  platform: string;
  interfaces: InterfaceInfo[];
  dnsServers: string[];
  totalInterfaces: number;
  publicIPs: string[];
  findings: ReconFinding[];
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Determine whether an IPv4 address is public (non-RFC1918).
 */
function isPublicIPv4(addr: string): boolean {
  const parts = addr.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return false;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return false;
  // 127.0.0.0/8 — loopback
  if (parts[0] === 127) return false;
  // 169.254.0.0/16 — link-local
  if (parts[0] === 169 && parts[1] === 254) return false;
  // 0.0.0.0
  if (parts.every(p => p === 0)) return false;

  return true;
}

/**
 * Compute a rough CIDR from an IPv4 address and netmask.
 */
function computeCidr(addr: string, netmask: string): string {
  const addrParts = addr.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  if (addrParts.length !== 4 || maskParts.length !== 4) return `${addr}/32`;

  let prefixLength = 0;
  for (let i = 0; i < 4; i++) {
    if (isNaN(addrParts[i]) || isNaN(maskParts[i])) return `${addr}/32`;
    prefixLength += (maskParts[i] >>> 0).toString(2).split('').filter(b => b === '1').length;
  }
  return `${addr}/${prefixLength}`;
}

/**
 * Classify an interface name into a type string.
 */
function classifyInterface(name: string): string {
  const lower = name.toLowerCase();
  if (lower.startsWith('lo') || lower === 'loopback') return 'loopback';
  if (lower.startsWith('wlan') || lower.startsWith('wi') || lower.includes('wifi')) return 'wifi';
  if (lower.startsWith('tun') || lower.startsWith('tap') || lower.startsWith('wg') || lower.startsWith('veth')) return 'tunnel';
  if (lower.startsWith('docker') || lower.startsWith('br-')) return 'bridge';
  return 'ethernet';
}

/**
 * Create a ReconFinding for this module.
 */
function makeFinding(
  overrides: Partial<Omit<ReconFinding, 'source'>> & Pick<ReconFinding, 'title'>,
): ReconFinding {
  return {
    severity: 'info',
    category: 'network',
    description: '',
    evidence: null,
    asset: os.hostname(),
    source: 'network-recon',
    ...overrides,
  };
}

// ── Main Export ───────────────────────────────────────────────────

/**
 * Analyze local network interfaces and DNS configuration.
 *
 * - Enumerates all network interfaces via `os.networkInterfaces()`
 * - Detects public IP addresses, interface types, and DNS server configuration
 * - Generates findings for security-relevant observations
 *
 * @returns A `NetworkResult` containing interface details and security findings.
 */
export async function analyzeNetworkInterfaces(): Promise<NetworkResult> {
  const findings: ReconFinding[] = [];
  const interfaces: InterfaceInfo[] = [];
  const publicIPs: string[] = [];

  const hostname = os.hostname();
  const platform = os.platform();

  // ── 1. Enumerate interfaces ──────────────────────────────────────
  const nets = os.networkInterfaces();

  if (nets) {
    for (const [name, entries] of Object.entries(nets)) {
      if (!entries) continue;

      for (const entry of entries) {
        const iface: InterfaceInfo = {
          name,
          family: entry.family as 'IPv4' | 'IPv6',
          address: entry.address,
          netmask: entry.netmask || '',
          mac: entry.mac || '',
          internal: entry.internal,
          cidr: '',
          isPublic: false,
        };

        // Compute CIDR for IPv4
        if (entry.family === 'IPv4' && entry.netmask) {
          iface.cidr = computeCidr(entry.address, entry.netmask);
          iface.isPublic = isPublicIPv4(entry.address);
          if (iface.isPublic) {
            publicIPs.push(entry.address);
          }
        } else {
          // For IPv6, use cidr if provided by Node
          iface.cidr = entry.cidr || `${entry.address}/128`;
          // Simple public IPv6 check (not link-local, not loopback)
          iface.isPublic = !entry.address.startsWith('fe80') && !entry.address.startsWith('::1') && !entry.address.startsWith('::');
          if (iface.isPublic) {
            publicIPs.push(entry.address);
          }
        }

        interfaces.push(iface);
      }
    }
  }

  // ── 2. DNS Configuration ─────────────────────────────────────────
  let dnsServers: string[] = [];
  try {
    dnsServers = dns.getServers();
  } catch {
    dnsServers = [];
  }

  // ── 3. Generate findings ────────────────────────────────────────

  findings.push(
    makeFinding({
      title: `Network Interfaces Enumerated`,
      severity: 'info',
      category: 'network',
      description: `Found ${interfaces.length} network interface(s) on ${hostname}. Types include loopback, ethernet, wifi, tunnel, and bridge adapters.`,
      evidence: interfaces.map(i => `${i.name} (${i.family}): ${i.address}`).join('; '),
      asset: hostname,
    }),
  );

  if (publicIPs.length > 0) {
    findings.push(
      makeFinding({
        title: `Public IP Address(es) Detected`,
        severity: 'medium',
        category: 'network',
        description: `${publicIPs.length} public (non-RFC1918) IP address(es) are bound to network interfaces. Public IPs on a server increase exposure to scanning and direct network attacks.`,
        evidence: publicIPs.join(', '),
        asset: hostname,
        remediation: 'Ensure firewall rules restrict inbound traffic to only necessary ports.',
      }),
    );
  }

  if (dnsServers.length > 0) {
    findings.push(
      makeFinding({
        title: `${dnsServers.length} DNS Server(s) Configured`,
        severity: 'info',
        category: 'network',
        description: `The system is configured to use ${dnsServers.length} DNS server(s). DNS is a critical dependency — compromised or spoofed DNS responses can redirect traffic to malicious endpoints.`,
        evidence: dnsServers.join(', '),
        asset: hostname,
      }),
    );

    // Check if using only public DNS resolvers (good practice indicator)
    const publicResolvers = dnsServers.filter(s => {
      const addr = s.replace(/^.*@/, ''); // strip port/iface suffixes
      return addr.startsWith('8.8.') || addr.startsWith('1.1.1.') || addr.startsWith('9.9.9.') || addr.startsWith('208.67.');
    });
    if (publicResolvers.length > 0 && publicResolvers.length === dnsServers.length) {
      findings.push(
        makeFinding({
          title: 'Using Public DNS Resolvers Only',
          severity: 'info',
          category: 'network',
          description: 'All configured DNS servers are well-known public resolvers (Google, Cloudflare, Quad9, OpenDNS). This provides good baseline protection against DNS manipulation.',
          evidence: dnsServers.join(', '),
          asset: hostname,
        }),
      );
    }
  }

  findings.push(
    makeFinding({
      title: `Hostname Identified`,
      severity: 'info',
      category: 'network',
      description: `System hostname is "${hostname}" on ${os.type()} ${os.release()}. Hostname information can be used in social engineering or targeted attacks.`,
      evidence: hostname,
      asset: hostname,
    }),
  );

  // ── 4. Interface type breakdown ─────────────────────────────────
  const ifaceTypes = new Map<string, number>();
  for (const iface of interfaces) {
    const type = classifyInterface(iface.name);
    ifaceTypes.set(type, (ifaceTypes.get(type) || 0) + 1);
  }

  if (ifaceTypes.size > 0) {
    const breakdown = Array.from(ifaceTypes.entries()).map(([type, count]) => `${type}: ${count}`).join(', ');
    findings.push(
      makeFinding({
        title: 'Interface Type Distribution',
        severity: 'info',
        category: 'network',
        description: `Network interface breakdown by type: ${breakdown}. Tunnel and bridge interfaces may indicate containerized or virtualized environments.`,
        evidence: breakdown,
        asset: hostname,
      }),
    );
  }

  // ── 5. Promiscuous mode limitation note ─────────────────────────
  findings.push(
    makeFinding({
      title: 'Promiscuous Mode Check Not Available',
      severity: 'info',
      category: 'network',
      description: 'Node.js does not provide a native API to detect promiscuous mode on network interfaces. Use system tools (e.g., `ip link show`) or packet capture libraries to check for interfaces in promiscuous mode, which could indicate network sniffing.',
      evidence: null,
      asset: hostname,
    }),
  );

  return {
    hostname,
    platform,
    interfaces,
    dnsServers,
    totalInterfaces: interfaces.length,
    publicIPs,
    findings,
  };
}

export { type ReconFinding };
