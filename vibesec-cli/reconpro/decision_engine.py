"""Decision Engine — Autonomous scan orchestration decisions.

Decides:
- What to scan (based on target type)
- What to skip (based on learning history)
- Scan order (based on module effectiveness)
- When to retry (based on error patterns)
- When to throttle (based on rate limit feedback)
- When to recommend (based on findings)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse


# ── Module metadata for heuristic planning ───────────────────────────────

# Default estimated time per module (seconds).
_MODULE_TIME: Dict[str, float] = {
    "recon": 15.0,
    "auth": 20.0,
    "chain": 10.0,
    "bot": 8.0,
    "gorgon": 60.0,
    "oblivion": 45.0,
    "vibesec": 30.0,
    "nhi": 12.0,
    "host": 25.0,
    "dev": 10.0,
    "doctor": 5.0,
    "subdomains": 20.0,
    "api_discovery": 15.0,
    "browser": 30.0,
    "fuzzer": 40.0,
    "cve_radar": 15.0,
    "compliance": 10.0,
    "passive_intel": 8.0,
}

# Modules best suited for each target type.
_TARGET_MODULE_HINTS: Dict[str, List[str]] = {
    "ip": ["host", "recon", "subdomains", "cve_radar"],
    "domain": ["recon", "subdomains", "auth", "chain", "bot"],
    "url": ["recon", "auth", "chain", "fuzzer", "browser"],
    "localhost": ["host", "dev", "doctor"],
    "cloud": ["cloud_recon", "container_sec", "iac_audit"],
}

# Error types that warrant a retry.
_RETRYABLE_ERRORS: set = {
    "timeout", "connection_reset", "connection_refused",
    "temporary_failure", "rate_limited", "too_many_requests",
    "ssl_error", "dns_temporary",
}

# Error types that mean the module should be skipped.
_SKIP_ERRORS: set = {
    "not_applicable", "feature_disabled", "no_dns_record",
    "auth_required", "permission_denied",
}


# ── Data classes ────────────────────────────────────────────────────────


@dataclass
class ScanPlan:
    """An autonomous scan execution plan."""
    target: str
    target_type: str
    modules_to_run: List[str]
    order: List[str]
    skip_reasons: Dict[str, str]
    estimated_time: float
    retry_modules: Dict[str, int]  # module -> max retries
    throttle_flags: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "target_type": self.target_type,
            "modules_to_run": self.modules_to_run,
            "order": self.order,
            "skip_reasons": self.skip_reasons,
            "estimated_time": self.estimated_time,
            "retry_modules": self.retry_modules,
            "throttle_flags": self.throttle_flags,
        }


# ── Decision Engine ──────────────────────────────────────────────────────


class DecisionEngine:
    """Autonomous scan orchestration decision engine.

    Uses heuristics and optional learning data to plan scans,
    decide on retries, and manage throttling.
    """

    def __init__(
        self,
        learning_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._learning = learning_data or {}

    def plan_scan(
        self,
        target: str,
        available_modules: List[str],
        learning_data: Optional[Dict[str, Any]] = None,
    ) -> ScanPlan:
        """Create a ScanPlan for the given target.

        Args:
            target: The target to scan (URL, domain, IP, or localhost).
            available_modules: List of module IDs available to run.
            learning_data: Optional learning data to inform decisions.

        Returns:
            ScanPlan with optimized module order and skip decisions.
        """
        ld = learning_data or self._learning
        target_type = self._classify_target(target)

        # 1. Determine which modules to skip based on learning history.
        skip_reasons: Dict[str, str] = self._compute_skips(
            target, available_modules, ld
        )

        # 2. Get candidate modules (available minus skipped).
        candidates = [
            m for m in available_modules
            if m not in skip_reasons
        ]

        # 3. Optimize scan order.
        effectiveness = ld.get("module_effectiveness", {})
        ordered = self.optimize_order(candidates, target, effectiveness)

        # 4. Estimate time.
        total_time = sum(
            _MODULE_TIME.get(m, 15.0) for m in ordered
        )

        # 5. Determine retry budget per module based on error history.
        error_patterns = ld.get("error_patterns", {})
        retry_modules: Dict[str, int] = {}
        for m in ordered:
            mod_errors = error_patterns.get(m, {})
            has_retryable = any(
                e.lower() in _RETRYABLE_ERRORS for e in mod_errors
            )
            retry_modules[m] = 2 if has_retryable else 0

        # 6. Throttle flags based on target type.
        throttle_flags: List[str] = []
        if target_type == "url":
            throttle_flags.append("respect_robots_txt")
        if target_type == "localhost":
            throttle_flags.append("fast_mode")

        return ScanPlan(
            target=target,
            target_type=target_type,
            modules_to_run=ordered,
            order=list(ordered),
            skip_reasons=skip_reasons,
            estimated_time=round(total_time, 1),
            retry_modules=retry_modules,
            throttle_flags=throttle_flags,
        )

    def should_retry(self, module_id: str, error: str, attempt: int) -> bool:
        """Decide whether to retry a failed module.

        Args:
            module_id: The module that failed.
            error: The error message or type.
            attempt: Current attempt number (1-based).

        Returns:
            True if the module should be retried.
        """
        if attempt > 3:
            return False

        error_lower = error.lower()

        # Never retry skip-type errors.
        if any(s in error_lower for s in _SKIP_ERRORS):
            return False

        # Retry retryable errors up to attempt limit.
        if any(r in error_lower for r in _RETRYABLE_ERRORS):
            return True

        # For unknown errors, allow one retry.
        return attempt < 2

    def should_throttle(self, error_rate: float) -> bool:
        """Decide whether to throttle scan speed.

        Args:
            error_rate: Ratio of errors to total requests (0.0 to 1.0).

        Returns:
            True if scanning should be throttled.
        """
        if error_rate >= 0.5:
            return True
        if error_rate >= 0.3:
            return True
        return False

    def optimize_order(
        self,
        modules: List[str],
        target: str,
        effectiveness: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Optimize module execution order.

        Strategy:
        1. Fast, high-effectiveness modules first.
        2. Target-type hints for module relevance.
        3. Slow/expensive modules last.
        4. Stable sort preserves input order for ties.

        Args:
            modules: List of module IDs to order.
            target: Target being scanned.
            effectiveness: Optional module effectiveness data from LearningSystem.

        Returns:
            Ordered list of module IDs.
        """
        eff = effectiveness or {}
        target_type = self._classify_target(target)
        hints = _TARGET_MODULE_HINTS.get(target_type, [])

        def sort_key(mod: str) -> tuple:
            # Primary: hint priority (lower = earlier).
            try:
                hint_priority = hints.index(mod)
            except ValueError:
                hint_priority = len(hints) + 1

            # Secondary: inverse of avg_findings (higher findings = earlier).
            avg = 0.0
            if mod in eff:
                avg = eff[mod].get("avg_findings", 0.0)
            effectiveness_key = -avg

            # Tertiary: estimated time (faster = earlier).
            time_key = _MODULE_TIME.get(mod, 15.0)

            return (hint_priority, effectiveness_key, time_key)

        return sorted(modules, key=sort_key)

    # ── Helpers ──────────────────────────────────────────────────────

    def _classify_target(self, target: str) -> str:
        """Classify a target into a type string.

        Returns one of: "ip", "domain", "url", "localhost", "cloud".
        """
        cleaned = target.strip()
        if not cleaned.startswith(("http://", "https://")):
            cleaned = "https://" + cleaned

        parsed = urlparse(cleaned)
        host = parsed.hostname or ""

        # Localhost detection.
        if host in ("localhost", "127.0.0.1", "::1"):
            return "localhost"

        # IP address detection.
        parts = host.split(".")
        if len(parts) == 4 and all(p.isdigit() for p in parts):
            return "ip"

        # URL with path -> likely an endpoint.
        if parsed.path and parsed.path != "/":
            return "url"

        # Cloud service detection.
        cloud_indicators = (".amazonaws.com", ".azure.com", ".gcp.", ".herokuapp.com")
        if any(host.endswith(ind) for ind in cloud_indicators):
            return "cloud"

        return "domain"

    @staticmethod
    def _compute_skips(
        target: str,
        available_modules: List[str],
        learning_data: Dict[str, Any],
    ) -> Dict[str, str]:
        """Compute modules to skip with reasons.

        Skips modules that:
        1. Have >5 consecutive failures on this target pattern.
        2. Have "not_applicable" or "no_dns_record" errors.
        """
        skip_reasons: Dict[str, str] = {}
        error_patterns = learning_data.get("error_patterns", {})
        target_history = learning_data.get("target_history", {}).get(target, [])

        for mod in available_modules:
            mod_errors = error_patterns.get(mod, {})

            # Check for persistent skip-type errors.
            skip_error_count = sum(
                count
                for err_type, count in mod_errors.items()
                if any(s in err_type.lower() for s in _SKIP_ERRORS)
            )
            if skip_error_count >= 3:
                skip_reasons[mod] = f"persistent_skip_errors ({skip_error_count})"
                continue

            # Check if module always fails on this specific target.
            for scan in target_history[-5:]:  # Last 5 scans.
                if mod in scan.get("modules", []) and scan.get("error_count", 0) > 0:
                    # Only skip if the module itself has many errors.
                    if mod_errors.get("timeout", 0) >= 5:
                        skip_reasons[mod] = "persistent_timeouts_on_target"

        return skip_reasons
