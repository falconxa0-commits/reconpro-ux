import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════
// REAL RECONNAISSANCE ENGINE
// All data comes from actual DNS lookups, HTTP requests, SSL checks
// ═══════════════════════════════════════════════════════════════════════

// ── Helper: Run shell command with timeout ─────────────────────────
function run(cmd: string, timeout = 10000): string {
  try {
    return execSync(cmd, { timeout, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

// ── Helper: DNS query via dig ─────────────────────────────────────
function digQuery(domain: string, type: string): string[] {
  const output = run(`dig +short ${domain} ${type}`, 8000);
  if (!output) return [];
  return output.split('\n').map(l => l.trim()).filter(Boolean);
}

function digFull(domain: string, type: string): string {
  return run(`dig +noall +answer ${domain} ${type}`, 8000);
}

// ── Helper: Check if domain resolves ──────────────────────────────
function resolves(domain: string): string | null {
  const ip = run(`dig +short +time=2 +tries=1 ${domain} A`, 3000);
  if (!ip) return null;
  // Return first IP (skip CNAME lines)
  for (const line of ip.split('\n')) {
    const trimmed = line.trim();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) return trimmed;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. REAL DNS ENUMERATION
// ═══════════════════════════════════════════════════════════════════════
function enumerateDNS(domain: string) {
  const findings: Array<{
    title: string; severity: string; category: string;
    description: string; evidence: string; asset: string;
  }> = [];

  // ── A / AAAA records ────────────────────────────────────────────
  const aRecords = digQuery(domain, 'A');
  const aaaaRecords = digQuery(domain, 'AAAA');
  const mainIp = aRecords[0] || 'unknown';

  if (aRecords.length > 0) {
    findings.push({
      title: `DNS A Record — ${aRecords.length} IPv4 address(es)`,
      severity: 'info', category: 'dns',
      description: `Domain ${domain} resolves to ${aRecords.length} IPv4 address(es): ${aRecords.join(', ')}. Multiple A records may indicate round-robin DNS or CDN usage.`,
      evidence: `A: ${aRecords.join(', ')}`,
      asset: domain,
    });
  }
  if (aaaaRecords.length > 0) {
    findings.push({
      title: `DNS AAAA Record — IPv6 enabled`,
      severity: 'info', category: 'dns',
      description: `Domain has ${aaaaRecords.length} IPv6 address(es): ${aaaaRecords.join(', ')}. IPv6 support is present.`,
      evidence: `AAAA: ${aaaaRecords.join(', ')}`,
      asset: domain,
    });
  }

  // ── MX Records (email) ──────────────────────────────────────────
  const mxRaw = digFull(domain, 'MX');
  if (mxRaw) {
    const mxRecords = mxRaw.split('\n').filter(l => l.includes('MX'));
    findings.push({
      title: `MX Records — ${mxRecords.length} mail server(s)`,
      severity: 'info', category: 'dns',
      description: `${mxRecords.length} mail server(s) configured for ${domain}:\n${mxRecords.map(m => '  ' + m.trim()).join('\n')}`,
      evidence: mxRecords.join('; '),
      asset: domain,
    });
  } else {
    findings.push({
      title: 'No MX Records — No Email Infrastructure',
      severity: 'low', category: 'dns',
      description: `No MX records found for ${domain}. This domain does not receive email directly, or uses a third-party email service with different MX configuration.`,
      evidence: 'MX query returned empty',
      asset: domain,
    });
  }

  // ── NS Records ──────────────────────────────────────────────────
  const nsRaw = digFull(domain, 'NS');
  if (nsRaw) {
    const nsRecords = nsRaw.split('\n').filter(l => l.includes('NS'));
    findings.push({
      title: `NS Records — ${nsRecords.length} nameserver(s)`,
      severity: 'info', category: 'dns',
      description: `Domain uses ${nsRecords.length} nameserver(s): ${nsRecords.map(n => n.trim().split(/\s+/).pop()).join(', ')}.`,
      evidence: nsRecords.join('; '),
      asset: domain,
    });
  }

  // ── TXT Records ─────────────────────────────────────────────────
  const txtRecords = digQuery(domain, 'TXT');
  if (txtRecords.length > 0) {
    findings.push({
      title: `TXT Records — ${txtRecords.length} record(s)`,
      severity: 'info', category: 'dns',
      description: `Found ${txtRecords.length} TXT record(s) including verification records, SPF policies, or other domain-level configurations.`,
      evidence: txtRecords.join(' | '),
      asset: domain,
    });
  }

  // ── SPF Check ───────────────────────────────────────────────────
  const spfRecord = txtRecords.find(t => t.startsWith('"v=spf'));
  if (!spfRecord) {
    findings.push({
      title: 'SPF Record Missing',
      severity: 'high', category: 'dns',
      description: `No SPF (Sender Policy Framework) record found for ${domain}. Without SPF, malicious actors can send spoofed emails appearing to come from this domain, leading to phishing attacks and brand damage. This is a critical email security failure.`,
      evidence: `TXT query returned ${txtRecords.length} record(s), none containing "v=spf1"`,
      asset: domain,
    });
  } else {
    const hasAll = spfRecord.includes('+all') || spfRecord.includes('?all');
    const hasNone = spfRecord.includes('-all') || spfRecord.includes('~all');
    if (hasAll) {
      findings.push({
        title: 'SPF Record Uses +all or ?all (Open)',
        severity: 'critical', category: 'dns',
        description: `SPF record uses "${hasAll ? (spfRecord.includes('+all') ? '+all' : '?all') : ''}" which essentially allows ANY server to send email on behalf of ${domain}. This completely defeats the purpose of SPF and provides zero protection against email spoofing.`,
        evidence: `SPF: ${spfRecord}`,
        asset: domain,
      });
    } else if (hasNone) {
      findings.push({
        title: 'SPF Record Configured Properly',
        severity: 'info', category: 'dns',
        description: `SPF record found with proper hard/soft fail: ${spfRecord}. Email spoofing protection is in place.`,
        evidence: `SPF: ${spfRecord}`,
        asset: domain,
      });
    }
  }

  // ── DMARC Check ─────────────────────────────────────────────────
  const dmarcRecord = digQuery(`_dmarc.${domain}`, 'TXT');
  const dmarc = dmarcRecord.find(t => t.includes('v=DMARC'));
  if (!dmarc) {
    findings.push({
      title: 'DMARC Record Not Found',
      severity: 'high', category: 'dns',
      description: `No DMARC record found for ${domain}. DMARC builds on SPF and DKIM to provide domain-level email authentication policy. Without DMARC, the domain cannot specify how receivers should handle unauthenticated emails, making phishing attacks much harder to detect and prevent.`,
      evidence: `_dmarc.${domain} TXT query returned empty`,
      asset: `_dmarc.${domain}`,
    });
  } else {
    const pMatch = dmarc.match(/p=([a-z]+)/);
    const policy = pMatch ? pMatch[1] : 'unknown';
    if (policy === 'none') {
      findings.push({
        title: 'DMARC Policy Set to "none" (Monitor Only)',
        severity: 'medium', category: 'dns',
        description: `DMARC is configured but with p=none, meaning unauthenticated emails are not rejected — only monitored. While this provides visibility, it does not actively protect against phishing. Consider upgrading to p=quarantine or p=reject.`,
        evidence: `DMARC: ${dmarc}`,
        asset: `_dmarc.${domain}`,
      });
    } else {
      findings.push({
        title: `DMARC Policy Active (p=${policy})`,
        severity: 'info', category: 'dns',
        description: `DMARC record found with policy p=${policy}. Email authentication enforcement is configured.`,
        evidence: `DMARC: ${dmarc}`,
        asset: `_dmarc.${domain}`,
      });
    }
  }

  // ── DKIM Check ──────────────────────────────────────────────────
  const dkimSelectors = ['selector1', 'selector2', 'google', 'k1', 'default', 's1', 'selector'];
  let dkimFound = false;
  for (const sel of dkimSelectors) {
    const dkim = digQuery(`${sel}._domainkey.${domain}`, 'TXT');
    if (dkim.length > 0 && dkim[0].includes('v=DKIM')) {
      findings.push({
        title: `DKIM Record Found (selector: ${sel})`,
        severity: 'info', category: 'dns',
        description: `DKIM signing is configured for ${domain} using selector "${sel}". This allows the domain to cryptographically sign outgoing emails, proving they were not tampered with in transit.`,
        evidence: `DKIM selector: ${sel}, record length: ${dkim[0].length} chars`,
        asset: `${sel}._domainkey.${domain}`,
      });
      dkimFound = true;
      break;
    }
  }
  if (!dkimFound) {
    findings.push({
      title: 'DKIM Record Not Found',
      severity: 'medium', category: 'dns',
      description: `No DKIM (DomainKeys Identified Mail) record found for common selectors. Without DKIM, outgoing emails cannot be cryptographically verified, reducing email deliverability and making it harder for recipients to distinguish legitimate from spoofed emails.`,
      evidence: `Checked selectors: ${dkimSelectors.join(', ')}`,
      asset: domain,
    });
  }

  // ── DNSSEC Check ────────────────────────────────────────────────
  const dnssecOutput = run(`dig +dnssec ${domain} A`, 8000);
  const hasDnssec = dnssecOutput.includes('RRSIG') || dnssecOutput.includes('DO');
  if (!hasDnssec) {
    findings.push({
      title: 'DNSSEC Not Enabled',
      severity: 'medium', category: 'dns',
      description: `DNSSEC is not configured for ${domain}. Without DNSSEC, DNS responses can be spoofed via cache poisoning attacks, potentially redirecting users to malicious sites. DNSSEC adds cryptographic signatures to DNS records to verify authenticity.`,
      evidence: 'DNSSEC RRSIG not found in DNS response',
      asset: domain,
    });
  } else {
    findings.push({
      title: 'DNSSEC Enabled',
      severity: 'info', category: 'dns',
      description: `DNSSEC is active for ${domain}, providing cryptographic authentication of DNS responses. This protects against DNS cache poisoning and spoofing attacks.`,
      evidence: 'RRSIG records present in DNS response',
      asset: domain,
    });
  }

  // ── CNAME Records ───────────────────────────────────────────────
  const cnameRecords = digQuery(domain, 'CNAME');
  if (cnameRecords.length > 0) {
    const cnames = cnameRecords.filter(c => !c.includes('.cdn.') && !c.includes('.cloudfront.') && !c.includes('.akamai.'));
    if (cnames.length > 0) {
      findings.push({
        title: `CNAME Record — Points to ${cnames[0]}`,
        severity: 'info', category: 'dns',
        description: `Domain is aliased via CNAME to ${cnames[0]}. CNAME chains add DNS lookup latency and if the target becomes unavailable, this domain will also fail.`,
        evidence: `CNAME: ${cnames[0]}`,
        asset: domain,
      });
    }
  }

  return { findings, mainIp: mainIp === 'unknown' ? null : mainIp };
}

// ═══════════════════════════════════════════════════════════════════════
// 2. REAL SUBDOMAIN ENUMERATION (via actual DNS resolution)
// ═══════════════════════════════════════════════════════════════════════
const SUBDOMAINS = [
  'www', 'api', 'mail', 'ftp', 'admin', 'portal', 'dashboard', 'app',
  'dev', 'staging', 'test', 'beta', 'cdn', 'static', 'assets', 'images',
  'blog', 'news', 'shop', 'store', 'secure', 'auth', 'login', 'sso',
  'vpn', 'remote', 'gateway', 'proxy', 'ns1', 'ns2', 'mx', 'dns',
  'db', 'database', 'redis', 'elastic', 'search', 'analytics', 'track',
  'webhook', 'hooks', 'api-v1', 'api-v2', 'graphql', 'internal',
  'ci', 'cd', 'jenkins', 'git', 'gitlab', 'github', 'repo',
  'docs', 'wiki', 'help', 'support', 'status', 'health', 'monitor',
  'metrics', 'grafana', 'prometheus', 'kibana', 'logs', 'm',
  'mobile', 'amp', 'pwa', 'crm', 'erp', 'hr', 'billing',
  'sandbox', 'demo', 'preview', 'v2', 'v3', 'staging1', 'staging2',
  'smtp', 'pop', 'imap', 'webmail', 'autodiscover', 'mx1', 'mx2',
  'origin', 'edge', 'cdn1', 'cdn2', 'static1', 'media', 'video',
  'go', 'play', 'run', 'link', 'links', 'short', 'redirect',
  'panel', 'cpanel', 'whm', 'plesk', 'webmin', 'server', 'node',
  'us', 'eu', 'uk', 'asia', 'app1', 'app2', 'web1', 'web2',
];

async function enumerateSubdomains(domain: string): Promise<Array<{
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
}>> {
  const findings: Array<{
    title: string; severity: string; category: string;
    description: string; evidence: string; asset: string;
  }> = [];

  // Resolve in parallel batches
  const batchSize = 30;
  const results: Array<{ subdomain: string; ip: string | null }> = [];

  for (let i = 0; i < SUBDOMAINS.length; i += batchSize) {
    const batch = SUBDOMAINS.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (sub) => {
        const fqdn = `${sub}.${domain}`;
        const ip = resolves(fqdn);
        return { subdomain: fqdn, ip };
      })
    );
    results.push(...batchResults);
  }

  const discovered = results.filter(r => r.ip !== null);
  const sensitiveSubs = ['admin', 'portal', 'dashboard', 'db', 'database', 'redis',
    'jenkins', 'gitlab', 'git', 'internal', 'staging', 'dev', 'test',
    'vpn', 'remote', 'proxy', 'elastic', 'kibana', 'grafana', 'prometheus',
    'cpanel', 'plesk', 'webmin', 'phpmyadmin', 'server', 'smtp', 'webmail'];

  for (const { subdomain, ip } of discovered) {
    const subName = subdomain.replace(`.${domain}`, '');
    const isSensitive = sensitiveSubs.some(s => subName.includes(s));

    findings.push({
      title: `Discovered Subdomain: ${subdomain}`,
      severity: isSensitive ? 'high' : 'info',
      category: 'subdomain',
      description: `${subdomain} resolves to ${ip}.${isSensitive ? ` This appears to be a sensitive internal service (${subName}) that is publicly accessible. This is a significant security concern as it may expose administrative interfaces, development environments, or internal tools to the internet.` : ' This is a publicly accessible subdomain providing additional attack surface for reconnaissance and potential exploitation.'}`,
      evidence: `A record: ${ip}`,
      asset: subdomain,
    });
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. REAL HTTP HEADER ANALYSIS
// ═══════════════════════════════════════════════════════════════════════
function analyzeHTTPHeaders(domain: string): Array<{
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
  technologies: string[];
}> {
  const findings: ReturnType<typeof analyzeHTTPHeaders> = [];
  const technologies: string[] = [];

  // Fetch headers from both HTTP and HTTPS
  const httpsHeaders = run(`curl -sI --max-time 8 -L https://${domain} 2>/dev/null`, 12000);
  const httpHeaders = run(`curl -sI --max-time 8 -L http://${domain} 2>/dev/null`, 12000);
  const headers = httpsHeaders || httpHeaders;
  const allHeaders = httpsHeaders + '\n' + httpHeaders;

  if (!headers || !headers.includes('HTTP/')) {
    findings.push({
      title: 'HTTP Service Not Reachable',
      severity: 'medium', category: 'header',
      description: `Could not establish HTTP/HTTPS connection to ${domain}. The server may be down, blocking our IP, or using non-standard ports.`,
      evidence: 'curl returned empty or non-HTTP response',
      asset: domain,
      technologies: [],
    });
    return findings;
  }

  // Parse headers into key-value map
  const headerMap: Record<string, string> = {};
  for (const line of headers.split('\n')) {
    const match = line.match(/^([^:]+):\s*(.+)/);
    if (match) headerMap[match[1].trim().toLowerCase()] = match[2].trim();
  }

  // ── HSTS ────────────────────────────────────────────────────────
  if (!headerMap['strict-transport-security']) {
    findings.push({
      title: 'Missing Strict-Transport-Security (HSTS)',
      severity: 'high', category: 'header',
      description: `The HSTS header is not set on ${domain}. Without HSTS, browsers may attempt to connect via HTTP before redirecting to HTTPS, creating a window for man-in-the-middle attacks via SSL stripping. Setting HSTS with a long max-age (at least 1 year) and includeSubDomains ensures browsers always use HTTPS.`,
      evidence: 'strict-transport-security header not found in response',
      asset: domain,
      technologies,
    });
  } else {
    const hsts = headerMap['strict-transport-security'];
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
    const hasSubdomains = hsts.includes('includeSubDomains');
    const hasPreload = hsts.includes('preload');
    if (maxAge < 31536000) {
      findings.push({
        title: `HSTS max-age Too Short (${Math.round(maxAge / 86400)} days)`,
        severity: 'medium', category: 'header',
        description: `HSTS is set but max-age is only ${maxAge} seconds (${Math.round(maxAge / 86400)} days). Industry best practice recommends at least 1 year (31536000 seconds). Short max-age values leave users vulnerable during the period after certificate renewal or first visit.`,
        evidence: `strict-transport-security: ${hsts}`,
        asset: domain,
        technologies,
      });
    } else if (!hasSubdomains) {
      findings.push({
        title: 'HSTS Missing includeSubDomains Directive',
        severity: 'medium', category: 'header',
        description: `HSTS is configured but without includeSubDomains. Subdomains remain vulnerable to SSL stripping attacks. Add includeSubDomains to extend HSTS protection across all subdomains.`,
        evidence: `strict-transport-security: ${hsts}`,
        asset: domain,
        technologies,
      });
    } else {
      findings.push({
        title: 'HSTS Properly Configured',
        severity: 'info', category: 'header',
        description: `HSTS is active with max-age=${maxAge}${hasSubdomains ? ', includeSubDomains' : ''}${hasPreload ? ', preload' : ''}. HTTPS is enforced at the browser level.`,
        evidence: `strict-transport-security: ${hsts}`,
        asset: domain,
        technologies,
      });
    }
  }

  // ── Content-Security-Policy ─────────────────────────────────────
  if (!headerMap['content-security-policy'] && !headerMap['content-security-policy-report-only']) {
    findings.push({
      title: 'Missing Content-Security-Policy (CSP)',
      severity: 'high', category: 'header',
      description: `No Content-Security-Policy header found. CSP is the primary defense against Cross-Site Scripting (XSS) and data injection attacks. Without CSP, the browser will execute any inline scripts, load resources from any origin, and eval() arbitrary code. A strict CSP with nonce-based or hash-based script sources is strongly recommended.`,
      evidence: 'content-security-policy header not found',
      asset: domain,
      technologies,
    });
  } else {
    const csp = headerMap['content-security-policy'] || headerMap['content-security-policy-report-only'];
    if (csp.includes("'unsafe-inline'") && csp.includes("'unsafe-eval'")) {
      findings.push({
        title: 'CSP Uses unsafe-inline and unsafe-eval',
        severity: 'medium', category: 'header',
        description: `Content-Security-Policy is present but includes both 'unsafe-inline' and 'unsafe-eval', which significantly weaken XSS protection. 'unsafe-inline' allows inline script execution and 'unsafe-eval' allows eval() calls, both of which are common XSS vectors. Consider using nonces or hashes instead.`,
        evidence: `CSP: ${csp.substring(0, 200)}...`,
        asset: domain,
        technologies,
      });
    } else {
      findings.push({
        title: 'Content-Security-Policy Configured',
        severity: 'info', category: 'header',
        description: `CSP header is present, providing XSS and data injection protection.`,
        evidence: `CSP: ${csp.substring(0, 150)}${csp.length > 150 ? '...' : ''}`,
        asset: domain,
        technologies,
      });
    }
  }

  // ── X-Frame-Options ─────────────────────────────────────────────
  if (!headerMap['x-frame-options']) {
    findings.push({
      title: 'Missing X-Frame-Options Header',
      severity: 'medium', category: 'header',
      description: `No X-Frame-Options header detected. This makes the site vulnerable to clickjacking attacks where an attacker can embed this site in a transparent iframe and trick users into clicking hidden elements. Set to "DENY" or "SAMEORIGIN" to prevent framing.`,
      evidence: 'x-frame-options header not found',
      asset: domain,
      technologies,
    });
  }

  // ── X-Content-Type-Options ──────────────────────────────────────
  if (!headerMap['x-content-type-options'] || headerMap['x-content-type-options'] !== 'nosniff') {
    findings.push({
      title: 'Missing X-Content-Type-Options: nosniff',
      severity: 'low', category: 'header',
      description: `X-Content-Type-Options header is not set to "nosniff". Without this header, browsers may perform MIME-type sniffing which can cause executable content to be treated as a different (more dangerous) type than intended by the server.`,
      evidence: `x-content-type-options: ${headerMap['x-content-type-options'] || 'not set'}`,
      asset: domain,
      technologies,
    });
  }

  // ── Referrer-Policy ─────────────────────────────────────────────
  if (!headerMap['referrer-policy']) {
    findings.push({
      title: 'Missing Referrer-Policy Header',
      severity: 'low', category: 'header',
      description: `No Referrer-Policy header set. By default, browsers may send full URL referrers to third-party sites, potentially leaking sensitive path/query parameters. Set to "strict-origin-when-cross-origin" or "no-referrer" for better privacy.`,
      evidence: 'referrer-policy header not found',
      asset: domain,
      technologies,
    });
  }

  // ── Permissions-Policy ──────────────────────────────────────────
  if (!headerMap['permissions-policy'] && !headerMap['feature-policy']) {
    findings.push({
      title: 'Missing Permissions-Policy Header',
      severity: 'low', category: 'header',
      description: `No Permissions-Policy (formerly Feature-Policy) header detected. This header controls which browser features (camera, microphone, geolocation, etc.) the site can use. Without it, the site may be vulnerable to malicious feature abuse through embedded iframes.`,
      evidence: 'permissions-policy header not found',
      asset: domain,
      technologies,
    });
  }

  // ── CORS ────────────────────────────────────────────────────────
  if (headerMap['access-control-allow-origin']) {
    const cors = headerMap['access-control-allow-origin'];
    if (cors === '*') {
      findings.push({
        title: 'CORS Allows Any Origin (*)',
        severity: 'high', category: 'header',
        description: `Access-Control-Allow-Origin is set to "*" which means any website can make cross-origin requests to this domain and read the responses. If this endpoint serves sensitive data, it can be exfiltrated by any malicious website a user visits. Restrict to specific trusted origins.`,
        evidence: `access-control-allow-origin: *`,
        asset: domain,
        technologies,
      });
    } else if (headerMap['access-control-allow-credentials'] === 'true' && cors !== '*') {
      findings.push({
        title: 'CORS with Credentials to Specific Origin',
        severity: 'info', category: 'header',
        description: `CORS is configured to allow credentials from specific origin: ${cors}. This is a secure configuration when the origin is trusted.`,
        evidence: `access-control-allow-origin: ${cors}, access-control-allow-credentials: true`,
        asset: domain,
        technologies,
      });
    }
  }

  // ── Server Version Disclosure ───────────────────────────────────
  if (headerMap['server']) {
    const server = headerMap['server'];
    technologies.push(server);
    const hasVersion = /\d+\.\d+/.test(server);
    if (hasVersion) {
      findings.push({
        title: 'Server Version Disclosure',
        severity: 'medium', category: 'header',
        description: `The Server header reveals "${server}" including version information. Attackers can use this to identify known vulnerabilities specific to this exact server version. Remove or obfuscate version numbers from the Server header to reduce information leakage.`,
        evidence: `server: ${server}`,
        asset: domain,
        technologies,
      });
    }
  }

  // ── X-Powered-By Disclosure ─────────────────────────────────────
  if (headerMap['x-powered-by']) {
    const powered = headerMap['x-powered-by'];
    technologies.push(powered);
    findings.push({
      title: `Technology Disclosure: X-Powered-By: ${powered}`,
      severity: 'low', category: 'header',
      description: `The X-Powered-By header reveals the backend technology stack: "${powered}". This information helps attackers narrow down their exploitation strategy to known vulnerabilities in this specific technology. Remove this header in production.`,
      evidence: `x-powered-by: ${powered}`,
      asset: domain,
      technologies,
    });
  }

  // ── Detect technologies from headers ────────────────────────────
  if (headerMap['cf-ray'] || headerMap['cf-cache-status']) {
    technologies.push('Cloudflare');
  }
  if (allHeaders.includes('X-Amz-Cf-Id') || allHeaders.includes('x-amzn-requestid')) {
    technologies.push('AWS CloudFront');
  }
  if (headerMap['x-vercel-id']) {
    technologies.push('Vercel');
  }
  if (headerMap['x-netlify-request-id']) {
    technologies.push('Netlify');
  }
  if (headerMap['fly-request-id']) {
    technologies.push('Fly.io');
  }
  if (headerMap['x-github-request-id']) {
    technologies.push('GitHub Pages');
  }
  if (headerMap['alt-svc']?.includes('h3')) {
    technologies.push('HTTP/3 (QUIC)');
  }
  if (headerMap['x-cache']?.includes('HIT')) {
    technologies.push('CDN Cache Active');
  }

  return { findings, technologies };
}

// ═══════════════════════════════════════════════════════════════════════
// 4. REAL SSL/TLS CERTIFICATE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════
function analyzeSSL(domain: string): Array<{
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
  technologies: string[];
}> {
  const findings: ReturnType<typeof analyzeSSL> = [];
  const technologies: string[] = [];

  // Get certificate details
  const certInfo = run(
    `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null`,
    10000
  );

  // Get full cert text for protocol/cipher analysis
  const sslConnect = run(
    `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>&1`,
    10000
  );

  if (!certInfo && !sslConnect.includes('SSL handshake')) {
    // Try without SNI
    const certInfoNoSni = run(
      `echo | openssl s_client -connect ${domain}:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null`,
      10000
    );
    if (!certInfoNoSni) {
      findings.push({
        title: 'SSL/TLS Connection Failed',
        severity: 'high', category: 'ssl',
        description: `Could not establish SSL/TLS connection to ${domain}:443. The server may not support HTTPS, may be using a non-standard port, or may be rejecting the connection.`,
        evidence: 'openssl s_client failed to connect',
        asset: `${domain}:443`,
        technologies,
      });
      return { findings, technologies };
    }
  }

  const fullCert = certInfo || sslConnect;

  // ── Certificate Subject ─────────────────────────────────────────
  const subjectMatch = fullCert.match(/subject=([^\n]+)/);
  const subject = subjectMatch ? subjectMatch[1].trim() : 'unknown';
  findings.push({
    title: `SSL Certificate Subject: ${subject}`,
    severity: 'info', category: 'ssl',
    description: `The SSL certificate is issued to: ${subject}. This identifies the entity the certificate was issued to.`,
    evidence: `subject: ${subject}`,
    asset: domain,
    technologies,
  });

  // ── Issuer ──────────────────────────────────────────────────────
  const issuerMatch = fullCert.match(/issuer=([^\n]+)/);
  const issuer = issuerMatch ? issuerMatch[1].trim() : 'unknown';
  if (issuer.includes("Let's Encrypt")) {
    technologies.push("Let's Encrypt");
  } else if (issuer.includes('DigiCert')) {
    technologies.push('DigiCert');
  } else if (issuer.includes('Sectigo') || issuer.includes('Comodo')) {
    technologies.push('Sectigo');
  } else if (issuer.includes('Cloudflare')) {
    technologies.push('Cloudflare SSL');
  } else if (issuer.includes('Amazon') || issuer.includes('AWS')) {
    technologies.push('AWS Certificate Manager');
  } else if (issuer.includes('Google')) {
    technologies.push('Google Trust Services');
  }

  findings.push({
    title: `SSL Certificate Issuer: ${issuer}`,
    severity: 'info', category: 'ssl',
    description: `Certificate issued by: ${issuer}. The CA (Certificate Authority) is responsible for verifying the identity of the certificate holder.`,
    evidence: `issuer: ${issuer}`,
    asset: domain,
    technologies,
  });

  // ── Validity Dates ──────────────────────────────────────────────
  const notBeforeMatch = fullCert.match(/notBefore=(.+)/);
  const notAfterMatch = fullCert.match(/notAfter=(.+)/);
  if (notBeforeMatch && notAfterMatch) {
    const notBefore = new Date(notBeforeMatch[1].trim());
    const notAfter = new Date(notAfterMatch[1].trim());
    const now = new Date();
    const daysUntilExpiry = Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    findings.push({
      title: `SSL Certificate Validity: ${notBefore.toISOString().split('T')[0]} — ${notAfter.toISOString().split('T')[0]}`,
      severity: 'info', category: 'ssl',
      description: `Certificate is valid from ${notBefore.toISOString().split('T')[0]} to ${notAfter.toISOString().split('T')[0]}. Certificate lifespan is ${Math.ceil((notAfter.getTime() - notBefore.getTime()) / (1000 * 60 * 60 * 24))} days.`,
      evidence: `notBefore: ${notBeforeMatch[1].trim()}, notAfter: ${notAfterMatch[1].trim()}`,
      asset: domain,
      technologies,
    });

    if (daysUntilExpiry < 0) {
      findings.push({
        title: `SSL Certificate EXPIRED ${Math.abs(daysUntilExpiry)} days ago`,
        severity: 'critical', category: 'ssl',
        description: `The SSL certificate for ${domain} expired ${Math.abs(daysUntilExpiry)} days ago. All major browsers will display security warnings, users will be unable to access the site without manual override, and search engines will flag the site as insecure. This requires immediate remediation. Additionally, any automated systems relying on this certificate (APIs, webhooks, microservices) will fail with TLS errors.`,
        evidence: `Expired on: ${notAfter.toISOString()}`,
        asset: domain,
        technologies,
      });
    } else if (daysUntilExpiry <= 7) {
      findings.push({
        title: `SSL Certificate Expiring in ${daysUntilExpiry} Days — CRITICAL`,
        severity: 'critical', category: 'ssl',
        description: `The SSL certificate expires in only ${daysUntilExpiry} days. Immediate action is required to avoid service disruption. Schedule certificate renewal and deployment as an emergency task.`,
        evidence: `Expires: ${notAfter.toISOString()} (${daysUntilExpiry} days)`,
        asset: domain,
        technologies,
      });
    } else if (daysUntilExpiry <= 30) {
      findings.push({
        title: `SSL Certificate Expiring in ${daysUntilExpiry} Days`,
        severity: 'high', category: 'ssl',
        description: `The SSL certificate expires in ${daysUntilExpiry} days. While not immediately critical, this should be renewed promptly to avoid last-minute emergency deployments. Automated certificate renewal (e.g., certbot cron) is recommended.`,
        evidence: `Expires: ${notAfter.toISOString()} (${daysUntilExpiry} days)`,
        asset: domain,
        technologies,
      });
    } else if (daysUntilExpiry <= 90) {
      findings.push({
        title: `SSL Certificate Expiring in ${daysUntilExpiry} Days`,
        severity: 'medium', category: 'ssl',
        description: `Certificate expires in ${daysUntilExpiry} days. Plan renewal within the next month to ensure continuity. Verify auto-renewal is configured correctly.`,
        evidence: `Expires: ${notAfter.toISOString()} (${daysUntilExpiry} days)`,
        asset: domain,
        technologies,
      });
    }

    // Check cert lifespan (>398 days violates Apple/Google CT policy)
    const certLifespan = Math.ceil((notAfter.getTime() - notBefore.getTime()) / (1000 * 60 * 60 * 24));
    if (certLifespan > 398) {
      findings.push({
        title: `Certificate Lifespan Exceeds 398 Days (${certLifespan} days)`,
        severity: 'medium', category: 'ssl',
        description: `Certificate lifespan is ${certLifespan} days, exceeding the 398-day maximum enforced by Apple (Safari) and Google (Chrome). New certificates issued after September 2020 must not exceed 398 days. This certificate will need to be replaced with a shorter-validity one upon renewal.`,
        evidence: `Lifespan: ${certLifespan} days (max allowed: 398)`,
        asset: domain,
        technologies,
      });
    }
  }

  // ── SAN (Subject Alternative Names) ─────────────────────────────
  const sanMatch = fullCert.match(/Subject Alternative Name[^\n]*\n([^\n]*)/);
  if (sanMatch) {
    const sans = sanMatch[1].match(/DNS:[^\s,]+/g);
    if (sans) {
      const sanList = sans.map(s => s.replace('DNS:', ''));
      findings.push({
        title: `Certificate Covers ${sanList.length} Domain(s) (SAN)`,
        severity: 'info', category: 'ssl',
        description: `The certificate covers ${sanList.length} domain(s): ${sanList.join(', ')}. Wildcard certificates (*.domain.com) cover all subdomains.`,
        evidence: `SAN: ${sanList.join(', ')}`,
        asset: domain,
        technologies,
      });
    }
  }

  // ── TLS Protocol Version ────────────────────────────────────────
  const protocolMatch = sslConnect.match(/Protocol\s*:\s*([^\n]+)/);
  const protocol = protocolMatch ? protocolMatch[1].trim() : 'unknown';
  if (protocol.includes('TLSv1 ') || protocol.includes('TLSv1.0')) {
    findings.push({
      title: 'Weak TLS Version: TLS 1.0 Detected',
      severity: 'high', category: 'ssl',
      description: `TLS 1.0 is supported on ${domain}:443. TLS 1.0 was deprecated by the IETF in 2020 (RFC 8996) due to known vulnerabilities including BEAST, POODLE, and RC4 weaknesses. PCI-DSS 3.2+ prohibits TLS 1.0. Disable TLS 1.0 on the server immediately.`,
      evidence: `Protocol: ${protocol}`,
      asset: `${domain}:443`,
      technologies,
    });
  } else if (protocol.includes('TLSv1.1')) {
    findings.push({
      title: 'Deprecated TLS Version: TLS 1.1 Detected',
      severity: 'high', category: 'ssl',
      description: `TLS 1.1 is supported on ${domain}:443. TLS 1.1 was deprecated in 2020 (RFC 8996) and has known weaknesses. PCI-DSS 3.2+ requires disabling TLS 1.1. Support only TLS 1.2 and TLS 1.3.`,
      evidence: `Protocol: ${protocol}`,
      asset: `${domain}:443`,
      technologies,
    });
  } else if (protocol.includes('TLSv1.3')) {
    technologies.push('TLS 1.3');
    findings.push({
      title: 'Modern TLS 1.3 Negotiated',
      severity: 'info', category: 'ssl',
      description: `The connection successfully negotiated TLS 1.3, the latest and most secure TLS version. TLS 1.3 removes support for weak ciphers, adds 0-RTT for reduced latency, and mandates forward secrecy.`,
      evidence: `Protocol: ${protocol}`,
      asset: `${domain}:443`,
      technologies,
    });
  } else if (protocol.includes('TLSv1.2')) {
    technologies.push('TLS 1.2');
    findings.push({
      title: 'TLS 1.2 Negotiated (Supported)',
      severity: 'info', category: 'ssl',
      description: `TLS 1.2 is the negotiated protocol. TLS 1.2 is widely supported and secure when configured with strong cipher suites. Consider also enabling TLS 1.3 for improved performance and security.`,
      evidence: `Protocol: ${protocol}`,
      asset: `${domain}:443`,
      technologies,
    });
  }

  // ── Cipher Suite Analysis ───────────────────────────────────────
  const cipherMatch = sslConnect.match(/Cipher\s*:\s*([^\n]+)/);
  const cipher = cipherMatch ? cipherMatch[1].trim() : 'unknown';
  const weakCiphers = ['RC4', 'DES', 'MD5', 'NULL', 'EXPORT', '3DES', 'AES128-SHA', 'AES256-SHA'];
  const isWeak = weakCiphers.some(wc => cipher.toUpperCase().includes(wc));

  if (isWeak) {
    findings.push({
      title: `Weak Cipher Suite: ${cipher}`,
      severity: 'high', category: 'ssl',
      description: `A weak cipher suite (${cipher}) is in use. Weak ciphers are vulnerable to known cryptographic attacks and provide reduced security. Modern servers should only use AEAD cipher suites (AES-GCM, ChaCha20-Poly1305) with ECDHE key exchange.`,
      evidence: `Cipher: ${cipher}`,
      asset: `${domain}:443`,
      technologies,
    });
  } else {
    findings.push({
      title: `Cipher Suite: ${cipher}`,
      severity: 'info', category: 'ssl',
      description: `Negotiated cipher suite: ${cipher}.`,
      evidence: `Cipher: ${cipher}`,
      asset: `${domain}:443`,
      technologies,
    });
  }

  return { findings, technologies };
}

// ═══════════════════════════════════════════════════════════════════════
// 5. REAL PORT PROBING (HTTP-based checks on common ports)
// ═══════════════════════════════════════════════════════════════════════
const WEB_PORTS = [
  { port: 80, service: 'HTTP', risk: 'medium', desc: 'Standard HTTP — should redirect to HTTPS' },
  { port: 443, service: 'HTTPS', risk: 'info', desc: 'Standard HTTPS — expected for web services' },
  { port: 8080, service: 'HTTP-Alt', risk: 'high', desc: 'Common alternative HTTP port — dev servers, proxies, Tomcat' },
  { port: 8443, service: 'HTTPS-Alt', risk: 'medium', desc: 'Common alternative HTTPS port — admin panels, Java apps' },
  { port: 3000, service: 'Dev Server', risk: 'high', desc: 'Node.js/Express default — often development servers exposed' },
  { port: 5000, service: 'Dev Server', risk: 'high', desc: 'Flask/React dev default — often development servers exposed' },
  { port: 8000, service: 'HTTP-Dev', risk: 'high', desc: 'Common dev port — Django, Python HTTP server, Go dev' },
  { port: 8888, service: 'Jupyter/Proxy', risk: 'critical', desc: 'Jupyter Notebook default or HTTP proxy — often admin access' },
  { port: 9090, service: 'Prometheus/Proxy', risk: 'high', desc: 'Prometheus monitoring or alternative web server' },
  { port: 9200, service: 'Elasticsearch', risk: 'critical', desc: 'Elasticsearch REST API — often unprotected, data exposure' },
  { port: 5601, service: 'Kibana', risk: 'high', desc: 'Kibana dashboard — may expose log data and analytics' },
  { port: 15672, service: 'RabbitMQ Mgmt', risk: 'high', desc: 'RabbitMQ management interface — default credentials common' },
  { port: 27017, service: 'MongoDB', risk: 'critical', desc: 'MongoDB default port — data exposure if unauthenticated' },
];

async function probePorts(domain: string): Promise<Array<{
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
}>> {
  const findings: ReturnType<typeof probePorts> = [];

  const portChecks = await Promise.all(
    WEB_PORTS.map(async ({ port, service, risk, desc }) => {
      // Skip port 443 for quick scans, skip 80
      try {
        const result = run(
          `curl -sI --max-time 3 -k https://${domain}:${port} 2>/dev/null || curl -sI --max-time 3 http://${domain}:${port} 2>/dev/null`,
          5000
        );
        if (result && result.includes('HTTP/')) {
          const statusLine = result.split('\n')[0];
          const serverMatch = result.match(/server:\s*(.+)/i);
          const serverInfo = serverMatch ? ` [${serverMatch[1].trim()}]` : '';
          return { port, service, risk, desc, open: true, statusLine, serverInfo };
        }
      } catch { /* port closed or filtered */ }
      return { port, service, risk, desc, open: false, statusLine: '', serverInfo: '' };
    })
  );

  const openPorts = portChecks.filter(p => p.open);

  for (const { port, service, risk, desc, statusLine, serverInfo } of openPorts) {
    // Skip informational findings for standard ports that are expected
    if (port === 443) {
      findings.push({
        title: `Port ${port}/tcp OPEN — ${service}`,
        severity: 'info', category: 'port',
        description: `HTTPS (port 443) is open${serverInfo}. This is the standard HTTPS port and expected for web services.`,
        evidence: statusLine + serverInfo,
        asset: `${domain}:${port}`,
      });
    } else if (port === 80) {
      findings.push({
        title: `Port ${port}/tcp OPEN — ${service}`,
        severity: 'low', category: 'port',
        description: `HTTP (port 80) is open. This is expected but should redirect to HTTPS. If it serves content without redirect, the site may be accessible over unencrypted HTTP.`,
        evidence: statusLine + serverInfo,
        asset: `${domain}:${port}`,
      });
    } else {
      findings.push({
        title: `Port ${port}/tcp OPEN — ${service}`,
        severity: risk, category: 'port',
        description: `${service} is accessible on port ${port}. ${desc}. Exposing non-standard ports to the internet increases the attack surface. ${risk === 'critical' ? 'This port hosts a high-risk service that should NEVER be publicly accessible without strong authentication and network segmentation. Immediate remediation required.' : 'Review whether this service needs to be publicly accessible and implement proper access controls.'}`,
        evidence: statusLine + serverInfo,
        asset: `${domain}:${port}`,
      });
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 6. REAL TRACEROUTE (Network Path Analysis)
// ═══════════════════════════════════════════════════════════════════════
function tracerouteAnalysis(domain: string): Array<{
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
}> {
  const findings: ReturnType<typeof tracerouteAnalysis> = [];

  const tracerouteOutput = run(`traceroute -m 15 -w 2 ${domain} 2>&1`, 35000);
  if (tracerouteOutput) {
    const hops = tracerouteOutput.split('\n').filter(l => l.match(/^\s*\d/)).length;
    const lastHop = tracerouteOutput.split('\n').filter(l => l.match(/^\s*\d/)).pop() || '';
    const hasAsterisks = tracerouteOutput.includes('* * *');

    findings.push({
      title: `Network Path: ${hops} Hops to Destination`,
      severity: 'info', category: 'dns',
      description: `Traceroute to ${domain} completes in ${hops} hops. ${hasAsterisks ? 'Firewall or rate-limiting detected (filtered hops observed). ' : ''}Last visible hop: ${lastHop.trim()}. Fewer hops generally indicate better network proximity and lower latency.`,
      evidence: `Hops: ${hops}, Firewall: ${hasAsterisks ? 'detected' : 'not detected'}`,
      asset: domain,
    });

    if (hops <= 5) {
      findings.push({
        title: 'Low Hop Count — Likely CDN/Edge Hosted',
        severity: 'info', category: 'dns',
        description: `Only ${hops} hops to reach the destination. This suggests the target is hosted on or very close to a CDN edge node (e.g., Cloudflare, AWS CloudFront, Akamai). CDN-hosted targets benefit from DDoS protection and distributed availability.`,
        evidence: `Hop count: ${hops}`,
        asset: domain,
      });
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SCAN ENDPOINT
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, scanType } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .toLowerCase();

    // Verify domain resolves before scanning
    const preCheckIp = resolves(cleanDomain);
    if (!preCheckIp) {
      return NextResponse.json(
        { error: `Domain "${cleanDomain}" does not resolve to any IP address. Check the domain name and try again.` },
        { status: 400 }
      );
    }

    // Create or find target with REAL IP
    let target = await db.scanTarget.findFirst({ where: { domain: cleanDomain } });
    if (!target) {
      target = await db.scanTarget.create({
        data: { domain: cleanDomain, ip: preCheckIp },
      });
    } else {
      await db.scanTarget.update({ where: { id: target.id }, data: { ip: preCheckIp } });
    }

    // Create scan record
    const scan = await db.scan.create({
      data: {
        targetId: target.id,
        status: 'running',
        scanType: scanType || 'full',
      },
    });

    const isQuick = scanType === 'quick';
    const allFindings: Array<{
      title: string; severity: string; category: string;
      description: string; evidence: string; asset: string;
    }> = [];
    const allTechnologies = new Set<string>();

    // ── Run ALL real reconnaissance ────────────────────────────────

    // 1. DNS Enumeration (always)
    const dnsResult = enumerateDNS(cleanDomain);
    allFindings.push(...dnsResult.findings);

    // 2. Subdomain enumeration
    const subdomainFindings = await enumerateSubdomains(cleanDomain);
    allFindings.push(...subdomainFindings);

    // 3. HTTP Header Analysis (always)
    const httpResult = analyzeHTTPHeaders(cleanDomain);
    allFindings.push(...httpResult.findings);
    httpResult.technologies.forEach(t => allTechnologies.add(t));

    // 4. SSL/TLS Certificate Analysis (always)
    const sslResult = analyzeSSL(cleanDomain);
    allFindings.push(...sslResult.findings);
    sslResult.technologies.forEach(t => allTechnologies.add(t));

    // 5. Port probing (full scan only)
    if (!isQuick) {
      const portFindings = await probePorts(cleanDomain);
      allFindings.push(...portFindings);

      // 6. Traceroute (full scan only)
      const traceFindings = tracerouteAnalysis(cleanDomain);
      allFindings.push(...traceFindings);
    }

    // ── Add technology findings ────────────────────────────────────
    for (const tech of allTechnologies) {
      allFindings.push({
        title: `Technology Detected: ${tech}`,
        severity: 'info', category: 'technology',
        description: `${tech} was identified on ${cleanDomain} through HTTP header analysis, SSL certificate metadata, or network response characteristics. Technology fingerprinting helps build a complete infrastructure profile for targeted security assessment.`,
        evidence: `Detected via HTTP headers, SSL certificate, or response analysis`,
        asset: tech,
      });
    }

    // ── Check for wildcard DNS ────────────────────────────────────
    const randomSub = `nonexistent-random-test-98765.${cleanDomain}`;
    const wildcardIp = resolves(randomSub);
    if (wildcardIp) {
      allFindings.push({
        title: 'Wildcard DNS Record Detected',
        severity: 'medium', category: 'dns',
        description: `A wildcard DNS record is configured for ${cleanDomain} — even nonexistent subdomains like ${randomSub} resolve to ${wildcardIp}. This means subdomain enumeration results may include false positives. Wildcard DNS can also be abused for subdomain takeover if the wildcard points to a service that can be claimed.`,
        evidence: `${randomSub} resolved to ${wildcardIp}`,
        asset: cleanDomain,
      });
    }

    // ── Save all findings to DB ───────────────────────────────────
    for (const f of allFindings) {
      await db.finding.create({
        data: {
          scanId: scan.id,
          title: f.title,
          severity: f.severity,
          category: f.category,
          description: f.description,
          evidence: f.evidence,
          asset: f.asset,
        },
      });
    }

    // ── Calculate risk score from real data ───────────────────────
    const critical = allFindings.filter(f => f.severity === 'critical').length;
    const high = allFindings.filter(f => f.severity === 'high').length;
    const medium = allFindings.filter(f => f.severity === 'medium').length;
    const low = allFindings.filter(f => f.severity === 'low').length;
    const info = allFindings.filter(f => f.severity === 'info').length;
    const riskScore = Math.min(100, Math.round(critical * 25 + high * 15 + medium * 8 + low * 3 + info * 1));

    await db.scan.update({
      where: { id: scan.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        riskScore,
        totalVulns: allFindings.length,
        criticalCount: critical,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
        infoCount: info,
      },
    });

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        domain: cleanDomain,
        status: 'completed',
        riskScore,
        totalVulns: allFindings.length,
        critical,
        high,
        medium,
        low,
        info,
        findings: allFindings.map(f => ({
          id: f.title.toLowerCase().replace(/\s+/g, '-').substring(0, 20),
          title: f.title,
          severity: f.severity,
          category: f.category,
          description: f.description,
          evidence: f.evidence,
          asset: f.asset,
        })),
      },
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed: ' + (error instanceof Error ? error.message : 'unknown') }, { status: 500 });
  }
}