"""Subdomain discovery using public OSINT sources.

Uses certificate transparency logs and public APIs to discover subdomains.
No API keys required for basic discovery.
"""
from __future__ import annotations

import json
import ssl
import re
import urllib.request
from typing import List, Optional

from .http import http_probe, Finding


def discover_ctlogs(domain: str, timeout: int = 15) -> List[str]:
    """Discover subdomains via crt.sh (certificate transparency)."""
    try:
        url = f"https://crt.sh/?q=%.{domain}&output=json"
        ctx = ssl.create_default_context()
        req = urllib.request.Request(url, headers={"User-Agent": "ReconPro/4.0"})
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            data = json.loads(resp.read(65536).decode())
    except Exception:
        return []

    subdomains = set()
    for entry in data:
        name = entry.get("name_value", "")
        for n in name.split("\n"):
            n = n.strip().lstrip("*.")
            if n and n.endswith(domain) and n != domain:
                subdomains.add(n)

    return sorted(subdomains)


def discover_dns(domain: str, timeout: int = 5) -> List[str]:
    """Try common subdomain prefixes via DNS resolution."""
    import socket

    common_prefixes = [
        "www", "api", "app", "admin", "portal", "dev", "staging",
        "test", "qa", "prod", "cdn", "static", "assets", "media",
        "mail", "smtp", "pop", "imap", "ftp", "sftp", "ssh",
        "vpn", "remote", "gateway", "proxy", "lb", "load",
        "db", "database", "redis", "elastic", "mongo", "mysql",
        "git", "github", "gitlab", "ci", "jenkins", "build",
        "grafana", "prometheus", "kibana", "monitor", "status",
        "auth", "login", "sso", "oauth", "identity", "keycloak",
        "blog", "docs", "wiki", "help", "support", "chat",
        "webhook", "hooks", "api-v2", "v2", "v3", "internal",
        "sandbox", "demo", "preview", "next", "new", "old",
        "backup", "staging-api", "dev-api", "test-api",
    ]

    found = []
    for prefix in common_prefixes:
        sub = f"{prefix}.{domain}"
        try:
            socket.getaddrinfo(sub, None, socket.AF_INET)
            found.append(sub)
        except (socket.gaierror, OSError):
            pass

    return found


def discover_subdomains(domain: str, use_dns: bool = True, use_ct: bool = True) -> List[str]:
    """Discover subdomains using all available methods."""
    all_subs = set()

    if use_ct:
        ct_subs = discover_ctlogs(domain)
        all_subs.update(ct_subs)

    if use_dns:
        dns_subs = discover_dns(domain)
        all_subs.update(dns_subs)

    return sorted(all_subs)
