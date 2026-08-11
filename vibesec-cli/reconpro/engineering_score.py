"""Engineering Score — Calculate post-scan engineering metrics.

Dimensions: Architecture, Security, Reliability, Maintainability,
Complexity, Performance, Testing, Documentation.

Each dimension is scored 0–100.  The overall engineering score
is a weighted average across all dimensions.

Zero external dependencies — uses only stdlib.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# ── Weights for each dimension ──────────────────────────────────────────

_DIMENSION_WEIGHTS: Dict[str, float] = {
    "architecture": 0.15,
    "security": 0.20,
    "reliability": 0.15,
    "maintainability": 0.12,
    "complexity": 0.10,
    "performance": 0.10,
    "testing": 0.10,
    "documentation": 0.08,
}

# Category-to-dimension mapping for finding categories.
_CATEGORY_MAP: Dict[str, List[str]] = {
    "info_disclosure": ["security", "documentation"],
    "headers": ["security", "architecture"],
    "ssl": ["security", "reliability"],
    "auth": ["security", "architecture"],
    "session": ["security", "reliability"],
    "injection": ["security", "reliability"],
    "xss": ["security", "maintainability"],
    "csrf": ["security", "architecture"],
    "misconfiguration": ["security", "reliability", "architecture"],
    "outdated": ["security", "maintainability"],
    "performance": ["performance", "reliability"],
    "accessibility": ["documentation", "maintainability"],
    "best_practice": ["maintainability", "documentation"],
    "dependency": ["security", "maintainability", "complexity"],
    "container": ["security", "architecture", "reliability"],
    "iac": ["security", "architecture", "documentation"],
    "secrets": ["security", "reliability"],
    "crypto": ["security", "architecture"],
    "network": ["architecture", "performance", "security"],
}

# Severity penalty per dimension (how much each severity deducts).
_SEVERITY_PENALTY: Dict[str, float] = {
    "critical": 25.0,
    "high": 15.0,
    "medium": 8.0,
    "low": 3.0,
    "info": 0.5,
}


@dataclass
class DimensionScore:
    """Score for a single engineering dimension."""

    name: str
    score: float
    max_score: float = 100.0
    findings_count: int = 0
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "score": round(self.score, 1),
            "max_score": self.max_score,
            "findings_count": self.findings_count,
            "recommendations": self.recommendations,
        }


@dataclass
class EngineeringReport:
    """Aggregated engineering score report."""

    target: str
    overall_score: float
    dimensions: Dict[str, DimensionScore]
    total_findings: int = 0
    grade: str = "F"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "overall_score": round(self.overall_score, 1),
            "grade": self.grade,
            "total_findings": self.total_findings,
            "dimensions": {
                k: v.to_dict() for k, v in self.dimensions.items()
            },
        }


class EngineeringScorer:
    """Calculate post-scan engineering metrics across 8 dimensions.

    Each dimension starts at 100 and is penalised based on relevant
    findings, their severity, and count.
    """

    def __init__(self) -> None:
        self._recommendation_templates: Dict[str, List[str]] = {
            "architecture": [
                "Adopt a clear API gateway pattern to centralise routing.",
                "Implement defence-in-depth with network segmentation.",
                "Separate concerns with dedicated service boundaries.",
            ],
            "security": [
                "Implement Content-Security-Policy headers.",
                "Enable HSTS and rotate TLS certificates proactively.",
                "Adopt a vulnerability scanning CI/CD pipeline.",
            ],
            "reliability": [
                "Add circuit breakers for downstream service calls.",
                "Implement health-check endpoints for monitoring.",
                "Add retry logic with exponential backoff.",
            ],
            "maintainability": [
                "Update outdated dependencies to latest stable versions.",
                "Standardise coding conventions with linters/formatters.",
                "Reduce code duplication by extracting shared utilities.",
            ],
            "complexity": [
                "Reduce module coupling by introducing clear interfaces.",
                "Simplify control flow in critical paths.",
                "Decompose large functions into focused units.",
            ],
            "performance": [
                "Add response caching for frequently accessed resources.",
                "Optimise database queries and add proper indexing.",
                "Enable compression and minimise payload sizes.",
            ],
            "testing": [
                "Increase test coverage for critical business logic.",
                "Add integration tests for API endpoints.",
                "Implement contract tests for service boundaries.",
            ],
            "documentation": [
                "Add OpenAPI / Swagger documentation for endpoints.",
                "Document security policies and incident response plans.",
                "Maintain a CHANGELOG and architectural decision records.",
            ],
        }

    def score(
        self,
        target: str,
        findings: List[Dict[str, Any]],
        result: Optional[Any] = None,
    ) -> EngineeringReport:
        """Compute engineering scores from scan findings.

        Parameters
        ----------
        target : str
            The scanned target.
        findings : list[dict]
            Finding dicts (e.g. from ``ReconProResult.findings``).
        result : ReconProResult | None
            Optional full result for additional context.

        Returns
        -------
        EngineeringReport
            Complete engineering score report.
        """
        # Initialise dimension scores at 100.
        dim_scores: Dict[str, DimensionScore] = {}
        for dim_name in _DIMENSION_WEIGHTS:
            dim_scores[dim_name] = DimensionScore(name=dim_name, score=100.0)

        # Apply penalties per finding.
        for finding in findings:
            severity = str(finding.get("severity", "info")).strip().lower()
            category = str(finding.get("category", "")).strip().lower()
            points = finding.get("points_deducted", 0)

            # Determine which dimensions this finding affects.
            affected = _CATEGORY_MAP.get(category)
            if not affected:
                # Fallback: use a heuristic from title keywords.
                affected = self._guess_dimensions(finding)

            penalty = _SEVERITY_PENALTY.get(severity, 0.5)
            # Scale penalty by points_deducted ratio (cap at 2×).
            if points > 0:
                penalty = min(penalty * (1.0 + points / 50.0), penalty * 2.0)

            for dim in affected:
                if dim in dim_scores:
                    dim_scores[dim].score = max(0.0, dim_scores[dim].score - penalty)
                    dim_scores[dim].findings_count += 1

        # Generate recommendations for dimensions below threshold.
        for dim_name, ds in dim_scores.items():
            if ds.score < 70:
                templates = self._recommendation_templates.get(dim_name, [])
                # Pick up to 3 recommendations.
                ds.recommendations = templates[:3]

        # Calculate weighted overall score.
        overall = 0.0
        for dim_name, weight in _DIMENSION_WEIGHTS.items():
            overall += dim_scores[dim_name].score * weight

        grade = self._compute_grade(overall)

        return EngineeringReport(
            target=target,
            overall_score=round(overall, 1),
            dimensions=dim_scores,
            total_findings=len(findings),
            grade=grade,
        )

    # ------------------------------------------------------------------
    #  Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _guess_dimensions(finding: Dict[str, Any]) -> List[str]:
        """Heuristic: guess affected dimensions from title / description."""
        text = (
            str(finding.get("title", ""))
            + " "
            + str(finding.get("description", ""))
            + " "
            + str(finding.get("category", ""))
        ).lower()

        dims: List[str] = []
        if any(w in text for w in ("ssl", "tls", "certificate", "hsts")):
            dims.extend(["security", "reliability"])
        if any(w in text for w in ("header", "csp", "x-frame", "x-content")):
            dims.extend(["security", "architecture"])
        if any(w in text for w in ("auth", "login", "session", "token", "jwt")):
            dims.extend(["security", "architecture"])
        if any(w in text for w in ("inject", "xss", "sql", "command")):
            dims.extend(["security", "reliability"])
        if any(w in text for w in ("slow", "latency", "timeout", "cache")):
            dims.extend(["performance"])
        if any(w in text for w in ("outdated", "deprecated", "version")):
            dims.extend(["maintainability", "security"])
        if any(w in text for w in ("docker", "container", "kubernetes", "k8s")):
            dims.extend(["security", "architecture"])
        if any(w in text for w in ("secret", "credential", "password", "key")):
            dims.extend(["security", "reliability"])
        if any(w in text for w in ("test", "coverage", "spec")):
            dims.extend(["testing"])
        if any(w in text for w in ("doc", "readme", "swagger", "openapi")):
            dims.extend(["documentation"])

        # Fallback: if nothing matched, affect security broadly.
        if not dims:
            dims = ["security"]

        # Deduplicate while preserving order.
        seen: set = set()
        unique: List[str] = []
        for d in dims:
            if d not in seen:
                seen.add(d)
                unique.append(d)
        return unique

    @staticmethod
    def _compute_grade(score: float) -> str:
        """Map a numeric score to a letter grade."""
        if score >= 90:
            return "A+"
        if score >= 80:
            return "A"
        if score >= 65:
            return "B"
        if score >= 50:
            return "C"
        if score >= 35:
            return "D"
        return "F"
