from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .modules import (
    run_recon, run_vibesec, run_auth, run_chain,
    run_bot, run_gorgon, run_oblivion, run_nhi,
    run_host, run_dev, run_doctor,
)
from .http import http_probe, Finding, compute_grade, badge_markdown, default_limiter


# ── Remote scan modules (require a URL target) ─────────────────────────
MODULE_REGISTRY = {
    "recon":    {"name": "RECON",         "runner": run_recon,    "color": "cyan"},
    "auth":     {"name": "AUTH BYPASS",   "runner": run_auth,     "color": "yellow"},
    "chain":    {"name": "CHAIN HUNTER",  "runner": run_chain,    "color": "magenta"},
    "bot":      {"name": "BOT HUNTER",    "runner": run_bot,      "color": "red"},
    "gorgon":   {"name": "GORGON ULTRA",  "runner": run_gorgon,   "color": "bright_red"},
    "oblivion": {"name": "OBLIVION",      "runner": run_oblivion, "color": "bright_magenta"},
    "vibesec":  {"name": "VIBESEC",       "runner": None,         "color": "bright_green"},
    "nhi":      {"name": "NHI GRAPH",     "runner": run_nhi,      "color": "cyan"},
}

# ── Local scan modules (scan the machine, not a URL) ────────────────────
LOCAL_MODULES = {
    "host":   {"name": "HOST AUDIT",   "runner": run_host,   "color": "bright_yellow"},
    "dev":    {"name": "DEV SEC",      "runner": run_dev,    "color": "bright_cyan"},
    "doctor": {"name": "DOCTOR",       "runner": run_doctor, "color": "bright_green"},
}

# Merge all for --all scans
ALL_MODULES = list(MODULE_REGISTRY.keys()) + list(LOCAL_MODULES.keys())

DEFAULT_MODULES = ["recon", "vibesec", "auth", "chain", "oblivion"]
DEFAULT_LOCAL_MODULES = ["host", "dev", "doctor"]


@dataclass
class ReconProResult:
    """Full result of a ReconPro scan."""
    target: str
    modules_run: List[str]
    findings: List[Dict[str, Any]]
    severity_counts: Dict[str, int]
    total_score: int
    grade: str
    badge_markdown: str
    vibesec_score: Optional[int] = None
    vibesec_grade: Optional[str] = None
    module_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "modules_run": self.modules_run,
            "total_findings": len(self.findings),
            "severity_counts": self.severity_counts,
            "total_score": self.total_score,
            "grade": self.grade,
            "badge_markdown": self.badge_markdown,
            "vibesec_score": self.vibesec_score,
            "vibesec_grade": self.vibesec_grade,
            "module_results": self.module_results,
            "findings": self.findings,
        }


def scan(
    target: str,
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 8,
    verify_tls: bool = True,
    rate_limit: float = 10.0,
) -> ReconProResult:
    """Run ReconPro scan against target (remote URL/domain).

    Args:
        target:      Domain or URL to scan.
        modules:     List of module IDs to run. Defaults to DEFAULT_MODULES.
        all_modules: If True, run all remote modules.
        timeout:     Per-request timeout in seconds.
        verify_tls:  Whether to verify TLS certificates.
        rate_limit:  Max requests per second.

    Returns:
        ReconProResult with all findings, scores, and grades.
    """
    global default_limiter
    from .http import RateLimiter
    default_limiter = RateLimiter(rate_limit)

    base_url = target if target.startswith("http") else f"https://{target}"
    host = target.replace("https://", "").replace("http://", "").split("/")[0]

    if all_modules:
        mods = [m for m in ALL_MODULES if m in MODULE_REGISTRY]
    elif modules:
        mods = [m.strip().lower() for m in modules if m.strip().lower() in MODULE_REGISTRY]
    else:
        mods = list(DEFAULT_MODULES)

    all_findings: List[Finding] = []
    module_results: Dict[str, Dict[str, Any]] = {}
    vibesec_score = None
    vibesec_grade = None
    vibesec_badge = None

    for mod_id in mods:
        if mod_id == "vibesec":
            from .modules.vibesec import run_vibesec
            findings, score, grade, badge_md = run_vibesec(
                target, base_url, timeout=timeout, verify_tls=verify_tls
            )
            all_findings.extend(findings)
            vibesec_score = score
            vibesec_grade = grade
            vibesec_badge = badge_md
            module_results["vibesec"] = {
                "findings": [f.to_dict() for f in findings],
                "score": score, "grade": grade, "badge": badge_md,
            }
        else:
            entry = MODULE_REGISTRY[mod_id]
            runner = entry["runner"]
            if runner:
                findings = runner(target, base_url, timeout=timeout, verify_tls=verify_tls)
                all_findings.extend(findings)
                module_results[mod_id] = {
                    "findings": [f.to_dict() for f in findings],
                    "count": len(findings),
                }

    # Calculate overall score
    total_deductions = sum(f.points_deducted for f in all_findings)
    total_score = max(0, min(100, 100 - total_deductions))
    if not all_findings:
        total_score = 100
    grade = compute_grade(total_score)
    badge = badge_markdown(host, grade)

    # Severity counts
    sev_counts: Dict[str, int] = {}
    for f in all_findings:
        s = f.severity
        sev_counts[s] = sev_counts.get(s, 0) + 1

    return ReconProResult(
        target=host,
        modules_run=mods,
        findings=[f.to_dict() for f in all_findings],
        severity_counts=sev_counts,
        total_score=total_score,
        grade=grade,
        badge_markdown=badge,
        vibesec_score=vibesec_score,
        vibesec_grade=vibesec_grade,
        module_results=module_results,
    )


def audit_scan(
    target: str = ".",
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
) -> ReconProResult:
    """Run local machine / project audit.

    Args:
        target:      Directory to scan (for dev module) or "localhost" (for host/doctor).
        modules:     List of local module IDs (host, dev, doctor).
        all_modules: If True, run all 3 local modules.

    Returns:
        ReconProResult with all findings, scores, and grades.
    """
    if all_modules:
        mods = list(DEFAULT_LOCAL_MODULES)
    elif modules:
        mods = [m.strip().lower() for m in modules if m.strip().lower() in LOCAL_MODULES]
    else:
        mods = list(DEFAULT_LOCAL_MODULES)

    all_findings: List[Finding] = []
    module_results: Dict[str, Dict[str, Any]] = {}

    for mod_id in mods:
        entry = LOCAL_MODULES[mod_id]
        runner = entry["runner"]
        if runner:
            findings = runner(target=target, base_url="", timeout=8, verify_tls=True)
            all_findings.extend(findings)
            module_results[mod_id] = {
                "findings": [f.to_dict() for f in findings],
                "count": len(findings),
            }

    # Calculate score
    total_deductions = sum(f.points_deducted for f in all_findings)
    total_score = max(0, min(100, 100 - total_deductions))
    if not all_findings:
        total_score = 100
    grade = compute_grade(total_score)
    badge = badge_markdown(target if target != "." else "local-audit", grade)

    # Severity counts
    sev_counts: Dict[str, int] = {}
    for f in all_findings:
        s = f.severity
        sev_counts[s] = sev_counts.get(s, 0) + 1

    return ReconProResult(
        target=target if target != "." else "local-audit",
        modules_run=mods,
        findings=[f.to_dict() for f in all_findings],
        severity_counts=sev_counts,
        total_score=total_score,
        grade=grade,
        badge_markdown=badge,
        module_results=module_results,
    )
