"""Evidence Correlation Engine — Merge, deduplicate, and corroborate findings.

Takes raw findings from multiple scan modules, groups corroborating
reports about the same issue, boosts confidence through multi-source
confirmation, detects severity upgrades, and assembles evidence chains
with optional attack-path linking.

Design:
    - Zero external dependencies (stdlib only + optional confidence_engine).
    - Handles empty / malformed findings gracefully.
    - Deterministic fingerprinting for stable deduplication.
    - ~350 LOC.

Council Eta — ReconPro Friday Engineering Council
"""

from __future__ import annotations

import hashlib
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Optional integration with confidence_engine for base scoring
# ---------------------------------------------------------------------------
try:
    from reconpro.confidence_engine import ConfidenceEngine as _CE

    _HAS_CE = True
except ImportError:
    _HAS_CE = False

# ---------------------------------------------------------------------------
# Severity helpers
# ---------------------------------------------------------------------------

_SEVERITY_ORDER = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
_VALID_SEVERITIES = set(_SEVERITY_ORDER)


def _normalise_severity(raw: Any) -> str:
    """Normalise any severity value to a canonical string."""
    if raw is None:
        return "info"
    s = str(raw).strip().lower()
    return s if s in _VALID_SEVERITIES else "info"


# ---------------------------------------------------------------------------
# Evidence type inference
# ---------------------------------------------------------------------------

_TECHNICAL_PATTERNS = {
    "sql_injection": ["sql", "injection", "select ", "union ", "insert "],
    "xss": ["xss", "cross-site", "script", "reflected", "stored", "dom"],
    "rce": ["rce", "remote code", "command injection", "exec", "system("],
    "ssrf": ["ssrf", "server-side request", "internal request"],
    "path_traversal": ["path traversal", "directory traversal", "../"],
    "auth_bypass": ["auth bypass", "authentication", "unauthorised", "unauthorized"],
    "info_disclosure": ["information disclosure", "sensitive data", "leak"],
    "misconfiguration": ["misconfiguration", "default cred", "debug mode"],
    "network": ["port", "service", "open", "banner", "dns"],
    "crypto": ["tls", "ssl", "certificate", "cipher", "https"],
}


def _infer_evidence_types(finding: Dict[str, Any]) -> List[str]:
    """Infer evidence types from evidence text and module name."""
    types: List[str] = []
    evidence = str(finding.get("evidence", "")).lower()
    description = str(finding.get("description", "")).lower()
    combined = evidence + " " + description

    for etype, keywords in _TECHNICAL_PATTERNS.items():
        if any(kw in combined for kw in keywords):
            types.append(etype)

    # Module name as an evidence type
    module = str(finding.get("module", "")).strip()
    if module and module not in types:
        types.append(module)

    # Evidence field structure as a type indicator
    if "response" in combined or "status" in combined:
        if "http_response" not in types:
            types.append("http_response")
    if "header" in combined:
        if "http_header" not in types:
            types.append("http_header")

    return types if types else ["unknown"]


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class EvidenceChain:
    """A corroborated chain of findings about the same vulnerability.

    Attributes:
        chain_id: Unique UUID for this chain.
        primary_finding: The first (or most detailed) finding in the group.
        corroborating_findings: Additional findings from other modules.
        confidence: Boosted confidence score (0.0–1.0).
        evidence_types: Distinct types of evidence collected.
        source_modules: Which modules contributed findings.
        attack_path: Optional linked vulnerability chain.
        severity: Final severity (may be upgraded).
    """

    chain_id: str = ""
    primary_finding: Dict[str, Any] = field(default_factory=dict)
    corroborating_findings: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.5
    evidence_types: List[str] = field(default_factory=list)
    source_modules: List[str] = field(default_factory=list)
    attack_path: Optional[List[str]] = None
    severity: str = "info"

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the evidence chain to a plain dict."""
        return {
            "chain_id": self.chain_id,
            "primary_finding": self.primary_finding,
            "corroborating_findings": self.corroborating_findings,
            "confidence": round(self.confidence, 4),
            "evidence_types": self.evidence_types,
            "source_modules": self.source_modules,
            "attack_path": self.attack_path,
            "severity": self.severity,
        }


@dataclass
class CorrelationResult:
    """Aggregated result of the correlation pass.

    Attributes:
        chains: The final evidence chains after dedup + corroboration.
        deduplicated_count: How many duplicate findings were removed.
        confidence_boosted: How many findings had confidence increased.
        severity_upgrades: Findings whose severity was promoted.
        processing_time_ms: Wall-clock time for the correlation pass.
    """

    chains: List[EvidenceChain] = field(default_factory=list)
    deduplicated_count: int = 0
    confidence_boosted: int = 0
    severity_upgrades: List[Dict[str, Any]] = field(default_factory=list)
    processing_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the correlation result to a plain dict."""
        return {
            "chains": [c.to_dict() for c in self.chains],
            "deduplicated_count": self.deduplicated_count,
            "confidence_boosted": self.confidence_boosted,
            "severity_upgrades": self.severity_upgrades,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "total_chains": len(self.chains),
        }


# ---------------------------------------------------------------------------
# Main correlator
# ---------------------------------------------------------------------------


class EvidenceCorrelator:
    """Merge, deduplicate, and corroborate findings from multiple modules.

    Finds from different scan modules that describe the same vulnerability
    are grouped into an :class:`EvidenceChain`.  Confidence is boosted by
    corroboration count, and severity may be upgraded when enough modules
    independently confirm a finding.
    """

    def __init__(self) -> None:
        # Optional confidence engine for base scoring
        if _HAS_CE:
            self._ce = _CE()
        else:
            self._ce = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def correlate(
        self,
        findings: List[Dict[str, Any]],
        scan_context: Optional[Dict[str, Any]] = None,
    ) -> CorrelationResult:
        """Run the full correlation pipeline.

        Parameters
        ----------
        findings : list[dict]
            Raw findings from scan modules.  Each finding is a dict with
            at least ``title``, ``category``, ``target``, ``evidence``,
            and ``module`` keys (but malformed / missing-key dicts are
            handled gracefully).
        scan_context : dict | None
            Optional context forwarded to the confidence engine.

        Returns
        -------
        CorrelationResult
            Aggregated chains and statistics.
        """
        t0 = time.perf_counter()

        # Gracefully handle empty or non-list input
        if not findings or not isinstance(findings, list):
            return CorrelationResult(processing_time_ms=0.0)

        # Sanitise: skip None / non-dict entries
        safe_findings = [
            f for f in findings if isinstance(f, dict) and f.get("title")
        ]

        total_input = len(safe_findings)
        if total_input == 0:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            return CorrelationResult(processing_time_ms=elapsed_ms)

        # Step 1: Group by fingerprint
        grouped = self._group_by_fingerprint(safe_findings)

        # Step 2: Build chains
        chains = self._build_chain(grouped)

        # Step 3: Build attack paths across chains
        self._build_attack_paths(chains)

        # Step 4: Compute statistics
        total_chains = len(chains)
        deduplicated_count = total_input - total_chains

        confidence_boosted = sum(
            1 for c in chains if len(c.corroborating_findings) > 0
        )

        severity_upgrades: List[Dict[str, Any]] = []
        for c in chains:
            upgrade = self._detect_severity_upgrade(c)
            if upgrade is not None:
                c.severity = upgrade
                severity_upgrades.append({
                    "chain_id": c.chain_id,
                    "title": c.primary_finding.get("title", ""),
                    "original_severity": c.primary_finding.get("severity", "unknown"),
                    "upgraded_severity": upgrade,
                    "corroboration_sources": c.source_modules,
                })

        elapsed_ms = (time.perf_counter() - t0) * 1000

        return CorrelationResult(
            chains=chains,
            deduplicated_count=deduplicated_count,
            confidence_boosted=confidence_boosted,
            severity_upgrades=severity_upgrades,
            processing_time_ms=elapsed_ms,
        )

    # ------------------------------------------------------------------
    # Fingerprinting & grouping
    # ------------------------------------------------------------------

    @staticmethod
    def _fingerprint(finding: Dict[str, Any]) -> str:
        """Deterministic ID for deduplication.

        Two findings match when they share the same *title*, *category*,
        and *target*.  The fingerprint is a truncated SHA-256 hex digest.
        """
        title = str(finding.get("title", "")).strip()
        category = str(finding.get("category", "")).strip()
        target = str(finding.get("target", finding.get("asset", ""))).strip()
        key = f"{title}|{category}|{target}"
        return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]

    @staticmethod
    def _group_by_fingerprint(findings: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group findings by their deduplication fingerprint."""
        groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for f in findings:
            fp = EvidenceCorrelator._fingerprint(f)
            groups[fp].append(f)
        return dict(groups)

    # ------------------------------------------------------------------
    # Chain building
    # ------------------------------------------------------------------

    def _build_chain(self, grouped: Dict[str, List[Dict[str, Any]]]) -> List[EvidenceChain]:
        """Convert fingerprint groups into EvidenceChain objects.

        The primary finding is chosen as the one with the most detailed
        evidence (longest evidence + description length).  All others
        become corroborating findings.
        """
        chains: List[EvidenceChain] = []

        for _fp, group in grouped.items():
            if not group:
                continue

            # Pick primary: longest evidence text (most detailed)
            sorted_group = sorted(
                group,
                key=lambda f: len(
                    str(f.get("evidence", ""))
                    + str(f.get("description", ""))
                ),
                reverse=True,
            )

            primary = dict(sorted_group[0])
            corroborating = [dict(f) for f in sorted_group[1:]]

            # Collect source modules (deduplicated, maintain order)
            modules: List[str] = []
            seen_modules: set = set()
            for f in sorted_group:
                mod = str(f.get("module", "unknown")).strip()
                if mod and mod not in seen_modules:
                    modules.append(mod)
                    seen_modules.add(mod)

            # Collect evidence types (deduplicated)
            evidence_types: List[str] = []
            seen_types: set = set()
            for f in sorted_group:
                for et in _infer_evidence_types(f):
                    if et not in seen_types:
                        evidence_types.append(et)
                        seen_types.add(et)

            # Compute boosted confidence
            confidence = self._compute_chain_confidence(sorted_group)

            chain = EvidenceChain(
                chain_id=self._generate_chain_id(),
                primary_finding=primary,
                corroborating_findings=corroborating,
                confidence=confidence,
                evidence_types=evidence_types,
                source_modules=modules,
                attack_path=None,
                severity=_normalise_severity(primary.get("severity")),
            )
            chains.append(chain)

        return chains

    def _compute_chain_confidence(self, findings: List[Dict[str, Any]]) -> float:
        """Compute chain-level confidence with corroboration boost.

        Formula::

            confidence = base + 0.1 * (N - 1)

        where *base* is the primary finding's confidence (from
        confidence_engine if available, else 0.5), *N* is the total
        number of corroborating findings (including primary), and the
        result is capped at 1.0.
        """
        if not findings:
            return 0.0

        n = len(findings)

        # Get base confidence — try confidence_engine first
        primary = findings[0]
        if self._ce is not None:
            base = self._ce.score_finding(primary)
        else:
            # Fall back to pre-scored confidence or default
            base = float(primary.get("confidence", 0.5))

        # Corroboration boost: +0.1 per additional source beyond the first
        boost = 0.1 * (n - 1) if n > 1 else 0.0

        return round(min(base + boost, 1.0), 4)

    # ------------------------------------------------------------------
    # Severity upgrade detection
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_severity_upgrade(chain: EvidenceChain) -> Optional[str]:
        """Check whether a chain's severity should be promoted.

        Rule: if **3 or more** distinct modules confirm a ``medium``
        finding, upgrade it to ``high``.
        """
        primary_sev = _normalise_severity(chain.primary_finding.get("severity"))
        if primary_sev != "medium":
            return None

        distinct_modules = len(set(chain.source_modules))
        if distinct_modules >= 3:
            return "high"

        return None

    # ------------------------------------------------------------------
    # Attack path linking
    # ------------------------------------------------------------------

    @staticmethod
    def _build_attack_paths(chains: List[EvidenceChain]) -> None:
        """Link chains that share related assets or target progression.

        Modifies chains in-place: chains that share a target (or whose
        targets share a common domain) are linked into an attack path.

        The algorithm:
        1. Build a target → chain index.
        2. For each chain, look for other chains whose target contains
           the same domain or whose ``evidence`` references the chain's
           ``target``.  When found, link them.
        """
        if len(chains) < 2:
            return

        # Build target -> list of chain indices
        target_map: Dict[str, List[int]] = defaultdict(list)
        for idx, chain in enumerate(chains):
            target = str(chain.primary_finding.get("target", ""))
            if target:
                target_map[target].append(idx)

        # Extract domain-level grouping
        domain_map: Dict[str, List[int]] = defaultdict(list)
        for idx, chain in enumerate(chains):
            target = str(chain.primary_finding.get("target", ""))
            domain = _extract_base_domain(target)
            if domain:
                domain_map[domain].append(idx)

        # Link chains within the same domain
        for domain, indices in domain_map.items():
            if len(indices) < 2:
                continue

            # Build an ordered path based on severity progression
            sorted_indices = sorted(
                indices,
                key=lambda i: _SEVERITY_ORDER.get(
                    _normalise_severity(chains[i].severity), 0
                ),
            )

            path: List[str] = []
            for i in sorted_indices:
                chain = chains[i]
                title = str(chain.primary_finding.get("title", "unknown"))
                target = str(chain.primary_finding.get("target", ""))
                path.append(f"{title} ({target})")

            # Assign the same attack path to all chains in this domain cluster
            for i in sorted_indices:
                chains[i].attack_path = list(path)

        # Cross-reference: chains whose evidence mentions another chain's target
        for i, chain in enumerate(chains):
            target_i = str(chain.primary_finding.get("target", ""))
            evidence_i = (
                str(chain.primary_finding.get("evidence", "")).lower()
                + " "
                + str(chain.primary_finding.get("description", "")).lower()
            )

            for j, other in enumerate(chains):
                if i == j:
                    continue
                target_j = str(other.primary_finding.get("target", "")).lower()
                if target_j and target_j in evidence_i and target_j != target_i.lower():
                    # Merge attack paths
                    if chain.attack_path is None:
                        chain.attack_path = []
                    other_title = str(other.primary_finding.get("title", "unknown"))
                    other_target = str(other.primary_finding.get("target", ""))
                    link = f"-> {other_title} ({other_target})"
                    if link not in chain.attack_path:
                        chain.attack_path.append(link)

    # ------------------------------------------------------------------
    # ID generation
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_chain_id() -> str:
        """Generate a unique chain identifier (UUID4)."""
        return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Domain extraction helper
# ---------------------------------------------------------------------------

def _extract_base_domain(target: str) -> str:
    """Extract a base domain from a target string.

    Handles cases like ``api.example.com``, ``https://example.com/path``,
    ``192.168.1.1``, etc.  Returns the host portion or empty string.
    """
    t = target.strip().lower()

    # Strip scheme
    for prefix in ("https://", "http://", "ws://", "wss://"):
        if t.startswith(prefix):
            t = t[len(prefix):]
            break

    # Strip path
    slash_idx = t.find("/")
    if slash_idx != -1:
        t = t[:slash_idx]

    # Strip port
    colon_idx = t.find(":")
    if colon_idx != -1:
        t = t[:colon_idx]

    return t if t else ""
