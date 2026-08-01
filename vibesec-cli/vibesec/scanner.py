"""VibeSec Core Scanner — extracted and cleaned from ReconPro.

Standalone security scanner for AI/vibe-coded applications.
Checks 7 vulnerability categories and produces a 100-point score with A+–F grades.
Zero external dependencies (stdlib only for scanning).
"""

from __future__ import annotations

import re
import ssl
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


# ══════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════

VIBESEC_GRADE_MAP: List[Tuple[int, str, str]] = [
    (90, "A+", "bright_green"),
    (80, "A",  "green"),
    (65, "B",  "yellow"),
    (50, "C",  "red"),
    (35, "D",  "bright_red"),
    (0,  "F",  "bold bright_red"),
]

VIBESEC_SENSITIVE_PATHS: List[str] = [
    "/.env", "/.env.local", "/.env.production", "/.env.development",
    "/.git/config", "/.git/HEAD", "/.gitignore",
    "/docker-compose.yml", "/docker-compose.yaml",
    "/config.json", "/config.yaml", "/config.yml",
    "/package.json", "/.npmrc",
    "/vercel.json", "/netlify.toml",
    "/firebase.json", "/firestore.rules",
    "/.vscode/settings.json", "/.idea/workspace.xml",
    # AWS credentials, SSH keys, CI secrets
    "/.aws/credentials", "/.aws/config",
    "/.ssh/id_rsa", "/.ssh/id_ed25519", "/.ssh/authorized_keys",
    "/.github/workflows/secret", "/.gitlab-ci.yml",
    "/travis.yml", "/.circleci/config.yml",
]

VIBESEC_API_PATHS: List[str] = [
    "/api/webhooks", "/api/trpc", "/api/v1/admin", "/api/v1/users",
    "/api/v1/config", "/api/internal", "/api/debug",
    "/api/graphql", "/api/stripe/webhook", "/api/upload",
    "/admin", "/admin/login", "/dashboard",
]

VIBESEC_ANON_KEY_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("supabase", re.compile(r'[\w-]*\.supabase\.co', re.I)),
    ("firebase", re.compile(r'[\w-]*\.firebaseapp\.com', re.I)),
    ("aws-s3", re.compile(r's3\.amazonaws\.com|s3-\w+-\d+\.amazonaws\.com', re.I)),
    ("cloudflare-r2", re.compile(r'[\w-]+\.r2\.cloudflarestorage\.com', re.I)),
    ("vercel-blob", re.compile(r'blob\.vercel-storage\.com', re.I)),
    ("gcp-storage", re.compile(r'storage\.googleapis\.com', re.I)),
    ("azure-blob", re.compile(r'[\w]+\.blob\.core\.windows\.net', re.I)),
]

VIBESEC_DB_ADMIN_PATHS: List[str] = [
    "/phpmyadmin", "/phpmyadmin/", "/adminer", "/adminer.php",
    "/mongo-express", "/mongo-express/", "/_utils",
    "/pgadmin4", "/pgadmin/",
    "/redis-commander", "/redis-insight",
    "/prisma-studio", "/studio.apollo",
    "/graphql-playground", "/altair",
    "/db-browser", "/dbeaver",
]

VIBESEC_S3_LISTING_INDICATORS: List[str] = [
    "ListBucketResult", "<Key>", "<Contents>", "Name</", "Prefix</",
    "<IsTruncated>", "listbucket", "BucketListing",
]

VIBESEC_SECURITY_HEADERS: List[Tuple[str, str, str, int]] = [
    ("strict-transport-security", "HSTS", "high", 8),
    ("content-security-policy", "CSP", "medium", 6),
    ("x-content-type-options", "X-Content-Type-Options", "medium", 4),
    ("referrer-policy", "Referrer-Policy", "low", 3),
    ("permissions-policy", "Permissions-Policy", "low", 2),
]

VIBESEC_STORAGE_EXPOSURE_PATHS: List[str] = [
    "/uploads/", "/static/uploads/", "/media/", "/files/",
    "/public/", "/assets/", "/images/",
]

VIBESEC_AUTH_PATTERN = re.compile(
    r'(?i)(unauthorized|forbidden|401|403|login required|authentication required|"error":.*auth)'
)

# Rate limiter: 1 request per 200ms
_RATE_LIMIT_INTERVAL = 0.2
_last_request_time: float = 0.0


# ══════════════════════════════════════════════════════════════════════════
# DATA CLASS
# ══════════════════════════════════════════════════════════════════════════

@dataclass
class VibeSecResult:
    """Result of a VibeSec scan."""
    score: int
    grade: str
    findings: List[Dict[str, Any]]
    severity_counts: Dict[str, int]
    badge_markdown: str
    categories_checked: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "module": "VIBESEC",
            "vibesec_score": self.score,
            "grade": self.grade,
            "badge_markdown": self.badge_markdown,
            "total_findings": len(self.findings),
            "severity_counts": self.severity_counts,
            "findings": self.findings,
            "categories_checked": self.categories_checked,
            "max_possible_score": 100,
        }


# ══════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════════════════════

def _rate_limit() -> None:
    """Simple rate limiter: enforce minimum interval between requests."""
    global _last_request_time
    now = time.monotonic()
    elapsed = now - _last_request_time
    if elapsed < _RATE_LIMIT_INTERVAL:
        time.sleep(_RATE_LIMIT_INTERVAL - elapsed)
    _last_request_time = time.monotonic()


def http_probe(
    url: str,
    method: str = "GET",
    body: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 5,
) -> Dict[str, Any]:
    """Minimal HTTP probe using stdlib only. Returns response dict."""
    _rate_limit()
    h = {
        "User-Agent": "VibeSec/0.1.0 (Security Scanner; +https://github.com/reconpro-security/vibesec)",
        "Accept": "application/json,text/plain,*/*",
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        ctx = ssl.create_default_context()
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


def _compute_grade(score: int) -> Tuple[str, str]:
    """Map a 0–100 score to a letter grade and rich color name."""
    for threshold, grade, color in VIBESEC_GRADE_MAP:
        if score >= threshold:
            return grade, color
    return "F", "bold bright_red"


def _render_badge(target: str, grade: str, score: int) -> str:
    """Generate a Markdown badge snippet for GitHub READMEs."""
    color_map = {
        "A+": "brightgreen", "A": "green", "B": "yellow",
        "C": "red", "D": "orange", "F": "red",
    }
    badge_color = color_map.get(grade, "lightgrey")
    return (
        f'![VibeSec Grade {grade}]'
        f'(https://img.shields.io/badge/VibeSec-{grade}-{badge_color}'
        f'?style=for-the-badge&labelColor=0B1C2C)'
    )


# ══════════════════════════════════════════════════════════════════════════
# MAIN SCAN FUNCTION
# ══════════════════════════════════════════════════════════════════════════

def scan(target: str, timeout: int = 5, json_output: bool = False) -> VibeSecResult:
    """Run a full VibeSec benchmark scan against *target*.

    Args:
        target:      Domain or URL to scan (e.g. ``"example.com"`` or ``"https://example.com"``).
        timeout:     Per-request timeout in seconds.
        json_output: If ``True``, the return value is JSON-serialisable via ``.to_dict()``.

    Returns:
        A :class:`VibeSecResult` dataclass with score, grade, findings, etc.
    """
    findings: List[Dict[str, Any]] = []
    deductions = 0

    base_url = target if target.startswith("http") else f"https://{target}"
    host = target.replace("https://", "").replace("http://", "").split("/")[0]

    def add(title: str, severity: str, category: str,
            description: str, evidence: str, points_deducted: int) -> None:
        nonlocal deductions
        deductions += points_deducted
        findings.append({
            "title": title, "severity": severity, "category": category,
            "description": description, "evidence": evidence, "asset": host,
            "points_deducted": points_deducted,
        })

    # ── Category 1: Exposed Environment/Config Files ────────────────────
    for path in VIBESEC_SENSITIVE_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:2048]
        if status == 200 and len(body) > 10:
            has_secrets = any(kw in body.lower() for kw in [
                "api_key", "secret", "password", "token", "database_url",
                "private_key", "supabase", "firebase", "aws_access",
            ])
            if has_secrets:
                add(f"Exposed config — {path}", "critical", "exposed_config",
                    f"Sensitive configuration endpoint accessible: {path} (200 OK, {len(body)} bytes, contains secrets)",
                    f"GET {path} → {status} ({len(body)}B, secrets detected)", 15)
            else:
                add(f"Exposed config — {path}", "high", "exposed_config",
                    f"Configuration endpoint accessible: {path} (200 OK, {len(body)} bytes)",
                    f"GET {path} → {status} ({len(body)}B)", 10)
        elif status in (200, 201, 301, 302, 307, 308) and status != 404:
            add(f"Config path accessible — {path}", "medium", "exposed_config",
                f"Endpoint returned {status} (may redirect or serve partial content)",
                f"GET {path} → {status}", 5)

    # ── Category 2: Unauthenticated API/Webhook Routes ──────────────────
    for path in VIBESEC_API_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:2048]
        if status == 200:
            body_lower = body.lower()
            is_protected = any(kw in body_lower for kw in [
                "unauthorized", "401", "forbidden", "authentication required",
                '"error"', "login required",
            ])
            if not is_protected and len(body) > 20:
                add(f"Unauthenticated API — {path}", "high", "unauth_api",
                    f"API route accessible without authentication: {path} (200 OK, {len(body)} bytes)",
                    f"GET {path} → {status} (no auth required)", 10)
            elif status == 200:
                add(f"API route reachable — {path}", "medium", "unauth_api",
                    f"API route returned 200 but may have auth checks in POST/DELETE",
                    f"GET {path} → {status}", 5)
        elif status == 405:
            add(f"API route exists — {path}", "low", "unauth_api",
                f"API route exists (405 Method Not Allowed) — may be exploitable with correct method",
                f"GET {path} → 405", 3)

    # ── Category 3: CORS Policy Analysis ────────────────────────────────
    cors_resp = http_probe(base_url, timeout=timeout)
    cors_headers = cors_resp.get("headers", {})
    acao = cors_headers.get("Access-Control-Allow-Origin", "")
    if acao == "*":
        add("Permissive CORS — wildcard origin", "high", "cors",
            "Access-Control-Allow-Origin: * — any domain can make cross-origin requests",
            f"CORS header: {acao}", 12)
    elif acao and acao != "null":
        reflect_resp = http_probe(base_url, headers={"Origin": "https://evil-attacker.com"}, timeout=timeout)
        reflected = reflect_resp.get("headers", {}).get("Access-Control-Allow-Origin", "")
        if "evil-attacker" in reflected:
            add("CORS origin reflection vulnerability", "critical", "cors",
                "Server reflects any Origin header back — allows cross-origin attacks from any domain",
                f"Sent Origin: https://evil-attacker.com, got back: {reflected}", 15)
    allow_cred = cors_headers.get("Access-Control-Allow-Credentials", "")
    if acao != "" and allow_cred.lower() == "true":
        add("CORS credentials exposed", "high", "cors",
            "Access-Control-Allow-Credentials: true with non-empty Allow-Origin",
            f"Allow-Credentials: true, Allow-Origin: {acao or '(reflected)'}", 10)
    if not acao:
        ct = cors_headers.get("content-type", "")
        if "json" in ct.lower():
            add("JSON API without CORS headers", "low", "cors",
                "API returns JSON but sets no CORS headers — may be intentional or oversight",
                f"Content-Type: {ct}, no CORS headers", 3)

    # ── Category 4: Exposed Anon/Public Backend Keys ────────────────────
    main_body = http_probe(base_url, timeout=timeout).get("body", "")[:16384]
    for name, pattern in VIBESEC_ANON_KEY_PATTERNS:
        matches = pattern.findall(main_body)
        if matches:
            unique = list(set(matches))[:5]
            verified = []
            for m in unique:
                test_url = f"https://{m}" if not m.startswith("http") else m
                probe = http_probe(test_url, timeout=3)
                if probe.get("status", 0) > 0:
                    verified.append(m)
            if verified:
                add(f"Exposed {name} backend — {len(verified)} instance(s)", "critical", "anon_keys",
                    f"Public {name} URLs found in page source and confirmed reachable",
                    f"{name}: {', '.join(verified[:3])}", 15)
            else:
                add(f"Detected {name} references — not verified", "medium", "anon_keys",
                    f"{name} URLs found in page source but could not confirm reachability",
                    f"{name}: {', '.join(unique[:3])}", 5)

    # Also check robots.txt and sitemap for exposed service URLs
    for check_path in ["/robots.txt", "/sitemap.xml"]:
        check_resp = http_probe(base_url.rstrip("/") + check_path, timeout=timeout)
        if check_resp.get("status") == 200:
            check_body = check_resp.get("body", "")[:8192]
            for name, pattern in VIBESEC_ANON_KEY_PATTERNS:
                matches = pattern.findall(check_body)
                if matches and not any(f["title"].startswith(f"Exposed {name}") for f in findings):
                    unique = list(set(matches))[:3]
                    add(f"{name} URLs in {check_path}", "medium", "anon_keys",
                        f"Public {name} URLs exposed in {check_path}",
                        f"{check_path}: {', '.join(unique)}", 5)

    # ── Category 5: Missing Security Headers ────────────────────────────
    root_resp = http_probe(base_url, timeout=timeout)
    root_headers = root_resp.get("headers", {})
    for header_name, display_name, severity, pts in VIBESEC_SECURITY_HEADERS:
        if header_name.lower() not in {k.lower() for k in root_headers}:
            add(f"Missing {display_name} header", severity, "security_headers",
                f"{display_name} ({header_name}) is not set — leaves users vulnerable to specific attacks",
                f"Header {header_name} absent from root response", pts)

    # ── Category 6: Exposed Database Admin Interfaces ───────────────────
    for path in VIBESEC_DB_ADMIN_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:2048]
        if status == 200 and len(body) > 20:
            db_signals = ["phpmyadmin", "adminer", "mongo", "redis", "pgadmin",
                          "prisma", "graphql", "apollo", "database", "mysql", "postgres"]
            body_lower = body.lower()
            is_db = any(sig in body_lower for sig in db_signals)
            is_protected = bool(VIBESEC_AUTH_PATTERN.search(body))
            if is_db and not is_protected:
                add(f"Exposed DB admin — {path}", "critical", "exposed_db",
                    f"Database management interface accessible without auth: {path} (200 OK)",
                    f"GET {path} → 200 (DB admin panel, no auth)", 15)
            elif is_db:
                add(f"DB admin reachable — {path}", "high", "exposed_db",
                    f"Database management interface exists at {path} (may require POST auth)",
                    f"GET {path} → 200 (DB signals detected)", 8)

    # ── Category 7: S3/R2/Cloud Storage Directory Listings ──────────────
    for path in VIBESEC_STORAGE_EXPOSURE_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:4096]
        if status == 200 and len(body) > 50:
            is_listing = any(indicator in body for indicator in VIBESEC_S3_LISTING_INDICATORS)
            is_html_listing = "Index of" in body or "<title>Index of" in body or "Directory listing" in body
            if is_listing or is_html_listing:
                add(f"Storage directory listing — {path}", "critical", "storage_exposure",
                    f"Cloud storage/static directory listing enabled: {path} (200 OK, listing exposed)",
                    f"GET {path} → 200 (directory listing)", 15)
            else:
                add(f"Storage path accessible — {path}", "medium", "storage_exposure",
                    f"Storage path returns 200 but no listing detected: {path}",
                    f"GET {path} → 200 ({len(body)}B)", 3)

    # Check S3/R2 URLs from anon key patterns for listing behavior
    for name, pattern in VIBESEC_ANON_KEY_PATTERNS:
        if name in ("aws-s3", "cloudflare-r2", "gcp-storage", "azure-blob"):
            matches = pattern.findall(main_body)
            for m in list(set(matches))[:3]:
                test_url = f"https://{m}" if not m.startswith("http") else m
                probe = http_probe(test_url, timeout=4)
                pbody = probe.get("body", "")[:4096]
                if probe.get("status") == 200 and any(ind in pbody for ind in VIBESEC_S3_LISTING_INDICATORS):
                    add(f"{name} bucket listing — {m}", "critical", "storage_exposure",
                        f"{name} bucket exposes directory listing: {m}",
                        f"{m} → 200 (bucket listing)", 15)

    # ── Score Calculation ───────────────────────────────────────────────
    raw_score = max(0, 100 - deductions)
    if not findings:
        raw_score = 100
    raw_score = min(100, max(0, raw_score))
    grade, _grade_color = _compute_grade(raw_score)
    badge_md = _render_badge(host, grade, raw_score)

    severity_counts: Dict[str, int] = {}
    for f in findings:
        sev = f["severity"]
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return VibeSecResult(
        score=raw_score,
        grade=grade,
        findings=findings,
        severity_counts=severity_counts,
        badge_markdown=badge_md,
        categories_checked=[
            "exposed_config", "unauth_api", "cors", "anon_keys",
            "security_headers", "exposed_db", "storage_exposure",
        ],
    )
