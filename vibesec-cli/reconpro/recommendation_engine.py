"""Recommendation Engine — Generate prioritized fix recommendations.

Analyzes findings to produce:
1. Prioritized remediation steps
2. Quick wins vs long-term fixes
3. Effort estimates
4. Risk reduction impact
5. Dependencies between fixes
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ── Severity / confidence / exploitability numeric mappings ─────────────

_SEVERITY_WEIGHT: Dict[str, float] = {
    "critical": 10.0,
    "high": 7.0,
    "medium": 4.0,
    "low": 2.0,
    "info": 0.5,
}

_CONFIDENCE_WEIGHT: Dict[str, float] = {
    "confirmed": 1.0,
    "high": 0.9,
    "medium": 0.7,
    "low": 0.4,
    "speculative": 0.2,
}

_EXPLOITABILITY_WEIGHT: Dict[str, float] = {
    "easy": 1.0,
    "moderate": 0.7,
    "difficult": 0.4,
    "theoretical": 0.1,
}


# ── Remediation template database ───────────────────────────────────────

REMEDIATION_DB: Dict[str, Dict[str, Any]] = {
    "sqli": {
        "summary": "SQL Injection vulnerabilities allow attackers to manipulate database queries.",
        "steps": [
            "Replace all dynamic SQL with parameterized queries / prepared statements.",
            "Apply input validation (whitelist characters) on all user-supplied parameters.",
            "Deploy WAF rules to block common SQLi patterns as a defense-in-depth measure.",
            "Enable database query logging and set up alerts for anomalous queries.",
            "Conduct a code audit to find all dynamic SQL construction sites.",
        ],
        "effort": "medium",
        "impact": "critical",
        "dependencies": ["security_headers"],
    },
    "xss": {
        "summary": "Cross-Site Scripting allows attackers to inject malicious scripts into pages viewed by other users.",
        "steps": [
            "Implement context-aware output encoding (HTML, JS, URL, CSS).",
            "Deploy Content-Security-Policy headers with script-src restrictions.",
            "Migrate to auto-escaping templating engines (Jinja2, React, et al.).",
            "Sanitize rich-text inputs with a library like DOMPurify.",
            "Set HttpOnly and Secure flags on all session cookies.",
        ],
        "effort": "medium",
        "impact": "high",
        "dependencies": ["security_headers", "cors"],
    },
    "ssti": {
        "summary": "Server-Side Template Injection can lead to full remote code execution.",
        "steps": [
            "Never render user input directly in server-side templates.",
            "Use sandboxed template environments (Jinja2 ImmutableSandboxedEnvironment).",
            "Apply input validation on all template-related parameters.",
            "Run application services with least-privilege (non-root) accounts.",
        ],
        "effort": "low",
        "impact": "critical",
        "dependencies": [],
    },
    "ssrf": {
        "summary": "Server-Side Request Forgery can expose internal services and cloud metadata.",
        "steps": [
            "Implement an allowlist of permitted external URLs/domains.",
            "Block requests to private IP ranges (RFC 1918), link-local, and loopback.",
            "Block access to cloud metadata endpoints (169.254.169.254).",
            "Restrict outbound URL schemes to http and https only.",
            "Apply network-level egress filtering via security groups.",
        ],
        "effort": "medium",
        "impact": "critical",
        "dependencies": [],
    },
    "path_traversal": {
        "summary": "Path Traversal allows attackers to read arbitrary files on the server.",
        "steps": [
            "Resolve all file paths with os.path.realpath() and verify containment within base directory.",
            "Reject any path containing .. sequences after URL decoding.",
            "Run services with least-privilege accounts.",
            "Use chroot or container isolation for file-serving components.",
        ],
        "effort": "low",
        "impact": "high",
        "dependencies": [],
    },
    "command_injection": {
        "summary": "Command Injection allows attackers to execute arbitrary system commands.",
        "steps": [
            "Replace os.system()/os.popen() with subprocess.run(shell=False, args=[...]).",
            "Validate and whitelist all user inputs used in command construction.",
            "Deploy WAF rules to detect command injection patterns.",
            "Apply container sandboxing with dropped Linux capabilities.",
        ],
        "effort": "medium",
        "impact": "critical",
        "dependencies": [],
    },
    "security_headers": {
        "summary": "Missing security headers increase exposure to various attacks.",
        "steps": [
            "Set X-Content-Type-Options: nosniff.",
            "Set X-Frame-Options: DENY.",
            "Enable Strict-Transport-Security with long max-age.",
            "Implement a strict Content-Security-Policy.",
            "Set Referrer-Policy to strict-origin-when-cross-origin.",
        ],
        "effort": "low",
        "impact": "medium",
        "dependencies": [],
    },
    "cors": {
        "summary": "Misconfigured CORS can expose APIs to unauthorized origins.",
        "steps": [
            "Replace wildcard Access-Control-Allow-Origin with an explicit allowlist.",
            "Restrict Access-Control-Allow-Methods to only what is needed.",
            "Avoid Access-Control-Allow-Credentials: true with broad origins.",
            "Add Vary: Origin header when reflecting origins.",
        ],
        "effort": "low",
        "impact": "medium",
        "dependencies": [],
    },
    "csrf": {
        "summary": "CSRF allows attackers to trick users into performing unwanted actions.",
        "steps": [
            "Ensure all state-changing endpoints validate CSRF tokens.",
            "Remove all csrf_exempt decorators from mutation endpoints.",
            "Set SameSite=Strict (or Lax) on all session cookies.",
            "Verify Origin/Referer headers on state-changing requests.",
        ],
        "effort": "low",
        "impact": "high",
        "dependencies": ["security_headers"],
    },
    "debug_mode": {
        "summary": "Debug mode enabled in production leaks sensitive information.",
        "steps": [
            "Set DEBUG = False in all production settings.",
            "Restrict ALLOWED_HOSTS to known hostnames.",
            "Replace detailed error pages with generic error responses.",
            "Ensure stack traces are never returned to clients.",
        ],
        "effort": "low",
        "impact": "medium",
        "dependencies": [],
    },
    "hardcoded_secret": {
        "summary": "Hardcoded secrets in source code risk credential exposure.",
        "steps": [
            "Move all secrets to environment variables or a secrets manager.",
            "Add .env files and credential files to .gitignore.",
            "Rotate any potentially leaked credentials immediately.",
            "Implement pre-commit hooks to detect accidental secret commits.",
        ],
        "effort": "low",
        "impact": "critical",
        "dependencies": [],
    },
    "weak_crypto": {
        "summary": "Weak cryptographic algorithms can be broken by modern attackers.",
        "steps": [
            "Replace MD5/SHA-1 hashing with PBKDF2, bcrypt, or argon2 for passwords.",
            "Use AES-256-GCM for symmetric encryption.",
            "Enforce TLS 1.2+ with strong cipher suites.",
            "Generate keys with sufficient entropy (256-bit minimum).",
        ],
        "effort": "high",
        "impact": "high",
        "dependencies": ["security_headers"],
    },
    "information_disclosure": {
        "summary": "Information disclosure reveals internal details to attackers.",
        "steps": [
            "Disable verbose error messages in production.",
            "Remove or obfuscate server version headers (Server, X-Powered-By).",
            "Implement generic error pages.",
            "Disable directory listing on web servers.",
        ],
        "effort": "low",
        "impact": "low",
        "dependencies": [],
    },
    "open_port": {
        "summary": "Unnecessary open ports increase the attack surface.",
        "steps": [
            "Identify and close all unnecessary open ports.",
            "Apply firewall rules to restrict port access to required sources.",
            "Document the purpose of every open port.",
            "Implement network segmentation for sensitive services.",
        ],
        "effort": "medium",
        "impact": "medium",
        "dependencies": [],
    },
    "dangerous_eval": {
        "summary": "Use of eval/exec with user input enables arbitrary code execution.",
        "steps": [
            "Replace eval() with ast.literal_eval() for data deserialization.",
            "Remove all exec() calls with user-controlled input.",
            "Use task queues or plugin systems for dynamic code execution.",
            "Deploy runtime sandboxing (seccomp, namespaces).",
        ],
        "effort": "medium",
        "impact": "critical",
        "dependencies": [],
    },
    "unsafe_deserialization": {
        "summary": "Unsafe deserialization of untrusted data can lead to RCE.",
        "steps": [
            "Replace pickle with JSON for data serialization.",
            "If YAML is required, always use yaml.safe_load().",
            "Never deserialize untrusted data with pickle, marshal, or shelve.",
            "Implement integrity checks (signatures) on serialized data.",
        ],
        "effort": "low",
        "impact": "critical",
        "dependencies": [],
    },
}

_EFFORT_HOURS: Dict[str, float] = {
    "low": 1.0,
    "medium": 4.0,
    "high": 16.0,
}

_IMPACT_REDUCTION: Dict[str, float] = {
    "critical": 0.35,
    "high": 0.25,
    "medium": 0.15,
    "low": 0.05,
}


# ── Data classes ────────────────────────────────────────────────────────


@dataclass
class RemediationItem:
    """A single remediation step with metadata."""
    category: str
    step: str
    effort: str  # low, medium, high
    estimated_hours: float
    impact_reduction: float
    priority_score: float
    dependencies: List[str] = field(default_factory=list)


@dataclass
class RecommendationReport:
    """Full recommendation report for a set of findings."""
    target: str
    total_findings: int
    quick_wins: List[Dict[str, Any]]
    long_term_fixes: List[Dict[str, Any]]
    all_recommendations: List[RemediationItem]
    category_summary: Dict[str, Dict[str, Any]]
    estimated_total_hours: float
    overall_risk_reduction: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "total_findings": self.total_findings,
            "quick_wins": self.quick_wins,
            "long_term_fixes": self.long_term_fixes,
            "all_recommendations": [
                {
                    "category": r.category,
                    "step": r.step,
                    "effort": r.effort,
                    "estimated_hours": r.estimated_hours,
                    "impact_reduction": r.impact_reduction,
                    "priority_score": r.priority_score,
                    "dependencies": r.dependencies,
                }
                for r in self.all_recommendations
            ],
            "category_summary": self.category_summary,
            "estimated_total_hours": self.estimated_total_hours,
            "overall_risk_reduction": self.overall_risk_reduction,
        }


# ── Recommendation Engine ───────────────────────────────────────────────


class RecommendationEngine:
    """Generate prioritized fix recommendations from security findings."""

    def __init__(self) -> None:
        self._db = REMEDIATION_DB

    def recommend(
        self, findings: List[Dict[str, Any]], target: str = ""
    ) -> RecommendationReport:
        """Produce a full RecommendationReport from a list of finding dicts.

        Args:
            findings: List of finding dicts (same shape as Finding.to_dict()).
            target: The scanned target hostname/URL.

        Returns:
            RecommendationReport with prioritized remediation items.
        """
        if not findings:
            return RecommendationReport(
                target=target,
                total_findings=0,
                quick_wins=[],
                long_term_fixes=[],
                all_recommendations=[],
                category_summary={},
                estimated_total_hours=0.0,
                overall_risk_reduction=0.0,
            )

        # Group findings by category and compute per-finding priority scores.
        grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for f in findings:
            cat = f.get("category", "unknown").lower()
            grouped[cat].append(f)

        # Build remediation items.
        all_items: List[RemediationItem] = []
        category_summary: Dict[str, Dict[str, Any]] = {}

        for cat, cat_findings in grouped.items():
            template = self._db.get(cat, {})
            steps = template.get("steps", [
                f"Review and remediate {cat} finding: {f.get('title', cat)}"
                for f in cat_findings
            ])
            effort = template.get("effort", "medium")
            impact = template.get("impact", "medium")
            deps = template.get("dependencies", [])
            hours = _EFFORT_HOURS.get(effort, 4.0)
            reduction = _IMPACT_REDUCTION.get(impact, 0.1)

            # Compute max priority score across findings in this category.
            max_score = 0.0
            for f in cat_findings:
                s = self._priority_score(f)
                if s > max_score:
                    max_score = s

            category_summary[cat] = {
                "count": len(cat_findings),
                "max_severity": max(
                    (f.get("severity", "info") for f in cat_findings),
                    key=lambda s: _SEVERITY_WEIGHT.get(s, 0),
                ),
                "effort": effort,
                "impact": impact,
                "summary": template.get("summary", f"{cat}: {len(cat_findings)} finding(s)"),
            }

            for step in steps:
                all_items.append(RemediationItem(
                    category=cat,
                    step=step,
                    effort=effort,
                    estimated_hours=hours,
                    impact_reduction=reduction,
                    priority_score=max_score,
                    dependencies=list(deps),
                ))

        # Sort by priority score descending.
        all_items.sort(key=lambda r: r.priority_score, reverse=True)

        quick_wins = self.quick_wins(findings)
        long_term = [
            {"category": r.category, "step": r.step, "effort": r.effort,
             "priority_score": r.priority_score}
            for r in all_items
            if r.effort in ("medium", "high") and r.priority_score < 7.0
        ]

        total_hours = sum(r.estimated_hours for r in all_items)
        risk_reduction = min(1.0, sum(r.impact_reduction for r in all_items))

        return RecommendationReport(
            target=target,
            total_findings=len(findings),
            quick_wins=quick_wins,
            long_term_fixes=long_term,
            all_recommendations=all_items,
            category_summary=category_summary,
            estimated_total_hours=round(total_hours, 1),
            overall_risk_reduction=round(risk_reduction, 3),
        )

    def quick_wins(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Return easy, high-impact fixes — low effort + high priority.

        A quick win is defined as: effort == "low" AND severity in
        ("critical", "high").
        """
        wins: List[Dict[str, Any]] = []
        seen_categories: set = set()

        for f in sorted(findings, key=lambda x: self._priority_score(x), reverse=True):
            cat = f.get("category", "unknown").lower()
            if cat in seen_categories:
                continue
            template = self._db.get(cat, {})
            effort = template.get("effort", "medium")
            severity = f.get("severity", "info").lower()

            if effort == "low" and severity in ("critical", "high"):
                wins.append({
                    "category": cat,
                    "title": f.get("title", ""),
                    "severity": severity,
                    "effort": effort,
                    "steps": template.get("steps", []),
                    "summary": template.get("summary", ""),
                    "priority_score": self._priority_score(f),
                })
                seen_categories.add(cat)

        return wins

    def impact_analysis(self, finding: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the blast radius of fixing vs. not fixing a finding.

        Returns:
            Dict with keys: blast_radius, risk_if_unfixed, risk_if_fixed,
            downstream_assets, urgency.
        """
        severity = finding.get("severity", "info").lower()
        category = finding.get("category", "unknown").lower()
        asset = finding.get("asset", "")
        module = finding.get("module", "")
        dread = finding.get("dread_score", 0.0)

        severity_weight = _SEVERITY_WEIGHT.get(severity, 0.5)
        template = self._db.get(category, {})
        effort = template.get("effort", "medium")

        # Blast radius estimation.
        if category in ("sqli", "ssrf", "command_injection", "ssti"):
            blast_radius = "full_system"
            downstream = ["All databases", "Internal services", "Cloud metadata"]
        elif category in ("xss", "csrf", "cors"):
            blast_radius = "all_users"
            downstream = ["All authenticated users", "Session data", "User PII"]
        elif category in ("path_traversal", "information_disclosure", "debug_mode"):
            blast_radius = "data_exposure"
            downstream = ["Source code", "Configuration files", "User data"]
        elif category in ("hardcoded_secret", "unsafe_deserialization", "dangerous_eval"):
            blast_radius = "full_system"
            downstream = ["All secrets", "Server filesystem", "Process memory"]
        else:
            blast_radius = "limited"
            downstream = [asset] if asset else ["Affected component"]

        risk_unfixed = round(severity_weight * 0.9, 2)
        risk_fixed = round(severity_weight * 0.1, 2)

        urgency = "immediate" if severity in ("critical", "high") else "scheduled"

        return {
            "finding": finding.get("title", ""),
            "category": category,
            "severity": severity,
            "asset": asset,
            "module": module,
            "blast_radius": blast_radius,
            "downstream_assets": downstream,
            "risk_if_unfixed": risk_unfixed,
            "risk_if_fixed": risk_fixed,
            "risk_reduction": round(risk_unfixed - risk_fixed, 2),
            "dread_score": dread,
            "effort": effort,
            "urgency": urgency,
        }

    def _priority_score(self, finding: Dict[str, Any]) -> float:
        """Compute priority: severity * confidence * exploitability.

        Falls back to severity alone if confidence/exploitability are missing.
        """
        sev = _SEVERITY_WEIGHT.get(finding.get("severity", "info").lower(), 0.5)
        conf = 1.0  # Default: assume confirmed
        if "confidence" in finding:
            conf = _CONFIDENCE_WEIGHT.get(finding.get("confidence", "").lower(), 1.0)
        expl = 1.0  # Default: assume easy
        if "exploitability" in finding:
            expl = _EXPLOITABILITY_WEIGHT.get(finding.get("exploitability", "").lower(), 1.0)
        return round(sev * conf * expl, 2)
