"""10-Second Micro-Scan Engine — fast subset of the VibeSec scanner.

Only 7 checks (5 paths + CORS + headers) designed to complete in <10s
using concurrent HTTP with 3-second per-request timeouts.
"""

from __future__ import annotations

import logging
import re
import ssl
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple

from bot.config import BotConfig

logger = logging.getLogger("vibesec_roast.scanner")

# ── Grade map (same as full VibeSec) ─────────────────────────────────────
GRADE_MAP: List[Tuple[int, str]] = [
    (90, "A+"),
    (80, "A"),
    (65, "B"),
    (50, "C"),
    (35, "D"),
    (0, "F"),
]

# Auth indicators in response body
_AUTH_PATTERN = re.compile(
    r"(?i)(unauthorized|forbidden|401|403|login required|authentication required|\"error\":.*auth)"
)

# Storage listing indicators
_LISTING_INDICATORS = [
    "ListBucketResult", "<Key>", "<Contents>", "Name</",
    "Index of", "<title>Index of", "Directory listing",
]


def _compute_grade(score: int) -> str:
    """Map 0-100 score to letter grade."""
    for threshold, grade in GRADE_MAP:
        if score >= threshold:
            return grade
    return "F"


def _http_probe(
    url: str,
    headers: Dict[str, str] | None = None,
    timeout: int = 3,
) -> Dict[str, Any]:
    """Single HTTP GET probe using stdlib only."""
    h = {
        "User-Agent": "VibeSec-Roast/0.1 (Security Scanner)",
        "Accept": "application/json,text/plain,*/*",
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, method="GET", headers=h)
    try:
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read(8192)
            return {
                "ok": True,
                "status": resp.status,
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
            "ok": False,
            "status": e.code,
            "headers": dict(e.headers.items()) if e.headers else {},
            "body": body_str,
        }
    except Exception as e:
        return {"ok": False, "status": 0, "headers": {}, "body": "", "reason": str(e)}


def _check_path(base_url: str, path: str, config: BotConfig) -> Dict[str, Any]:
    """Check a single path. Returns a finding dict or None."""
    url = base_url.rstrip("/") + path
    resp = _http_probe(url, timeout=3)
    status = resp.get("status", 0)
    body = resp.get("body", "")[:2048]

    if path == "/.env":
        if status == 200 and len(body) > 10:
            has_secrets = any(
                kw in body.lower()
                for kw in ["api_key", "secret", "password", "token", "database_url"]
            )
            return {"path": path, "found": True, "severity": "critical" if has_secrets else "high"}
        return {"path": path, "found": False}

    # Unauth API paths: /api/webhooks, /dashboard, /admin
    if path in ("/api/webhooks", "/dashboard", "/admin"):
        if status == 200 and len(body) > 20:
            is_protected = bool(_AUTH_PATTERN.search(body))
            if not is_protected:
                return {"path": path, "found": True, "severity": "high", "body_len": len(body)}
            return {"path": path, "found": False}
        return {"path": path, "found": False}

    # Storage: /uploads/
    if path == "/uploads/":
        if status == 200 and len(body) > 50:
            is_listing = any(ind in body for ind in _LISTING_INDICATORS)
            if is_listing:
                return {"path": path, "found": True, "severity": "critical"}
        return {"path": path, "found": False}

    return {"path": path, "found": False}


def _check_cors(base_url: str) -> bool:
    """Test CORS origin reflection. Returns True if vulnerable (wildcard or reflection)."""
    resp = _http_probe(base_url, headers={"Origin": "https://evil-attacker.com"}, timeout=3)
    acao = resp.get("headers", {}).get("Access-Control-Allow-Origin", "")
    if acao == "*":
        return True
    if "evil-attacker" in acao:
        return True
    return False


def _check_security_headers(base_url: str, config: BotConfig) -> List[str]:
    """Check for missing security headers. Returns list of missing header names."""
    resp = _http_probe(base_url, timeout=3)
    resp_headers = resp.get("headers", {})
    lower_keys = {k.lower() for k in resp_headers}
    missing = []
    for header_name, display_name, _pts in config.MICRO_SCAN_HEADERS_TO_CHECK:
        if header_name.lower() not in lower_keys:
            missing.append(display_name)
    return missing


def micro_scan(target: str, config: BotConfig | None = None) -> Dict[str, Any]:
    """Run a 7-check micro-scan against *target*. Completes in <10 seconds.

    Returns::
        {
            "score": int,       # 0-100
            "grade": str,       # A+ to F
            "findings": list,
            "roast_material": {
                "has_env": bool,
                "unauth_apis": list[str],
                "cors_wildcard": bool,
                "missing_headers": list[str],
                "storage_exposed": bool,
            }
        }
    """
    if config is None:
        config = BotConfig()

    base_url = target if target.startswith("http") else f"https://{target}"
    host = target.replace("https://", "").replace("http://", "").split("/")[0]
    start = time.monotonic()

    findings: List[Dict[str, Any]] = []
    deductions = 0

    # ── Concurrent path checks (5 paths) ────────────────────────────────
    path_results: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(_check_path, base_url, path, config): path
            for path in config.MICRO_SCAN_PATHS
        }
        for future in as_completed(futures, timeout=8):
            try:
                path_results.append(future.result())
            except Exception as exc:
                logger.debug("Path check failed: %s", exc)

    # ── Concurrent CORS + headers check ────────────────────────────────
    with ThreadPoolExecutor(max_workers=2) as executor:
        cors_future = executor.submit(_check_cors, base_url)
        headers_future = executor.submit(_check_security_headers, base_url, config)
        try:
            cors_wildcard = cors_future.result(timeout=5)
        except Exception:
            cors_wildcard = False
        try:
            missing_headers = headers_future.result(timeout=5)
        except Exception:
            missing_headers = []

    # ── Process path results ────────────────────────────────────────────
    has_env = False
    unauth_apis: List[str] = []
    storage_exposed = False

    for pr in path_results:
        if pr.get("found"):
            path = pr["path"]
            sev = pr.get("severity", "high")
            if path == "/.env":
                has_env = True
                pts = 15 if sev == "critical" else 10
                deductions += pts
                findings.append({
                    "title": f"Exposed .env file",
                    "severity": sev,
                    "category": "exposed_config",
                    "description": f".env file is publicly accessible ({sev})",
                    "evidence": f"GET /.env -> 200 OK",
                    "points_deducted": pts,
                })
            elif path in ("/api/webhooks", "/dashboard", "/admin"):
                unauth_apis.append(path)
                deductions += 10
                findings.append({
                    "title": f"Unauthenticated API — {path}",
                    "severity": "high",
                    "category": "unauth_api",
                    "description": f"{path} accessible without authentication (200 OK)",
                    "evidence": f"GET {path} -> 200 (no auth required)",
                    "points_deducted": 10,
                })
            elif path == "/uploads/":
                storage_exposed = True
                deductions += 15
                findings.append({
                    "title": "Storage directory listing — /uploads/",
                    "severity": "critical",
                    "category": "storage_exposure",
                    "description": "Uploads folder has directory listing enabled",
                    "evidence": "GET /uploads/ -> 200 (listing)",
                    "points_deducted": 15,
                })

    # ── CORS finding ────────────────────────────────────────────────────
    if cors_wildcard:
        deductions += 12
        findings.append({
            "title": "Permissive CORS — origin reflection/wildcard",
            "severity": "high",
            "category": "cors",
            "description": "Server reflects any Origin or uses wildcard CORS policy",
            "evidence": "Sent Origin: https://evil-attacker.com -> reflected",
            "points_deducted": 12,
        })

    # ── Missing headers ─────────────────────────────────────────────────
    for hdr_name in missing_headers:
        pts = 8 if hdr_name == "HSTS" else 6
        deductions += pts
        findings.append({
            "title": f"Missing {hdr_name} header",
            "severity": "high" if hdr_name == "HSTS" else "medium",
            "category": "security_headers",
            "description": f"{hdr_name} header not set",
            "evidence": f"Header {hdr_name} absent",
            "points_deducted": pts,
        })

    # ── Score ───────────────────────────────────────────────────────────
    raw_score = max(0, 100 - deductions)
    if not findings:
        raw_score = 100
    raw_score = min(100, max(0, raw_score))
    grade = _compute_grade(raw_score)
    elapsed = time.monotonic() - start

    logger.info("Micro-scan %s: score=%d grade=%s findings=%d time=%.1fs",
                host, raw_score, grade, len(findings), elapsed)

    return {
        "score": raw_score,
        "grade": grade,
        "findings": findings,
        "scan_time_seconds": round(elapsed, 2),
        "target": host,
        "roast_material": {
            "has_env": has_env,
            "unauth_apis": unauth_apis,
            "cors_wildcard": cors_wildcard,
            "missing_headers": missing_headers,
            "storage_exposed": storage_exposed,
        },
    }
