"""Module: RECON — 13-category surface reconnaissance.

Checks:
  1. DNS resolution (A, AAAA, CNAME, MX, NS, TXT)
  2. HTTP headers analysis (security headers)
  3. Technology fingerprinting
  4. robots.txt / sitemap.xml
  5. TLS/SSL certificate info
  6. Open ports (top 20)
  7. Sensitive path exposure (.env, .git, configs)
  8. API endpoint discovery
  9. CORS policy analysis
 10. Cookie security flags
 11. Redirect chain analysis
 12. WAF detection
 13. Email / SPF / DMARC
"""
from __future__ import annotations

import re
import socket
import ssl
from typing import Any, Dict, List, Optional
from ..http import http_probe, Finding, default_limiter


SENSITIVE_PATHS = [
    "/.env", "/.env.local", "/.env.production",
    "/.git/config", "/.git/HEAD", "/.gitignore",
    "/docker-compose.yml", "/config.json", "/config.yaml",
    "/package.json", "/.npmrc", "/vercel.json", "/netlify.toml",
    "/.aws/credentials", "/.ssh/id_rsa",
    "/.github/workflows/secret", "/.gitlab-ci.yml",
]

API_PATHS = [
    "/api/webhooks", "/api/trpc", "/api/v1/admin", "/api/v1/users",
    "/api/v1/config", "/api/internal", "/api/debug",
    "/api/graphql", "/api/upload", "/admin", "/dashboard",
]

SECURITY_HEADERS = [
    ("strict-transport-security", "HSTS", "high", 8),
    ("content-security-policy", "CSP", "medium", 6),
    ("x-content-type-options", "X-Content-Type-Options", "medium", 4),
    ("x-frame-options", "X-Frame-Options", "medium", 5),
    ("referrer-policy", "Referrer-Policy", "low", 3),
    ("permissions-policy", "Permissions-Policy", "low", 2),
]

WAF_SIGNATURES = [
    ("Cloudflare", ["cf-ray", "__cfduid", "cloudflare"]),
    ("AWS WAF", ["awselb", "x-amzn-requestid"]),
    ("Akamai", ["akamai", "x-akamai"]),
    ("Sucuri", ["sucuri", "x-sucuri-id"]),
    ("Imperva", ["x-iinfo", "incap_ses_"]),
]

TOP_PORTS = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587,
             993, 995, 1433, 3306, 5432, 8080, 8443, 8888, 9090, 27017]

TECH_SIGNATURES = [
    ("Next.js", ["_next/", "__next", "x-nextjs"]),
    ("React", ["react", "__react"]),
    ("WordPress", ["wp-content", "wp-includes", "wordpress"]),
    ("Laravel", ["laravel_session", "x-laravel"]),
    ("Django", ["csrfmiddlewaretoken", "django"]),
    ("Express", ["x-powered-by: express"]),
    ("Nginx", ["nginx"]),
    ("Apache", ["apache", "mod_"]),
    ("Vercel", ["vercel", "x-vercel"]),
    ("Cloudflare", ["cloudflare"]),
    ("Supabase", ["supabase"]),
    ("Firebase", ["firebaseapp", "firebase"]),
]


def _dns_lookup(host: str) -> Dict[str, Any]:
    result = {"a": [], "aaaa": [], "cname": [], "mx": [], "ns": [], "txt": []}
    for qtype, attr in [("A", "a"), ("AAAA", "aaaa"), ("CNAME", "cname"),
                         ("MX", "mx"), ("NS", "ns"), ("TXT", "txt")]:
        try:
            answers = socket.getaddrinfo(host, None, socket.AF_UNSPEC,
                                          socket.SOCK_STREAM)
            seen = set()
            for fam, _, _, _, sockaddr in answers:
                ip = sockaddr[0]
                if ip not in seen:
                    seen.add(ip)
                    if ":" in ip:
                        result["aaaa"].append(ip)
                    else:
                        result["a"].append(ip)
        except Exception:
            pass
    return result


def _check_ports(host: str, timeout: float = 1.0) -> List[Dict[str, Any]]:
    open_ports = []
    for port in TOP_PORTS:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            if s.connect_ex((host, port)) == 0:
                open_ports.append({"port": port, "state": "open"})
            s.close()
        except Exception:
            pass
    return open_ports


def _check_tls(host: str) -> Dict[str, Any]:
    info = {"version": None, "issuer": None, "expiry": None, "days_left": None}
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as s:
                cert = s.getpeercert()
                info["version"] = s.version()
                if cert:
                    for rdn in cert.get("issuer", ()): 
                        for k, v in rdn:
                            if k == "organizationName":
                                info["issuer"] = v
                    not_after = cert.get("notAfter")
                    if not_after:
                        from datetime import datetime
                        exp = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                        info["expiry"] = exp.isoformat()
                        info["days_left"] = (exp - datetime.utcnow()).days
    except Exception:
        pass
    return info


def _detect_tech(body: str, headers: Dict[str, str]) -> List[str]:
    found = []
    haystack = (body + " " + " ".join(headers.values())).lower()
    for name, sigs in TECH_SIGNATURES:
        if any(s.lower() in haystack for s in sigs):
            found.append(name)
    return found


def _detect_waf(headers: Dict[str, str], body: str) -> List[str]:
    found = []
    haystack = (" ".join(headers.keys()) + " " +
                " ".join(headers.values()) + " " + body[:4096]).lower()
    for name, sigs in WAF_SIGNATURES:
        if any(s.lower() in haystack for s in sigs):
            found.append(name)
    return found


def _check_cors(base_url: str) -> List[Finding]:
    findings = []
    resp = http_probe(base_url)
    h = resp.get("headers", {})
    acao = h.get("Access-Control-Allow-Origin", "")

    if acao == "*":
        findings.append(Finding(
            title="Permissive CORS (wildcard origin)",
            severity="high", category="cors", module="recon",
            description="Access-Control-Allow-Origin: * — any domain can make cross-origin requests",
            evidence=f"CORS: {acao}", asset="",
    ))
    elif acao:
        probe = http_probe(base_url, headers={"Origin": "https://evil-attacker.com"})
        reflected = probe.get("headers", {}).get("Access-Control-Allow-Origin", "")
        if "evil-attacker" in reflected:
            findings.append(Finding(
                title="CORS origin reflection",
                severity="critical", category="cors", module="recon",
                description="Server reflects any Origin header back",
                evidence=f"Sent Origin: evil-attacker.com, got: {reflected}", asset="",
    ))
    return findings


def _check_cookies(headers: Dict[str, str]) -> List[Finding]:
    findings = []
    set_cookie = headers.get("set-cookie", "")
    if not set_cookie:
        return findings
    for cookie in set_cookie.split(","):
        name = cookie.split("=")[0].strip()
        cookie_lower = cookie.lower()
    
    if "httponly" not in cookie_lower and name:
        findings.append(Finding(
        title=f"Missing HttpOnly on cookie: {name[:40]}",
        severity="medium", category="cookies", module="recon",
        description=f"Cookie '{name}' lacks HttpOnly flag — vulnerable to XSS theft",
        evidence=f"Cookie: {cookie[:80]}", asset="",
    ))
    if "secure" not in cookie_lower and name:
        findings.append(Finding(
        title=f"Missing Secure flag on cookie: {name[:40]}",
        severity="medium", category="cookies", module="recon",
        description=f"Cookie '{name}' lacks Secure flag — sent over HTTP",
        evidence=f"Cookie: {cookie[:80]}", asset="",
    ))
    if "samesite" not in cookie_lower and name:
        findings.append(Finding(
        title=f"Missing SameSite on cookie: {name[:40]}",
        severity="low", category="cookies", module="recon",
        description=f"Cookie '{name}' lacks SameSite attribute — CSRF risk",
        evidence=f"Cookie: {cookie[:80]}", asset="",
    ))
    return findings


def run_recon(target: str, base_url: str, timeout: int = 8,
              verify_tls: bool = True) -> List[Finding]:
    """Run full 13-category reconnaissance. Returns list of Findings."""
    findings: List[Finding] = []
    host = target.replace("https://", "").replace("http://", "").split("/")[0]

    def add(title, severity, category, desc, evidence, pts=0):
        findings.append(Finding(
            title=title, severity=severity, category=category,
            module="recon", description=desc, evidence=evidence,
            asset=host, points_deducted=pts,
    ))

    # 1. DNS
    dns = _dns_lookup(host)
    if not dns["a"] and not dns["aaaa"]:
        add("DNS resolution failed", "critical", "dns",
            f"No A or AAAA records found for {host}", "DNS lookup: no results")

    # 2. Security headers
    root = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    root_h = root.get("headers", {})
    for hdr, display, sev, pts in SECURITY_HEADERS:
        if hdr.lower() not in {k.lower() for k in root_h}:
            add(f"Missing {display} header", sev, "security_headers",
                f"{display} ({hdr}) not set", f"Header {hdr} absent", pts)

    # 3. Tech fingerprinting
    body = root.get("body", "")[:16384]
    tech = _detect_tech(body, root_h)

    # 4. robots.txt / sitemap.xml
    for path in ["/robots.txt", "/sitemap.xml"]:
        resp = http_probe(base_url.rstrip("/") + path, timeout=timeout, verify_tls=verify_tls)
        if resp.get("status") == 200:
            add(f"{path} accessible", "info", "discovery",
                f"{path} is publicly accessible ({len(resp.get('body', ''))} bytes)",
                f"GET {path} -> 200", 0)

    # 5. TLS
    tls = _check_tls(host)
    if tls.get("days_left") is not None and tls["days_left"] < 30:
        add(f"TLS cert expiring in {tls['days_left']} days", "high", "tls",
            f"Certificate expires {tls['expiry']}",
            f"Days left: {tls['days_left']}", 8)
    if tls.get("version") and "3.0" in tls["version"]:
        add("Deprecated TLS version", "critical", "tls",
            f"Server uses {tls['version']}", f"TLS: {tls['version']}", 12)

    # 6. Port scan (top 20)
    open_p = _check_ports(host)
    for p in open_p:
        if p["port"] not in (80, 443):
            add(f"Open port: {p['port']}", "medium", "ports",
                f"Port {p['port']} is open", f"Port {p['port']}: open", 3)

    # 6b. ASN lookup
    try:
        import subprocess
        whois_result = subprocess.run(
            ["whois", host],
            capture_output=True, text=True, timeout=10
        )
        whois_text = whois_result.stdout
        asn_match = re.search(r'(?:ASN|AS)(?:\t|[ :]+)(\d+)', whois_text, re.IGNORECASE)
        org_match = re.search(r'(?:OrgName|Organization|org-name)[:\s]+(.+)', whois_text, re.IGNORECASE)
        if asn_match:
            asn = asn_match.group(1)
            org = org_match.group(1).strip()[:80] if org_match else "Unknown"
            add(f"ASN: AS{asn} ({org})", "info", "asn",
                f"Hosted on AS{asn}, operated by {org}",
                f"ASN: AS{asn}, Org: {org[:50]}", 0)
        elif org_match:
            add(f"Hosting: {org_match.group(1).strip()[:60]}", "info", "asn",
                f"Operated by: {org_match.group(1).strip()[:80]}",
                f"Org: {org_match.group(1).strip()[:50]}", 0)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # 7. Sensitive paths
    for path in SENSITIVE_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
        if resp.get("status") == 200 and len(resp.get("body", "")) > 10:
            add(f"Exposed: {path}", "high", "exposed_files",
                f"Sensitive path accessible: {path}", f"GET {path} -> 200", 10)

    # 8. API endpoints
    for path in API_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
        if resp.get("status") == 200:
            b = resp.get("body", "").lower()
            if not any(kw in b for kw in ["unauthorized", "401", "forbidden", "login required"]):
                add(f"Unauthenticated API: {path}", "high", "api",
                    f"API route accessible without auth", f"GET {path} -> 200", 10)

    # 9. CORS
    findings.extend(_check_cors(base_url))

    # 10. Cookies
    findings.extend(_check_cookies(root_h))

    # 11. WAF detection
    waf = _detect_waf(root_h, body)
    if not waf:
        add("No WAF detected", "medium", "waf",
            "No Web Application Firewall signatures found", "No WAF headers/signatures", 4)

    # 12. Redirect chain
    if root.get("status") in (301, 302, 307, 308):
        loc = root_h.get("location", "")
        add(f"Redirect: {root['status']} -> {loc[:80]}", "info", "redirects",
            f"Root URL redirects to {loc}", f"Status {root['status']}", 0)

    # 13. Email / SPF / DMARC
    try:
        import subprocess
        for qtype in ["TXT", "MX"]:
            try:
                result = subprocess.run(
                    ["dig", "+short", host, qtype],
                    capture_output=True, text=True, timeout=5
                )
                output = result.stdout.strip()
                if qtype == "MX" and output:
                    mx_records = [l.strip() for l in output.split("\n") if l.strip()]
                    add(f"MX records found ({len(mx_records)})", "info", "email",
                        f"Mail servers: {'; '.join(mx_records[:5])}",
                        f"MX: {'; '.join(mx_records[:3])}", 0)
                elif qtype == "TXT" and output:
                    lines = output.split("\n")
                    has_spf = any('v=spf1' in l.lower() for l in lines)
                    has_dmarc = False
                    for l in lines:
                        if 'v=dmarc1' in l.lower():
                            has_dmarc = True
                    if not has_spf:
                        add("Missing SPF record", "medium", "email",
                            "No SPF (Sender Policy Framework) TXT record found — email spoofing possible",
                            "dig TXT: no v=spf1", 5)
                    if not has_dmarc:
                        # Check _dmarc subdomain
                        try:
                            dmarc_result = subprocess.run(
                                ["dig", "+short", f"_dmarc.{host}", "TXT"],
                                capture_output=True, text=True, timeout=5
                            )
                            if 'v=dmarc1' not in dmarc_result.stdout.lower():
                                add("Missing DMARC record", "medium", "email",
                                    "No DMARC record found — no email authentication policy",
                                    "dig _dmarc TXT: no v=dmarc1", 5)
                        except Exception:
                            add("Missing DMARC record", "medium", "email",
                                "Could not check DMARC record",
                                "DMARC check failed", 3)
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass
    except Exception:
        pass

    return findings
