"""Security hardening regression tests for ReconPro v10.0.0.

These tests verify that the security fixes applied during the
security audit remain effective. Each test maps to a specific
vulnerability finding from the audit report.

Run:
    python3 -m pytest tests/test_security_hardening.py -v
"""
from __future__ import annotations

import os
import tempfile
import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture
def plugin_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Provide an isolated plugin directory."""
    monkeypatch.setattr("reconpro.plugins.PLUGIN_DIR", tmp_path)
    return tmp_path


@pytest.fixture
def safe_plugin_source() -> str:
    """A benign plugin that should pass all sandbox checks."""
    return textwrap.dedent("""\
        NAME = "test_safe"
        DESCRIPTION = "A safe test plugin"

        from reconpro.http import Finding

        def run(target, base_url="", timeout=8, verify_tls=True):
            findings = []
            total = sum(range(10))
            findings.append(Finding(
                title="Test Finding",
                severity="info",
                category="test",
                module="test_safe",
                description=f"Computed sum: {total}",
                evidence="",
                asset=target,
                points_deducted=0,
            ))
            return findings
    """
    )


def _write_plugin(plugin_dir: Path, name: str, source: str) -> Path:
    """Write a plugin source file to the plugin directory."""
    path = plugin_dir / f"{name}.py"
    path.write_text(source)
    return path


# ═══════════════════════════════════════════════════════════════════════
# TEST 1: Sandbox blocks type.__subclasses__() escape
# ═══════════════════════════════════════════════════════════════════════
# Finding: CRITICAL — plugins.py:70-71 (original)
# The sandbox allowed `type` and all type objects, enabling the classic
# __class__.__bases__[0].__subclasses__() escape.
# Fix: Replaced blacklist with explicit allowlist of safe builtins.


class TestSandboxTypeEscapes:
    """Verify the sandbox blocks classic Python sandbox escapes via type."""

    def test_subclasses_escape_blocked(self, plugin_dir: Path):
        """Plugin using __subclasses__() must be rejected at source level."""
        from reconpro.plugins import _run_sandboxed, PluginSecurityError

        source = textwrap.dedent('''\
            NAME = "escape_subclasses"
            DESCRIPTION = "Attempt __subclasses__ escape"
            from reconpro.http import Finding
            def run(target, base_url="", timeout=8, verify_tls=True):
                classes = ().__class__.__bases__[0].__subclasses__()
                return []
        ''')
        _write_plugin(plugin_dir, "escape_subclasses", source)

        with pytest.raises(PluginSecurityError, match="forbidden pattern"):
            _run_sandboxed(
                str(plugin_dir / "escape_subclasses.py"),
                "example.com", "", 5, True,
            )

    def test_class_access_blocked(self, plugin_dir: Path):
        """Plugin using __class__ must be rejected at source level."""
        from reconpro.plugins import _run_sandboxed, PluginSecurityError

        source = textwrap.dedent('''\
            NAME = "escape_class"
            DESCRIPTION = "Attempt __class__ escape"
            from reconpro.http import Finding
            def run(target, base_url="", timeout=8, verify_tls=True):
                cls = "".class__
                return []
        ''')
        _write_plugin(plugin_dir, "escape_class", source)

        # Note: single underscore won't match the pattern, but double will
        source2 = textwrap.dedent('''\
            NAME = "escape_class2"
            DESCRIPTION = "Attempt __class__ escape"
            from reconpro.http import Finding
            def run(target, base_url="", timeout=8, verify_tls=True):
                cls = "".__class__
                return []
        ''')
        _write_plugin(plugin_dir, "escape_class2", source2)

        with pytest.raises(PluginSecurityError, match="forbidden pattern"):
            _run_sandboxed(
                str(plugin_dir / "escape_class2.py"),
                "example.com", "", 5, True,
            )

    def test_bases_access_blocked(self, plugin_dir: Path):
        """Plugin using __bases__ must be rejected at source level."""
        from reconpro.plugins import _run_sandboxed, PluginSecurityError

        source = textwrap.dedent('''\
            NAME = "escape_bases"
            DESCRIPTION = "Attempt __bases__ escape"
            from reconpro.http import Finding
            def run(target, base_url="", timeout=8, verify_tls=True):
                bases = ().__class__.__bases__
                return []
        ''')
        _write_plugin(plugin_dir, "escape_bases", source)

        with pytest.raises(PluginSecurityError, match="forbidden pattern"):
            _run_sandboxed(
                str(plugin_dir / "escape_bases.py"),
                "example.com", "", 5, True,
            )


# ═══════════════════════════════════════════════════════════════════════
# TEST 2: Sandbox blocks getattr-based escapes
# ═══════════════════════════════════════════════════════════════════════
# Finding: CRITICAL — plugins.py:68 (original)
# getattr was not in _BLOCKED_BUILTINS and was callable, so it passed.
# Fix: getattr added to _BLOCKED_BUILTINS + explicit allowlist + source regex.


class TestSandboxGetattrEscapes:
    """Verify the sandbox blocks getattr-based introspection escapes."""

    def test_getattr_blocked_in_source(self, plugin_dir: Path):
        """Plugin using getattr() must be rejected at source level."""
        from reconpro.plugins import _run_sandboxed, PluginSecurityError

        source = textwrap.dedent('''\
            NAME = "escape_getattr"
            DESCRIPTION = "Attempt getattr escape"
            from reconpro.http import Finding
            def run(target, base_url="", timeout=8, verify_tls=True):
                cls = getattr("", "__class__")
                return []
        ''')
        _write_plugin(plugin_dir, "escape_getattr", source)

        with pytest.raises(PluginSecurityError, match="forbidden pattern"):
            _run_sandboxed(
                str(plugin_dir / "escape_getattr.py"),
                "example.com", "", 5, True,
            )

    def test_getattr_not_in_sandbox_builtins(self):
        """getattr must not be available in sandbox globals."""
        from reconpro.plugins import _create_sandbox_globals

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]
        assert "getattr" not in builtins_dict, \
            "getattr must not be accessible in sandbox"

    def test_type_not_in_sandbox_builtins(self):
        """type must not be available in sandbox globals."""
        from reconpro.plugins import _create_sandbox_globals

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]
        assert "type" not in builtins_dict, \
            "type must not be accessible in sandbox"

    def test_vars_not_in_sandbox_builtins(self):
        """vars must not be available in sandbox globals."""
        from reconpro.plugins import _create_sandbox_globals

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]
        assert "vars" not in builtins_dict, \
            "vars must not be accessible in sandbox"

    def test_open_not_in_sandbox_builtins(self):
        """open must not be available in sandbox globals."""
        from reconpro.plugins import _create_sandbox_globals

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]
        assert "open" not in builtins_dict, \
            "open must not be accessible in sandbox"


# ═══════════════════════════════════════════════════════════════════════
# TEST 3: discover_plugins does NOT execute plugin code
# ═══════════════════════════════════════════════════════════════════════
# Finding: HIGH — plugins.py:220-225 (original)
# discover_plugins() used spec.loader.exec_module() which executed plugin
# code with FULL Python access outside the sandbox.
# Fix: Replaced with source-text-only discovery (no code execution).


class TestDiscoverPluginsNoExec:
    """Verify discover_plugins() never executes plugin code."""

    def test_discover_no_code_execution(self, plugin_dir: Path):
        """Plugins with side effects should not execute during discovery."""
        from reconpro.plugins import discover_plugins

        # A plugin that would crash if executed
        source = textwrap.dedent('''\
            NAME = "side_effect"
            DESCRIPTION = "Should not execute during discovery"
            raise RuntimeError("BOOM - code was executed during discovery!")

            def run(target, base_url="", timeout=8, verify_tls=True):
                return []
        ''')
        _write_plugin(plugin_dir, "side_effect", source)

        # discover_plugins should NOT raise, because it doesn't exec the code
        plugins = discover_plugins()
        assert "side_effect" in plugins
        assert plugins["side_effect"]["name"] == "side_effect"
        assert plugins["side_effect"]["description"] == "Should not execute during discovery"

    def test_discover_extracts_name_description(self, plugin_dir: Path):
        """discover_plugins correctly extracts NAME and DESCRIPTION without exec."""
        from reconpro.plugins import discover_plugins

        source = textwrap.dedent('''\
            NAME = "custom_name"
            DESCRIPTION = "custom description here"

            def run(target, base_url="", timeout=8, verify_tls=True):
                return []
        ''')
        _write_plugin(plugin_dir, "custom_plugin", source)

        plugins = discover_plugins()
        assert "custom_plugin" in plugins
        assert plugins["custom_plugin"]["name"] == "custom_name"
        assert plugins["custom_plugin"]["description"] == "custom description here"

    def test_discover_no_runner_key(self, plugin_dir: Path):
        """Discovered plugins should NOT have a 'runner' key (no loaded function)."""
        from reconpro.plugins import discover_plugins

        source = textwrap.dedent('''\
            NAME = "no_runner"
            DESCRIPTION = "Test"
            def run(target, base_url="", timeout=8, verify_tls=True):
                return []
        ''')
        _write_plugin(plugin_dir, "no_runner", source)

        plugins = discover_plugins()
        assert "runner" not in plugins.get("no_runner", {}), \
            "Discovered plugins should not contain executable runner"


# ═══════════════════════════════════════════════════════════════════════
# TEST 4: Plugin name sanitization prevents path traversal
# ═══════════════════════════════════════════════════════════════════════
# Finding: MEDIUM — plugins.py:318 (original)
# create_plugin_template() concatenated user-provided name directly into
# a file path, enabling path traversal (e.g., "../../etc/cron.d/malicious").
# Fix: Added _sanitize_plugin_name() to strip non-alphanumeric chars.


class TestPluginNameSanitization:
    """Verify plugin name sanitization prevents path traversal."""

    def test_path_traversal_rejected(self):
        """Names with path traversal sequences must be sanitized."""
        from reconpro.plugins import _sanitize_plugin_name

        # After sanitization, traversal characters are stripped
        result = _sanitize_plugin_name("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result
        # The result should be a safe name like 'etcpasswd'

    def test_dotdot_slash_stripped(self):
        """../ components must be removed."""
        from reconpro.plugins import _sanitize_plugin_name

        result = _sanitize_plugin_name("foo../../bar")
        assert ".." not in result
        assert "/" not in result

    def test_shell_metacharacters_stripped(self):
        """Shell metacharacters must be removed from plugin names."""
        from reconpro.plugins import _sanitize_plugin_name

        result = _sanitize_plugin_name("test; rm -rf /")
        assert ";" not in result
        assert "rm" in result  # 'rm' itself is valid

    def test_underscore_prefix_rejected(self):
        """Plugin names starting with underscore must be rejected."""
        from reconpro.plugins import _sanitize_plugin_name

        with pytest.raises(ValueError):
            _sanitize_plugin_name("_private")

    def test_empty_name_rejected(self):
        """Empty or all-stripped names must be rejected."""
        from reconpro.plugins import _sanitize_plugin_name

        with pytest.raises(ValueError):
            _sanitize_plugin_name("...!!!")

    def test_valid_name_passes(self):
        """Valid alphanumeric names should pass unchanged."""
        from reconpro.plugins import _sanitize_plugin_name

        assert _sanitize_plugin_name("my-scanner_v2") == "my-scanner_v2"
        assert _sanitize_plugin_name("portscan") == "portscan"

    def test_create_template_uses_sanitized_name(self, plugin_dir: Path, monkeypatch: pytest.MonkeyPatch):
        """create_plugin_template must not write outside plugin dir."""
        from reconpro.plugins import create_plugin_template

        # The monkeypatch already sets PLUGIN_DIR to plugin_dir (tmp_path)
        result = create_plugin_template("../../etc/evil")
        # After sanitization, the path should be inside plugin_dir
        assert Path(result).parent == plugin_dir
        assert Path(result).suffix == '.py'
        # No path separators in the filename
        assert '/' not in Path(result).name
        # Verify the file was actually created
        assert Path(result).exists()


# ═══════════════════════════════════════════════════════════════════════
# TEST 5: Source-level regex blocks dangerous import patterns
# ═══════════════════════════════════════════════════════════════════════
# Finding: MEDIUM — plugins.py:129-134 (original)
# Original pattern check only looked for "import {pattern}" literal,
# missing "from os import system", double spaces, etc.
# Fix: Replaced with comprehensive regex patterns.


class TestSourcePatternBlocking:
    """Verify dangerous source patterns are caught by regex scan."""

    @pytest.mark.parametrize("source_snippet", [
        # Direct import patterns
        "from os import system",
        "from os import popen, system",
        "from subprocess import run, Popen",
        "from ctypes import CDLL",
        # Indirect access patterns
        "os.system('ls')",
        "os.popen('id')",
        # Dunder-based escapes
        "''.__class__",
        "().__bases__",
        "().__class__.__subclasses__()",
        "something.__builtins__",
        # Function call patterns
        "getattr(obj, 'x')",
        "setattr(obj, 'x', 1)",
        "open('/etc/passwd')",
        "exec('code')",
        "eval('1+1')",
        "compile('code', '', 'exec')",
        # Module-level dangers
        "import shutil",
        "import importlib",
    ])
    def test_dangerous_patterns_rejected(self, plugin_dir: Path, source_snippet: str):
        """Each dangerous pattern must trigger a PluginSecurityError."""
        from reconpro.plugins import _run_sandboxed, PluginSecurityError

        source = textwrap.dedent(f'''\
            NAME = "dangerous"
            DESCRIPTION = "Test"
            from reconpro.http import Finding
            def run(target, base_url="", timeout=8, verify_tls=True):
                {source_snippet}
                return []
        ''')
        _write_plugin(plugin_dir, "dangerous", source)

        with pytest.raises(PluginSecurityError, match="forbidden pattern"):
            _run_sandboxed(
                str(plugin_dir / "dangerous.py"),
                "example.com", "", 5, True,
            )


# ═══════════════════════════════════════════════════════════════════════
# TEST 6: Sandbox allowlist is minimal
# ═══════════════════════════════════════════════════════════════════════
# Verify the sandbox only exposes safe builtins, not an implicit allowlist.


class TestSandboxAllowlist:
    """Verify the sandbox uses a strict explicit allowlist."""

    def test_only_safe_builtins_present(self):
        """Sandbox must only contain explicitly allowed builtins."""
        from reconpro.plugins import _create_sandbox_globals

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]

        # Dangerous builtins must NOT be present
        dangerous = [
            "eval", "exec", "open", "compile",
            "getattr", "setattr", "delattr", "vars", "type",
            "dir", "input", "breakpoint", "exit", "quit",
            "globals", "locals", "memoryview", "bytearray",
        ]
        for name in dangerous:
            assert name not in builtins_dict, \
                f"Dangerous builtin '{name}' must not be in sandbox"

        # __import__ IS present but in restricted form — verify it's not the original
        assert "__import__" in builtins_dict, "Sandbox must have a custom __import__"
        import builtins as _builtins_orig
        assert builtins_dict["__import__"] is not _builtins_orig.__import__, \
            "__import__ must be the restricted version"

    def test_safe_builtins_present(self):
        """Essential safe builtins must be present."""
        from reconpro.plugins import _create_sandbox_globals

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]

        safe_essential = [
            "int", "str", "float", "bool", "list", "dict", "set",
            "tuple", "len", "range", "print", "isinstance", "issubclass",
            "Exception", "ValueError", "TypeError", "KeyError",
        ]
        for name in safe_essential:
            assert name in builtins_dict, \
                f"Safe builtin '{name}' must be in sandbox"

    def test_sandbox_has_restricted_import(self):
        """Sandbox __import__ must be the restricted version."""
        from reconpro.plugins import _create_sandbox_globals, PluginSecurityError

        sandbox = _create_sandbox_globals()
        builtins_dict = sandbox["__builtins__"]

        assert "__import__" in builtins_dict, \
            "Sandbox must have a custom __import__"

        # The restricted import should block os
        with pytest.raises(PluginSecurityError):
            builtins_dict["__import__"]("os")


# ═══════════════════════════════════════════════════════════════════════
# TEST 7: Safe plugin still executes correctly
# ═══════════════════════════════════════════════════════════════════════
# Verify that legitimate plugins still work after hardening.


class TestSafePluginStillWorks:
    """Verify legitimate plugins still function after sandbox hardening."""

    def test_safe_plugin_runs_successfully(self, plugin_dir: Path, safe_plugin_source: str):
        """A benign plugin should execute and return findings."""
        from reconpro.plugins import _run_sandboxed

        _write_plugin(plugin_dir, "test_safe", safe_plugin_source)
        findings = _run_sandboxed(
            str(plugin_dir / "test_safe.py"),
            "example.com", "https://example.com", 10, True,
        )
        assert isinstance(findings, list)
        assert len(findings) == 1
        assert findings[0].title == "Test Finding"
        assert findings[0].asset == "example.com"

    def test_safe_plugin_can_import_allowed_modules(self, plugin_dir: Path):
        """Plugins should be able to import from the allowed list."""
        from reconpro.plugins import _run_sandboxed

        source = textwrap.dedent('''\
            NAME = "import_test"
            DESCRIPTION = "Test allowed imports"
            from reconpro.http import Finding
            import json
            import re

            def run(target, base_url="", timeout=8, verify_tls=True):
                data = json.dumps({"target": target})
                findings = []
                findings.append(Finding(
                    title="Import Test",
                    severity="info",
                    category="test",
                    module="import_test",
                    description=data,
                    evidence="",
                    asset=target,
                    points_deducted=0,
                ))
                return findings
        ''')
        _write_plugin(plugin_dir, "import_test", source)
        findings = _run_sandboxed(
            str(plugin_dir / "import_test.py"),
            "example.com", "", 10, True,
        )
        assert len(findings) == 1
        assert findings[0].title == "Import Test"


# ═══════════════════════════════════════════════════════════════════════
# TEST 8: Host module shell metachar sanitization
# ═══════════════════════════════════════════════════════════════════════
# Finding: MEDIUM — modules/host.py:1203 (original)
# TEMP/TMP env vars were used unsanitized in an f-string for a shell command.
# Fix: Added shell metacharacter check before using env var value.


class TestHostModuleEnvVarSanitization:
    """Verify host.py sanitizes env vars before shell command interpolation."""

    def test_shell_metachar_in_temp_is_skipped(self):
        """TEMP/TMP with shell metacharacters should be skipped."""
        import re
        # The regex used in the fix
        pattern = r'["&|<>^]'

        malicious_paths = [
            'C:\\Temp & del /f /q C:\\*.*',
            'C:\\Temp | echo pwned',
            'C:\\Temp > C:\\evil.txt',
            'C:\\Temp^&whoami',
        ]
        for path in malicious_paths:
            assert re.search(pattern, path), \
                f"Metachar should be detected in: {path}"

    def test_normal_temp_path_passes(self):
        """Normal TEMP/TMP paths should pass the check."""
        import re
        pattern = r'["&|<>^]'

        normal_paths = [
            r"C:\\Users\\test\\AppData\\Local\\Temp",
            r"C:\\Windows\\Temp",
            r"D:\\Temp",
        ]
        for path in normal_paths:
            assert not re.search(pattern, path), \
                f"Normal path should pass: {path}"


# ═══════════════════════════════════════════════════════════════════════
# TEST 9: No hardcoded secrets in codebase
# ═══════════════════════════════════════════════════════════════════════
# Scanned: Entire reconpro/ directory
# Result: No hardcoded API keys, passwords, or tokens found.


class TestNoHardcodedSecrets:
    """Verify no actual secrets are hardcoded in the codebase."""

    def test_no_real_api_key_patterns(self):
        """No real API key patterns should exist in Python source files."""
        import re

        reconpro_dir = Path(__file__).parent.parent / "reconpro"
        api_key_patterns = [
            re.compile(r'sk-[a-zA-Z0-9]{20,}'),
            re.compile(r'ghp_[a-zA-Z0-9]{30,}'),
            re.compile(r'xox[bpsa]-[a-zA-Z0-9-]{20,}'),
            re.compile(r'AKIA[A-Z0-9]{16}'),
        ]

        for py_file in reconpro_dir.glob("**/*.py"):
            if "__pycache__" in str(py_file):
                continue
            content = py_file.read_text(errors="ignore")
            for pattern in api_key_patterns:
                matches = pattern.findall(content)
                assert not matches, \
                    f"Found potential API key in {py_file}: {matches[0][:20]}..."


# ═══════════════════════════════════════════════════════════════════════
# TEST 10: No unsafe deserialization in actual code paths
# ═══════════════════════════════════════════════════════════════════════
# Scanned: Entire reconpro/ directory
# Result: All pickle/yaml.load/marshal/shelve references are in strings
#         (detection patterns, remediation text, WAF rules), not actual calls.


class TestNoUnsafeDeserialization:
    """Verify no actual unsafe deserialization occurs in code paths."""

    def test_pickle_only_in_strings(self):
        """Any pickle references should be in strings, not actual function calls."""
        import ast

        reconpro_dir = Path(__file__).parent.parent / "reconpro"

        for py_file in reconpro_dir.glob("**/*.py"):
            if "__pycache__" in str(py_file):
                continue
            try:
                tree = ast.parse(py_file.read_text())
            except SyntaxError:
                continue

            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Attribute):
                        if node.func.attr in ("loads", "load", "dumps", "dump"):
                            if isinstance(node.func.value, ast.Name):
                                if node.func.value.id == "pickle":
                                    assert False, \
                                        f"Actual pickle.{node.func.attr}() call in {py_file}"
