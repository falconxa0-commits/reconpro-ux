"""Central configuration for the VibeSec Roast Bot."""

from __future__ import annotations

import os


class BotConfig:
    """All tuneable knobs in one place."""

    # ── Twitter API ────────────────────────────────────────────────────
    TWITTER_CLIENT_ID: str = os.getenv("TWITTER_CLIENT_ID", "")
    TWITTER_CLIENT_SECRET: str = os.getenv("TWITTER_CLIENT_SECRET", "")
    TWITTER_ACCESS_TOKEN: str = os.getenv("TWITTER_ACCESS_TOKEN", "")
    TWITTER_REFRESH_TOKEN: str = os.getenv("TWITTER_REFRESH_TOKEN", "")
    TWITTER_BEARER_TOKEN: str = os.getenv("TWITTER_BEARER_TOKEN", "")

    # ── Bot behaviour ──────────────────────────────────────────────────
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL", "60"))
    SCAN_TIMEOUT_SECONDS: int = int(os.getenv("SCAN_TIMEOUT", "10"))
    CACHE_TTL_HOURS: int = int(os.getenv("CACHE_TTL_HOURS", "24"))
    CACHE_DIR: str = os.getenv("CACHE_DIR", "bot/.cache")

    # ── Twitter rate limits (conservative) ─────────────────────────────
    TWEET_RATE_LIMIT: int = 900          # tweets per 15-min window
    TWEET_RATE_WINDOW: int = 900         # seconds in the window
    MENTIONS_RATE_LIMIT: int = 900

    # ── Branding ───────────────────────────────────────────────────────
    BOT_HANDLE: str = os.getenv("BOT_HANDLE", "VibeSecRoast")
    BRAND_NAME: str = "VibeSec"
    BRAND_GREEN: str = "#00ff88"
    CARD_BG: str = "#0B1C2C"

    # ── Paths ──────────────────────────────────────────────────────────
    CREDENTIALS_PATH: str = os.getenv("CREDENTIALS_PATH", "bot/.credentials.json")

    # ── Micro-scan paths (the fast 5) ──────────────────────────────────
    MICRO_SCAN_PATHS: list[str] = [
        "/.env",
        "/api/webhooks",
        "/dashboard",
        "/admin",
        "/uploads/",
    ]

    MICRO_SCAN_HEADERS_TO_CHECK: list[tuple[str, str, int]] = [
        ("strict-transport-security", "HSTS", 8),
        ("content-security-policy", "CSP", 6),
    ]

    def __repr__(self) -> str:
        return f"BotConfig(poll={self.POLL_INTERVAL_SECONDS}s, timeout={self.SCAN_TIMEOUT_SECONDS}s)"


def load_config() -> BotConfig:
    """Return a validated BotConfig instance."""
    cfg = BotConfig()
    missing = []
    if not cfg.TWITTER_BEARER_TOKEN:
        missing.append("TWITTER_BEARER_TOKEN")
    if not cfg.TWITTER_CLIENT_ID:
        missing.append("TWITTER_CLIENT_ID")
    if not cfg.TWITTER_ACCESS_TOKEN:
        missing.append("TWITTER_ACCESS_TOKEN")
    if not cfg.TWITTER_REFRESH_TOKEN:
        missing.append("TWITTER_REFRESH_TOKEN")
    if missing:
        # Warn but don't crash — allows testing scanner/roast without Twitter
        import logging
        logging.getLogger("vibesec_roast").warning(
            "Missing env vars (bot won't post): %s", ", ".join(missing)
        )
    return cfg
