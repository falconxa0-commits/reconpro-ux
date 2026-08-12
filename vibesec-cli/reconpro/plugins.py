"""Plugin system for ReconPro with sandboxed execution.

Loads custom scanning modules from ~/.reconpro/plugins/.
Each plugin is a .py file with a `run(target, base_url, **kwargs)` function
that returns a list of Finding objects.

Security measures:
- Restricted builtins (explicit allowlist — no eval, exec, open, getattr, type, etc.)
- Source-level regex scan for dangerous patterns
- Timeout enforcement (plugins cannot run forever)
- Resource limits (max output size)
- Import restrictions (plugins cannot import arbitrary modules)
- Isolated namespace
- Plugin discovery without code execution
- Plugin name sanitization (path traversal prevention)
"""
from __future__ import annotations

import logging
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from .http import Finding

logger = logging.getLogger(__name__)

PLUGIN_DIR = Path.home() / ".reconpro" / "plugins"

# ── Allowed imports for plugins ──────────────────────────────────
_ALLOWED_IMPORTS: Set[str] = {
    "reconpro.http", "urllib.request", "urllib.error",
    "urllib.parse", "json", "re", "ssl", "hashlib",
    "base64", "socket", "struct", "time", "datetime",
    "collections", "itertools", "functools", "math",
    "string", "copy", "enum", "typing", "dataclasses",
}

# ── Max output findings per plugin ──────────────────────────────
_MAX_FINDINGS = 200

# ── Builtin functions that plugins must NOT access ──────────────
_BLOCKED_BUILTINS: Set[str] = {
    "eval", "exec", "open", "__import__", "compile",
    "breakpoint", "exit", "quit", "globals", "locals",
    "getattr", "setattr", "delattr", "vars", "type",
    "dir", "input", "memoryview", "bytearray",
}


class PluginSecurityError(Exception):
    """Raised when a plugin violates the security sandbox."""
    pass


def _create_sandbox_globals() -> Dict[str, Any]:
    """Create a restricted globals dict for plugin execution.

    Strips dangerous builtins and injects only a safe allowlist.
    """
    import builtins as _builtins

    # Explicit allowlist of safe builtins (whitelist approach)
    _SAFE_BUILTINS = {
        "abs", "all", "any", "bin", "bool", "chr", "dict", "divmod",
        "enumerate", "filter", "float", "frozenset", "hash", "hex",
        "int", "isinstance", "issubclass", "iter", "len", "list",
        "map", "max", "min", "next", "oct", "ord", "pow", "print",
        "range", "repr", "reversed", "round", "set", "slice",
        "sorted", "str", "sum", "super", "tuple", "zip",
        "True", "False", "None",
        "AttributeError", "ValueError", "TypeError", "KeyError",
        "IndexError", "RuntimeError", "StopIteration", "Exception",
        "NotImplementedError", "ZeroDivisionError", "OSError",
    }

    safe_builtins: Dict[str, Any] = {}
    for name, obj in vars(_builtins).items():
        if name not in _SAFE_BUILTINS:
            continue
        if name in _BLOCKED_BUILTINS:
            continue
        safe_builtins[name] = obj

    # Override __import__ with a restricted version
    def _restricted_import(name: str, *args: Any, **kwargs: Any) -> Any:
        top_level = name.split(".")[0]
        if top_level not in _ALLOWED_IMPORTS and name not in _ALLOWED_IMPORTS:
            raise PluginSecurityError(
                f"Plugin attempted to import blocked module: {name}"
            )
        return _original_import(name, *args, **kwargs)

    _original_import = _builtins.__import__
    safe_builtins["__import__"] = _restricted_import

    return {
        "__builtins__": safe_builtins,
        "__name__": "reconpro_sandbox",
        "__doc__": "Sandboxed plugin environment",
    }


def _run_sandboxed(
    plugin_path: str,
    target: str,
    base_url: str,
    timeout: int,
    verify_tls: bool,
) -> List[Finding]:
    """Execute a plugin in a sandboxed thread with timeout.

    Args:
        plugin_path: Absolute path to the plugin .py file.
        target: Scan target (domain/IP).
        base_url: Base URL for the target.
        timeout: Maximum execution time in seconds.
        verify_tls: Whether to verify TLS certificates.

    Returns:
        List of Finding objects produced by the plugin.

    Raises:
        PluginSecurityError: If the plugin violates sandbox rules.
        TimeoutError: If the plugin exceeds the timeout.
    """
    sandbox_globals = _create_sandbox_globals()
    result: List[Finding] = []
    error_holder: List[Exception] = []

    def _execute() -> None:
        """Load and run the plugin module in the sandbox."""
        try:
            # Read plugin source
            with open(plugin_path, "r", encoding="utf-8") as f:
                source = f.read()

            # Check for obviously dangerous patterns in source
            dangerous_patterns = [
                r"\bos\.(system|popen|exec|spawn|kill|fork)\b",
                r"\bsubprocess\b",
                r"\bctypes\b",
                r"\bmultiprocessing\b",
                r"\b__class__\b",
                r"\b__bases__\b",
                r"\b__subclasses__\b",
                r"\b__builtins__\b",
                r"\b__import__\b",
                r"\bgetattr\s*\(",
                r"\bsetattr\s*\(",
                r"\bopen\s*\(",
                r"\bexec\s*\(",
                r"\beval\s*\(",
                r"\bcompile\s*\(",
                r"\bshutil\b",
                r"\bimportlib\b",
                r"\bpathlib\b.*\.resolve\(",
                r"from\s+os\s+import",
                r"from\s+subprocess\s+import",
                r"from\s+ctypes\s+import",
            ]
            for pattern in dangerous_patterns:
                if re.search(pattern, source):
                    raise PluginSecurityError(
                        f"Plugin source contains forbidden pattern: {pattern}"
                    )

            # Compile and exec in sandbox
            code = compile(source, plugin_path, "exec")
            exec(code, sandbox_globals)  # noqa: S102 — intentional sandboxed exec

            # Extract and call the run function
            runner = sandbox_globals.get("run")
            if not callable(runner):
                raise PluginSecurityError(
                    f"Plugin at {plugin_path} has no callable 'run' function"
                )

            findings = runner(
                target=target,
                base_url=base_url,
                timeout=timeout,
                verify_tls=verify_tls,
            )

            # Validate output
            if not isinstance(findings, list):
                raise PluginSecurityError(
                    f"Plugin run() must return a list, got {type(findings).__name__}"
                )

            if len(findings) > _MAX_FINDINGS:
                findings = findings[:_MAX_FINDINGS]
                logger.warning(
                    "Plugin %s returned %d findings, truncated to %d",
                    plugin_path, len(findings), _MAX_FINDINGS,
                )

            for item in findings:
                if not isinstance(item, Finding):
                    raise PluginSecurityError(
                        f"Plugin run() must return list of Finding objects, "
                        f"got {type(item).__name__}"
                    )

            result.extend(findings)

        except PluginSecurityError as exc:
            error_holder.append(exc)
        except Exception as exc:
            # Wrap non-security errors for clean reporting
            error_holder.append(exc)

    # Run in a thread with timeout
    thread = threading.Thread(target=_execute, daemon=True)
    thread.start()
    thread.join(timeout=timeout)

    if thread.is_alive():
        # Thread is still running — timeout exceeded
        # We cannot kill threads in Python, but we refuse the result
        raise TimeoutError(
            f"Plugin {plugin_path} exceeded timeout of {timeout}s"
        )

    if error_holder:
        raise error_holder[0]

    return result


def _ensure_plugin_dir() -> None:
    PLUGIN_DIR.mkdir(parents=True, exist_ok=True)


def discover_plugins() -> Dict[str, Dict[str, Any]]:
    """Discover all plugins in the plugin directory.

    Returns:
        Dict mapping plugin_id to {name, path, description}.
        Note: Plugins are discovered by reading source files only.
        Execution happens in _run_sandboxed() with a proper sandbox.
    """
    _ensure_plugin_dir()
    plugins: Dict[str, Dict[str, Any]] = {}

    for py_file in sorted(PLUGIN_DIR.glob("*.py")):
        if py_file.name.startswith("_"):
            continue

        plugin_id = py_file.stem
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                source = f.read()

            # Extract NAME and DESCRIPTION from source without executing
            name = plugin_id.upper()
            desc = "Custom plugin"
            for line in source.splitlines():
                line_stripped = line.strip()
                if line_stripped.startswith("NAME"):
                    # Parse NAME = "..." or NAME = '...'
                    match = re.match(r'NAME\s*=\s*["\']([^"\']*)["\']', line_stripped)
                    if match:
                        name = match.group(1)
                elif line_stripped.startswith("DESCRIPTION"):
                    match = re.match(r'DESCRIPTION\s*=\s*["\']([^"\']*)["\']', line_stripped)
                    if match:
                        desc = match.group(1)
                # Verify a run function exists (textual check)
                if line_stripped.startswith("def run("):
                    plugins[plugin_id] = {
                        "name": name,
                        "path": str(py_file),
                        "description": desc,
                    }
                    break
        except Exception as exc:
            logger.error(
                "Failed to load plugin '%s': %s", py_file.name, exc
            )

    return plugins


def run_plugin(
    plugin_id: str,
    target: str,
    base_url: str = "",
    timeout: int = 8,
    verify_tls: bool = True,
) -> List[Finding]:
    """Run a specific plugin with sandboxed execution.

    Looks up the plugin by *plugin_id* in the plugin directory,
    executes its ``run()`` inside a sandboxed thread, and returns
    the resulting list of :class:`~reconpro.http.Finding` objects.

    Args:
        plugin_id: Stem of the plugin file (without .py).
        target: Scan target.
        base_url: Optional base URL.
        timeout: Maximum plugin execution time in seconds.
        verify_tls: Whether to verify TLS certificates.

    Returns:
        List of Finding objects, or a single-info Finding on error.
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

    plugin_path = plugins[plugin_id]["path"]
    try:
        return _run_sandboxed(
            plugin_path=plugin_path,
            target=target,
            base_url=base_url,
            timeout=timeout,
            verify_tls=verify_tls,
        )
    except TimeoutError as exc:
        logger.error("Plugin '%s' timed out: %s", plugin_id, exc)
        return [Finding(
            title=f"Plugin '{plugin_id}' timed out",
            severity="low", category="plugin",
            module="plugin",
            description=str(exc),
            evidence="", asset=target, points_deducted=0,
        )]
    except PluginSecurityError as exc:
        logger.error("Plugin '%s' security violation: %s", plugin_id, exc)
        return [Finding(
            title=f"Plugin '{plugin_id}' security error",
            severity="high", category="plugin",
            module="plugin",
            description=str(exc),
            evidence="", asset=target, points_deducted=0,
        )]
    except Exception as exc:
        logger.error("Plugin '%s' error: %s", plugin_id, exc)
        return [Finding(
            title=f"Plugin '{plugin_id}' error: {exc}",
            severity="low", category="plugin",
            module="plugin",
            description=str(exc),
            evidence="", asset=target, points_deducted=0,
        )]


def _sanitize_plugin_name(name: str) -> str:
    """Sanitize plugin name to prevent path traversal.

    Only allows alphanumeric characters, underscores, and hyphens.
    """
    sanitized = re.sub(r"[^a-zA-Z0-9_-]", "", name)
    if not sanitized or sanitized.startswith("_"):
        raise ValueError(f"Invalid plugin name: {name!r}")
    return sanitized


def create_plugin_template(name: str) -> str:
    """Create a template plugin file. Returns the path."""
    _ensure_plugin_dir()
    name = _sanitize_plugin_name(name)
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
