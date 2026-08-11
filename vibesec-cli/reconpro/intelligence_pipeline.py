"""ReconPro Intelligence Pipeline — Age IV

Central coordinator that enriches scan results with intelligence:
1. Persists findings to UnifiedMemoryStore
2. Updates SecurityKnowledgeGraph with new findings
3. Generates target intelligence profiles
4. Triggers post-scan analysis (confidence, recommendations, engineering score)

Wires into ScanEngine via event callbacks.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from .scanner import ReconProResult
from .engine import ScanEvent

logger = logging.getLogger(__name__)


# ── Intelligence Report ────────────────────────────────────────────────


@dataclass
class IntelligenceReport:
    """Enriched intelligence report produced by the pipeline."""

    target: str
    timestamp: str
    findings_count: int
    confidence_scores: List[Dict[str, Any]]
    target_intel: Optional[Dict[str, Any]]
    engineering_report: Optional[Dict[str, Any]]
    graph_stats: Optional[Dict[str, Any]]
    memory_stats: Optional[Dict[str, Any]]
    processing_time_ms: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "timestamp": self.timestamp,
            "findings_count": self.findings_count,
            "confidence_scores": self.confidence_scores,
            "target_intel": self.target_intel,
            "engineering_report": self.engineering_report,
            "graph_stats": self.graph_stats,
            "memory_stats": self.memory_stats,
            "processing_time_ms": round(self.processing_time_ms, 2),
        }


# ── Intelligence Pipeline ──────────────────────────────────────────────


class IntelligencePipeline:
    """Central intelligence coordinator.

    Wires existing modules (UnifiedMemoryStore, SecurityKnowledgeGraph,
    ConfidenceEngine, TargetIntelligence, EngineeringScorer) into the
    scan flow.  Designed to be used as an ``event_callback`` for
    ``ScanEngine`` or called manually via :meth:`process_result`.

    Usage as ScanEngine callback::

        pipeline = IntelligencePipeline()
        engine = ScanEngine(event_callback=pipeline)
        result = await engine.run("example.com")

    Usage as manual post-processor::

        pipeline = IntelligencePipeline()
        report = pipeline.process_result(result)
    """

    def __init__(
        self,
        memory_store: Optional[Any] = None,
        confidence_engine: Optional[Any] = None,
        target_intelligence: Optional[Any] = None,
        engineering_scorer: Optional[Any] = None,
    ) -> None:
        """Initialise the pipeline with optional component overrides.

        Parameters
        ----------
        memory_store : UnifiedMemoryStore | None
            If ``None``, lazily imported on first use.
        confidence_engine : ConfidenceEngine | None
            If ``None``, created on init.
        target_intelligence : TargetIntelligence | None
            If ``None``, created on init.
        engineering_scorer : EngineeringScorer | None
            If ``None``, created on init.
        """
        self._memory_store = memory_store
        self._confidence_engine = confidence_engine
        self._target_intelligence = target_intelligence
        self._engineering_scorer = engineering_scorer
        self._last_report: Optional[IntelligenceReport] = None

    # ------------------------------------------------------------------
    #  Lazy component accessors
    # ------------------------------------------------------------------

    @property
    def memory(self) -> Any:
        """Return (or create) the UnifiedMemoryStore."""
        if self._memory_store is None:
            from .memory import get_memory
            self._memory_store = get_memory()
        return self._memory_store

    @property
    def confidence(self) -> Any:
        """Return (or create) the ConfidenceEngine."""
        if self._confidence_engine is None:
            from .confidence_engine import ConfidenceEngine
            self._confidence_engine = ConfidenceEngine()
        return self._confidence_engine

    @property
    def target_analyzer(self) -> Any:
        """Return (or create) the TargetIntelligence."""
        if self._target_intelligence is None:
            from .target_intelligence import TargetIntelligence
            self._target_intelligence = TargetIntelligence()
        return self._target_intelligence

    @property
    def scorer(self) -> Any:
        """Return (or create) the EngineeringScorer."""
        if self._engineering_scorer is None:
            from .engineering_score import EngineeringScorer
            self._engineering_scorer = EngineeringScorer()
        return self._engineering_scorer

    # ------------------------------------------------------------------
    #  Event callback interface (ScanEngine compatible)
    # ------------------------------------------------------------------

    def __call__(self, event: ScanEvent) -> None:
        """Handle a ScanEvent — triggers intelligence on SCAN_COMPLETE.

        This makes IntelligencePipeline compatible with
        ``ScanEngine(event_callback=...)``.
        """
        if event.type == "SCAN_COMPLETE" and event.result is not None:
            try:
                self.process_result(event.result)
            except Exception as exc:
                logger.debug(
                    "Intelligence pipeline error (non-fatal): %s", exc
                )

    # ------------------------------------------------------------------
    #  Core processing
    # ------------------------------------------------------------------

    def process_result(self, result: ReconProResult) -> IntelligenceReport:
        """Process a scan result through the full intelligence pipeline.

        1. Persist findings to UnifiedMemoryStore.
        2. Update SecurityKnowledgeGraph.
        3. Score finding confidence.
        4. Generate target intelligence.
        5. Compute engineering score.
        6. Persist memory to disk.

        Parameters
        ----------
        result : ReconProResult
            Scan result from ``scanner.scan()`` or ``ScanEngine.run()``.

        Returns
        -------
        IntelligenceReport
            Enriched intelligence data.
        """
        t0 = time.monotonic()
        findings = result.findings
        target = result.target
        scan_dict = result.to_dict()

        # 1. Persist to memory store (findings + graph update).
        try:
            self.memory.add_scan_result(scan_dict)
        except Exception as exc:
            logger.debug("Memory store error: %s", exc)

        # 2. Score confidence.
        confidence_scores: List[Dict[str, Any]] = []
        try:
            scored = self.confidence.score_findings(findings)
            corroborated = self.confidence.corroborate(scored)
            confidence_scores = corroborated
        except Exception as exc:
            logger.debug("Confidence scoring error: %s", exc)

        # 3. Generate target intelligence.
        target_intel: Optional[Dict[str, Any]] = None
        try:
            intel_report = self.target_analyzer.analyze(
                target, confidence_scores or findings
            )
            target_intel = intel_report.to_dict()
        except Exception as exc:
            logger.debug("Target intelligence error: %s", exc)

        # 4. Compute engineering score.
        eng_report: Optional[Dict[str, Any]] = None
        try:
            eng = self.scorer.score(target, confidence_scores or findings, result)
            eng_report = eng.to_dict()
        except Exception as exc:
            logger.debug("Engineering scoring error: %s", exc)

        # 5. Gather stats.
        graph_stats: Optional[Dict[str, Any]] = None
        memory_stats: Optional[Dict[str, Any]] = None
        try:
            graph_stats = self.memory.graph_stats()
        except Exception:
            pass
        try:
            memory_stats = self.memory.stats()
        except Exception:
            pass

        # 6. Persist to disk.
        try:
            self.memory.save()
        except Exception as exc:
            logger.debug("Memory save error: %s", exc)

        elapsed_ms = (time.monotonic() - t0) * 1000.0

        report = IntelligenceReport(
            target=target,
            timestamp=datetime.now(timezone.utc).isoformat(),
            findings_count=len(findings),
            confidence_scores=confidence_scores,
            target_intel=target_intel,
            engineering_report=eng_report,
            graph_stats=graph_stats,
            memory_stats=memory_stats,
            processing_time_ms=elapsed_ms,
        )

        self._last_report = report
        return report

    # ------------------------------------------------------------------
    #  Target profiling
    # ------------------------------------------------------------------

    def get_target_profile(self, target: str) -> Dict[str, Any]:
        """Get intelligence profile for *target* using existing profiler.

        Parameters
        ----------
        target : str
            Domain or URL.

        Returns
        -------
        dict
            TechProfile as dict plus memory stats for the target.
        """
        profile_dict: Dict[str, Any] = dict()

        # Try to get existing findings from memory.
        try:
            findings = self.memory.get_latest_findings(target, limit=50)
            profile_dict["recent_findings_count"] = len(findings)
            profile_dict["recent_findings"] = findings[:10]
            trend = self.memory.trend(target, days=7)
            profile_dict["trend_7d"] = trend
        except Exception:
            profile_dict["recent_findings_count"] = 0

        # Try to get attack surface from knowledge graph.
        try:
            surface = self.memory.get_attack_surface(target)
            profile_dict["attack_surface"] = surface
        except Exception:
            pass

        # Get graph stats.
        try:
            profile_dict["graph_stats"] = self.memory.graph_stats()
        except Exception:
            pass

        return profile_dict

    # ------------------------------------------------------------------
    #  Convenience
    # ------------------------------------------------------------------

    @property
    def last_report(self) -> Optional[IntelligenceReport]:
        """Return the most recently produced IntelligenceReport."""
        return self._last_report
