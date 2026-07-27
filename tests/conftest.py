"""
Shared fixtures for ReconPro test suite.
"""
import os
import sys
import json
import tempfile

import pytest

# Ensure the reconpro module is importable
_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)


@pytest.fixture
def tmp_cache_dir(tmp_path):
    """Provide an isolated CACHE_DIR that won't touch real download/."""
    return str(tmp_path)


@pytest.fixture
def audit_log_path(tmp_path):
    """Provide a temporary audit log file path."""
    return str(tmp_path / "test_audit.jsonl")
