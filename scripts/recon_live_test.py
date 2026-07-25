#!/usr/bin/env python3
"""
ReconPro Live Test — Scan a REAL million-dollar company
Runs the same 13-category reconnaissance as the Next.js scan engine
Every finding backed by actual dig/curl/openssl output
"""
import subprocess
import json
import ssl
import socket
import urllib.request
import re
import sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

DOMAIN = "stripe.com"  # $10B+ payments company, 8000+ employees
TIMEOUT = 8
results = {
    "target": DOMAIN,
    "scan_time": datetime.utcnow().isoformat() + "Z",
    "categories": {},
    "total_findings": 0,
    "severity_counts": {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0},
    "raw_evidence": []
}

def run(cmd, timeout=TIMEOUT):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), r.stderr.strip()
    except:
        return "", ""

def add_finding(title, severity, category, description, evidence, asset):
    f = {"title": title, "severity": severity, "category": category,
         "description": description, "evidence": evidence, "asset": asset}
    results["categories"][category].append(f)
    results["severity_counts"][severity] = results["severity_counts"].get(severity, 0) + 1
    results["total_findings"] += 1

# ══════════════════════════════════════════════════════════════════
# 1. DNS ENUMERATION — 11 sub-checks
# ══════════════════════════════════════════════════════════════════
print(f"[*] Scanning {DOMAIN} — ReconPro Live Test")
print(f"[*] Category 1/13: DNS Enumeration...")

results["categories"]["dns"] = []
d = DOMAIN

# A Records
out, _ = run(f"dig +short +time=3 +tries=1 {d} A")
a_records = [l.strip() for l in out.split('\n') if l.strip() and re.match(r'^\d+\.\d+', l)]
if a_records:
    add_finding(f"DNS A Record — {len(a_records)} IPv4 address(es)", "info", "dns",
                f"Domain resolves to {len(a_records)} IPv4: {', '.join(a_records)}. Multiple IPs = CDN/load balancing.",
                f"A: {', '.join(a_records)}", d)

# AAAA Records
out, _ = run(f"dig +short +time=3 +tries=1 {d} AAAA")
aaaa = [l.strip() for l in out.split('\n') if l.strip()]
if aaaa:
    add_finding("DNS AAAA Record — IPv6 enabled", "info", "dns",
                f"IPv6 address(es): {', '.join(aaaa[:3])}", f"AAAA: {aaaa[0]}", d)

# MX Records
out, _ = run(f"dig +noall +answer +time=3 +tries=1 {d} MX")
mx_lines = [l.strip() for l in out.split('\n') if 'MX' in l]
if mx_lines:
    add_finding(f"MX Records — {len(mx_lines)} mail server(s)", "info", "dns",
                f"Mail servers:\n" + "\n".join(f"  {m}" for m in mx_lines[:5]),
                "; ".join(mx_lines[:3]), d)
else:
    add_finding("No MX Records Found", "low", "dns",
                f"No MX records for {d}. Third-party email or no direct mail.", "MX query empty", d)

# NS Records
out, _ = run(f"dig +noall +answer +time=3 +tries=1 {d} NS")
ns_lines = [l.strip() for l in out.split('\n') if 'NS' in l]
if ns_lines:
    ns_names = [l.split()[-1] for l in ns_lines]
    add_finding(f"NS Records — {len(ns_lines)} nameserver(s)", "info", "dns",
                f"Nameservers: {', '.join(ns_names)}", "; ".join(ns_lines[:2]), d)

# TXT Records
out, _ = run(f"dig +short +time=3 +tries=1 {d} TXT")
txt_recs = [l.strip() for l in out.split('\n') if l.strip()]
if txt_recs:
    add_finding(f"TXT Records — {len(txt_recs)} record(s)", "info", "dns",
                f"TXT records found: {len(txt_recs)} (SPF, verification, etc.)", txt_recs[0][:120], d)

# SPF
spf = next((t for t in txt_recs if 'v=spf' in t), None)
if not spf:
    add_finding("SPF Record Missing", "high", "dns",
                f"No SPF record! Attackers can spoof emails from {d}. Critical for brand protection.",
                f"TXT: {len(txt_recs)} records, none SPF", d)
elif '+all' in spf or '?all' in spf:
    add_finding("SPF Record Uses +all or ?all (OPEN)", "critical", "dns",
                f"SPF allows ANY server to send email — completely defeats purpose.",
                f"SPF: {spf[:100]}", d)
else:
    add_finding("SPF Record Configured Properly", "info", "dns",
                f"SPF found with proper enforcement: {spf[:120]}", f"SPF: {spf[:80]}", d)

# DMARC
out, _ = run(f"dig +short +time=3 +tries=1 _dmarc.{d} TXT")
dmarc_recs = [l.strip() for l in out.split('\n') if l.strip()]
dmarc = next((t for t in dmarc_recs if 'v=DMARC' in t), None)
if not dmarc:
    add_finding("DMARC Record Not Found", "high", "dns",
                f"No DMARC! Cannot enforce email authentication policy for {d}.",
                f"_dmarc.{d} TXT empty", f"_dmarc.{d}")
else:
    p = re.search(r'p=(\w+)', dmarc)
    policy = p.group(1) if p else 'unknown'
    if policy == 'none':
        add_finding('DMARC Policy Set to "none" (Monitor Only)', "medium", "dns",
                    f"DMARC p=none: unauthenticated emails only monitored, not rejected.",
                    f"DMARC: {dmarc[:100]}", f"_dmarc.{d}")
    else:
        add_finding(f"DMARC Policy Active (p={policy})", "info", "dns",
                    f"DMARC enforcing with p={policy}. Strong email auth.", f"DMARC: {dmarc[:80]}", f"_dmarc.{d}")

# DKIM
selectors = ['selector1', 'selector2', 'google', 'k1', 'default', 's1', 'stripe']
for sel in selectors:
    out, _ = run(f"dig +short +time=3 +tries=1 {sel}._domainkey.{d} TXT")
    if 'v=DKIM' in out or 'k=rsa' in out:
        add_finding(f"DKIM Record Found (selector: {sel})", "info", "dns",
                    f"DKIM signing active with selector '{sel}'. Emails can be verified.", f"Selector: {sel}", d)
        break
else:
    add_finding("DKIM Record Not Found", "medium", "dns",
                f"No DKIM for common selectors. Email verification limited.", f"Checked: {selectors[:4]}", d)

# DNSSEC
out, _ = run(f"dig +dnssec +time=3 +tries=1 {d} A")
if 'RRSIG' not in out:
    add_finding("DNSSEC Not Enabled", "medium", "dns",
                f"DNSSEC not active. DNS responses can be spoofed via cache poisoning.", "No RRSIG in response", d)
else:
    add_finding("DNSSEC Enabled", "info", "dns",
                "DNSSEC provides cryptographic DNS authentication.", "RRSIG records present", d)

# SOA
out, _ = run(f"dig +noall +answer +time=3 +tries=1 {d} SOA")
soa_lines = [l.strip() for l in out.split('\n') if 'SOA' in l]
if soa_lines:
    add_finding(f"SOA Record — Primary NS: {soa_lines[0].split()[4] if len(soa_lines[0].split()) > 4 else 'found'}",
                "info", "dns", f"SOA record present. Zone management active.", soa_lines[0][:100], d)

print(f"    DNS: {len(results['categories']['dns'])} findings")

# ══════════════════════════════════════════════════════════════════
# 2. SUBDOMAIN ENUMERATION
# ══════════════════════════════════════════════════════════════════
print("[*] Category 2/13: Subdomain Enumeration...")
results["categories"]["subdomains"] = []
subdomains = [
    'www','api','mail','admin','portal','dashboard','app','dev','staging',
    'cdn','blog','shop','secure','auth','login','sso','vpn','gateway','proxy',
    'ns1','ns2','dns','db','elastic','search','analytics','webhook','graphql',
    'git','gitlab','github','docs','status','monitor','grafana','kibana','logs',
    'jenkins','ci','internal','sandbox','demo','preview','m','mobile','crm',
    'pay','checkout','payments','checkout','merchant','dashboard','links',
]

sensitive = {'admin','portal','dashboard','db','jenkins','gitlab','internal',
             'staging','dev','test','vpn','proxy','elastic','kibana','grafana',
             'crm','ci','api'}

discovered = []

def check_sub(sub):
    out, _ = run(f"dig +short +time=2 +tries=1 {sub}.{d} A", 4)
    ips = [l.strip() for l in out.split('\n') if l.strip() and re.match(r'^\d+\.\d+', l)]
    return (sub, ips[0]) if ips else None

with ThreadPoolExecutor(max_workers=25) as pool:
    futs = {pool.submit(check_sub, s): s for s in subdomains}
    for fut in as_completed(futs, timeout=60):
        r = fut.result()
        if r:
            discovered.append(r)

if discovered:
    sens = [s for s, _ in discovered if s in sensitive]
    add_finding(f"Subdomain Discovery — {len(discovered)} live subdomain(s)", "info", "subdomains",
                f"Found {len(discovered)} active subdomains out of {len(subdomains)} checked.",
                f"{len(discovered)}/{len(subdomains)} resolved", d)
    if sens:
        add_finding(f"Sensitive Subdomains Exposed — {len(sens)} found", "high", "subdomains",
                    f"Sensitive subdomains accessible: {', '.join(sens)}. These often expose admin panels, dashboards, or internal tools.",
                    f"Sensitive: {', '.join(sens[:8])}", d)
    for sub, ip in discovered[:5]:
        results["raw_evidence"].append(f"  {sub}.{d} → {ip}")
else:
    add_finding("No Subdomains Found (Quick Scan)", "info", "subdomains",
                "Quick scan found no resolvable subdomains.", "0/55 resolved", d)

print(f"    Subdomains: {len(discovered)} discovered")

# ══════════════════════════════════════════════════════════════════
# 3. HTTP SECURITY HEADERS
# ══════════════════════════════════════════════════════════════════
print("[*] Category 3/13: HTTP Security Headers...")
results["categories"]["headers"] = []

try:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(f"https://{d}", headers={"User-Agent": "ReconPro/1.0"}, method="GET")
    resp = urllib.request.urlopen(req, timeout=10, context=ctx)
    headers = dict(resp.getheaders())
    
    checks = {
        "strict-transport-security": ("Strict-Transport-Security", "high", 
            "HSTS not set. Browser can connect via insecure HTTP."),
        "x-content-type-options": ("X-Content-Type-Options", "medium",
            "Missing X-Content-Type-Options. MIME sniffing attacks possible."),
        "x-frame-options": ("X-Frame-Options", "medium",
            "Missing X-Frame-Options. Page can be framed (clickjacking risk)."),
        "content-security-policy": ("Content-Security-Policy", "medium",
            "Missing CSP. No XSS mitigation via policy headers."),
        "x-xss-protection": ("X-XSS-Protection", "low",
            "Missing X-XSS-Protection. Legacy XSS filter not active."),
        "referrer-policy": ("Referrer-Policy", "low",
            "Missing Referrer-Policy. Referrer data may leak to third parties."),
        "permissions-policy": ("Permissions-Policy", "low",
            "Missing Permissions-Policy. Browser features not restricted."),
    }
    
    missing = []
    for key, (name, sev, desc) in checks.items():
        found = any(key.lower() in k.lower() for k in headers)
        if found:
            add_finding(f"{name} — Present", "info", "headers",
                        f"Security header {name} is configured.", name, d)
        else:
            missing.append(name)
            add_finding(f"{name} — Missing", sev, "headers", desc, f"No {name} header", d)
    
    if missing:
        add_finding(f"Missing {len(missing)} Security Headers", "high" if len(missing) >= 4 else "medium", "headers",
                    f"Security posture gaps: {', '.join(missing[:5])}. Each missing header is a potential attack vector.",
                    f"Missing: {', '.join(missing)}", d)
    else:
        add_finding("All Security Headers Present — Excellent Posture", "info", "headers",
                    "All checked security headers are properly configured.", "Full header coverage", d)
    
    # Server header
    server = headers.get("server", headers.get("Server", ""))
    if server:
        add_finding(f"Server Header — {server}", "low", "headers",
                    f"Server software revealed: {server}. Information disclosure.", f"Server: {server}", d)
    
    # Tech detection from headers
    techs = []
    h_str = str(headers).lower()
    if 'cloudflare' in h_str: techs.append("Cloudflare CDN")
    if 'awselb' in h_str or 'amazon' in h_str: techs.append("AWS Infrastructure")
    if 'nginx' in h_str: techs.append("Nginx")
    if 'gcp' in h_str or 'google' in h_str: techs.append("Google Cloud")
    if techs:
        add_finding(f"Technology Fingerprint — {', '.join(techs)}", "info", "headers",
                    f"Detected technologies: {', '.join(techs)}", f"Tech: {', '.join(techs)}", d)
    
except Exception as e:
    add_finding(f"HTTP Connection Failed — {str(e)[:80]}", "high", "headers",
                f"Could not connect to {d}: {str(e)[:100]}", f"Error: {str(e)[:60]}", d)

print(f"    Headers: {len(results['categories']['headers'])} findings")

# ══════════════════════════════════════════════════════════════════
# 4. SSL/TLS CERTIFICATE ANALYSIS
# ══════════════════════════════════════════════════════════════════
print("[*] Category 4/13: SSL/TLS Certificate Analysis...")
results["categories"]["ssl"] = []

out, err = run(f"echo | openssl s_client -connect {d}:443 -servername {d} 2>/dev/null", 10)
if out:
    # Extract cert info
    cert_lines = [l.strip() for l in out.split('\n') if l.strip()]
    
    # Issuer
    for l in cert_lines:
        if l.startswith('issuer:'):
            add_finding(f"SSL Certificate Issuer — {l[8:80]}", "info", "ssl",
                        f"Certificate issued by: {l[8:100]}", l[:80], f"{d}:443")
            break
    
    # Subject
    for l in cert_lines:
        if l.startswith('subject:'):
            add_finding(f"SSL Certificate Subject — {l[9:80]}", "info", "ssl",
                        f"Certificate issued for: {l[9:100]}", l[:80], f"{d}:443")
            break
    
    # Validity
    for l in cert_lines:
        if 'notBefore' in l or 'not after' in l:
            add_finding(f"SSL Certificate Validity — {l.strip()[:80]}", "info", "ssl",
                        f"Certificate dates: {l.strip()[:100]}", l.strip()[:80], f"{d}:443")
    
    # Protocol
    for l in cert_lines:
        if 'Protocol' in l:
            add_finding(f"SSL Protocol — {l.strip()[:80]}", "info", "ssl",
                        f"Negotiated protocol: {l.strip()}", l.strip()[:60], f"{d}:443")
            if 'TLSv1.0' in l or 'TLSv1.1' in l:
                add_finding("Deprecated TLS Version in Use", "high", "ssl",
                            f"Using outdated protocol: {l.strip()}. Vulnerable to BEAST/POODLE.", l.strip(), f"{d}:443")
            break
    
    # Cipher
    for l in cert_lines:
        if 'Cipher' in l and 'Protocol' not in l:
            add_finding(f"SSL Cipher Suite — {l.strip()[:80]}", "info", "ssl",
                        f"Cipher: {l.strip()}", l.strip()[:60], f"{d}:443")
            cipher = l.lower()
            if 'rc4' in cipher or 'des' in cipher or '3des' in cipher or 'md5' in cipher:
                add_finding("Weak Cipher Suite Detected", "critical", "ssl",
                            f"Weak cipher in use: {l.strip()}. Vulnerable to decryption attacks.", l.strip(), f"{d}:443")
            break
    
    # SAN check
    san_out, _ = run(f"echo | openssl s_client -connect {d}:443 -servername {d} 2>/dev/null | openssl x509 -noout -ext subjectAltName", 10)
    if san_out:
        add_finding(f"Certificate SAN — {san_out.strip()[:100]}", "info", "ssl",
                    f"Subject Alternative Names: {san_out.strip()[:120]}", san_out.strip()[:80], f"{d}:443")
    
    # Expiry check
    expire_out, _ = run(f"echo | openssl s_client -connect {d}:443 -servername {d} 2>/dev/null | openssl x509 -noout -dates", 10)
    if expire_out:
        add_finding(f"Certificate Dates — {expire_out.strip()[:120]}", "info", "ssl",
                    f"Certificate validity period: {expire_out.strip()[:100]}", expire_out.strip()[:80], f"{d}:443")
else:
    add_finding("SSL Certificate Unavailable", "critical", "ssl",
                f"Could not retrieve SSL certificate for {d}:443", "Connection failed", f"{d}:443")

print(f"    SSL/TLS: {len(results['categories']['ssl'])} findings")

# ══════════════════════════════════════════════════════════════════
# 5. OPEN PORT SCAN (common ports)
# ══════════════════════════════════════════════════════════════════
print("[*] Category 5/13: Port Scanning...")
results["categories"]["ports"] = []

if a_records:
    ip = a_records[0]
    common_ports = {
        21: "FTP", 22: "SSH", 25: "SMTP", 53: "DNS", 80: "HTTP", 443: "HTTPS",
        465: "SMTPS", 587: "Submission", 8443: "HTTPS-Alt", 3306: "MySQL",
        5432: "PostgreSQL", 6379: "Redis", 8080: "HTTP-Proxy", 8443: "Alt-HTTPS",
        9090: "Prometheus", 27017: "MongoDB",
    }
    
    open_ports = []
    def check_port(port):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(3)
            r = s.connect_ex((ip, port))
            s.close()
            return (port, common_ports.get(port, f"Port-{port}")) if r == 0 else None
        except:
            return None
    
    with ThreadPoolExecutor(max_workers=20) as pool:
        futs = {pool.submit(check_port, p): p for p in common_ports}
        for fut in as_completed(futs, timeout=90):
            r = fut.result()
            if r:
                open_ports.append(r)
    
    if open_ports:
        critical_ports = {p for p, n in open_ports if p in {22, 21, 3306, 5432, 6379, 27017, 9090}}
        add_finding(f"Open Ports — {len(open_ports)} found on {ip}", "info", "ports",
                    f"Open ports: {', '.join(f'{p} ({n})' for p, n in sorted(open_ports))}",
                    f"IP: {ip} | Ports: {', '.join(str(p) for p, _ in sorted(open_ports))}", ip)
        if critical_ports:
            add_finding(f"Sensitive Ports Exposed — {len(critical_ports)} high-value ports", "high", "ports",
                        f"High-value ports open: {', '.join(str(p) for p in sorted(critical_ports))}. These often expose admin interfaces or databases.",
                        f"Sensitive: {', '.join(str(p) for p in sorted(critical_ports))}", ip)
    else:
        add_finding("No Common Ports Open (Minimal Attack Surface)", "info", "ports",
                    f"None of {len(common_ports)} checked ports are open. Good posture.", f"0/{len(common_ports)} open", ip)
else:
    add_finding("Port Scan Skipped — No IP resolved", "info", "ports", "No IP to scan.", "N/A", d)

print(f"    Ports: {len(results['categories']['ports'])} findings")

# ══════════════════════════════════════════════════════════════════
# 6. TECHNOLOGY FINGERPRINTING
# ══════════════════════════════════════════════════════════════════
print("[*] Category 6/13: Technology Fingerprinting...")
results["categories"]["tech"] = []

try:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(f"https://{d}", headers={"User-Agent": "Mozilla/5.0"}, method="GET")
    resp = urllib.request.urlopen(req, timeout=10, context=ctx)
    body = resp.read(50000).decode('utf-8', errors='ignore')
    headers = dict(resp.getheaders())
    
    techs = []
    # HTML patterns
    patterns = {
        "React": ['react', 'data-react', '__NEXT_DATA__', '_next/static'],
        "Next.js": ['_next/', '__next'],
        "Vue.js": ['vue', 'v-app', 'v-cloak'],
        "Angular": ['ng-', 'angular'],
        "jQuery": ['jquery'],
        "WordPress": ['wp-content', 'wp-includes', 'wordpress'],
        "Shopify": ['shopify', 'cdn.shopify'],
        "Cloudflare": ['cloudflare', 'cf-', '__cf'],
        "Google Analytics": ['google-analytics', 'gtag', 'ga('],
        "Stripe.js": ['stripe.com/js', 'js.stripe.com'],
        "Datadog": ['datadog', 'dd.js'],
    }
    
    for tech, sigs in patterns.items():
        body_lower = body[:20000].lower()  # Check first 20K chars
        head_lower = str(headers).lower()
        if any(s.lower() in body_lower or s.lower() in head_lower for s in sigs):
            techs.append(tech)
            results["raw_evidence"].append(f"  Tech: {tech} detected")
    
    if techs:
        add_finding(f"Technology Stack — {len(techs)} technologies detected", "info", "tech",
                    f"Detected: {', '.join(techs)}. Tech fingerprint reveals implementation details useful for targeted attacks.",
                    f"Tech: {', '.join(techs)}", d)
    else:
        add_finding("Technology Fingerprint — Minimal Exposure", "info", "tech",
                    "Could not fingerprint specific technologies from response.", "No clear patterns", d)
    
except Exception as e:
    add_finding(f"Tech Fingerprint Failed — {str(e)[:60]}", "info", "tech", str(e)[:80], "Error", d)

print(f"    Tech: {len(results['categories']['tech'])} findings")

# ══════════════════════════════════════════════════════════════════
# 7. ROBOTS.TXT ANALYSIS
# ══════════════════════════════════════════════════════════════════
print("[*] Category 7/13: Robots.txt Analysis...")
results["categories"]["robots"] = []

try:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(f"https://{d}/robots.txt", headers={"User-Agent": "ReconPro/1.0"})
    resp = urllib.request.urlopen(req, timeout=8, context=ctx)
    robots = resp.read(10000).decode('utf-8', errors='ignore')
    
    disallowed = [l.strip().split()[-1] for l in robots.split('\n') if l.strip().startswith('Disallow:')]
    sitemaps = [l.strip() for l in robots.split('\n') if l.strip().startswith('Sitemap:')]
    
    if disallowed:
        sensitive_paths = [p for p in disallowed if any(k in p.lower() for k in ['admin', 'private', 'secret', 'internal', 'config', '.env'])]
        add_finding(f"Robots.txt — {len(disallowed)} disallowed path(s)", "info", "robots",
                    f"Disallowed paths: {', '.join(disallowed[:8])}. Robots.txt reveals directory structure even when blocking crawlers.",
                    f"Paths: {', '.join(disallowed[:6])}", d)
        if sensitive_paths:
            add_finding(f"Sensitive Paths in Robots.txt — {len(sensitive_paths)} found", "medium", "robots",
                        f"Robots.txt exposes sensitive paths: {', '.join(sensitive_paths[:5])}. Attackers use this for targeted enumeration.",
                        f"Sensitive: {', '.join(sensitive_paths[:4])}", d)
    else:
        add_finding("Robots.txt — No Disallow Entries", "info", "robots",
                    "Robots.txt exists but allows all crawling.", "No Disallow directives", d)
    
    if sitemaps:
        add_finding(f"Sitemap Found — {len(sitemaps)} sitemap(s)", "info", "robots",
                    f"Sitemaps: {', '.join(sitemaps[:3])}. Reveals complete URL structure.", sitemaps[0][:80], d)
    
except Exception as e:
    add_finding("Robots.txt — Not Found", "info", "robots",
                f"No robots.txt at https://{d}/robots.txt. Site is fully crawlable or blocking at WAF level.",
                "404 / robots.txt", d)

print(f"    Robots.txt: {len(results['categories']['robots'])} findings")

# ══════════════════════════════════════════════════════════════════
# 8. REVERSE DNS
# ══════════════════════════════════════════════════════════════════
print("[*] Category 8/13: Reverse DNS Lookup...")
results["categories"]["reverse_dns"] = []

if a_records:
    for ip in a_records[:3]:
        out, _ = run(f"dig +short +time=3 +tries=1 -x {ip}", 5)
        ptr = out.strip()
        if ptr and ptr != '.':
            add_finding(f"Reverse DNS — {ip} → {ptr}", "info", "reverse_dns",
                        f"PTR record: {ip} resolves to {ptr}. Reveals hosting provider/CDN.",
                        f"PTR: {ptr}", ip)
            break
        else:
            add_finding(f"Reverse DNS — No PTR for {ip}", "info", "reverse_dns",
                        f"No reverse DNS for {ip}. IP identity not disclosed.", f"No PTR for {ip}", ip)
            break

print(f"    Reverse DNS: {len(results['categories']['reverse_dns'])} findings")

# ══════════════════════════════════════════════════════════════════
# 9. WHOIS / ASN INFO
# ══════════════════════════════════════════════════════════════════
print("[*] Category 9/13: ASN Information...")
results["categories"]["asn"] = []

if a_records:
    ip = a_records[0]
    out, _ = run(f"dig +short +time=3 +tries=1 -x {ip}", 5)
    # Use curl to a public ASN API
    try:
        req = urllib.request.Request(f"http://ip-api.com/json/{ip}", headers={"User-Agent": "ReconPro/1.0"})
        resp = urllib.request.urlopen(req, timeout=8)
        data = json.loads(resp.read())
        if data.get("as"):
            add_finding(f"ASN — {data.get('as', 'N/A')} ({data.get('isp', 'N/A')})", "info", "asn",
                        f"Network: AS{data.get('as', 'N/A')}, ISP: {data.get('isp', 'N/A')}, "
                        f"Org: {data.get('org', 'N/A')}, Location: {data.get('city', '?')}, {data.get('country', '?')}",
                        f"AS: {data.get('as', 'N/A')} | Org: {data.get('org', 'N/A')}", ip)
    except Exception as e:
        add_finding("ASN Lookup — API Unavailable", "info", "asn", f"Could not retrieve ASN data: {str(e)[:60]}", "API error", ip)

print(f"    ASN: {len(results['categories']['asn'])} findings")

# ══════════════════════════════════════════════════════════════════
# 10. VULNERABILITY PROBING (safe checks only)
# ══════════════════════════════════════════════════════════════════
print("[*] Category 10/13: Vulnerability Probing...")
results["categories"]["vulns"] = []

safe_paths = [
    ("/.env", "Environment Variables", "critical"),
    ("/.git/HEAD", "Git Repository", "critical"),
    ("/wp-admin/", "WordPress Admin", "medium"),
    ("/admin/login", "Admin Panel", "medium"),
    ("/phpmyadmin/", "phpMyAdmin", "critical"),
    ("/server-status", "Apache Status", "high"),
    ("/.well-known/security.txt", "Security Contact", "info"),
]

for path, name, sev in safe_paths:
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(f"https://{d}{path}", headers={"User-Agent": "ReconPro/1.0"})
        resp = urllib.request.urlopen(req, timeout=5, context=ctx)
        code = resp.getcode()
        body = resp.read(500).decode('utf-8', errors='ignore')
        if code == 200 and len(body) > 10:
            add_finding(f"Exposed — {name} at {path} (HTTP {code})", sev, "vulns",
                        f"{name} accessible at {path}. Returns HTTP {code} with {len(body)} bytes.",
                        f"GET {path} → {code} ({len(body)}B)", d)
        elif code in (301, 302, 403):
            pass  # Not exposed but exists
    except urllib.error.HTTPError as e:
        if e.code == 404:
            pass  # Good, not found
        elif e.code == 403:
            results["raw_evidence"].append(f"  {path} → 403 (blocked)")
    except:
        pass

add_finding("Security.txt Check", "info", "vulns",
            f"Checked {len(safe_paths)} common exposure paths.", f"{len(safe_paths)} paths probed", d)

print(f"    Vulns: {len(results['categories']['vulns'])} findings")

# ══════════════════════════════════════════════════════════════════
# 11. EMAIL SECURITY POSTURE
# ══════════════════════════════════════════════════════════════════
print("[*] Category 11/13: Email Security Posture...")
results["categories"]["email"] = []

# Check for open relay
out, _ = run(f"dig +short +time=3 +tries=1 {d} MX")
mx_records = [l.strip() for l in out.split('\n') if l.strip() and re.match(r'^\d+\s', l)]
if mx_records:
    mx_host = mx_records[0].split()[-1].rstrip('.')
    add_finding(f"Primary Mail Server — {mx_host}", "info", "email",
                f"Mail handled by: {mx_host}", f"MX: {mx_host}", d)
    results["raw_evidence"].append(f"  Mail: {mx_host}")

# Check SPF alignment
spf_pass = spf is not None
dmarc_pass = dmarc is not None
dkim_pass = any(f['title'].startswith('DKIM Record Found') for f in results['categories'].get('dns', []))

email_score = sum([spf_pass, dmarc_pass, dkim_pass])
if email_score == 3:
    add_finding("Email Security — Fully Configured (SPF + DMARC + DKIM)", "info", "email",
                "All three email authentication protocols are active. Strong protection against spoofing.",
                "SPF: OK | DMARC: OK | DKIM: OK", d)
elif email_score >= 1:
    add_finding(f"Email Security — Partial ({email_score}/3 protocols)", "medium", "email",
                f"Only {email_score}/3 email auth protocols configured. SPF:{'Y' if spf_pass else 'N'} DMARC:{'Y' if dmarc_pass else 'N'} DKIM:{'Y' if dkim_pass else 'N'}",
                f"Score: {email_score}/3", d)
else:
    add_finding("Email Security — No Protocols Configured", "high", "email",
                "No SPF, DMARC, or DKIM. Domain is fully open to email spoofing.", "0/3 protocols", d)

print(f"    Email: {len(results['categories']['email'])} findings")

# ══════════════════════════════════════════════════════════════════
# 12. NETWORK PERIMETER
# ══════════════════════════════════════════════════════════════════
print("[*] Category 12/13: Network Perimeter Analysis...")
results["categories"]["perimeter"] = []

# Check HTTP vs HTTPS redirect
try:
    req = urllib.request.Request(f"http://{d}", headers={"User-Agent": "ReconPro/1.0"})
    resp = urllib.request.urlopen(req, timeout=8)
    code = resp.getcode()
    if code in (301, 302):
        loc = resp.headers.get('Location', '')
        add_finding("HTTP→HTTPS Redirect — Active", "info", "perimeter",
                    f"HTTP redirects to HTTPS: {loc[:80]}", f"Redirect: {loc[:60]}", d)
    elif code == 200:
        add_finding("HTTP Accessible Without Redirect — Risk", "medium", "perimeter",
                    f"HTTP {code} without redirect. Mixed content and downgrade attack risk.",
                    f"HTTP {code} — no redirect", d)
except Exception as e:
    add_finding(f"HTTP Behavior — {str(e)[:60]}", "info", "perimeter", str(e)[:80], "Connection result", d)

# Check www redirect
try:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(f"https://www.{d}", headers={"User-Agent": "ReconPro/1.0"})
    resp = urllib.request.urlopen(req, timeout=8, context=ctx)
    code = resp.getcode()
    if code in (301, 302):
        loc = resp.headers.get('Location', '')
        add_finding(f"www Redirect — Active (→ {loc[:50]})", "info", "perimeter",
                    f"www.{d} redirects to {loc[:80]}", f"www→{loc[:50]}", f"www.{d}")
    elif code == 200:
        add_finding("www Variant — Separate Content", "info", "perimeter",
                    f"www.{d} serves content independently (no redirect). Duplicated content.", f"www {code} OK", f"www.{d}")
except:
    pass

print(f"    Perimeter: {len(results['categories']['perimeter'])} findings")

# ══════════════════════════════════════════════════════════════════
# 13. RISK SCORING
# ══════════════════════════════════════════════════════════════════
print("[*] Category 13/13: Risk Scoring...")
results["categories"]["risk"] = []

# Calculate risk score (0-100, higher = more risk)
score = 0
score += results["severity_counts"].get("critical", 0) * 25
score += results["severity_counts"].get("high", 0) * 15
score += results["severity_counts"].get("medium", 0) * 8
score += results["severity_counts"].get("low", 0) * 3
score = min(score, 100)

risk_level = "Critical" if score >= 75 else "High" if score >= 50 else "Medium" if score >= 25 else "Low"
add_finding(f"Overall Risk Score — {score}/100 ({risk_level})", risk_level.lower(), "risk",
            f"Based on {results['total_findings']} findings across {len(results['categories'])} categories. "
            f"Critical: {results['severity_counts']['critical']}, High: {results['severity_counts']['high']}, "
            f"Medium: {results['severity_counts']['medium']}, Low: {results['severity_counts']['low']}, "
            f"Info: {results['severity_counts']['info']}.",
            f"Score: {score}/100 | {risk_level} risk", d)

# Print summary
print(f"\n{'='*60}")
print(f"  RECONPRO LIVE SCAN RESULTS — {DOMAIN.upper()}")
print(f"  Target: {DOMAIN} ({d})")
print(f"  Scan Time: {results['scan_time']}")
print(f"{'='*60}")
print(f"  TOTAL FINDINGS:  {results['total_findings']}")
print(f"  CRITICAL:        {results['severity_counts']['critical']}")
print(f"  HIGH:            {results['severity_counts']['high']}")
print(f"  MEDIUM:          {results['severity_counts']['medium']}")
print(f"  LOW:             {results['severity_counts']['low']}")
print(f"  INFO:            {results['severity_counts']['info']}")
print(f"  RISK SCORE:      {score}/100 ({risk_level})")
print(f"{'='*60}")

for cat, findings in results["categories"].items():
    if findings:
        print(f"\n  [{cat.upper()}]")
        for f in findings[:5]:
            sev_icon = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢", "info": "🔵"}.get(f["severity"], "⚪")
            print(f"    {sev_icon} [{f['severity'].upper():8s}] {f['title']}")
            print(f"       → {f['evidence'][:100]}")

if results["raw_evidence"]:
    print(f"\n  RAW EVIDENCE:")
    for line in results["raw_evidence"][:15]:
        print(f"    {line}")

# Save results
output_path = "/home/z/my-project/download/reconpro_scan_stripe.json"
with open(output_path, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\n[✓] Full results saved to: {output_path}")
