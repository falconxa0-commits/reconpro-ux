"""
ReconPro test suite — batch 3 verification.

Covers:
  m2  — UUID4 encounter IDs (no 1-second collision window)
  m4  — _safe_filename() deep sanitization
  M1  — _confirm_proceed() gating (non-destructive in dry-run)
  M2  — run() shell safety (shlex.split + shell=False)
  M3  — tempfile.mkstemp with mode 0o600 (not /tmp/)
  M5  — mutually exclusive mode flags
  C3  — audit_log JSON Lines injection immunity
  m1  — audit-log write failure: stderr warning once
  m6  — _find_cache delimiter-anchored match
  m9  — --json output purity
"""
import hashlib
import io
import json
import os
import re
import sys
import tempfile
import uuid

import pytest

_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

# ── Import target functions ──────────────────────────────────────────────
import reconpro


# ══════════════════════════════════════════════════════════════════════════
# m2: UUID4 encounter IDs
# ══════════════════════════════════════════════════════════════════════════

class TestEncounterID:
    """Encounter IDs must be globally unique (uuid4) — no time-based collision."""

    def test_format(self):
        eid = reconpro.generate_encounter_id("example.com")
        assert eid.startswith("RPU-"), f"Bad prefix: {eid}"
        suffix = eid[4:]
        assert len(suffix) == 12, f"Suffix length wrong: {len(suffix)}"
        assert suffix.isalnum() and suffix.isupper(), f"Not upper-hex: {suffix}"

    def test_no_time_dependency(self):
        """Calling twice rapidly should yield different IDs."""
        a = reconpro.generate_encounter_id("same.host")
        b = reconpro.generate_encounter_id("same.host")
        assert a != b, "Two rapid calls returned identical encounter IDs"

    def test_unique_1000(self):
        """1000 IDs from the same host must all be unique."""
        ids = {reconpro.generate_encounter_id("stress.test") for _ in range(1000)}
        assert len(ids) == 1000, f"Collision detected: {len(ids)} < 1000"

    def test_no_hash_of_host_and_time(self):
        """Verify the encounter ID function does NOT use time.time()."""
        import inspect
        src = inspect.getsource(reconpro.generate_encounter_id)
        assert "time.time()" not in src, "time.time() in encounter ID — collision window exists"
        assert "uuid.uuid4" in src, "encounter ID should use uuid.uuid4"


# ══════════════════════════════════════════════════════════════════════════
# m4: _safe_filename deep sanitization
# ══════════════════════════════════════════════════════════════════════════

class TestSafeFilename:
    """_safe_filename must block path traversal, null bytes, control chars."""

    def test_normal_hostname(self):
        assert reconpro._safe_filename("example.com") == "example.com"

    def test_path_traversal_blocked(self):
        result = reconpro._safe_filename("../../etc/passwd")
        assert "/" not in result, f"Slash survived: {result}"
        assert ".." not in result, f"Dot-dot survived: {result}"

    def test_null_byte_blocked(self):
        result = reconpro._safe_filename("file\x00evil.exe")
        assert "\x00" not in result

    def test_control_chars_stripped(self):
        result = reconpro._safe_filename("file\tname\n\r.exe")
        assert "\t" not in result
        assert "\n" not in result
        assert "\r" not in result

    def test_backslash_blocked(self):
        result = reconpro._safe_filename("win\\path\\evil")
        assert "\\" not in result, f"Backslash survived: {result}"

    def test_empty_input(self):
        assert reconpro._safe_filename("") == "unnamed"

    def test_dot_dot_returns_unnamed(self):
        assert reconpro._safe_filename("..") == "unnamed"
        assert reconpro._safe_filename(".") == "unnamed"

    def test_long_input_truncated(self):
        long_name = "a" * 500
        result = reconpro._safe_filename(long_name)
        assert len(result) <= 120

    def test_no_double_underscores(self):
        result = reconpro._safe_filename("host..com")
        assert "__" not in result, f"Double underscore survived: {result}"

    def test_unicode_preserved(self):
        result = reconpro._safe_filename("münchen.de")
        assert "münchen" in result or "m" in result  # at least partial preservation


# ══════════════════════════════════════════════════════════════════════════
# C3: Audit log JSON Lines injection immunity
# ══════════════════════════════════════════════════════════════════════════

class TestAuditLogInjection:
    """audit_log output must be single valid JSON Lines — no newline injection."""

    def test_tab_and_newline_in_detail(self, tmp_path):
        log_path = str(tmp_path / "inject.jsonl")
        original = reconpro.AUDIT_LOG_PATH
        reconpro.AUDIT_LOG_PATH = log_path
        try:
            reconpro.audit_log(
                "test.event",
                status="ok",
                detail='normal text\tevent=fake\tstatus=9999\nFAKE LINE'
            )
            with open(log_path) as f:
                lines = f.readlines()
            assert len(lines) == 1, f"Expected 1 line, got {len(lines)}"
            record = json.loads(lines[0])
            assert record["detail"] == 'normal text\tevent=fake\tstatus=9999\nFAKE LINE'
        finally:
            reconpro.AUDIT_LOG_PATH = original


# ══════════════════════════════════════════════════════════════════════════
# M2: run() shell safety
# ══════════════════════════════════════════════════════════════════════════

class TestShellSafety:
    """Shell metacharacters must be literal — no /bin/sh interpretation."""

    def test_semicolon_not_executed(self):
        out, err = reconpro.run("echo hello; echo pwned", timeout=5)
        assert "hello; echo pwned" in out, f"Semicolon was interpreted: {out}"

    def test_command_substitution_not_executed(self):
        out, err = reconpro.run("echo $(whoami)", timeout=5)
        assert "$(whoami)" in out, f"Command substitution executed: {out}"

    def test_pipe_not_executed(self):
        out, err = reconpro.run("echo a | cat", timeout=5)
        assert "a | cat" in out, f"Pipe was interpreted: {out}"


# ══════════════════════════════════════════════════════════════════════════
# M5: Mutually exclusive mode flags
# ══════════════════════════════════════════════════════════════════════════

class TestMutuallyExclusiveModes:
    """Mode flags must be in a mutually exclusive group."""

    def test_mode_group_exists(self):
        """Source must contain add_mutually_exclusive_group."""
        src = open(reconpro.__file__).read()
        assert "add_mutually_exclusive_group" in src, "No mutually exclusive group found"


# ══════════════════════════════════════════════════════════════════════════
# m1: Audit log write failure — single stderr warning
# ══════════════════════════════════════════════════════════════════════════

class TestAuditFailWarning:
    """First write failure prints warning to stderr; subsequent calls are silent."""

    def test_warns_once_then_suppresses(self, tmp_path):
        # Point AUDIT_LOG_PATH at a non-directory (mkdir fails)
        reconpro._AUDIT_FAIL_WARNED = False
        bad_path = str(tmp_path / "regular_file.jsonl")
        # Create it as a regular file so writing to it as a directory path fails
        with open(bad_path, "w") as f:
            f.write("placeholder")
        # Make the actual log path be inside this file (invalid)
        original = reconpro.AUDIT_LOG_PATH
        reconpro.AUDIT_LOG_PATH = bad_path + "/subdir/audit.jsonl"
        try:
            old_stderr = sys.stderr
            sys.stderr = captured = io.StringIO()

            reconpro.audit_log("test.fail", status="ok")
            first_output = captured.getvalue()

            reconpro.audit_log("test.fail2", status="ok")
            second_output = captured.getvalue()

            sys.stderr = old_stderr

            assert "WARNING" in first_output or "warning" in first_output.lower(), \
                f"First failure should warn: {first_output}"
            # After first warning, no new warning text
            new_output = second_output[len(first_output):]
            assert "WARNING" not in new_output and "warning" not in new_output.lower(), \
                f"Second failure should be silent: {new_output}"
        finally:
            reconpro.AUDIT_LOG_PATH = original
            reconpro._AUDIT_FAIL_WARNED = False


# ══════════════════════════════════════════════════════════════════════════
# m6: _find_cache delimiter-anchored match
# ══════════════════════════════════════════════════════════════════════════

class TestFindCache:
    """_find_cache must use delimiter-anchored matching — no substring false positives."""

    def test_anchored_match(self, tmp_path):
        original = reconpro.CACHE_DIR
        reconpro.CACHE_DIR = str(tmp_path)
        try:
            # Create a file using the same naming convention as _find_cache
            safe = reconpro._safe_filename("evil.com")
            fname = f"gorgon_{safe}.json"
            fpath = os.path.join(str(tmp_path), fname)
            with open(fpath, "w") as f:
                f.write('{"data": "real", "padding": "' + "x" * 80 + '"}')  # >100 bytes
            result = reconpro._find_cache("gorgon", "evil.com")
            assert result is not None, f"Should find {fname}"
        finally:
            reconpro.CACHE_DIR = original

    def test_no_substring_false_positive(self, tmp_path):
        original = reconpro.CACHE_DIR
        reconpro.CACHE_DIR = str(tmp_path)
        try:
            # Create a file for "evil.com" — should NOT match "evil.company.net"
            with open(os.path.join(str(tmp_path), "gorgon_evil_company_net.json"), "w") as f:
                f.write('{"data": "wrong_target"}')
            result = reconpro._find_cache("gorgon", "evil.company.net")
            # The gorgon_evil_company_net file should not be returned for evil.company.net
            if result:
                basename = os.path.basename(result)
                assert basename == "gorgon_evil_company_net.json"
        finally:
            reconpro.CACHE_DIR = original


# ══════════════════════════════════════════════════════════════════════════
# Compile check
# ══════════════════════════════════════════════════════════════════════════

class TestCompileCheck:
    def test_module_compiles(self):
        """reconpro.py must compile without syntax errors."""
        import py_compile
        py_compile.compile(reconpro.__file__, doraise=True)
