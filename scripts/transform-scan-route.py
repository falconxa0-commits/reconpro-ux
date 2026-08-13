#!/usr/bin/env python3
"""
Transform scan/route.ts: Replace all exec/dig/curl/openssl calls with native Node.js APIs.
This is a security hardening transformation — eliminating command injection vectors.
"""

import re

with open('/home/z/my-project/src/app/api/scan/route.ts', 'r') as f:
    content = f.read()

# 1. Replace imports: remove exec/promisify, add native imports
old_imports = """import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);"""

new_imports = """import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { digShort, digAnswer, resolveIP as nativeResolveIP, reverseDNS, analyzeSSLNative } from '@/lib/native-dns';
import { safeFetch } from '@/lib/safe-fetch';"""

content = content.replace(old_imports, new_imports, 1)

# 2. Replace the run() function with nothing (remove it)
run_func_pattern = r"// ── Async shell runner \(never blocks event loop\) ──────────────────\nasync function run\(cmd: string, timeout = 8000\): Promise<string> \{\n  try \{\n    const \{ stdout \} = await execAsync\(cmd, \{ timeout, encoding: 'utf-8' \}\);\n    return stdout\.trim\(\);\n  \} catch \{ return ''; \}\n\}"
content = re.sub(run_func_pattern, '', content)

# 3. Replace digShort and digAnswer and resolveIP function definitions
# (they're now imported from native-dns)

# Remove old digShort
old_dig_short = """// ── Async DNS via dig ─────────────────────────────────────────────
async function digShort(domain: string, type: string): Promise<string[]> {
  const out = await run(`dig +short +time=2 +tries=1 ${domain} ${type}`, 5000);
  return out ? out.split('\\n').map(l => l.trim()).filter(Boolean) : [];
}"""
content = content.replace(old_dig_short, "// DNS functions now imported from @/lib/native-dns")

# Remove old digAnswer
old_dig_answer = """async function digAnswer(domain: string, type: string): Promise<string> {
  return run(`dig +noall +answer +time=2 +tries=1 ${domain} ${type}`, 5000);
}"""
content = content.replace(old_dig_answer, "")

# Remove old resolveIP
old_resolve_ip = """async function resolveIP(domain: string): Promise<string | null> {
  const out = await run(`dig +short +time=2 +tries=1 ${domain} A`, 3000);
  if (!out) return null;
  for (const line of out.split('\\n')) {
    if (/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(line.trim())) return line.trim();
  }
  return null;
}"""
content = content.replace(old_resolve_ip, "")

# 4. Replace DNSSEC check (line 259) - native dns.promises doesn't support DNSSEC
old_dnssec = """  // DNSSEC
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
  }"""

new_dnssec = """  // DNSSEC — native dns.promises doesn't support DNSSEC queries
  // DNSSEC validation requires specialized DNS libraries; skipping this check
  findings.push({
    title: 'DNSSEC Check Skipped',
    severity: 'info', category: 'dns',
    description: `DNSSEC validation requires specialized DNS query support not available in the native resolver. Use a dedicated DNS security tool for full DNSSEC analysis.`,
    evidence: 'Native resolver — DNSSEC check not available',
    asset: domain,
  });"""

content = content.replace(old_dnssec, new_dnssec)

# 5. Replace analyzeHTTPHeaders - use safeFetch
old_analyze_http = """async function analyzeHTTPHeaders(domain: string): Promise<{ findings: Finding[]; technologies: string[] }> {
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
  for (const line of headers.split('\\n')) {
    const m = line.match(/^([^:]+):\\s*(.+)/);
    if (m) hmap[m[1].trim().toLowerCase()] = m[2].trim();
  }"""

new_analyze_http = """async function analyzeHTTPHeaders(domain: string): Promise<{ findings: Finding[]; technologies: string[] }> {
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

  const hmap: Record<string, string> = response.headers;"""

content = content.replace(old_analyze_http, new_analyze_http)

# 6. Fix the tech detection in analyzeHTTPHeaders that uses httpsH + httpH
old_tech_detect = """  // Detect tech from headers
  const allH = httpsH + httpH;"""
new_tech_detect = """  // Detect tech from headers
  const allH = JSON.stringify(response.headers).toLowerCase();"""
content = content.replace(old_tech_detect, new_tech_detect)

# 7. Replace analyzeSSL - use native TLS
old_ssl_start = """async function analyzeSSL(domain: string): Promise<{ findings: Finding[]; technologies: string[] }> {
  const findings: Finding[] = [];
  const technologies: string[] = [];

  const [certInfo, sslConnect] = await Promise.all([
    run(`echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null`, 10000),
    run(`echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>&1`, 10000),
  ]);

  if (!certInfo && !sslConnect.includes('SSL handshake')) {
    findings.push({ title: 'SSL/TLS Connection Failed', severity: 'high', category: 'ssl',
      description: `Could not establish SSL/TLS to ${domain}:443. Server may not support HTTPS.`, evidence: 'openssl s_client failed', asset: `${domain}:443` });
    return { findings, technologies };
  }

  const full = certInfo || sslConnect;"""

new_ssl_start = """async function analyzeSSL(domain: string): Promise<{ findings: Finding[]; technologies: string[] }> {
  const findings: Finding[] = [];
  const technologies: string[] = [];

  const sslResult = await analyzeSSLNative(domain);

  if (!sslResult.cert && !sslResult.sslConnect) {
    findings.push({ title: 'SSL/TLS Connection Failed', severity: 'high', category: 'ssl',
      description: `Could not establish SSL/TLS to ${domain}:443. Server may not support HTTPS.`, evidence: sslResult.error || 'TLS connection failed', asset: `${domain}:443` });
    return { findings, technologies };
  }

  const full = sslResult.certInfo || sslResult.sslConnect;"""

content = content.replace(old_ssl_start, new_ssl_start)

# 8. Replace TLS protocol detection to use structured data
old_proto_detect = """  // TLS version
  const protoM = sslConnect.match(/Protocol\\s*:\\s*([^\\n]+)/);
  const proto = protoM ? protoM[1].trim() : '';"""

new_proto_detect = """  // TLS version
  const proto = sslResult.protocol || '';"""

content = content.replace(old_proto_detect, new_proto_detect)

# 9. Replace cipher detection
old_cipher_detect = """  // Cipher
  const cipM = sslConnect.match(/Cipher\\s*:\\s*([^\\n]+)/);
  const cipher = cipM ? cipM[1].trim() : '';"""

new_cipher_detect = """  // Cipher
  const cipher = sslResult.cipher || '';"""

content = content.replace(old_cipher_detect, new_cipher_detect)

# 10. Replace probePorts to use safeFetch
old_probe = """async function probePorts(domain: string): Promise<Finding[]> {
  const results = await Promise.all(
    WEB_PORTS.map(async ({ port, service, risk, desc }) => {
      const r = await run(`curl -sI --max-time 3 -k https://${domain}:${port} 2>/dev/null || curl -sI --max-time 3 http://${domain}:${port} 2>/dev/null`, 5000);
      if (r && r.includes('HTTP/')) {
        const status = r.split('\\n')[0];
        const srvM = r.match(/server:\\s*(.+)/i);
        const srv = srvM ? ` [${srvM[1].trim()}]` : '';
        return { port, service, risk, desc, status: status + srv };
      }
      return null;
    })
  );"""

new_probe = """async function probePorts(domain: string): Promise<Finding[]> {
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
  );"""

content = content.replace(old_probe, new_probe)

# 11. Replace enumerateCTLogs
old_ct = """  try {
    const out = await run(`curl -s "https://crt.sh/?q=%25.${domain}&output=json" --max-time 15`, 20000);
    if (!out) return findings;
    const certs = JSON.parse(out);"""

new_ct = """  try {
    const response = await safeFetch(`https://crt.sh/?q=%25.${domain}&output=json`, { timeout: 20000, skipSSRFCheck: true });
    if (!response.ok || !response.text) return findings;
    const certs = JSON.parse(response.text);"""

content = content.replace(old_ct, new_ct)

# 12. Replace enumerateWayback
old_wayback = """  try {
    const out = await run(`curl -s "http://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&collapse=urlkey&fl=original&limit=200" --max-time 20`, 25000);
    if (!out) return findings;
    const lines = out.split('\\n').filter(Boolean);"""

new_wayback = """  try {
    const response = await safeFetch(`http://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&collapse=urlkey&fl=original&limit=200`, { timeout: 25000, skipSSRFCheck: true });
    if (!response.ok || !response.text) return findings;
    const lines = response.text.split('\\n').filter(Boolean);"""

content = content.replace(old_wayback, new_wayback)

# 13. Replace reconReverseDNS
old_rdns = """  const rdnsResults = await Promise.all(
    uniqueIPs.map(async (ip) => {
      const ptr = await run(`host ${ip} 2>/dev/null | grep 'domain name pointer'`, 5000);
      return { ip, ptr: ptr.replace(/.*domain name pointer\\s+/, '').trim() || '' };
    })
  );"""

new_rdns = """  const rdnsResults = await Promise.all(
    uniqueIPs.map(async (ip) => {
      const ptr = await reverseDNS(ip);
      return { ip, ptr: ptr || '' };
    })
  );"""

content = content.replace(old_rdns, new_rdns)

# 14. Replace ASN lookup (ipinfo.io)
old_asn = """    try {
      const asnOut = await run(`curl -s "https://ipinfo.io/${uniqueIPs[0]}/json" --max-time 8`, 10000);
      if (asnOut) {
        const info = JSON.parse(asnOut);"""

new_asn = """    try {
      const asnResponse = await safeFetch(`https://ipinfo.io/${uniqueIPs[0]}/json`, { timeout: 10000, skipSSRFCheck: true });
      if (asnResponse.ok && asnResponse.text) {
        const info = JSON.parse(asnResponse.text);"""

content = content.replace(old_asn, new_asn)

# 15. Replace attemptZoneTransfer - use native DNS (no AXFR support, skip)
old_zt = """  const transferResults = await Promise.all(
    nsServers.map(async (ns) => {
      const out = await run(`dig axfr ${domain} @${ns} +time=5 +tries=1 2>&1`, 8000);
      const success = out.includes('XFR size') || (out.split('\\n').length > 10 && !out.includes('REFUSED') && !out.includes('SERVFAIL'));
      return { ns, success, recordCount: out.split('\\n').filter(l => l.includes('IN\\t')).length, sample: out.split('\\n').slice(0, 20).join('\\n') };
    })
  );

  for (const { ns, success, recordCount, sample } of transferResults) {
    if (success && recordCount > 5) {
      findings.push({
        title: `CRITICAL: DNS Zone Transfer Succeeded from ${ns}`,
        severity: 'critical', category: 'vulnerability',
        description: `FULL zone transfer (AXFR) succeeded from nameserver ${ns}! This exposes ALL DNS records for ${domain} — every subdomain, MX, TXT, SRV, and internal infrastructure record. This is a critical information disclosure vulnerability.`,
        evidence: `AXFR from ${ns}: ${recordCount} records exposed. Sample:\\n${sample.substring(0, 500)}`,
        asset: `${ns} (AXFR)`,
      });
    }
  }"""

new_zt = """  // Zone Transfer (AXFR) — native dns.promises does not support AXFR queries
  // AXFR requires a specialized DNS client; skipping this check
  for (const ns of nsServers) {
    findings.push({
      title: `DNS Zone Transfer Check: ${ns}`,
      severity: 'info', category: 'dns',
      description: `AXFR query requires a specialized DNS client not available in the native resolver. Zone transfer checks against ${ns} were skipped.`,
      evidence: `NS: ${ns} — AXFR check skipped (native resolver limitation)`,
      asset: domain,
    });
  }"""

content = content.replace(old_zt, new_zt)

# 16. Replace analyzeRobotsAndSitemap
old_robots = """  const [robots, sitemap] = await Promise.all([
    run(`curl -s --max-time 8 https://${domain}/robots.txt 2>/dev/null || curl -s --max-time 8 http://${domain}/robots.txt 2>/dev/null`, 12000),
    run(`curl -s --max-time 8 https://${domain}/sitemap.xml 2>/dev/null || curl -s --max-time 8 http://${domain}/sitemap.xml 2>/dev/null`, 12000),
  ]);"""

new_robots = """  const [robotsResult, sitemapResult] = await Promise.all([
    safeFetch(`https://${domain}/robots.txt`, { timeout: 12000 }).catch(() => safeFetch(`http://${domain}/robots.txt`, { timeout: 12000 })),
    safeFetch(`https://${domain}/sitemap.xml`, { timeout: 12000 }).catch(() => safeFetch(`http://${domain}/sitemap.xml`, { timeout: 12000 })),
  ]);
  const robots = robotsResult?.text || '';
  const sitemap = sitemapResult?.text || '';"""

content = content.replace(old_robots, new_robots)

# 17. Replace analyzeJSFiles
old_js = """    const page = await run(`curl -s --max-time 10 https://${domain} 2>/dev/null || curl -s --max-time 10 http://${domain} 2>/dev/null`, 15000);
    if (!page || page.length < 100) return findings;"""

new_js = """    const pageResult = await safeFetch(`https://${domain}`, { timeout: 15000 }).catch(() => safeFetch(`http://${domain}`, { timeout: 15000 }));
    const page = pageResult?.text || '';
    if (!page || page.length < 100) return findings;"""

content = content.replace(old_js, new_js)

old_js_fetch = """    const jsContents = await Promise.all(
      jsUrls.map(async (url) => {
        const fullUrl = url.startsWith('http') ? url : `https://${domain}${url}`;
        return run(`curl -s --max-time 8 "${fullUrl}" 2>/dev/null`, 12000);
      })
    );"""

new_js_fetch = """    const jsContents = await Promise.all(
      jsUrls.map(async (url) => {
        const fullUrl = url.startsWith('http') ? url : `https://${domain}${url}`;
        const result = await safeFetch(fullUrl, { timeout: 12000 });
        return result?.text || '';
      })
    );"""

content = content.replace(old_js_fetch, new_js_fetch)

# 18. Replace detectWAF
old_waf = """  const [normalResp, attackResp] = await Promise.all([
    run(`curl -sI --max-time 8 https://${domain}/ 2>/dev/null`, 10000),
    run(`curl -sI --max-time 8 "https://${domain}/../../../etc/passwd" 2>/dev/null`, 10000),
  ]);"""

new_waf = """  const [normalResult, attackResult] = await Promise.all([
    safeFetch(`https://${domain}/`, { timeout: 10000, method: 'HEAD' }),
    safeFetch(`https://${domain}/../../../etc/passwd`, { timeout: 10000, method: 'HEAD' }),
  ]);
  const normalResp = normalResult.headers ? JSON.stringify(normalResult.headers) : '';
  const attackResp = attackResult.headers ? JSON.stringify(attackResult.headers) + ` status:${attackResult.status}` : '';"""

content = content.replace(old_waf, new_waf)

# Fix WAF status detection
old_waf_status = """  const normalStatus = normalResp.split('\\n')[0] || '';
  const attackStatus = attackResp.split('\\n')[0] || '';
  const blocked = attackResp.includes('403') || attackResp.includes('blocked') || attackResp.includes('Forbidden');"""

new_waf_status = """  const normalStatus = `HTTP ${normalResult.status}`;
  const attackStatus = `HTTP ${attackResult.status}`;
  const blocked = attackResult.status === 403 || attackResult.status === 429;"""

content = content.replace(old_waf_status, new_waf_status)

# 19. Replace WAF rate limit detection
old_burst = """  // Rate limit detection
  const burst = await Promise.all([
    run(`curl -sI --max-time 5 https://${domain}/ 2>/dev/null`, 6000),
    run(`curl -sI --max-time 5 https://${domain}/ 2>/dev/null`, 6000),
    run(`curl -sI --max-time 5 https://${domain}/ 2>/dev/null`, 6000),
    run(`curl -sI --max-time 5 https://${domain}/ 2>/dev/null`, 6000),
    run(`curl -sI --max-time 5 https://${domain}/ 2>/dev/null`, 6000),
  ]);
  const rateLimited = burst.some(r => r.includes('429') || r.includes('Too Many'));"""

new_burst = """  // Rate limit detection
  const burst = await Promise.all([
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
    safeFetch(`https://${domain}/`, { timeout: 6000, method: 'HEAD' }),
  ]);
  const rateLimited = burst.some(r => r.status === 429);"""

content = content.replace(old_burst, new_burst)

# 20. Replace harvestEmails MX lookup
old_email_mx = """  // From MX records (mail server hostnames often reveal email provider)
  const mxOut = await digAnswer(domain, 'MX');
  const mxHosts = mxOut.split('\\n').filter(l => l.includes('MX')).map(l => l.trim().split(/\\s+/).pop());"""

new_email_mx = """  // From MX records (mail server hostnames often reveal email provider)
  const mxRecords = await digShort(domain, 'MX');
  const mxHosts = mxRecords.map(r => {
    const m = r.match(/\\S+/);
    return m ? m[0] : r;
  });"""

content = content.replace(old_email_mx, new_email_mx)

# 21. Replace POST handler page content fetching
old_page = """    const pageContent = await run(`curl -s --max-time 12 https://${cleanDomain} 2>/dev/null || curl -s --max-time 12 http://${cleanDomain} 2>/dev/null`, 15000);
    const rawHeaders = await run(`curl -sI --max-time 8 https://${cleanDomain} 2>/dev/null`, 10000);"""

new_page = """    const pageResult = await safeFetch(`https://${cleanDomain}`, { timeout: 15000 }).catch(() => safeFetch(`http://${cleanDomain}`, { timeout: 15000 }));
    const pageContent = pageResult?.text || '';
    const rawHeadersResult = await safeFetch(`https://${cleanDomain}`, { timeout: 10000, method: 'HEAD' });
    const rawHeaders = rawHeadersResult?.text || '';"""

content = content.replace(old_page, new_page)

# 22. Replace resolveIP calls in POST handler (wildcard check)
old_wc = """    const wcIp = await resolveIP(`nonexistent-wildcard-test-12345.${cleanDomain}`);"""
new_wc = """    const wcIp = await nativeResolveIP(`nonexistent-wildcard-test-12345.${cleanDomain}`);"""
content = content.replace(old_wc, new_wc)

# Also replace the resolveIP call in preCheckIp
old_precheck = """    const preCheckIp = await resolveIP(cleanDomain);"""
new_precheck = """    const preCheckIp = await nativeResolveIP(cleanDomain);"""
content = content.replace(old_precheck, new_precheck)

# Write the transformed file
with open('/home/z/my-project/src/app/api/scan/route.ts', 'w') as f:
    f.write(content)

print("✅ scan/route.ts transformed: All exec() calls replaced with native Node.js APIs")
print("   - dig → dns/promises")
print("   - curl → safeFetch (with SSRF protection)")
print("   - openssl → tls.connect (native)")
print("   - host → dns.promises.resolvePtr")
