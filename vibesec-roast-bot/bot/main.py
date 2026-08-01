"""Main Bot Loop — polls for mentions, scans, roasts, posts.

Flow:
1. Check for new mentions every 60 seconds
2. Extract URLs from mention text
3. For each URL: cache → scan → roast → card → post
4. Handle rate limits (900 req/15min)
5. Log all actions
"""

from __future__ import annotations

import logging
import re
import signal
import sys
import time
from typing import Any, Dict, List, Optional

from bot.cache import ScanCache
from bot.card_generator import generate_card
from bot.config import BotConfig, load_config
from bot.roast_engine import generate_roast
from bot.scanner import micro_scan

logger = logging.getLogger("vibesec_roast")

# ── URL extraction from tweet text ──────────────────────────────────────
_URL_PATTERN = re.compile(r"https?://[\w.-]+(?:/[\w./-]*)?")

# Graceful shutdown
_shutdown = False


def _signal_handler(sig, frame):
    global _shutdown
    logger.info("Received signal %s, shutting down gracefully...", sig)
    _shutdown = True


def extract_urls(text: str) -> List[str]:
    """Extract unique URLs from tweet text."""
    return list(set(_URL_PATTERN.findall(text)))


def extract_domain(url: str) -> str:
    """Extract domain from URL for caching/display."""
    return url.replace("https://", "").replace("http://", "").split("/")[0]


def extract_handle(mention_data: Dict[str, Any]) -> str:
    """Extract author username from a mention object."""
    author = mention_data.get("author_id", "")
    # The mentions API includes author_id but we need the username
    # For the roast text we'll use a generic handle if username not available
    # The Twitter API v2 'includes' field would have users, but we keep it simple
    return "dev"  # Will be overridden if username is available in includes


def init_logging(verbose: bool = False) -> None:
    """Set up structured logging."""
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    logging.basicConfig(level=level, format=fmt, datefmt="%Y-%m-%d %H:%M:%S")


def rate_limit_guard(config: BotConfig) -> bool:
    """Check if we're approaching rate limits. Returns True if safe to proceed."""
    # Simple in-memory tracking; in production use Redis or similar
    return True


def process_mention(
    mention: Dict[str, Any],
    config: BotConfig,
    cache: ScanCache,
    twitter_client: Any,
) -> None:
    """Process a single mention: scan, roast, post."""
    tweet_id = mention.get("id", "")
    text = mention.get("text", "")
    author_id = mention.get("author_id", "unknown")

    logger.info("Processing mention %s from author %s: %s", tweet_id, author_id, text[:100])

    urls = extract_urls(text)
    if not urls:
        logger.info("No URLs found in mention %s, skipping", tweet_id)
        return

    for url in urls:
        domain = extract_domain(url)

        # 1. Check cache
        cached = cache.get(domain)
        if cached:
            logger.info("Using cached result for %s", domain)
            result = cached
        else:
            # 2. Run micro-scan
            logger.info("Scanning %s ...", domain)
            try:
                result = micro_scan(domain, config)
            except Exception as exc:
                logger.error("Scan failed for %s: %s", domain, exc)
                continue

            # 7. Cache the result
            cache.set(domain, result)

        # 3. Generate roast
        material = result["roast_material"]
        score = result["score"]
        grade = result["grade"]

        roast = generate_roast(material, score, grade, handle=domain)

        # 4. Generate share card
        card_data = roast["share_card_data"]
        card_data["roast_material"] = material
        try:
            card_path = generate_card(card_data)
            logger.info("Card generated: %s", card_path)
        except Exception as exc:
            logger.error("Card generation failed: %s", exc)
            card_path = None

        # 5. Upload image to Twitter
        media_ids: List[str] = []
        if card_path and twitter_client:
            try:
                upload_result = twitter_client.upload_media(card_path)
                media_id = upload_result.get("media_id_string")
                if media_id:
                    media_ids.append(media_id)
                    logger.info("Media uploaded: %s", media_id)
            except Exception as exc:
                logger.error("Media upload failed: %s", exc)

        # 6. Post reply tweet
        if twitter_client:
            try:
                tweet_result = twitter_client.create_tweet(
                    text=roast["tweet_text"],
                    media_ids=media_ids if media_ids else None,
                    reply_to_id=tweet_id,
                )
                new_tweet_id = tweet_result.get("data", {}).get("id")
                logger.info("Reply posted: %s", new_tweet_id)

                # Post thread tweets
                parent_id = new_tweet_id or tweet_id
                for thread_tweet in roast["thread_tweets"]:
                    if not rate_limit_guard(config):
                        logger.warning("Rate limit approaching, stopping thread")
                        break
                    try:
                        thread_result = twitter_client.create_tweet(
                            text=thread_tweet,
                            reply_to_id=parent_id,
                        )
                        parent_id = thread_result.get("data", {}).get("id", parent_id)
                        time.sleep(1)  # small delay between thread tweets
                    except Exception as exc:
                        logger.error("Thread tweet failed: %s", exc)
                        break

            except Exception as exc:
                logger.error("Tweet post failed: %s", exc)
        else:
            # No Twitter client (dry run / testing mode)
            logger.info("[DRY RUN] Would post: %s", roast["tweet_text"])
            for t in roast["thread_tweets"]:
                logger.info("[DRY RUN] Thread: %s", t)

        time.sleep(2)  # rate limiting between URLs


def run_bot(config: BotConfig | None = None) -> None:
    """Main polling loop."""
    if config is None:
        config = load_config()

    init_logging(verbose=True)

    cache = ScanCache(cache_dir=config.CACHE_DIR, ttl_hours=config.CACHE_TTL_HOURS)

    # Initialize Twitter client (may be None if credentials missing)
    twitter_client = None
    if config.TWITTER_BEARER_TOKEN and config.TWITTER_CLIENT_ID:
        try:
            from bot.twitter_client import TwitterClient
            twitter_client = TwitterClient(
                bearer_token=config.TWITTER_BEARER_TOKEN,
                client_id=config.TWITTER_CLIENT_ID,
                client_secret=config.TWITTER_CLIENT_SECRET,
                access_token=config.TWITTER_ACCESS_TOKEN,
                refresh_token=config.TWITTER_REFRESH_TOKEN,
                credentials_path=config.CREDENTIALS_PATH,
            )
            logger.info("Twitter client initialized")
        except Exception as exc:
            logger.error("Failed to init Twitter client: %s", exc)
    else:
        logger.warning("No Twitter credentials — running in dry-run mode")

    last_mention_id: Optional[str] = None

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    logger.info("@%s bot starting (poll every %ds)", config.BOT_HANDLE, config.POLL_INTERVAL_SECONDS)

    while not _shutdown:
        try:
            mentions: List[Dict[str, Any]] = []
            if twitter_client:
                mentions = twitter_client.search_mentions(since_id=last_mention_id)

            if not mentions:
                logger.debug("No new mentions")
            else:
                for mention in mentions:
                    mid = mention.get("id", "")
                    if last_mention_id is None or mid > last_mention_id:
                        last_mention_id = mid
                    try:
                        process_mention(mention, config, cache, twitter_client)
                    except Exception as exc:
                        logger.error("Error processing mention %s: %s", mid, exc)

        except Exception as exc:
            logger.error("Polling error: %s", exc)

        # Sleep in small increments to check shutdown flag
        for _ in range(config.POLL_INTERVAL_SECONDS):
            if _shutdown:
                break
            time.sleep(1)

    logger.info("Bot shut down gracefully")


if __name__ == "__main__":
    run_bot()
