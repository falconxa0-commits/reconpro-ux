"""Confidence Engine — Score finding confidence based on evidence strength.

Factors:
- Evidence specificity (detailed vs generic)
- Corroboration (multiple modules confirm same issue)
- Severity consistency (does the evidence match claimed severity?)
- Reproducibility marker (was finding seen in previous scans?)

Zero external dependencies — uses only stdlib.
"""

from __future__ import annotations

import hashlib
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional

# Normalised severity values accepted for scoring.
_VALID_SEVERITIES = {"info", "low", "medium", "high", "critical"}
_SEVERITY_WEIGHT = {
    "info": 0.0,
    "low": 0.25,
    "medium": 0.5,
    "high": 0.75,
    "critical": 1.0,
}


def _normalise_severity(raw: Any) -> str:
    """Return a normalised severity string."""
    if raw is None:
        return "info"
    s = str(raw).strip().lower()
    return s if s in _VALID_SEVERITIES else "info"


def _fingerprint(finding: Dict[str, Any]) -> str:
    """Deterministic fingerprint for deduplication / corroboration.

    Uses title + category + asset to identify the "same" issue found
    by different modules.
    """
    key = (
        str(finding.get("title", ""))
        + "|"
        + str(finding.get("category", ""))
        + "|"
        + str(finding.get("asset", finding.get("target", "")))
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


class ConfidenceEngine:
    """Score finding confidence based on multi-factor evidence analysis.

    Each finding receives a confidence score between 0.0 and 1.0.
    Higher confidence means the finding is more likely a true positive.
    """

    def __init__(self) -> None:
        self._seen_fingerprints: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    # ------------------------------------------------------------------
    #  Public API
    # ------------------------------------------------------------------

    def score_finding(
        self,
        finding: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> float:
        """Score a single finding's confidence on a 0.0–1.0 scale.

        Parameters
        ----------
        finding : dict
            A finding dict (e.g. from ``Finding.to_dict()``).
        context : dict | None
            Optional extra context.  Recognised keys:

            * ``"previous_findings"`` — list of prior finding dicts for
              the same target (enables reproducibility check).
            * ``"module_count"`` — total number of modules that ran
              (used for corroboration ratio).

        Returns
        -------
        float
            Confidence score in [0.0, 1.0].
        """
        ctx = context or {}
        score = 0.5  # baseline

        # 1. Evidence specificity (0.0 – 0.30)
        score += self._evidence_specificity(finding) * 0.30

        # 2. Severity consistency (0.0 – 0.20)
        score += self._severity_consistency(finding) * 0.20

        # 3. Reproducibility (0.0 – 0.25)
        score += self._reproducibility(finding, ctx) * 0.25

        # 4. Has remediation (0.0 – 0.05)
        if finding.get("remediation", "").strip():
            score += 0.05

        # 5. Has CVE references (0.0 – 0.10)
        score += self._cve_bonus(finding) * 0.10

        # 6. Evidence length bonus (0.0 – 0.10)
        evidence_len = len(str(finding.get("evidence", "")))
        if evidence_len > 200:
            score += 0.10
        elif evidence_len > 100:
            score += 0.06
        elif evidence_len > 30:
            score += 0.03

        return round(min(max(score, 0.0), 1.0), 4)

    def score_findings(
        self,
        findings: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Batch-score a list of findings.

        Returns a new list where each dict has an added
        ``"confidence"`` key.

        Parameters
        ----------
        findings : list[dict]
            Finding dicts.
        context : dict | None
            Extra context forwarded to :meth:`score_finding`.
            ``"previous_findings"`` is automatically populated from
            the batch itself for corroboration.

        Returns
        -------
        list[dict]
            Enriched finding dicts with ``"confidence"`` field.
        """
        # Build reproducibility context from the batch itself.
        ctx = dict(context or {})
        if "previous_findings" not in ctx:
            ctx["previous_findings"] = findings

        enriched: List[Dict[str, Any]] = []
        for f in findings:
            f_copy = dict(f)
            f_copy["confidence"] = self.score_finding(f, ctx)
            enriched.append(f_copy)
        return enriched

    def corroborate(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Group findings about the same issue and boost confidence.

        Findings are considered the *same issue* when they share the
        same fingerprint (title + category + asset).  When multiple
        modules report the same issue, confidence is boosted
        proportionally.

        Parameters
        ----------
        findings : list[dict]
            Finding dicts (may already contain a ``"confidence"`` key).

        Returns
        -------
        list[dict]
            Findings with updated ``"confidence"`` and a new
            ``"corroboration_count"`` key.
        """
        groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for f in findings:
            fp = _fingerprint(f)
            groups[fp].append(f)

        result: List[Dict[str, Any]] = []
        for fp, group in groups.items():
            count = len(group)
            for f in group:
                f_copy = dict(f)
                base_confidence = f_copy.get("confidence", 0.5)

                # Corroboration boost: +0.15 per additional source, cap at +0.45
                if count > 1:
                    boost = min(0.15 * (count - 1), 0.45)
                    f_copy["confidence"] = round(
                        min(base_confidence + boost, 1.0), 4
                    )

                f_copy["corroboration_count"] = count
                result.append(f_copy)

        return result

    # ------------------------------------------------------------------
    #  Internal scoring factors
    # ------------------------------------------------------------------

    @staticmethod
    def _evidence_specificity(finding: Dict[str, Any]) -> float:
        """How specific / detailed is the evidence? Returns 0.0–1.0."""
        evidence = str(finding.get("evidence", "")).strip()
        description = str(finding.get("description", "")).strip()
        combined = evidence + " " + description

        if not combined.strip():
            return 0.0

        score = 0.0

        # Contains URLs or paths → more specific
        if re.search(r"https?://\S+|/\S+", combined):
            score += 0.3

        # Contains code snippets or technical markers
        if re.search(r'[<>{};]|\\n|function|class |def |import ', combined):
            score += 0.3

        # Contains headers or key-value patterns
        if re.search(r"[\w-]+:\s*\S+", combined):
            score += 0.2

        # Length indicator
        if len(combined) > 200:
            score += 0.2
        elif len(combined) > 80:
            score += 0.1

        return min(score, 1.0)

    @staticmethod
    def _severity_consistency(finding: Dict[str, Any]) -> float:
        """Check if claimed severity matches evidence strength.

        Returns 0.0 (inconsistent) to 1.0 (consistent).
        """
        severity = _normalise_severity(finding.get("severity"))
        evidence = str(finding.get("evidence", "")).strip()
        description = str(finding.get("description", "")).strip()
        combined = evidence + " " + description

        # Expected minimum evidence lengths per severity
        min_lengths = {
            "info": 0,
            "low": 10,
            "medium": 30,
            "high": 60,
            "critical": 100,
        }
        expected = min_lengths.get(severity, 0)

        if len(combined) >= expected:
            return 1.0

        # Partial credit
        ratio = len(combined) / max(expected, 1)
        return round(min(ratio, 1.0), 2)

    def _reproducibility(
        self,
        finding: Dict[str, Any],
        context: Dict[str, Any],
    ) -> float:
        """Check if the finding was seen in previous scans.

        Returns 0.0 (not reproducible) to 1.0 (previously confirmed).
        """
        previous = context.get("previous_findings", [])
        if not previous:
            return 0.0

        fp = _fingerprint(finding)
        # Check if this fingerprint was already seen
        if fp in self._seen_fingerprints:
            return 1.0

        # Check in the provided previous findings
        for prev in previous:
            if _fingerprint(prev) == fp:
                return 0.9  # near-certain reproducibility

        return 0.0

    @staticmethod
    def _cve_bonus(finding: Dict[str, Any]) -> float:
        """Bonus for CVE references.

        Returns 0.0–1.0 based on presence and count of CVE IDs.
        """
        cves = finding.get("cves", finding.get("references", []))
        if not cves:
            # Check in evidence/description for CVE pattern
            evidence = str(finding.get("evidence", "")) + " " + str(finding.get("description", ""))
            cves = re.findall(r"CVE-\d{4}-\d{4,}", evidence, re.IGNORECASE)

        if not cves:
            return 0.0

        count = len(cves)
        if count >= 3:
            return 1.0
        elif count >= 2:
            return 0.7
        return 0.4
