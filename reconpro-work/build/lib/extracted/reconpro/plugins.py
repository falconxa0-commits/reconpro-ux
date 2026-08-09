"""Plugin system for ReconPro.

Loads custom scanning modules from ~/.reconpro/plugins/.
Each plugin is a .py file with a `run(target, base_url, **kwargs)` function
that returns a list of Finding objects.
"""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .http import Finding

PLUGIN_DIR = Path.home() / ".reconpro" / "plugins"


def _ensure_plugin_dir() -> None:
    PLUGIN_DIR.mkdir(parents=True, exist_ok=True)


def discover_plugins() -> Dict[str, Dict[str, Any]]:
    """Discover all plugins in the plugin directory."""
    _ensure_plugin_dir()
    plugins = {}

    for py_file in sorted(PLUGIN_DIR.glob("*.py")):
        if py_file.name.startswith("_"):
            continue

        plugin_id = py_file.stem
        try:
            spec = importlib.util.spec_from_file_location(
                f"reconpro_plugin_{plugin_id}", py_file
            )
            if spec and spec.loader:
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                runner = getattr(mod, "run", None)
                name = getattr(mod, "NAME", plugin_id.upper())
                desc = getattr(mod, "DESCRIPTION", "Custom plugin")
                if callable(runner):
                    plugins[plugin_id] = {
                        "name": name,
                        "runner": runner,
                        "path": str(py_file),
                        "description": desc,
                    }
        except Exception:
            pass

    return plugins


def run_plugin(plugin_id: str, target: str, base_url: str = "",
               timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    """Run a specific plugin."""
    plugins = discover_plugins()
    if plugin_id not in plugins:
        return [Finding(
            title=f"Plugin '{plugin_id}' not found",
            severity="info", category="plugin",
            module="plugin",
            description=f"No plugin named '{plugin_id}' in {PLUGIN_DIR}",
            evidence="", asset=target, points_deducted=0,
        )]

    runner = plugins[plugin_id]["runner"]
    try:
        result = runner(target=target, base_url=base_url,
                        timeout=timeout, verify_tls=verify_tls)
        if isinstance(result, list):
            return result
        return []
    except Exception as e:
        return [Finding(
            title=f"Plugin '{plugin_id}' error: {e}",
            severity="low", category="plugin",
            module="plugin",
            description=str(e),
            evidence="", asset=target, points_deducted=0,
        )]


def create_plugin_template(name: str) -> str:
    """Create a template plugin file. Returns the path."""
    _ensure_plugin_dir()
    path = PLUGIN_DIR / f"{name}.py"
    template = f'''"""Custom ReconPro plugin: {name}"""

NAME = "{name.upper()}"
DESCRIPTION = "Custom scanning module"

from reconpro.http import Finding


def run(target: str, base_url: str = "", timeout: int = 8, verify_tls: bool = True):
    findings = []
    # Your scanning logic here
    # findings.append(Finding(
    #     title="Your finding",
    #     severity="medium", category="custom",
    #     module="{name}",
    #     description="Description",
    #     evidence="Evidence",
    #     asset=target, points_deducted=5,
    #     remediation="How to fix it",
    # ))
    return findings
'''
    with open(path, "w") as f:
        f.write(template)
    return str(path)
