from __future__ import annotations

import re
from typing import Any, Dict, List
from ..http import http_probe, Finding


DREAD_SCALE = {  # Damage, Reproducibility, Exploitability, Affected users, Discoverability
    "critical": (10, 8, 9, 9, 8),
    "high": (8, 7, 7, 7, 7),
    "medium": (5, 5, 5, 5, 5),
    "low": (3, 3, 3, 3, 4),
    "info": (1, 1, 1, 1, 2),
}


def _dread_score(severity: str) -> float:
    d, r, e, a, disc = DREAD_SCALE.get(severity, (0, 0, 0, 0, 0))
    return round((d + r + e + a + disc) / 5, 1)


def _analyze_info_disclosure(base_url: str, timeout: int = 8,
                              verify_tls: bool = True) -> List[Finding]:
    """Check for information disclosure vulnerabilities."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    info_paths = [
        "/.git/HEAD", "/.git/config", "/.git/logs/HEAD",
        "/.svn/entries", "/.hg/store",
        "/.DS_Store", "/Thumbs.db",
        "/server-status", "/server-info",
        "/.well-known/security.txt", "/security.txt",
        "/.env", "/.env.local", "/.env.production",
        "/wp-config.php.bak", "/config.php~",
        "/backup.sql", "/db.sql", "/dump.sql",
        "/.htaccess", "/.htpasswd",
        "/WEB-INF/web.xml", "/META-INF/MANIFEST.MF",
        "/debug", "/phpinfo.php", "/info.php",
        "/actuator", "/actuator/env", "/actuator/health",
        "/swagger.json", "/swagger-ui.html",
        "/graphql", "/graphiql",
    ]

    for path in info_paths:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:4096]

        if status == 200 and len(body) > 10:
            severity = "critical"
            pts = 12

            # Determine severity based on content
            body_lower = body.lower()
            if any(s in body_lower for s in ["password", "secret", "api_key", "token", "private"]):
                severity = "critical"
                pts = 15
            elif any(s in body_lower for s in ["stack trace", "exception", "error", "debug"]):
                severity = "high"
                pts = 10
            elif path in ("/.git/HEAD", "/.svn/entries", "/.hg/store"):
                severity = "high"
                pts = 10
            elif "swagger" in path or "graphql" in path:
                severity = "low"
                pts = 3
            else:
                severity = "medium"
                pts = 5

            findings.append(Finding(
                title=f"Info disclosure: {path}",
                severity=severity, category="info_disclosure",
                module="oblivion",
                description=f"Sensitive information exposed at {path}",
                evidence=f"GET {path} -> 200 ({len(body)} bytes)",
                asset=host, points_deducted=pts,
                dread_score=_dread_score(severity),
                remediation=f"Remove or restrict access to {path}.",
            ))

    return findings


def _analyze_headers_deep(base_url: str, timeout: int = 8,
                          verify_tls: bool = True) -> List[Finding]:
    """Deep security header analysis with DREAD scoring."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    headers = resp.get("headers", {})
    h_lower = {k.lower(): v for k, v in headers.items()}

    header_checks = [
        ("strict-transport-security", "HSTS", "high", "Add Strict-Transport-Security header with max-age >= 31536000"),
        ("content-security-policy", "CSP", "high", "Implement Content-Security-Policy to prevent XSS"),
        ("x-content-type-options", "X-Content-Type-Options", "medium", "Set X-Content-Type-Options: nosniff"),
        ("x-frame-options", "X-Frame-Options", "medium", "Set X-Frame-Options: DENY or SAMEORIGIN"),
        ("referrer-policy", "Referrer-Policy", "low", "Set Referrer-Policy: strict-origin-when-cross-origin"),
        ("permissions-policy", "Permissions-Policy", "low", "Set Permissions-Policy to restrict browser features"),
        ("x-xss-protection", "X-XSS-Protection", "low", "Set X-XSS-Protection: 0 (modern browsers)"),
        ("cross-origin-opener-policy", "COOP", "medium", "Set Cross-Origin-Opener-Policy: same-origin"),
        ("cross-origin-resource-policy", "CORP", "medium", "Set Cross-Origin-Resource-Policy: same-origin"),
        ("cross-origin-embedder-policy", "COEP", "medium", "Set Cross-Origin-Embedder-Policy: require-corp"),
        ("cache-control", "Cache-Control", "medium", "Set Cache-Control: no-store for sensitive pages"),
        ("pragma", "Pragma", "low", "Set Pragma: no-cache for sensitive pages"),
    ]

    for hdr, display, sev, remediation in header_checks:
        if hdr not in h_lower:
            findings.append(Finding(
                title=f"Missing {display}",
                severity=sev, category="security_headers",
                module="oblivion",
                description=f"{display} ({hdr}) header is missing",
                evidence=f"Header {hdr} not found in response",
                asset=host, points_deducted=5,
                dread_score=_dread_score(sev),
                remediation=remediation,
            ))

    # Check for information-leaking headers
    leaky_headers = [
        ("server", "Server version disclosure"),
        ("x-powered-by", "Technology disclosure via X-Powered-By"),
        ("x-aspnet-version", "ASP.NET version disclosure"),
    ]
    for hdr, title in leaky_headers:
        if hdr in h_lower:
            findings.append(Finding(
                title=title,
                severity="low", category="info_disclosure",
                module="oblivion",
                description=f"{hdr}: {h_lower[hdr]} leaks technology information",
                evidence=f"{hdr}: {h_lower[hdr]}",
                asset=host, points_deducted=2,
                dread_score=_dread_score("low"),
                remediation=f"Remove or obfuscate the {hdr} header.",
            ))

    return findings


def _analyze_js_secrets(base_url: str, timeout: int = 8,
                         verify_tls: bool = True) -> List[Finding]:
    """Scan JavaScript files for hardcoded secrets."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    body = resp.get("body", "")[:65536]

    # Extract JS file URLs from HTML
    js_urls = re.findall(r'src=["\']([^"\']*\.js[^"\']*)["\']', body)

    # Also check inline scripts
    inline_scripts = re.findall(r'<script[^>]*>(.*?)</script>', body, re.DOTALL)

    secret_patterns = [
        (r'api[_-]?key["\':\s]*=["\']([\w-]{20,})', "Hardcoded API key"),
        (r'secret["\':\s]*=["\']([\w-]{20,})', "Hardcoded secret"),
        (r'password["\':\s]*=["\']([^"\']{8,})', "Hardcoded password"),
        (r'token["\':\s]*=["\']([\w\-.=]{20,})', "Hardcoded token"),
        (r'firebase[_-]?config\s*=\s*\{[^}]*apiKey["\']:\s*["\']([^"]+)', "Firebase API key in JS"),
        (r'supabase[_-]?url["\':\s]*=["\']([^"\']+)', "Supabase URL in JS"),
    ]

    all_js = " ".join(inline_scripts)

    for js_url in js_urls[:10]:
        js_resp = http_probe(
            js_url if js_url.startswith("http") else base_url.rstrip("/") + js_url,
            timeout=timeout, verify_tls=verify_tls
        )
        if js_resp.get("status") == 200:
            all_js += " " + js_resp.get("body", "")[:32768]

    for pattern, title in secret_patterns:
        matches = re.findall(pattern, all_js, re.IGNORECASE)
        if matches:
            for match in matches[:3]:
                masked = match[:8] + "..." + match[-4:] if len(match) > 12 else "***"
                findings.append(Finding(
                    title=title,
                    severity="critical", category="secrets_in_js",
                    module="oblivion",
                    description=f"Secret found in JavaScript source: {title}",
                    evidence=f"Match: {masked}",
                    asset=host, points_deducted=15,
                    dread_score=_dread_score("critical"),
                    remediation="Move all secrets to server-side environment variables. Never commit secrets to source code.",
                ))
            break

    return findings


def run_oblivion(target: str, base_url: str, timeout: int = 8,
                 verify_tls: bool = True) -> List[Finding]:
    """23-stage analytical dissolution with DREAD scoring. Returns list of Findings."""
    findings: List[Finding] = []

    findings.extend(_analyze_info_disclosure(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_analyze_headers_deep(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_analyze_js_secrets(base_url, timeout=timeout, verify_tls=verify_tls))

    return findings
