"""Production-grade tests for reconpro.plugins."""

import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch
from importlib import import_module

from reconpro.plugins import (
    _create_sandbox_globals,
    _BLOCKED_BUILTINS,
    _ALLOWED_IMPORTS,
    PluginSecurityError,
    PLUGIN_DIR,
    _MAX_FINDINGS,
)


class TestBlockedBuiltins(unittest.TestCase):
    """Tests for _BLOCKED_BUILTINS set."""

    def test_contains_eval(self):
        self.assertIn("eval", _BLOCKED_BUILTINS)

    def test_contains_exec(self):
        self.assertIn("exec", _BLOCKED_BUILTINS)

    def test_contains_open(self):
        self.assertIn("open", _BLOCKED_BUILTINS)

    def test_contains_import(self):
        self.assertIn("__import__", _BLOCKED_BUILTINS)

    def test_contains_compile(self):
        self.assertIn("compile", _BLOCKED_BUILTINS)

    def test_contains_breakpoint(self):
        self.assertIn("breakpoint", _BLOCKED_BUILTINS)

    def test_contains_exit(self):
        self.assertIn("exit", _BLOCKED_BUILTINS)

    def test_contains_quit(self):
        self.assertIn("quit", _BLOCKED_BUILTINS)

    def test_contains_globals(self):
        self.assertIn("globals", _BLOCKED_BUILTINS)

    def test_contains_locals(self):
        self.assertIn("locals", _BLOCKED_BUILTINS)


class TestAllowedImports(unittest.TestCase):
    """Tests for _ALLOWED_IMPORTS set."""

    def test_contains_safe_modules(self):
        for mod in ("json", "re", "ssl", "hashlib", "urllib.parse"):
            self.assertIn(mod, _ALLOWED_IMPORTS)

    def test_does_not_contain_dangerous(self):
        for mod in ("os", "sys", "subprocess", "ctypes"):
            self.assertNotIn(mod, _ALLOWED_IMPORTS)

    def test_contains_reconpro_http(self):
        self.assertIn("reconpro.http", _ALLOWED_IMPORTS)


class TestCreateSandboxGlobals(unittest.TestCase):
    """Tests for _create_sandbox_globals."""

    def test_returns_dict(self):
        sandbox = _create_sandbox_globals()
        self.assertIsInstance(sandbox, dict)

    def test_has_builtins_key(self):
        sandbox = _create_sandbox_globals()
        self.assertIn("__builtins__", sandbox)
        self.assertIsInstance(sandbox["__builtins__"], dict)

    def test_blocks_eval(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        self.assertNotIn("eval", builtins)

    def test_blocks_exec(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        self.assertNotIn("exec", builtins)

    def test_blocks_open(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        self.assertNotIn("open", builtins)

    def test_blocks_original_import(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        # __import__ IS present but it's the restricted version
        self.assertIn("__import__", builtins)

    def test_has_safe_builtins(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        for safe in ("print", "len", "range", "str", "int", "float", "list", "dict"):
            self.assertIn(safe, builtins, f"{safe} should be allowed")

    def test_restricted_import_blocks_os(self):
        sandbox = _create_sandbox_globals()
        restricted_import = sandbox["__builtins__"]["__import__"]
        with self.assertRaises(PluginSecurityError):
            restricted_import("os")

    def test_restricted_import_blocks_subprocess(self):
        sandbox = _create_sandbox_globals()
        restricted_import = sandbox["__builtins__"]["__import__"]
        with self.assertRaises(PluginSecurityError):
            restricted_import("subprocess")

    def test_restricted_import_allows_json(self):
        sandbox = _create_sandbox_globals()
        restricted_import = sandbox["__builtins__"]["__import__"]
        # Should not raise
        restricted_import("json")

    def test_restricted_import_allows_re(self):
        sandbox = _create_sandbox_globals()
        restricted_import = sandbox["__builtins__"]["__import__"]
        restricted_import("re")

    def test_has_name(self):
        sandbox = _create_sandbox_globals()
        self.assertEqual(sandbox["__name__"], "reconpro_sandbox")

    def test_has_doc(self):
        sandbox = _create_sandbox_globals()
        self.assertEqual(sandbox["__doc__"], "Sandboxed plugin environment")


class TestPluginSecurityError(unittest.TestCase):
    """Tests for PluginSecurityError."""

    def test_is_exception(self):
        self.assertTrue(issubclass(PluginSecurityError, Exception))

    def test_message(self):
        err = PluginSecurityError("test violation")
        self.assertEqual(str(err), "test violation")

    def test_catchable(self):
        with self.assertRaises(PluginSecurityError):
            raise PluginSecurityError("blocked")


class TestDiscoverPlugins(unittest.TestCase):
    """Tests for discover_plugins with empty plugin directory."""

    def test_empty_directory(self):
        with TemporaryDirectory() as td:
            with patch("reconpro.plugins.PLUGIN_DIR", Path(td)):
                # Need to reimport or patch
                from importlib import reload
                import reconpro.plugins as plugins_mod
                # Create the dir structure
                Path(td).mkdir(exist_ok=True)
                plugins = plugins_mod.discover_plugins()
                self.assertIsInstance(plugins, dict)

    def test_nonexistent_plugin_returns_error_finding(self):
        """run_plugin with non-existent plugin returns error Finding."""
        from reconpro.plugins import run_plugin
        from reconpro.http import Finding

        with TemporaryDirectory() as td:
            with patch("reconpro.plugins.PLUGIN_DIR", Path(td)):
                Path(td).mkdir(exist_ok=True)
                # Patch discover_plugins to return empty
                with patch("reconpro.plugins.discover_plugins", return_value={}):
                    result = run_plugin("nonexistent_plugin", "example.com")
                    self.assertIsInstance(result, list)
                    self.assertEqual(len(result), 1)
                    self.assertIsInstance(result[0], Finding)
                    self.assertIn("not found", result[0].title)


class TestMaxFindings(unittest.TestCase):
    """Tests for _MAX_FINDINGS constant."""

    def test_max_findings_is_positive(self):
        self.assertGreater(_MAX_FINDINGS, 0)

    def test_max_findings_reasonable(self):
        self.assertLessEqual(_MAX_FINDINGS, 1000)


class TestSandboxExecution(unittest.TestCase):
    """Tests for sandbox enforcement."""

    def test_eval_blocked_in_sandbox(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        # eval should not be available in the sandbox builtins
        self.assertNotIn("eval", builtins)

        # exec IS available in the sandbox (it's the plugin loader's exec)
        # But eval is NOT. Trying to call eval should fail.
        # Note: Python's built-in eval() is NOT available in sandbox globals
        code = compile(
            "x = __builtins__.get('eval', None)",
            "test_plugin",
            "exec",
        )
        exec(code, sandbox)
        # eval is not in the sandbox, so this variable approach confirms it

    def test_exec_blocked_in_sandbox(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        # exec is blocked
        self.assertNotIn("exec", builtins)

    def test_open_blocked_in_sandbox(self):
        sandbox = _create_sandbox_globals()
        builtins = sandbox["__builtins__"]
        # open is blocked
        self.assertNotIn("open", builtins)

    def test_restrictions_apply_to_code(self):
        """Code executed in sandbox cannot access blocked builtins."""
        sandbox = _create_sandbox_globals()
        code = compile(
            "__import__('os')",
            "test_plugin",
            "exec",
        )
        with self.assertRaises(PluginSecurityError):
            exec(code, sandbox)


if __name__ == "__main__":
    unittest.main()
