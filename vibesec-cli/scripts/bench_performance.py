#!/usr/bin/env python3
"""ReconPro v10.0.0 — Performance Benchmark Suite.

Council Alpha: Performance Engineering

Runs comprehensive benchmarks across all subsystems:
A. Startup Time          (subprocess cold import, 5 runs)
B. Module Import Time    (per-module import timing, 3 runs each)
C. CLI Startup            (subprocess --version, 5 runs)
D. Scan Pipeline          (audit_scan localhost, 3 runs)
E. Intelligence Pipeline  (process_result mock data, 5 runs)
F. Agent Runtime          (run_goal audit localhost, 3 runs)
G. Evidence Correlation   (correlate 100 mock findings, 5 runs)
H. Executive Intelligence (generate with mock data, 5 runs)
I. Memory Operations      (add/get/findings, 5 runs)
J. GoalParser             (parse 10 goals, 3 runs each)
K. Memory Footprint       (tracemalloc during scan pipeline)
L. Thread Safety          (3 concurrent orchestrators)

All timing via time.perf_counter. Results are real, never fabricated.
"""

from __future__ import annotations

import gc
import importlib
import json
import os
import statistics
import subprocess
import sys
import tempfile
import threading
import time
import tracemalloc
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Timing helpers ─────────────────────────────────────────────────────

def run_timed(fn, runs: int = 5, warmup: int = 1) -> Dict[str, Any]:
    """Run fn multiple times, return timing stats in milliseconds."""
    # Warmup
    for _ in range(warmup):
        try:
            fn()
        except Exception:
            pass

    times_ms: List[float] = []
    for _ in range(runs):
        gc.collect()
        t0 = time.perf_counter()
        try:
            result = fn()
        except Exception as exc:
            print(f"  [!] Exception: {exc}")
            times_ms.append(float("nan"))
            continue
        elapsed = (time.perf_counter() - t0) * 1000.0
        times_ms.append(elapsed)

    valid = [t for t in times_ms if t == t]  # filter NaN
    if not valid:
        return {"runs": runs, "valid_runs": 0, "min_ms": None, "max_ms": None,
                "avg_ms": None, "stdev_ms": None, "p50_ms": None,
                "p95_ms": None, "p99_ms": None, "raw_ms": times_ms,
                "error": "all runs failed"}

    valid.sort()
    return {
        "runs": runs,
        "valid_runs": len(valid),
        "min_ms": round(valid[0], 4),
        "max_ms": round(valid[-1], 4),
        "avg_ms": round(statistics.mean(valid), 4),
        "stdev_ms": round(statistics.stdev(valid), 4) if len(valid) > 1 else 0.0,
        "p50_ms": round(valid[len(valid) // 2], 4),
        "p95_ms": round(valid[int(len(valid) * 0.95)] if len(valid) >= 2 else valid[-1], 4),
        "p99_ms": round(valid[-1], 4),
        "raw_ms": [round(t, 4) for t in valid],
    }


def run_subprocess_timed(cmd: List[str], runs: int = 5) -> Dict[str, Any]:
    """Run a subprocess command multiple times, return timing stats."""
    times_ms: List[float] = []
    errors: List[str] = []

    for _ in range(runs):
        t0 = time.perf_counter()
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30,
                cwd=str(PROJECT_ROOT), env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
        except subprocess.TimeoutExpired:
            errors.append("timeout")
            times_ms.append(float("nan"))
            continue
        except Exception as exc:
            errors.append(str(exc))
            times_ms.append(float("nan"))
            continue
        elapsed = (time.perf_counter() - t0) * 1000.0
        times_ms.append(elapsed)

    valid = [t for t in times_ms if t == t]
    if not valid:
        return {"runs": runs, "valid_runs": 0, "min_ms": None, "max_ms": None,
                "avg_ms": None, "stdev_ms": None, "p50_ms": None,
                "p95_ms": None, "p99_ms": None, "raw_ms": times_ms,
                "errors": errors}

    valid.sort()
    return {
        "runs": runs,
        "valid_runs": len(valid),
        "min_ms": round(valid[0], 4),
        "max_ms": round(valid[-1], 4),
        "avg_ms": round(statistics.mean(valid), 4),
        "stdev_ms": round(statistics.stdev(valid), 4) if len(valid) > 1 else 0.0,
        "p50_ms": round(valid[len(valid) // 2], 4),
        "p95_ms": round(valid[int(len(valid) * 0.95)] if len(valid) >= 2 else valid[-1], 4),
        "p99_ms": round(valid[-1], 4),
        "raw_ms": [round(t, 4) for t in valid],
    }


# ── Mock data factories ────────────────────────────────────────────────

def make_mock_findings(count: int = 100) -> List[Dict[str, Any]]:
    """Generate realistic mock findings for benchmarking."""
    severities = ["critical", "high", "medium", "low", "info"]
    categories = ["injection", "xss", "headers", "ssl", "auth", "misconfiguration",
                  "info_disclosure", "secrets", "crypto", "container", "network"]
    modules = ["recon", "auth", "chain", "oblivion", "gorgon", "bot", "vibesec", "nhi"]
    targets = ["example.com", "api.example.com", "192.168.1.1", "test.local"]

    findings = []
    for i in range(count):
        findings.append({
            "title": f"Benchmark Finding #{i}: Security issue detected",
            "category": categories[i % len(categories)],
            "severity": severities[i % len(severities)],
            "target": targets[i % len(targets)],
            "evidence": f"Evidence string for finding {i}. HTTP response 200 OK. "
                        f"Headers: Content-Type: text/html. Body: <html>...</html>",
            "description": f"Detailed description of finding {i}. This issue was "
                          f"identified during automated scanning of the target.",
            "module": modules[i % len(modules)],
            "points_deducted": [25, 15, 10, 5, 0][i % 5],
            "confidence": 0.5 + (i % 10) * 0.05,
        })
    return findings


def make_mock_scan_result(findings: Optional[List[Dict]] = None) -> Any:
    """Create a mock ReconProResult for pipeline benchmarks."""
    if findings is None:
        findings = make_mock_findings(50)

    from reconpro.scanner import ReconProResult
    sev_counts: Dict[str, int] = {}
    total_ded = 0
    for f in findings:
        s = f.get("severity", "info")
        sev_counts[s] = sev_counts.get(s, 0) + 1
        total_ded += f.get("points_deducted", 0)
    score = max(0, 100 - total_ded)

    return ReconProResult(
        target="example.com",
        modules_run=["recon", "auth", "chain", "oblivion"],
        findings=findings,
        severity_counts=sev_counts,
        total_score=score,
        grade="A" if score >= 90 else "B" if score >= 80 else "C",
        badge_markdown=f"![Grade](https://img.shields.io/badge/grade-{score}-blue)",
        module_results={},
    )


# ── Benchmarks ──────────────────────────────────────────────────────────

results: Dict[str, Any] = {
    "meta": {
        "version": "10.0.0",
        "council": "Council Alpha — Performance Engineering",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "python_version": sys.version,
        "platform": sys.platform,
    },
    "benchmarks": {},
}


def bench_a_startup_time():
    """A. Startup Time: `import reconpro` via subprocess (5 runs)."""
    print("\n[bench A] Startup Time (import reconpro) — 5 subprocess runs")
    cmd = [sys.executable, "-c", "import reconpro; print('OK')"]
    r = run_subprocess_timed(cmd, runs=5)
    results["benchmarks"]["A_startup_time"] = r
    print(f"  avg={r['avg_ms']}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_b_module_imports():
    """B. Module Import Time: Time each intelligence/autonomous module import."""
    print("\n[bench B] Module Import Times — 15 modules, 3 runs each")
    modules_to_test = [
        "reconpro.intelligence_pipeline",
        "reconpro.evidence_correlation",
        "reconpro.executive_intelligence",
        "reconpro.agent_runtime",
        "reconpro.autonomous_planner",
        "reconpro.confidence_engine",
        "reconpro.target_intelligence",
        "reconpro.engineering_score",
        "reconpro.recommendation_engine",
        "reconpro.decision_engine",
        "reconpro.learning_system",
        "reconpro.prompt_defense",
        "reconpro.security_audit",
        "reconpro.auto_validation",
        "reconpro.memory",
    ]

    module_results: Dict[str, Any] = {}
    for mod_name in modules_to_test:
        # Pre-remove from sys.modules to force fresh import
        sys.modules.pop(mod_name, None)
        # Also remove parent packages that might cache
        parts = mod_name.split(".")
        for i in range(len(parts), 1, -1):
            sys.modules.pop(".".join(parts[:i]), None)

        def import_fn(name=mod_name):
            sys.modules.pop(name, None)
            return importlib.import_module(name)

        r = run_timed(import_fn, runs=3, warmup=0)
        module_results[mod_name] = r
        avg = r["avg_ms"] if r["avg_ms"] is not None else "ERR"
        print(f"  {mod_name}: avg={avg}ms")

    results["benchmarks"]["B_module_imports"] = module_results
    return module_results


def bench_c_cli_startup():
    """C. CLI Startup: `python -m reconpro.cli --version` (5 runs)."""
    print("\n[bench C] CLI Startup (--version) — 5 subprocess runs")
    cmd = [sys.executable, "-m", "reconpro.cli", "--version"]
    r = run_subprocess_timed(cmd, runs=5)
    results["benchmarks"]["C_cli_startup"] = r
    print(f"  avg={r['avg_ms']}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_d_scan_pipeline():
    """D. Scan Pipeline: audit_scan localhost, modules=[host] (3 runs)."""
    print("\n[bench D] Scan Pipeline (audit_scan localhost host) — 3 runs")
    from reconpro.scanner import audit_scan

    def scan_fn():
        # Use a temp dir to avoid writing to home
        return audit_scan(target=".", modules=["host"])

    r = run_timed(scan_fn, runs=3, warmup=0)
    results["benchmarks"]["D_scan_pipeline_host"] = r
    print(f"  avg={r['avg_ms']}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_e_intelligence_pipeline():
    """E. Intelligence Pipeline: process_result with mock data (5 runs)."""
    print("\n[bench E] Intelligence Pipeline (process_result) — 5 runs")
    from reconpro.intelligence_pipeline import IntelligencePipeline

    mock_result = make_mock_scan_result(make_mock_findings(50))
    pipeline = IntelligencePipeline()

    def pipeline_fn():
        # Create fresh memory store each time to avoid accumulation
        nonlocal pipeline
        pipeline = IntelligencePipeline()
        return pipeline.process_result(mock_result)

    r = run_timed(pipeline_fn, runs=5, warmup=1)
    results["benchmarks"]["E_intelligence_pipeline"] = r
    print(f"  avg={r['avg_ms']}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_f_agent_runtime():
    """F. Agent Runtime: AgentOrchestrator.run_goal('audit', 'localhost') (3 runs).

    NOTE: This benchmark runs the full agent pipeline including a local scan.
    Expected to be slow (seconds). We measure real wall time.
    """
    print("\n[bench F] Agent Runtime (run_goal audit localhost) — 3 runs")
    print("  [!] This runs a real local scan — expect several seconds per run")
    from reconpro.agent_runtime import AgentOrchestrator

    def agent_fn():
        orch = AgentOrchestrator()
        return orch.run_goal("audit localhost", ".")

    r = run_timed(agent_fn, runs=3, warmup=0)
    results["benchmarks"]["F_agent_runtime"] = r
    avg = r["avg_ms"] if r["avg_ms"] is not None else "ERR"
    print(f"  avg={avg}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_g_evidence_correlation():
    """G. Evidence Correlation: correlate() with 100 mock findings (5 runs)."""
    print("\n[bench G] Evidence Correlation (100 findings) — 5 runs")
    from reconpro.evidence_correlation import EvidenceCorrelator

    mock_findings = make_mock_findings(100)
    correlator = EvidenceCorrelator()

    def correlate_fn():
        return correlator.correlate(mock_findings)

    r = run_timed(correlate_fn, runs=5, warmup=1)
    results["benchmarks"]["G_evidence_correlation"] = r
    print(f"  avg={r['avg_ms']}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_h_executive_intelligence():
    """H. Executive Intelligence: generate() with mock data (5 runs)."""
    print("\n[bench H] Executive Intelligence (generate) — 5 runs")
    from reconpro.executive_intelligence import ExecutiveIntelligence

    mock_result = make_mock_scan_result(make_mock_findings(50))
    exec_intel = ExecutiveIntelligence()

    def generate_fn():
        return exec_intel.generate(mock_result)

    r = run_timed(generate_fn, runs=5, warmup=1)
    results["benchmarks"]["H_executive_intelligence"] = r
    print(f"  avg={r['avg_ms']}ms  min={r['min_ms']}ms  max={r['max_ms']}ms")
    return r


def bench_i_memory_operations():
    """I. Memory Operations: UnifiedMemoryStore add/get/findings (5 runs each)."""
    print("\n[bench I] Memory Operations — 5 runs each")
    from reconpro.memory import UnifiedMemoryStore

    # Test 1: Construction
    def construct_fn():
        return UnifiedMemoryStore()

    r_construct = run_timed(construct_fn, runs=5, warmup=1)
    results["benchmarks"]["I_memory_construct"] = r_construct
    print(f"  construct: avg={r_construct['avg_ms']}ms")

    store = UnifiedMemoryStore()

    # Test 2: add_scan_result
    mock_scan = make_mock_scan_result(make_mock_findings(20)).to_dict()

    def add_scan_fn():
        store.add_scan_result(mock_scan)
        return True

    r_add = run_timed(add_scan_fn, runs=5, warmup=1)
    results["benchmarks"]["I_memory_add_scan"] = r_add
    print(f"  add_scan_result: avg={r_add['avg_ms']}ms")

    # Test 3: add_finding_from_scan (batch 50)
    batch_findings = make_mock_findings(50)

    def add_findings_fn():
        for f in batch_findings:
            store.add_finding_from_scan(f)
        return True

    r_add_f = run_timed(add_findings_fn, runs=5, warmup=1)
    results["benchmarks"]["I_memory_add_findings_50"] = r_add_f
    print(f"  add_findings(50): avg={r_add_f['avg_ms']}ms")

    # Test 4: get_latest_findings
    def get_findings_fn():
        return store.get_latest_findings("example.com", limit=50)

    r_get = run_timed(get_findings_fn, runs=5, warmup=1)
    results["benchmarks"]["I_memory_get_findings"] = r_get
    print(f"  get_findings: avg={r_get['avg_ms']}ms")

    # Test 5: stats
    def stats_fn():
        return store.stats()

    r_stats = run_timed(stats_fn, runs=5, warmup=1)
    results["benchmarks"]["I_memory_stats"] = r_stats
    print(f"  stats: avg={r_stats['avg_ms']}ms")

    # Test 6: graph_stats
    def graph_stats_fn():
        return store.graph_stats()

    r_gstats = run_timed(graph_stats_fn, runs=5, warmup=1)
    results["benchmarks"]["I_memory_graph_stats"] = r_gstats
    print(f"  graph_stats: avg={r_gstats['avg_ms']}ms")

    return {
        "construct": r_construct,
        "add_scan": r_add,
        "add_findings_50": r_add_f,
        "get_findings": r_get,
        "stats": r_stats,
        "graph_stats": r_gstats,
    }


def bench_j_goal_parser():
    """J. GoalParser: parse 10 different goals (3 runs each)."""
    print("\n[bench J] GoalParser — 10 goals, 3 runs each")
    from reconpro.autonomous_planner import GoalParser

    parser = GoalParser()
    goals = [
        "Scan example.com for vulnerabilities",
        "Full security audit of 192.168.1.0/24",
        "Reconnaissance on api.target.com within 30 seconds",
        "Compliance check for PCI-DSS on payment.example.com",
        "Map the attack surface of cloud.corp.net",
        "Comprehensive deep scan of everything at test.local",
        "Cloud audit for AWS infrastructure at prod.aws.com",
        "Code review and SAST scan on repo.dev.internal",
        "Audit localhost machine for security issues",
        "Enumerate subdomains and DNS records for recon.dev deep",
    ]

    goal_results: Dict[str, Any] = {}
    for goal in goals:
        def parse_fn(g=goal):
            return parser.parse(g)

        r = run_timed(parse_fn, runs=3, warmup=1)
        goal_results[goal[:60]] = r
        avg = r["avg_ms"] if r["avg_ms"] is not None else "ERR"
        print(f"  \"{goal[:55]}...\": avg={avg}ms")

    results["benchmarks"]["J_goal_parser"] = goal_results
    return goal_results


def bench_k_memory_footprint():
    """K. Memory Footprint: tracemalloc during scan pipeline."""
    print("\n[bench K] Memory Footprint (tracemalloc during scan pipeline)")
    from reconpro.scanner import audit_scan

    tracemalloc.start()

    # Warmup: first run loads everything
    _ = audit_scan(target=".", modules=["host"])
    tracemalloc.reset_peak()

    # Measured run
    _ = audit_scan(target=".", modules=["host"])
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    footprint = {
        "peak_memory_bytes": peak,
        "peak_memory_mb": round(peak / (1024 * 1024), 2),
        "current_memory_bytes": current,
        "current_memory_mb": round(current / (1024 * 1024), 2),
    }
    results["benchmarks"]["K_memory_footprint"] = footprint
    print(f"  peak={footprint['peak_memory_mb']}MB  "
          f"current={footprint['current_memory_mb']}MB")
    return footprint


def bench_l_thread_safety():
    """L. Thread Safety: 3 concurrent AgentOrchestrators, no deadlocks."""
    print("\n[bench L] Thread Safety — 3 concurrent orchestrators")
    from reconpro.agent_runtime import AgentOrchestrator

    errors: List[str] = []
    completed_count = [0]
    lock = threading.Lock()
    timeout_occurred = False

    def run_orch(idx: int):
        try:
            orch = AgentOrchestrator()
            result = orch.run_goal("audit localhost", ".")
            with lock:
                completed_count[0] += 1
            return {"index": idx, "status": "ok", "findings": len(result.get("all_findings", []))}
        except Exception as exc:
            with lock:
                errors.append(f"orchestrator-{idx}: {exc}")
            return {"index": idx, "status": "error", "error": str(exc)}

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(run_orch, i) for i in range(3)]
        try:
            results_list = [f.result(timeout=120) for f in futures]
        except Exception as exc:
            timeout_occurred = True
            errors.append(f"timeout/deadlock: {exc}")
            results_list = []
    wall_time = (time.perf_counter() - start) * 1000

    thread_result = {
        "completed_count": completed_count[0],
        "total_time_ms": round(wall_time, 2),
        "timeout_or_deadlock": timeout_occurred,
        "errors": errors,
        "per_orchestrator": results_list,
        "verdict": "PASS — no deadlocks detected" if not errors and completed_count[0] == 3
                   else "FAIL — issues detected",
    }
    results["benchmarks"]["L_thread_safety"] = thread_result
    print(f"  verdict={thread_result['verdict']}  "
          f"completed={completed_count[0]}/3  "
          f"total={wall_time:.0f}ms")
    return thread_result


# ── Main runner ───────────────────────────────────────────────────────

def main():
    """Run all benchmarks and write results."""
    wall_start = time.perf_counter()
    print("=" * 72)
    print("ReconPro v10.0.0 — Performance Benchmark Suite")
    print("Council Alpha — Performance Engineering")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print(f"Python: {sys.version}")
    print(f"Platform: {sys.platform}")
    print("=" * 72)

    # Run each benchmark
    try:
        bench_a_startup_time()
    except Exception as exc:
        print(f"  [!] Bench A failed: {exc}")
        results["benchmarks"]["A_startup_time"] = {"error": str(exc)}

    try:
        bench_b_module_imports()
    except Exception as exc:
        print(f"  [!] Bench B failed: {exc}")
        results["benchmarks"]["B_module_imports"] = {"error": str(exc)}

    try:
        bench_c_cli_startup()
    except Exception as exc:
        print(f"  [!] Bench C failed: {exc}")
        results["benchmarks"]["C_cli_startup"] = {"error": str(exc)}

    try:
        bench_d_scan_pipeline()
    except Exception as exc:
        print(f"  [!] Bench D failed: {exc}")
        results["benchmarks"]["D_scan_pipeline_host"] = {"error": str(exc)}

    try:
        bench_e_intelligence_pipeline()
    except Exception as exc:
        print(f"  [!] Bench E failed: {exc}")
        results["benchmarks"]["E_intelligence_pipeline"] = {"error": str(exc)}

    try:
        bench_f_agent_runtime()
    except Exception as exc:
        print(f"  [!] Bench F failed: {exc}")
        results["benchmarks"]["F_agent_runtime"] = {"error": str(exc)}

    try:
        bench_g_evidence_correlation()
    except Exception as exc:
        print(f"  [!] Bench G failed: {exc}")
        results["benchmarks"]["G_evidence_correlation"] = {"error": str(exc)}

    try:
        bench_h_executive_intelligence()
    except Exception as exc:
        print(f"  [!] Bench H failed: {exc}")
        results["benchmarks"]["H_executive_intelligence"] = {"error": str(exc)}

    try:
        bench_i_memory_operations()
    except Exception as exc:
        print(f"  [!] Bench I failed: {exc}")
        results["benchmarks"]["I_memory_construct"] = {"error": str(exc)}

    try:
        bench_j_goal_parser()
    except Exception as exc:
        print(f"  [!] Bench J failed: {exc}")
        results["benchmarks"]["J_goal_parser"] = {"error": str(exc)}

    try:
        bench_k_memory_footprint()
    except Exception as exc:
        print(f"  [!] Bench K failed: {exc}")
        results["benchmarks"]["K_memory_footprint"] = {"error": str(exc)}

    try:
        bench_l_thread_safety()
    except Exception as exc:
        print(f"  [!] Bench L failed: {exc}")
        results["benchmarks"]["L_thread_safety"] = {"error": str(exc)}

    wall_total = (time.perf_counter() - wall_start) * 1000.0
    results["meta"]["total_benchmark_time_ms"] = round(wall_total, 2)

    # ── Write JSON results ──
    json_path = REPORTS_DIR / "benchmark_results.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nResults written to: {json_path}")

    return results


if __name__ == "__main__":
    main()
