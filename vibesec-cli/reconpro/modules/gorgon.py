from __future__ import annotations

import json
import re
import urllib.parse
from typing import Any, Dict, List
from ..http import http_probe, Finding


GORGON_PAYLOADS = {
    "sqli": [
        ("' OR '1'='1", "SQL injection: single-quote OR"),
        ("' UNION SELECT NULL--", "SQL injection: UNION SELECT"),
        ("1; DROP TABLE users--", "SQL injection: stacked query"),
        ("' AND 1=1--", "SQL injection: boolean blind"),
        ("admin'--", "SQL injection: auth bypass"),
    ],
    "xss": [
        ('<script>alert(1)</script>', "XSS: reflected script tag"),
        ('" onerror="alert(1)', "XSS: event handler injection"),
        ('<img src=x onerror=alert(1)>', "XSS: img onerror"),
        ('<svg onload=alert(1)>', "XSS: svg onload"),
        ('javascript:alert(1)', "XSS: javascript URI"),
    ],
    "path_traversal": [
        ('../../../etc/passwd', "Path traversal: etc/passwd"),
        ('..\\..\\..\\windows\\win.ini', "Path traversal: win.ini"),
        ('....//....//....//etc/passwd', "Path traversal: double-encoding"),
        ('/proc/self/environ', "Path traversal: proc/environ"),
        ('file:///etc/passwd', "Path traversal: file:// protocol"),
    ],
}


def _test_injection_points(base_url: str, timeout: int = 8,
                            verify_tls: bool = True) -> List[Finding]:
    """Test common injection points with GORGON payloads."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    inject_endpoints = [
        "/api/v1/users?search=", "/api/search?q=",
        "/api/v1/items?id=", "/api/query?filter=",
        "/api/lookup?domain=", "/?q=", "/search?q=",
        "/api/v1/login", "/api/auth/login",
    ]

    for endpoint in inject_endpoints:
        for category, payloads in GORGON_PAYLOADS.items():
            for payload, description in payloads:
                url = base_url.rstrip("/") + endpoint + urllib.parse.quote(payload)
                resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
                status = resp.get("status", 0)
                body = resp.get("body", "")[:4096]

                # Error-based detection
                error_sigs = {
                    "sqli": ["sql syntax", "mysql", "postgresql", "sqlite",
                             "ora-", "microsoft ole DB", "sqlserver", "odbc"],
                    "path_traversal": ["root:", "/bin/bash", "[boot loader]",
                                      "[extensions]", "[font]"],
                }

                if category in error_sigs:
                    for sig in error_sigs[category]:
                        if sig.lower() in body.lower():
                            findings.append(Finding(
                                title=f"{description}",
                                severity="critical", category=category,
                                module="gorgon",
                                description=f"Error-based {category} confirmed at {endpoint}",
                                evidence=f"Payload: {payload[:50]}, signature: {sig}",
                                asset=host, points_deducted=15,
                                remediation=f"Use parameterized queries/inputs. Sanitize all user input for {category}.",
                            ))
                            break

                # XSS reflection detection
                if category == "xss" and payload in body:
                    findings.append(Finding(
                        title=f"{description}",
                        severity="high", category="xss",
                        module="gorgon",
                        description=f"XSS payload reflected in response at {endpoint}",
                        evidence=f"Payload: {payload[:50]} found in response",
                        asset=host, points_deducted=12,
                        remediation="Encode all user input before rendering. Implement CSP headers.",
                    ))
                    break

    return findings


def _test_http_methods(base_url: str, timeout: int = 8,
                        verify_tls: bool = True) -> List[Finding]:
    """Test for unsafe HTTP methods."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    paths = ["/", "/api/v1/users", "/admin", "/api/v1/config"]
    unsafe_methods = ["PUT", "DELETE", "PATCH", "TRACE"]

    for path in paths:
        for method in unsafe_methods:
            resp = http_probe(base_url.rstrip("/") + path, method=method,
                             timeout=timeout, verify_tls=verify_tls)
            status = resp.get("status", 0)
            body = resp.get("body", "")[:2048]

            if method == "TRACE" and status == 200:
                findings.append(Finding(
                    title=f"TRACE method enabled: {path}",
                    severity="high", category="http_methods",
                    module="gorgon",
                    description="HTTP TRACE method is enabled — XST attack possible",
                    evidence=f"TRACE {path} -> 200",
                    asset=host, points_deducted=8,
                    remediation="Disable TRACE method on the server.",
                ))
                break

            if status in (200, 201, 204) and method in ("PUT", "DELETE", "PATCH"):
                findings.append(Finding(
                    title=f"{method} allowed: {path}",
                    severity="medium" if method == "PATCH" else "high",
                    category="http_methods",
                    module="gorgon",
                    description=f"{method} method succeeds on {path}",
                    evidence=f"{method} {path} -> {status}",
                    asset=host, points_deducted=8,
                    remediation="Restrict HTTP methods to only those needed.",
                ))

    return findings


def _test_content_type_sniff(base_url: str, timeout: int = 8,
                              verify_tls: bool = True) -> List[Finding]:
    """Test for content-type sniffing / MIME confusion."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    paths = ["/api/v1/users", "/api/upload", "/upload"]
    for path in paths:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, method="POST", body=b'{"test": true}',
                         headers={"Content-Type": "application/json"},
                         timeout=timeout, verify_tls=verify_tls)
        ct = resp.get("headers", {}).get("content-type", "")

        if resp.get("status") == 200 and "json" not in ct.lower() and len(resp.get("body", "")) > 20:
            findings.append(Finding(
                title=f"Content-type mismatch: {path}",
                severity="medium", category="content_type",
                module="gorgon",
                description=f"API endpoint returned non-JSON content-type: {ct}",
                evidence=f"Content-Type: {ct}",
                asset=host, points_deducted=4,
                remediation="Always set explicit Content-Type headers.",
            ))

    return findings


def run_gorgon(target: str, base_url: str, timeout: int = 8,
                verify_tls: bool = True) -> List[Finding]:
    """15-stage AI red team. Returns list of Findings."""
    findings: List[Finding] = []

    findings.extend(_test_injection_points(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_test_http_methods(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_test_content_type_sniff(base_url, timeout=timeout, verify_tls=verify_tls))

    return findings
