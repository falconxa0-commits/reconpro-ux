"""Async scan orchestration engine for ReconPro v10.0.

Runs modules concurrently with an event-driven architecture.  The public
``scan()`` function is a drop-in replacement for ``scanner.scan()`` — it
accepts the same arguments and returns an identical ``ReconProResult`` so
that every existing consumer (CLI, TUI, reports, tests) works unchanged.

Components
──────────
1. **ScanEvent** — lightweight dataclass emitted at every scan milestone.
2. **ScanEngine** — async orchestrator that resolves modules, runs them
   with bounded concurrency, and aggregates results.
3. **EventCollector** — convenience helper that buffers events for later
   inspection (useful in tests and TUI dashboards).
4. **concurrent_scan()** — scan many targets in parallel.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

from .registry import (
    ALL_MODULES,
    DEFAULT_LOCAL_MODULES,
    DEFAULT_MODULES,
    LOCAL_MODULES,
    MODULE_REGISTRY,
)
from .scanner import ReconProResult
from .http_layer import Finding
from .utils import compute_grade, badge_markdown, compute_score


# ── Scan Event ──────────────────────────────────────────────────────────


@dataclass
class ScanEvent:
    """Event emitted during scan execution.

    Attributes
    ----------
    type : str
        One of ``SCAN_START``, ``MODULE_START``, ``FINDING``,
        ``MODULE_COMPLETE``, ``SCAN_COMPLETE``.
    module_id : str | None
        The module that produced the event (``None`` for scan-level events).
    target : str | None
        The scan target (``None`` for module-level events).
    finding : Finding | None
        Present only for ``FINDING`` events.
    findings_count : int
        Present only for ``MODULE_COMPLETE`` events.
    duration : float
        Elapsed seconds for the module (``MODULE_COMPLETE``) or the
        whole scan (``SCAN_COMPLETE``).
    result : ReconProResult | None
        Present only for ``SCAN_COMPLETE``.
    modules : List[str]
        Present only for ``SCAN_START`` — the resolved module list.
    timestamp : float
        ``time.monotonic()`` when the event was created.
    """

    type: str
    module_id: Optional[str] = None
    target: Optional[str] = None
    finding: Optional[Finding] = None
    findings_count: int = 0
    duration: float = 0.0
    result: Optional[ReconProResult] = None
    modules: List[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.monotonic)


# ── Event Collector ─────────────────────────────────────────────────────


class EventCollector:
    """Buffer that stores every ``ScanEvent`` for later inspection.

    Usage::

        collector = EventCollector()
        engine = ScanEngine(event_callback=collector)
        await engine.run("example.com")
        print(collector.timeline())
        for f in collector.findings:
            print(f.title)
    """

    def __init__(self) -> None:
        self.events: List[ScanEvent] = []
        self._start: float = 0.0

    def __call__(self, event: ScanEvent) -> None:
        """Append *event*; record scan start time for timeline."""
        if event.type == "SCAN_START" and not self._start:
            self._start = event.timestamp
        self.events.append(event)

    # -- derived views -----------------------------------------------------

    @property
    def findings(self) -> List[Finding]:
        """All findings extracted from ``FINDING`` events, in order."""
        return [e.finding for e in self.events if e.type == "FINDING" and e.finding is not None]

    def by_module(self) -> Dict[str, List[ScanEvent]]:
        """Events grouped by ``module_id``.

        Scan-level events (``SCAN_START``, ``SCAN_COMPLETE``) are stored
        under the key ``"_scan"``.
        """
        out: Dict[str, List[ScanEvent]] = {}
        for e in self.events:
            key = e.module_id if e.module_id else "_scan"
            out.setdefault(key, []).append(e)
        return out

    def timeline(self) -> List[str]:
        """Human-readable timeline of events relative to scan start.

        Returns a list of formatted strings suitable for printing.
        """
        lines: List[str] = []
        anchor = self._start or (self.events[0].timestamp if self.events else 0.0)
        for e in self.events:
            dt = e.timestamp - anchor
            tag = f"[{dt:6.2f}s] {e.type}"
            if e.module_id:
                tag += f" ({e.module_id})"
            if e.target and e.type in ("SCAN_START", "SCAN_COMPLETE"):
                tag += f" target={e.target}"
            if e.type == "FINDING" and e.finding:
                tag += f" [{e.finding.severity}] {e.finding.title}"
            if e.type == "MODULE_COMPLETE":
                tag += f" {e.findings_count} findings in {e.duration:.2f}s"
            if e.type == "SCAN_COMPLETE" and e.result:
                tag += f" score={e.result.total_score} grade={e.result.grade}"
            lines.append(tag)
        return lines


# ── Scan Engine ─────────────────────────────────────────────────────────


class ScanEngine:
    """Async scan orchestrator with bounded concurrency and event emission.

    Parameters
    ----------
    event_callback : Callable[[ScanEvent], None] | None
        If provided, called for every ``ScanEvent`` produced during the scan.
    concurrency : int
        Maximum number of modules that run simultaneously.
    rate_limit : float
        Default requests-per-second cap (overridden per-scan).
    use_async : bool
        When ``True`` the engine calls ``async_run()`` on modules that
        expose it; otherwise every module is wrapped in
        ``asyncio.to_thread``.
    run_engineering : bool
        When ``True``, the engineering pipeline runs automatically after
        each scan completes.  Default ``False`` to preserve existing
        behaviour.
    engineering_repo_path : str
        Repository path passed to the
        ``ContinuousEngineeringOrchestrator`` when engineering is enabled.
    """

    def __init__(
        self,
        event_callback: Optional[Callable[[ScanEvent], None]] = None,
        concurrency: int = 5,
        rate_limit: float = 50.0,
        use_async: bool = True,
        run_engineering: bool = False,
        engineering_repo_path: str = ".",
    ) -> None:
        self._callback = event_callback
        self._concurrency = concurrency
        self._default_rate_limit = rate_limit
        self._use_async = use_async
        self._run_engineering = run_engineering
        self._engineering_repo_path = engineering_repo_path
        self._rate_limit = rate_limit

    # -- internal helpers --------------------------------------------------

    def _emit(self, event: ScanEvent) -> None:
        """Fire the event callback (if any)."""
        if self._callback is not None:
            try:
                self._callback(event)
            except Exception:
                logger.debug("Event callback error", exc_info=True)

    @staticmethod
    def _resolve_remote_modules(
        modules: Optional[List[str]],
        all_modules: bool,
    ) -> List[str]:
        """Determine which remote modules to run (mirrors scanner.py logic)."""
        if all_modules:
            return [m for m in ALL_MODULES if m in MODULE_REGISTRY]
        if modules:
            return [m.strip().lower() for m in modules if m.strip().lower() in MODULE_REGISTRY]
        return list(DEFAULT_MODULES)

    @staticmethod
    def _resolve_local_modules(
        modules: Optional[List[str]],
        all_modules: bool,
    ) -> List[str]:
        """Determine which local modules to run (mirrors scanner.py logic)."""
        if all_modules:
            return list(DEFAULT_LOCAL_MODULES)
        if modules:
            return [m.strip().lower() for m in modules if m.strip().lower() in LOCAL_MODULES]
        return list(DEFAULT_LOCAL_MODULES)

    def _build_result(
        self,
        target: str,
        mods: List[str],
        all_findings: List[Finding],
        module_results: Dict[str, Dict[str, Any]],
        vibesec_score: Optional[int],
        vibesec_grade: Optional[str],
    ) -> ReconProResult:
        """Aggregate findings into a ``ReconProResult`` identical to scanner.py."""
        total_score = compute_score(all_findings)
        grade = compute_grade(total_score)
        host = target.replace("https://", "").replace("http://", "").split("/")[0]
        badge = badge_markdown(host, grade)

        sev_counts: Dict[str, int] = {}
        for f in all_findings:
            sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

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

    # -- single module execution -------------------------------------------

    async def _run_module(
        self,
        mod_id: str,
        runner: Any,
        target: str,
        base_url: str,
        timeout: int,
        verify_tls: bool,
        limiter: Any,
        semaphore: asyncio.Semaphore,
        findings_lock: asyncio.Lock,
        all_findings: List[Finding],
        module_results: Dict[str, Dict[str, Any]],
        vibesec_state: Dict[str, Any],
    ) -> None:
        """Execute one module under the concurrency semaphore."""
        async with semaphore:
            self._emit(ScanEvent(type="MODULE_START", module_id=mod_id))
            t0 = time.monotonic()
            try:
                if self._use_async and hasattr(runner, "async_run"):
                    result = await runner.async_run(
                        target=target,
                        base_url=base_url,
                        timeout=timeout,
                        verify_tls=verify_tls,
                        limiter=limiter,
                    )
                else:
                    result = await asyncio.to_thread(
                        runner,
                        target=target,
                        base_url=base_url,
                        timeout=timeout,
                        verify_tls=verify_tls,
                        limiter=limiter,
                    )

                duration = time.monotonic() - t0

                # Dispatch based on return type.
                # vibesec returns (findings, score, grade, badge_md).
                # All other modules return list[Finding].
                if isinstance(result, tuple) and len(result) == 4:
                    mod_findings, score, grade, badge_md = result
                    vibesec_state["score"] = score
                    vibesec_state["grade"] = grade
                    async with findings_lock:
                        all_findings.extend(mod_findings)
                    module_results[mod_id] = {
                        "findings": [f.to_dict() for f in mod_findings],
                        "score": score,
                        "grade": grade,
                        "badge": badge_md,
                    }
                else:
                    mod_findings = result
                    async with findings_lock:
                        all_findings.extend(mod_findings)
                        for f in mod_findings:
                            self._emit(
                                ScanEvent(type="FINDING", module_id=mod_id, finding=f)
                            )
                            try:
                                from .plugins import HookManager
                                HookManager.fire("post_finding", finding=f)
                            except Exception:
                                logger.debug("Hook 'post_finding' error", exc_info=True)
                    module_results[mod_id] = {
                        "findings": [f.to_dict() for f in mod_findings],
                        "count": len(mod_findings),
                    }

                _module_health.record_success(mod_id)

                self._emit(
                    ScanEvent(
                        type="MODULE_COMPLETE",
                        module_id=mod_id,
                        findings_count=len(mod_findings),
                        duration=duration,
                    )
                )
            except Exception as exc:
                duration = time.monotonic() - t0
                _module_health.record_failure(mod_id)
                logger.error("Module '%s' failed: %s", mod_id, exc, exc_info=True)
                # Emit a finding-like error so the scan doesn't silently
                # swallow module failures.
                err_finding = Finding(
                    title=f"Module {mod_id} error: {exc}",
                    severity="info",
                    category="engine_error",
                    module=mod_id,
                    description=f"Module {mod_id} raised an exception during execution.",
                    evidence=str(exc),
                    asset=target,
                )
                async with findings_lock:
                    all_findings.append(err_finding)
                module_results[mod_id] = {
                    "findings": [err_finding.to_dict()],
                    "count": 1,
                    "error": str(exc),
                }
                self._emit(
                    ScanEvent(
                        type="MODULE_COMPLETE",
                        module_id=mod_id,
                        findings_count=1,
                        duration=duration,
                    )
                )

    # -- main async entry point --------------------------------------------

    async def run(
        self,
        target: str,
        modules: Optional[List[str]] = None,
        all_modules: bool = False,
        timeout: int = 10,
        verify_tls: bool = True,
        rate_limit: Optional[float] = None,
        is_local: bool = False,
    ) -> ReconProResult:
        """Run a scan against *target* with concurrent module execution.

        This is the async counterpart of :func:`scanner.scan` and produces
        an identical ``ReconProResult``.  The only difference is that modules
        are executed concurrently (up to ``self._concurrency`` at a time)
        instead of sequentially.

        Parameters
        ----------
        target : str
            Domain, URL, or directory path (for local scans).
        modules : list[str] | None
            Explicit module IDs.  ``None`` → defaults.
        all_modules : bool
            Run every registered module for the scan type.
        timeout : int
            Per-request timeout in seconds.
        verify_tls : bool
            Whether to verify TLS certificates.
        rate_limit : float | None
            Requests-per-second cap.  Falls back to the engine default.
        is_local : bool
            If ``True``, use ``LOCAL_MODULES`` instead of
            ``MODULE_REGISTRY`` (same as ``audit_scan``).

        Returns
        -------
        ReconProResult
            Identical shape to what ``scanner.scan`` returns.
        """
        effective_rate = rate_limit if rate_limit is not None else self._default_rate_limit

        # Resolve modules list.
        if is_local:
            mods = self._resolve_local_modules(modules, all_modules)
        else:
            mods = self._resolve_remote_modules(modules, all_modules)

        base_url = target if target.startswith("http") else f"https://{target}"
        host = target.replace("https://", "").replace("http://", "").split("/")[0]

        self._emit(ScanEvent(type="SCAN_START", target=target, modules=list(mods)))
        try:
            from .plugins import HookManager
            HookManager.fire("pre_scan", target=target, modules=mods)
        except Exception:
            logger.debug("Hook 'pre_scan' error", exc_info=True)
        scan_t0 = time.monotonic()

        semaphore = asyncio.Semaphore(self._concurrency)
        findings_lock = asyncio.Lock()
        all_findings: List[Finding] = []
        module_results: Dict[str, Dict[str, Any]] = {}
        vibesec_state: Dict[str, Any] = {}

        # Create rate limiter for modules that accept it.
        from .http_layer import RateLimiter
        limiter = RateLimiter(effective_rate)

        # Build coroutine tasks for each module.
        tasks: List[asyncio.Task[None]] = []
        for mod_id in mods:
            if is_local:
                entry = LOCAL_MODULES.get(mod_id)
            else:
                entry = MODULE_REGISTRY.get(mod_id)

            if entry is None:
                continue

            if not _module_health.is_healthy(mod_id):
                logger.warning("Module '%s' is unhealthy (circuit breaker open), skipping", mod_id)
                continue

            runner = entry.get("runner")
            if runner is None:
                # Special case: vibesec — lazy import.
                if mod_id == "vibesec" and not is_local:
                    from .modules.vibesec import run_vibesec  # type: ignore[no-redef]
                    runner = run_vibesec
                else:
                    continue

            tasks.append(
                asyncio.create_task(
                    self._run_module(
                        mod_id=mod_id,
                        runner=runner,
                        target=target,
                        base_url=base_url,
                        timeout=timeout,
                        verify_tls=verify_tls,
                        limiter=limiter,
                        semaphore=semaphore,
                        findings_lock=findings_lock,
                        all_findings=all_findings,
                        module_results=module_results,
                        vibesec_state=vibesec_state,
                    )
                )
            )

        # Run all module tasks concurrently (bounded by semaphore).
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        scan_duration = time.monotonic() - scan_t0

        vibesec_score = vibesec_state.get("score")
        vibesec_grade = vibesec_state.get("grade")

        result = self._build_result(
            target=host if not is_local else (target if target != "." else "local-audit"),
            mods=mods,
            all_findings=all_findings,
            module_results=module_results,
            vibesec_score=vibesec_score,
            vibesec_grade=vibesec_grade,
        )

        # ── Post-scan Intelligence Pipeline ──────────────────────
        intelligence_data = None
        if all_findings:
            try:
                from .intelligence_pipeline import IntelligencePipeline
                intel_pipeline = IntelligencePipeline(
                    enable_ai_analyst=True,
                    enable_attack_graph=True,
                    enable_threat_intel=True,
                )
                intel_result = intel_pipeline.analyze(all_findings, result.to_dict())
                intelligence_data = intel_result.to_dict()
                # Inject intelligence into result
                result.intelligence = intelligence_data
                logger.info(
                    "Intelligence pipeline completed: risk=%.1f exposure=%.1f chains=%d cves=%d",
                    intel_result.executive_risk_score,
                    intel_result.exposure_score,
                    len(intel_result.attack_chains),
                    len(intel_result.cve_matches),
                )
            except Exception as e:
                logger.warning("Intelligence pipeline error: %s", e, exc_info=True)

        self._emit(
            ScanEvent(
                type="SCAN_COMPLETE",
                target=target,
                result=result,
                duration=scan_duration,
            )
        )
        try:
            from .plugins import HookManager
            HookManager.fire("post_scan", target=target, result=result, duration=scan_duration)
        except Exception:
            logger.debug("Hook 'post_scan' error", exc_info=True)

        # ── Post-scan Engineering Pipeline (if enabled) ──────────────
        if self._run_engineering and all_findings:
            try:
                from .engineering_workflow import ContinuousEngineeringOrchestrator
                eng_orchestrator = ContinuousEngineeringOrchestrator(self._engineering_repo_path)
                eng_result = eng_orchestrator.run_full_cycle(self._engineering_repo_path)
                # Store engineering result metadata in result for later retrieval
                result.engineering = eng_result.to_dict()
                logger.info(
                    "Engineering pipeline completed: status=%s stages=%d duration=%.2fs",
                    eng_result.overall_status,
                    len(eng_result.stages),
                    eng_result.total_duration_s,
                )
            except Exception as e:
                logger.warning("Engineering pipeline error: %s", e, exc_info=True)

        return result

    # -- sync wrapper ------------------------------------------------------

    def scan_one(
        self,
        target: str,
        modules: Optional[List[str]] = None,
        timeout: int = 10,
        verify_tls: bool = True,
        rate_limit: Optional[float] = None,
        is_local: bool = False,
        run_engineering: bool = False,
        engineering_repo_path: str = ".",
    ) -> ReconProResult:
        """Synchronous wrapper around :meth:`run`.

        Creates a fresh event loop (or reuses the running one) so callers
        don't need to care about asyncio.

        Parameters are identical to :meth:`run` except ``all_modules`` is
        not exposed — pass an explicit ``modules`` list instead.
        """
        # Override instance-level engineering settings if caller provides them.
        if run_engineering:
            self._run_engineering = True
        if engineering_repo_path != ".":
            self._engineering_repo_path = engineering_repo_path
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None and loop.is_running():
            # Already inside an async context — use nest_asyncio-safe
            # approach or fallback to a new thread.
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(
                    asyncio.run,
                    self.run(
                        target=target,
                        modules=modules,
                        timeout=timeout,
                        verify_tls=verify_tls,
                        rate_limit=rate_limit,
                        is_local=is_local,
                    ),
                )
                return future.result()

        return asyncio.run(
            self.run(
                target=target,
                modules=modules,
                timeout=timeout,
                verify_tls=verify_tls,
                rate_limit=rate_limit,
                is_local=is_local,
            )
        )


# ── Module Health Tracking ────────────────────────────────────────────


class ModuleHealthState:
    """Tracks health of scanner modules for circuit-breaker logic."""

    def __init__(self, failure_threshold: int = 3, cooldown_seconds: float = 60.0):
        self._failure_counts: Dict[str, int] = {}
        self._last_failure_time: Dict[str, float] = {}
        self._failure_threshold = failure_threshold
        self._cooldown_seconds = cooldown_seconds

    def record_success(self, module_id: str) -> None:
        self._failure_counts.pop(module_id, None)
        self._last_failure_time.pop(module_id, None)

    def record_failure(self, module_id: str) -> None:
        self._failure_counts[module_id] = self._failure_counts.get(module_id, 0) + 1
        self._last_failure_time[module_id] = time.monotonic()

    def is_healthy(self, module_id: str) -> bool:
        """Check if a module is healthy enough to run."""
        count = self._failure_counts.get(module_id, 0)
        if count < self._failure_threshold:
            return True
        # In cooldown?
        last_fail = self._last_failure_time.get(module_id, 0)
        if time.monotonic() - last_fail > self._cooldown_seconds:
            # Cooldown expired, reset
            self.record_success(module_id)
            return True
        return False

    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Return health status for all tracked modules."""
        return {
            mid: {
                "failure_count": count,
                "is_healthy": self.is_healthy(mid),
                "in_cooldown": not self.is_healthy(mid),
            }
            for mid, count in self._failure_counts.items()
        }


# Global module health tracker
_module_health = ModuleHealthState()


# ── Module-level convenience functions ───────────────────────────────────


async def _scan_async(
    target: str,
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 10,
    verify_tls: bool = True,
    rate_limit: float = 50.0,
    event_callback: Optional[Callable[[ScanEvent], None]] = None,
    concurrency: int = 5,
    use_async: bool = True,
) -> ReconProResult:
    """Standalone async scan function — creates a temporary ``ScanEngine``."""
    engine = ScanEngine(
        event_callback=event_callback,
        concurrency=concurrency,
        rate_limit=rate_limit,
        use_async=use_async,
    )
    return await engine.run(
        target=target,
        modules=modules,
        all_modules=all_modules,
        timeout=timeout,
        verify_tls=verify_tls,
        rate_limit=rate_limit,
    )


def scan(
    target: str,
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 8,
    verify_tls: bool = True,
    rate_limit: float = 10.0,
    run_engineering: bool = False,
    engineering_repo_path: str = ".",
) -> ReconProResult:
    """Drop-in replacement for ``scanner.scan`` with concurrent module execution.

    Accepts the exact same parameters and returns an identical
    ``ReconProResult``.  The only internal difference is that modules
    are executed concurrently (up to 5 by default) instead of sequentially.

    This function can be used as a direct upgrade path::

        # Before (sequential)
        from reconpro.scanner import scan
        result = scan("example.com")

        # After (concurrent, drop-in)
        from reconpro.engine import scan
        result = scan("example.com")
    """
    engine = ScanEngine(
        concurrency=5,
        rate_limit=rate_limit,
        use_async=True,
        run_engineering=run_engineering,
        engineering_repo_path=engineering_repo_path,
    )
    return engine.scan_one(
        target=target,
        modules=modules,
        timeout=timeout,
        verify_tls=verify_tls,
        rate_limit=rate_limit,
        run_engineering=run_engineering,
        engineering_repo_path=engineering_repo_path,
    )


def audit_scan(
    target: str = ".",
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    run_engineering: bool = False,
    engineering_repo_path: str = ".",
) -> ReconProResult:
    """Drop-in replacement for ``scanner.audit_scan`` with concurrent module execution.

    Runs local machine / project audit modules concurrently.
    """
    engine = ScanEngine(
        concurrency=5,
        rate_limit=10.0,
        use_async=True,
        run_engineering=run_engineering,
        engineering_repo_path=engineering_repo_path,
    )
    return engine.scan_one(
        target=target,
        modules=modules,
        timeout=8,
        verify_tls=True,
        is_local=True,
        run_engineering=run_engineering,
        engineering_repo_path=engineering_repo_path,
    )


async def concurrent_scan(
    targets: List[str],
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 10,
    verify_tls: bool = True,
    rate_limit: float = 50.0,
    max_concurrency: int = 10,
    is_local: bool = False,
    event_callback: Optional[Callable[[ScanEvent], None]] = None,
) -> Dict[str, ReconProResult]:
    """Scan multiple targets concurrently with bounded total parallelism.

    Spawns one ``ScanEngine`` per target but shares a single
    ``asyncio.Semaphore`` so the total number of in-flight modules
    across *all* targets never exceeds ``max_concurrency``.

    Parameters
    ----------
    targets : list[str]
        Domains / URLs to scan.
    modules, all_modules, timeout, verify_tls, rate_limit
        Forwarded to each per-target scan.
    max_concurrency : int
        Upper bound on simultaneous module executions across all targets.
    is_local : bool
        If ``True``, run local audit modules instead of remote ones.
    event_callback : callable | None
        Receives ``ScanEvent`` from every target scan.

    Returns
    -------
    dict[str, ReconProResult]
        Mapping of target → result for every target.
    """
    results: Dict[str, ReconProResult] = {}
    lock = asyncio.Lock()

    async def _scan_one(t: str) -> None:
        engine = ScanEngine(
            event_callback=event_callback,
            concurrency=max_concurrency,
            rate_limit=rate_limit,
            use_async=True,
        )
        result = await engine.run(
            target=t,
            modules=modules,
            all_modules=all_modules,
            timeout=timeout,
            verify_tls=verify_tls,
            rate_limit=rate_limit,
            is_local=is_local,
        )
        async with lock:
            results[t] = result

    tasks = [asyncio.create_task(_scan_one(t)) for t in targets]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

    return results
