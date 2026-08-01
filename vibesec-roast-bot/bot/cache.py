"""24-hour scan cache — JSON-file per domain.

Avoids re-scanning the same domain within 24 hours.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Dict, Optional

logger = logging.getLogger("vibesec_roast.cache")

# Sanitize domain for use as filename
_SAFE_DOMAIN_RE = re.compile(r"[^a-zA-Z0-9._-]")


class ScanCache:
    """Simple JSON-file cache with 24h TTL per domain."""

    def __init__(self, cache_dir: str = "bot/.cache", ttl_hours: int = 24) -> None:
        self.cache_dir = cache_dir
        self.ttl = ttl_hours * 3600  # convert to seconds
        os.makedirs(cache_dir, exist_ok=True)

    def _domain_path(self, domain: str) -> str:
        safe = _SAFE_DOMAIN_RE.sub("_", domain.lower().strip())
        return os.path.join(self.cache_dir, f"{safe}.json")

    def get(self, domain: str) -> Optional[Dict[str, Any]]:
        """Return cached result for *domain* if within TTL, else None."""
        path = self._domain_path(domain)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r") as f:
                data = json.load(f)
            cached_at = data.get("cached_at", 0)
            if time.time() - cached_at > self.ttl:
                logger.debug("Cache expired for %s", domain)
                return None
            logger.debug("Cache hit for %s", domain)
            return data.get("result")
        except Exception as exc:
            logger.debug("Cache read error for %s: %s", domain, exc)
            return None

    def set(self, domain: str, result: Dict[str, Any]) -> None:
        """Cache a scan result for *domain*."""
        path = self._domain_path(domain)
        data = {
            "domain": domain,
            "cached_at": time.time(),
            "result": result,
        }
        try:
            with open(path, "w") as f:
                json.dump(data, f, indent=2)
            logger.debug("Cached result for %s", domain)
        except Exception as exc:
            logger.warning("Cache write error for %s: %s", domain, exc)

    def clear(self, domain: str | None = None) -> None:
        """Clear cache. If domain is None, clear all."""
        if domain:
            path = self._domain_path(domain)
            if os.path.exists(path):
                os.remove(path)
        else:
            for fname in os.listdir(self.cache_dir):
                if fname.endswith(".json"):
                    try:
                        os.remove(os.path.join(self.cache_dir, fname))
                    except Exception:
                        pass
