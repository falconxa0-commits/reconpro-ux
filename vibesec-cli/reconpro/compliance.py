"""
ReconPro v8.5 — Compliance Framework Mapping

Maps security findings to compliance controls across SOC2, ISO27001,
PCI-DSS, HIPAA, GDPR, and CIS.  Calculates per-framework compliance
percentages and identifies coverage gaps.

Exports:
    COMPLIANCE_RULES   – master rule set
    ComplianceReport    – structured report dataclass
    ComplianceMapper    – maps findings → controls
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ── Category → control mapping ───────────────────────────────────────
# Each finding's ``category`` field is matched against these keys.

FINDING_CATEGORY_ALIASES: Dict[str, List[str]] = {
    "access_control": ["auth", "access_control", "authentication", "authorization", "rbac", "iam", "mfa", "2fa", "login", "password"],
    "encryption": ["encryption", "crypto", "tls", "ssl", "certificate", "https", "hsts", "cipher"],
    "network_security": ["network", "firewall", "waf", "ids", "ips", "segmentation", "network_security", "dmz"],
    "logging": ["logging", "audit", "log", "monitoring", "siem", "observation", "logging_audit"],
    "vulnerability": ["vulnerability", "vuln", "cve", "patch", "exploit", "injection", "xss", "sqli", "rce", "ssrf"],
    "data_protection": ["data_protection", "pii", "gdpr", "privacy", "data_leak", "sensitive_data", "dLP"],
    "configuration": ["config", "hardening", "csp", "headers", "cookie", "secure_config", "misconfiguration"],
    "incident_response": ["incident", "response", "ir", "forensics", "breach"],
    "asset_management": ["asset", "inventory", "discovery", "fingerprint", "technology"],
    "api_security": ["api", "endpoint", "rest", "graphql", "openapi", "swagger", "api_discovery"],
    "container_security": ["container", "docker", "kubernetes", "k8s", "oci", "pod"],
    "cloud_security": ["cloud", "aws", "azure", "gcp", "s3", "bucket", "iam", "cloud_recon"],
}


def _match_category(finding_category: str) -> str:
    """Map a finding's category to a canonical compliance category."""
    fc = finding_category.strip().lower().replace("-", "_").replace(" ", "_")
    for canonical, aliases in FINDING_CATEGORY_ALIASES.items():
        if fc in aliases or fc == canonical:
            return canonical
    return "configuration"


# ══════════════════════════════════════════════════════════════════════
# COMPLIANCE_RULES – the full control database
# ══════════════════════════════════════════════════════════════════════

COMPLIANCE_RULES: Dict[str, Dict[str, Any]] = {
    # ── SOC2 ─────────────────────────────────────────────────────────
    "SOC2-CC6.1": {
        "framework": "SOC2",
        "control_id": "CC6.1",
        "control_name": "Logical and Physical Access Controls",
        "description": "The entity implements logical access security measures over information assets.",
        "mapping_categories": ["access_control", "configuration"],
        "severity": "high",
    },
    "SOC2-CC6.3": {
        "framework": "SOC2",
        "control_id": "CC6.3",
        "control_name": "Encryption of Data at Rest",
        "description": "The entity encrypts sensitive data at rest using industry-accepted algorithms.",
        "mapping_categories": ["encryption"],
        "severity": "critical",
    },
    "SOC2-CC6.5": {
        "framework": "SOC2",
        "control_id": "CC6.5",
        "control_name": "Transmission Encryption",
        "description": "The entity encrypts data in transit over external networks and between internal systems.",
        "mapping_categories": ["encryption", "network_security"],
        "severity": "critical",
    },
    "SOC2-CC7.1": {
        "framework": "SOC2",
        "control_id": "CC7.1",
        "control_name": "Detection and Monitoring",
        "description": "The entity implements detection and monitoring procedures to identify anomalies.",
        "mapping_categories": ["logging", "monitoring"],
        "severity": "high",
    },
    "SOC2-CC7.2": {
        "framework": "SOC2",
        "control_id": "CC7.2",
        "control_name": "Incident Response",
        "description": "The entity maintains an incident response program to address detected incidents.",
        "mapping_categories": ["incident_response", "logging"],
        "severity": "high",
    },

    # ── ISO 27001 ────────────────────────────────────────────────────
    "ISO27001-A.8.2": {
        "framework": "ISO27001",
        "control_id": "A.8.2",
        "control_name": "Information Classification",
        "description": "Information shall be classified according to business needs, legal requirements, and sensitivity.",
        "mapping_categories": ["data_protection", "asset_management"],
        "severity": "medium",
    },
    "ISO27001-A.9.1": {
        "framework": "ISO27001",
        "control_id": "A.9.1",
        "control_name": "Access Control Policy",
        "description": "An access control policy shall be established, documented, and reviewed.",
        "mapping_categories": ["access_control"],
        "severity": "high",
    },
    "ISO27001-A.9.4": {
        "framework": "ISO27001",
        "control_id": "A.9.4",
        "control_name": "System Access Control",
        "description": "Access to systems and applications shall be controlled via a formal authorization process.",
        "mapping_categories": ["access_control", "api_security"],
        "severity": "high",
    },
    "ISO27001-A.10": {
        "framework": "ISO27001",
        "control_id": "A.10",
        "control_name": "Cryptography",
        "description": "Rules for the effective use of cryptography shall be defined and implemented.",
        "mapping_categories": ["encryption"],
        "severity": "critical",
    },
    "ISO27001-A.12.4": {
        "framework": "ISO27001",
        "control_id": "A.12.4",
        "control_name": "Logging and Monitoring",
        "description": "Audit logs recording activities, exceptions, and security events shall be produced and maintained.",
        "mapping_categories": ["logging"],
        "severity": "high",
    },
    "ISO27001-A.12.6": {
        "framework": "ISO27001",
        "control_id": "A.12.6",
        "control_name": "Management of Technical Vulnerabilities",
        "description": "Technical vulnerabilities shall be identified, evaluated, and addressed in a timely manner.",
        "mapping_categories": ["vulnerability", "configuration"],
        "severity": "high",
    },

    # ── PCI-DSS ──────────────────────────────────────────────────────
    "PCI-DSS-Req1": {
        "framework": "PCI-DSS",
        "control_id": "Req 1",
        "control_name": "Network Security Controls",
        "description": "Network security controls are installed and maintained to protect cardholder data.",
        "mapping_categories": ["network_security", "configuration"],
        "severity": "critical",
    },
    "PCI-DSS-Req2": {
        "framework": "PCI-DSS",
        "control_id": "Req 2",
        "control_name": "Secure Configuration",
        "description": "System components are configured and managed securely with strong security parameters.",
        "mapping_categories": ["configuration", "container_security", "cloud_security"],
        "severity": "high",
    },
    "PCI-DSS-Req6": {
        "framework": "PCI-DSS",
        "control_id": "Req 6",
        "control_name": "Secure Development and Processes",
        "description": "Secure systems and software development processes are followed for all systems.",
        "mapping_categories": ["vulnerability", "api_security", "configuration"],
        "severity": "high",
    },
    "PCI-DSS-Req8": {
        "framework": "PCI-DSS",
        "control_id": "Req 8",
        "control_name": "Strong Authentication",
        "description": "Processes and mechanisms for identifying users and authenticating access are defined.",
        "mapping_categories": ["access_control", "encryption"],
        "severity": "critical",
    },
    "PCI-DSS-Req10": {
        "framework": "PCI-DSS",
        "control_id": "Req 10",
        "control_name": "Logging and Monitoring",
        "description": "All access to cardholder data and network resources is logged and monitored.",
        "mapping_categories": ["logging"],
        "severity": "high",
    },
    "PCI-DSS-Req11": {
        "framework": "PCI-DSS",
        "control_id": "Req 11",
        "control_name": "Regular Security Testing",
        "description": "Security testing (vulnerability scans, pen tests) is performed regularly.",
        "mapping_categories": ["vulnerability", "network_security"],
        "severity": "high",
    },

    # ── HIPAA ────────────────────────────────────────────────────────
    "HIPAA-164.312(a)": {
        "framework": "HIPAA",
        "control_id": "§164.312(a)",
        "control_name": "Access Controls",
        "description": "Implement technical policies and procedures to allow only authorized persons to access ePHI.",
        "mapping_categories": ["access_control", "api_security"],
        "severity": "critical",
    },
    "HIPAA-164.312(b)": {
        "framework": "HIPAA",
        "control_id": "§164.312(b)",
        "control_name": "Audit Controls",
        "description": "Implement mechanisms to record and examine activity in information systems containing ePHI.",
        "mapping_categories": ["logging"],
        "severity": "high",
    },
    "HIPAA-164.312(c)": {
        "framework": "HIPAA",
        "control_id": "§164.312(c)",
        "control_name": "Integrity Controls",
        "description": "Implement policies and procedures to protect ePHI from improper alteration or destruction.",
        "mapping_categories": ["data_protection", "configuration"],
        "severity": "high",
    },
    "HIPAA-164.312(e)": {
        "framework": "HIPAA",
        "control_id": "§164.312(e)",
        "control_name": "Transmission Security",
        "description": "Implement technical security measures to guard against unauthorized access during transmission.",
        "mapping_categories": ["encryption", "network_security"],
        "severity": "critical",
    },

    # ── GDPR ─────────────────────────────────────────────────────────
    "GDPR-Art.25": {
        "framework": "GDPR",
        "control_id": "Art. 25",
        "control_name": "Data Protection by Design and Default",
        "description": "The controller shall implement appropriate technical and organisational measures for data protection.",
        "mapping_categories": ["data_protection", "access_control", "configuration"],
        "severity": "high",
    },
    "GDPR-Art.32": {
        "framework": "GDPR",
        "control_id": "Art. 32",
        "control_name": "Security of Processing",
        "description": "Implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.",
        "mapping_categories": ["encryption", "access_control", "logging", "vulnerability"],
        "severity": "critical",
    },
    "GDPR-Art.33": {
        "framework": "GDPR",
        "control_id": "Art. 33",
        "control_name": "Breach Notification",
        "description": "Notify the supervisory authority of a personal data breach within 72 hours.",
        "mapping_categories": ["incident_response", "logging"],
        "severity": "high",
    },

    # ── CIS Controls ─────────────────────────────────────────────────
    "CIS-1.1": {
        "framework": "CIS",
        "control_id": "1.1",
        "control_name": "Enterprise Asset Inventory",
        "description": "Maintain an accurate and up-to-date inventory of all enterprise assets.",
        "mapping_categories": ["asset_management"],
        "severity": "high",
    },
    "CIS-3.1": {
        "framework": "CIS",
        "control_id": "3.1",
        "control_name": "Secure Configuration",
        "description": "Establish and maintain secure configuration of enterprise assets and software.",
        "mapping_categories": ["configuration", "container_security", "cloud_security"],
        "severity": "high",
    },
    "CIS-5.1": {
        "framework": "CIS",
        "control_id": "5.1",
        "control_name": "Access Control Management",
        "description": "Establish and maintain an account management process.",
        "mapping_categories": ["access_control"],
        "severity": "high",
    },
    "CIS-6.1": {
        "framework": "CIS",
        "control_id": "6.1",
        "control_name": "Audit Log Management",
        "description": "Collect, alert, review, and retain audit logs of events that could affect security.",
        "mapping_categories": ["logging"],
        "severity": "high",
    },
    "CIS-13.1": {
        "framework": "CIS",
        "control_id": "13.1",
        "control_name": "Network Monitoring and Defense",
        "description": "Centralize collection and analysis of network event data.",
        "mapping_categories": ["logging", "network_security"],
        "severity": "medium",
    },
}


# ══════════════════════════════════════════════════════════════════════
# ComplianceReport
# ══════════════════════════════════════════════════════════════════════

@dataclass
class ComplianceReport:
    """Structured output of a compliance mapping run."""

    per_framework: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    findings_by_control: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    overall_compliance: float = 0.0
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "per_framework": self.per_framework,
            "findings_by_control": {
                k: v for k, v in self.findings_by_control.items()
            },
            "overall_compliance": self.overall_compliance,
            "recommendations": self.recommendations,
        }

    def summary_text(self) -> str:
        """Human-readable multi-line summary."""
        lines = ["=" * 64, "COMPLIANCE MAPPING REPORT", "=" * 64, ""]
        for fw, data in self.per_framework.items():
            pct = data["compliance_pct"]
            covered = data["covered_controls"]
            total = data["total_controls"]
            lines.append(f"  [{fw}]  {pct:.0f}%  ({covered}/{total} controls covered)")
            if data["gaps"]:
                for g in data["gaps"]:
                    lines.append(f"      ⚠ GAP: {g}")
            lines.append("")
        lines.append(f"  Overall Compliance: {self.overall_compliance:.0f}%")
        lines.append("")
        if self.recommendations:
            lines.append("  RECOMMENDATIONS:")
            for r in self.recommendations:
                lines.append(f"    • {r}")
        lines.append("=" * 64)
        return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════
# ComplianceMapper
# ══════════════════════════════════════════════════════════════════════

class ComplianceMapper:
    """Map security findings to compliance controls.

    Parameters
    ----------
    rules : dict | None
        Override the default ``COMPLIANCE_RULES``.
    """

    def __init__(self, rules: Optional[Dict[str, Dict[str, Any]]] = None) -> None:
        self._rules = rules if rules is not None else COMPLIANCE_RULES

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def map_findings(
        self,
        findings: List[Dict[str, Any]],
        frameworks: Optional[List[str]] = None,
    ) -> ComplianceReport:
        """Map each finding to applicable compliance controls.

        Parameters
        ----------
        findings : list[dict]
            Each dict must have at least ``category`` (str).  Other useful
            keys: ``title``, ``severity``, ``description``, ``cves``,
            ``remediation``.
        frameworks : list[str] | None
            Restrict to these frameworks (e.g. ``["SOC2", "PCI-DSS"]``).  
            ``None`` means all.
        """
        # Filter rules by framework if requested
        if frameworks:
            fw_set = {f.strip().upper() for f in frameworks}
            active_rules = {
                cid: rule for cid, rule in self._rules.items()
                if rule["framework"].upper() in fw_set
            }
        else:
            active_rules = self._rules

        # Index rules by their mapping categories
        cat_to_controls: Dict[str, List[str]] = {}
        for cid, rule in active_rules.items():
            for cat in rule["mapping_categories"]:
                cat_to_controls.setdefault(cat, []).append(cid)

        # Map each finding
        findings_by_control: Dict[str, List[Dict[str, Any]]] = {}
        for f in findings:
            raw_cat = f.get("category", f.get("type", ""))
            canonical = _match_category(raw_cat)
            matched_controls = cat_to_controls.get(canonical, [])
            if not matched_controls:
                # Try exact raw match
                matched_controls = cat_to_controls.get(raw_cat.lower().replace("-","_").replace(" ","_"), [])
            for cid in matched_controls:
                findings_by_control.setdefault(cid, []).append(f)

        # Group rules by framework
        fw_rules: Dict[str, Dict[str, Dict[str, Any]]] = {}
        for cid, rule in active_rules.items():
            fw = rule["framework"]
            fw_rules.setdefault(fw, {})[cid] = rule

        # Compute per-framework compliance
        per_framework: Dict[str, Dict[str, Any]] = {}
        fw_pcts: List[float] = []
        for fw, rules_dict in fw_rules.items():
            total = len(rules_dict)
            covered = sum(1 for cid in rules_dict if cid in findings_by_control)
            pct = (covered / total * 100.0) if total else 100.0
            gaps = [cid for cid in rules_dict if cid not in findings_by_control]
            per_framework[fw] = {
                "total_controls": total,
                "covered_controls": covered,
                "compliance_pct": round(pct, 1),
                "gaps": gaps,
            }
            fw_pcts.append(pct)

        overall = sum(fw_pcts) / len(fw_pcts) if fw_pcts else 100.0

        # Recommendations
        recommendations = self._generate_recommendations(per_framework, findings_by_control)

        return ComplianceReport(
            per_framework=per_framework,
            findings_by_control=findings_by_control,
            overall_compliance=round(overall, 1),
            recommendations=recommendations,
        )

    def generate_evidence(self, finding: Dict[str, Any], control_id: str) -> str:
        """Describe how *finding* provides evidence for (or against) *control_id*.

        Returns a human-readable evidence statement.
        """
        rule = self._rules.get(control_id)
        if not rule:
            return f"No compliance rule found for {control_id}."

        title = finding.get("title", "Unnamed finding")
        sev = finding.get("severity", "unknown")
        desc = finding.get("description", "")
        fw = rule["framework"]
        cname = rule["control_name"]
        cid = rule["control_id"]

        if sev in ("high", "critical"):
            return (
                f"FINDING [{sev.upper()}]: {title}\n"
                f"  The presence of this {sev}-severity finding indicates a likely non-compliance "
                f"with {fw} {cid} ({cname}). {desc}\n"
                f"  This finding was automatically mapped because its category relates to "
                f"the control's scope: {', '.join(rule['mapping_categories'])}."
            )
        elif sev == "medium":
            return (
                f"FINDING [{sev.upper()}]: {title}\n"
                f"  This medium-severity finding is potentially relevant to {fw} {cid} ({cname}). "
                f"While not a definitive non-compliance indicator, it suggests the control "
                f"may not be fully implemented. {desc}"
            )
        else:
            return (
                f"FINDING [{sev.upper()}]: {title}\n"
                f"  This informational finding was mapped to {fw} {cid} ({cname}) by category "
                f"association. It does not indicate non-compliance but provides coverage evidence "
                f"that the control area is being tested."
            )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _generate_recommendations(
        self,
        per_framework: Dict[str, Dict[str, Any]],
        findings_by_control: Dict[str, List[Dict[str, Any]]],
    ) -> List[str]:
        recs: List[str] = []
        seen: set = set()

        for fw, data in per_framework.items():
            pct = data["compliance_pct"]
            gaps = data["gaps"]

            if pct < 50:
                recs.append(
                    f"{fw} compliance is critically low at {pct:.0f}%. "
                    f"{len(gaps)} of {data['total_controls']} controls have no coverage."
                )
            elif pct < 80:
                recs.append(
                    f"{fw} compliance is at {pct:.0f}%. Address {len(gaps)} uncovered controls."
                )

            for gid in gaps:
                rule = self._rules.get(gid)
                if not rule:
                    continue
                cat_str = ", ".join(rule["mapping_categories"])
                key = (fw, gid)
                if key not in seen:
                    seen.add(key)
                    recs.append(
                        f"[{fw}] GAP: {gid} {rule['control_name']} — no findings cover this control. "
                        f"Consider testing categories: {cat_str}."
                    )

        # Severity-based recommendations
        high_sev_controls: Dict[str, int] = {}
        for cid, f_list in findings_by_control.items():
            rule = self._rules.get(cid)
            if not rule:
                continue
            crit_count = sum(1 for f in f_list if f.get("severity") in ("high", "critical"))
            if crit_count > 0:
                high_sev_controls[cid] = crit_count

        for cid, count in sorted(high_sev_controls.items(), key=lambda x: -x[1])[:5]:
            rule = self._rules.get(cid, {})
            if (rule.get("framework"), cid) not in seen:
                recs.append(
                    f"[{rule.get('framework','')}] {cid} has {count} high/critical findings — "
                    f"prioritize remediation of {rule.get('control_name', cid)}."
                )

        return recs


# Module-level convenience exports
mapper = ComplianceMapper()
