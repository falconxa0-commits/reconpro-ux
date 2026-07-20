import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════════════════
// REAL RECONNAISSANCE ENGINE — Fully async, non-blocking
// Every finding comes from actual dig/curl/openssl output
// ═══════════════════════════════════════════════════════════════════════

type Finding = {
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
};

// ── Async shell runner (never blocks event loop) ──────────────────
async function run(cmd: string, timeout = 8000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout, encoding: 'utf-8' });
    return stdout.trim();
  } catch { return ''; }
}

// ── Async DNS via dig ─────────────────────────────────────────────
async function digShort(domain: string, type: string): Promise<string[]> {
  const out = await run(`dig +short +time=2 +tries=1 ${domain} ${type}`, 5000);
  return out ? out.split('\n').map(l => l.trim()).filter(Boolean) : [];
}

async function digAnswer(domain: string, type: string): Promise<string> {
  return run(`dig +noall +answer +time=2 +tries=1 ${domain} ${type}`, 5000);
}

async function resolveIP(domain: string): Promise<string | null> {
  const out = await run(`dig +short +time=2 +tries=1 ${domain} A`, 3000);
  if (!out) return null;
  for (const line of out.split('\n')) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(line.trim())) return line.trim();
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. DNS ENUMERATION (all in parallel)
// ═══════════════════════════════════════════════════════════════════════
async function enumerateDNS(domain: string): Promise<{ findings: Finding[]; mainIp: string | null }> {
  const findings: Finding[] = [];

  // Fire all DNS queries in parallel
  const [aRecords, aaaaRecords, mxRaw, nsRaw, txtRecords, spfDomain] = await Promise.all([
    digShort(domain, 'A'),
    digShort(domain, 'AAAA'),
    digAnswer(domain, 'MX'),
    digAnswer(domain, 'NS'),
    digShort(domain, 'TXT'),
    digShort(`_dmarc.${domain}`, 'TXT'),
  ]);

  const mainIp = aRecords[0] || null;

  // A records
  if (aRecords.length > 0) {
    findings.push({
      title: `DNS A Record — ${aRecords.length} IPv4 address(es)`,
      severity: 'info', category: 'dns',
      description: `Domain ${domain} resolves to ${aRecords.length} IPv4 address(es): ${aRecords.join(', ')}. Multiple A records indicate round-robin DNS or CDN usage.`,
      evidence: `A: ${aRecords.join(', ')}`,
      asset: domain,
    });
  }

  // AAAA
  if (aaaaRecords.length > 0) {
    findings.push({
      title: 'DNS AAAA Record — IPv6 enabled',
      severity: 'info', category: 'dns',
      description: `IPv6 address(es) found: ${aaaaRecords.join(', ')}. IPv6 support is present.`,
      evidence: `AAAA: ${aaaaRecords.join(', ')}`,
      asset: domain,
    });
  }

  // MX
  const mxLines = mxRaw ? mxRaw.split('\n').filter(l => l.includes('MX')) : [];
  if (mxLines.length > 0) {
    findings.push({
      title: `MX Records — ${mxLines.length} mail server(s)`,
      severity: 'info', category: 'dns',
      description: `${mxLines.length} mail server(s) configured:\n${mxLines.map(m => '  ' + m.trim()).join('\n')}`,
      evidence: mxLines.join('; '),
      asset: domain,
    });
  } else {
    findings.push({
      title: 'No MX Records Found',
      severity: 'low', category: 'dns',
      description: `No MX records for ${domain}. Domain does not receive email directly or uses third-party email.`,
      evidence: 'MX query returned empty',
      asset: domain,
    });
  }

  // NS
  const nsLines = nsRaw ? nsRaw.split('\n').filter(l => l.includes('NS')) : [];
  if (nsLines.length > 0) {
    const nsNames = nsLines.map(n => n.trim().split(/\s+/).pop());
    findings.push({
      title: `NS Records — ${nsLines.length} nameserver(s)`,
      severity: 'info', category: 'dns',
      description: `Nameservers: ${nsNames.join(', ')}.`,
      evidence: nsLines.join('; '),
      asset: domain,
    });
  }

  // TXT
  if (txtRecords.length > 0) {
    findings.push({
      title: `TXT Records — ${txtRecords.length} record(s)`,
      severity: 'info', category: 'dns',
      description: `Found ${txtRecords.length} TXT record(s) including verification records, SPF, or other configurations.`,
      evidence: txtRecords.join(' | '),
      asset: domain,
    });
  }

  // SPF
  const spfRecord = txtRecords.find(t => t.startsWith('"v=spf'));
  if (!spfRecord) {
    findings.push({
      title: 'SPF Record Missing',
      severity: 'high', category: 'dns',
      description: `No SPF record found for ${domain}. Without SPF, attackers can send spoofed emails appearing to come from this domain, enabling phishing attacks and brand damage.`,
      evidence: `TXT query returned ${txtRecords.length} record(s), none with "v=spf1"`,
      asset: domain,
    });
  } else {
    if (spfRecord.includes('+all') || spfRecord.includes('?all')) {
      findings.push({
        title: 'SPF Record Uses +all or ?all (Open)',
        severity: 'critical', category: 'dns',
        description: `SPF record allows ANY server to send email for ${domain}, defeating the purpose of SPF entirely.`,
        evidence: `SPF: ${spfRecord}`,
        asset: domain,
      });
    } else {
      findings.push({
        title: 'SPF Record Configured Properly',
        severity: 'info', category: 'dns',
        description: `SPF record found with proper fail mechanism: ${spfRecord}.`,
        evidence: `SPF: ${spfRecord}`,
        asset: domain,
      });
    }
  }

  // DMARC
  const dmarc = spfDomain.find(t => t.includes('v=DMARC'));
  if (!dmarc) {
    findings.push({
      title: 'DMARC Record Not Found',
      severity: 'high', category: 'dns',
      description: `No DMARC record for ${domain}. DMARC builds on SPF/DKIM to provide email authentication policy. Without it, the domain cannot specify how receivers handle unauthenticated emails.`,
      evidence: `_dmarc.${domain} TXT query empty`,
      asset: `_dmarc.${domain}`,
    });
  } else {
    const pMatch = dmarc.match(/p=([a-z]+)/);
    const policy = pMatch ? pMatch[1] : 'unknown';
    if (policy === 'none') {
      findings.push({
        title: 'DMARC Policy Set to "none" (Monitor Only)',
        severity: 'medium', category: 'dns',
        description: `DMARC p=none means unauthenticated emails are only monitored, not rejected. Upgrade to p=quarantine or p=reject.`,
        evidence: `DMARC: ${dmarc}`,
        asset: `_dmarc.${domain}`,
      });
    } else {
      findings.push({
        title: `DMARC Policy Active (p=${policy})`,
        severity: 'info', category: 'dns',
        description: `DMARC is enforcing with p=${policy}.`,
        evidence: `DMARC: ${dmarc}`,
        asset: `_dmarc.${domain}`,
      });
    }
  }

  // DKIM
  const dkimSelectors = ['selector1', 'selector2', 'google', 'k1', 'default', 's1'];
  const dkimChecks = await Promise.all(dkimSelectors.map(async sel => {
    const recs = await digShort(`${sel}._domainkey.${domain}`, 'TXT');
    return recs.find(t => t.includes('v=DKIM')) ? sel : null;
  }));
  const dkimSel = dkimChecks.find(Boolean);
  if (dkimSel) {
    findings.push({
      title: `DKIM Record Found (selector: ${dkimSel})`,
      severity: 'info', category: 'dns',
      description: `DKIM signing configured with selector "${dkimSel}". Outgoing emails can be cryptographically verified.`,
      evidence: `DKIM selector: ${dkimSel}`,
      asset: `${dkimSel}._domainkey.${domain}`,
    });
  } else {
    findings.push({
      title: 'DKIM Record Not Found',
      severity: 'medium', category: 'dns',
      description: `No DKIM record found for common selectors (${dkimSelectors.join(', ')}). Outgoing emails cannot be cryptographically verified.`,
      evidence: `Checked selectors: ${dkimSelectors.join(', ')}`,
      asset: domain,
    });
  }

  // DNSSEC
  const dnssecOut = await run(`dig +dnssec +time=2 +tries=1 ${domain} A`, 5000);
  if (!dnssecOut.includes('RRSIG')) {
    findings.push({
      title: 'DNSSEC Not Enabled',
      severity: 'medium', category: 'dns',
      description: `DNSSEC not configured for ${domain}. DNS responses can be spoofed via cache poisoning attacks.`,
      evidence: 'RRSIG not found in DNS response',
      asset: domain,
    });
  } else {
    findings.push({
      title: 'DNSSEC Enabled',
      severity: 'info', category: 'dns',
      description: `DNSSEC is active, providing cryptographic DNS response authentication.`,
      evidence: 'RRSIG records present',
      asset: domain,
    });
  }

  return { findings, mainIp };
}

// ═══════════════════════════════════════════════════════════════════════
// 2. SUBDOMAIN ENUMERATION (async parallel, batched)
// ═══════════════════════════════════════════════════════════════════════
const QUICK_SUBS = [
  'www','api','mail','admin','portal','dashboard','app','dev','staging',
  'cdn','blog','shop','secure','auth','login','sso','vpn','gateway','proxy',
  'ns1','ns2','dns','db','elastic','search','analytics','webhook','graphql',
  'git','gitlab','github','docs','status','monitor','grafana','kibana','logs',
  'jenkins','ci','internal','sandbox','demo','preview','m','mobile','crm',
  'smtp','webmail','origin','edge','panel','cpanel','server','node','us','eu',
];

const FULL_SUBS = [
  ...QUICK_SUBS,
  'ftp','pop','imap','test','beta','static','assets','images','media','video',
  'news','store','remote','mx1','mx2','redis','track','hooks','api-v1','api-v2',
  'rest','repo','wiki','help','support','health','metrics','prometheus',
  'hr','billing','token','keys','certs','v2','v3','staging1','staging2',
  'phpmyadmin','amp','pwa','erp','payroll','oAuth','oauth2','pki',
  'go','play','run','link','links','short','redirect','webmin','whm','plesk',
  'web1','web2','app1','app2','uk','asia','cdn1','cdn2','static1',
];

const SENSITIVE_SUBS = ['admin','portal','dashboard','db','database','redis',
  'jenkins','gitlab','git','internal','staging','dev','test','vpn','remote',
  'proxy','elastic','kibana','grafana','prometheus','cpanel','plesk','webmin',
  'phpmyadmin','server','smtp','webmail','crm','sandbox','ci','hooks','api-v1',
  'staging1','staging2','test','dev'];

async function enumerateSubdomains(domain: string, quick: boolean): Promise<Finding[]> {
  const subs = quick ? QUICK_SUBS : FULL_SUBS;
  const batchSize = 30;
  const discovered: Array<{ fqdn: string; ip: string }> = [];

  for (let i = 0; i < subs.length; i += batchSize) {
    const batch = subs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (sub) => {
        const ip = await resolveIP(`${sub}.${domain}`);
        return ip ? { fqdn: `${sub}.${domain}`, ip } : null;
      })
    );
    for (const r of results) { if (r) discovered.push(r); }
  }

  return discovered.map(({ fqdn, ip }) => {
    const subName = fqdn.replace(`.${domain}`, '');
    const isSensitive = SENSITIVE_SUBS.some(s => subName.includes(s));
    return {
      title: `Discovered Subdomain: ${fqdn}`,
      severity: isSensitive ? 'high' : 'info',
      category: 'subdomain',
      description: `${fqdn} resolves to ${ip}.${isSensitive ? ` This is a sensitive internal service (${subName}) publicly accessible — significant security concern.` : ' Publicly accessible subdomain adding to attack surface.'}`,
      evidence: `A record: ${ip}`,
      asset: fqdn,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 3. HTTP HEADER ANALYSIS (async)
// ═══════════════════════════════════════════════════════════════════════
async function analyzeHTTPHeaders(domain: string): Promise<{ findings: Finding[]; technologies: string[] }> {
  const findings: Finding[] = [];
  const technologies: string[] = [];

  const [httpsH, httpH] = await Promise.all([
    run(`curl -sI --max-time 8 -L https://${domain} 2>/dev/null`, 12000),
    run(`curl -sI --max-time 5 -L http://${domain} 2>/dev/null`, 8000),
  ]);
  const headers = httpsH || httpH;

  if (!headers || !headers.includes('HTTP/')) {
    findings.push({
      title: 'HTTP Service Not Reachable',
      severity: 'medium', category: 'header',
      description: `Could not connect to ${domain} via HTTP/HTTPS.`,
      evidence: 'curl returned non-HTTP or empty response',
      asset: domain,
    });
    return { findings, technologies };
  }

  const hmap: Record<string, string> = {};
  for (const line of headers.split('\n')) {
    const m = line.match(/^([^:]+):\s*(.+)/);
    if (m) hmap[m[1].trim().toLowerCase()] = m[2].trim();
  }

  // HSTS
  if (!hmap['strict-transport-security']) {
    findings.push({
      title: 'Missing Strict-Transport-Security (HSTS)',
      severity: 'high', category: 'header',
      description: `No HSTS header on ${domain}. Browsers may attempt HTTP before HTTPS, enabling SSL stripping MITM attacks. Set HSTS with max-age >= 31536000 and includeSubDomains.`,
      evidence: 'strict-transport-security header not found',
      asset: domain, technologies,
    });
  } else {
    const hsts = hmap['strict-transport-security'];
    const ma = hsts.match(/max-age=(\d+)/);
    const age = ma ? parseInt(ma[1]) : 0;
    if (age < 31536000) {
      findings.push({ title: `HSTS max-age Too Short (${Math.round(age/86400)} days)`, severity: 'medium', category: 'header',
        description: `HSTS max-age is ${age}s (${Math.round(age/86400)}d). Best practice: >= 1 year (31536000s).`, evidence: `HSTS: ${hsts}`, asset: domain, technologies });
    } else if (!hsts.includes('includeSubDomains')) {
      findings.push({ title: 'HSTS Missing includeSubDomains', severity: 'medium', category: 'header',
        description: `HSTS active but without includeSubDomains — subdomains remain vulnerable.`, evidence: `HSTS: ${hsts}`, asset: domain, technologies });
    } else {
      findings.push({ title: 'HSTS Properly Configured', severity: 'info', category: 'header',
        description: `HSTS active with proper configuration.`, evidence: `HSTS: ${hsts}`, asset: domain, technologies });
    }
  }

  // CSP
  if (!hmap['content-security-policy'] && !hmap['content-security-policy-report-only']) {
    findings.push({ title: 'Missing Content-Security-Policy (CSP)', severity: 'high', category: 'header',
      description: `No CSP header. CSP is the primary defense against XSS and data injection. Without it, browsers will execute any inline scripts and load resources from any origin.`, evidence: 'content-security-policy header not found', asset: domain, technologies });
  } else {
    const csp = hmap['content-security-policy'] || hmap['content-security-policy-report-only'];
    if (csp.includes("'unsafe-inline'") && csp.includes("'unsafe-eval'")) {
      findings.push({ title: 'CSP Uses unsafe-inline and unsafe-eval', severity: 'medium', category: 'header',
        description: `CSP present but weakened by 'unsafe-inline' and 'unsafe-eval', significantly reducing XSS protection.`, evidence: `CSP: ${csp.substring(0,200)}`, asset: domain, technologies });
    } else {
      findings.push({ title: 'Content-Security-Policy Configured', severity: 'info', category: 'header',
        description: `CSP header present, providing XSS protection.`, evidence: `CSP: ${csp.substring(0,150)}`, asset: domain, technologies });
    }
  }

  // X-Frame-Options
  if (!hmap['x-frame-options']) {
    findings.push({ title: 'Missing X-Frame-Options Header', severity: 'medium', category: 'header',
      description: `No X-Frame-Options — site is vulnerable to clickjacking. Set to "DENY" or "SAMEORIGIN".`, evidence: 'x-frame-options not found', asset: domain, technologies });
  }

  // X-Content-Type-Options
  if (hmap['x-content-type-options'] !== 'nosniff') {
    findings.push({ title: 'Missing X-Content-Type-Options: nosniff', severity: 'low', category: 'header',
      description: `Without nosniff, browsers may MIME-sniff content types.`, evidence: `x-content-type-options: ${hmap['x-content-type-options'] || 'not set'}`, asset: domain, technologies });
  }

  // Referrer-Policy
  if (!hmap['referrer-policy']) {
    findings.push({ title: 'Missing Referrer-Policy Header', severity: 'low', category: 'header',
      description: `No Referrer-Policy — full URLs may leak to third parties via Referer header.`, evidence: 'referrer-policy not found', asset: domain, technologies });
  }

  // Permissions-Policy
  if (!hmap['permissions-policy'] && !hmap['feature-policy']) {
    findings.push({ title: 'Missing Permissions-Policy Header', severity: 'low', category: 'header',
      description: `No Permissions-Policy — browser features (camera, mic, etc.) not restricted.`, evidence: 'permissions-policy not found', asset: domain, technologies });
  }

  // CORS
  if (hmap['access-control-allow-origin']) {
    if (hmap['access-control-allow-origin'] === '*') {
      findings.push({ title: 'CORS Allows Any Origin (*)', severity: 'high', category: 'header',
        description: `Access-Control-Allow-Origin: * means any website can read responses. If sensitive data is served, it can be exfiltrated by any malicious site.`, evidence: 'access-control-allow-origin: *', asset: domain, technologies });
    }
  }

  // Server disclosure
  if (hmap['server']) {
    technologies.push(hmap['server']);
    if (/\d+\.\d+/.test(hmap['server'])) {
      findings.push({ title: 'Server Version Disclosure', severity: 'medium', category: 'header',
        description: `Server header reveals version: "${hmap['server']}". Remove version numbers to reduce info leakage.`, evidence: `server: ${hmap['server']}`, asset: domain, technologies });
    }
  }

  // X-Powered-By
  if (hmap['x-powered-by']) {
    technologies.push(hmap['x-powered-by']);
    findings.push({ title: `Technology Disclosure: X-Powered-By: ${hmap['x-powered-by']}`, severity: 'low', category: 'header',
      description: `X-Powered-By reveals backend: "${hmap['x-powered-by']}". Remove in production.`, evidence: `x-powered-by: ${hmap['x-powered-by']}`, asset: domain, technologies });
  }

  // Detect tech from headers
  const allH = httpsH + httpH;
  if (hmap['cf-ray'] || hmap['cf-cache-status']) technologies.push('Cloudflare');
  if (allH.includes('X-Amz-Cf-Id')) technologies.push('AWS CloudFront');
  if (hmap['x-vercel-id']) technologies.push('Vercel');
  if (hmap['x-netlify-request-id']) technologies.push('Netlify');
  if (hmap['fly-request-id']) technologies.push('Fly.io');
  if (hmap['alt-svc']?.includes('h3')) technologies.push('HTTP/3 (QUIC)');

  return { findings, technologies };
}

// ═══════════════════════════════════════════════════════════════════════
// 4. SSL/TLS CERTIFICATE ANALYSIS (async)
// ═══════════════════════════════════════════════════════════════════════
async function analyzeSSL(domain: string): Promise<{ findings: Finding[]; technologies: string[] }> {
  const findings: Finding[] = [];
  const technologies: string[] = [];

  const [certInfo, sslConnect] = await Promise.all([
    run(`echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null`, 10000),
    run(`echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>&1`, 10000),
  ]);

  if (!certInfo && !sslConnect.includes('SSL handshake')) {
    findings.push({ title: 'SSL/TLS Connection Failed', severity: 'high', category: 'ssl',
      description: `Could not establish SSL/TLS to ${domain}:443. Server may not support HTTPS.`, evidence: 'openssl s_client failed', asset: `${domain}:443`, technologies });
    return { findings, technologies };
  }

  const full = certInfo || sslConnect;

  // Subject
  const subjM = full.match(/subject=([^\n]+)/);
  if (subjM) findings.push({ title: `SSL Certificate Subject: ${subjM[1].trim()}`, severity: 'info', category: 'ssl',
    description: `Certificate issued to: ${subjM[1].trim()}.`, evidence: `subject: ${subjM[1].trim()}`, asset: domain, technologies });

  // Issuer + tech detection
  const issM = full.match(/issuer=([^\n]+)/);
  const issuer = issM ? issM[1].trim() : 'unknown';
  if (issuer.includes("Let's Encrypt")) technologies.push("Let's Encrypt");
  else if (issuer.includes('DigiCert')) technologies.push('DigiCert');
  else if (issuer.includes('Sectigo') || issuer.includes('Comodo')) technologies.push('Sectigo');
  else if (issuer.includes('Cloudflare')) technologies.push('Cloudflare SSL');
  else if (issuer.includes('Amazon') || issuer.includes('AWS')) technologies.push('AWS ACM');
  else if (issuer.includes('Google')) technologies.push('Google Trust Services');

  findings.push({ title: `SSL Certificate Issuer: ${issuer}`, severity: 'info', category: 'ssl',
    description: `Issued by: ${issuer}.`, evidence: `issuer: ${issuer}`, asset: domain, technologies });

  // Dates + expiry
  const nbM = full.match(/notBefore=(.+)/);
  const naM = full.match(/notAfter=(.+)/);
  if (nbM && naM) {
    const nb = new Date(nbM[1].trim());
    const na = new Date(naM[1].trim());
    const days = Math.ceil((na.getTime() - Date.now()) / 86400000);
    const lifespan = Math.ceil((na.getTime() - nb.getTime()) / 86400000);

    findings.push({ title: `SSL Certificate Validity: ${nb.toISOString().split('T')[0]} — ${na.toISOString().split('T')[0]}`, severity: 'info', category: 'ssl',
      description: `Certificate lifespan: ${lifespan} days. Valid from ${nb.toISOString().split('T')[0]} to ${na.toISOString().split('T')[0]}.`, evidence: `notBefore: ${nbM[1].trim()}, notAfter: ${naM[1].trim()}`, asset: domain, technologies });

    if (days < 0) {
      findings.push({ title: `SSL Certificate EXPIRED ${Math.abs(days)} days ago`, severity: 'critical', category: 'ssl',
        description: `Certificate for ${domain} expired ${Math.abs(days)} days ago. Browsers show security warnings, automated integrations fail with TLS errors. Immediate renewal required.`, evidence: `Expired: ${na.toISOString()}`, asset: domain, technologies });
    } else if (days <= 7) {
      findings.push({ title: `SSL Certificate Expiring in ${days} Days — CRITICAL`, severity: 'critical', category: 'ssl',
        description: `Certificate expires in ${days} days. Emergency renewal required.`, evidence: `Expires: ${na.toISOString()} (${days}d)`, asset: domain, technologies });
    } else if (days <= 30) {
      findings.push({ title: `SSL Certificate Expiring in ${days} Days`, severity: 'high', category: 'ssl',
        description: `Certificate expires in ${days} days. Prompt renewal needed.`, evidence: `Expires: ${na.toISOString()} (${days}d)`, asset: domain, technologies });
    } else if (days <= 90) {
      findings.push({ title: `SSL Certificate Expiring in ${days} Days`, severity: 'medium', category: 'ssl',
        description: `Certificate expires in ${days} days. Plan renewal.`, evidence: `Expires: ${na.toISOString()} (${days}d)`, asset: domain, technologies });
    }

    if (lifespan > 398) {
      findings.push({ title: `Certificate Lifespan Exceeds 398 Days (${lifespan}d)`, severity: 'medium', category: 'ssl',
        description: `Lifespan exceeds Apple/Google 398-day max. New certs must be shorter.`, evidence: `Lifespan: ${lifespan}d (max: 398)`, asset: domain, technologies });
    }
  }

  // SAN
  const sanM = full.match(/Subject Alternative Name[^\n]*\n([^\n]*)/);
  if (sanM) {
    const sans = sanM[1].match(/DNS:[^\s,]+/g);
    if (sans) findings.push({ title: `Certificate Covers ${sans.length} Domain(s) (SAN)`, severity: 'info', category: 'ssl',
      description: `SANs: ${sans.map(s=>s.replace('DNS:','')).join(', ')}.`, evidence: `SAN: ${sans.join(', ')}`, asset: domain, technologies });
  }

  // TLS version
  const protoM = sslConnect.match(/Protocol\s*:\s*([^\n]+)/);
  const proto = protoM ? protoM[1].trim() : '';
  if (proto.includes('TLSv1 ') || proto.includes('TLSv1.0')) {
    findings.push({ title: 'Weak TLS Version: TLS 1.0 Detected', severity: 'high', category: 'ssl',
      description: `TLS 1.0 deprecated (RFC 8996, 2020). Vulnerable to BEAST, POODLE, RC4. PCI-DSS prohibits. Disable immediately.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443`, technologies });
  } else if (proto.includes('TLSv1.1')) {
    findings.push({ title: 'Deprecated TLS 1.1 Detected', severity: 'high', category: 'ssl',
      description: `TLS 1.1 deprecated in 2020. Known weaknesses. PCI-DSS requires disabling. Support TLS 1.2+ only.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443`, technologies });
  } else if (proto.includes('TLSv1.3')) {
    technologies.push('TLS 1.3');
    findings.push({ title: 'Modern TLS 1.3 Negotiated', severity: 'info', category: 'ssl',
      description: `TLS 1.3 — latest version with 0-RTT, mandatory forward secrecy, no weak ciphers.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443`, technologies });
  } else if (proto.includes('TLSv1.2')) {
    technologies.push('TLS 1.2');
    findings.push({ title: 'TLS 1.2 Negotiated', severity: 'info', category: 'ssl',
      description: `TLS 1.2 — secure when configured with strong cipher suites. Consider enabling TLS 1.3.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443`, technologies });
  }

  // Cipher
  const cipM = sslConnect.match(/Cipher\s*:\s*([^\n]+)/);
  const cipher = cipM ? cipM[1].trim() : '';
  const weakC = ['RC4','DES','MD5','NULL','EXPORT','3DES'];
  if (weakC.some(w => cipher.toUpperCase().includes(w))) {
    findings.push({ title: `Weak Cipher Suite: ${cipher}`, severity: 'high', category: 'ssl',
      description: `Weak cipher (${cipher}) — vulnerable to known attacks. Use AEAD ciphers (AES-GCM, ChaCha20-Poly1305) with ECDHE.`, evidence: `Cipher: ${cipher}`, asset: `${domain}:443`, technologies });
  } else if (cipher) {
    findings.push({ title: `Cipher Suite: ${cipher}`, severity: 'info', category: 'ssl',
      description: `Negotiated: ${cipher}.`, evidence: `Cipher: ${cipher}`, asset: `${domain}:443`, technologies });
  }

  return { findings, technologies };
}

// ═══════════════════════════════════════════════════════════════════════
// 5. PORT PROBING (async parallel)
// ═══════════════════════════════════════════════════════════════════════
const WEB_PORTS = [
  { port: 80, service: 'HTTP', risk: 'low', desc: 'Standard HTTP — should redirect to HTTPS' },
  { port: 443, service: 'HTTPS', risk: 'info', desc: 'Standard HTTPS' },
  { port: 8080, service: 'HTTP-Alt', risk: 'high', desc: 'Dev servers, proxies, Tomcat' },
  { port: 8443, service: 'HTTPS-Alt', risk: 'medium', desc: 'Admin panels, Java apps' },
  { port: 3000, service: 'Dev Server', risk: 'high', desc: 'Node.js/Express dev default' },
  { port: 5000, service: 'Dev Server', risk: 'high', desc: 'Flask/React dev default' },
  { port: 8000, service: 'HTTP-Dev', risk: 'high', desc: 'Django, Go dev' },
  { port: 8888, service: 'Jupyter/Proxy', risk: 'critical', desc: 'Jupyter Notebook or proxy' },
  { port: 9090, service: 'Prometheus', risk: 'high', desc: 'Prometheus monitoring' },
  { port: 9200, service: 'Elasticsearch', risk: 'critical', desc: 'Elasticsearch REST API' },
  { port: 5601, service: 'Kibana', risk: 'high', desc: 'Kibana dashboard' },
  { port: 27017, service: 'MongoDB', risk: 'critical', desc: 'MongoDB default port' },
];

async function probePorts(domain: string): Promise<Finding[]> {
  const results = await Promise.all(
    WEB_PORTS.map(async ({ port, service, risk, desc }) => {
      const r = await run(`curl -sI --max-time 3 -k https://${domain}:${port} 2>/dev/null || curl -sI --max-time 3 http://${domain}:${port} 2>/dev/null`, 5000);
      if (r && r.includes('HTTP/')) {
        const status = r.split('\n')[0];
        const srvM = r.match(/server:\s*(.+)/i);
        const srv = srvM ? ` [${srvM[1].trim()}]` : '';
        return { port, service, risk, desc, status: status + srv };
      }
      return null;
    })
  );

  return results.filter(Boolean).map(({ port, service, risk, desc, status }) => ({
    title: `Port ${port}/tcp OPEN — ${service}`,
    severity: risk === 'info' ? 'info' : risk, category: 'port',
    description: `${service} accessible on port ${port}. ${desc}.${risk === 'critical' || risk === 'high' ? ' This should not be publicly accessible.' : ''}`,
    evidence: status, asset: `${domain}:${port}`,
  }));
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

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').replace(/:\d+$/, '').toLowerCase();

    // Pre-check: domain must resolve
    const preCheckIp = await resolveIP(cleanDomain);
    if (!preCheckIp) {
      return NextResponse.json({ error: `Domain "${cleanDomain}" does not resolve. Check the name and try again.` }, { status: 400 });
    }

    // DB: target + scan record
    let target = await db.scanTarget.findFirst({ where: { domain: cleanDomain } });
    if (!target) {
      target = await db.scanTarget.create({ data: { domain: cleanDomain, ip: preCheckIp } });
    } else {
      await db.scanTarget.update({ where: { id: target.id }, data: { ip: preCheckIp } });
    }

    const scan = await db.scan.create({
      data: { targetId: target.id, status: 'running', scanType: scanType || 'full' },
    });

    const isQuick = scanType === 'quick';
    const allFindings: Finding[] = [];
    const allTech = new Set<string>();

    // ── 1. DNS (always, all queries parallel) ──────────────────────
    const dnsResult = await enumerateDNS(cleanDomain);
    allFindings.push(...dnsResult.findings);

    // ── 2. Subdomains (parallel DNS resolution) ────────────────────
    const subFindings = await enumerateSubdomains(cleanDomain, isQuick);
    allFindings.push(...subFindings);

    // ── 3. HTTP headers (async curl) ───────────────────────────────
    const httpResult = await analyzeHTTPHeaders(cleanDomain);
    allFindings.push(...httpResult.findings);
    httpResult.technologies.forEach(t => allTech.add(t));

    // ── 4. SSL/TLS (async openssl) ─────────────────────────────────
    const sslResult = await analyzeSSL(cleanDomain);
    allFindings.push(...sslResult.findings);
    sslResult.technologies.forEach(t => allTech.add(t));

    // ── 5. Port probing (full only, async parallel) ────────────────
    if (!isQuick) {
      const portFindings = await probePorts(cleanDomain);
      allFindings.push(...portFindings);
    }

    // ── Technology findings ─────────────────────────────────────────
    for (const tech of allTech) {
      allFindings.push({
        title: `Technology Detected: ${tech}`, severity: 'info', category: 'technology',
        description: `${tech} identified on ${cleanDomain} via HTTP headers, SSL cert metadata, or response analysis.`,
        evidence: 'Detected via HTTP/SSL/response fingerprinting', asset: tech,
      });
    }

    // ── Wildcard DNS check ─────────────────────────────────────────
    const wcIp = await resolveIP(`nonexistent-wildcard-test-12345.${cleanDomain}`);
    if (wcIp) {
      allFindings.push({
        title: 'Wildcard DNS Record Detected', severity: 'medium', category: 'dns',
        description: `Wildcard DNS active — even nonexistent subdomains resolve to ${wcIp}. Subdomain enumeration may have false positives.`,
        evidence: `nonexistent-wildcard-test-12345.${cleanDomain} resolved to ${wcIp}`, asset: cleanDomain,
      });
    }

    // ── Save to DB ─────────────────────────────────────────────────
    for (const f of allFindings) {
      await db.finding.create({ data: { scanId: scan.id, ...f } });
    }

    // ── Risk score ─────────────────────────────────────────────────
    const c = allFindings.filter(f => f.severity === 'critical').length;
    const h = allFindings.filter(f => f.severity === 'high').length;
    const m = allFindings.filter(f => f.severity === 'medium').length;
    const l = allFindings.filter(f => f.severity === 'low').length;
    const i = allFindings.filter(f => f.severity === 'info').length;
    const riskScore = Math.min(100, Math.round(c*25 + h*15 + m*8 + l*3 + i*1));

    await db.scan.update({
      where: { id: scan.id },
      data: { status: 'completed', completedAt: new Date(), riskScore, totalVulns: allFindings.length, criticalCount: c, highCount: h, mediumCount: m, lowCount: l, infoCount: i },
    });

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id, domain: cleanDomain, status: 'completed', riskScore,
        totalVulns: allFindings.length, critical: c, high: h, medium: m, low: l, info: i,
        findings: allFindings.map(f => ({
          id: f.title.toLowerCase().replace(/\s+/g, '-').substring(0, 20),
          ...f,
        })),
      },
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed: ' + (error instanceof Error ? error.message : 'unknown') }, { status: 500 });
  }
}