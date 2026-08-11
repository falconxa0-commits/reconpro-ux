"""Autonomous Planning Engine — Goal-Driven Scan Orchestration.

Transforms ReconPro from a fixed-workflow scanner into a goal-driven
autonomous system. Users state GOALS, not modules. The planner converts
goals into phased execution strategies with dependencies, parallelism,
and resource estimates.

Goal types supported:
    recon, audit, compliance, attack_surface, full_assessment, cloud_audit, code_review
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

from .decision_engine import DecisionEngine, _MODULE_TIME, _TARGET_MODULE_HINTS
from .scanner import MODULE_REGISTRY, LOCAL_MODULES, ALL_MODULES

logger = logging.getLogger(__name__)


# ── Goal type keywords ──────────────────────────────────────────────────

_GOAL_KEYWORDS: Dict[str, List[str]] = {
    "recon": ["recon", "reconnaissance", "enumerate", "discover", "map", "footprint"],
    "audit": ["audit", "assess", "evaluate", "test", "scan", "check", "examine", "pen"],
    "compliance": ["compliance", "compliant", "regulation", "pci", "hipaa", "gdpr", "soc2",
                    "standard", "policy", "framework", "baseline"],
    "attack_surface": ["attack surface", "attack vectors", "exposure", "entry points",
                        "external attack", "internet-facing"],
    "full_assessment": ["full", "comprehensive", "complete", "thorough", "deep",
                         "everything", "all modules", "maximum"],
    "cloud_audit": ["cloud", "aws", "azure", "gcp", "s3", "container", "kubernetes",
                    "docker", "iac", "terraform", "infrastructure"],
    "code_review": ["code", "source", "repository", "repo", "sast", "static analysis",
                     "dependency", "dependencies", "supply chain", "sbom"],
}

# ── Goal → module mappings (heuristic) ──────────────────────────────────
# Each entry: (remote_modules, local_modules, dependency_graph)

_GOAL_MODULE_MAP: Dict[str, Dict[str, Any]] = {
    "recon": {
        "remote": ["recon", "subdomains", "nhi", "cloud_recon"],
        "local": [],
        "dependencies": {"subdomains": ["recon"], "nhi": ["recon"], "cloud_recon": ["recon"]},
        "success_criteria": {"min_findings": 1, "coverage": "dns_enumeration"},
    },
    "audit": {
        "remote": ["recon", "auth", "chain", "oblivion", "gorgon", "bot", "pegasus", "vibesec"],
        "local": ["host", "dev", "doctor"],
        "dependencies": {"auth": ["recon"], "chain": ["recon"],
                         "oblivion": ["recon"], "gorgon": ["recon", "auth"],
                         "bot": ["recon"], "pegasus": ["recon", "auth", "chain"]},
        "success_criteria": {"min_findings": 0, "severity_coverage": ["critical", "high", "medium", "low"]},
    },
    "compliance": {
        "remote": ["recon", "auth", "nhi"],
        "local": ["doctor", "iac_audit", "dev", "container_sec"],
        "dependencies": {"auth": ["recon"], "nhi": ["recon"],
                         "iac_audit": ["recon"], "container_sec": ["recon"]},
        "success_criteria": {"compliance_score": 70.0, "categories_covered": 4},
    },
    "attack_surface": {
        "remote": ["recon", "cloud_recon"],
        "local": ["host"],
        "dependencies": {"host": ["recon"],
                         "cloud_recon": ["recon"]},
        "success_criteria": {"min_findings": 1, "exposure_types": ["subdomain", "host", "cloud"]},
    },
    "full_assessment": {
        "remote": list(MODULE_REGISTRY.keys()),
        "local": list(LOCAL_MODULES.keys()),
        "dependencies": {"auth": ["recon"], "chain": ["recon"],
                         "bot": ["recon"], "gorgon": ["recon", "auth"],
                         "oblivion": ["recon"], "nhi": ["recon"],
                         "pegasus": ["recon", "auth", "chain"],
                         "cloud_recon": ["recon", "subdomains"],
                         "subdomains": ["recon"],
                         "vibesec": ["recon", "auth", "chain"],
                         "host": ["recon"], "dev": ["recon"],
                         "iac_audit": ["recon", "dev"], "container_sec": ["recon"]},
        "success_criteria": {"min_findings": 0, "all_modules_complete": True},
    },
    "cloud_audit": {
        "remote": ["recon", "cloud_recon", "subdomains"],
        "local": ["iac_audit", "container_sec", "dev"],
        "dependencies": {"cloud_recon": ["recon"], "subdomains": ["recon"],
                         "iac_audit": ["recon"], "container_sec": ["recon", "cloud_recon"],
                         "dev": ["recon"]},
        "success_criteria": {"cloud_services_found": 1, "iac_issues": 0},
    },
    "code_review": {
        "remote": ["recon", "nhi"],
        "local": ["dev", "doctor"],
        "dependencies": {"nhi": ["recon"], "dev": ["recon"], "doctor": ["dev"]},
        "success_criteria": {"dependency_issues": 0, "code_quality_score": 70.0},
    },
}

# ── Module resource cost profiles ───────────────────────────────────────

_MODULE_CPU: Dict[str, str] = {
    "recon": "low", "auth": "medium", "chain": "medium", "bot": "low",
    "gorgon": "high", "oblivion": "high", "vibesec": "medium", "nhi": "low",
    "host": "low", "dev": "medium", "doctor": "low", "subdomains": "medium",
    "pegasus": "high", "cloud_recon": "medium", "api_discovery": "medium",
    "browser": "high", "fuzzer": "high", "cve_radar": "medium",
    "compliance": "low", "passive_intel": "low", "iac_audit": "medium",
    "container_sec": "medium", "team": "low",
}

_CPU_WEIGHT: Dict[str, int] = {"low": 1, "medium": 2, "high": 3}


# ── Data classes ────────────────────────────────────────────────────────


@dataclass
class ExecutionPhase:
    """A single phase within an execution strategy.

    Each phase groups one or more modules that share the same execution
    constraints (timeout, retry, parallelism, dependencies).
    """
    name: str
    module_group: List[str]
    parallel: bool = True
    timeout: float = 120.0
    retry_count: int = 1
    depends_on: List[str] = field(default_factory=list)
    success_criteria: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "module_group": self.module_group,
            "parallel": self.parallel,
            "timeout": self.timeout,
            "retry_count": self.retry_count,
            "depends_on": self.depends_on,
            "success_criteria": self.success_criteria,
        }


@dataclass
class ResourceEstimate:
    """Estimated resource requirements for an execution strategy."""
    cpu_estimate: str  # low / medium / high
    ram_estimate_mb: int
    network_requests: int
    wall_time_seconds: float
    concurrency_level: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cpu_estimate": self.cpu_estimate,
            "ram_estimate_mb": self.ram_estimate_mb,
            "network_requests": self.network_requests,
            "wall_time_seconds": round(self.wall_time_seconds, 1),
            "concurrency_level": self.concurrency_level,
        }


@dataclass
class ExecutionStrategy:
    """Complete execution plan produced by the AutonomousPlanner.

    Contains phased module execution with dependency ordering,
    parallelism groups, resource estimates, and a rollback plan.
    """
    goal_type: str
    target: str
    phases: List[ExecutionPhase]
    total_estimated_time: float
    required_modules: List[str]
    dependencies: Dict[str, List[str]]
    confidence_threshold: float = 0.7
    parallel_groups: List[List[str]] = field(default_factory=list)
    rollback_plan: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal_type": self.goal_type,
            "target": self.target,
            "phases": [p.to_dict() for p in self.phases],
            "total_estimated_time": round(self.total_estimated_time, 1),
            "required_modules": self.required_modules,
            "dependencies": self.dependencies,
            "confidence_threshold": self.confidence_threshold,
            "parallel_groups": self.parallel_groups,
            "rollback_plan": self.rollback_plan,
        }


# ── Goal Parser ─────────────────────────────────────────────────────────


class GoalParser:
    """Parses natural language goal text into structured objectives.

    Extracts target, classifies goal type, and identifies constraints
    such as timeout limits, scan depth, and explicit module selections.
    """

    # Regex patterns for target extraction
    _URL_RE = re.compile(r"https?://[\w\-._~:/?#\[\]@!$&'()*+,;=%]+")
    _DOMAIN_RE = re.compile(r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)"
                            r"[a-zA-Z]{2,}\b")
    _IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
    _TIMEOUT_RE = re.compile(r"(?:timeout|time.?limit|within)?\s*(\d+)\s*(?:sec|seconds?|mins?|minutes?|hours?)")
    _DEPTH_RE = re.compile(r"depth[\s:=-]+(shallow|medium|deep|aggressive)")
    _MODULE_RE = re.compile(r"(?:module|only|just)[s\s:]+([\w,\s]+)")

    def parse(self, goal: str) -> Dict[str, Any]:
        """Parse a natural language goal into a structured objective.

        Args:
            goal: Natural language goal string.

        Returns:
            Dict with keys: target, goal_type, constraints.
        """
        goal_lower = goal.lower()
        target = self._extract_target(goal)
        goal_type = self._classify_goal(goal_lower)
        constraints = self._extract_constraints(goal, goal_lower)

        logger.info("Parsed goal: type=%s target=%s constraints=%s",
                     goal_type, target or "<none>", constraints)

        return {
            "target": target,
            "goal_type": goal_type,
            "constraints": constraints,
            "raw_goal": goal,
        }

    def _extract_target(self, text: str) -> Optional[str]:
        """Extract the target (URL, domain, or IP) from goal text."""
        # Try URL first (most specific).
        url_match = self._URL_RE.search(text)
        if url_match:
            return url_match.group(0)

        # Try IP address.
        ip_match = self._IP_RE.search(text)
        if ip_match:
            candidate = ip_match.group(0)
            # Make sure it's not a version number like 9.0.0
            parts = candidate.split(".")
            if all(0 <= int(p) <= 255 for p in parts):
                return candidate

        # Try domain (pick last domain-like token that isn't a keyword).
        domain_match = self._DOMAIN_RE.search(text)
        if domain_match:
            candidate = domain_match.group(0)
            noise = {"com", "org", "net", "io", "dev", "http", "https", "www"}
            if candidate.lower().rstrip(".") not in noise:
                return candidate

        return None

    def _classify_goal(self, text: str) -> str:
        """Classify the goal type based on keyword matching.

        Returns one of the recognized goal type strings.  Tries more
        specific types before falling back to generic 'audit'.
        """
        # Score each goal type by number of keyword hits.
        scores: Dict[str, int] = {}
        for goal_type, keywords in _GOAL_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            scores[goal_type] = score

        if not scores or max(scores.values()) == 0:
            return "audit"  # sensible default

        # Prefer the highest-scoring type; break ties by specificity order.
        priority_order = [
            "compliance", "cloud_audit", "code_review", "attack_surface",
            "full_assessment", "recon", "audit",
        ]
        max_score = max(scores.values())
        for gt in priority_order:
            if scores.get(gt, 0) == max_score:
                return gt

        return max(scores, key=scores.get)  # type: ignore[arg-type]

    def _extract_constraints(self, text: str, text_lower: str) -> Dict[str, Any]:
        """Extract constraints from goal text.

        Looks for timeout, depth, and explicit module specifications.
        """
        constraints: Dict[str, Any] = {}

        # Timeout.
        timeout_match = self._TIMEOUT_RE.search(text_lower)
        if timeout_match:
            value = int(timeout_match.group(1))
            unit = timeout_match.group(0).split()[-1]
            if unit.startswith("min"):
                value *= 60
            elif unit.startswith("hour"):
                value *= 3600
            constraints["timeout"] = float(value)

        # Depth.
        depth_match = self._DEPTH_RE.search(text_lower)
        if depth_match:
            constraints["depth"] = depth_match.group(1)

        # Explicit modules.
        module_match = self._MODULE_RE.search(text_lower)
        if module_match:
            mods = [m.strip() for m in module_match.group(1).split(",")
                    if m.strip() in ALL_MODULES]
            if mods:
                constraints["modules"] = mods

        return constraints


# ── Autonomous Planner ──────────────────────────────────────────────────


class AutonomousPlanner:
    """Goal-driven autonomous scan planner.

    Converts natural language goals into phased ExecutionStrategy objects
    with dependency ordering, parallel execution groups, and resource
    estimates.  Integrates with DecisionEngine for target classification
    and module relevance scoring.
    """

    def __init__(self) -> None:
        self._parser = GoalParser()
        self._decision = DecisionEngine()

    def plan(self, goal: str, context: Optional[Dict[str, Any]] = None) -> ExecutionStrategy:
        """Create an ExecutionStrategy from a natural language goal.

        Args:
            goal:    Natural language description of the security goal.
            context: Optional dict with extra context (e.g. previous results,
                     environment hints, learning data).

        Returns:
            ExecutionStrategy ready for execution by ScanEngine.
        """
        ctx = context or {}
        parsed = self._parser.parse(goal)
        goal_type = parsed["goal_type"]
        target = parsed["target"] or ctx.get("target", "unknown")
        constraints = parsed["constraints"]

        # Merge any context-level constraints.
        if "timeout" in ctx and "timeout" not in constraints:
            constraints["timeout"] = float(ctx["timeout"])
        if "modules" in ctx and "modules" not in constraints:
            constraints["modules"] = ctx["modules"]

        # Get the goal module template.
        template = _GOAL_MODULE_MAP.get(goal_type, _GOAL_MODULE_MAP["audit"])

        # Resolve available modules (intersection of template and registry).
        available_remote = [m for m in template["remote"] if m in MODULE_REGISTRY]
        available_local = [m for m in template["local"] if m in LOCAL_MODULES]

        # Apply explicit module constraint if provided.
        if "modules" in constraints:
            allowed = set(constraints["modules"])
            available_remote = [m for m in available_remote if m in allowed]
            available_local = [m for m in available_local if m in allowed]

        # Build dependency graph (only for available modules).
        raw_deps = template.get("dependencies", {})
        all_available = set(available_remote + available_local)
        dependencies: Dict[str, List[str]] = {
            m: [d for d in deps if d in all_available]
            for m, deps in raw_deps.items()
            if m in all_available
        }

        # Build phases using topological grouping.
        phases = self._build_phases(
            available_remote, available_local, dependencies,
            constraints, template.get("success_criteria", {}),
        )

        # Compute parallel groups from phases.
        parallel_groups = [
            phase.module_group for phase in phases if phase.parallel and phase.module_group
        ]

        # Estimate total time.
        all_modules = available_remote + available_local
        total_time = sum(_MODULE_TIME.get(m, 15.0) for m in all_modules)
        if "timeout" in constraints:
            total_time = min(total_time, constraints["timeout"])

        # Build rollback plan.
        rollback_plan = self._build_rollback(all_modules, goal_type)

        # Confidence threshold depends on goal specificity.
        confidence = 0.7 if goal_type in ("recon", "audit") else 0.8
        if "depth" in constraints and constraints["depth"] in ("deep", "aggressive"):
            confidence = 0.9

        strategy = ExecutionStrategy(
            goal_type=goal_type,
            target=target,
            phases=phases,
            total_estimated_time=round(total_time, 1),
            required_modules=all_modules,
            dependencies=dependencies,
            confidence_threshold=confidence,
            parallel_groups=parallel_groups,
            rollback_plan=rollback_plan,
        )

        logger.info("Planned strategy: %d phases, %d modules, ~%.1fs",
                     len(phases), len(all_modules), total_time)
        return strategy

    def replan(
        self,
        strategy: ExecutionStrategy,
        results: Dict[str, Any],
    ) -> ExecutionStrategy:
        """Adjust an existing strategy based on partial execution results.

        Removes completed modules, adds newly-discovered modules,
        adjusts timeouts, and re-orders remaining work.

        Args:
            strategy: The original ExecutionStrategy.
            results:  Dict of module_id -> result data (findings, errors, etc.).

        Returns:
            A new ExecutionStrategy reflecting the updated plan.
        """
        completed = set()
        failed = set()
        findings_count = 0

        for mod_id, result in results.items():
            if isinstance(result, dict) and result.get("error"):
                failed.add(mod_id)
            else:
                completed.add(mod_id)
                if isinstance(result, dict):
                    findings_count += result.get("findings_count", result.get("count", 0))

        # Remove completed and failed modules from required list.
        remaining = [m for m in strategy.required_modules
                     if m not in completed and m not in failed]

        # If many findings, lower confidence threshold (we have enough data).
        new_confidence = strategy.confidence_threshold
        if findings_count > 20:
            new_confidence = max(0.5, new_confidence - 0.1)

        # Rebuild phases with only remaining modules.
        remaining_deps = {
            m: [d for d in deps if d not in completed]
            for m, deps in strategy.dependencies.items()
            if m in remaining
        }

        remaining_remote = [m for m in remaining if m in MODULE_REGISTRY]
        remaining_local = [m for m in remaining if m in LOCAL_MODULES]

        new_phases = self._build_phases(
            remaining_remote, remaining_local, remaining_deps,
            {}, strategy.phases[0].success_criteria if strategy.phases else {},
        )

        new_time = sum(_MODULE_TIME.get(m, 15.0) for m in remaining)

        new_parallel = [
            p.module_group for p in new_phases if p.parallel and p.module_group
        ]

        replanned = ExecutionStrategy(
            goal_type=strategy.goal_type,
            target=strategy.target,
            phases=new_phases,
            total_estimated_time=round(new_time, 1),
            required_modules=remaining,
            dependencies=remaining_deps,
            confidence_threshold=round(new_confidence, 2),
            parallel_groups=new_parallel,
            rollback_plan=strategy.rollback_plan,
        )

        logger.info("Replanned: %d modules remaining (completed=%d, failed=%d)",
                     len(remaining), len(completed), len(failed))
        return replanned

    def estimate_resources(self, strategy: ExecutionStrategy) -> ResourceEstimate:
        """Estimate resource requirements for an execution strategy.

        Args:
            strategy: The ExecutionStrategy to estimate resources for.

        Returns:
            ResourceEstimate with CPU, RAM, network, and time projections.
        """
        modules = strategy.required_modules
        if not modules:
            return ResourceEstimate("low", 50, 0, 0.0, 1)

        # CPU: aggregate by highest-cost module.
        cpu_scores = [_CPU_WEIGHT.get(_MODULE_CPU.get(m, "low"), 1) for m in modules]
        max_cpu = max(cpu_scores) if cpu_scores else 1
        avg_cpu = sum(cpu_scores) / len(cpu_scores)
        if max_cpu >= 3 or avg_cpu >= 2.5:
            cpu_label = "high"
        elif avg_cpu >= 1.5:
            cpu_label = "medium"
        else:
            cpu_label = "low"

        # RAM: base 80MB + per-module cost.
        ram = 80 + len(modules) * 25
        if any(_MODULE_CPU.get(m) == "high" for m in modules):
            ram += 128  # heavy modules need more memory

        # Network requests: heuristic based on module types.
        remote_count = sum(1 for m in modules if m in MODULE_REGISTRY)
        network = remote_count * 50  # ~50 requests per remote module on average

        # Wall time from strategy or recalculate.
        wall_time = strategy.total_estimated_time

        # Concurrency: number of parallel groups or modules in largest group.
        concurrency = 1
        if strategy.parallel_groups:
            concurrency = max(len(g) for g in strategy.parallel_groups)
            concurrency = max(concurrency, len(strategy.parallel_groups))

        return ResourceEstimate(
            cpu_estimate=cpu_label,
            ram_estimate_mb=ram,
            network_requests=network,
            wall_time_seconds=wall_time,
            concurrency_level=concurrency,
        )

    def validate_strategy(self, strategy: ExecutionStrategy) -> List[str]:
        """Validate an execution strategy and return any warnings.

        Checks for:
        - Missing modules (referenced in dependencies but not in required_modules)
        - Circular dependencies
        - Empty phases
        - Timeout feasibility
        - Unknown modules

        Args:
            strategy: The ExecutionStrategy to validate.

        Returns:
            List of warning strings (empty if valid).
        """
        warnings: List[str] = []
        req_set = set(strategy.required_modules)

        # Check for modules in dependencies that aren't required.
        for mod, deps in strategy.dependencies.items():
            if mod not in req_set:
                warnings.append(f"Dependency source '{mod}' not in required_modules")
            for dep in deps:
                if dep not in req_set:
                    warnings.append(f"Dependency '{dep}' of '{mod}' not in required_modules")

        # Check for circular dependencies.
        if self._has_cycle(strategy.dependencies, req_set):
            warnings.append("Circular dependency detected in module graph")

        # Check for empty phases.
        for phase in strategy.phases:
            if not phase.module_group:
                warnings.append(f"Phase '{phase.name}' has no modules")

        # Check timeout feasibility.
        estimated = sum(_MODULE_TIME.get(m, 15.0) for m in strategy.required_modules)
        if strategy.total_estimated_time < estimated * 0.5:
            warnings.append(
                f"Total timeout ({strategy.total_estimated_time}s) is less than 50% "
                f"of estimated module time ({estimated:.1f}s)"
            )

        # Check for unknown modules.
        known = set(MODULE_REGISTRY.keys()) | set(LOCAL_MODULES.keys())
        for mod in strategy.required_modules:
            if mod not in known:
                warnings.append(f"Unknown module '{mod}' in required_modules")

        return warnings

    # ── Private helpers ──────────────────────────────────────────────

    def _build_phases(
        self,
        remote_modules: List[str],
        local_modules: List[str],
        dependencies: Dict[str, List[str]],
        constraints: Dict[str, Any],
        success_criteria: Dict[str, Any],
    ) -> List[ExecutionPhase]:
        """Build ordered execution phases using topological sort.

        Groups modules into phases based on dependency depth.
        Modules at the same depth can run in parallel.
        """
        all_mods = list(remote_modules + local_modules)
        if not all_mods:
            return []

        mod_set = set(all_mods)
        timeout_override = constraints.get("timeout")
        depth_level = constraints.get("depth", "medium")

        # Compute dependency depth for each module.
        depths: Dict[str, int] = {m: 0 for m in all_mods}
        for _ in range(len(all_mods) + 1):  # iteratively resolve
            changed = False
            for m in all_mods:
                dep_list = dependencies.get(m, [])
                valid_deps = [d for d in dep_list if d in mod_set]
                if valid_deps:
                    new_depth = max(depths.get(d, 0) for d in valid_deps) + 1
                    if new_depth > depths[m]:
                        depths[m] = new_depth
                        changed = True
            if not changed:
                break

        # Group modules by depth level.
        depth_groups: Dict[int, List[str]] = {}
        for m, d in depths.items():
            depth_groups.setdefault(d, []).append(m)

        # Build phases.
        phases: List[ExecutionPhase] = []
        sorted_depths = sorted(depth_groups.keys())
        for idx, depth in enumerate(sorted_depths):
            group = depth_groups[depth]
            # Sort group: remote modules before local for each phase.
            group_sorted = sorted(group, key=lambda m: (0 if m in MODULE_REGISTRY else 1, m))

            # Determine which earlier phases this depends on.
            depends_on = []
            if idx > 0:
                depends_on = [f"phase_{d}" for d in sorted_depths[:idx]]

            # Phase timeout: proportional to number of modules.
            phase_timeout = sum(_MODULE_TIME.get(m, 15.0) for m in group) * 2.0
            if timeout_override:
                phase_timeout = min(phase_timeout, timeout_override)
            phase_timeout = min(phase_timeout, 300.0)  # cap at 5 minutes per phase

            # Retry count based on depth and scan depth setting.
            retry = 1
            if depth_level in ("deep", "aggressive"):
                retry = 2
            if depth == 0:
                retry = max(retry, 1)  # first phase always gets at least 1 retry

            phase = ExecutionPhase(
                name=f"phase_{depth}",
                module_group=group_sorted,
                parallel=len(group_sorted) > 1,
                timeout=round(phase_timeout, 1),
                retry_count=retry,
                depends_on=depends_on,
                success_criteria=success_criteria if depth == max(sorted_depths) else {},
            )
            phases.append(phase)

        return phases

    def _build_rollback(self, modules: List[str], goal_type: str) -> List[str]:
        """Generate a rollback plan for cleanup after failure.

        Args:
            modules:   List of module IDs in the strategy.
            goal_type: The classified goal type.

        Returns:
            List of cleanup step descriptions.
        """
        steps: List[str] = []
        if any(m in modules for m in ("host", "dev", "doctor")):
            steps.append("Revert any local configuration changes made by host/dev/doctor modules")
        if any(m in modules for m in ("container_sec", "iac_audit")):
            steps.append("Remove any temporary container images or IAC scan artifacts")
        if any(m in modules for m in MODULE_REGISTRY):
            steps.append("Clear DNS and HTTP connection pools")
        if goal_type == "cloud_audit":
            steps.append("Revoke any temporary cloud API credentials or sessions")
        if not steps:
            steps.append("No rollback actions required")
        return steps

    @staticmethod
    def _has_cycle(
        deps: Dict[str, List[str]],
        nodes: Set[str],
    ) -> bool:
        """Detect circular dependencies using DFS."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color: Dict[str, int] = {n: WHITE for n in nodes}

        def dfs(node: str) -> bool:
            color[node] = GRAY
            for dep in deps.get(node, []):
                if dep not in color:
                    continue
                if color[dep] == GRAY:
                    return True
                if color[dep] == WHITE and dfs(dep):
                    return True
            color[node] = BLACK
            return False

        return any(dfs(n) for n in nodes if color[n] == WHITE)
