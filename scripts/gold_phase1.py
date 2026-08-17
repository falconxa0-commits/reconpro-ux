#!/usr/bin/env python3
"""GOLD CERTIFICATION — Phase 1: Multi-Python Fresh Install Test.

Creates 3 fresh venvs (Python 3.10, 3.11, 3.12) and installs ONLY from the wheel.
Tests --version, --help, import integrity on each.
"""
import subprocess, json, time, os, sys
from pathlib import Path

WHL = "/home/z/my-project/reconpro-work/dist/reconpro-11.0.0-py3-none-any.whl"
BASE = "/home/z/my-project"
PYTHON_EXES = {
    "3.10": "/home/z/.local/share/uv/python/cpython-3.10.20-linux-x86_64-gnu/bin/python3.10",
    "3.11": "/home/z/.local/share/uv/python/cpython-3.11.15-linux-x86_64-gnu/bin/python3.11",
    "3.12": "/home/z/.local/share/uv/python/cpython-3.12.13-linux-x86_64-gnu/bin/python3.12",
}

results = {}

print("=" * 70)
print("GOLD CERTIFICATION — Phase 1: Multi-Python Fresh Install")
print("=" * 70)

for ver, pyexe in PYTHON_EXES.items():
    venv_dir = f"{BASE}/gold-venv-py{ver}"
    pip_exe = f"{venv_dir}/bin/pip"
    reconpro_exe = f"{venv_dir}/bin/reconpro"
    python_exe = f"{venv_dir}/bin/python"
    
    print(f"\n{'─'*60}")
    print(f"  Python {ver}")
    print(f"{'─'*60}")
    
    r = {"version": ver, "tests": []}
    
    # Verify Python exists
    try:
        pver = subprocess.run([pyexe, "--version"], capture_output=True, text=True, timeout=10)
        print(f"  Python: {pver.stdout.strip()}")
        r["python_version"] = pver.stdout.strip()
    except Exception as e:
        print(f"  ❌ Python {ver} not available: {e}")
        r["error"] = str(e)
        results[ver] = r
        continue
    
    # Create fresh venv
    print(f"  Creating venv: {venv_dir}...")
    try:
        subprocess.run([pyexe, "-m", "venv", venv_dir], check=True, capture_output=True, timeout=30)
        # Remove any existing install
        subprocess.run([pip_exe, "uninstall", "reconpro", "-y"], capture_output=True, timeout=15)
    except subprocess.CalledProcessError as e:
        print(f"  ❌ venv creation failed: {e}")
        r["error"] = f"venv creation: {e}"
        results[ver] = r
        continue
    
    # Install ONLY from wheel
    print(f"  Installing from wheel...")
    t0 = time.monotonic()
    try:
        install = subprocess.run(
            [pip_exe, "install", WHL, "--quiet"],
            capture_output=True, text=True, timeout=120
        )
        install_time = time.monotonic() - t0
        if install.returncode != 0:
            print(f"  ❌ Install failed (rc={install.returncode}):")
            print(f"     {install.stderr[:300]}")
            r["install_error"] = install.stderr[:500]
            results[ver] = r
            continue
        print(f"  ✅ Install success in {install_time:.1f}s")
        r["install_time_s"] = round(install_time, 2)
    except subprocess.TimeoutExpired:
        print(f"  ❌ Install timed out")
        r["install_error"] = "timeout"
        results[ver] = r
        continue
    
    # Test --version
    try:
        ver_out = subprocess.run([reconpro_exe, "--version"], capture_output=True, text=True, timeout=15)
        if ver_out.returncode == 0 and "11.0.0" in ver_out.stdout:
            print(f"  ✅ --version: {ver_out.stdout.strip()}")
            r["tests"].append({"name": "--version", "pass": True, "output": ver_out.stdout.strip()})
        else:
            print(f"  ❌ --version failed (rc={ver_out.returncode}): {ver_out.stdout[:100]} {ver_out.stderr[:100]}")
            r["tests"].append({"name": "--version", "pass": False, "error": f"rc={ver_out.returncode}"})
    except Exception as e:
        print(f"  ❌ --version error: {e}")
        r["tests"].append({"name": "--version", "pass": False, "error": str(e)})
    
    # Test --help
    try:
        help_out = subprocess.run([reconpro_exe, "--help"], capture_output=True, text=True, timeout=15)
        if help_out.returncode == 0 and "scan" in help_out.stdout:
            cmd_count = help_out.stdout.count("subparser") if "subparser" in help_out.stdout else len([l for l in help_out.stdout.split("\n") if l.strip().startswith("scan") or l.strip().startswith("vibesec")])
            print(f"  ✅ --help: OK ({len(help_out.stdout)} bytes)")
            r["tests"].append({"name": "--help", "pass": True, "output_size": len(help_out.stdout)})
        else:
            print(f"  ❌ --help failed (rc={help_out.returncode})")
            r["tests"].append({"name": "--help", "pass": False})
    except Exception as e:
        print(f"  ❌ --help error: {e}")
        r["tests"].append({"name": "--help", "pass": False, "error": str(e)})
    
    # Import integrity test
    import_code = """
import reconpro
assert reconpro.__version__ == "11.0.0", f"Version mismatch: {reconpro.__version__}"
from reconpro.engine import scan, audit_scan
from reconpro.scanner import ReconProResult, MODULE_REGISTRY, ALL_MODULES, LOCAL_MODULES
from reconpro.cli import main
from reconpro.constants import SEV_COLORS, GRADE_COLORS
from reconpro.history import list_scans
from reconpro.reports import generate_html_report, generate_production_report
from reconpro.parallel import blitz_scan
from reconpro.theme import Theme
from reconpro.loading import LoadingAnimation, ProgressTimeline, ScoreReveal
from reconpro.registry import visualize_dependencies, MODULE_DEPENDENCIES
from reconpro.engineering_workflow import ContinuousEngineeringOrchestrator, EngineeringCycleResult
from reconpro.ratings import ModuleRating
from reconpro.wishes import WishesOrchestrator
from reconpro.plugins import HookManager
from reconpro.context import ScanContext
from reconpro.attack_graph import AttackGraphEngine
from reconpro.intelligence_pipeline import IntelligencePipeline
from reconpro.quality_intelligence import QualityIntelligence
from reconpro.regression_intelligence import RegressionIntelligence
from reconpro.auto_validation import ValidationPipeline
from reconpro.benchmark_automation import BenchmarkAutomation
from reconpro.digital_twin import DigitalTwin
from reconpro.repository_memory import RepositoryMemory
from reconpro.auto_fix import AutoFixEngine
from reconpro.engineering_recommendations import EngineeringRecommender
from reconpro.telemetry import TelemetryManager
from reconpro.geoip import GeoIPLookup
from reconpro.threat_feeds import ThreatFeedManager
from reconpro.supply_chain import SupplyChainAnalyzer
from reconpro.cross_validator import CrossValidator
from reconpro.attribution import AttributionEngine
from reconpro.tunnel_detect import TunnelDetector
from reconpro.auto_engineering import EngineeringPipeline
from reconpro.connection_pool import ConnectionPool
from reconpro.prompt_defense import PromptDefense
from reconpro.repository_learning import RepositoryLearner
from reconpro.command_palette import CommandPalette
from reconpro.workspace import WorkspaceManager
from reconpro.notifications import NotificationCenter
from reconpro.ai_copilot import AICopilot
from reconpro.session import SessionManager
print(f"ALL_IMPORTS_OK ver={reconpro.__version__} modules={len(ALL_MODULES)} registry={len(MODULE_REGISTRY)}")
"""
    try:
        imp_out = subprocess.run(
            [python_exe, "-c", import_code],
            capture_output=True, text=True, timeout=30
        )
        if imp_out.returncode == 0 and "ALL_IMPORTS_OK" in imp_out.stdout:
            print(f"  ✅ Import integrity: {imp_out.stdout.strip()}")
            r["tests"].append({"name": "import_integrity", "pass": True, "output": imp_out.stdout.strip()})
        else:
            err = imp_out.stderr[:300] if imp_out.stderr else imp_out.stdout[:300]
            print(f"  ❌ Import failed: {err}")
            r["tests"].append({"name": "import_integrity", "pass": False, "error": err})
    except subprocess.TimeoutExpired:
        print(f"  ⏰ Import test timed out")
        r["tests"].append({"name": "import_integrity", "pass": False, "error": "timeout"})
    except Exception as e:
        print(f"  ❌ Import error: {e}")
        r["tests"].append({"name": "import_integrity", "pass": False, "error": str(e)})
    
    # Test list command (basic execution)
    try:
        list_out = subprocess.run([reconpro_exe, "list", "--all"], capture_output=True, text=True, timeout=15)
        if list_out.returncode == 0 and "recon" in list_out.stdout:
            print(f"  ✅ list --all: OK")
            r["tests"].append({"name": "list_all", "pass": True})
        else:
            print(f"  ❌ list --all failed (rc={list_out.returncode})")
            r["tests"].append({"name": "list_all", "pass": False, "error": list_out.stderr[:200]})
    except Exception as e:
        r["tests"].append({"name": "list_all", "pass": False, "error": str(e)})
    
    results[ver] = r

# Summary
print(f"\n{'='*70}")
print("PHASE 1 SUMMARY")
print(f"{'='*70}")
all_pass = True
for ver, r in results.items():
    tests = r.get("tests", [])
    passed = sum(1 for t in tests if t.get("pass"))
    total = len(tests)
    status = "✅ PASS" if passed == total else f"❌ {passed}/{total}"
    if passed < total:
        all_pass = False
    print(f"  Python {ver}: {status}")
    for t in tests:
        mark = "✅" if t.get("pass") else "❌"
        print(f"    {mark} {t['name']}")

if all_pass:
    print(f"\n  🏆 GOLD PHASE 1: ALL PYTHON VERSIONS PASS")
else:
    print(f"\n  ⚠️  PHASE 1: ISSUES FOUND — must fix before proceeding")

with open(f"{BASE}/download/gold_phase1_results.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\n  Results saved: gold_phase1_results.json")
