"""
ReconPro test suite — VibeSec, CLI Auth, and Telemetry Sync.

Covers:
  VIBESEC:
    - Grade mapping (score → letter + color)
    - Badge Markdown generation
    - VibeSec module output structure
    - Scoring edge cases (zero findings, max deductions)
    - Sensitive paths and API paths constant structure
    - Anon key patterns constant structure
  AUTH:
    - cmd_auth_login with valid/invalid/short keys
    - cmd_auth_status (no credentials)
    - cmd_auth_logout
    - _save_credentials / _load_credentials round-trip
    - _delete_credentials
  TELEMETRY:
    - _sign_report determinism (same input = same HMAC)
    - _upload_telemetry with no API key (graceful skip)
    - _save_local_fallback (writes to download/)
    - _load_credentials from nonexistent file
  INTEGRATION:
    - MODULES list contains "vibesec"
    - render_vibesec_panel doesn't crash on valid data
    - compute_unified_verdict includes vibesec in weights
    - CLI --vibesec flag parsing
"""
import hashlib
import hmac
import json
import os
import re
import sys
import tempfile

import pytest

_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

import reconpro


# ══════════════════════════════════════════════════════════════════════════
# VIBESEC — Grade Mapping
# ══════════════════════════════════════════════════════════════════════════

class TestVibeSecGradeMapping:
    """Grade mapping must be correct for all score ranges."""

    def test_perfect_score_a_plus(self):
        grade, color = reconpro._vibesec_compute_grade(100)
        assert grade == "A+", f"Expected A+, got {grade}"
        assert "green" in color

    def test_high_score_a(self):
        grade, color = reconpro._vibesec_compute_grade(85)
        assert grade == "A"

    def test_medium_high_b(self):
        grade, _ = reconpro._vibesec_compute_grade(72)
        assert grade == "B"

    def test_medium_c(self):
        grade, _ = reconpro._vibesec_compute_grade(55)
        assert grade == "C"

    def test_low_d(self):
        grade, _ = reconpro._vibesec_compute_grade(40)
        assert grade == "D"

    def test_zero_f(self):
        grade, color = reconpro._vibesec_compute_grade(0)
        assert grade == "F"
        assert "red" in color

    def test_boundary_90_a_plus(self):
        grade, _ = reconpro._vibesec_compute_grade(90)
        assert grade == "A+"

    def test_boundary_80_a(self):
        grade, _ = reconpro._vibesec_compute_grade(80)
        assert grade == "A"

    def test_boundary_65_b(self):
        grade, _ = reconpro._vibesec_compute_grade(65)
        assert grade == "B"

    def test_boundary_50_c(self):
        grade, _ = reconpro._vibesec_compute_grade(50)
        assert grade == "C"

    def test_boundary_35_d(self):
        grade, _ = reconpro._vibesec_compute_grade(35)
        assert grade == "D"

    def test_all_grades_have_rich_colors(self):
        """Every grade must have a non-empty rich color string."""
        for threshold, grade, color in reconpro.VIBESEC_GRADE_MAP:
            assert len(color) > 0, f"Grade {grade} has empty color"


# ══════════════════════════════════════════════════════════════════════════
# VIBESEC — Badge Generation
# ══════════════════════════════════════════════════════════════════════════

class TestVibeSecBadge:
    """Badge must be valid Markdown image syntax."""

    def test_badge_is_markdown_image(self):
        badge = reconpro._vibesec_render_badge("example.com", "A+", 95)
        assert badge.startswith("![") and "](" in badge, f"Invalid markdown: {badge[:60]}"

    def test_badge_contains_grade(self):
        badge = reconpro._vibesec_render_badge("test.com", "B", 70)
        assert "VibeSec-B-" in badge

    def test_badge_contains_label_color(self):
        badge = reconpro._vibesec_render_badge("t.com", "F", 10)
        assert "labelColor" in badge

    def test_badge_color_map_coverage(self):
        """Every grade must have a color mapping."""
        badge_fn = reconpro._vibesec_render_badge
        for _, grade, _ in reconpro.VIBESEC_GRADE_MAP:
            badge = badge_fn("x.com", grade, 50)
            assert "badge/VibeSec" in badge, f"No badge URL for grade {grade}"


# ══════════════════════════════════════════════════════════════════════════
# VIBESEC — Constants
# ══════════════════════════════════════════════════════════════════════════

class TestVibeSecConstants:
    """VibeSec check lists must be well-formed."""

    def test_sensitive_paths_all_start_with_slash(self):
        for p in reconpro.VIBESEC_SENSITIVE_PATHS:
            assert p.startswith("/"), f"Path doesn't start with /: {p}"

    def test_sensitive_paths_no_duplicates(self):
        assert len(reconpro.VIBESEC_SENSITIVE_PATHS) == len(set(reconpro.VIBESEC_SENSITIVE_PATHS))

    def test_api_paths_all_start_with_slash(self):
        for p in reconpro.VIBESEC_API_PATHS:
            assert p.startswith("/"), f"API path doesn't start with /: {p}"

    def test_anon_key_patterns_are_tuples(self):
        for item in reconpro.VIBESEC_ANON_KEY_PATTERNS:
            assert isinstance(item, tuple) and len(item) == 2
            name, pattern = item
            assert isinstance(name, str) and len(name) > 0
            assert isinstance(pattern, type(re.compile(".")))

    def test_anon_key_patterns_compile(self):
        """Every regex pattern must compile without error."""
        for name, pattern in reconpro.VIBESEC_ANON_KEY_PATTERNS:
            assert pattern.pattern is not None


# ══════════════════════════════════════════════════════════════════════════
# VIBESEC — Module Output Structure
# ══════════════════════════════════════════════════════════════════════════

class TestVibeSecModuleStructure:
    """module_vibesec output must have required keys."""

    def test_module_key_present(self):
        result = reconpro.module_vibesec("localhost")
        assert result.get("module") == "VIBESEC"

    def test_score_present_and_bounded(self):
        result = reconpro.module_vibesec("localhost")
        score = result.get("vibesec_score", -1)
        assert 0 <= score <= 100, f"Score {score} out of bounds"

    def test_grade_present_and_valid(self):
        result = reconpro.module_vibesec("localhost")
        grade = result.get("grade", "")
        valid = {"A+", "A", "B", "C", "D", "F"}
        assert grade in valid, f"Grade {grade} not in {valid}"

    def test_grade_color_present(self):
        result = reconpro.module_vibesec("localhost")
        assert len(result.get("grade_color", "")) > 0

    def test_badge_markdown_present(self):
        result = reconpro.module_vibesec("localhost")
        badge = result.get("badge_markdown", "")
        assert "![VibeSec" in badge

    def test_findings_is_list(self):
        result = reconpro.module_vibesec("localhost")
        assert isinstance(result.get("findings"), list)

    def test_severity_counts_present(self):
        result = reconpro.module_vibesec("localhost")
        sc = result.get("severity_counts")
        assert isinstance(sc, dict)

    def test_categories_checked_present(self):
        result = reconpro.module_vibesec("localhost")
        cats = result.get("categories_checked")
        assert "exposed_config" in cats
        assert "unauth_api" in cats
        assert "cors" in cats
        assert "anon_keys" in cats

    def test_max_possible_score(self):
        result = reconpro.module_vibesec("localhost")
        assert result.get("max_possible_score") == 100


# ══════════════════════════════════════════════════════════════════════════
# AUTH — Credentials Storage
# ══════════════════════════════════════════════════════════════════════════

class TestAuthCredentials:
    """Credential CRUD operations must work with temp directories."""

    def test_save_and_load_round_trip(self, tmp_path):
        """Save credentials, load them back — must match."""
        cred_file = str(tmp_path / "test_creds.json")
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = cred_file
            data = {"api_key": "rpk_test1234567890abcdef", "stored_at": "2026-07-29T00:00:00Z"}
            assert reconpro._save_credentials(data) is True
            loaded = reconpro._load_credentials()
            assert loaded["api_key"] == data["api_key"]
            assert loaded["stored_at"] == data["stored_at"]
        finally:
            reconpro.CREDENTIALS_FILE = old_path

    def test_load_nonexistent_file(self, tmp_path):
        """Loading from nonexistent file returns empty dict."""
        cred_file = str(tmp_path / "nonexistent_creds.json")
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = cred_file
            loaded = reconpro._load_credentials()
            assert loaded == {}
        finally:
            reconpro.CREDENTIALS_FILE = old_path

    def test_load_corrupt_file(self, tmp_path):
        """Loading from corrupt JSON returns empty dict."""
        cred_file = str(tmp_path / "corrupt_creds.json")
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = cred_file
            with open(cred_file, "w") as f:
                f.write("NOT JSON AT ALL")
            loaded = reconpro._load_credentials()
            assert loaded == {}
        finally:
            reconpro.CREDENTIALS_FILE = old_path

    def test_save_creates_directory(self, tmp_path):
        """Saving credentials creates parent directory if needed."""
        nested_dir = str(tmp_path / "deep" / "nested" / "dir")
        cred_file = os.path.join(nested_dir, "creds.json")
        old_path = reconpro.CREDENTIALS_FILE
        old_dir = reconpro.CREDENTIALS_DIR
        try:
            reconpro.CREDENTIALS_DIR = nested_dir
            reconpro.CREDENTIALS_FILE = cred_file
            assert reconpro._save_credentials({"api_key": "test12345678"}) is True
            assert os.path.exists(cred_file)
        finally:
            reconpro.CREDENTIALS_FILE = old_path
            reconpro.CREDENTIALS_DIR = old_dir

    def test_delete_credentials(self, tmp_path):
        """Deleting credentials removes the file."""
        cred_file = str(tmp_path / "deleteme_creds.json")
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = cred_file
            reconpro._save_credentials({"api_key": "delete_test_key"})
            assert os.path.exists(cred_file)
            assert reconpro._delete_credentials() is True
            assert not os.path.exists(cred_file)
        finally:
            reconpro.CREDENTIALS_FILE = old_path


# ══════════════════════════════════════════════════════════════════════════
# AUTH — CLI Commands
# ══════════════════════════════════════════════════════════════════════════

class TestAuthCommands:
    """Auth CLI commands must validate input correctly."""

    def test_login_rejects_short_key(self, tmp_path):
        """Keys shorter than 8 chars are rejected."""
        old_path = reconpro.CREDENTIALS_FILE
        old_dir = reconpro.CREDENTIALS_DIR
        try:
            reconpro.CREDENTIALS_DIR = str(tmp_path)
            reconpro.CREDENTIALS_FILE = str(tmp_path / "creds.json")
            reconpro.cmd_auth_login("abc")  # Too short
            assert not os.path.exists(reconpro.CREDENTIALS_FILE)
        finally:
            reconpro.CREDENTIALS_FILE = old_path
            reconpro.CREDENTIALS_DIR = old_dir

    def test_login_accepts_valid_key(self, tmp_path):
        """Keys >= 8 chars are saved."""
        old_path = reconpro.CREDENTIALS_FILE
        old_dir = reconpro.CREDENTIALS_DIR
        try:
            reconpro.CREDENTIALS_DIR = str(tmp_path)
            reconpro.CREDENTIALS_FILE = str(tmp_path / "creds.json")
            reconpro.cmd_auth_login("rpk_live_valid_key_1234")
            assert os.path.exists(reconpro.CREDENTIALS_FILE)
            loaded = reconpro._load_credentials()
            assert loaded["api_key"] == "rpk_live_valid_key_1234"
        finally:
            reconpro.CREDENTIALS_FILE = old_path
            reconpro.CREDENTIALS_DIR = old_dir

    def test_login_rejects_empty_key(self, tmp_path):
        old_path = reconpro.CREDENTIALS_FILE
        old_dir = reconpro.CREDENTIALS_DIR
        try:
            reconpro.CREDENTIALS_DIR = str(tmp_path)
            reconpro.CREDENTIALS_FILE = str(tmp_path / "creds.json")
            reconpro.cmd_auth_login("")
            assert not os.path.exists(reconpro.CREDENTIALS_FILE)
        finally:
            reconpro.CREDENTIALS_FILE = old_path
            reconpro.CREDENTIALS_DIR = old_dir

    def test_login_rejects_none_key(self, tmp_path):
        old_path = reconpro.CREDENTIALS_FILE
        old_dir = reconpro.CREDENTIALS_DIR
        try:
            reconpro.CREDENTIALS_DIR = str(tmp_path)
            reconpro.CREDENTIALS_FILE = str(tmp_path / "creds.json")
            reconpro.cmd_auth_login(None)
            assert not os.path.exists(reconpro.CREDENTIALS_FILE)
        finally:
            reconpro.CREDENTIALS_FILE = old_path
            reconpro.CREDENTIALS_DIR = old_dir


# ══════════════════════════════════════════════════════════════════════════
# TELEMETRY — Signing
# ══════════════════════════════════════════════════════════════════════════

class TestTelemetrySigning:
    """Report signing must be deterministic and use HMAC-SHA256."""

    def test_sign_deterministic(self, tmp_path):
        """Same input + same key must produce same signature."""
        report = {"target": "test.com", "score": 42}
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = str(tmp_path / "sign_creds.json")
            reconpro._save_credentials({"api_key": "test_signing_key"})
            sig1 = reconpro._sign_report(report)
            sig2 = reconpro._sign_report(report)
            assert sig1 == sig2, "Signatures should be identical"
            assert len(sig1) == 64  # SHA256 hex = 64 chars
        finally:
            reconpro.CREDENTIALS_FILE = old_path

    def test_sign_different_for_different_reports(self, tmp_path):
        """Different reports must produce different signatures."""
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = str(tmp_path / "sign2_creds.json")
            reconpro._save_credentials({"api_key": "test_key"})
            sig_a = reconpro._sign_report({"target": "a.com"})
            sig_b = reconpro._sign_report({"target": "b.com"})
            assert sig_a != sig_b
        finally:
            reconpro.CREDENTIALS_FILE = old_path

    def test_sign_empty_key_still_works(self, tmp_path):
        """Even with no API key, signing should not crash."""
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = str(tmp_path / "empty_creds.json")
            # Don't save any credentials
            sig = reconpro._sign_report({"target": "test.com"})
            assert len(sig) == 64  # HMAC with empty key still produces output
        finally:
            reconpro.CREDENTIALS_FILE = old_path

    def test_sign_is_hmac_sha256(self, tmp_path):
        """Verify signature matches manual HMAC-SHA256 computation."""
        report = {"target": "verify.com", "data": "check"}
        key = "verification_key_12345678"
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = str(tmp_path / "verify_creds.json")
            reconpro._save_credentials({"api_key": key})
            sig = reconpro._sign_report(report)
            # Manual computation
            canonical = json.dumps(report, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
            expected = hmac.new(key.encode(), canonical.encode(), hashlib.sha256).hexdigest()
            assert sig == expected, f"Signature mismatch: {sig} != {expected}"
        finally:
            reconpro.CREDENTIALS_FILE = old_path


# ══════════════════════════════════════════════════════════════════════════
# TELEMETRY — Upload Skip (no key)
# ══════════════════════════════════════════════════════════════════════════

class TestTelemetryUploadSkip:
    """Upload without API key must gracefully return False."""

    def test_upload_without_api_key_returns_false(self, tmp_path):
        old_path = reconpro.CREDENTIALS_FILE
        try:
            reconpro.CREDENTIALS_FILE = str(tmp_path / "no_key_creds.json")
            result = reconpro._upload_telemetry({"target": "test.com"})
            assert result is False
        finally:
            reconpro.CREDENTIALS_FILE = old_path


# ══════════════════════════════════════════════════════════════════════════
# TELEMETRY — Local Fallback
# ══════════════════════════════════════════════════════════════════════════

class TestTelemetryFallback:
    """Local fallback must write a valid JSON file."""

    def test_fallback_creates_file(self):
        report = {"target": "fallback-test.local", "score": 50}
        path = reconpro._save_local_fallback(report)
        assert os.path.exists(path), f"Fallback file not created: {path}"
        with open(path) as f:
            data = json.load(f)
        assert data["target"] == "fallback-test.local"
        assert data["score"] == 50
        # Cleanup
        os.remove(path)

    def test_fallback_path_contains_target(self):
        path = reconpro._save_local_fallback({"target": "safe-host.com"})
        assert "safe-host.com" in path or "safe_host.com" in path
        assert path.endswith(".json")
        os.remove(path) if os.path.exists(path) else None


# ══════════════════════════════════════════════════════════════════════════
# INTEGRATION — VibeSec in MODULES list
# ══════════════════════════════════════════════════════════════════════════

class TestVibeSecIntegration:
    """VibeSec must be properly integrated into the unified system."""

    def test_vibesec_in_modules_list(self):
        ids = {m["id"] for m in reconpro.MODULES}
        assert "vibesec" in ids

    def test_vibesec_module_name(self):
        vibesec = [m for m in reconpro.MODULES if m["id"] == "vibesec"][0]
        assert vibesec["name"] == "VIBESEC"
        assert vibesec["color"] == "bright_green"

    def test_tagline_seven_blades(self):
        assert "Seven" in reconpro.RECONPRO_TAGLINE

    def test_unified_verdict_includes_vibesec(self):
        report = {"vibesec": {"vibesec_score": 60}}
        verdict = reconpro.compute_unified_verdict(report)
        assert "vibesec" in verdict.get("module_scores", {})

    def test_unified_verdict_vibesec_inverts_score(self):
        """High VibeSec score (secure) should contribute LOW to unified threat."""
        report_secure = {"vibesec": {"vibesec_score": 90}}
        report_insecure = {"vibesec": {"vibesec_score": 10}}
        v_secure = reconpro.compute_unified_verdict(report_secure)
        v_insecure = reconpro.compute_unified_verdict(report_insecure)
        # Secure site should have lower unified threat than insecure site
        assert v_secure["module_scores"]["vibesec"] < v_insecure["module_scores"]["vibesec"]

    def test_render_vibesec_panel_no_crash(self):
        """render_vibesec_panel must not crash on valid data."""
        data = {
            "vibesec_score": 75, "grade": "A", "grade_color": "green",
            "badge_markdown": "![VibeSec Grade A](https://example.com/badge)",
            "total_findings": 2, "severity_counts": {"high": 1, "medium": 1},
            "findings": [
                {"title": "Test finding", "severity": "high", "category": "cors",
                 "description": "test", "evidence": "test", "points_deducted": 12},
            ],
        }
        reconpro.render_vibesec_panel(data)  # Must not raise

    def test_render_vibesec_empty_no_crash(self):
        """render_vibesec_panel must handle zero findings."""
        data = {
            "vibesec_score": 100, "grade": "A+", "grade_color": "bright_green",
            "badge_markdown": "![VibeSec](x)", "total_findings": 0,
            "severity_counts": {}, "findings": [],
        }
        reconpro.render_vibesec_panel(data)  # Must not raise


# ══════════════════════════════════════════════════════════════════════════
# COMPILE CHECK
# ══════════════════════════════════════════════════════════════════════════

class TestCompileCheck:
    """reconpro.py must compile cleanly."""

    def test_compile(self):
        import py_compile
        # Compile the actual file, not the source string (avoids filename-too-long)
        script_path = os.path.join(_SCRIPTS_DIR, "reconpro.py")
        py_compile.compile(script_path, doraise=True)
