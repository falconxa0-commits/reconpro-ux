"""Shared configuration utilities for ReconPro.

Provides a unified config loader that handles both JSON and minimal YAML,
plus helpers for locating integration-specific config files.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


_DEFAULT_CONFIG_DIR = Path.home() / ".reconpro" / "config"
_INTEGRATIONS_DIR = Path.home() / ".reconpro" / "integrations"


def default_config_path() -> Path:
    """Return the default configuration directory path."""
    return _DEFAULT_CONFIG_DIR


def integration_config_path(name: str) -> Path:
    """Return the default config file path for a named integration.

    Example::
        integration_config_path("github")  # ~/.reconpro/integrations/github.yaml
    """
    return _INTEGRATIONS_DIR / f"{name}.yaml"


def load_config(config_path: str | Path | None = None) -> Dict[str, Any]:
    """Load configuration from a JSON or YAML file.

    If *config_path* is ``None``, falls back to :func:`default_config_path`.
    Tries JSON first; falls back to a minimal inline YAML parser that
    handles flat ``key: value`` pairs (no external deps required).

    Returns an empty dict if the file does not exist or cannot be parsed.
    """
    path = Path(config_path) if config_path else _DEFAULT_CONFIG_DIR
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)  # type: ignore[return-value]
    except json.JSONDecodeError:
        pass
    # Minimal YAML parser for flat key: value pairs
    data: Dict[str, Any] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            data[key] = value
    return data
