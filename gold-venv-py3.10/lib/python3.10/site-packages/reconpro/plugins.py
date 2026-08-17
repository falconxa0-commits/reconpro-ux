"""Plugin system for ReconPro.

Loads custom scanning modules from ~/.reconpro/plugins/.
Each plugin is a .py file with a `run(target, base_url, **kwargs)` function
that returns a list of Finding objects.
"""
from __future__ import annotations

import importlib.util
import json
import logging
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

from .constants import PLUGIN_DIR
from .http_layer import Finding


def _ensure_plugin_dir() -> None:
    try:
        PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        logger.warning("Could not create plugin directory %s: %s", PLUGIN_DIR, e)


def discover_plugins(use_sandbox: bool = True) -> Dict[str, Dict[str, Any]]:
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
            logger.debug("Failed to load plugin %s", py_file, exc_info=True)

    return plugins


def run_plugin(plugin_id: str, target: str, base_url: str = "",
               timeout: int = 8, verify_tls: bool = True,
               use_sandbox: bool = True) -> List[Finding]:
    """Run a specific plugin.

    All plugin executions MUST go through PluginSandbox — there is no
    unsandboxed path.  If the sandbox cannot be imported, execution is
    refused entirely.
    """
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

    # ── Mandatory sandboxed execution (Agent 11) ───────────────
    # Every plugin execution goes through PluginSandbox.
    # Resource limits: memory capped at 64 MB, CPU time = timeout.
    try:
        from .security_hardening import PluginSandbox
        sandbox = PluginSandbox(
            memory_limit_mb=64,
            cpu_time_seconds=float(timeout),
        )
        sb_result = sandbox.execute(
            runner,
            plugin_name=plugin_id,
            target=target,
            base_url=base_url,
            timeout=timeout,
            verify_tls=verify_tls,
        )
        if isinstance(sb_result, dict) and sb_result.get("success"):
            result = sb_result["findings"]
        else:
            error_msg = (sb_result.get("error", "unknown sandbox error")
                         if isinstance(sb_result, dict) else str(sb_result))
            logger.warning("Plugin '%s' sandbox violation: %s", plugin_id, error_msg)
            return [Finding(
                title=f"Plugin '{plugin_id}' sandbox error: {error_msg}",
                severity="low", category="plugin",
                module="plugin",
                description=error_msg,
                evidence="", asset=target, points_deducted=0,
            )]
    except ImportError:
        logger.error(
            "PluginSandbox not available — refusing to execute plugin '%s' "
            "without sandbox (security policy)", plugin_id,
        )
        return [Finding(
            title=f"Plugin '{plugin_id}' refused: sandbox unavailable",
            severity="high", category="plugin",
            module="plugin",
            description=(
                "Plugin execution refused: PluginSandbox is required but "
                "could not be imported. Ensure reconpro is fully installed."
            ),
            evidence="", asset=target, points_deducted=0,
        )]
    except Exception as e:
        return [Finding(
            title=f"Plugin '{plugin_id}' sandbox error: {e}",
            severity="low", category="plugin",
            module="plugin",
            description=str(e),
            evidence="", asset=target, points_deducted=0,
        )]

    try:
        if isinstance(result, list):
            _REQUIRED_KEYS = {"title", "severity", "category"}
            validated = [
                item for item in result
                if isinstance(item, dict) and _REQUIRED_KEYS.issubset(item)
            ]
            dropped = len(result) - len(validated)
            if dropped:
                logger.warning(
                    "Plugin '%s' returned %d item(s) missing required keys %s, dropping them",
                    plugin_id, dropped, _REQUIRED_KEYS,
                )
            return validated
        logger.warning("Plugin '%s' returned non-list result, ignoring", plugin_id)
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

from reconpro.http_layer import Finding


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


# ═══════════════════════════════════════════════════════════════════════════
# PLUGIN HOOK SYSTEM — Event hooks for extending ReconPro behavior
# ═══════════════════════════════════════════════════════════════════════════

_HOOK_REGISTRY: Dict[str, List[Callable]] = {}
_PLUGIN_META: Dict[str, Dict[str, Any]] = {}
_PLUGIN_HOOKS_FILE = PLUGIN_DIR / "_hooks.json"


class HookManager:
    """Central event hook system for plugins.
    
    Hooks:
        pre_scan      — Before scan starts. Args: (target, base_url, modules)
        post_scan     — After scan completes. Args: (target, findings, score)
        pre_finding   — Before a finding is recorded. Args: (finding_dict). Return modified finding or None.
        post_finding  — After a finding is recorded. Args: (finding_dict)
        pre_report    — Before report generation. Args: (findings, format). Can modify findings.
        post_report   — After report generated. Args: (report_path, format)
        new_target    — When a new target is discovered. Args: (target_url)
        vulnerability — When a vulnerability is confirmed. Args: (finding_dict, severity)
        error         — When an error occurs. Args: (error_msg, context)
    """
    
    HOOK_NAMES = [
        "pre_scan", "post_scan", "pre_finding", "post_finding",
        "pre_report", "post_report", "new_target", "vulnerability", "error",
    ]
    
    @classmethod
    def register(cls, hook_name: str, callback: Callable, priority: int = 100) -> bool:
        """Register a callback for a hook. Lower priority = runs first."""
        if hook_name not in cls.HOOK_NAMES:
            return False
        if hook_name not in _HOOK_REGISTRY:
            _HOOK_REGISTRY[hook_name] = []
        _HOOK_REGISTRY[hook_name].append((priority, callback))
        _HOOK_REGISTRY[hook_name].sort(key=lambda x: x[0])
        return True
    
    @classmethod
    def unregister(cls, hook_name: str, callback: Callable) -> bool:
        """Remove a specific callback."""
        if hook_name not in _HOOK_REGISTRY:
            return False
        _HOOK_REGISTRY[hook_name] = [
            (p, cb) for p, cb in _HOOK_REGISTRY[hook_name] if cb is not callback
        ]
        return True
    
    @classmethod
    def fire(cls, hook_name: str, *args, **kwargs) -> Any:
        """Execute all callbacks registered for a hook.
        If any callback returns a non-None value, it short-circuits and returns that value."""
        results = []
        for priority, callback in _HOOK_REGISTRY.get(hook_name, []):
            try:
                result = callback(*args, **kwargs)
                results.append(result)
                if result is not None:
                    return result  # Short-circuit
            except Exception:
                logger.debug("Hook callback error in '%s': %s", hook_name, callback, exc_info=True)
        return None
    
    @classmethod
    def clear(cls, hook_name: Optional[str] = None):
        """Clear hooks. If hook_name is None, clear all."""
        if hook_name:
            _HOOK_REGISTRY.pop(hook_name, None)
        else:
            _HOOK_REGISTRY.clear()
    
    @classmethod
    def list_hooks(cls) -> Dict[str, int]:
        """List all registered hooks with callback counts."""
        return {name: len(cbs) for name, cbs in _HOOK_REGISTRY.items()}
    
    @classmethod
    def save_hooks(cls):
        """Persist hook metadata to disk.

        NOTE: Only function names/paths are saved as strings — the actual
        callable objects cannot be serialized. Use load_hooks() to inspect
        what was registered, but callables must be re-registered manually.
        """
        _ensure_plugin_dir()
        data = {}
        for name, callbacks in _HOOK_REGISTRY.items():
            data[name] = [f"{getattr(cb, '__module__', '?')}.{getattr(cb, '__name__', '?')}" for _, cb in callbacks]
        with open(_PLUGIN_HOOKS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    # DEAD CODE: consider removal
    def load_hooks(cls):
        """Load hook metadata from disk.

        Returns a dict mapping hook names to lists of qualified function-name
        strings that were registered at save time.  This is **metadata only**;
        the actual callback callables cannot be restored from a JSON file.
        Plugins must re-register their hooks at import time.
        """
        if _PLUGIN_HOOKS_FILE.exists():
            try:
                with open(_PLUGIN_HOOKS_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                logger.debug("Failed to load hooks metadata from %s", _PLUGIN_HOOKS_FILE, exc_info=True)
        return {}


# DEAD CODE: consider removal
def register_plugin(name: str, version: str = "1.0.0", description: str = "",
                     author: str = "", hooks: Optional[Dict[str, Callable]] = None) -> bool:
    """Register a plugin with metadata and optional hooks.
    
    Usage in plugin file:
        from reconpro.plugins import register_plugin, HookManager
        
        # DEAD CODE: consider removal
        def on_scan(target, base_url, modules):
            print(f"Scan starting: {target}")
        
        register_plugin(
            name="my_plugin",
            version="1.0.0",
            description="My custom plugin",
            hooks={"pre_scan": on_scan}
        )
    """
    _PLUGIN_META[name] = {
        "name": name,
        "version": version,
        "description": description,
        "author": author,
        "registered": True,
    }
    
    if hooks:
        for hook_name, callback in hooks.items():
            HookManager.register(hook_name, callback)
    
    return True


# DEAD CODE: consider removal
def get_registered_plugins() -> Dict[str, Dict[str, Any]]:
    """Get metadata for all registered plugins."""
    return dict(_PLUGIN_META)


def load_all_plugins(use_sandbox: bool = True) -> Dict[str, Dict[str, Any]]:
    """Discover and load all plugins, registering their hooks."""
    plugins = discover_plugins()
    for plugin_id, plugin_info in plugins.items():
        runner = plugin_info.get("runner")
        if callable(runner) and hasattr(runner, '__self__'):
            pass  # Module-level function, hooks handled at import time
        _PLUGIN_META.setdefault(plugin_id, {
            "name": plugin_id,
            "description": plugin_info.get("description", ""),
            "registered": True,
        })
    return plugins

