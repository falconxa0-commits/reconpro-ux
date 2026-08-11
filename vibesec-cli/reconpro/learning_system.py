"""Learning System — Learn from scan history to improve future scans.

Learns from:
- Every scan (what modules found what)
- Every failure (timeouts, errors)
- Every regression (new findings on previously-clean targets)
- Scan patterns (which modules are effective for which targets)
"""
from __future__ import annotations

import json
import threading
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


_LEARNING_DIR = Path.home() / ".reconpro" / "memory"
_LEARNING_FILE = _LEARNING_DIR / "learning.json"


# ── Default empty learning state ────────────────────────────────────────

def _empty_state() -> Dict[str, Any]:
    return {
        "version": 1,
        "target_history": {},       # target -> list of scan summaries
        "module_effectiveness": {},  # module_id -> {runs, findings, avg_findings}
        "error_patterns": {},        # module_id -> {error_type: count}
        "target_patterns": {},       # domain_pattern -> {modules_that_work: [...], avg_score: float}
        "regressions": [],           # list of regression events
        "total_scans": 0,
    }


class LearningSystem:
    """Persist and query scan learning data.

    Stores learning state in ``~/.reconpro/memory/learning.json``.
    Thread-safe via a reentrant lock.
    """

    def __init__(self, learning_file: Optional[Path] = None) -> None:
        self._file = learning_file or _LEARNING_FILE
        self._lock = threading.RLock()
        self._state: Dict[str, Any] = _empty_state()
        self._load()

    # ── Persistence ──────────────────────────────────────────────────

    def _load(self) -> None:
        """Load learning state from disk."""
        with self._lock:
            try:
                if self._file.exists():
                    text = self._file.read_text(encoding="utf-8")
                    data = json.loads(text)
                    # Merge with defaults so new keys are present.
                    base = _empty_state()
                    base.update(data)
                    self._state = base
            except (json.JSONDecodeError, OSError):
                self._state = _empty_state()

    def _save(self) -> None:
        """Persist learning state to disk."""
        with self._lock:
            self._file.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._file.with_suffix(".tmp")
            tmp.write_text(
                json.dumps(self._state, indent=2, default=str),
                encoding="utf-8",
            )
            tmp.replace(self._file)

    # ── Core API ─────────────────────────────────────────────────────

    def record_scan(self, result_dict: Dict[str, Any]) -> None:
        """Persist a scan outcome into the learning system.

        Args:
            result_dict: A scan result dict with at least ``target``,
                ``findings`` (list of dicts), and optionally ``modules_run``
                (list of module id strings) and ``errors`` (list of error dicts).
        """
        target = result_dict.get("target", "unknown")
        findings: List[Dict[str, Any]] = result_dict.get("findings", [])
        modules_run: List[str] = result_dict.get("modules_run", [])
        errors: List[Dict[str, Any]] = result_dict.get("errors", [])
        score: int = result_dict.get("total_score", 0)

        with self._lock:
            self._state["total_scans"] += 1

            # ── Target history ───────────────────────────────────────
            target_entry: Dict[str, Any] = {
                "timestamp": datetime.now().isoformat(),
                "finding_count": len(findings),
                "score": score,
                "modules": modules_run,
                "error_count": len(errors),
                "categories": list({f.get("category", "") for f in findings}),
            }
            self._state["target_history"].setdefault(target, []).append(target_entry)
            # Keep last 50 scans per target to bound storage.
            hist = self._state["target_history"][target]
            if len(hist) > 50:
                self._state["target_history"][target] = hist[-50:]

            # ── Module effectiveness ─────────────────────────────────
            findings_by_module: Dict[str, int] = defaultdict(int)
            for f in findings:
                mod = f.get("module", "")
                if mod:
                    findings_by_module[mod] += 1

            for mod in modules_run:
                entry = self._state["module_effectiveness"].setdefault(mod, {
                    "runs": 0, "findings": 0, "avg_findings": 0.0,
                })
                entry["runs"] += 1
                fc = findings_by_module.get(mod, 0)
                entry["findings"] += fc
                entry["avg_findings"] = round(
                    entry["findings"] / entry["runs"], 2
                )

            # ── Error patterns ────────────────────────────────────────
            for err in errors:
                mod = err.get("module", "unknown")
                err_type = err.get("error_type", err.get("error", "unknown"))
                mod_errors = self._state["error_patterns"].setdefault(mod, {})
                mod_errors[err_type] = mod_errors.get(err_type, 0) + 1

            # ── Target patterns ──────────────────────────────────────
            pattern = self._extract_target_pattern(target)
            pat_entry = self._state["target_patterns"].setdefault(pattern, {
                "modules_that_work": [],
                "avg_score": 0.0,
                "scan_count": 0,
            })
            pat_entry["scan_count"] += 1
            # Running average of score.
            n = pat_entry["scan_count"]
            pat_entry["avg_score"] = round(
                (pat_entry["avg_score"] * (n - 1) + score) / n, 1
            )
            # Track modules that produced findings.
            for mod, fc in findings_by_module.items():
                if fc > 0 and mod not in pat_entry["modules_that_work"]:
                    pat_entry["modules_that_work"].append(mod)

            self._save()

    def get_target_history(self, target: str) -> Dict[str, Any]:
        """Return what happened on this target before.

        Returns:
            Dict with keys: scan_count, latest_score, latest_categories,
            all_scores, modules_used, error_summary.
        """
        with self._lock:
            scans = self._state["target_history"].get(target, [])
            if not scans:
                return {
                    "target": target,
                    "scan_count": 0,
                    "latest_score": None,
                    "latest_categories": [],
                    "all_scores": [],
                    "modules_used": [],
                    "error_summary": {},
                }

            all_scores = [s["score"] for s in scans]
            all_modules: List[str] = []
            error_counts: Dict[str, int] = defaultdict(int)
            for s in scans:
                for m in s.get("modules", []):
                    if m not in all_modules:
                        all_modules.append(m)
                error_counts[s["error_count"]] += 1

            latest = scans[-1]
            return {
                "target": target,
                "scan_count": len(scans),
                "latest_score": latest["score"],
                "latest_categories": latest.get("categories", []),
                "all_scores": all_scores,
                "modules_used": all_modules,
                "error_summary": dict(error_counts),
            }

    def suggest_modules(self, target: str) -> List[str]:
        """Suggest modules based on target patterns and historical effectiveness.

        Strategy:
        1. Check if this exact target was scanned before — suggest modules
           that previously produced findings.
        2. Check target pattern (TLD, subdomain depth) — suggest modules
           effective for similar targets.
        3. Fall back to top modules by global effectiveness.
        """
        with self._lock:
            suggestions: List[str] = []
            seen: set = set()

            # 1. Exact target history.
            history = self._state["target_history"].get(target, [])
            if history:
                latest = history[-1]
                for mod in latest.get("modules", []):
                    if mod not in seen:
                        suggestions.append(mod)
                        seen.add(mod)

            # 2. Pattern match.
            pattern = self._extract_target_pattern(target)
            pat_entry = self._state["target_patterns"].get(pattern, {})
            for mod in pat_entry.get("modules_that_work", []):
                if mod not in seen:
                    suggestions.append(mod)
                    seen.add(mod)

            # 3. Global top modules by avg_findings.
            sorted_mods = sorted(
                self._state["module_effectiveness"].items(),
                key=lambda x: x[1].get("avg_findings", 0),
                reverse=True,
            )
            for mod, _ in sorted_mods:
                if mod not in seen:
                    suggestions.append(mod)
                    seen.add(mod)

            return suggestions[:20]  # Cap at 20 suggestions.

    def detect_regressions(
        self, target: str, current_findings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Compare current findings with history to find new issues (regressions).

        A regression is a finding category that was NOT present in the most
        recent previous scan but IS present now.

        Returns:
            List of regression dicts with: category, title, severity, previous_absent.
        """
        with self._lock:
            scans = self._state["target_history"].get(target, [])
            regressions: List[Dict[str, Any]] = []

            if not scans:
                return regressions

            # Collect categories from all previous scans.
            prev_categories: set = set()
            for s in scans:
                for c in s.get("categories", []):
                    prev_categories.add(c)

            current_categories: set = {f.get("category", "") for f in current_findings}
            new_categories = current_categories - prev_categories

            for f in current_findings:
                cat = f.get("category", "")
                if cat in new_categories:
                    regressions.append({
                        "category": cat,
                        "title": f.get("title", ""),
                        "severity": f.get("severity", "info"),
                        "previous_absent": True,
                        "detected_at": datetime.now().isoformat(),
                    })

            # Record regression events.
            for reg in regressions:
                reg_event = {
                    "target": target,
                    "category": reg["category"],
                    "severity": reg["severity"],
                    "detected_at": reg["detected_at"],
                }
                self._state["regressions"].append(reg_event)
                # Keep last 200 regression events.
                if len(self._state["regressions"]) > 200:
                    self._state["regressions"] = self._state["regressions"][-200:]

            if regressions:
                self._save()

            return regressions

    def get_scan_effectiveness(self) -> Dict[str, Any]:
        """Return which modules produce the most findings.

        Returns:
            Dict with: total_scans, module_rankings (sorted list),
            error_summary, top_error_modules.
        """
        with self._lock:
            me = self._state["module_effectiveness"]
            ranked = sorted(
                me.items(),
                key=lambda x: x[1].get("avg_findings", 0),
                reverse=True,
            )

            error_summary = self._state["error_patterns"]
            top_error_modules = sorted(
                error_summary.items(),
                key=lambda x: sum(x[1].values()),
                reverse=True,
            )[:10]

            return {
                "total_scans": self._state["total_scans"],
                "module_rankings": [
                    {
                        "module": mod,
                        "runs": data["runs"],
                        "total_findings": data["findings"],
                        "avg_findings": data["avg_findings"],
                    }
                    for mod, data in ranked
                ],
                "error_summary": error_summary,
                "top_error_modules": [
                    {"module": m, "errors": e}
                    for m, e in top_error_modules
                ],
            }

    # ── Helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _extract_target_pattern(target: str) -> str:
        """Extract a domain pattern from a target for grouping.

        Examples:
            "api.example.com" -> "example.com"
            "www.shop.example.co.uk" -> "example.co.uk"
            "192.168.1.1" -> "ip_192.168.1"
            "http://example.com:8080/path" -> "example.com"
        """
        from urllib.parse import urlparse
        cleaned = target.strip()
        if not cleaned.startswith(("http://", "https://")):
            cleaned = "https://" + cleaned
        parsed = urlparse(cleaned)
        host = parsed.hostname or ""

        # IP address pattern.
        parts = host.split(".")
        if len(parts) == 4 and all(p.isdigit() for p in parts):
            return f"ip_{parts[0]}.{parts[1]}.{parts[2]}"

        # Domain: keep eTLD + 1.
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return host
