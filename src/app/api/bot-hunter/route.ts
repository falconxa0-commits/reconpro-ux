import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';
import net from 'net';
import { sanitizeTarget, isBlockedDomain, isPrivateIP, checkRateLimit, safeErrorResponse, applySecurityHeaders } from '@/lib/api-security';
import { safeFetch } from '@/lib/safe-fetch';

// ══════════════════════════════════════════════════════════════════════════════
// NATIVE RUN — Replaces shell exec with native Node.js APIs
// ══════════════════════════════════════════════════════════════════════════════

function tcpProbe(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { s.destroy(); } catch {} resolve(false); }, timeoutMs);
    const s = net.createConnection({ host, port, timeout: timeoutMs });
    s.on('connect', () => { clearTimeout(timer); try { s.destroy(); } catch {} resolve(true); });
    s.on('timeout', () => { clearTimeout(timer); try { s.destroy(); } catch {} resolve(false); });
    s.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

function tcpBannerGrab(host: string, port: number, timeoutMs: number, maxBytes = 300): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => { try { s.destroy(); } catch {} resolve(data); }, timeoutMs);
    const s = net.createConnection({ host, port, timeout: timeoutMs });
    s.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length >= maxBytes) { clearTimeout(timer); try { s.destroy(); } catch {} resolve(data.substring(0, maxBytes)); }
    });
    s.on('timeout', () => { clearTimeout(timer); try { s.destroy(); } catch {} resolve(data); });
    s.on('error', () => { clearTimeout(timer); resolve(data); });
    s.on('close', () => { clearTimeout(timer); resolve(data); });
  });
}

async function handleCurl(cmd: string, timeout: number): Promise<string> {
  const isHead = /\b-sI\b|\b-I\b/.test(cmd);
  const timeoutMatch = cmd.match(/--max-time\s+(\d+)/);
  const timeoutSec = timeoutMatch ? parseInt(timeoutMatch[1]) : 8;
  const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0' };
  const headerRegex = /-H\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(cmd)) !== null) {
    const ci = m[1].indexOf(':');
    if (ci > 0) headers[m[1].substring(0, ci).trim()] = m[1].substring(ci + 1).trim();
  }
  const urlMatch = cmd.match(/(?:https?:\/\/[^\s"'`]+|http:\/\/[^\s"'`]+)/);
  const url = urlMatch ? urlMatch[0] : '';
  if (!url) return '';
  try {
    const res = await safeFetch(url, { method: isHead ? 'HEAD' : 'GET', headers, followRedirects: false, timeout: timeoutSec * 1000 });
    if (isHead) {
      let out = `HTTP/1.1 ${res.status}\n`;
      for (const [k, v] of Object.entries(res.headers)) { out += `${k}: ${v}\n`; }
      return out;
    }
    return res.text;
  } catch { return ''; }
}

async function handleDig(cmd: string, _timeout: number): Promise<string> {
  const isPtr = cmd.includes('-x');
  let cleaned = cmd.replace(/\bdig\b/, '').replace(/\+short\b/g, '').replace(/\+time=\d+/g, '').replace(/\+tries=\d+/g, '').replace(/@\S+/g, '').replace(/2>\/>\/dev\/null/g, '').replace(/2>&1/g, '').trim();
  if (isPtr) {
    const pm = cleaned.match(/-x\s+(\S+)/);
    const ip = pm ? pm[1] : '';
    if (!ip) return '';
    try { return (await dns.resolvePtr(ip)).join('\n'); } catch { return ''; }
  }
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  const recordTypes = ['A','AAAA','NS','CNAME','MX','TXT','PTR','SOA','SRV','ANY'];
  let domain: string; let type = 'A';
  const last = tokens[tokens.length - 1].toUpperCase();
  if (tokens.length >= 2 && recordTypes.includes(last)) {
    type = last; domain = tokens.slice(0, -1).join(' ');
  } else { domain = tokens.join(' '); }
  if (!domain) return '';
  try {
    let result: string[] = [];
    switch (type) {
      case 'A': result = await dns.resolve4(domain); break;
      case 'NS': result = await dns.resolveNs(domain); break;
      case 'CNAME': result = await dns.resolveCname(domain); break;
      case 'TXT': { const r = await dns.resolveTxt(domain); result = r.map(x => x.join('')); break; }
      case 'PTR': result = await dns.resolvePtr(domain); break;
      default: result = await dns.resolve4(domain); break;
    }
    return result.join('\n');
  } catch { return ''; }
}

async function handleNetcat(cmd: string, timeout: number): Promise<string> {
  const bashMatch = cmd.match(/\/dev\/tcp\/([^/]+)\/(\d+)/);
  if (bashMatch) {
    const open = await tcpProbe(bashMatch[1], parseInt(bashMatch[2]), Math.min(timeout, 3000));
    return open ? 'OPEN' : 'CLOSED';
  }
  const ncMatch = cmd.match(/nc\s+(?:-\w+\s+)*(\S+)\s+(\d+)/);
  if (ncMatch) return tcpBannerGrab(ncMatch[1], parseInt(ncMatch[2]), timeout);
  return '';
}

function applyPipe(input: string, pipeCmd: string): string {
  const headBytes = pipeCmd.match(/head\s+-c\s+(\d+)/);
  if (headBytes) return input.substring(0, parseInt(headBytes[1]));
  const headLines = pipeCmd.match(/head\s+-(\d+)/);
  if (headLines) return input.split('\n').slice(0, parseInt(headLines[1])).join('\n');
  const grepMatch = pipeCmd.match(/^grep\s+(-\w+\s+)?(.+)$/);
  if (grepMatch) {
    const flags = grepMatch[1]?.trim() || '';
    let pattern = grepMatch[2].trim();
    if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) pattern = pattern.slice(1, -1);
    const isI = flags.includes('i');
    try {
      const regex = new RegExp(pattern, isI ? 'i' : '');
      return input.split('\n').filter(l => regex.test(l)).join('\n');
    } catch { return ''; }
  }
  return input;
}

async function run(cmd: string, timeout = 8000): Promise<string> {
  try {
    if (cmd.includes('/dev/tcp')) {
      const m = cmd.match(/\/dev\/tcp\/([^/]+)\/(\d+)/);
      if (m) { const open = await tcpProbe(m[1], parseInt(m[2]), Math.min(timeout, 3000)); return cmd.includes('OPEN') && cmd.includes('CLOSED') ? (open ? 'OPEN' : 'CLOSED') : ''; }
      return '';
    }
    if (cmd.includes('whois')) return '';
    let effectiveCmd = cmd.replace(/^echo\s*(""\s*)?\|\s*/, '').trim();
    effectiveCmd = effectiveCmd.replace(/\|\|/g, '\x00\x00');
    const segments: string[] = []; let cur = ''; let inQ = false; let qCh = '';
    for (let i = 0; i < effectiveCmd.length; i++) {
      const ch = effectiveCmd[i];
      if (inQ) { cur += ch; if (ch === qCh) inQ = false; }
      else if (ch === '"' || ch === "'") { inQ = true; qCh = ch; cur += ch; }
      else if (ch === '|') { segments.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    segments.push(cur.trim());
    const restored = segments.map(s => s.replace(/\x00\x00/g, '||'));
    const mainCmd = restored[0]; const pipes = restored.slice(1);
    let output = '';
    if (mainCmd.includes('curl')) output = await handleCurl(mainCmd, timeout);
    else if (mainCmd.includes('dig')) output = await handleDig(mainCmd, timeout);
    else if (mainCmd.includes('nc ') || mainCmd.includes('/dev/tcp')) output = await handleNetcat(mainCmd, timeout);
    else return '';
    for (const pipe of pipes) output = applyPipe(output, pipe);
    return output.trim();
  } catch { return ''; }
}

// ══════════════════════════════════════════════════════════════════════════════
// BOTNET C2 SIGNATURES — Known malware fingerprints in service banners
// ══════════════════════════════════════════════════════════════════════════════

const C2_SIGNATURES = [
  { pattern: /mirai/i, port: 23, family: 'Mirai', severity: 'critical', desc: 'IoT botnet — DDoS, credential stuffing, cryptomining' },
  { pattern: /mozi\s+bot/i, port: 0, family: 'Mozi', severity: 'critical', desc: 'P2P botnet targeting IoT — DDoS, data theft' },
  { pattern: /hajime/i, port: 0, family: 'Hajime', severity: 'critical', desc: 'IoT botnet — modular architecture, persistent' },
  { pattern: /gafgyt|bashlite/i, port: 23, family: 'Gafgyt/Bashlite', severity: 'high', desc: 'IoT botnet — DDoS via HTTP floods' },
  { pattern: /emotet/i, port: 0, family: 'Emotet', severity: 'critical', desc: 'Banking trojan botnet — credential theft, ransomware delivery' },
  { pattern: /trickbot/i, port: 0, family: 'TrickBot', severity: 'critical', desc: 'Banking trojan — lateral movement, ransomware precursor' },
  { pattern: /cobalt\s*strike/i, port: 0, family: 'Cobalt Strike', severity: 'critical', desc: 'Commercial penetration testing tool — often used by APTs' },
  { pattern: /metasploit/i, port: 0, family: 'Metasploit', severity: 'critical', desc: 'Exploitation framework — active attack infrastructure' },
  { pattern: /covenant/i, port: 0, family: 'Covenant', severity: 'high', desc: '.NET C2 framework — post-exploitation agent' },
  { pattern: /sliver/i, port: 0, family: 'Sliver C2', severity: 'high', desc: 'C2 framework — used by red teams and threat actors' },
  { pattern: /brutal/i, port: 0, family: 'Brutal', severity: 'high', desc: 'Botnet controller — IRC-based C2' },
  { pattern: /phoenix/i, port: 0, family: 'Phoenix', severity: 'high', desc: 'Botnet — DDoS and credential harvesting' },
  { pattern: /darkcomet/i, port: 0, family: 'DarkComet', severity: 'high', desc: 'RAT — keylogging, screen capture, webcam access' },
  { pattern: /njrat/i, port: 0, family: 'NjRAT', severity: 'high', desc: 'RAT — credential theft, file transfer, registry manipulation' },
  { pattern: /darkhound/i, port: 0, family: 'Darkhound', severity: 'medium', desc: 'RAT variant — data exfiltration' },
  { pattern: /gh0st\s*RAT/i, port: 0, family: 'Gh0st RAT', severity: 'critical', desc: 'Advanced RAT — used by APT groups' },
  { pattern: /poison\s*ivy/i, port: 0, family: 'Poison Ivy', severity: 'high', desc: 'RAT — targeted attacks, file transfer' },
  { pattern: /zeus|zbot/i, port: 0, family: 'Zeus/Zbot', severity: 'critical', desc: 'Banking botnet — man-in-the-browser, form grabbing' },
  { pattern: /andromeda/i, port: 0, family: 'Andromeda', severity: 'high', desc: 'Botnet loader — distributes secondary payloads' },
  { pattern: /qakbot/i, port: 0, family: 'Qakbot', severity: 'critical', desc: 'Banking botnet — polymorphic, credential theft, ransomware delivery' },
  { pattern: /icedid/i, port: 0, family: 'IcedID', severity: 'high', desc: 'Banking trojan — credential theft, backdoor' },
  { pattern: /pikabot/i, port: 0, family: 'Pikabot', severity: 'high', desc: 'Botnet loader — spam campaigns, credential harvesting' },
];

const C2_PORTS = [
  { port: 6667, service: 'IRC (Botnet C2)', severity: 'high' },
  { port: 6668, service: 'IRC (Alt Botnet C2)', severity: 'high' },
  { port: 6669, service: 'IRC (Botnet C2)', severity: 'medium' },
  { port: 4444, service: 'Metasploit/Mirai Default C2', severity: 'critical' },
  { port: 1337, service: 'Common C2/Hacking Tool', severity: 'high' },
  { port: 31337, service: 'Back Orifice / Elite C2', severity: 'critical' },
  { port: 1234, service: 'Common Malware C2', severity: 'high' },
  { port: 5555, service: 'ADB / Common Malware', severity: 'high' },
  { port: 5554, service: 'Srizbi Botnet C2', severity: 'critical' },
  { port: 8866, service: 'Unknown Botnet C2', severity: 'medium' },
  { port: 1984, service: 'Elknot/Mirai Variant C2', severity: 'high' },
  { port: 5555, service: 'Malware C2', severity: 'high' },
  { port: 7777, service: 'Unknown C2', severity: 'medium' },
  { port: 8888, service: 'Common C2 / Backdoor', severity: 'medium' },
  { port: 9999, service: 'Common C2', severity: 'medium' },
  { port: 12345, service: 'NetBus / Common Backdoor', severity: 'critical' },
  { port: 27374, service: 'SubSeven Backdoor', severity: 'critical' },
  { port: 31338, service: 'Back Orifice Deep C2', severity: 'critical' },
  { port: 3322, service: 'Common C2', severity: 'medium' },
  { port: 6666, service: 'IRC Botnet C2', severity: 'high' },
  { port: 7000, service: 'CrazyBot / C2', severity: 'high' },
  { port: 7778, service: 'Prinim Bot C2', severity: 'medium' },
  { port: 8866, service: 'Unknown Bot C2', severity: 'medium' },
  { port: 9001, service: 'Apache/常见 C2', severity: 'medium' },
  { port: 9090, service: 'Prometheus / C2', severity: 'medium' },
  { port: 10000, service: 'Webmin / C2', severity: 'medium' },
  { port: 10001, service: '常见 Botnet C2', severity: 'high' },
  { port: 25657, service: 'Unknown Botnet C2', severity: 'medium' },
  { port: 37777, service: '常见 C2', severity: 'medium' },
  { port: 44322, service: '常见 C2', severity: 'high' },
];

// Known botnet-associated ASNs
const BOTNET_ASNS = [
  { asn: 'AS64089', desc: 'Known hosting for malicious infrastructure', severity: 'high' },
  { asn: 'AS44477', desc: 'Stark Industries Solutions — common in attacks', severity: 'high' },
  { asn: 'AS209103', desc: 'Private Layer — frequent malicious hosting', severity: 'medium' },
  { asn: 'AS62041', desc: 'M247 — known for botnet activity', severity: 'medium' },
  { asn: 'AS9009', desc: 'M247 Europe — malicious traffic source', severity: 'medium' },
  { asn: 'AS4808', desc: 'China Unicom — high attack traffic origin', severity: 'low' },
  { asn: 'AS4837', desc: 'China Telecom — high attack volume', severity: 'low' },
  { asn: 'AS4134', desc: 'China Telecom — significant DDoS source', severity: 'low' },
];

// ══════════════════════════════════════════════════════════════════════════════
// 1. IP REPUTATION INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

async function ipReputationScan(ip: string | null, domain: string): Promise<any> {
  const target = ip || domain;

  // Multi-source IP intel
  const [ipApi, rdns, whois] = await Promise.all([
    run(`curl -s --max-time 6 "http://ip-api.com/json/${target}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,reverse,mobile,proxy,hosting,query" 2>/dev/null`, 8000),
    run(`dig +short +time=3 -x ${target} 2>/dev/null`, 5000),
    run(`whois ${target} 2>/dev/null | head -40`, 8000),
  ]);

  let ipData: Record<string, any> = {};
  try { ipData = JSON.parse(ipApi); } catch { ipData = {}; }

  // Detect Tor exit node
  const torCheck = await run(`curl -s --max-time 5 "https://check.torproject.org/api/ip" 2>/dev/null | head -1`, 7000);

  // Proxy/VPN detection
  const isProxy = ipData.proxy === true;
  const isHosting = ipData.hosting === true;
  const isMobile = ipData.mobile === true;

  // ASN threat analysis
  const asn = ipData.as || '';
  const matchedASN = BOTNET_ASNS.find(b => asn.includes(b.asn));

  // Blacklist checks via multiple open resolvers
  const blacklistChecks = await Promise.all([
    run(`dig +short +time=2 ${target}.dnsbl.sorbs.net 2>/dev/null`, 4000),
    run(`dig +short +time=2 ${target}.bl.spamcop.net 2>/dev/null`, 4000),
    run(`dig +short +time=2 ${target}.zen.spamhaus.org 2>/dev/null`, 4000),
    run(`dig +short +time=2 ${target}.cbl.abuseat.org 2>/dev/null`, 4000),
  ]);
  const blacklistHits = blacklistChecks.filter(r => r && r !== '0' && !r.includes('NXDOMAIN')).length;

  return {
    ip: ipData.query || target,
    asn,
    isp: ipData.isp || 'Unknown',
    org: ipData.org || 'Unknown',
    geo: {
      country: ipData.country || 'Unknown',
      region: ipData.regionName || 'Unknown',
      city: ipData.city || 'Unknown',
      lat: ipData.lat,
      lon: ipData.lon,
      timezone: ipData.timezone,
    },
    reverseDns: rdns || 'No PTR record',
    reputation: {
      blacklistHits,
      totalBlacklists: blacklistChecks.length,
      score: Math.min(100, blacklistHits * 25 + (matchedASN ? 30 : 0) + (isHosting ? 10 : 0) + (isProxy ? 20 : 0)),
      threatLevel: blacklistHits >= 3 ? 'CRITICAL' : blacklistHits >= 1 ? 'HIGH' : matchedASN ? 'MEDIUM' : 'LOW',
    },
    flags: {
      tor: torCheck.includes('true') || false,
      proxy: isProxy,
      vpn: false, // Would need commercial API for full VPN detection
      datacenter: isHosting,
      mobile: isMobile,
      suspiciousASN: !!matchedASN,
    },
    whoisSnippet: whois.substring(0, 300),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. BOTNET C2 PORT SCAN
// ══════════════════════════════════════════════════════════════════════════════

async function scanC2Ports(ip: string | null, domain: string): Promise<any[]> {
  const target = ip || domain;
  const c2Infrastructure: any[] = [];

  const openC2Ports = await Promise.all(
    C2_PORTS.map(async (p) => {
      const result = await run(
        `timeout 3 bash -c 'echo > /dev/tcp/${target}/${p.port}' 2>/dev/null && echo "OPEN" || echo "CLOSED"`,
        4000
      );
      if (result.includes('OPEN')) {
        // Grab banner
        const banner = await run(
          `echo "" | timeout 3 nc -w2 ${target} ${p.port} 2>/dev/null | head -c 300`,
          5000
        );
        // Check for malware signatures
        const matchedSig = C2_SIGNATURES.find(s => s.pattern.test(banner) || s.pattern.test(p.service));

        c2Infrastructure.push({
          port: p.port,
          service: p.service,
          banner: banner.replace(/[\x00-\x1f\x7f]/g, '.').substring(0, 200) || 'No banner',
          severity: matchedSig ? matchedSig.severity : p.severity,
          malwareFamily: matchedSig?.family || null,
          malwareDesc: matchedSig?.desc || null,
          isC2: true,
        });
        return { port: p.port, open: true, service: p.service, severity: p.severity };
      }
      return null;
    })
  );

  return c2Infrastructure;
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. DNS-BASED BOTNET DETECTION
// ══════════════════════════════════════════════════════════════════════════════

async function dnsBotDetection(domain: string): Promise<any[]> {
  const indicators: any[] = [];

  // Check for DGA (Domain Generation Algorithm) patterns
  const dgaPatterns = /^[a-z]{12,20}\.(com|net|org|info|top|xyz)$/i;
  const subdomainParts = domain.split('.');
  for (const part of subdomainParts) {
    if (dgaPatterns.test(part)) {
      indicators.push({
        type: 'DGA Domain Pattern',
        severity: 'high',
        description: `Subdomain "${part}" matches DGA pattern — 12-20 random lowercase characters, common in botnet C2 domains.`,
        evidence: `Domain part "${part}" matches /^[a-z]{12,20}\\..*/`,
        asset: domain,
      });
    }
  }

  // Check for fast-flux DNS (multiple IPs rotating)
  const aRecords = await run(`dig +short +time=3 ${domain} A 2>/dev/null`, 5000);
  const ips = aRecords.split('\n').filter(l => l.trim() && /^\d+\.\d+\.\d+\.\d+$/.test(l.trim()));
  if (ips.length > 5) {
    indicators.push({
      type: 'Fast-Flux DNS Detected',
      severity: 'critical',
      description: `${ips.length} A records for single domain — possible fast-flux botnet technique. IP addresses rotate rapidly to evade blacklisting.`,
      evidence: `${ips.length} IPs: ${ips.slice(0, 8).join(', ')}...`,
      asset: domain,
    });
  }

  // Check for known malicious record patterns
  const txtRecords = await run(`dig +short +time=3 ${domain} TXT 2>/dev/null`, 5000);
  if (txtRecords) {
    const suspiciousPatterns = ['spf', 'dkim', 'v=spf'];
    // Check for encoded strings (base64 C2 beacons)
    for (const txt of txtRecords.split('\n').filter(Boolean)) {
      if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(txt.trim())) {
        indicators.push({
          type: 'Suspicious Base64 TXT Record',
          severity: 'high',
          description: `TXT record contains base64-encoded data — possible C2 beacon or data exfiltration channel.`,
          evidence: `TXT: ${txt.substring(0, 40)}...`,
          asset: domain,
        });
      }
    }
  }

  // DNS tunneling indicators
  const cnames = await run(`dig +short +time=3 ${domain} CNAME 2>/dev/null`, 5000);
  if (cnames && cnames.split('\n').length > 3) {
    indicators.push({
      type: 'Multiple CNAME Records — DNS Tunneling Indicator',
      severity: 'high',
      description: `${cnames.split('\n').filter(Boolean).length} CNAME records — could indicate DNS tunneling for C2 communication or data exfiltration.`,
      evidence: `CNAMEs: ${cnames.substring(0, 150)}`,
      asset: domain,
    });
  }

  // Newly registered domain check
  const whoisDate = await run(`whois ${domain} 2>/dev/null | grep -iE "creation date|created on|registered on|Registration Date" | head -1`, 8000);
  if (whoisDate) {
    const dateMatch = whoisDate.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
    if (dateMatch) {
      const regDate = new Date(dateMatch[1]);
      const ageDays = Math.floor((Date.now() - regDate.getTime()) / 86400000);
      if (ageDays < 30) {
        indicators.push({
          type: 'Newly Registered Domain — High Threat',
          severity: 'high',
          description: `Domain registered ${ageDays} days ago. Recently registered domains are 5x more likely to be used for phishing, malware, or C2.`,
          evidence: `Registered: ${dateMatch[1]} (${ageDays} days ago)`,
          asset: domain,
        });
      }
    }
  }

  // Typosquatting detection against common brands
  const brands = ['google', 'facebook', 'microsoft', 'apple', 'amazon', 'netflix', 'paypal', 'github', 'linkedin', 'twitter'];
  const domainLower = domain.toLowerCase();
  for (const brand of brands) {
    if (domainLower.includes(brand) && !domainLower.startsWith('www.')) {
      // Check if this is a typo or impersonation
      const distance = levenshteinDistance(domainLower.split('.')[0], brand);
      if (distance >= 1 && distance <= 3) {
        indicators.push({
          type: `Typosquatting — Impersonates ${brand}`,
          severity: 'critical',
          description: `Domain ${domain} resembles ${brand}.com (Levenshtein distance: ${distance}). Likely phishing or malware distribution.`,
          evidence: `"${domain.split('.')[0]}" vs "${brand}" (distance: ${distance})`,
          asset: domain,
        });
        break;
      }
    }
  }

  return indicators;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. THREAT CLASSIFICATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

function classifyThreat(ipRep: any, c2Infra: any[], dnsIndicators: any[]): any {
  let score = 0;
  const vectors: string[] = [];

  if (ipRep.reputation.blacklistHits > 0) {
    score += ipRep.reputation.blacklistHits * 25;
    vectors.push(`Blacklisted on ${ipRep.reputation.blacklistHits}/${ipRep.reputation.totalBlacklists} lists`);
  }
  if (ipRep.flags.tor) { score += 20; vectors.push('Tor exit node'); }
  if (ipRep.flags.proxy) { score += 15; vectors.push('Proxy detected'); }
  if (ipRep.flags.datacenter) { score += 5; vectors.push('Datacenter IP'); }
  if (ipRep.flags.suspiciousASN) { score += 30; vectors.push(`Suspicious ASN: ${ipRep.asn}`); }

  for (const c2 of c2Infra) {
    score += c2.severity === 'critical' ? 30 : c2.severity === 'high' ? 20 : 10;
    vectors.push(`C2 port ${c2.port} (${c2.service})`);
    if (c2.malwareFamily) vectors.push(`Malware: ${c2.malwareFamily}`);
  }

  for (const ind of dnsIndicators) {
    score += ind.severity === 'critical' ? 30 : ind.severity === 'high' ? 20 : 10;
    vectors.push(ind.type);
  }

  score = Math.min(100, score);
  const level = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';

  return {
    score,
    level,
    vectors,
    recommendation: score >= 75
      ? 'IMMEDIATE ACTION: Quarantine IP, block all traffic, investigate all connections'
      : score >= 50
      ? 'ESCALATE: Deep packet inspection required, monitor all connections, prepare containment'
      : score >= 25
      ? 'MONITOR: Flag for observation, increase logging, alert on new connections'
      : 'WATCH: Low threat — standard monitoring sufficient',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN POST HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const rawTarget = body.target?.toString().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const mode = body.mode || 'hunt';

    const sanitized = sanitizeTarget(rawTarget);
    if (!sanitized) {
      return NextResponse.json({ error: 'Invalid target domain or IP' }, { status: 400 });
    }
    if (isBlockedDomain(sanitized)) {
      return NextResponse.json({ error: 'Target domain is not permitted' }, { status: 403 });
    }

    // Resolve to IP if domain
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(sanitized);
    const ip = isIP ? sanitized : (await run(`dig +short +time=3 +tries=1 ${sanitized} A`, 5000)).split('\n')[0]?.trim() || null;

    if (!ip && !isIP) {
      return NextResponse.json({ error: `Could not resolve ${sanitized}` }, { status: 400 });
    }
    if (ip && isPrivateIP(ip)) {
      return NextResponse.json({ error: 'Target resolves to a private or reserved IP address' }, { status: 403 });
    }

    const resolvedIP = ip || sanitized;
    const target = sanitized;

    // Run all intelligence modules in parallel
    const [
      ipRep,
      c2Infra,
      dnsIndicators,
    ] = await Promise.all([
      ipReputationScan(resolvedIP, target),
      scanC2Ports(resolvedIP, target),
      dnsBotDetection(target),
    ]);

    // Classify threat
    const threatClassification = classifyThreat(ipRep, c2Infra, dnsIndicators);

    // Bot Cage data
    const cageStatus = {
      quarantined: threatClassification.score >= 75,
      monitored: threatClassification.score >= 25,
      threats: threatClassification.vectors,
      quarantineReason: threatClassification.score >= 75
        ? `${c2Infra.length} C2 ports + ${dnsIndicators.length} threat indicators + ${ipRep.reputation.blacklistHits} blacklist hits`
        : null,
      responsePlaybook: threatClassification.score >= 75
        ? ['BLOCK: Add to firewall deny list', 'MONITOR: Enable full packet capture', 'INVESTIGATE: Trace all outbound connections', 'CONTAIN: Isolate from network', 'REPORT: Submit to threat intel sharing']
        : threatClassification.score >= 50
        ? ['MONITOR: Enable enhanced logging', 'ALERT: Set tripwires on new connections', 'INVESTIGATE: Analyze traffic patterns', 'PREPARE: Draft containment plan']
        : ['LOG: Standard monitoring', 'WATCH: Alert on unusual patterns'],
    };

    return applySecurityHeaders(NextResponse.json({
      success: true,
      target,
      resolvedIP,
      mode,
      botIntel: {
        ipReputation: ipRep,
        botnetIndicators: {
          c2Ports: C2_PORTS.map(p => ({ port: p.port, service: p.service, severity: p.severity })),
          malwareSignatures: C2_SIGNATURES.map(s => ({ family: s.family, severity: s.severity, desc: s.desc })),
          detectedC2: c2Infra,
        },
        threatClassification,
        dnsIntelligence: dnsIndicators,
        c2Infrastructure: c2Infra,
        attackVectors: threatClassification.vectors.map((v: string, i: number) => ({
          id: `AV-${String(i + 1).padStart(3, '0')}`,
          type: v,
          severity: i < 2 ? 'critical' : i < 5 ? 'high' : 'medium',
          description: v,
          proof: i < c2Infra.length ? c2Infra[i]?.banner : 'DNS/Reputation analysis',
        })),
        cageStatus,
      },
    }));
  } catch (error) {
    return safeErrorResponse(error, 500, 'bot-hunter');
  }
}
