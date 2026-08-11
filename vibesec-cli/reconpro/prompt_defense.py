"""Prompt Defense — Protect AI-powered features from injection attacks.

Covers:
- z.ai chat integration
- Agent goal parsing
- Chat REPL input
- Any future LLM entry points

Patterns detected:
- Direct prompt injection
- Role manipulation
- Instruction override attempts
- Data exfiltration via AI responses
- System prompt extraction
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple


# ── Threat levels ────────────────────────────────────────────────

class ThreatLevel(str, Enum):
    """Severity of a detected prompt injection attempt."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Sensitivity thresholds ───────────────────────────────────────

THRESHOLDS: Dict[str, int] = {
    "low": 2,      # Trigger at 2+ pattern matches
    "medium": 1,   # Trigger at 1+ pattern matches
    "high": 1,     # Same as medium but flags low-severity patterns too
}

DEFAULT_SENSITIVITY = "medium"


# ── Data classes ─────────────────────────────────────────────────

@dataclass
class SanitizationResult:
    """Result of sanitizing user input for prompt injection."""
    cleaned: str
    threat_level: ThreatLevel
    matched_patterns: List[str] = field(default_factory=list)
    is_safe: bool = True

    def to_dict(self) -> Dict[str, object]:
        return {
            "cleaned": self.cleaned,
            "threat_level": self.threat_level.value,
            "matched_patterns": self.matched_patterns,
            "is_safe": self.is_safe,
        }


@dataclass
class ResponseValidationResult:
    """Result of validating an AI response for leakage or manipulation."""
    is_safe: bool = True
    issues: List[str] = field(default_factory=list)
    threat_level: ThreatLevel = ThreatLevel.NONE

    def to_dict(self) -> Dict[str, object]:
        return {
            "is_safe": self.is_safe,
            "issues": self.issues,
            "threat_level": self.threat_level.value,
        }


# ── Injection pattern database ───────────────────────────────────
# Each entry: category -> list of (name, compiled_regex, threat_level)

# Build response patterns separately (cleaner without string delim issues)
_RESP_DATA_LEAK = re.compile(
    r'["\x27:]+[\s]*["\x27]*[A-Za-z0-9_-]{16,}',
    re.IGNORECASE
)

PATTERNS: Dict[str, List[Tuple[str, re.Pattern[str], ThreatLevel]]] = {
    "role_manipulation": [
        ("ignore_previous", re.compile(
            r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|commands?)",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("you_are_now", re.compile(
            r"you\s+(are|have been)\s+now\s+(a|an|the)\s+\w+",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("pretend_you_are", re.compile(
            r"(pretend|act|imagine)\s+(you are|you're|that you|as if you)\s+(a|an|the)\b",
            re.IGNORECASE
        ), ThreatLevel.MEDIUM),
        ("new_role", re.compile(
            r"(?:new|different)\s+(role|identity|persona|instructions?|system\s*prompt)",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("forget_instructions", re.compile(
            r"(?:forget|disregard|discard|ignore)\s+(?:your|the|all)\s+(?:instructions?|rules?|guidelines?|prompt)",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
    ],
    "instruction_override": [
        ("override_instruction", re.compile(
            r"(override|replace|change|update)\s+(the\s+)?(instruction|system|prompt)",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("do_not_follow", re.compile(
            r"do\s+not\s+(follow|obey|adhere\s+to)\s+(your|the|any)\s+(instructions?|rules?|guidelines?)",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("output_format_override", re.compile(
            r"(?:respond|answer|output|reply)\s+(?:only|exclusively|just)\s+(?:with|in|using)",
            re.IGNORECASE
        ), ThreatLevel.MEDIUM),
        ("no_restrictions", re.compile(
            r"(no|without|remove|bypass|disable)\s+(?:any\s+)?(restrictions?|limits?|rules?|filters?|safety)",
            re.IGNORECASE
        ), ThreatLevel.CRITICAL),
        ("jailbreak_dan", re.compile(
            r"\bDAN\b|\bjailbreak\b|\banti[- ]?filter\b",
            re.IGNORECASE
        ), ThreatLevel.CRITICAL),
    ],
    "data_exfiltration": [
        ("exfil_system_prompt", re.compile(
            r"(?:reveal|show|print|dump|output|display|repeat|echo)\s+(?:the\s+)?(?:system|original|full|complete|entire)\s+(?:prompt|instructions?|rules?)",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("exfil_prefix", re.compile(
            r"(?:what|repeat|output|print)\s+(?:is\s+)?(?:the\s+)?(?:first|initial|starting|system)\s+(?:words?|text|prompt|message|instruction)",
            re.IGNORECASE
        ), ThreatLevel.MEDIUM),
        ("encode_response", re.compile(
            r"(?:encode|convert|translate|base64|hex|rot13)\s+(?:your|the|this)\s+(?:response|output|answer)",
            re.IGNORECASE
        ), ThreatLevel.MEDIUM),
        ("hidden_instruction", re.compile(
            r"\[\s*(?:system|hidden|secret|admin|internal)\s*[:=]\s*[\s\S]*?\]\s*$",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
    ],
    "injection_techniques": [
        ("xml_injection", re.compile(
            r"<\s*(?:system|instruction|prompt|role)\s*>",
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("code_block_injection", re.compile(
            r"```(?:system|prompt|instruction)\b",
            re.IGNORECASE
        ), ThreatLevel.MEDIUM),
        ("json_injection", re.compile(
            r'\{"?role"?\s*:\s*"?system"?',
            re.IGNORECASE
        ), ThreatLevel.HIGH),
        ("multi_step_injection", re.compile(
            r"(?:step\s+\d+|phase\s+\d+|part\s+\d+)\s*[:.]\s*(?:first|then|next|after that)",
            re.IGNORECASE
        ), ThreatLevel.LOW),
        ("markdown_heading_injection", re.compile(
            r"^#{1,6}\s*(?:system|instruction|new\s+prompt|override)",
            re.IGNORECASE | re.MULTILINE
        ), ThreatLevel.MEDIUM),
        ("continuation_attack", re.compile(
            r"(?:continue|keep going|go on|proceed)\s+(?:from|with|the)\s+(?:above|previous|last)",
            re.IGNORECASE
        ), ThreatLevel.LOW),
        ("completion_hijack", re.compile(
            r"(?:complete|finish|end)\s+(?:the|this)\s+(?:sentence|phrase|thought|pattern)",
            re.IGNORECASE
        ), ThreatLevel.LOW),
    ],
    "social_engineering": [
        ("authority_claim", re.compile(
            r"(?:i\s+am|we\s+are)\s+(?:the\s+)?(?:admin|developer|creator|owner|operator|maintainer)",
            re.IGNORECASE
        ), ThreatLevel.MEDIUM),
        ("emergency_urgency", re.compile(
            r"(?:urgent|emergency|critical|asap|immediately|right now|this is important)",
            re.IGNORECASE
        ), ThreatLevel.LOW),
        ("threat_intimidation", re.compile(
            r"(?:you\s+will|you\s+must|failure|penalty|consequence|otherwise|or else)",
            re.IGNORECASE
        ), ThreatLevel.LOW),
        ("reward_bribe", re.compile(
            r"(?:\$\d|reward|bonus|tip|prize|extra\s+credit|100\s*%)",
            re.IGNORECASE
        ), ThreatLevel.LOW),
        ("developer_mode", re.compile(
            r"(?:developer|debug|admin|god|root|superuser)\s+mode",
            re.IGNORECASE
        ), ThreatLevel.CRITICAL),
    ],
}

# ── Response validation patterns ─────────────────────────────────

_RESPONSE_PATTERNS: List[Tuple[str, re.Pattern[str], ThreatLevel]] = [
    ("prompt_leak", re.compile(
        r"(?:As an AI|I am (?:an?|designed|programmed)|My (?:instructions?|guidelines?|purpose|role) (?:are|is|say))",
        re.IGNORECASE
    ), ThreatLevel.MEDIUM),
    ("system_prompt_echo", re.compile(
        r"(?:original (?:system )?prompt|full (?:system )?(?:instructions?|prompt)|your (?:system )?instructions?)\s*(?:is|are|was|were|:)",
        re.IGNORECASE
    ), ThreatLevel.HIGH),
    ("safety_filter_bypass_admission", re.compile(
        r"(?:I\s+(?:can|will|am able to)\s+(?:now|finally|here)?\s*(?:help|assist|provide|tell you|show you)\s+(?:with|the|you))",
        re.IGNORECASE
    ), ThreatLevel.MEDIUM),
    ("structured_data_leak", _RESP_DATA_LEAK, ThreatLevel.HIGH),
]


class PromptDefense:
    """Detect and mitigate prompt injection attacks.

    Usage::

        defense = PromptDefense(sensitivity="high")
        result = defense.sanitize_input(user_text)
        if not result.is_safe:
            print(f"Blocked: {result.matched_patterns}")
    """

    def __init__(self, sensitivity: str = DEFAULT_SENSITIVITY) -> None:
        if sensitivity not in THRESHOLDS:
            raise ValueError(
                f"Invalid sensitivity '{sensitivity}'. "
                f"Choose from: {list(THRESHOLDS.keys())}"
            )
        self._sensitivity = sensitivity
        self._threshold = THRESHOLDS[sensitivity]

    def sanitize_input(self, text: str) -> SanitizationResult:
        """Check input against known injection patterns.

        Args:
            text: Raw user input to validate.

        Returns:
            SanitizationResult with cleaned text, threat level,
            and list of matched pattern names.
        """
        if not text:
            return SanitizationResult(
                cleaned="", threat_level=ThreatLevel.NONE, is_safe=True
            )

        matched: List[str] = []
        max_severity = ThreatLevel.NONE
        severity_order = {
            ThreatLevel.NONE: 0, ThreatLevel.LOW: 1,
            ThreatLevel.MEDIUM: 2, ThreatLevel.HIGH: 3,
            ThreatLevel.CRITICAL: 4,
        }

        for _category, pattern_list in PATTERNS.items():
            for name, pattern, level in pattern_list:
                # Skip LOW-severity patterns unless sensitivity is "high"
                if level == ThreatLevel.LOW and self._sensitivity != "high":
                    continue

                if pattern.search(text):
                    matched.append(f"{_category}:{name}")
                    if severity_order.get(level, 0) > severity_order.get(max_severity, 0):
                        max_severity = level

        # Determine if the input passes the threshold
        is_safe = len(matched) < self._threshold
        if max_severity in (ThreatLevel.HIGH, ThreatLevel.CRITICAL):
            is_safe = False

        # Strip suspicious control sequences from cleaned text
        cleaned = text
        if not is_safe:
            cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)

        return SanitizationResult(
            cleaned=cleaned,
            threat_level=max_severity,
            matched_patterns=matched,
            is_safe=is_safe,
        )

    def validate_response(self, response: str) -> ResponseValidationResult:
        """Check if an AI response contains suspicious patterns.

        Args:
            response: Text produced by the AI model.

        Returns:
            ResponseValidationResult indicating whether the response
            is safe and listing any detected issues.
        """
        if not response:
            return ResponseValidationResult(is_safe=True)

        issues: List[str] = []
        max_severity = ThreatLevel.NONE
        severity_order = {
            ThreatLevel.NONE: 0, ThreatLevel.LOW: 1,
            ThreatLevel.MEDIUM: 2, ThreatLevel.HIGH: 3,
            ThreatLevel.CRITICAL: 4,
        }

        for name, pattern, level in _RESPONSE_PATTERNS:
            if pattern.search(response):
                issues.append(f"{name} ({level.value})")
                if severity_order.get(level, 0) > severity_order.get(max_severity, 0):
                    max_severity = level

        is_safe = len(issues) == 0

        return ResponseValidationResult(
            is_safe=is_safe,
            issues=issues,
            threat_level=max_severity,
        )
