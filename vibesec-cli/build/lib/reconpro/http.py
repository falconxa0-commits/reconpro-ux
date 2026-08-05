"""Shared HTTP layer used by all ReconPro modules.

Thread-safe rate limiter, hardened probe, TLS config.
"""

from __future__ import annotations

import ssl
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from threading import Lock


# ── Rate Limiter ────────────────────────────────────────────────────────

class RateLimiter:
    """Token-bucket rate limiter. Default: 10 req/s."""

    def __init__(self, max_per_second: float = 10.0) -> None:
        self._min_interval = 1.0 / max_per_second
        self._lock = Lock()
        self._last = 0.0

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last
            if elapsed < self._min_interval:
                time.sleep(self._min_interval - elapsed)
            self._last = time.monotonic()


default_limiter = RateLimiter(max_per_second=10.0)


# ── HTTP Probe ──────────────────────────────────────────────────────────

UA = (
    "ReconPro/2.0 (Enterprise Security Scanner; "
    "+https://github.com/reconpro-security/reconpro)"
)


def http_probe(
    url: str,
    method: str = "GET",
    body: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 8,
    verify_tls: bool = True,
    limiter: Optional[RateLimiter] = None,
) -> Dict[str, Any]:
    """Hardened HTTP probe. All modules delegate through this.

    Returns dict with keys: ok, status, reason, headers, body.
    """
    if limiter:
        limiter.acquire()

    h = {
        "User-Agent": UA,
        "Accept": "application/json,text/html,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if headers:
        h.update(headers)

    req = urllib.request.Request(url, data=body, method=method, headers=h)

    try:
        if verify_tls:
            ctx = ssl.create_default_context()
        else:
            ctx = ssl._create_unverified_context()

        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read(16384)
            return {
                "ok": True,
                "status": resp.status,
                "reason": resp.reason,
                "headers": dict(resp.headers.items()),
                "body": raw.decode("utf-8", errors="replace")[:16384],
            }
    except urllib.error.HTTPError as e:
        try:
            raw = e.read(16384)
            body_str = raw.decode("utf-8", errors="replace")[:16384]
        except Exception:
            body_str = ""
        return {
            "ok": False,
            "status": e.code,
            "reason": e.reason,
            "headers": dict(e.headers.items()) if e.headers else {},
            "body": body_str,
        }
    except Exception as e:
        return {"ok": False, "status": 0, "reason": str(e), "headers": {}, "body": ""}


# ── Finding helper ──────────────────────────────────────────────────────

@dataclass
class Finding:
    """A single security finding."""
    title: str
    severity: str          # critical, high, medium, low, info
    category: str
    module: str
    description: str
    evidence: str
    asset: str
    points_deducted: int = 0
    remediation: str = ""
    dread_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "severity": self.severity,
            "category": self.category,
            "module": self.module,
            "description": self.description,
            "evidence": self.evidence,
            "asset": self.asset,
            "points_deducted": self.points_deducted,
            "remediation": self.remediation,
            "dread_score": self.dread_score,
        }


# ── Grade mapping ───────────────────────────────────────────────────────

GRADE_MAP: List[Tuple[int, str]] = [
    (90, "A+"),
    (80, "A"),
    (65, "B"),
    (50, "C"),
    (35, "D"),
    (0,  "F"),
]


def compute_grade(score: int) -> str:
    for threshold, grade in GRADE_MAP:
        if score >= threshold:
            return grade
    return "F"


def badge_markdown(host: str, grade: str) -> str:
    color_map = {
        "A+": "brightgreen", "A": "green", "B": "yellow",
        "C": "red", "D": "orange", "F": "red",
    }
    c = color_map.get(grade, "lightgrey")
    return (
        f"![ReconPro {grade}]"
        f"(https://img.shields.io/badge/ReconPro-{grade}-{c}"
        f"?style=for-the-badge&labelColor=000000)"
    )
