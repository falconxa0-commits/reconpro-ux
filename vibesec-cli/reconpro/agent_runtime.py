"""ReconPro Agent Runtime — Multi-Agent Orchestration System.

Lightweight in-process multi-agent system where specialized agents collaborate
on security tasks via message passing. Each agent has a role, maintains its own
context, and produces structured results.

Pipeline order: Planner → Recon → Intelligence → Correlation → Reporting

Usage::

    from reconpro.agent_runtime import AgentOrchestrator

    orch = AgentOrchestrator()
    report = orch.run_goal("Full security scan", "example.com")
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from abc import ABC, abstractmethod
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

logger = logging.getLogger(__name__)
console = Console()

# ──────────────────────────────────────────────────────────────────────────────
# Data Classes
# ──────────────────────────────────────────────────────────────────────────────


class AgentRole(str, Enum):
    """Roles available to agents in the runtime."""

    PLANNER = "planner"
    RECON = "recon"
    INTELLIGENCE = "intelligence"
    CORRELATION = "correlation"
    VERIFICATION = "verification"
    REPORTING = "reporting"
    LEARNING = "learning"
    DEFENSE = "defense"


@dataclass
class AgentMessage:
    """Inter-agent communication message."""

    sender: str
    recipient: str  # agent_id or "broadcast"
    msg_type: str  # task_request, result, status_update, error, coordination
    payload: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    correlation_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    in_reply_to: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.correlation_id:
            self.correlation_id = uuid.uuid4().hex[:12]
        if not self.timestamp:
            self.timestamp = time.time()


@dataclass
class AgentContext:
    """Per-agent execution context, injected at initialize time."""

    agent_id: str
    role: str
    target: str
    findings: List[Dict[str, Any]] = field(default_factory=list)
    memory_ref: Optional[Any] = None
    status: str = "idle"  # idle, running, waiting, done, error


@dataclass
class AgentResult:
    """Structured result produced by each agent."""

    agent_id: str
    role: str
    findings: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "role": self.role,
            "findings": self.findings,
            "confidence": self.confidence,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "metadata": self.metadata,
        }


@dataclass
class AutonomousScanReport:
    """Aggregated final report from all agents."""

    goal: str
    target: str
    agent_results: List[Dict[str, Any]] = field(default_factory=list)
    all_findings: List[Dict[str, Any]] = field(default_factory=list)
    execution_plan: Optional[Dict[str, Any]] = None
    correlated_findings: List[Dict[str, Any]] = field(default_factory=list)
    confidence_profile: Dict[str, Any] = field(default_factory=dict)
    total_processing_time_ms: float = 0.0
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal": self.goal,
            "target": self.target,
            "agent_results": self.agent_results,
            "all_findings_count": len(self.all_findings),
            "all_findings": self.all_findings,
            "correlated_findings": self.correlated_findings,
            "confidence_profile": self.confidence_profile,
            "execution_plan": self.execution_plan,
            "total_processing_time_ms": round(self.total_processing_time_ms, 2),
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


# ──────────────────────────────────────────────────────────────────────────────
# Abstract Base Agent
# ──────────────────────────────────────────────────────────────────────────────


class AgentBase(ABC):
    """Abstract base class for all agents.

    Subclasses must implement :meth:`execute`.  The base class provides
    messaging infrastructure, context management, and error-safe execution.
    """

    _id_counter: Dict[str, int] = defaultdict(int)

    def __init__(self, role: str, agent_id: Optional[str] = None) -> None:
        AgentBase._id_counter[role] += 1
        self.agent_id: str = agent_id or f"{role}-{AgentBase._id_counter[role]}"
        self.role: str = role
        self._context: Optional[AgentContext] = None
        self._inbox: List[AgentMessage] = []
        self._outbox: List[AgentMessage] = []
        self._send_fn: Optional[Callable] = None
        self._status: str = "idle"

    # ── Properties ────────────────────────────────────────────────────────

    @property
    def context(self) -> Optional[AgentContext]:
        return self._context

    @property
    def role_name(self) -> str:
        return self.role

    # ── Lifecycle ─────────────────────────────────────────────────────────

    def initialize(self, context: AgentContext) -> None:
        """Set up the agent with execution context and wiring."""
        self._context = context
        self._status = "idle"

    def set_send_fn(self, fn: Callable) -> None:
        """Wire the send function for inter-agent messaging."""
        self._send_fn = fn

    @abstractmethod
    def execute(self, task: Dict[str, Any]) -> AgentResult:
        """Execute the agent's primary task.

        Must return an AgentResult.  Implementations should handle import
        errors gracefully — an agent degrades but never crashes the runtime.
        """

    def receive(self, message: AgentMessage) -> None:
        """Accept an incoming message into the agent's inbox."""
        self._inbox.append(message)
        if message.msg_type == "task_request":
            self._status = "waiting"

    def send(
        self,
        recipient: str,
        msg_type: str,
        payload: Dict[str, Any],
        correlation_id: Optional[str] = None,
        in_reply_to: Optional[str] = None,
    ) -> None:
        """Queue a message for delivery.

        If a send function was wired via :meth:`set_send_fn`, the message is
        delivered immediately.  Otherwise it accumulates in the outbox.
        """
        msg = AgentMessage(
            sender=self.agent_id,
            recipient=recipient,
            msg_type=msg_type,
            payload=payload,
            correlation_id=correlation_id or uuid.uuid4().hex[:12],
            in_reply_to=in_reply_to,
        )
        if self._send_fn is not None:
            self._send_fn(msg)
        else:
            self._outbox.append(msg)

    def get_status(self) -> str:
        """Return current agent status string."""
        return self._status

    def _set_status(self, status: str) -> None:
        self._status = status


# ──────────────────────────────────────────────────────────────────────────────
# Concrete Agent Classes
# ──────────────────────────────────────────────────────────────────────────────


class PlannerAgent(AgentBase):
    """Analyzes the goal, selects modules, and creates an execution plan.

    Delegates to DecisionEngine when available; falls back to built-in
    heuristic planning.
    """

    def __init__(self) -> None:
        super().__init__(role=AgentRole.PLANNER)
        self._plan: Dict[str, Any] = {}

    def execute(self, task: Dict[str, Any]) -> AgentResult:
        t0 = time.monotonic()
        goal = task.get("goal", "")
        target = task.get("target", "")

        self._set_status("running")
        findings: List[Dict[str, Any]] = []

        try:
            # Try importing DecisionEngine for smart planning
            from .decision_engine import DecisionEngine
            from .scanner import MODULE_REGISTRY, LOCAL_MODULES

            engine = DecisionEngine()
            available = list(MODULE_REGISTRY.keys()) + list(LOCAL_MODULES.keys())

            is_local = any(
                w in goal.lower()
                for w in ["local", "machine", "laptop", "localhost", "audit"]
            )
            candidates = (
                list(LOCAL_MODULES.keys()) if is_local
                else list(MODULE_REGISTRY.keys())
            )
            scan_plan = engine.plan_scan(target, candidates)
            self._plan = {
                "target": scan_plan.target,
                "target_type": scan_plan.target_type,
                "modules": scan_plan.modules_to_run,
                "order": scan_plan.order,
                "skip_reasons": scan_plan.skip_reasons,
                "estimated_time": scan_plan.estimated_time,
                "throttle_flags": scan_plan.throttle_flags,
            }
            findings.append(
                {
                    "title": "Execution Plan Generated",
                    "category": "planning",
                    "severity": "info",
                    "details": self._plan,
                }
            )
        except Exception as exc:
            logger.debug("PlannerAgent DecisionEngine fallback: %s", exc)
            # Fallback: simple heuristic plan
            self._plan = self._heuristic_plan(goal, target)
            findings.append(
                {
                    "title": "Execution Plan (Heuristic)",
                    "category": "planning",
                    "severity": "info",
                    "details": self._plan,
                }
            )

        elapsed = (time.monotonic() - t0) * 1000
        self._set_status("done")
        return AgentResult(
            agent_id=self.agent_id,
            role=self.role,
            findings=findings,
            confidence=0.9,
            processing_time_ms=elapsed,
            metadata={"plan": self._plan},
        )

    def _heuristic_plan(
        self, goal: str, target: str
    ) -> Dict[str, Any]:
        """Built-in fallback planner when DecisionEngine is unavailable."""
        is_local = any(
            w in goal.lower()
            for w in ["local", "machine", "laptop", "localhost", "audit"]
        )
        is_full = any(
            w in goal.lower()
            for w in ["full", "everything", "all", "deep", "complete"]
        )
        if is_local:
            modules = (
                ["host", "dev", "doctor", "iac_audit", "container_sec"]
                if is_full
                else ["host", "dev", "doctor"]
            )
        else:
            modules = (
                ["recon", "auth", "chain", "oblivion", "gorgon", "bot", "pegasus", "nhi", "cloud_recon"]
                if is_full
                else ["recon", "auth", "chain", "oblivion", "gorgon"]
            )
        return {
            "target": target,
            "target_type": "local" if is_local else "remote",
            "modules": modules,
            "order": modules,
            "skip_reasons": {},
            "estimated_time": sum(15 if not is_local else 10 for _ in modules),
            "throttle_flags": ["fast_mode"] if is_local else [],
        }

    @property
    def plan(self) -> Dict[str, Any]:
        return self._plan


class ReconAgent(AgentBase):
    """Runs scan modules against the target and collects findings.

    Dispatches to ``scanner.scan()`` for remote targets or
    ``scanner.audit_scan()`` for local targets.
    """

    def __init__(self) -> None:
        super().__init__(role=AgentRole.RECON)

    def execute(self, task: Dict[str, Any]) -> AgentResult:
        t0 = time.monotonic()
        self._set_status("running")
        findings: List[Dict[str, Any]] = []
        modules = task.get("modules", [])
        target = task.get("target", "")
        metadata: Dict[str, Any] = {"modules_run": []}

        try:
            from .scanner import scan, audit_scan

            is_local = task.get("target_type") == "local" or target in (
                "localhost", ".", "local-audit"
            )

            if is_local:
                result = audit_scan(target=target if target != "localhost" else ".")
                findings = list(result.findings)
                metadata["modules_run"] = result.modules_run
                metadata["total_score"] = result.total_score
                metadata["grade"] = result.grade
            elif target:
                result = scan(target, modules=modules if modules else None)
                findings = list(result.findings)
                metadata["modules_run"] = result.modules_run
                metadata["total_score"] = result.total_score
                metadata["grade"] = result.grade
            else:
                findings.append(
                    {"title": "No target specified", "severity": "low", "category": "recon"}
                )
        except Exception as exc:
            logger.warning("ReconAgent scan error: %s", exc)
            findings.append(
                {
                    "title": "Recon scan error",
                    "severity": "medium",
                    "category": "recon",
                    "evidence": str(exc),
                }
            )

        elapsed = (time.monotonic() - t0) * 1000
        self._set_status("done")
        return AgentResult(
            agent_id=self.agent_id,
            role=self.role,
            findings=findings,
            confidence=0.85,
            processing_time_ms=elapsed,
            metadata=metadata,
        )


class IntelligenceAgent(AgentBase):
    """Scores finding confidence and generates target intelligence profiles.

    Uses ConfidenceEngine for scoring and TargetIntelligence for profiling.
    """

    def __init__(self) -> None:
        super().__init__(role=AgentRole.INTELLIGENCE)

    def execute(self, task: Dict[str, Any]) -> AgentResult:
        t0 = time.monotonic()
        self._set_status("running")
        findings = list(task.get("findings", []))
        target = task.get("target", "")
        confidence_profile: Dict[str, Any] = {"scores": [], "average": 0.0}
        metadata: Dict[str, Any] = {}

        # Score findings via ConfidenceEngine
        try:
            from .confidence_engine import ConfidenceEngine

            engine = ConfidenceEngine()
            scored = engine.score_findings(findings)
            findings = scored  # enriched with "confidence" key
            scores = [f.get("confidence", 0.0) for f in findings]
            confidence_profile["scores"] = scores
            confidence_profile["average"] = (
                round(sum(scores) / len(scores), 4) if scores else 0.0
            )
            confidence_profile["high_confidence"] = sum(
                1 for s in scores if s >= 0.7
            )
        except Exception as exc:
            logger.debug("IntelligenceAgent confidence scoring skipped: %s", exc)

        # Generate target profile
        try:
            from .target_intelligence import TargetIntelligence

            ti = TargetIntelligence()
            profile = ti.analyze(findings, target=target)
            metadata["target_profile"] = profile.to_dict() if hasattr(profile, "to_dict") else profile
        except Exception as exc:
            logger.debug("IntelligenceAgent target profiling skipped: %s", exc)

        elapsed = (time.monotonic() - t0) * 1000
        self._set_status("done")
        return AgentResult(
            agent_id=self.agent_id,
            role=self.role,
            findings=findings,
            confidence=confidence_profile.get("average", 0.0),
            processing_time_ms=elapsed,
            metadata={"confidence_profile": confidence_profile, **metadata},
        )


class CorrelationAgent(AgentBase):
    """Cross-references findings from multiple agents to identify patterns.

    Detects corroborated findings (same issue from multiple sources),
    severity escalation chains, and related attack surfaces.
    """

    def __init__(self) -> None:
        super().__init__(role=AgentRole.CORRELATION)

    def execute(self, task: Dict[str, Any]) -> AgentResult:
        t0 = time.monotonic()
        self._set_status("running")
        all_findings = list(task.get("findings", []))
        agent_results = task.get("agent_results", [])

        # Build a title+category fingerprint map
        fingerprint_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for f in all_findings:
            key = (
                str(f.get("title", ""))
                + "|"
                + str(f.get("category", ""))
            )
            fingerprint_map[key].append(f)

        correlated: List[Dict[str, Any]] = []
        severity_counts: Dict[str, int] = Counter()

        # Identify corroborated findings (same issue from different modules)
        for key, group in fingerprint_map.items():
            if len(group) > 1:
                sources = list({f.get("source", f.get("module", "unknown")) for f in group})
                max_sev = self._max_severity(group)
                correlated.append(
                    {
                        "title": group[0].get("title", "Correlated Finding"),
                        "category": group[0].get("category", "unknown"),
                        "severity": max_sev,
                        "corroboration_count": len(group),
                        "sources": sources,
                        "type": "corroborated",
                    }
                )
            severity_counts[group[0].get("severity", "info")] += len(group)

        # Build severity escalation chain
        escalation_chain = []
        for sev in ("critical", "high", "medium", "low", "info"):
            if severity_counts.get(sev, 0) > 0:
                escalation_chain.append(
                    {"severity": sev, "count": severity_counts[sev]}
                )

        elapsed = (time.monotonic() - t0) * 1000
        self._set_status("done")
        return AgentResult(
            agent_id=self.agent_id,
            role=self.role,
            findings=correlated,
            confidence=0.8 if correlated else 0.5,
            processing_time_ms=elapsed,
            metadata={
                "total_unique": len(fingerprint_map),
                "total_correlated": len(correlated),
                "severity_breakdown": dict(severity_counts),
                "escalation_chain": escalation_chain,
            },
        )

    @staticmethod
    def _max_severity(group: List[Dict[str, Any]]) -> str:
        """Return the highest severity from a group of findings."""
        _SEV_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
        best = "info"
        for f in group:
            s = str(f.get("severity", "info")).lower()
            if _SEV_RANK.get(s, 0) > _SEV_RANK.get(best, 0):
                best = s
        return best


class ReportingAgent(AgentBase):
    """Formats aggregated results into a structured AutonomousScanReport."""

    def __init__(self) -> None:
        super().__init__(role=AgentRole.REPORTING)

    def execute(self, task: Dict[str, Any]) -> AgentResult:
        t0 = time.monotonic()
        self._set_status("running")

        all_findings = list(task.get("findings", []))
        correlated = task.get("correlated_findings", [])
        execution_plan = task.get("execution_plan")
        goal = task.get("goal", "")
        target = task.get("target", "")
        confidence_profile = task.get("confidence_profile", {})
        total_time = task.get("total_time_ms", 0.0)

        # Severity summary
        sev_counts: Dict[str, int] = Counter()
        for f in all_findings:
            sev_counts[f.get("severity", "info")] += 1

        # Top critical/high findings
        top_findings = sorted(
            [f for f in all_findings if f.get("severity") in ("critical", "high")],
            key=lambda x: x.get("points_deducted", 0),
            reverse=True,
        )[:10]

        report_data = {
            "goal": goal,
            "target": target,
            "total_findings": len(all_findings),
            "severity_summary": dict(sev_counts),
            "correlated_count": len(correlated),
            "top_critical_findings": top_findings,
            "confidence_profile": confidence_profile,
            "execution_plan": execution_plan,
        }

        elapsed = (time.monotonic() - t0) * 1000
        self._set_status("done")
        return AgentResult(
            agent_id=self.agent_id,
            role=self.role,
            findings=[report_data],
            confidence=1.0,
            processing_time_ms=elapsed,
            metadata={"report_type": "autonomous_summary"},
        )


# ──────────────────────────────────────────────────────────────────────────────
# Agent Orchestrator — The Runtime
# ──────────────────────────────────────────────────────────────────────────────

# Default pipeline: Planner → Recon → Intelligence → Correlation → Reporting
_DEFAULT_PIPELINE: List[Tuple[str, type]] = [
    (AgentRole.PLANNER, PlannerAgent),
    (AgentRole.RECON, ReconAgent),
    (AgentRole.INTELLIGENCE, IntelligenceAgent),
    (AgentRole.CORRELATION, CorrelationAgent),
    (AgentRole.REPORTING, ReportingAgent),
]


class AgentOrchestrator:
    """In-process multi-agent orchestrator.

    Registers agents, routes messages, and coordinates the execution
    pipeline: Planner → Recon → Intelligence → Correlation → Reporting.

    Usage::

        orch = AgentOrchestrator()
        report = orch.run_goal("Full security scan", "example.com")
        print(report.to_dict())
    """

    def __init__(
        self,
        pipeline: Optional[List[Tuple[str, type]]] = None,
        memory_ref: Optional[Any] = None,
    ) -> None:
        self._agents: Dict[str, AgentBase] = {}
        self._message_log: List[AgentMessage] = []
        self._lock = threading.RLock()
        self._pipeline = pipeline or _DEFAULT_PIPELINE
        self._memory_ref = memory_ref

    # ── Registration ─────────────────────────────────────────────────────

    def register(self, agent: AgentBase) -> None:
        """Register an agent with the orchestrator.

        The agent is wired with the orchestrator's message routing function
        so it can send/receive messages.
        """
        with self._lock:
            self._agents[agent.agent_id] = agent
            agent.set_send_fn(self._route_message)

    # ── Messaging ─────────────────────────────────────────────────────────

    def broadcast(self, message_type: str, payload: Dict[str, Any]) -> None:
        """Send a message to all registered agents."""
        with self._lock:
            for agent_id in list(self._agents.keys()):
                msg = AgentMessage(
                    sender="orchestrator",
                    recipient=agent_id,
                    msg_type=message_type,
                    payload=payload,
                )
                self._route_message(msg)

    def _route_message(self, msg: AgentMessage) -> None:
        """Route an AgentMessage to its recipient(s)."""
        with self._lock:
            self._message_log.append(msg)

        if msg.recipient == "broadcast":
            for agent in self._agents.values():
                agent.receive(msg)
        elif msg.recipient in self._agents:
            self._agents[msg.recipient].receive(msg)
        else:
            logger.debug("No agent with id '%s' — message dropped.", msg.recipient)

    # ── Status ────────────────────────────────────────────────────────────

    def get_agent_status(self) -> Dict[str, str]:
        """Return a mapping of agent_id → status for all registered agents."""
        with self._lock:
            return {
                aid: a.get_status() for aid, a in self._agents.items()
            }

    # ── Goal Execution ────────────────────────────────────────────────────

    def run_goal(self, goal: str, target: str) -> Dict[str, Any]:
        """Orchestrate all agents to accomplish a goal against a target.

        Executes the pipeline in order, passing accumulated results between
        stages.  Returns the final AutonomousScanReport as a dict.
        """
        wall_start = time.monotonic()
        console.print(
            Panel(
                f"Goal: [bold cyan]{goal}[/]\nTarget: [bold]{target}[/]",
                title="[bold bright_magenta]Agent Runtime[/]",
                border_style="bright_magenta",
            )
        )

        # 1. Instantiate and register agents from the pipeline
        agents: List[AgentBase] = []
        for role_name, agent_cls in self._pipeline:
            agent = agent_cls()
            ctx = AgentContext(
                agent_id=agent.agent_id,
                role=role_name,
                target=target,
                memory_ref=self._memory_ref,
            )
            agent.initialize(ctx)
            self.register(agent)
            agents.append(agent)

        # 2. Shared state that flows through the pipeline
        shared: Dict[str, Any] = {
            "goal": goal,
            "target": target,
            "findings": [],
            "agent_results": [],
            "execution_plan": None,
            "correlated_findings": [],
            "confidence_profile": {},
        }

        # 3. Execute pipeline stages sequentially
        for agent in agents:
            stage_name = agent.role_name.upper()
            console.print(
                f"\n  [bold bright_yellow]▶ {stage_name}[/] "
                f"[dim]({agent.agent_id})[/]"
            )

            try:
                result = agent.execute(shared)
            except Exception as exc:
                logger.error(
                    "Agent %s crashed: %s", agent.agent_id, exc, exc_info=True
                )
                result = AgentResult(
                    agent_id=agent.agent_id,
                    role=agent.role,
                    findings=[
                        {
                            "title": f"Agent {agent.agent_id} error",
                            "severity": "low",
                            "category": "runtime",
                            "evidence": str(exc),
                        }
                    ],
                    confidence=0.0,
                    processing_time_ms=0.0,
                    metadata={"error": str(exc)},
                )

            shared["agent_results"].append(result.to_dict())

            # Planner: extract execution plan
            if isinstance(agent, PlannerAgent):
                shared["execution_plan"] = result.metadata.get("plan", {})

            # Recon: accumulate raw findings
            if isinstance(agent, ReconAgent):
                shared["findings"].extend(result.findings)

            # Intelligence: keep confidence profile, keep enriched findings
            if isinstance(agent, IntelligenceAgent):
                shared["confidence_profile"] = result.metadata.get(
                    "confidence_profile", {}
                )
                # Replace findings with enriched (confidence-scored) versions
                if result.findings and any(
                    "confidence" in f for f in result.findings
                ):
                    shared["findings"] = result.findings

            # Correlation: extract correlated findings
            if isinstance(agent, CorrelationAgent):
                shared["correlated_findings"] = result.findings

            # Print stage summary
            n_findings = len(result.findings)
            ms = result.processing_time_ms
            conf = result.confidence
            console.print(
                f"    [dim]{n_findings} findings | "
                f"{ms:.0f}ms | "
                f"confidence={conf:.2f}[/]"
            )

        # 4. Assemble final report
        total_ms = (time.monotonic() - wall_start) * 1000
        shared["total_time_ms"] = total_ms

        report = AutonomousScanReport(
            goal=goal,
            target=target,
            agent_results=shared["agent_results"],
            all_findings=shared["findings"],
            execution_plan=shared["execution_plan"],
            correlated_findings=shared["correlated_findings"],
            confidence_profile=shared["confidence_profile"],
            total_processing_time_ms=total_ms,
            metadata={
                "agents_used": len(agents),
                "pipeline": [a.role_name for a in agents],
            },
        )

        self._print_summary(report)

        # 5. Clean up registered agents
        with self._lock:
            for agent in agents:
                self._agents.pop(agent.agent_id, None)

        return report.to_dict()

    # ── Summary Display ────────────────────────────────────────────────────

    def _print_summary(self, report: AutonomousScanReport) -> None:
        """Print a summary table of the completed run."""
        table = Table(
            title="Agent Runtime Summary",
            show_header=True,
            header_style="bold bright_cyan",
            border_style="dim",
        )
        table.add_column("Agent", style="bright_white")
        table.add_column("Findings", justify="right", style="bright_yellow")
        table.add_column("Confidence", justify="right", style="green")
        table.add_column("Time (ms)", justify="right", style="bright_blue")

        for ar in report.agent_results:
            table.add_row(
                ar["role"],
                str(len(ar["findings"])),
                f"{ar['confidence']:.2f}",
                f"{ar['processing_time_ms']:.0f}",
            )

        table.add_section()
        table.add_row(
            "[bold]TOTAL[/]",
            str(len(report.all_findings)),
            f"{report.confidence_profile.get('average', 0):.2f}",
            f"{report.total_processing_time_ms:.0f}",
        )

        console.print()
        console.print(table)
        console.print(
            f"\n  [bold bright_green]Runtime complete.[/] "
            f"{len(report.all_findings)} findings across "
            f"{len(report.agent_results)} agents "
            f"in {report.total_processing_time_ms:.0f}ms.\n"
        )
