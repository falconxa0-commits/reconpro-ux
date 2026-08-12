# Architecture Quality Audit — ReconPro v10.0.0

**Auditor:** Council Iota — Architecture Quality  
**Date:** 2025-07-10  
**Scope:** `/home/z/my-project/vibesec-cli/reconpro/` (72 Python source files, ~52K lines)

---

## Executive Summary

ReconPro v10.0.0 is a large security reconnaissance platform with 72 Python modules across 4 packages (`reconpro/`, `reconpro/modules/`, `reconpro/integrations/`, `reconpro/widgets/`). The architecture is **cleanly layered with zero import cycles** — a strong foundation. However, the codebase suffers from significant **dead code accumulation (63 confirmed dead symbols)**, **god-class anti-patterns** (NexusApp: 111 methods, 3357 lines), **pervasive code duplication** across integration clients and scan modules, and **an extremely flat import graph** where most modules are only reachable via CLI lazy-loading. The top 3 priorities are: (1) decompose god-classes, (2) remove dead code, (3) extract a shared integration base class.

---

## 1. Dead Code

### 1.1 Confirmed Dead Functions (never called anywhere in the codebase)

| # | File:Line | Symbol | Category |
|---|-----------|--------|----------|
| 1 | `browser_mod.py:111` | `scan_browser_secrets` | Module-level function |
| 2 | `fuzzer.py:1542` | `quick_scan` | Module-level function |
| 3 | `fuzzer.py:1588` | `get_payload_count` | Module-level function |
| 4 | `modules/team.py:90` | `add_member` | Module-level function |
| 5 | `modules/team.py:119` | `remove_member` | Module-level function |
| 6 | `modules/team.py:145` | `assign_role` | Module-level function |
| 7 | `modules/team.py:173` | `search_members` | Module-level function |
| 8 | `modules/team.py:189` | `generate_invite` | Module-level function |
| 9 | `modules/team.py:208` | `get_activity_log` | Module-level function |
| 10 | `modules/team.py:214` | `show_grid` | Module-level function |
| 11 | `agent_runtime.py:690` | `get_agent_status` | Module-level function |
| 12 | `autonomous_planner.py:430` | `replan` | Module-level function |
| 13 | `autonomous_planner.py:505` | `estimate_resources` | Module-level function |
| 14 | `autonomous_planner.py:555` | `validate_strategy` | Module-level function |
| 15 | `benchmark.py:329` | `run_benchmark` | Module-level function |
| 16 | `compliance.py:792` | `summary_text` | Module-level function |
| 17 | `compliance.py:913` | `generate_evidence` | Module-level function |
| 18 | `cve_radar.py:261` | `enrich_finding` | Module-level function |
| 19 | `decision_engine.py:176` | `should_retry` | Module-level function |
| 20 | `decision_engine.py:203` | `should_throttle` | Module-level function |
| 21 | `defense.py:307` | `safe_read` | Module-level function |
| 22 | `defense.py:333` | `safe_ping` | Module-level function |
| 23 | `defense.py:392` | `add_cors` | Module-level function |
| 24 | `defense.py:518` | `handle_error` | Module-level function |
| 25 | `engine.py:111` | `by_module` | Module-level function |
| 26 | `fuzzer.py:1175` | `get_all_categories` | Module-level function |
| 27 | `fuzzer.py:1341` | `fuzz_headers` | Module-level function |
| 28 | `fuzzer.py:1397` | `analyze_response` | Module-level function |
| 29 | `integrations/github.py:274` | `post_pr_comment` | Class method (GitHubClient) |
| 30 | `integrations/github.py:281` | `create_commit_status` | Class method (GitHubClient) |
| 31 | `integrations/github.py:308` | `upload_sarif` | Class method (GitHubClient) |
| 32 | `integrations/jira.py:340` | `add_comment` | Class method (JiraClient) |
| 33 | `integrations/jira.py:354` | `delete_issue` | Class method (JiraClient) |
| 34 | `integrations/slack.py:125` | `send_finding_alert` | Class method (SlackClient) |
| 35 | `integrations/slack.py:201` | `send_scan_summary` | Class method (SlackClient) |
| 36 | `integrations/slack.py:288` | `send_daily_digest` | Class method (SlackClient) |
| 37 | `integrations/zai_stream.py:383` | `sync_findings_stream` | Class method (ZAIStreamClient) |
| 38 | `intelligence_pipeline.py:268` | `get_target_profile` | Class method (IntelligencePipeline) |
| 39 | `intelligence_pipeline.py:313` | `last_report` | Class method (IntelligencePipeline) |
| 40 | `knowledge_graph.py:494` | `get_vulnerable_assets` | Class method (SecurityKnowledgeGraph) |
| 41 | `learning_system.py:79` | `record_scan` | Class method (LearningSystem) |
| 42 | `learning_system.py:196` | `suggest_modules` | Class method (LearningSystem) |
| 43 | `nexus_agent.py:131` | `list_tools` | Module-level function |
| 44 | `nexus_agent.py:2289` | `max_intent` | Module-level function |
| 45 | `passive_intel.py:232` | `extract_unique_ips` | Class method (PassiveDNS) |
| 46 | `passive_intel.py:318` | `detect_tech_changes` | Class method (WaybackMachine) |
| 47 | `passive_intel.py:398` | `detect_stale_dns` | Class method (PassiveDNS) |
| 48 | `passive_intel.py:483` | `detect_dangling_dns` | Class method (PassiveDNS) |
| 49 | `profiler.py:360` | `estimate_posture` | Module-level function |
| 50 | `proxy.py:335` | `load_from_file` | Module-level function |
| 51 | `proxy.py:354` | `load_from_url` | Module-level function |
| 52 | `recommendation_engine.py:449` | `impact_analysis` | Class method (RecommendationEngine) |
| 53 | `theme.py:575` | `save_custom_theme` | Module-level function |
| 54 | `widgets/sparkline.py:84` | `push_batch` | Class method (Sparkline) |
| 55 | `widgets/stat_counter.py:100` | `increment` | Class method (StatCounter) |
| 56 | `widgets/stat_counter.py:104` | `reset_max` | Class method (StatCounter) |
| 57 | `widgets/toast.py:144` | `dismiss_all` | Class method (ToastContainer) |
| 58 | `widgets/velocity_meter.py:93` | `record_request` | Class method (VelocityMeter) |
| 59 | `widgets/velocity_meter.py:103` | `set_completion` | Class method (VelocityMeter) |

### 1.2 Dead Code in `modules/team.py` — Entire Public API

All 7 top-level functions in `modules/team.py` (lines 90–214) are dead code. The only symbol used is `run_team` (line 1–88), which is the module entry point registered in `MODULE_REGISTRY`. The functions `add_member`, `remove_member`, `assign_role`, `search_members`, `generate_invite`, `get_activity_log`, and `show_grid` appear to be scaffolding for a team management feature that was never completed or wired up.

### 1.3 Duplicate Method Definition

| File:Line | Symbol | Note |
|-----------|--------|------|
| `nexus_tui.py:1246` | `_initial_layout` | First definition |
| `nexus_tui.py:1496` | `_initial_layout` | **Shadowed** — second definition overwrites the first. Dead code by definition. |

---

## 2. Duplicate Code

### 2.1 `add()` Helper Closure — 3 Modules

Three scan modules define an identical closure pattern for appending findings:

- `modules/recon.py:931` — `def add(title, severity, category, desc, evidence, pts=0)`
- `modules/vibesec.py:90` — `def add(title, severity, category, desc, evidence, pts)`
- `api_discovery.py:848` — `def add(title, severity, category, desc, evidence, pts=0)`

All three create a `Finding()` object with `module=<module_name>` and append to a shared `findings` list. **Recommendation:** Extract a `FindingBuilder` or `add_finding()` utility into `http.py`.

### 2.2 `_default_config_path()` — 4 Integration Clients

Identical function in 3 files; variant in 1:

- `integrations/github.py:35` — `return integration_config_path("github")`
- `integrations/jira.py:34` — `return integration_config_path("jira")`
- `integrations/slack.py:35` — `return integration_config_path("slack")`
- `integrations/zai_stream.py:64` — **Different implementation** — iterates `CONFIG_SEARCH_PATHS` manually instead of calling `integration_config_path()`.

**Recommendation:** Create a base class `IntegrationClientBase` in `integrations/__init__.py` with `self.integration_name` and shared `_default_config_path()`. The `zai_stream.py` variant should be unified.

### 2.3 `sync_findings()` — 4 Integration Clients

All integration clients define a `sync_findings(self, findings, target)` method with similar signatures but different implementations:

- `integrations/jira.py:242` — Full Jira issue sync (create/update/close)
- `integrations/pagerduty.py:56` — Simplified incident creation
- `integrations/splunk.py:50` — Delegates to `send_findings()`
- `integrations/zai_stream.py:363` — Delegates to `analyze_findings()`

The interface is consistent (good), but the common pattern of filtering `critical`/`high` findings is duplicated. **Recommendation:** Extract a `filter_critical_findings()` helper in the base class.

### 2.4 `to_dict()` Serialization — 33 Classes

33 classes across the codebase implement `to_dict()` manually. While not strictly "duplicate code" (each serializes different fields), this is a pattern that could benefit from a shared dataclass mixin or `dataclasses.asdict()` standardization.

### 2.5 `compose()`, `on_mount()`, `on_unmount()`, `_render()`, `_tick()` — Widget Framework Pattern

These are Textual framework lifecycle methods that follow an identical structural pattern across 7 widget classes. This is expected and not problematic — it's how Textual works.

---

## 3. Import Cycles

**No import cycles detected.** The dependency graph is a clean DAG. This is a significant architectural strength.

---

## 4. Layer Violations

**No layer violations detected.**

- Low-level modules (`scanner.py`, `http.py`, `proxy.py`, `subdomains.py`, `parallel.py`) do not import intelligence/decision modules.
- `modules/` subpackage does not import `cli.py`.
- The dependency direction is clean: `cli.py` → `scanner.py` → `modules/` → `http.py`.

---

## 5. Coupling Metrics

### 5.1 Top 15 Most Coupled Modules (by internal import count)

| Rank | Module | Total Imports | Internal Imports |
|------|--------|:---:|:---:|
| 1 | `modules/__init__.py` | 14 | **14** |
| 2 | `chat.py` | 33 | **7** |
| 3 | `server.py` | 22 | **7** |
| 4 | `widgets/__init__.py` | 7 | **7** |
| 5 | `cli.py` | 30 | **6** |
| 6 | `agent.py` | 18 | **5** |
| 7 | `nexus_tui.py` | 44 | **3** |
| 8 | `adversarial.py` | 13 | **2** |
| 9 | `autonomous_planner.py` | 17 | **2** |
| 10 | `engine.py` | 21 | **2** |
| 11 | `intelligence_pipeline.py` | 14 | **2** |
| 12 | `parallel.py` | 20 | **2** |
| 13 | `scanner.py` | 29 | **2** |
| 14 | `scheduler.py` | 20 | **2** |
| 15 | `api_discovery.py` | 16 | **1** |

### 5.2 Hub Modules (most depended upon)

| Rank | Module | Imported By |
|------|--------|:---:|
| 1 | `http.py` | **24 modules** |
| 2 | `scanner.py` | **11 modules** |
| 3 | `theme.py` | **11 modules** |
| 4 | `history.py` | **5 modules** |
| 5 | `parallel.py` | **4 modules** |
| 6 | `config_utils.py` | **4 modules** |
| 7 | `subdomains.py` | **3 modules** |
| 8 | `__init__.py` | **3 modules** |
| 9 | `reports.py` | **3 modules** |
| 10 | `agent.py` | **2 modules** |

`http.py` is the dominant hub — imported by nearly every scan module and many top-level modules. This is expected and appropriate (it provides `Finding`, `http_probe`, `RateLimiter`), but makes `http.py` a high-blast-radius change target.

### 5.3 Functions with Excessive Parameters

| File:Line | Function | Params | Severity |
|-----------|----------|:---:|:---:|
| `engine.py:252` | `_run_module()` | **11** | 🔴 Critical |
| `engine.py:552` | `_scan_async()` | **9** | 🟠 High |
| `engine.py:659` | `concurrent_scan()` | **9** | 🟠 High |
| `modules/cloud_recon.py:809` | `add()` | **8** | 🟠 High |
| `parallel.py:58` | `blitz_scan()` | **8** | 🟠 High |
| `engine.py:356` | `run()` | **7** | 🟡 Medium |
| `http.py:47` | `http_probe()` | **7** | 🟡 Medium |
| `modules/ast_analyzer.py:177` | `_add()` | **7** | 🟡 Medium |
| `parallel.py:35` | `_scan_one_target()` | **7** | 🟡 Medium |

---

## 6. Cohesion / Single Responsibility Principle

### 6.1 God-Classes

| Class | File:Line | Methods | File Lines | Concerns |
|-------|-----------|:---:|:---:|----------|
| `NexusApp` | `nexus_tui.py:785` | **111** | 3,357 | TUI layout, command dispatch, scan orchestration, session management, chat, help system, theme switching, export, history, agent integration |
| `UnifiedMemoryStore` | `memory.py:50` | **44** | 930 | Findings CRUD, vulnerability tracking, asset management, technology profiling, graph operations, blackboard (bb_*), vault (encrypt/decrypt), persistence, statistics |
| `SecurityKnowledgeGraph` | `knowledge_graph.py:181` | **20** | 880 | Graph operations, security-specific queries, fallback digraph, serialization |
| `ProxyPool` | `proxy.py:294` | **17** | ~700 | Proxy rotation, health checking, loading, stats, protocol-specific proxies |
| `Theme` | `theme.py:407` | **17** | ~650 | Theme definitions, color computation, custom theme management, saving |
| `GitHubClient` | `integrations/github.py:39` | **15** | ~350 | REST API, issue sync, PR comments, commit status, SARIF upload |
| `NexusAgent` | `nexus_agent.py:2758` | **15** | 3,299 | Tool definitions, intent routing, scan orchestration, audit, subdomain, fuzzer, CVE, swarm, adversarial, graph, compliance, defense |

### 6.2 `NexusApp` (nexus_tui.py) — Critical SRP Violation

`NexusApp` is a 3,357-line class with 111 methods spanning at least **12 distinct responsibilities**:

| Responsibility | Methods | Example |
|---------------|:---:|---------|
| TUI Layout / Responsive Design | ~10 | `_initial_layout`, `_apply_responsive_layout`, `_apply_split_ratio` |
| Widget Focus Management | ~5 | `_focus_input`, `_focus_widget`, `action_cycle_focus` |
| Command Dispatch | ~25 | `_handle_scan`, `_handle_blitz`, `_handle_subdomains`, `_handle_swarm`, ... |
| Scan Orchestration (workers) | ~10 | `_run_scan_worker`, `_run_blitz_worker`, `_run_generic_worker` |
| Session Management | ~5 | `_save_session`, `_load_session`, `_restore_session` |
| Chat / Feed Management | ~5 | `_chat`, `_feed`, `_clear_all_feeds` |
| Help System | ~3 | `_show_help_overlay`, `_show_help`, `_show_help_chat_dump` |
| Theme Switching | ~2 | `_handle_theme` |
| Toast Notifications | ~5 | `_toast`, `_toast_error`, `_toast_success` |
| History | ~3 | `_get_target_history`, `_handle_history` |
| Export | ~1 | `_handle_export` |
| Agent Integration | ~2 | `_handle_agent`, `_run_agent_worker` |

### 6.3 `UnifiedMemoryStore` (memory.py) — SRP Violation

A 930-line class combining **6 distinct subsystems**:

| Subsystem | Methods |
|-----------|:---:|
| Findings CRUD + persistence | ~12 (`get_findings`, `save_finding`, `add_finding_from_scan`, ...) |
| Vulnerability / Asset / Endpoint tracking | ~6 |
| Graph operations | ~4 (`add_relation`, `shortest_path`, `graph_stats`) |
| Blackboard (key-value scratchpad) | ~4 (`bb_set`, `bb_get`, `bb_get_all`, `bb_clear`) |
| Vault (encrypted storage) | ~4 (`vault_store`, `vault_get_all`, `vault_search`, `vault_purge`) |
| Statistics | ~2 (`stats`, `trend`) |

---

## 7. Dependency Graph Summary

### 7.1 Graph Statistics

- **Total Python modules:** 72
- **Internal import edges:** 78
- **Average internal imports per module:** 1.1
- **Import cycles:** 0
- **Hub modules (>5 dependents):** 3 (`http.py`, `scanner.py`, `theme.py`)
- **Leaf modules (0 internal imports):** 48
- **Reachable from `__init__.py` via static imports:** 4 (`scanner.py`, `http.py`, `modules/__init__.py`, all scan modules)
- **Reachable only via CLI lazy-loading:** ~30 (most feature modules)

### 7.2 Reachability

The codebase uses a **lazy-loading CLI pattern** where `cli.py` imports modules inside `if cmd == "xxx":` blocks. This means:

- **Static import chain:** `__init__.py` → `scanner.py` → `modules/__init__.py` → all 14 scan modules → `http.py`
- **Lazy-loaded at runtime:** adversarial, swarm, agent_runtime, autonomous_planner, evidence_correlation, executive_intelligence, learning_system, recommendation_engine, engineering_score, auto_validation, security_audit, prompt_defense, benchmark, defense, compliance, delta, fuzzer, netmap, cve_radar, passive_intel, graph_ui, formats, chat, nexus_tui, nexus_agent, server, scheduler, plugins, browser_mod, api_discovery, webhooks, knowledge_graph, memory, proxy, config_utils, intelligence_pipeline, confidence_engine, target_intelligence

This is a deliberate design choice for fast startup, but it means **static analysis tools cannot find these dependencies**, and there is no compile-time guarantee that lazy imports reference valid modules.

### 7.3 Isolated Modules (not imported by any other module via static import)

48 of 72 modules are not statically imported by any other module. All are reachable only via CLI lazy-loading (`from .xxx import YYY` inside `if` blocks in `cli.py`) or via the TUI (`nexus_tui.py` does the same pattern). This is **by design** but creates risk: if a module is renamed, no static analysis will catch the broken lazy import until runtime.

---

## 8. Module Boundary Issues

### 8.1 `__all__` Exports

| Module | Exports | Status |
|--------|---------|--------|
| `__init__.py:63` | `scan`, `ReconProResult`, `audit_scan`, `__version__` | ✅ Correct — matches actual public API |
| `modules/__init__.py:18` | 14 `run_*` functions | ✅ Correct — matches scanner registration |
| `integrations/__init__.py:11` | 6 client classes | ✅ Correct — uses lazy `__getattr__` |
| `widgets/__init__.py:21` | 7 widget classes | ✅ Correct |
| `delta.py:636` | `DeltaReport`, `DeltaReporter`, `compare_with_last`, `generate_delta_report` | ✅ Correct |
| `profiler.py:596` | `TechProfile`, `TargetProfiler`, `AutoPlan`, `profile_target`, `get_scan_plan` | ✅ Correct |
| `swarm.py:1112` | 6 exports | ✅ Correct |
| `webhooks.py:707` | 4 exports | ✅ Correct |

### 8.2 Missing `__all__` Exports

The following packages/modules lack `__all__`, relying on implicit public API:

- `adversarial.py` — exports `run_adversarial` (used by cli.py/nexus_tui.py)
- `chat.py` — exports `start_chat`
- `nexus_tui.py` — exports `start_nexus`
- `nexus_agent.py` — exports `run_nexus_agent`
- `server.py` — exports `run_server`
- `fuzzer.py` — exports `FuzzSession`, `TechDetector`
- `plugins.py` — exports `discover_plugins`, `create_plugin_template`, `run_plugin`
- All other feature modules (compliance, defense, delta, benchmark, etc.)

### 8.3 Private API Leaks

Several modules define top-level functions starting with `_` (private) that are actually used externally:

- `scanner.py:100` — `set_intelligence_hook` (used by scanner.py itself internally, but exposed in `__init__.py`'s `__all__`? No — not in `__all__`. OK.)
- `integrations/zai_stream.py:64` — `_default_config_path` is private but follows a pattern used in other integration modules where the same function is also private. Consistent.

---

## 9. Recommendations (Prioritized)

### 🔴 Critical (Do First)

1. **Decompose `NexusApp`** (`nexus_tui.py`, 3,357 lines, 111 methods)
   - Extract `SessionManager` class (save/load/restore session)
   - Extract `CommandDispatcher` class (all `_handle_*` methods)
   - Extract `ScanWorkerManager` (all `_run_*_worker` methods)
   - Extract `ToastService` / `NotificationService`
   - Target: NexusApp < 500 lines, delegating to 4-5 focused classes

2. **Remove Dead Code** (59 confirmed dead functions)
   - `modules/team.py` lines 90-214: Remove 7 dead functions entirely
   - `fuzzer.py`: Remove `quick_scan`, `get_payload_count`, `get_all_categories`, `fuzz_headers`, `analyze_response`
   - `integrations/`: Remove 7 dead methods across github, jira, slack, zai_stream
   - `passive_intel.py`: Remove 4 dead analysis methods
   - Fix `_initial_layout` duplicate in `nexus_tui.py` (lines 1246 vs 1496)

### 🟠 High Priority

3. **Decompose `UnifiedMemoryStore`** (`memory.py`, 930 lines, 44 methods)
   - Extract `FindingsStore` (findings CRUD + persistence)
   - Extract `BlackboardStore` (bb_* methods)
   - Extract `VaultStore` (vault_* methods, encryption)
   - Extract `AssetGraphStore` (add_asset, add_relation, graph ops)

4. **Extract Integration Base Class** (`integrations/`)
   - Create `IntegrationClientBase` with shared `_default_config_path()`, `load_config()`, `filter_critical_findings()`
   - Fix `integrations/zai_stream.py:64` — `_default_config_path()` uses different logic than the other 3 clients
   - This eliminates 3 duplicate functions and provides a common interface

5. **Extract Shared `add_finding()` Helper**
   - Create `reconpro.findings.add_finding()` or a `FindingCollector` context manager
   - Replace 3 duplicate `add()` closures in `modules/recon.py:931`, `modules/vibesec.py:90`, `api_discovery.py:848`

### 🟡 Medium Priority

6. **Reduce `engine.py` Parameter Counts**
   - `_run_module()` (11 params): Bundle params into a `ScanConfig` dataclass
   - `_scan_async()` (9 params), `concurrent_scan()` (9 params): Same approach

7. **Add `__all__` to All Feature Modules**
   - At minimum: `adversarial.py`, `chat.py`, `nexus_tui.py`, `nexus_agent.py`, `server.py`, `fuzzer.py`, `compliance.py`, `defense.py`, `delta.py`, `benchmark.py`

8. **Decompose `NexusAgent`** (`nexus_agent.py`, 3,299 lines)
   - Extract tool definitions into a separate `nexus_tools.py` module
   - Extract agent orchestration logic into focused handlers

### 🟢 Low Priority / Tech Debt

9. **Standardize `to_dict()` Serialization**
   - Consider a `SerializableMixin` or `@serializable` decorator
   - 33 classes implement this manually

10. **Add Static Import Verification**
    - Create a test that validates all lazy imports in `cli.py` resolve to real symbols
    - Prevents runtime `ImportError` from module renames

11. **Consider Type Annotations for Dead Code Prevention**
    - Several dead functions suggest features that were planned but not completed (e.g., `modules/team.py` team management, `learning_system.py` learning)
    - Either implement these features or remove the scaffolding

---

## Appendix A: Full Dependency Graph (Internal Imports)

```
__init__.py → scanner.py
adversarial.py → scanner.py, http.py
agent.py → scanner.py, subdomains.py, parallel.py, history.py, http.py
api_discovery.py → http.py
autonomous_planner.py → decision_engine.py, scanner.py
browser_mod.py → http.py
chat.py → __init__.py, scanner.py, history.py, parallel.py, subdomains.py, reports.py, agent.py
cli.py → __init__.py, theme.py, scanner.py, history.py, reports.py, parallel.py
engine.py → scanner.py, http.py
fuzzer.py → profiler.py
intelligence_pipeline.py → scanner.py, engine.py
memory.py → knowledge_graph.py
modules/__init__.py → recon.py, vibesec.py, auth.py, chain.py, bot.py, gorgon.py, oblivion.py, nhi.py, host.py, dev.py, doctor.py, cloud_recon.py, pegasus.py, team.py
modules/*.py → http.py  (all 14 scan modules)
nexus_tui.py → theme.py, widgets/__init__.py, nexus_help.py
nexus_help.py → theme.py
parallel.py → scanner.py, http.py
reports.py → theme.py
scanner.py → modules/__init__.py, http.py
scheduler.py → scanner.py, history.py
server.py → __init__.py, scanner.py, parallel.py, history.py, subdomains.py, reports.py, agent.py
subdomains.py → http.py
integrations/*.py → config_utils.py
widgets/__init__.py → score_gauge.py, sparkline.py, stat_counter.py, velocity_meter.py, command_completer.py, hint_bar.py, toast.py
widgets/*.py → theme.py
```

## Appendix B: Module Size Summary

| File | Lines | Methods (top class) |
|------|:---:|:---:|
| `nexus_tui.py` | 3,357 | 111 (NexusApp) |
| `nexus_agent.py` | 3,299 | 15 (NexusAgent) |
| `modules/iac_audit.py` | 2,121 | — |
| `cli.py` | 1,786 | — |
| `fuzzer.py` | 1,598 | 12 (FuzzSession) |
| `modules/host.py` | 1,491 | — |
| `defense.py` | 1,402 | 12 (PatchGenerator) |
| `reports.py` | 1,308 | — |
| `modules/doctor.py` | 1,256 | — |
| `modules/recon.py` | 1,170 | — |
| `modules/cloud_recon.py` | 1,152 | — |
| `adversarial.py` | 1,150 | — |
| `swarm.py` | 1,120 | — |
| `modules/dev.py` | 1,087 | — |
| `modules/auth.py` | 1,038 | — |
