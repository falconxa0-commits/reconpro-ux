#!/usr/bin/env python3
"""ReconPro v11.0.0 — Full Repository Engineering Audit Report Generator."""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_DIR = "/usr/share/fonts"

# Register fonts (using actual paths from system)
pdfmetrics.registerFont(TTFont("DejaVuSans", f"{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuMono", f"{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf"))

# Colors
DARK_BG = HexColor("#0f172a")
ACCENT = HexColor("#3b82f6")
ACCENT2 = HexColor("#10b981")
RED = HexColor("#ef4444")
YELLOW = HexColor("#f59e0b")
GRAY = HexColor("#64748b")
LIGHT_GRAY = HexColor("#f1f5f9")
WHITE = HexColor("#ffffff")
TABLE_HEADER_BG = HexColor("#1e293b")
TABLE_ALT_BG = HexColor("#f8fafc")
BORDER_COLOR = HexColor("#e2e8f0")

OUTPUT = "/home/z/my-project/download/ReconPro_v11_Full_Engineering_Audit_Report.pdf"

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    name="MainTitle", fontName="DejaVuSans", fontSize=24, leading=30,
    textColor=DARK_BG, alignment=TA_CENTER, spaceAfter=6*mm
))
styles.add(ParagraphStyle(
    name="Subtitle", fontName="DejaVuSans", fontSize=14, leading=18,
    textColor=GRAY, alignment=TA_CENTER, spaceAfter=12*mm
))
styles.add(ParagraphStyle(
    name="SectionH1", fontName="DejaVuSans", fontSize=18, leading=24,
    textColor=DARK_BG, spaceBefore=10*mm, spaceAfter=4*mm,
    borderPadding=(0, 0, 2, 0), borderColor=ACCENT, borderWidth=0
))
styles.add(ParagraphStyle(
    name="SectionH2", fontName="DejaVuSans", fontSize=14, leading=18,
    textColor=HexColor("#334155"), spaceBefore=6*mm, spaceAfter=3*mm
))
styles.add(ParagraphStyle(
    name="Body", fontName="DejaVuSans", fontSize=10, leading=14,
    textColor=HexColor("#1e293b"), alignment=TA_JUSTIFY, spaceAfter=3*mm
))
styles.add(ParagraphStyle(
    name="ReconBullet", fontName="DejaVuSans", fontSize=10, leading=14,
    textColor=HexColor("#1e293b"), leftIndent=12, bulletIndent=4, spaceAfter=1.5*mm
))
styles.add(ParagraphStyle(
    name="ReconCode", fontName="DejaVuMono", fontSize=8, leading=11,
    textColor=HexColor("#334155"), backColor=LIGHT_GRAY,
    borderPadding=(4, 4, 4, 4), spaceAfter=2*mm
))
styles.add(ParagraphStyle(
    name="MetricGood", fontName="DejaVuSans", fontSize=20, leading=24,
    textColor=ACCENT2, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    name="MetricWarn", fontName="DejaVuSans", fontSize=20, leading=24,
    textColor=YELLOW, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    name="MetricBad", fontName="DejaVuSans", fontSize=20, leading=24,
    textColor=RED, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    name="Footer", fontName="DejaVuSans", fontSize=8, leading=10,
    textColor=GRAY, alignment=TA_CENTER
))

def h1(text):
    return Paragraph(text, styles["SectionH1"])

def h2(text):
    return Paragraph(text, styles["SectionH2"])

def body(text):
    return Paragraph(text, styles["Body"])

def bullet(text):
    return Paragraph(f"\u2022 {text}", styles["ReconBullet"])

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=3*mm, spaceBefore=3*mm)

def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    if col_widths is None:
        col_widths = [None] * len(headers)
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "DejaVuSans"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("FONTNAME", (0, 1), (-1, -1), "DejaVuSans"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TABLE_ALT_BG]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(style)
    return t

def first_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, A4[1] - 120*mm, A4[0], 120*mm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, A4[1] - 120*mm - 4, A4[0], 4, fill=1, stroke=0)
    canvas.restoreState()

def later_pages(canvas, doc):
    canvas.saveState()
    canvas.setFont("DejaVuSans", 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0]/2, 20*mm, f"ReconPro v11.0.0 Engineering Audit Report | Page {doc.page}")
    canvas.restoreState()

story = []

# ====== COVER ======
story.append(Spacer(1, 50*mm))
story.append(Paragraph("RECONPRO v11.0.0", styles["MainTitle"]))
story.append(Paragraph("FULL REPOSITORY ENGINEERING AUDIT REPORT", ParagraphStyle(
    "CoverSub", fontName="DejaVuSans", fontSize=14, leading=18, textColor=ACCENT, alignment=TA_CENTER
)))
story.append(Spacer(1, 15*mm))
story.append(Paragraph("Wave 0: Complete Repository Intelligence", styles["Subtitle"]))
story.append(Paragraph("Wave 1: Build Age I Infrastructure Fixes", styles["Subtitle"]))
story.append(Spacer(1, 20*mm))
story.append(Paragraph("8 parallel intelligence agents | 161 files read | 123K+ LOC analyzed", styles["Subtitle"]))
story.append(Paragraph("1,449 tests passing | 11 files modified | 2 modules registered", styles["Subtitle"]))
story.append(Spacer(1, 30*mm))
story.append(hr())
story.append(Paragraph("Date: 2026-08-11 | Classification: Internal Engineering | Status: Post-Wave-1", styles["Footer"]))
story.append(PageBreak())

# ====== EXECUTIVE SUMMARY ======
story.append(h1("1. Executive Summary"))
story.append(body(
    "This report documents the comprehensive engineering audit of ReconPro v11.0.0, "
    "a pure-Python enterprise reconnaissance platform. The audit was conducted using 8 parallel "
    "intelligence agents that read every file in the 161-file, 123K+ line codebase. "
    "Following intelligence gathering, Wave 1 Build Age I infrastructure fixes were applied, "
    "and a full regression test pass was confirmed."
))
story.append(body(
    "The repository contains 28 registered scanning modules (25 remote + 3 local), 1,449 "
    "passing tests, and zero external dependencies for core scanning. The codebase demonstrates "
    "significant engineering breadth with 50+ CLI commands, 7 report formats, and advanced "
    "subsystems for AI analysis, attack graph construction, threat intelligence, and knowledge "
    "graph correlation. However, critical quality issues were identified: version chaos across "
    "12+ files, 120+ silent exception handlers, 5 copies of duplicated utility functions, "
    "2 orphaned modules, and documentation severely outdated from v10 to v11."
))
story.append(body(
    "Wave 1 fixes addressed: unified all version strings to 11.0.0 across 11 files, "
    "registered 2 orphaned modules (container_sec, iac_audit), centralized duplicated "
    "constants across 6 files, fixed a broken cyclical detection algorithm in drift_monitor.py, "
    "and wired the unused RateLimiter in scanner.py to actual module calls. All 1,449 tests "
    "pass after changes with zero regressions."
))

# ====== REPOSITORY STATISTICS ======
story.append(h1("2. Repository Statistics (Measured)"))
story.append(make_table(
    ["Metric", "Before (Wave 0)", "After (Wave 1)"],
    [
        ["Python Files (live)", "161", "161"],
        ["Total Lines of Code", "123,316", "123,290"],
        ["Total Files (all types)", "190", "190"],
        ["Registered Modules", "26", "28"],
        ["Remote Modules", "23", "25"],
        ["Local Modules", "3", "3"],
        ["Test Files", "31", "31"],
        ["Test Methods", "1,449", "1,449"],
        ["Tests Passing", "1,449", "1,449"],
        ["Tests Failing", "0", "0"],
        ["CLI Commands", "50+", "50+"],
        ["Report Formats", "7", "7"],
        ["Integrations", "6", "6"],
        ["Widget Components", "7", "7"],
        ["ADR Documents", "5", "5"],
        ["External Dependencies (core)", "0", "0"],
        ["External Dependencies (optional)", "rich, textual, aiohttp, openai", "rich, textual, aiohttp, openai"],
    ],
    col_widths=[120, 130, 130]
))

# ====== WAVE 0 INTELLIGENCE ======
story.append(h1("3. Wave 0: Repository Intelligence"))

story.append(h2("3.1 Agent Deployment"))
story.append(body(
    "Eight parallel intelligence agents were deployed, each reading a distinct section "
    "of the codebase. Every agent read every file in its assigned section completely, "
    "recording all classes, functions, constants, imports, dependencies, bugs, and code "
    "smells. The total files read across all agents was approximately 196 (with intentional "
    "overlap for cross-validation). The agents were: Engineering Intelligence (22 core "
    "infrastructure files), Security Intelligence (16 files), Network & OSINT (20 files), "
    "Modules Intelligence (32 files), AI & Analysis Intelligence (16 files), Infrastructure & "
    "Observability (31 files), Testing Intelligence (35 files), and Documentation Intelligence "
    "(26 files)."
))

story.append(h2("3.2 Critical Findings from Wave 0"))
story.append(make_table(
    ["Severity", "Finding", "Files Affected", "Status"],
    [
        ["CRITICAL", "Version chaos: 5+ different versions", "12 files", "FIXED"],
        ["CRITICAL", "Orphaned modules: container_sec, iac_audit not registered", "4 files", "FIXED"],
        ["CRITICAL", "drift_monitor.py cyclical detection always true", "1 file", "FIXED"],
        ["HIGH", "scanner.py RateLimiter created but never used", "1 file", "FIXED"],
        ["HIGH", "SEV_COLORS/GRADE_COLORS duplicated in 6+ files", "6 files", "FIXED"],
        ["HIGH", "120+ bare except Exception (silent swallowing)", "40+ files", "KNOWN"],
        ["HIGH", "5 copies of _shannon_entropy across modules", "5 modules", "KNOWN"],
        ["HIGH", "8+ variants of _dread() helper", "8 modules", "KNOWN"],
        ["HIGH", "God files: 5 files >2000 LOC", "5 files", "KNOWN"],
        ["MEDIUM", "Documentation stuck at v10 across 8+ docs", "8+ files", "KNOWN"],
        ["MEDIUM", "ai_analyst.py or True bypass in chain detection", "1 file", "KNOWN"],
        ["MEDIUM", "security.verify_module_signature() always True", "1 file", "KNOWN"],
        ["MEDIUM", "credential vault uses weak hash, not encryption", "1 file", "KNOWN"],
        ["LOW", "netmap.py syntax error report (unconfirmed)", "1 file", "NOT FOUND"],
        ["LOW", "passive_intel.py missing quote (unconfirmed)", "1 file", "NOT FOUND"],
    ],
    col_widths=[55, 185, 70, 55]
))

# ====== WAVE 1 CHANGES ======
story.append(h1("4. Wave 1: Build Age I — Changes Applied"))

story.append(h2("4.1 Version Unification"))
story.append(body(
    "All version strings across the codebase were unified to 11.0.0. Previously, the "
    "codebase contained versions 2.0, 7.0.0, 8.5, 9.0.0, 9.1.0, 10.0, and 11.0.0 scattered "
    "across 12 files. This created confusion for debugging, User-Agent identification, API "
    "fingerprinting, and documentation accuracy. Each file was read, the version string "
    "located, and updated to 11.0.0 using the canonical form."
))
story.append(make_table(
    ["File", "Old Version", "New Version"],
    [
        ["constants.py USER_AGENT", "ReconPro/10.0", "ReconPro/11.0.0"],
        ["async_http.py UA", "ReconPro/2.0", "ReconPro/11.0.0"],
        ["connection_pool.py UA", "ReconPro/2.0", "ReconPro/11.0.0"],
        ["nexus_tui.py VERSION", "10.0.0", "11.0.0"],
        ["nexus_help.py", "v7.0.0", "v11.0.0"],
        ["wishes.py", "9.1.0", "11.0.0"],
        ["threat_feeds.py USER_AGENT", "ReconPro/9.1.0", "ReconPro/11.0.0"],
        ["ai_red_team.py USER_AGENT", "ReconPro-AI-RedTeam/9.1.0", "ReconPro/11.0.0-AI-RedTeam"],
        ["integrations/slack.py", "v8.5", "v11.0.0"],
        ["benchmark.py", "v8.5", "v11.0.0"],
        ["webhooks.py", "v8.5 / v9.0.0", "v11.0.0"],
    ],
    col_widths=[140, 120, 120]
))

story.append(h2("4.2 Orphaned Module Registration"))
story.append(body(
    "Two modules existed on disk but were completely disconnected from the module system: "
    "container_sec.py and iac_audit.py. Both had non-standard entry point names (run() instead "
    "of run_container_sec/run_iac_audit) and returned 4-tuples instead of the standard "
    "List[Finding]. The modules were refactored to conform to the standard module contract: "
    "entry functions renamed, return types normalized to List[Finding], entries added to "
    "__init__.py exports, and full registry entries created in registry.py with appropriate "
    "metadata. The module count increased from 26 to 28 (25 remote + 3 local)."
))

story.append(h2("4.3 Constant Deduplication"))
story.append(body(
    "SEV_COLORS and GRADE_COLORS were duplicated across cli.py, parallel.py, scheduler.py, "
    "report_writer.py, and reports.py. All duplicates were removed and replaced with imports "
    "from constants.py. Similarly, PLUGIN_DIR was duplicated in plugins.py and MEMORY_DIR in "
    "nexus_agent.py -- both replaced with centralized imports from constants.py. The reports.py "
    "_SEVERITY_ORDER was intentionally left unchanged because its sort ordering is inverted "
    "from the canonical SEVERITY_LEVELS in constants.py."
))

story.append(h2("4.4 Bug Fixes"))
story.append(make_table(
    ["Bug", "File", "Fix Applied"],
    [
        ["Broken cyclical detection", "drift_monitor.py", "Replaced 4-way OR that always-true with proper direction-change detection between consecutive pairs"],
        ["Unused RateLimiter", "scanner.py", "Passed limiter=limiter to all module runner calls (2 call sites)"],
        ["Module count tests", "test_regression_v11.py", "Updated expected counts: 23->25 remote, 26->28 all"],
        ["Module count tests", "test_registry.py", "Updated expected counts: 23->25 remote, 26->28 all"],
        ["User agent test", "test_constants.py", "Updated test from '10.0' to '11.0.0'"],
    ],
    col_widths=[110, 120, 195]
))

# ====== ARCHITECTURE ======
story.append(h1("5. Architecture Assessment"))

story.append(h2("5.1 Module System"))
story.append(body(
    "ReconPro uses a centralized registry pattern implemented in registry.py. All 25 remote modules "
    "are registered with metadata (name, description, color, runner callable) and lazily loaded "
    "via _get_runners() which imports from the modules/ subpackage. The 3 local modules (host, "
    "dev, doctor) handle on-system auditing. Modules communicate through the Finding dataclass "
    "defined in http_layer.py, which serves as the universal return type. The module contract "
    "is: run_<module_id>(target, base_url, timeout=8, verify_tls=True) -> List[Finding]. "
    "One exception is vibesec, which returns a 4-tuple including score/grade/badge. "
    "This is handled specially in both scanner.py and engine.py."
))

story.append(h2("5.2 Dual Scan Engines"))
story.append(body(
    "The codebase contains two scan engines: scanner.py (synchronous, 210 lines) and engine.py "
    "(asynchronous, 727 lines). Both expose scan() and audit_scan() functions with compatible "
    "signatures. The __init__.py exports from scanner.py, making it the public API. Engine.py "
    "adds async concurrent scanning via ScanEngine and concurrent_scan(). The coexistence of "
    "both engines creates a maintenance burden and slight behavioral divergence (engine.py "
    "provides ScanEvent, intelligence pipeline integration, and per-module timing that "
    "scanner.py does not)."
))

story.append(h2("5.3 Three HTTP Layers"))
story.append(body(
    "Three HTTP abstraction layers exist: http_layer.py (synchronous, 166 lines, foundational), "
    "async_http.py (async with optional aiohttp, 903 lines), and connection_pool.py (urllib "
    "wrapper, 255 lines). This creates confusion about which layer to use. Most modules import "
    "from http_layer, while some advanced modules use async_http. connection_pool.py appears "
    "underutilized. A unified HTTP interface would reduce complexity."
))

story.append(h2("5.4 God Files"))
story.append(make_table(
    ["File", "Lines", "Primary Concern"],
    [
        ["nexus_agent.py", "3,417", "AI agent with 25+ tools, should be split into tools/ and planner/"],
        ["nexus_tui.py", "3,359", "TUI app with 90+ methods, god class NexusApp"],
        ["attribution.py", "3,144", "Nation-state attribution engine with 5 sub-engines"],
        ["kill_chain.py", "2,992", "Full kill chain with 7 phases, 20+ helpers"],
        ["iac_audit.py", "2,121", "IaC audit covering Terraform, CloudFormation, Docker, K8s"],
        ["weaponized_report.py", "2,509", "Document tracking/weaponization analysis"],
        ["cli.py", "2,014", "CLI with 40+ subcommands, should use command pattern"],
    ],
    col_widths=[90, 50, 285]
))

# ====== SECURITY ======
story.append(h1("6. Security Assessment"))

story.append(h2("6.1 Input Validation Chain"))
story.append(body(
    "ReconPro implements a layered input validation chain: validate_target() in utils.py checks "
    "for shell metacharacters and hostname length (253 chars). sanitize_target() in security.py "
    "removes null bytes, control characters, and shell metacharacters. safe_url_parse() whitelists "
    "http/https schemes with 2048 char limit. safe_json_parse() enforces 1MB size, depth 20, "
    "and 10K keys. safe_xml_parse() blocks entity declarations. These functions are well-tested "
    "with 290+ security-focused test methods across 4 test files."
))

story.append(h2("6.2 Known Vulnerabilities"))
story.append(make_table(
    ["ID", "Severity", "Description", "Location"],
    [
        ["S-01", "HIGH", "Plugin exec_module() runs arbitrary code with no sandboxing", "plugins.py:45"],
        ["S-02", "HIGH", "_tool_shell_command executes OS commands via shell=True", "nexus_agent.py"],
        ["S-03", "HIGH", "Server auth bypass when no tokens exist", "server.py:145"],
        ["S-04", "MEDIUM", "Multiple files disable TLS verification", "5 files"],
        ["S-05", "MEDIUM", "Credential vault uses hash not encryption", "memory.py"],
        ["S-06", "MEDIUM", "verify_module_signature() always returns True", "security.py"],
        ["S-07", "MEDIUM", "Collab server has no authentication", "collab.py"],
        ["S-08", "LOW", "Global socket timeout mutation in exfil_channels.py", "exfil_channels.py:154"],
        ["S-09", "LOW", "detect_secrets_in_text returns raw secret values", "security.py"],
    ],
    col_widths=[30, 50, 240, 85]
))

story.append(h2("6.3 Silent Exception Handling"))
story.append(body(
    "The most pervasive code quality issue is silent exception handling: 120+ instances of "
    "'except Exception: pass' or 'except Exception: continue' across the codebase. While some "
    "of these are intentional (e.g., optional feature detection, graceful degradation), many "
    "swallow genuine errors that should be logged. This makes debugging difficult and can mask "
    "real failures. Key offenders include recon.py (20 instances), gorgon.py (19), oblivion.py (19), "
    "and nexus_agent.py. A systematic audit to convert silent catches to logged warnings is "
    "recommended for a future wave."
))

# ====== TESTING ======
story.append(h1("7. Testing Assessment"))

story.append(h2("7.1 Test Coverage Matrix"))
story.append(make_table(
    ["Module", "Test Files", "Test Methods", "Coverage"],
    [
        ["constants.py", "test_constants, test_coverage_boost", "44", "Excellent"],
        ["utils.py", "test_utils, test_coverage_boost, test_property", "286", "Excellent"],
        ["security.py", "test_security, test_security_regression, test_security_hardening", "290", "Excellent"],
        ["interfaces.py", "test_interfaces", "79", "Excellent"],
        ["observability.py", "test_observability, test_enterprise", "132", "Excellent"],
        ["ai_analyst.py", "test_ai_analyst", "81", "Very Good"],
        ["attack_graph.py", "test_attack_graph", "36", "Good"],
        ["registry.py", "test_registry, test_interfaces", "46", "Good"],
        ["cli.py", "test_cli", "47", "Good"],
        ["formats.py", "test_formats, test_regression_v11", "50", "Good"],
        ["scanner.py", "test_scanner", "18", "Moderate"],
        ["modules (all)", "test_integration", "10", "Weak"],
        ["server.py", "test_security_hardening (source only)", "30", "Weak"],
        ["reports.py", "test_security_hardening (source only)", "~10", "Very Weak"],
    ],
    col_widths=[90, 120, 55, 80]
))

story.append(h2("7.2 Test Infrastructure"))
story.append(body(
    "Testing uses Python's built-in unittest framework exclusively with 1,449 tests across 31 files. "
    "Mocking is provided by unittest.mock (patch, MagicMock, PropertyMock). No external test "
    "dependencies (pytest, hypothesis) are used. The test runner (run_tests.py) uses "
    "unittest.TestLoader.discover() with TextTestRunner. Test patterns include: unit tests "
    "(~900 methods), integration tests (~135), property-based tests (~58), stress tests (24), "
    "regression tests (~106), and performance benchmarks (16)."
))

# ====== MATURITY SCORES ======
story.append(h1("8. Maturity Scores (Evidence-Based)"))

story.append(make_table(
    ["Dimension", "Score", "Evidence"],
    [
        ["Architecture", "72/100", "Registry pattern, clean Finding contract, but god files and dual engines"],
        ["Security", "65/100", "Strong input validation chain, but shell exec, silent exceptions, auth bypass"],
        ["Performance", "68/100", "Lazy loading, async engine, but O(n^2) attack graph, no connection pooling"],
        ["Scalability", "60/100", "Blitz scan for multi-target, but sequential modules, no distributed mode"],
        ["Reliability", "70/100", "1,449 passing tests, but 120+ silent exception handlers"],
        ["Maintainability", "55/100", "123K LOC, 5 files >2000 lines, 5x code duplication"],
        ["Testing", "75/100", "1,449 tests, 290 security tests, but weak module integration"],
        ["Documentation", "40/100", "8+ docs outdated at v10, several contain false claims"],
        ["AI Maturity", "60/100", "Rule-based AI analyst, knowledge graph, but no actual ML models"],
        ["Overall Engineering", "65/100", "Solid core, needs dedup, docs, and exception hygiene"],
    ],
    col_widths=[80, 55, 285]
))

# ====== REMAINING WORK ======
story.append(h1("9. Remaining Risks and Blockers"))

story.append(make_table(
    ["Priority", "Risk", "Impact", "Effort"],
    [
        ["P0", "120+ silent except:pass handlers", "Hidden bugs, impossible debugging", "3-4 days"],
        ["P1", "Documentation severely outdated (v10->v11)", "User confusion, wrong guidance", "2-3 days"],
        ["P1", "5 god files >2000 LOC need splitting", "Maintainability bottleneck", "2-3 days"],
        ["P1", "_shannon_entropy duplicated in 5 modules", "DRY violation, maintenance risk", "1 day"],
        ["P2", "Three HTTP layers should be unified", "Developer confusion", "2 days"],
        ["P2", "Dual scan engines (sync + async)", "Feature divergence", "3 days"],
        ["P2", "Plugin system has no sandboxing", "Security risk on plugin load", "2 days"],
        ["P2", "No rate limiting on many modules", "Can hammer targets aggressively", "1-2 days"],
        ["P3", "Team 3 audit findings not addressed", "Known vulns persist", "1 day"],
        ["P3", "Fuzzer has no authorization gating", "Offensive capability risk", "1 day"],
        ["P3", "MITRE/CVE databases hardcoded, will stale", "Threat intel decay", "2 days"],
    ],
    col_widths=[35, 200, 110, 55]
))

# ====== STATEMENT ======
story.append(h1("10. Current State"))

story.append(body(
    "<b>ReconPro is currently at Age I (Build Age I).</b>"
))
story.append(body(
    "Wave 0 repository intelligence and Wave 1 infrastructure fixes have been completed. "
    "The codebase is in a measurably better state: all versions are unified, all modules are "
    "registered, critical bugs are fixed, constants are centralized, and all 1,449 tests pass "
    "without regressions. However, significant work remains: the 120+ silent exception handlers, "
    "god files needing refactoring, outdated documentation, and plugin sandboxing are all "
    "outstanding items from Wave 0 intelligence. Wave 2 (AI/Intelligence) and Wave 3 "
    "(Self-Improving Engineering) were not executed in this session, as they depend on a stable "
    "and well-documented Wave 1 foundation."
))
story.append(body(
    "The engineering organization recommends proceeding to Wave 2 (AI Department, Analysis "
    "Department, Correlation Department, Knowledge Department, Prediction Department, Automation "
    "Department) once the Wave 1 remaining items (silent exceptions, god files, documentation) "
    "are addressed. Wave 3 (Self-Improving Engineering) should follow after Wave 2 intelligence "
    "systems are validated."
))

# ====== BUILD ======
doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    topMargin=20*mm, bottomMargin=25*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)

print(f"Report generated: {OUTPUT}")
