"""Roast Template Engine — generates hilarious security roast text.

Given roast_material and a grade, produces tweet-ready text within 280 chars,
plus follow-up thread tweets with detailed findings.
"""

from __future__ import annotations

import random
from typing import Any, Dict, List


# ══════════════════════════════════════════════════════════════════════════
# FINDING-SPECIFIC ROAST LINES
# ══════════════════════════════════════════════════════════════════════════

FINDING_ROASTS: Dict[str, List[str]] = {
    "env": [
        "Your .env file is literally public. That's like leaving your house keys in the front door.",
        ".env exposed to the world. Your secrets are less secret than a Taylor Swift album drop.",
        "We can read your .env like a morning newspaper. API keys, DB passwords, the whole breakfast.",
    ],
    "dashboard": [
        "Your dashboard doesn't need a password. It's an open house for anyone who finds the URL.",
        "/dashboard is wide open. Congratulations, you just made your admin panel a public API.",
        "Unauthenticated dashboard? Even the DMV requires more ID than this.",
    ],
    "admin": [
        "Your /admin endpoint has zero auth. It's like putting a 'free candy' sign on your server.",
        "/admin with no password? You built a VIP lounge and left the velvet rope on the floor.",
        "Unprotected admin route. This is the cybersecurity equivalent of leaving the bank vault open.",
    ],
    "webhooks": [
        "Your /api/webhooks is open to the world. Anyone can start sending you fake events.",
        "Unauthenticated webhooks? Hope you enjoy processing random garbage from the internet.",
        "/api/webhooks with no auth — you just gave every script kiddie a direct line to your backend.",
    ],
    "cors": [
        "Your CORS policy says 'everyone come in!' — it's basically a bouncer who lets anyone in.",
        "CORS wide open. You're not just leaving the front door unlocked, you're sending out invitations.",
        "CORS reflection? Any website can make requests to your API. That's not a feature, that's a vulnerability.",
    ],
    "hsts": [
        "No HSTS header? In 2026? That's like wearing a seatbelt... in 1975.",
        "Missing HSTS in this day and age. You might as well serve your site over HTTP and save the cert money.",
        "No HSTS header means attackers can downgrade connections. It's the digital equivalent of peeling off the security seal.",
    ],
    "csp": [
        "No Content Security Policy? You're letting any script run wild on your page like a toddler in a china shop.",
        "Missing CSP header. Your page trusts every script it meets. That's not kindness, that's recklessness.",
        "No CSP? Cross-site scripting attacks are queueing up at your door.",
    ],
    "storage": [
        "Your uploads folder is a public directory listing. It's like leaving your filing cabinet open on the street.",
        "/uploads/ is listing everything. Every uploaded file is on display like a museum exhibit.",
        "Storage directory exposed. Your users' files are one URL away from being public knowledge.",
    ],
}


def _get_finding_roasts(material: Dict[str, Any]) -> List[str]:
    """Map roast_material to specific finding roast lines."""
    lines: List[str] = []

    if material.get("has_env"):
        lines.append(random.choice(FINDING_ROASTS["env"]))

    for api in material.get("unauth_apis", []):
        key = api.strip("/")
        if key == "dashboard":
            lines.append(random.choice(FINDING_ROASTS["dashboard"]))
        elif key == "admin":
            lines.append(random.choice(FINDING_ROASTS["admin"]))
        elif "webhook" in key:
            lines.append(random.choice(FINDING_ROASTS["webhooks"]))

    if material.get("cors_wildcard"):
        lines.append(random.choice(FINDING_ROASTS["cors"]))

    for hdr in material.get("missing_headers", []):
        key = hdr.lower()
        if "hsts" in key:
            lines.append(random.choice(FINDING_ROASTS["hsts"]))
        elif "csp" in key or "content-security" in key:
            lines.append(random.choice(FINDING_ROASTS["csp"]))

    if material.get("storage_exposed"):
        lines.append(random.choice(FINDING_ROASTS["storage"]))

    return lines


# ══════════════════════════════════════════════════════════════════════════
# GRADE TEMPLATES (3 variations each)
# ══════════════════════════════════════════════════════════════════════════

GRADE_TEMPLATES: Dict[str, List[Dict[str, str]]] = {
    "A+": [
        {
            "tweet": "This app is locked down tighter than Fort Knox. @{handle} built this with actual security in mind. Respect. Grade: A+ \U0001f6e1\ufe0f",
        },
        {
            "tweet": "@{handle} just passed the VibeSec check with flying colors. A+ grade. Not a single vulnerability found. This is how you build secure apps. Grade: A+ \U0001f6e1\ufe0f",
        },
        {
            "tweet": "A+ security score for @{handle}. Clean headers, no exposed secrets, CORS locked down. Your AI assistant actually knows what it's doing. Grade: A+ \U0001f6e1\ufe0f",
        },
    ],
    "A": [
        {
            "tweet": "Almost flawless. One tiny misstep but nothing to worry about. @{handle} knows what they're doing. Grade: A \u2728",
        },
        {
            "tweet": "@{handle} scored an A on VibeSec. One minor thing to fix but overall rock solid. This is the standard. Grade: A \u2728",
        },
        {
            "tweet": "Grade A for @{handle}. We found one small issue but honestly, this is good security. Minor polish and you're at A+. Grade: A \u2728",
        },
    ],
    "B": [
        {
            "tweet": "Not bad! A few security headers missing but no critical fails. @{handle}, you're in the safe zone. Grade: B \U0001f440",
        },
        {
            "tweet": "@{handle} got a B. Some headers are missing but nothing's on fire. Room for improvement but not a disaster. Grade: B \U0001f440",
        },
        {
            "tweet": "Grade B for @{handle}. A couple of things need attention, but you're not on the wall of shame. Fix those headers! Grade: B \U0001f440",
        },
    ],
    "C": [
        {
            "tweet": "Yikes. We found some problems. {finding1} @{handle}, your AI assistant left the door wide open. Grade: C \U0001f525",
        },
        {
            "tweet": "@{handle}, we need to talk about your security. {finding1} Not great. Grade: C \U0001f525",
        },
        {
            "tweet": "Grade C for @{handle}. {finding1} Time to have a serious conversation with your deployment pipeline. Grade: C \U0001f525",
        },
    ],
    "D": [
        {
            "tweet": "This is a disaster zone. {finding1} {finding2} @{handle}, please fix this before someone notices. Grade: D \U0001f480",
        },
        {
            "tweet": "@{handle}, we've got a D-grade situation. {finding1} {finding2} The vibes are immaculate, the security is not. Grade: D \U0001f480",
        },
        {
            "tweet": "D grade. @{handle}, your app has {finding1} AND {finding2} It's giving 'I deployed on Friday afternoon.' Grade: D \U0001f480",
        },
    ],
    "F": [
        {
            "tweet": "Absolute carnage. {finding1} {finding2} {finding3} @{handle}, this app is a hacker's playground. Grade: F \u2620\ufe0f",
        },
        {
            "tweet": "F grade for @{handle}. {finding1} {finding2} {finding3} We'd say 'fix it' but honestly, start over. Grade: F \u2620\ufe0f",
        },
        {
            "tweet": "@{handle} got an F. {finding1} {finding2} {finding3} This isn't a security audit, it's an autopsy. Grade: F \u2620\ufe0f",
        },
    ],
}


# ══════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════

def _truncate(text: str, max_len: int = 280) -> str:
    """Truncate to max_len chars, trying not to cut mid-word."""
    if len(text) <= max_len:
        return text
    truncated = text[:max_len - 3] + "..."
    # Try to cut at last space before limit
    last_space = text[:max_len - 3].rfind(" ")
    if last_space > max_len // 2:
        truncated = text[:last_space] + "..."
    return truncated


def _summarize_finding(roast_line: str, max_len: int = 100) -> str:
    """Shorten a finding roast line for insertion into tweet templates."""
    if len(roast_line) <= max_len:
        return roast_line
    # Take the first sentence-like fragment
    period = roast_line.find(".")
    if 20 < period <= max_len:
        return roast_line[:period + 1]
    return roast_line[:max_len - 1].rsplit(" ", 1)[0] + "\u2026"


def generate_roast(
    roast_material: Dict[str, Any],
    score: int,
    grade: str,
    handle: str = "dev",
) -> Dict[str, Any]:
    """Generate roast output for a scan result.

    Returns::
        {
            "tweet_text": str,          # max 280 chars
            "thread_tweets": list[str],  # follow-up tweets
            "share_card_data": dict      # data for image generation
        }
    """
    finding_lines = _get_finding_roasts(roast_material)
    finding_summaries = [_summarize_finding(l) for l in finding_lines]

    # Pick a random template for this grade
    templates = GRADE_TEMPLATES.get(grade, GRADE_TEMPLATES["F"])
    template = random.choice(templates)

    # Fill in template placeholders
    finding1 = finding_summaries[0] if len(finding_summaries) > 0 else "Multiple security issues found."
    finding2 = finding_summaries[1] if len(finding_summaries) > 1 else ""
    finding3 = finding_summaries[2] if len(finding_summaries) > 2 else ""

    tweet_text = template["tweet"].format(
        handle=handle,
        finding1=finding1,
        finding2=finding2,
        finding3=finding3,
    )
    tweet_text = _truncate(tweet_text, 280)

    # ── Build thread tweets with detailed findings ────────────────────
    thread_tweets: List[str] = []
    if finding_lines:
        # Thread tweet 1: findings summary
        count = len(finding_lines)
        thread_tweets.append(
            f"{count} finding{'s' if count != 1 else ''} for @{handle} (Score: {score}/100):"
        )
        for i, line in enumerate(finding_lines, 1):
            thread_tweets.append(f"{i}/{count}: {line}")

    # Thread closer
    if thread_tweets:
        thread_tweets.append(
            "Scan your app \u2192 Mention @VibeSecRoast with a URL "
            "| Full scan \u2192 github.com/reconpro-security/vibesec"
        )

    return {
        "tweet_text": tweet_text,
        "thread_tweets": thread_tweets,
        "share_card_data": {
            "score": score,
            "grade": grade,
            "handle": handle,
            "findings_count": len(finding_lines),
            "findings": finding_lines,
            "roast_material": roast_material,
        },
    }
