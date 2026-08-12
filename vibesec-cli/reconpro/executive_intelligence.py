"""Executive Intelligence - Transform scan data into executive-level reports.

Generates audience-appropriate reports from ReconPro scan results,
intelligence pipeline output, and evidence correlation data.

Produced by Council Theta, Friday Engineering Council.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# --- Severity / impact constants ---

_SEVERITY_WEIGHT: Dict[str, float] = {
    "critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25, "info": 0.0,
}
_SEVERITY_IMPACT: Dict[str, float] = {
    "critical": 1.0, "high": 0.8, "medium": 0.5, "low": 0.2, "info": 0.05,
}

_CATEGORY_LABELS: Dict[str, str] = {
    "injection": "Injection Vulnerabilities", "xss": "Cross-Site Scripting (XSS)",
    "headers": "Security Headers", "ssl": "TLS / SSL Configuration",
    "auth": "Authentication & Authorization", "session": "Session Management",
    "csrf": "Cross-Site Request Forgery", "misconfiguration": "Server Misconfiguration",
    "outdated": "Outdated Components", "info_disclosure": "Information Disclosure",
    "secrets": "Secrets & Credentials", "crypto": "Cryptography",
    "container": "Container Security", "iac": "Infrastructure as Code",
    "dependency": "Dependency Issues", "network": "Network Security",
    "performance": "Performance", "accessibility": "Accessibility",
    "best_practice": "Best Practices",
}

_REMEDIATION_TEMPLATES: Dict[str, str] = {
    "injection": "Implement parameterized queries and input validation.",
    "xss": "Apply context-aware output encoding and deploy CSP headers.",
    "headers": "Configure security headers (HSTS, X-Frame-Options, CSP).",
    "ssl": "Upgrade to TLS 1.2+ with strong cipher suites.",
    "auth": "Enforce MFA and implement account lockout policies.",
    "session": "Use secure, HttpOnly, SameSite cookies with short TTLs.",
    "csrf": "Validate anti-CSRF tokens on all state-changing endpoints.",
    "misconfiguration": "Review and harden server configuration per CIS benchmarks.",
    "outdated": "Update components to the latest stable versions.",
    "info_disclosure": "Disable verbose errors and remove version headers.",
    "secrets": "Rotate exposed credentials and move to a secrets manager.",
    "crypto": "Migrate to strong algorithms (AES-256-GCM, bcrypt).",
    "container": "Apply CIS Docker/Kubernetes benchmarks and least-privilege.",
    "iac": "Fix IAC misconfigurations and add policy-as-code checks.",
    "dependency": "Audit and update vulnerable dependencies.",
    "network": "Restrict network access and implement segmentation.",
}

# Attack timeline phase mapping: category -> (phase_number, phase_name)
_TIMELINE_PHASES: List[tuple] = [
    (1, "Reconnaissance", {"info_disclosure", "headers", "network"}),
    (2, "Access & Authentication", {"auth", "session", "csrf"}),
    (3, "Exploitation", {"injection", "xss", "ssti", "ssrf", "command_injection",
                          "path_traversal", "unsafe_deserialization", "dangerous_eval"}),
    (4, "Persistence & Infrastructure", {"secrets", "crypto", "outdated",
                                             "dependency", "misconfiguration", "container", "iac"}),
]

_SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


# --- Data classes ---


@dataclass
class RiskMatrixEntry:
    """Single entry in the risk matrix (severity x likelihood)."""
    finding_title: str
    severity: str
    likelihood: float
    impact: float
    risk_score: float
    category: str
    recommendation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_title": self.finding_title, "severity": self.severity,
            "likelihood": round(self.likelihood, 3), "impact": round(self.impact, 3),
            "risk_score": round(self.risk_score, 3), "category": self.category,
            "recommendation": self.recommendation,
        }


@dataclass
class ExecutiveReport:
    """Full executive-level intelligence report."""
    target: str
    timestamp: str
    scan_summary: Dict[str, Any]
    executive_summary: str
    risk_matrix: List[Dict[str, Any]]
    attack_timeline: List[Dict[str, Any]]
    top_findings: List[Dict[str, Any]]
    remediation_plan: List[Dict[str, Any]]
    engineering_report: Dict[str, Any]
    evidence_chains: List[Dict[str, Any]]
    machine_json: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target, "timestamp": self.timestamp,
            "scan_summary": self.scan_summary, "executive_summary": self.executive_summary,
            "risk_matrix": self.risk_matrix, "attack_timeline": self.attack_timeline,
            "top_findings": self.top_findings, "remediation_plan": self.remediation_plan,
            "engineering_report": self.engineering_report, "evidence_chains": self.evidence_chains,
            "machine_json": self.machine_json,
        }

    def to_markdown(self) -> str:
        return ExecutiveIntelligence._format_markdown(self)


# --- Executive Intelligence ---


class ExecutiveIntelligence:
    """Transform technical scan data into executive-level reports.

    Designed for C-suite, board, and engineering leadership audiences.
    Produces both human-readable markdown and machine-readable JSON.
    """

    def generate(
        self,
        scan_result: Any,
        intelligence_report: Optional[Any] = None,
        correlation_result: Optional[Any] = None,
    ) -> ExecutiveReport:
        """Generate a full ExecutiveReport from scan data.

        Parameters
        ----------
        scan_result : ReconProResult | dict
            Scan result (dataclass or dict with findings, scores, etc.).
        intelligence_report : IntelligenceReport | dict | None
            Optional enriched intelligence from the pipeline.
        correlation_result : CorrelationResult | dict | None
            Optional evidence correlation chains.

        Returns
        -------
        ExecutiveReport
            Complete executive-level report.
        """
        # Normalise scan data to dict.
        if hasattr(scan_result, "to_dict"):
            scan_data = scan_result.to_dict()
        elif isinstance(scan_result, dict):
            scan_data = dict(scan_result)
        else:
            scan_data = {}

        target = scan_data.get("target", "unknown")
        findings = scan_data.get("findings", [])
        modules_run = scan_data.get("modules_run", [])
        severity_counts = scan_data.get("severity_counts", {})
        total_score = scan_data.get("total_score", 100)
        grade = scan_data.get("grade", "A")
        total_findings = scan_data.get("total_findings", len(findings))
        timestamp = datetime.now(timezone.utc).isoformat()

        # Extract confidence scores from intelligence_report.
        confidence_scores: List[Dict[str, Any]] = []
        eng_report_dict: Dict[str, Any] = {}
        if intelligence_report is not None:
            ir_dict = (intelligence_report.to_dict() if hasattr(intelligence_report, "to_dict")
                        else intelligence_report if isinstance(intelligence_report, dict)
                        else {})
            confidence_scores = ir_dict.get("confidence_scores", [])
            eng_report_dict = ir_dict.get("engineering_report", {})

        # If no engineering report from pipeline, compute one.
        if not eng_report_dict:
            try:
                from .engineering_score import EngineeringScorer
                eng_report_dict = EngineeringScorer().score(target, findings).to_dict()
            except Exception:
                eng_report_dict = {"overall_score": total_score, "dimensions": {}}

        # Extract evidence chains from correlation_result.
        chains: List[Dict[str, Any]] = []
        if correlation_result is not None:
            cr_dict = (correlation_result.to_dict() if hasattr(correlation_result, "to_dict")
                        else correlation_result if isinstance(correlation_result, dict)
                        else {})
            chains = cr_dict.get("chains", cr_dict.get("evidence_chains", []))

        # Build report sections.
        scan_summary = {
            "score": total_score, "grade": grade, "modules_run": modules_run,
            "findings_count": total_findings, "severity_counts": severity_counts,
        }
        report_data = {"target": target, "total_findings": total_findings,
                        "severity_counts": severity_counts, "total_score": total_score,
                        "grade": grade, "modules_run": modules_run}

        executive_summary = self._build_summary(report_data)
        risk_matrix = self._build_risk_matrix(findings, confidence_scores)
        attack_timeline = self._build_attack_timeline(findings, chains)
        top_findings = self._prioritize_findings(findings, confidence_scores)
        remediation_plan = self._build_remediation_plan(findings, eng_report_dict)
        evidence_chain_dicts = self._extract_evidence_chains(chains, findings)

        machine_json = {
            "target": target, "timestamp": timestamp, "scan_summary": scan_summary,
            "risk_matrix": risk_matrix, "attack_timeline": attack_timeline,
            "top_findings": top_findings, "remediation_plan": remediation_plan,
            "engineering_report": eng_report_dict, "evidence_chains": evidence_chain_dicts,
            "meta": {"generator": "ReconPro ExecutiveIntelligence",
                      "council": "Council Theta", "version": "1.0.0"},
        }

        return ExecutiveReport(
            target=target, timestamp=timestamp, scan_summary=scan_summary,
            executive_summary=executive_summary, risk_matrix=risk_matrix,
            attack_timeline=attack_timeline, top_findings=top_findings,
            remediation_plan=remediation_plan, engineering_report=eng_report_dict,
            evidence_chains=evidence_chain_dicts, machine_json=machine_json,
        )

    # --- Natural language summary ---

    def _build_summary(self, rd: Dict[str, Any]) -> str:
        """Generate a 2-3 paragraph executive summary."""
        target = rd.get("target", "unknown")
        score = rd.get("total_score", 100)
        grade = rd.get("grade", "A")
        total = rd.get("total_findings", 0)
        sc = rd.get("severity_counts", {})
        modules = rd.get("modules_run", [])

        crit, high, med, low = sc.get("critical", 0), sc.get("high", 0), sc.get("medium", 0), sc.get("low", 0)

        # Paragraph 1: Overview.
        mod_list = ", ".join(modules[:5]) + ("..." if len(modules) > 5 else "")
        p1 = (f"A security assessment of {target} was completed using "
              f"{len(modules)} scan module{'s' if len(modules) != 1 else ''} "
              f"({mod_list}). The target received an overall security score of "
              f"{score}/100 (grade {grade}) with {total} finding{'s' if total != 1 else ''} identified.")

        # Paragraph 2: Severity breakdown.
        parts = []
        if crit: parts.append(f"{crit} critical")
        if high: parts.append(f"{high} high")
        if med: parts.append(f"{med} medium")
        if low: parts.append(f"{low} low")

        if parts:
            sev_text = ", ".join(parts)
            p2_chunks = [f"The severity distribution is: {sev_text}. "]
            if crit or high:
                p2_chunks.append("Critical and high-severity issues require immediate "
                                  "attention and should be addressed before the next deployment cycle. ")
            else:
                p2_chunks.append("No critical or high-severity vulnerabilities were detected, "
                                  "indicating a strong baseline security posture. ")
            if med:
                p2_chunks.append("Medium-severity findings represent areas for improvement "
                                  "in the next sprint. ")
            p2 = "".join(p2_chunks)
        else:
            p2 = "No vulnerabilities were detected during this assessment."

        # Paragraph 3: Risk posture.
        if score >= 80:
            posture, action = "strong", "Continue monitoring and address medium-severity items in upcoming sprints."
        elif score >= 60:
            posture, action = "moderate", "Prioritize high-severity remediation and schedule a follow-up assessment."
        elif score >= 40:
            posture, action = "elevated", "Initiate an immediate remediation program with weekly progress reviews."
        else:
            posture, action = "critical", "Escalate to leadership and begin emergency remediation immediately."
        p3 = f"Overall risk posture for {target} is {posture}. {action} A detailed remediation plan with prioritized actions is provided below."

        return f"{p1}\n\n{p2}\n\n{p3}"

    # --- Risk matrix ---

    def _build_risk_matrix(self, findings: List[Dict], conf_scores: List[Dict]) -> List[Dict]:
        """Build risk matrix entries (severity x likelihood)."""
        conf_map: Dict[str, float] = {}
        for cs in conf_scores:
            title = cs.get("title", "")
            v = cs.get("confidence", 0.5)
            conf_map[title] = float(v) if isinstance(v, (int, float)) else 0.5

        entries: List[RiskMatrixEntry] = []
        for f in findings:
            title = f.get("title", "Untitled Finding")
            sev = str(f.get("severity", "info")).strip().lower()
            cat = str(f.get("category", "general")).strip().lower()
            likelihood = conf_map.get(title, self._default_likelihood(sev))
            impact = _SEVERITY_IMPACT.get(sev, 0.2)
            rec = _REMEDIATION_TEMPLATES.get(cat, f"Review and remediate the {cat} finding.")
            entries.append(RiskMatrixEntry(
                finding_title=title, severity=sev, likelihood=likelihood,
                impact=impact, risk_score=likelihood * impact,
                category=_CATEGORY_LABELS.get(cat, cat), recommendation=rec,
            ))
        entries.sort(key=lambda e: e.risk_score, reverse=True)
        return [e.to_dict() for e in entries]

    @staticmethod
    def _default_likelihood(severity: str) -> float:
        """Estimate likelihood from severity when no confidence score exists."""
        return {"critical": 0.9, "high": 0.75, "medium": 0.5, "low": 0.3, "info": 0.1}.get(severity, 0.5)

    # --- Attack timeline ---

    def _build_attack_timeline(self, findings: List[Dict], chains: List[Dict]) -> List[Dict]:
        """Build chronological attack path from findings and chains."""
        timeline: List[Dict[str, Any]] = []
        seen: set = set()

        for phase_num, phase_name, cats in _TIMELINE_PHASES:
            for f in findings:
                if str(f.get("category", "")).lower() not in cats:
                    continue
                title = f.get("title", "")
                if title in seen:
                    continue
                timeline.append({
                    "phase": phase_num, "phase_name": phase_name, "finding": title,
                    "severity": f.get("severity", "info"),
                    "description": str(f.get("description", f.get("evidence", "")))[:200],
                })
                seen.add(title)

        # Append evidence chain correlations.
        for c in chains:
            ct = c.get("title", c.get("finding", ""))
            if ct and ct not in seen:
                timeline.append({
                    "phase": 5, "phase_name": "Corroborated Intelligence", "finding": ct,
                    "severity": c.get("severity", "info"),
                    "description": str(c.get("summary", c.get("description", "")))[:200],
                    "corroboration": c.get("corroboration_count", c.get("sources", 1)),
                })
                seen.add(ct)
        return timeline

    # --- Top findings ---

    def _prioritize_findings(self, findings: List[Dict], conf_scores: List[Dict]) -> List[Dict]:
        """Rank findings by severity_weight * confidence, take top 10."""
        conf_map: Dict[str, float] = {}
        for cs in conf_scores:
            v = cs.get("confidence", 0.5)
            conf_map[cs.get("title", "")] = float(v) if isinstance(v, (int, float)) else 0.5

        ranked = []
        for f in findings:
            title = f.get("title", "")
            sev = str(f.get("severity", "info")).strip().lower()
            conf = conf_map.get(title, self._default_likelihood(sev))
            ranked.append({
                "title": title, "severity": sev, "category": f.get("category", ""),
                "confidence": round(conf, 3),
                "priority_score": round(_SEVERITY_WEIGHT.get(sev, 0.0) * conf, 3),
                "description": str(f.get("description", ""))[:300],
                "remediation": f.get("remediation", ""),
                "evidence": str(f.get("evidence", ""))[:200],
            })
        ranked.sort(key=lambda x: x["priority_score"], reverse=True)
        return ranked[:10]

    # --- Remediation plan ---

    def _build_remediation_plan(self, findings: List[Dict], eng_score: Dict) -> List[Dict]:
        """Build prioritized remediation plan grouped by category."""
        if not findings:
            return []

        grouped: Dict[str, List[Dict]] = defaultdict(list)
        for f in findings:
            grouped[str(f.get("category", "unknown")).strip().lower()].append(f)

        # Try to use the recommendation engine for detailed steps.
        rec_map: Dict[str, Dict[str, Any]] = {}
        try:
            from .recommendation_engine import RecommendationEngine
            rec_report = RecommendationEngine().recommend(findings)
            for v in rec_report.category_summary.values():
                rec_map[v.get("category", "").lower()] = v
        except Exception:
            pass

        plan: List[Dict[str, Any]] = []
        for cat, cat_findings in grouped.items():
            max_sev = max(cat_findings, key=lambda f: _SEV_ORDER.get(str(f.get("severity", "info")).lower(), 4))
            severity = str(max_sev.get("severity", "info")).strip().lower()
            ri = rec_map.get(cat, {})
            steps = ri.get("steps", []) or [_REMEDIATION_TEMPLATES.get(cat, f"Investigate and resolve {cat} issues identified in the scan.")]
            plan.append({
                "category": cat, "category_label": _CATEGORY_LABELS.get(cat, cat),
                "severity": severity, "findings_count": len(cat_findings),
                "summary": ri.get("summary", _REMEDIATION_TEMPLATES.get(cat, "")),
                "steps": steps, "effort": ri.get("effort", "medium"),
                "finding_titles": [f.get("title", "") for f in cat_findings],
            })

        plan.sort(key=lambda x: _SEV_ORDER.get(x["severity"], 4))
        return plan

    # --- Evidence chains ---

    def _extract_evidence_chains(self, chains: List[Dict], findings: List[Dict]) -> List[Dict]:
        """Extract corroborated evidence chains for the report."""
        if chains:
            return [{"finding": c.get("title", c.get("finding", "")),
                      "severity": c.get("severity", "info"),
                      "sources": c.get("sources", c.get("corroboration_count", 1)),
                      "confidence": c.get("confidence", c.get("score", 0.5)),
                      "summary": str(c.get("summary", c.get("description", "")))[:300]}
                     for c in chains if c.get("title") or c.get("finding")]

        # Fallback: build pseudo-chains from high-confidence findings.
        return [{"finding": f.get("title", ""), "severity": f.get("severity", "info"),
                  "sources": f.get("corroboration_count", 1),
                  "confidence": f.get("confidence", 0.5),
                  "summary": str(f.get("description", ""))[:300]}
                 for f in findings
                 if f.get("corroboration_count", 0) > 1 or f.get("confidence", 0) >= 0.8]

    # --- Markdown formatting ---

    @staticmethod
    def _format_markdown(r: ExecutiveReport) -> str:
        """Render the full ExecutiveReport as professional markdown."""
        L: List[str] = []  # lines buffer
        a = L.append
        a(f"# Executive Intelligence Report\n")
        a(f"**Target:** {r.target}  ")
        a(f"**Date:** {r.timestamp}  ")
        a(f"**Score:** {r.scan_summary.get('score', 'N/A')}/100 "
          f"(Grade {r.scan_summary.get('grade', 'N/A')})  ")
        a(f"**Modules:** {', '.join(r.scan_summary.get('modules_run', []))}\n")

        # Executive summary.
        a("---\n\n## Executive Summary\n")
        for para in r.executive_summary.split("\n\n"):
            a(para.strip() + "\n")

        # Risk matrix.
        a("---\n\n## Risk Matrix\n")
        a("| Finding | Severity | Likelihood | Impact | Risk Score | Category |")
        a("|---------|----------|------------|--------|------------|----------|")
        for e in r.risk_matrix:
            a(f"| {e['finding_title'][:50]} | {e['severity']} | {e['likelihood']:.2f} "
              f"| {e['impact']:.2f} | {e['risk_score']:.3f} | {e['category'][:30]} |")
        a("")

        # Attack timeline.
        a("---\n\n## Attack Timeline\n")
        for s in r.attack_timeline:
            a(f"### Phase {s.get('phase', '?')}: {s.get('phase_name', '')}\n")
            a(f"**{s.get('finding', 'Unknown')}** (Severity: {s.get('severity', 'info')})\n")
            desc = s.get("description", "")
            if desc:
                a(desc[:300] + "\n")

        # Top findings.
        a("---\n\n## Top Findings\n")
        for i, f in enumerate(r.top_findings, 1):
            a(f"### {i}. {f.get('title', 'Untitled')}\n")
            a(f"- **Severity:** {f.get('severity', 'N/A')}  ")
            a(f"- **Category:** {f.get('category', 'N/A')}  ")
            a(f"- **Confidence:** {f.get('confidence', 'N/A')}  ")
            a(f"- **Priority Score:** {f.get('priority_score', 'N/A')}")
            d = f.get("description", "")
            if d:
                a(f"- **Description:** {d[:200]}")
            a("")

        # Remediation plan.
        a("---\n\n## Remediation Plan\n")
        for item in r.remediation_plan:
            label = item.get("category_label", item.get("category", "Unknown"))
            a(f"### {label}\n")
            a(f"**Severity:** {item.get('severity', 'N/A')} | "
              f"**Findings:** {item.get('findings_count', 0)} | "
              f"**Effort:** {item.get('effort', 'N/A')}\n")
            if item.get("summary"):
                a(item["summary"] + "\n")
            for j, step in enumerate(item.get("steps", []), 1):
                a(f"{j}. {step}")
            a("")

        # Engineering report.
        a("---\n\n## Engineering Score\n")
        eng = r.engineering_report
        if eng and eng.get("overall_score") is not None:
            a(f"**Overall Score:** {eng['overall_score']}/100 (Grade {eng.get('grade', 'N/A')})\n")
            dims = eng.get("dimensions", {})
            if dims:
                a("| Dimension | Score | Findings |")
                a("|-----------|-------|----------|")
                for dn, dd in dims.items():
                    if isinstance(dd, dict):
                        a(f"| {dn.replace('_', ' ').title()} | {dd.get('score', 'N/A')} | {dd.get('findings_count', 0)} |")
                a("")
        else:
            a("Engineering score data not available.\n")

        # Evidence chains.
        if r.evidence_chains:
            a("---\n\n## Evidence Chains (Corroborated Findings)\n")
            for c in r.evidence_chains:
                a(f"- **{c.get('finding', 'Unknown')}** (Severity: {c.get('severity', 'info')}, "
                  f"Sources: {c.get('sources', 1)}, Confidence: {c.get('confidence', 'N/A')})")
            a("")

        a("---\n\n*Report generated by ReconPro ExecutiveIntelligence (Council Theta)*")
        return "\n".join(L)
