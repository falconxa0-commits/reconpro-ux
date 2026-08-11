"""ReconPro v8.0.0 — Integration clients for Jira, Slack, GitHub, Splunk, PagerDuty, and z.ai.

ZAIStreamClient is imported eagerly (it is always available via stdlib).
All other clients are lazily imported via ``__getattr__`` so that
missing optional dependencies (jira, slack-sdk, etc.) do not crash
a plain ``import reconpro`` or ``import reconpro.integrations``.
"""

from .zai_stream import ZAIStreamClient

__all__ = [
    "JiraClient", "SlackClient", "GitHubClient",
    "SplunkClient", "PagerDutyClient", "ZAIStreamClient",
]


def __getattr__(name: str):
    """Lazy-import integration clients on first access."""
    _lazy = {
        "JiraClient":     ".jira",
        "SlackClient":    ".slack",
        "GitHubClient":   ".github",
        "SplunkClient":   ".splunk",
        "PagerDutyClient": ".pagerduty",
    }
    if name in _lazy:
        import importlib
        mod = importlib.import_module(_lazy[name], __package__)
        cls = getattr(mod, name)
        globals()[name] = cls  # cache for subsequent accesses
        return cls
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
