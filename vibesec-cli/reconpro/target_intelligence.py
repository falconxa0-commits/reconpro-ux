"""Target Intelligence — Transform raw findings into actionable intelligence.

Instead of 'Open Port 443', produce:
- Technology stack
- Vendor identification
- Risk assessment
- Confidence score
- Likely attack surface
- Business impact
- Suggested next actions

Zero external dependencies beyond existing reconpro modules.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# Finding categories mapped to intelligence categories.
_CATEGORY_CLASSIFICATION: Dict[str, str] = {
    # Infrastructure
    "ssl": "infra",
    "headers": "infra",
    "network": "infra",
    "dns": "infra",
    "port": "infra",
    "container": "infra",
    # Application
    "xss": "app",
    "injection": "app",
    "csrf": "app",
    "info_disclosure": "app",
    "misconfiguration": "app",
    "best_practice": "app",
    # Data
    "secrets": "data",
    "data_leak": "data",
    "pii": "data",
    "sensitive_data": "data",
    # Network
    "redirect": "network",
    "ssrf": "network",
    "cors": "network",
    "chain": "network",
    # Auth
    "auth": "auth",
    "session": "auth",
    "access_control": "auth",
    # Crypto
    "crypto": "crypto",
    "certificate": "crypto",
}

# Risk multipliers by severity.
_SEVERITY_RISK = {
    "info": 0.1,
    "low": 0.25,
    "medium": 0.5,
    "high": 0.75,
    "critical": 1.0,
}

# Business impact descriptors by severity.
_BUSINESS_IMPACT = {
    "info": "Minimal — informational finding with negligible business impact.",
    "low": "Low — minor exposure, unlikely to be exploited but should be addressed.",
    "medium": "Moderate — potential for data exposure or service disruption.",
    "high": "Significant — could lead to data breach or service compromise.",
    "critical": "Severe — immediate risk of full system compromise or data exfiltration.",
}

# Template actions per intelligence category.
_CATEGORY_ACTIONS: Dict[str, List[str]] = {
    "infra": [
        "Review TLS configuration and enforce HSTS.",
        "Audit infrastructure-as-code for misconfigurations.",
        "Implement network segmentation and firewall rules.",
        "Update server software to latest stable versions.",
    ],
    "app": [
        "Implement input validation and output encoding.",
        "Add CSRF tokens to all state-changing endpoints.",
        "Deploy WAF rules for common attack patterns.",
        "Conduct secure code review of affected components.",
    ],
    "data": [
        "Rotate all exposed credentials immediately.",
        "Implement secrets management (vault, env vars).",
        "Scan codebase for additional leaked secrets.",
        "Add pre-commit hooks to prevent future secret leaks.",
    ],
    "network": [
        "Restrict CORS policy to trusted origins.",
        "Implement SSRF allow-lists for outbound requests.",
        "Audit redirect chains for open redirect vulnerabilities.",
        "Review DNS configuration for subdomain takeover risk.",
    ],
    "auth": [
        "Implement MFA for all user accounts.",
        "Review session management and token rotation.",
        "Apply principle of least privilege to access controls.",
        "Add account lockout and rate-limiting on auth endpoints.",
    ],
    "crypto": [
        "Upgrade to TLS 1.3 and disable weak ciphers.",
        "Replace deprecated cryptographic algorithms.",
        "Implement certificate pinning for API clients.",
        "Automate certificate renewal before expiry.",
    ],
}


@dataclass
class CategoryRisk:
    """Risk assessment for a single intelligence category."""

    category: str
    risk_score: float
    finding_count: int
    severity_breakdown: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "risk_score": round(self.risk_score, 2),
            "finding_count": self.finding_count,
            "severity_breakdown": self.severity_breakdown,
        }


@dataclass
class TargetIntelReport:
    """Comprehensive intelligence report for a target."""

    target: str
    technology_stack: List[str]
    vendor: Optional[str]
    app_type: str
    risk_assessment: Dict[str, CategoryRisk]
    overall_risk: float
    confidence: float
    attack_surface: List[str]
    business_impact: str
    suggested_next_actions: List[str]
    finding_count: int
    critical_count: int
    high_count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "technology_stack": self.technology_stack,
            "vendor": self.vendor,
            "app_type": self.app_type,
            "risk_assessment": {
                k: v.to_dict() for k, v in self.risk_assessment.items()
            },
            "overall_risk": round(self.overall_risk, 2),
            "confidence": round(self.confidence, 2),
            "attack_surface": self.attack_surface,
            "business_impact": self.business_impact,
            "suggested_next_actions": self.suggested_next_actions,
            "finding_count": self.finding_count,
            "critical_count": self.critical_count,
            "high_count": self.high_count,
        }


class TargetIntelligence:
    """Transform raw findings into actionable intelligence.

    Classifies findings into categories (infra, app, data, network,
    auth, crypto), computes risk scores, and generates prioritised
    recommendations.
    """

    def analyze(
        self,
        target: str,
        findings: List[Dict[str, Any]],
        profile: Any = None,
    ) -> TargetIntelReport:
        """Analyse findings and produce an intelligence report.

        Parameters
        ----------
        target : str
            The scanned target (domain / IP).
        findings : list[dict]
            Finding dicts from a scan.
        profile : TechProfile | None
            Optional technology profile from ``profiler.TargetProfiler``.

        Returns
        -------
        TargetIntelReport
            Enriched intelligence report.
        """
        # 1. Classify findings into intelligence categories.
        cat_findings: Dict[str, List[Dict[str, Any]]] = {
            "infra": [],
            "app": [],
            "data": [],
            "network": [],
            "auth": [],
            "crypto": [],
        }
        for f in findings:
            cat = self._classify(f)
            cat_findings[cat].append(f)

        # 2. Compute per-category risk.
        risk_assessment: Dict[str, CategoryRisk] = {}
        for cat, cat_list in cat_findings.items():
            risk = self._category_risk(cat_list)
            risk_assessment[cat] = risk

        # 3. Overall risk (weighted by category severity).
        overall_risk = self._overall_risk(risk_assessment, len(findings))

        # 4. Technology stack from profile or from findings.
        tech_stack, vendor, app_type = self._extract_tech(findings, profile)

        # 5. Attack surface summary.
        attack_surface = self._summarise_attack_surface(findings, cat_findings)

        # 6. Business impact from highest severity.
        max_sev = self._max_severity(findings)
        business_impact = _BUSINESS_IMPACT.get(max_sev, _BUSINESS_IMPACT["info"])

        # 7. Confidence from findings with confidence scores, or fallback.
        confidences = [
            f.get("confidence", 0.5) for f in findings if "confidence" in f
        ]
        avg_confidence = (
            sum(confidences) / len(confidences) if confidences else 0.5
        )

        # 8. Suggested next actions (prioritised).
        actions = self._prioritise_actions(risk_assessment, max_sev)

        # Counts.
        critical_count = sum(
            1 for f in findings
            if str(f.get("severity", "")).lower() == "critical"
        )
        high_count = sum(
            1 for f in findings
            if str(f.get("severity", "")).lower() == "high"
        )

        return TargetIntelReport(
            target=target,
            technology_stack=tech_stack,
            vendor=vendor,
            app_type=app_type,
            risk_assessment=risk_assessment,
            overall_risk=overall_risk,
            confidence=avg_confidence,
            attack_surface=attack_surface,
            business_impact=business_impact,
            suggested_next_actions=actions,
            finding_count=len(findings),
            critical_count=critical_count,
            high_count=high_count,
        )

    # ------------------------------------------------------------------
    #  Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _classify(finding: Dict[str, Any]) -> str:
        """Map a finding to an intelligence category."""
        category = str(finding.get("category", "")).strip().lower()
        if category in _CATEGORY_CLASSIFICATION:
            return _CATEGORY_CLASSIFICATION[category]

        # Heuristic from title / description.
        text = (
            str(finding.get("title", ""))
            + " "
            + str(finding.get("description", ""))
        ).lower()

        if any(w in text for w in ("ssl", "tls", "certificate", "hsts", "port", "dns")):
            return "infra"
        if any(w in text for w in ("xss", "inject", "csrf", "open redirect")):
            return "app"
        if any(w in text for w in ("secret", "credential", "password", "key", "leak")):
            return "data"
        if any(w in text for w in ("cors", "ssrf", "redirect", "chain")):
            return "network"
        if any(w in text for w in ("auth", "session", "login", "token")):
            return "auth"
        if any(w in text for w in ("encrypt", "cipher", "crypto")):
            return "crypto"

        return "app"  # default

    @staticmethod
    def _category_risk(findings: List[Dict[str, Any]]) -> CategoryRisk:
        """Compute risk score for a list of findings in one category."""
        if not findings:
            return CategoryRisk(
                category="unknown", risk_score=0.0, finding_count=0
            )

        cat = TargetIntelligence._classify(findings[0])
        sev_breakdown: Dict[str, int] = {}
        total_risk = 0.0

        for f in findings:
            sev = str(f.get("severity", "info")).lower()
            sev_breakdown[sev] = sev_breakdown.get(sev, 0) + 1
            total_risk += _SEVERITY_RISK.get(sev, 0.1)

        # Normalise: average risk, capped at 1.0.
        avg_risk = min(total_risk / max(len(findings), 1), 1.0)

        # Boost if multiple high/critical findings.
        high_plus = sev_breakdown.get("high", 0) + sev_breakdown.get("critical", 0)
        if high_plus >= 3:
            avg_risk = min(avg_risk * 1.3, 1.0)
        elif high_plus >= 2:
            avg_risk = min(avg_risk * 1.15, 1.0)

        return CategoryRisk(
            category=cat,
            risk_score=avg_risk,
            finding_count=len(findings),
            severity_breakdown=sev_breakdown,
        )

    @staticmethod
    def _overall_risk(
        risk_assessment: Dict[str, CategoryRisk],
        total_findings: int,
    ) -> float:
        """Compute overall risk from category risks."""
        if not risk_assessment or total_findings == 0:
            return 0.0

        # Weight by finding count per category.
        total_weight = 0.0
        weighted_sum = 0.0
        for cr in risk_assessment.values():
            weight = cr.finding_count
            weighted_sum += cr.risk_score * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0

        return min(weighted_sum / total_weight, 1.0)

    @staticmethod
    def _extract_tech(
        findings: List[Dict[str, Any]],
        profile: Any,
    ) -> tuple:
        """Extract technology stack, vendor, and app type."""
        if profile is not None and hasattr(profile, "to_dict"):
            pd = profile.to_dict()
            tech = list(pd.get("detected_technologies", []))
            app_type = pd.get("app_type", "unknown")
            # Derive vendor from WAF or server.
            vendor = pd.get("waf") or pd.get("server")
            if not vendor and tech:
                vendor = tech[0]
            return tech, vendor, app_type

        # Fallback: extract from findings.
        tech: List[str] = []
        for f in findings:
            module = str(f.get("module", ""))
            if module and module not in tech:
                tech.append(module)
        return tech, None, "unknown"

    @staticmethod
    def _summarise_attack_surface(
        findings: List[Dict[str, Any]],
        cat_findings: Dict[str, List[Dict[str, Any]]],
    ) -> List[str]:
        """Produce a human-readable attack surface summary."""
        surface: List[str] = []
        for cat, flist in cat_findings.items():
            if not flist:
                continue
            labels = {
                "infra": "Infrastructure",
                "app": "Application Layer",
                "data": "Data / Secrets",
                "network": "Network",
                "auth": "Authentication",
                "crypto": "Cryptography",
            }
            label = labels.get(cat, cat.title())
            high_count = sum(
                1 for f in flist
                if str(f.get("severity", "")).lower() in ("high", "critical")
            )
            if high_count > 0:
                surface.append(
                    f"{label}: {high_count} high/critical finding(s)"
                )
            else:
                surface.append(
                    f"{label}: {len(flist)} finding(s)"
                )
        return surface

    @staticmethod
    def _max_severity(findings: List[Dict[str, Any]]) -> str:
        """Return the highest severity present."""
        order = ["critical", "high", "medium", "low", "info"]
        sev_set = {str(f.get("severity", "info")).lower() for f in findings}
        for s in order:
            if s in sev_set:
                return s
        return "info"

    @staticmethod
    def _prioritise_actions(
        risk_assessment: Dict[str, CategoryRisk],
        max_sev: str,
    ) -> List[str]:
        """Generate prioritised next actions based on risk assessment."""
        # Sort categories by risk score (highest first).
        sorted_cats = sorted(
            risk_assessment.values(), key=lambda cr: cr.risk_score, reverse=True
        )

        actions: List[str] = []
        for cr in sorted_cats:
            if cr.finding_count == 0:
                continue
            templates = _CATEGORY_ACTIONS.get(cr.category, [])
            # Number of actions proportional to risk and findings.
            n_actions = min(
                max(len(templates) // 2, 1),
                len(templates),
            )
            if cr.risk_score > 0.5:
                n_actions = min(n_actions + 1, len(templates))
            if cr.risk_score > 0.8:
                n_actions = len(templates)
            for tmpl in templates[:n_actions]:
                if tmpl not in actions:
                    actions.append(tmpl)

        return actions
