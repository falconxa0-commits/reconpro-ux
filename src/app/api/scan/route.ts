import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { digShort, digAnswer, resolveIP as nativeResolveIP, reverseDNS, analyzeSSLNative } from '@/lib/native-dns';
import { safeFetch } from '@/lib/safe-fetch';
import { withProtection, safeError } from '@/lib/api-protection';
import { isPrivateIP, applySecurityHeaders } from '@/lib/api-security';

// ═══════════════════════════════════════════════════════════════════════
// REAL RECONNAISSANCE ENGINE — Fully async, non-blocking
// Every finding comes from actual dig/curl/openssl output
// ═══════════════════════════════════════════════════════════════════════

type Finding = {
  title: string; severity: string; category: string;
  description: string; evidence: string; asset: string;
};




// DNS functions now imported from @/lib/native-dns





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

  // DNSSEC — native dns.promises doesn't support DNSSEC queries
  // DNSSEC validation requires specialized DNS libraries; skipping this check
  findings.push({
    title: 'DNSSEC Check Skipped',
    severity: 'info', category: 'dns',
    description: `DNSSEC validation requires specialized DNS query support not available in the native resolver. Use a dedicated DNS security tool for full DNSSEC analysis.`,
    evidence: 'Native resolver — DNSSEC check not available',
    asset: domain,
  });

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
        const ip = await nativeResolveIP(`${sub}.${domain}`);
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

  const [httpsResult, httpResult] = await Promise.all([
    safeFetch(`https://${domain}`, { timeout: 12000, method: 'HEAD' }),
    safeFetch(`http://${domain}`, { timeout: 8000, method: 'HEAD' }),
  ]);
  const response = httpsResult.ok ? httpsResult : (httpResult.ok ? httpResult : null);

  if (!response || response.status === 0) {
    findings.push({
      title: 'HTTP Service Not Reachable',
      severity: 'medium', category: 'header',
      description: `Could not connect to ${domain} via HTTP/HTTPS.`,
      evidence: 'Native fetch returned no response',
      asset: domain,
    });
    return { findings, technologies };
  }

  const hmap: Record<string, string> = response.headers;

  // HSTS
  if (!hmap['strict-transport-security']) {
    findings.push({
      title: 'Missing Strict-Transport-Security (HSTS)',
      severity: 'high', category: 'header',
      description: `No HSTS header on ${domain}. Browsers may attempt HTTP before HTTPS, enabling SSL stripping MITM attacks. Set HSTS with max-age >= 31536000 and includeSubDomains.`,
      evidence: 'strict-transport-security header not found',
      asset: domain,
    });
  } else {
    const hsts = hmap['strict-transport-security'];
    const ma = hsts.match(/max-age=(\d+)/);
    const age = ma ? parseInt(ma[1]) : 0;
    if (age < 31536000) {
      findings.push({ title: `HSTS max-age Too Short (${Math.round(age/86400)} days)`, severity: 'medium', category: 'header',
        description: `HSTS max-age is ${age}s (${Math.round(age/86400)}d). Best practice: >= 1 year (31536000s).`, evidence: `HSTS: ${hsts}`, asset: domain });
    } else if (!hsts.includes('includeSubDomains')) {
      findings.push({ title: 'HSTS Missing includeSubDomains', severity: 'medium', category: 'header',
        description: `HSTS active but without includeSubDomains — subdomains remain vulnerable.`, evidence: `HSTS: ${hsts}`, asset: domain });
    } else {
      findings.push({ title: 'HSTS Properly Configured', severity: 'info', category: 'header',
        description: `HSTS active with proper configuration.`, evidence: `HSTS: ${hsts}`, asset: domain });
    }
  }

  // CSP
  if (!hmap['content-security-policy'] && !hmap['content-security-policy-report-only']) {
    findings.push({ title: 'Missing Content-Security-Policy (CSP)', severity: 'high', category: 'header',
      description: `No CSP header. CSP is the primary defense against XSS and data injection. Without it, browsers will execute any inline scripts and load resources from any origin.`, evidence: 'content-security-policy header not found', asset: domain });
  } else {
    const csp = hmap['content-security-policy'] || hmap['content-security-policy-report-only'];
    if (csp.includes("'unsafe-inline'") && csp.includes("'unsafe-eval'")) {
      findings.push({ title: 'CSP Uses unsafe-inline and unsafe-eval', severity: 'medium', category: 'header',
        description: `CSP present but weakened by 'unsafe-inline' and 'unsafe-eval', significantly reducing XSS protection.`, evidence: `CSP: ${csp.substring(0,200)}`, asset: domain });
    } else {
      findings.push({ title: 'Content-Security-Policy Configured', severity: 'info', category: 'header',
        description: `CSP header present, providing XSS protection.`, evidence: `CSP: ${csp.substring(0,150)}`, asset: domain });
    }
  }

  // X-Frame-Options
  if (!hmap['x-frame-options']) {
    findings.push({ title: 'Missing X-Frame-Options Header', severity: 'medium', category: 'header',
      description: `No X-Frame-Options — site is vulnerable to clickjacking. Set to "DENY" or "SAMEORIGIN".`, evidence: 'x-frame-options not found', asset: domain });
  }

  // X-Content-Type-Options
  if (hmap['x-content-type-options'] !== 'nosniff') {
    findings.push({ title: 'Missing X-Content-Type-Options: nosniff', severity: 'low', category: 'header',
      description: `Without nosniff, browsers may MIME-sniff content types.`, evidence: `x-content-type-options: ${hmap['x-content-type-options'] || 'not set'}`, asset: domain });
  }

  // Referrer-Policy
  if (!hmap['referrer-policy']) {
    findings.push({ title: 'Missing Referrer-Policy Header', severity: 'low', category: 'header',
      description: `No Referrer-Policy — full URLs may leak to third parties via Referer header.`, evidence: 'referrer-policy not found', asset: domain });
  }

  // Permissions-Policy
  if (!hmap['permissions-policy'] && !hmap['feature-policy']) {
    findings.push({ title: 'Missing Permissions-Policy Header', severity: 'low', category: 'header',
      description: `No Permissions-Policy — browser features (camera, mic, etc.) not restricted.`, evidence: 'permissions-policy not found', asset: domain });
  }

  // CORS
  if (hmap['access-control-allow-origin']) {
    if (hmap['access-control-allow-origin'] === '*') {
      findings.push({ title: 'CORS Allows Any Origin (*)', severity: 'high', category: 'header',
        description: `Access-Control-Allow-Origin: * means any website can read responses. If sensitive data is served, it can be exfiltrated by any malicious site.`, evidence: 'access-control-allow-origin: *', asset: domain });
    }
  }

  // Server disclosure
  if (hmap['server']) {
    technologies.push(hmap['server']);
    if (/\d+\.\d+/.test(hmap['server'])) {
      findings.push({ title: 'Server Version Disclosure', severity: 'medium', category: 'header',
        description: `Server header reveals version: "${hmap['server']}". Remove version numbers to reduce info leakage.`, evidence: `server: ${hmap['server']}`, asset: domain });
    }
  }

  // X-Powered-By
  if (hmap['x-powered-by']) {
    technologies.push(hmap['x-powered-by']);
    findings.push({ title: `Technology Disclosure: X-Powered-By: ${hmap['x-powered-by']}`, severity: 'low', category: 'header',
      description: `X-Powered-By reveals backend: "${hmap['x-powered-by']}". Remove in production.`, evidence: `x-powered-by: ${hmap['x-powered-by']}`, asset: domain });
  }

  // Detect tech from headers
  const allH = JSON.stringify(response.headers).toLowerCase();
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

  const sslResult = await analyzeSSLNative(domain);

  if (!sslResult.cert && !sslResult.sslConnect) {
    findings.push({ title: 'SSL/TLS Connection Failed', severity: 'high', category: 'ssl',
      description: `Could not establish SSL/TLS to ${domain}:443. Server may not support HTTPS.`, evidence: sslResult.error || 'TLS connection failed', asset: `${domain}:443` });
    return { findings, technologies };
  }

  const full = sslResult.certInfo || sslResult.sslConnect;

  // Subject
  const subjM = full.match(/subject=([^\n]+)/);
  if (subjM) findings.push({ title: `SSL Certificate Subject: ${subjM[1].trim()}`, severity: 'info', category: 'ssl',
    description: `Certificate issued to: ${subjM[1].trim()}.`, evidence: `subject: ${subjM[1].trim()}`, asset: domain });

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
    description: `Issued by: ${issuer}.`, evidence: `issuer: ${issuer}`, asset: domain });

  // Dates + expiry
  const nbM = full.match(/notBefore=(.+)/);
  const naM = full.match(/notAfter=(.+)/);
  if (nbM && naM) {
    const nb = new Date(nbM[1].trim());
    const na = new Date(naM[1].trim());
    const days = Math.ceil((na.getTime() - Date.now()) / 86400000);
    const lifespan = Math.ceil((na.getTime() - nb.getTime()) / 86400000);

    findings.push({ title: `SSL Certificate Validity: ${nb.toISOString().split('T')[0]} — ${na.toISOString().split('T')[0]}`, severity: 'info', category: 'ssl',
      description: `Certificate lifespan: ${lifespan} days. Valid from ${nb.toISOString().split('T')[0]} to ${na.toISOString().split('T')[0]}.`, evidence: `notBefore: ${nbM[1].trim()}, notAfter: ${naM[1].trim()}`, asset: domain });

    if (days < 0) {
      findings.push({ title: `SSL Certificate EXPIRED ${Math.abs(days)} days ago`, severity: 'critical', category: 'ssl',
        description: `Certificate for ${domain} expired ${Math.abs(days)} days ago. Browsers show security warnings, automated integrations fail with TLS errors. Immediate renewal required.`, evidence: `Expired: ${na.toISOString()}`, asset: domain });
    } else if (days <= 7) {
      findings.push({ title: `SSL Certificate Expiring in ${days} Days — CRITICAL`, severity: 'critical', category: 'ssl',
        description: `Certificate expires in ${days} days. Emergency renewal required.`, evidence: `Expires: ${na.toISOString()} (${days}d)`, asset: domain });
    } else if (days <= 30) {
      findings.push({ title: `SSL Certificate Expiring in ${days} Days`, severity: 'high', category: 'ssl',
        description: `Certificate expires in ${days} days. Prompt renewal needed.`, evidence: `Expires: ${na.toISOString()} (${days}d)`, asset: domain });
    } else if (days <= 90) {
      findings.push({ title: `SSL Certificate Expiring in ${days} Days`, severity: 'medium', category: 'ssl',
        description: `Certificate expires in ${days} days. Plan renewal.`, evidence: `Expires: ${na.toISOString()} (${days}d)`, asset: domain });
    }

    if (lifespan > 398) {
      findings.push({ title: `Certificate Lifespan Exceeds 398 Days (${lifespan}d)`, severity: 'medium', category: 'ssl',
        description: `Lifespan exceeds Apple/Google 398-day max. New certs must be shorter.`, evidence: `Lifespan: ${lifespan}d (max: 398)`, asset: domain });
    }
  }

  // SAN
  const sanM = full.match(/Subject Alternative Name[^\n]*\n([^\n]*)/);
  if (sanM) {
    const sans = sanM[1].match(/DNS:[^\s,]+/g);
    if (sans) findings.push({ title: `Certificate Covers ${sans.length} Domain(s) (SAN)`, severity: 'info', category: 'ssl',
      description: `SANs: ${sans.map(s=>s.replace('DNS:','')).join(', ')}.`, evidence: `SAN: ${sans.join(', ')}`, asset: domain });
  }

  // TLS version
  const proto = sslResult.protocol || '';
  if (proto.includes('TLSv1 ') || proto.includes('TLSv1.0')) {
    findings.push({ title: 'Weak TLS Version: TLS 1.0 Detected', severity: 'high', category: 'ssl',
      description: `TLS 1.0 deprecated (RFC 8996, 2020). Vulnerable to BEAST, POODLE, RC4. PCI-DSS prohibits. Disable immediately.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443` });
  } else if (proto.includes('TLSv1.1')) {
    findings.push({ title: 'Deprecated TLS 1.1 Detected', severity: 'high', category: 'ssl',
      description: `TLS 1.1 deprecated in 2020. Known weaknesses. PCI-DSS requires disabling. Support TLS 1.2+ only.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443` });
  } else if (proto.includes('TLSv1.3')) {
    technologies.push('TLS 1.3');
    findings.push({ title: 'Modern TLS 1.3 Negotiated', severity: 'info', category: 'ssl',
      description: `TLS 1.3 — latest version with 0-RTT, mandatory forward secrecy, no weak ciphers.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443` });
  } else if (proto.includes('TLSv1.2')) {
    technologies.push('TLS 1.2');
    findings.push({ title: 'TLS 1.2 Negotiated', severity: 'info', category: 'ssl',
      description: `TLS 1.2 — secure when configured with strong cipher suites. Consider enabling TLS 1.3.`, evidence: `Protocol: ${proto}`, asset: `${domain}:443` });
  }

  // Cipher
  const cipher = sslResult.cipher || '';
  const weakC = ['RC4','DES','MD5','NULL','EXPORT','3DES'];
  if (weakC.some(w => cipher.toUpperCase().includes(w))) {
    findings.push({ title: `Weak Cipher Suite: ${cipher}`, severity: 'high', category: 'ssl',
      description: `Weak cipher (${cipher}) — vulnerable to known attacks. Use AEAD ciphers (AES-GCM, ChaCha20-Poly1305) with ECDHE.`, evidence: `Cipher: ${cipher}`, asset: `${domain}:443` });
  } else if (cipher) {
    findings.push({ title: `Cipher Suite: ${cipher}`, severity: 'info', category: 'ssl',
      description: `Negotiated: ${cipher}.`, evidence: `Cipher: ${cipher}`, asset: `${domain}:443` });
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
      const r = await safeFetch(`https://${domain}:${port}`, { timeout: 5000, method: 'HEAD' })
        .catch(() => safeFetch(`http://${domain}:${port}`, { timeout: 5000, method: 'HEAD' }));
      if (r && r.status > 0) {
        const status = `HTTP/${r.status}`;
        const srv = r.headers['server'] ? ` [${r.headers['server']}]` : '';
        return { port, service, risk, desc, status: status + srv };
      }
      return null;
    })
  );

  return results.filter((r): r is NonNullable<typeof r> => Boolean(r)).map(({ port, service, risk, desc, status }) => ({
    title: `Port ${port}/tcp OPEN — ${service}`,
    severity: risk === 'info' ? 'info' : risk, category: 'port',
    description: `${service} accessible on port ${port}. ${desc}.${risk === 'critical' || risk === 'high' ? ' This should not be publicly accessible.' : ''}`,
    evidence: status, asset: `${domain}:${port}`,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// 6. CERTIFICATE TRANSPARENCY LOGS — crt.sh for ALL historical subdomains
// ═══════════════════════════════════════════════════════════════════════
async function enumerateCTLogs(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    const response = await safeFetch(`https://crt.sh/?q=%25.${domain}&output=json`, { timeout: 20000, skipSSRFCheck: true });
    if (!response.ok || !response.text) return findings;
    const certs = JSON.parse(response.text);
    // Deduplicate subdomains
    const subs = new Set<string>();
    for (const c of certs) {
      if (c.name_value) {
        for (const name of c.name_value.split('\n')) {
          const clean = name.trim().replace(/^\*\./, '');
          if (clean.endsWith(`.${domain}`) && clean !== domain) subs.add(clean);
        }
      }
    }
    const unique = Array.from(subs).sort();
    if (unique.length > 0) {
      findings.push({
        title: `Certificate Transparency: ${unique.length} Subdomain(s) from CT Logs`,
        severity: unique.length > 20 ? 'high' : 'info', category: 'osint',
        description: `crt.sh reveals ${unique.length} unique subdomains from historical SSL certificate logs. These subdomains may not be in current DNS but existed in the past — old infrastructure may still be alive.`,
        evidence: `CT subdomains: ${unique.slice(0, 30).join(', ')}${unique.length > 30 ? ` ... +${unique.length - 30} more` : ''}`,
        asset: domain,
      });
    }
    // Check for expired certs in CT logs
    const now = Date.now();
    const expiredCerts = certs.filter((c: { not_after?: string }) => {
      const exp = c.not_after ? new Date(c.not_after + ' UTC').getTime() : 0;
      return exp > 0 && exp < now;
    });
    if (expiredCerts.length > 3) {
      findings.push({
        title: `${expiredCerts.length} Expired Certificate(s) in CT Logs`,
        severity: 'medium', category: 'ssl',
        description: `${expiredCerts.length} historical certificates found in CT logs have expired. Expired certificates indicate abandoned infrastructure that may still be reachable.`,
        evidence: `Expired certs: ${Math.min(expiredCerts.length, 5)} found in crt.sh`,
        asset: domain,
      });
    }
  } catch { /* crt.sh may fail — non-critical */ }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. WAYBACK MACHINE RECON — historical endpoints, hidden paths
// ═══════════════════════════════════════════════════════════════════════
async function enumerateWayback(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    const response = await safeFetch(`http://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&collapse=urlkey&fl=original&limit=200`, { timeout: 25000, skipSSRFCheck: true });
    if (!response.ok || !response.text) return findings;
    const lines = response.text.split('\n').filter(Boolean);
    if (lines.length < 2) return findings;
    const urls = lines.slice(1).map(l => {
      try { return JSON.parse(l)[0]; } catch { return null; }
    }).filter(Boolean);

    // Extract unique paths
    const paths = new Set<string>();
    const sensitivePaths: string[] = [];
    const sensitivePatterns = [/\/admin/i, /\/api\//i, /\/debug/i, /\/test/i, /\/staging/i, /\/backup/i, /\/config/i, /\/env/i, /\/\.git/i, /\/\.svn/i, /\/\.env/i, /\/wp-/i, /\/phpmyadmin/i, /\/server-status/i, /\/actuator/i, /\/console/i, /\/graphql/i, /\/swagger/i, /\/\.well-known\//i];
    for (const url of urls) {
      try {
        const u = new URL(url);
        const p = u.pathname;
        paths.add(p);
        if (sensitivePatterns.some(pat => pat.test(p))) sensitivePaths.push(p);
      } catch {}
    }

    if (paths.size > 0) {
      findings.push({
        title: `Wayback Machine: ${paths.size} Historical URL(s) Archived`,
        severity: 'info', category: 'osint',
        description: `Web Archive reveals ${paths.size} unique paths for ${domain}. Historical pages often expose old API endpoints, admin panels, or backup files still on the server.`,
        evidence: `Sample paths: ${Array.from(paths).slice(0, 15).join(', ')}`,
        asset: domain,
      });
    }

    if (sensitivePaths.length > 0) {
      const unique = [...new Set(sensitivePaths)].sort();
      findings.push({
        title: `Wayback Machine: ${unique.length} Sensitive Path(s) Discovered`,
        severity: 'high', category: 'vulnerability',
        description: `Historical archives expose ${unique.length} sensitive paths that may still exist on the live server. These include admin panels, API endpoints, debug interfaces, config files, or version control directories.`,
        evidence: `Sensitive: ${unique.slice(0, 20).join(', ')}`,
        asset: domain,
      });
    }
  } catch { /* Wayback may fail — non-critical */ }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. REVERSE DNS + ASN INTELLIGENCE — map IPs to networks
// ═══════════════════════════════════════════════════════════════════════
async function reconReverseDNS(ips: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  const uniqueIPs = [...new Set(ips)].slice(0, 10);
  const rdnsResults = await Promise.all(
    uniqueIPs.map(async (ip) => {
      const ptr = await reverseDNS(ip);
      return { ip, ptr: ptr || '' };
    })
  );
  for (const { ip, ptr } of rdnsResults) {
    if (ptr) {
      findings.push({
        title: `Reverse DNS: ${ip} → ${ptr}`,
        severity: 'info', category: 'osint',
        description: `IP ${ip} resolves to hostname ${ptr} via reverse DNS. This reveals the hosting provider, CDN edge, or internal network naming convention.`,
        evidence: `PTR: ${ptr}`, asset: ip,
      });
    }
  }
  // ASN lookup via ipinfo.io (free tier, no auth needed)
  if (uniqueIPs[0]) {
    try {
      const asnResponse = await safeFetch(`https://ipinfo.io/${uniqueIPs[0]}/json`, { timeout: 10000, skipSSRFCheck: true });
      if (asnResponse.ok && asnResponse.text) {
        const info = JSON.parse(asnResponse.text);
        if (info.org || info.asn) {
          findings.push({
            title: `ASN Intelligence: ${info.org || info.asn}`,
            severity: 'info', category: 'osint',
            description: `Primary IP ${uniqueIPs[0]} belongs to ${info.org || info.asn}. Location: ${info.city || '?'}, ${info.region || '?'}, ${info.country || '?'}. ${info.hostname ? `Hostname: ${info.hostname}.` : ''}`,
            evidence: `ASN: ${info.asn || '?'}, Org: ${info.org || '?'}, IP: ${uniqueIPs[0]}, Loc: ${info.city || '?'}/${info.country || '?'}`,
            asset: uniqueIPs[0],
          });
        }
      }
    } catch {}
  }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 9. DNS ZONE TRANSFER (AXFR) ATTEMPTS — try all NS servers
// ═══════════════════════════════════════════════════════════════════════
async function attemptZoneTransfer(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const nsOut = await digAnswer(domain, 'NS');
  const nsServers: string[] = [];
  for (const line of nsOut.split('\n')) {
    const m = line.match(/NS\s+(\S+)/);
    if (m) nsServers.push(m[1].replace(/\.$/, ''));
  }
  if (nsServers.length === 0) return findings;

  // Zone Transfer (AXFR) — native dns.promises does not support AXFR queries
  // AXFR requires a specialized DNS client; skipping this check
  for (const ns of nsServers) {
    findings.push({
      title: `DNS Zone Transfer Check: ${ns}`,
      severity: 'info', category: 'dns',
      description: `AXFR query requires a specialized DNS client not available in the native resolver. Zone transfer checks against ${ns} were skipped.`,
      evidence: `NS: ${ns} — AXFR check skipped (native resolver limitation)`,
      asset: domain,
    });
  }

  // SOA record analysis
  const soaOut = await digAnswer(domain, 'SOA');
  if (soaOut) {
    findings.push({
      title: 'DNS SOA Record Analyzed',
      severity: 'info', category: 'dns',
      description: `SOA record reveals zone management details for ${domain}.`,
      evidence: soaOut.split('\n').filter(l => l.includes('SOA')).join('; '),
      asset: domain,
    });
  }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 10. ROBOTS.TXT + SITEMAP.XML — hidden paths, API endpoints
// ═══════════════════════════════════════════════════════════════════════
async function analyzeRobotsAndSitemap(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const [robotsResult, sitemapResult] = await Promise.all([
    safeFetch(`https://${domain}/robots.txt`, { timeout: 12000 }).catch(() => safeFetch(`http://${domain}/robots.txt`, { timeout: 12000 })),
    safeFetch(`https://${domain}/sitemap.xml`, { timeout: 12000 }).catch(() => safeFetch(`http://${domain}/sitemap.xml`, { timeout: 12000 })),
  ]);
  const robots = robotsResult?.text || '';
  const sitemap = sitemapResult?.text || '';

  // Robots.txt
  if (robots && robots.length > 10) {
    const disallowed = robots.split('\n').filter(l => l.startsWith('Disallow:')).map(l => l.replace('Disallow:', '').trim()).filter(Boolean);
    const sensitive = disallowed.filter(d => /admin|api|debug|config|backup|\.env|secret|internal|private|tmp|upload|staging/i.test(d));
    if (sensitive.length > 0) {
      findings.push({
        title: `robots.txt: ${sensitive.length} Sensitive Disallowed Path(s)`,
        severity: 'high', category: 'vulnerability',
        description: `robots.txt reveals ${sensitive.length} sensitive paths that the site asks crawlers not to access. These paths likely exist and may be accessible without authentication: ${sensitive.join(', ')}`,
        evidence: `Disallow: ${sensitive.join(', ')}`, asset: `${domain}/robots.txt`,
      });
    } else if (disallowed.length > 0) {
      findings.push({
        title: `robots.txt: ${disallowed.length} Disallowed Path(s) Found`,
        severity: 'info', category: 'osint',
        description: `robots.txt defines ${disallowed.length} restricted paths: ${disallowed.slice(0, 10).join(', ')}`,
        evidence: `Disallow: ${disallowed.slice(0, 10).join(', ')}`, asset: `${domain}/robots.txt`,
      });
    }
    // Check for sitemap reference
    if (robots.includes('Sitemap:')) {
      findings.push({
        title: 'robots.txt References Sitemap', severity: 'info', category: 'osint',
        description: 'Sitemap URL found in robots.txt — reveals site structure.',
        evidence: robots.split('\n').find(l => l.startsWith('Sitemap:')) || '', asset: `${domain}/robots.txt`,
      });
    }
  } else if (!robots || robots.length <= 10) {
    findings.push({
      title: 'robots.txt Not Found or Empty', severity: 'low', category: 'osint',
      description: 'No robots.txt file. This means all pages are crawlable by default, including any admin/debug paths.',
      evidence: 'robots.txt returned empty or 404', asset: `${domain}/robots.txt`,
    });
  }

  // Sitemap.xml
  if (sitemap && sitemap.includes('<url')) {
    const urls = (sitemap.match(/<loc>([^<]+)<\/loc>/g) || []).map(u => u.replace(/<\/?loc>/g, ''));
    findings.push({
      title: `sitemap.xml: ${urls.length} URL(s) Exposed`,
      severity: urls.length > 100 ? 'medium' : 'info', category: 'osint',
      description: `sitemap.xml exposes ${urls.length} URLs revealing the full site structure. This aids attackers in mapping the application for targeted attacks.`,
      evidence: `URLs: ${urls.slice(0, 10).join(', ')}${urls.length > 10 ? ` ... +${urls.length - 10} more` : ''}`,
      asset: `${domain}/sitemap.xml`,
    });
  }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 11. JAVASCRIPT FILE ANALYSIS — extract API endpoints, secrets, keys
// ═══════════════════════════════════════════════════════════════════════
async function analyzeJSFiles(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    // Fetch the main page and extract JS file URLs
    const pageResult = await safeFetch(`https://${domain}`, { timeout: 15000 }).catch(() => safeFetch(`http://${domain}`, { timeout: 15000 }));
    const page = pageResult?.text || '';
    if (!page || page.length < 100) return findings;

    const jsUrls = [...new Set(
      (page.match(/src=["']([^"']+\.js[^"']*)/g) || [])
        .map(m => m.replace(/src=["']/, '').replace(/["']$/, ''))
        .filter(u => !u.startsWith('data:') && !u.includes('chrome-extension'))
    )].slice(0, 8);

    if (jsUrls.length === 0) return findings;

    // Fetch and analyze each JS file
    const jsContents = await Promise.all(
      jsUrls.map(async (url) => {
        const fullUrl = url.startsWith('http') ? url : `https://${domain}${url}`;
        const result = await safeFetch(fullUrl, { timeout: 12000 });
        return result?.text || '';
      })
    );

    const allJs = jsContents.join('\n');
    if (allJs.length < 50) return findings;

    // Extract API endpoints
    const apiEndpoints = [...new Set(
      (allJs.match(/["'](\/api\/[^"']+)["']/g) || [])
        .map(m => m.replace(/["']/g, ''))
    )];
    if (apiEndpoints.length > 0) {
      findings.push({
        title: `JavaScript: ${apiEndpoints.length} API Endpoint(s) Exposed`,
        severity: 'high', category: 'vulnerability',
        description: `JavaScript files expose ${apiEndpoints.length} API endpoints. Attackers can reverse-engineer the API surface, craft targeted requests, and test for authentication bypass or IDOR vulnerabilities.`,
        evidence: `Endpoints: ${apiEndpoints.slice(0, 20).join(', ')}`,
        asset: domain,
      });
    }

    // Check for secrets/keys/tokens
    const secretPatterns = [
      { name: 'API Key', regex: /["'](api[_-]?key|apikey)["']\s*[:=]\s*["']([^"']{8,})["']/gi },
      { name: 'Auth Token', regex: /["'](auth[_-]?token|bearer|access[_-]?token)["']\s*[:=]\s*["']([^"']{8,})["']/gi },
      { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'Firebase', regex: /firebase[a-zA-Z]*\.appspot\.com/g },
      { name: 'Stripe Key', regex: /pk_(test|live)_[a-zA-Z0-9]{24,}/g },
      { name: 'Generic Secret', regex: /["'](secret|password|token|private[_-]?key)["']\s*[:=]\s*["']([^"']{8,})["']/gi },
    ];
    const secrets: string[] = [];
    for (const { name, regex } of secretPatterns) {
      const matches = allJs.match(regex);
      if (matches) secrets.push(...matches.map(m => `[${name}] ${m.substring(0, 60)}`));
    }
    if (secrets.length > 0) {
      findings.push({
        title: `CRITICAL: ${secrets.length} Secret(s)/Key(s) Found in JavaScript`,
        severity: 'critical', category: 'vulnerability',
        description: `JavaScript files contain ${secrets.length} hardcoded secrets, API keys, or tokens. These can be extracted by anyone viewing the page source and used to access internal services, databases, or third-party APIs.`,
        evidence: `Secrets: ${secrets.slice(0, 5).join(' | ')}`,
        asset: domain,
      });
    }

    // Extract internal URLs/paths
    const internalPaths = [...new Set(
      (allJs.match(/["'](\/[a-zA-Z0-9_\-\/]+(?:admin|dashboard|console|manage|debug|internal|private|staging)[^"']*)["']/gi) || [])
        .map(m => m.replace(/["']/g, ''))
    )];
    if (internalPaths.length > 0) {
      findings.push({
        title: `JavaScript: ${internalPaths.length} Internal Path(s) Referenced`,
        severity: 'medium', category: 'osint',
        description: `JavaScript files reference ${internalPaths.length} internal/sensitive paths. These may be admin interfaces, debug endpoints, or internal tools.`,
        evidence: `Paths: ${internalPaths.slice(0, 15).join(', ')}`,
        asset: domain,
      });
    }

    // Count JS files and total size
    findings.push({
      title: `JavaScript Analysis: ${jsUrls.length} File(s), ${Math.round(allJs.length / 1024)}KB Analyzed`,
      severity: 'info', category: 'technology',
      description: `${jsUrls.length} JavaScript files totaling ~${Math.round(allJs.length / 1024)}KB were downloaded and analyzed for API endpoints, secrets, and internal paths.`,
      evidence: `JS files: ${jsUrls.slice(0, 5).join(', ')}`,
      asset: domain,
    });
  } catch {}
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 12. WAF/SECURITY CONTROL DETECTION — fingerprint protection layers
// ═══════════════════════════════════════════════════════════════════════
async function detectWAF(domain: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  // Trigger WAF with suspicious paths and analyze response
  const [normalResult, attackResult] = await Promise.all([
    safeFetch(`https://${domain}/`, { timeout: 10000, method: 'HEAD' }),
    safeFetch(`https://${domain}/../../../etc/passwd`, { timeout: 10000, method: 'HEAD' }),
  ]);
  const normalResp = normalResult.headers ? JSON.stringify(normalResult.headers) : '';
  const attackResp = attackResult.headers ? JSON.stringify(attackResult.headers) + ` status:${attackResult.status}` : '';

  const wafSignatures: Record<string, string[]> = {
    'Cloudflare': ['cf-ray', 'cf-cache-status', '__cf_bm', 'cloudflare'],
    'AWS WAF': ['x-amzn-requestid', 'awselb'],
    'Akamai': ['akamai', 'x-akamai'],
    'Sucuri': ['x-sucuri-id', 'sucuri'],
    'Imperva': ['x-iinfo', 'incap_ses'],
    'Fastly': ['x-fastly-request-id', 'x-served-by'],
    'Varnish': ['x-varnish', 'x-hits'],
    'ModSecurity': ['mod_security', 'modsecurity'],
    'F5 BIG-IP': ['bigip', 'f5'],
  };

  const detectedWAFs: string[] = [];
  for (const [waf, sigs] of Object.entries(wafSignatures)) {
    const combined = (normalResp + attackResp).toLowerCase();
    if (sigs.some(s => combined.includes(s.toLowerCase()))) detectedWAFs.push(waf);
  }

  // Check if attack path was blocked differently
  const normalStatus = `HTTP ${normalResult.status}`;
  const attackStatus = `HTTP ${attackResult.status}`;
  const blocked = attackResult.status === 403 || attackResult.status === 429;

  if (detectedWAFs.length > 0) {
    const techList = detectedWAFs.join(', ');
    findings.push({
      title: `WAF Detected: ${techList}`,
      severity: 'info', category: 'security',
      description: `${techList} detected protecting ${domain}. WAF presence indicates active security posture but also reveals the defense layer for targeted evasion research.`,
      evidence: `Signatures found: ${detectedWAFs.map(w => wafSignatures[w].join(', ')).join('; ')}`,
      asset: domain,
    });
  }

  if (blocked) {
    findings.push({
      title: 'Path Traversal Attempt Blocked',
      severity: 'info', category: 'security',
      description: `Directory traversal attempt (../../../etc/passwd) was blocked with ${attackStatus}. This indicates active input validation or WAF protection.`,
      evidence: `Attack response: ${attackStatus} | Normal: ${normalStatus}`,
      asset: domain,
    });
  } else if (attackResp.includes('200') || attackResp.includes('301')) {
    findings.push({
      title: 'Path Traversal Attempt NOT Blocked',
      severity: 'high', category: 'vulnerability',
      description: `Directory traversal attempt (../../../etc/passwd) returned ${attackStatus} — the request was NOT blocked. This may indicate missing input validation, no WAF, or a misconfigured security layer.`,
      evidence: `Attack response: ${attackStatus} | Normal: ${normalStatus}`,
      asset: domain,
    });
  }

  // Rate limit detection
  const burst = await Promise.all([
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
  ]);
  const rateLimited = burst.some(r => r.status === 429);
  if (!rateLimited) {
    findings.push({
      title: 'No Rate Limiting Detected',
      severity: 'medium', category: 'vulnerability',
      description: `5 rapid requests returned no rate limiting (429). The server accepts unlimited requests, making it vulnerable to brute force, credential stuffing, and DoS attacks.`,
      evidence: '5 rapid requests: all returned non-429 status',
      asset: domain,
    });
  } else {
    findings.push({
      title: 'Rate Limiting Active', severity: 'info', category: 'security',
      description: 'Rate limiting detected on rapid requests.', evidence: '429 response received on burst', asset: domain,
    });
  }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 13. TECHNOLOGY FINGERPRINTING — deep Wappalyzer-style detection
// ═══════════════════════════════════════════════════════════════════════
async function deepFingerprint(domain: string, headers: string, pageContent: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const techs: string[] = [];
  const h = headers.toLowerCase();
  const p = (pageContent || '').toLowerCase();

  // Server tech
  const serverMap: Record<string, string> = {
    'nginx': 'Nginx', 'apache': 'Apache HTTPD', 'express': 'Express.js',
    'cloudflare': 'Cloudflare', 'vercel': 'Vercel', 'netlify': 'Netlify',
    'awselb': 'AWS ELB', 'amazon': 'Amazon Web Services',
    'gws': 'Google Web Server', 'gse': 'Google Search Appliance',
    'microsoft-iis': 'Microsoft IIS', 'tomcat': 'Apache Tomcat',
    'openresty': 'OpenResty', 'caddy': 'Caddy',
  };
  for (const [sig, name] of Object.entries(serverMap)) {
    if (h.includes(sig) && !techs.includes(name)) techs.push(name);
  }

  // Framework detection from page content
  const frameworkSigs: Record<string, string[]> = {
    'React': ['react', 'reactjs', '__next', '_next/static', 'next/router', 'data-reactroot'],
    'Next.js': ['__next', '_next/static', '_next/image', 'next/link', 'next-route-announcer'],
    'Vue.js': ['vue', 'v-cloak', 'data-v-', 'vue-router', 'vuetify'],
    'Angular': ['ng-version', 'ng-app', 'angular', 'ng-controller'],
    'Svelte': ['svelte', '__svelte'],
    'jQuery': ['jquery', 'jquery.min.js'],
    'Bootstrap': ['bootstrap', 'bootstrap.min.css'],
    'Tailwind CSS': ['tailwind'],
    'WordPress': ['wp-content', 'wp-includes', 'wordpress'],
    'Drupal': ['drupal', 'sites/default'],
    'Shopify': ['shopify', 'cdn.shopify.com'],
    'Magento': ['magento', 'mage-cache'],
    'Laravel': ['laravel', 'laravel_session', 'xsrf-token'],
    'Django': ['csrfmiddlewaretoken', 'django'],
    'Ruby on Rails': ['csrf-token', 'turbolinks', 'rails'],
    'PHP': ['.php', 'phpsessid'],
    'ASP.NET': ['asp.net', '__viewstate', '__requestverificationtoken'],
  };
  for (const [name, sigs] of Object.entries(frameworkSigs)) {
    if (sigs.some(s => p.includes(s)) && !techs.includes(name)) techs.push(name);
  }

  // Analytics
  const analyticsSigs: Record<string, string[]> = {
    'Google Analytics': ['google-analytics.com', 'gtag', 'ga.js', 'analytics.js'],
    'Google Tag Manager': ['googletagmanager.com', 'gtm.js'],
    'Hotjar': ['hotjar.com', 'hjSdk'],
    'Mixpanel': ['mixpanel', 'mp.page'],
    'Segment': ['segment.com', 'analytics.js'],
    'Plausible': ['plausible.io'],
    'Fathom': ['fathomanalytics.com'],
  };
  for (const [name, sigs] of Object.entries(analyticsSigs)) {
    if (sigs.some(s => p.includes(s)) && !techs.includes(name)) techs.push(name);
  }

  if (techs.length > 0) {
    for (const tech of techs) {
      findings.push({
        title: `Technology Fingerprinted: ${tech}`,
        severity: 'info', category: 'technology',
        description: `${tech} detected on ${domain} via deep header, HTML, and JavaScript fingerprinting.`,
        evidence: 'Deep fingerprinting (headers + page content analysis)',
        asset: domain,
      });
    }
  }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// 14. EMAIL HARVESTING — WHOIS, website, JS, DNS
// ═══════════════════════════════════════════════════════════════════════
async function harvestEmails(domain: string, pageContent: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const emails = new Set<string>();

  // From page content
  const escapedDomain = domain.replace(/\./g, '\\.');
  const emailRegex = new RegExp(`[a-zA-Z0-9._%+-]+@${escapedDomain}`, 'gi');
  const pageEmails = (pageContent || '').match(emailRegex) || [];
  pageEmails.forEach(e => emails.add(e.toLowerCase()));

  // From MX records (mail server hostnames often reveal email provider)
  const mxRecords = await digShort(domain, 'MX');
  const mxHosts = mxRecords.map(r => {
    const m = r.match(/\S+/);
    return m ? m[0] : r;
  });

  if (emails.size > 0) {
    findings.push({
      title: `${emails.size} Email Address(es) Harvested`,
      severity: 'medium', category: 'osint',
      description: `${emails.size} email address(es) found on ${domain} via page content analysis. These can be used for social engineering, credential stuffing, or targeted phishing campaigns.`,
      evidence: `Emails: ${Array.from(emails).slice(0, 10).join(', ')}`,
      asset: domain,
    });
  }

  if (mxHosts.length > 0) {
    findings.push({
      title: `Email Infrastructure: ${mxHosts.join(', ')}`,
      severity: 'info', category: 'osint',
      description: `Mail routed through: ${mxHosts.join(', ')}. This reveals the email provider (Google Workspace, Microsoft 365, self-hosted, etc.) and can be targeted for email-based attacks.`,
      evidence: `MX: ${mxHosts.join(', ')}`,
      asset: domain,
    });
  }
  return findings;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SCAN ENDPOINT
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const { error: protErr, domain: protDomain } = await withProtection(request.clone() as unknown as NextRequest, { validateDomainFromBody: true, rateLimit: { maxRequests: 3, windowMs: 60000 } });
  if (protErr) return protErr;

  try {
    const body = await request.json();
    const { scanType } = body;

    if (!protDomain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const cleanDomain = protDomain;

    // Pre-check: domain must resolve
    const preCheckIp = await nativeResolveIP(cleanDomain);
    if (!preCheckIp) {
      return NextResponse.json({ error: `Domain "${cleanDomain}" does not resolve. Check the name and try again.` }, { status: 400 });
    }

    // SSRF protection: block scans that resolve to private IPs
    if (isPrivateIP(preCheckIp)) {
      return NextResponse.json({ error: 'Domain resolves to a private or reserved IP address. Scanning is not permitted.' }, { status: 403 });
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

    // ── 3. HTTP headers + page content (async curl) ──────────────────
    const httpResult = await analyzeHTTPHeaders(cleanDomain);
    allFindings.push(...httpResult.findings);
    httpResult.technologies.forEach(t => allTech.add(t));

    // Fetch page content once for multiple modules
    const pageResult = await safeFetch(`https://${cleanDomain}`, { timeout: 15000 }).catch(() => safeFetch(`http://${cleanDomain}`, { timeout: 15000 }));
    const pageContent = pageResult?.text || '';
    const rawHeadersResult = await safeFetch(`https://${cleanDomain}`, { timeout: 10000, method: 'HEAD' });
    const rawHeaders = rawHeadersResult?.text || '';

    // ── 4. SSL/TLS (async openssl) ─────────────────────────────────
    const sslResult = await analyzeSSL(cleanDomain);
    allFindings.push(...sslResult.findings);
    sslResult.technologies.forEach(t => allTech.add(t));

    // ── 5. Port probing (full only, async parallel) ────────────────
    if (!isQuick) {
      const portFindings = await probePorts(cleanDomain);
      allFindings.push(...portFindings);
    }

    // ═══ NEW DEADLY MODULES (full scan only) ═══════════════════════
    if (!isQuick) {
      // ── 6. Certificate Transparency Logs ──────────────────────────
      const [ctFindings, waybackFindings, rdnsFindings, axfrFindings, robotsFindings, jsFindings, wafFindings, fpFindings, emailFindings] = await Promise.all([
        enumerateCTLogs(cleanDomain),
        enumerateWayback(cleanDomain),
        reconReverseDNS([...dnsResult.mainIp ? [dnsResult.mainIp] : [], ...subFindings.map(f => {
          const m = f.evidence.match(/\d+\.\d+\.\d+\.\d+/);
          return m ? m[0] : null;
        }).filter((v): v is string => Boolean(v))]),
        attemptZoneTransfer(cleanDomain),
        analyzeRobotsAndSitemap(cleanDomain),
        analyzeJSFiles(cleanDomain),
        detectWAF(cleanDomain),
        deepFingerprint(cleanDomain, rawHeaders, pageContent),
        harvestEmails(cleanDomain, pageContent),
      ]);

      allFindings.push(...ctFindings, ...waybackFindings, ...rdnsFindings, ...axfrFindings, ...robotsFindings, ...jsFindings, ...wafFindings, ...fpFindings, ...emailFindings);
    } else {
      // Quick scan: still run CT logs and basic fingerprinting (lightweight)
      const [ctFindings, fpFindings] = await Promise.all([
        enumerateCTLogs(cleanDomain),
        deepFingerprint(cleanDomain, rawHeaders, pageContent),
      ]);
      allFindings.push(...ctFindings, ...fpFindings);
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
    const wcIp = await nativeResolveIP(`nonexistent-wildcard-test-12345.${cleanDomain}`);
    if (wcIp) {
      allFindings.push({
        title: 'Wildcard DNS Record Detected', severity: 'medium', category: 'dns',
        description: `Wildcard DNS active — even nonexistent subdomains resolve to ${wcIp}. Subdomain enumeration may have false positives.`,
        evidence: `nonexistent-wildcard-test-12345.${cleanDomain} resolved to ${wcIp}`, asset: cleanDomain,
      });
    }

    // ── Save to DB ─────────────────────────────────────────────────
    for (const f of allFindings) {
      // Destructure out any extra fields not in Prisma schema (e.g. technologies)
      const { title: _t, severity: _s, category: _c, description: _d, evidence: _e, asset: _a, ...rest } = f;
      const safeData = { scanId: scan.id, title: f.title, severity: f.severity, category: f.category, description: f.description, evidence: f.evidence, asset: f.asset };
      await db.finding.create({ data: safeData });
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

    return applySecurityHeaders(NextResponse.json({
      success: true,
      scan: {
        id: scan.id, domain: cleanDomain, status: 'completed', riskScore,
        totalVulns: allFindings.length, critical: c, high: h, medium: m, low: l, info: i,
        findings: allFindings.map(f => ({
          id: f.title.toLowerCase().replace(/\s+/g, '-').substring(0, 20),
          ...f,
        })),
      },
    }));
  } catch (error) {
    console.error('Scan error:', error);
    return safeError('Scan failed', 500);
  }
}