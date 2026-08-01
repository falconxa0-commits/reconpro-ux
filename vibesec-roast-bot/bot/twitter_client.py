"""Twitter API v2 Client — built with ONLY stdlib urllib.

OAuth 2.0 with PKCE token management.
All tokens stored in bot/.credentials.json (mode 0o600).
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger("vibesec_roast.twitter")

API_BASE = "https://api.twitter.com/2"
UPLOAD_BASE = "https://upload.twitter.com/1.1"


class TwitterClient:
    """Minimal Twitter API v2 client using stdlib only."""

    def __init__(
        self,
        bearer_token: str,
        client_id: str,
        client_secret: str,
        access_token: str,
        refresh_token: str,
        credentials_path: str = "bot/.credentials.json",
    ) -> None:
        self.bearer_token = bearer_token
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.credentials_path = credentials_path
        self._token_expires_at: float = 0
        self._load_credentials()

    # ── Token Management ─────────────────────────────────────────────

    def _load_credentials(self) -> None:
        """Load saved tokens from disk if available."""
        if os.path.exists(self.credentials_path):
            try:
                with open(self.credentials_path, "r") as f:
                    data = json.load(f)
                self.access_token = data.get("access_token", self.access_token)
                self.refresh_token = data.get("refresh_token", self.refresh_token)
                self._token_expires_at = data.get("expires_at", 0)
                logger.debug("Loaded credentials from %s", self.credentials_path)
            except Exception as exc:
                logger.warning("Failed to load credentials: %s", exc)

    def _save_credentials(self) -> None:
        """Persist tokens to disk with restrictive permissions."""
        data = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_at": self._token_expires_at,
        }
        os.makedirs(os.path.dirname(self.credentials_path) or ".", exist_ok=True)
        fd = os.open(self.credentials_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            with os.fdopen(fd, "w") as f:
                json.dump(data, f, indent=2)
        except Exception:
            os.close(fd)
            raise
        logger.debug("Saved credentials to %s", self.credentials_path)

    def _refresh_access_token(self) -> None:
        """Refresh the access token using the refresh token.

        Uses OAuth 2.0 token endpoint with client_credentials basic auth.
        """
        url = "https://api.twitter.com/2/oauth2/token"
        params = urllib.parse.urlencode({
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
            "client_id": self.client_id,
        })
        # Basic auth with client_id:client_secret
        import base64
        basic = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        req = urllib.request.Request(
            url,
            data=params.encode(),
            method="POST",
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
        except Exception as exc:
            logger.error("Token refresh failed: %s", exc)
            raise

        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token", self.refresh_token)
        # expires_in is typically 7200 seconds
        self._token_expires_at = time.time() + data.get("expires_in", 7200) - 60
        self._save_credentials()
        logger.info("Access token refreshed, expires in %ds", data.get("expires_in", 7200))

    def _ensure_token(self) -> str:
        """Return a valid access token, refreshing if needed."""
        if time.time() >= self._token_expires_at:
            self._refresh_access_token()
        return self.access_token

    # ── HTTP helpers ─────────────────────────────────────────────────

    def _api_request(
        self,
        method: str,
        url: str,
        data: Dict[str, Any] | None = None,
        json_body: Dict[str, Any] | None = None,
        files: Dict[str, tuple] | None = None,
        use_bearer: bool = False,
    ) -> Dict[str, Any]:
        """Make an API request with proper auth."""
        token = self.bearer_token if use_bearer else self._ensure_token()
        headers = {"Authorization": f"Bearer {token}"}
        body: bytes | None = None

        if json_body is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(json_body).encode()
        elif data is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            body = urllib.parse.urlencode(data).encode()
        elif files is not None:
            # Multipart form data
            boundary = f"----VibeSec{int(time.time())}"
            headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
            parts: List[bytes] = []
            for field_name, (filename, file_data, content_type) in files.items():
                part = (
                    f"--{boundary}\r\n"
                    f'Content-Disposition: form-data; name="{field_name}"; '
                    f'filename="{filename}"\r\n'
                    f"Content-Type: {content_type}\r\n\r\n"
                ).encode() + file_data + b"\r\n"
                parts.append(part)
            parts.append(f"--{boundary}--\r\n".encode())
            body = b"".join(parts)

        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read()
                if raw:
                    return json.loads(raw)
                return {"status": resp.status}
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read(8192).decode()
            except Exception:
                pass
            logger.error("API %s %s -> %d: %s", method, url, e.code, err_body[:500])
            return {"error": True, "status": e.code, "body": err_body}
        except Exception as e:
            logger.error("API request failed: %s", e)
            return {"error": True, "reason": str(e)}

    # ── Public API Methods ────────────────────────────────────────────

    def create_tweet(
        self,
        text: str,
        media_ids: List[str] | None = None,
        reply_to_id: str | None = None,
    ) -> Dict[str, Any]:
        """POST /2/tweets — create a tweet (optionally with media and/or reply)."""
        payload: Dict[str, Any] = {"text": text}
        if media_ids:
            payload["media"] = {"media_ids": media_ids}
        if reply_to_id:
            payload["reply"] = {"in_reply_to_tweet_id": reply_to_id}
        return self._api_request("POST", f"{API_BASE}/tweets", json_body=payload)

    def upload_media(self, image_path: str) -> Dict[str, Any]:
        """POST /1.1/media/upload — upload an image and return media_id_string."""
        with open(image_path, "rb") as f:
            image_data = f.read()
        filename = os.path.basename(image_path)
        files = {
            "media": (filename, image_data, "image/png"),
        }
        result = self._api_request("POST", f"{UPLOAD_BASE}/media/upload", files=files)
        return result

    def search_mentions(self, since_id: str | None = None) -> List[Dict[str, Any]]:
        """GET /2/users/me/mentions — fetch recent mentions."""
        params = {"max_results": "20", "tweet.fields": "conversation_id,referenced_tweets,author_id"}
        if since_id:
            params["since_id"] = since_id
        query = "&".join(f"{k}={urllib.parse.quote(v)}" for k, v in params.items())
        url = f"{API_BASE}/users/me/mentions?{query}"
        result = self._api_request("GET", url, use_bearer=True)
        return result.get("data", [])

    def get_tweet(self, tweet_id: str) -> Dict[str, Any]:
        """GET /2/tweets/{id} — fetch a single tweet."""
        url = f"{API_BASE}/tweets/{tweet_id}?tweet.fields=author_id,conversation_id"
        return self._api_request("GET", url, use_bearer=True)
