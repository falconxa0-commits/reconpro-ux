from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set
from ..http import http_probe, Finding


def _follow_redirects(base_url: str, max_hops: int = 15, timeout: int = 8,
                       verify_tls: bool = True) -> List[Dict[str, Any]]:
    """Follow HTTP redirect chains and record each hop."""
    chain = []
    url = base_url
    visited: Set[str] = set()

    for _ in range(max_hops):
        if url in visited:
            break
        visited.add(url)

        resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
        status = resp.get("status", 0)
        headers = resp.get("headers", {})
        location = headers.get("location", "")

        chain.append({
            "url": url,
            "status": status,
            "location": location,
            "headers": {k: v for k, v in headers.items()
                       if k.lower().startswith(("x-", "server", "cf-"))},
        })

        if status not in (301, 302, 303, 307, 308) or not location:
            break

        # Resolve relative URLs
        if location.startswith("/"):
            from urllib.parse import urljoin
            location = urljoin(url, location)
        elif not location.startswith("http"):
            location = urljoin(url, location)
        url = location

    return chain


def _check_ssrf(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    """Check for SSRF via parameter injection."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    ssrf_payloads = [
        {"url": "http://127.0.0.1"},
        {"url": "http://169.254.169.254/latest/meta-data/"},
        {"url": "http://localhost:8080"},
        {"url": "http://[::1]"},
        {"url": "file:///etc/passwd"},
    ]

    ssrf_endpoints = ["/api/fetch", "/api/proxy", "/api/preview",
                     "/api/redirect", "/api/webhook", "/api/url"]

    for endpoint in ssrf_endpoints:
        url = base_url.rstrip("/") + endpoint
        for payload in ssrf_payloads:
            try:
                import urllib.parse
                encoded = urllib.parse.urlencode(payload)
                full_url = f"{url}?{encoded}"
                resp = http_probe(full_url, timeout=timeout, verify_tls=verify_tls)
                body = resp.get("body", "")[:4096]
                status = resp.get("status", 0)

                if status == 200 and len(body) > 20:
                    # Check if internal content leaked
                    internal_sigs = ["ami-id", "instance-id", "root:",
                                    "127.0.0.1", "localhost", "meta-data"]
                    if any(sig in body.lower() for sig in internal_sigs):
                        findings.append(Finding(
                            title=f"SSRF via {endpoint}",
                            severity="critical", category="ssrf",
                            module="chain",
                            description=f"Server-side request forgery: {endpoint} reflects internal content",
                            evidence=f"Payload: {payload['url']}, internal data in response",
                            asset=host, points_deducted=15,
                            remediation="Validate and sanitize all URL inputs. Block internal IP ranges.",
                        ))
                        break
            except Exception:
                pass

    return findings


def _check_open_redirect(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    """Check for open redirect vulnerabilities."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    redirect_endpoints = ["/login", "/auth/login", "/redirect", "/logout",
                         "/api/redirect", "/callback", "/auth/callback"]
    evil_targets = [
        "https://evil-attacker.com",
        "//evil-attacker.com",
        "\\\\evil-attacker.com",
        "https://evil-attacker.com@" + host,
    ]

    for endpoint in redirect_endpoints:
        url = base_url.rstrip("/") + endpoint
        for evil in evil_targets:
            try:
                import urllib.parse
                full_url = f"{url}?next={urllib.parse.quote(evil)}&redirect={urllib.parse.quote(evil)}&url={urllib.parse.quote(evil)}&returnTo={urllib.parse.quote(evil)}"
                resp = http_probe(full_url, timeout=timeout, verify_tls=verify_tls)
                location = resp.get("headers", {}).get("location", "")

                if "evil-attacker" in location:
                    findings.append(Finding(
                        title=f"Open redirect: {endpoint}",
                        severity="high", category="open_redirect",
                        module="chain",
                        description=f"Unvalidated redirect: {endpoint} redirects to attacker-controlled URL",
                        evidence=f"Location: {location}",
                        asset=host, points_deducted=10,
                        remediation="Whitelist allowed redirect destinations.",
                    ))
                    break
            except Exception:
                pass

    return findings


def run_chain(target: str, base_url: str, timeout: int = 8,
              verify_tls: bool = True) -> List[Finding]:
    """SSRF + redirect chain hunting. Returns list of Findings."""
    findings: List[Finding] = []
    host = target.replace("https://", "").replace("http://", "").split("/")[0]

    # Follow redirect chains
    chain = _follow_redirects(base_url, timeout=timeout, verify_tls=verify_tls)
    if len(chain) > 3:
        from ..http import Finding as F
        findings.append(F(
            title=f"Long redirect chain ({len(chain)} hops)",
            severity="medium", category="redirect_chain",
            module="chain",
            description=f"URL redirects through {len(chain)} intermediate hosts — potential data leakage",
            evidence=" -> ".join(f"{h['status']} {h['url'][:60]}" for h in chain[:5]),
            asset=host, points_deducted=5,
            remediation="Minimize redirect chains. Each hop is a potential attack surface.",
        ))

    # Check for redirect to HTTP (TLS downgrade)
    for hop in chain:
        loc = hop.get("location", "")
        if loc.startswith("http://") and base_url.startswith("https://"):
            findings.append(Finding(
                title="TLS downgrade via redirect",
                severity="high", category="redirect_chain",
                module="chain",
                description="HTTPS redirects to HTTP — TLS protection stripped",
                evidence=f"Redirect to: {loc[:80]}",
                asset=host, points_deducted=10,
                remediation="Never redirect from HTTPS to HTTP.",
            ))
            break

    # SSRF checks
    findings.extend(_check_ssrf(base_url, timeout=timeout, verify_tls=verify_tls))

    # Open redirect checks
    findings.extend(_check_open_redirect(base_url, timeout=timeout, verify_tls=verify_tls))

    return findings
