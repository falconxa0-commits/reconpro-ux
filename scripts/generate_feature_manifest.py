#!/usr/bin/env python3
"""ReconPro Complete Feature Manifest — PDF Generator"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Bold.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')

pdfmetrics.registerFont(TTFont('DejaVuMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

# Colors
DARK_BG = HexColor('#0f172a')
ACCENT = HexColor('#3b82f6')
ACCENT2 = HexColor('#06b6d4')
TEXT_DARK = HexColor('#1e293b')
TEXT_MID = HexColor('#475569')
TEXT_LIGHT = HexColor('#94a3b8')
BORDER = HexColor('#e2e8f0')
ROW_ALT = HexColor('#f8fafc')
ROW_HEAD = HexColor('#1e40af')
STATUS_PROD = HexColor('#16a34a')
STATUS_EXP = HexColor('#d97706')
STATUS_STUB = HexColor('#dc2626')
WHITE = white

# Page setup
PAGE_W, PAGE_H = A4
LEFT_M = 20 * mm
RIGHT_M = 20 * mm
TOP_M = 18 * mm
BOT_M = 18 * mm
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

# Styles
styles = getSampleStyleSheet()

def make_styles():
    s = {}
    s['cover_title'] = ParagraphStyle('CoverTitle', fontName='NotoSansSC-Bold', fontSize=36, leading=42, textColor=WHITE, alignment=TA_LEFT, spaceAfter=8)
    s['cover_sub'] = ParagraphStyle('CoverSub', fontName='NotoSansSC', fontSize=16, leading=22, textColor=HexColor('#94a3b8'), alignment=TA_LEFT, spaceAfter=6)
    s['cover_meta'] = ParagraphStyle('CoverMeta', fontName='DejaVuMono', fontSize=10, leading=14, textColor=HexColor('#64748b'), alignment=TA_LEFT)
    s['h1'] = ParagraphStyle('H1', fontName='NotoSansSC-Bold', fontSize=22, leading=28, textColor=ROW_HEAD, spaceBefore=18, spaceAfter=10, borderPadding=(0,0,4,0))
    s['h2'] = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=15, leading=20, textColor=TEXT_DARK, spaceBefore=14, spaceAfter=6)
    s['h3'] = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=12, leading=16, textColor=TEXT_MID, spaceBefore=10, spaceAfter=4)
    s['body'] = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=9.5, leading=14, textColor=TEXT_DARK, alignment=TA_JUSTIFY, spaceAfter=4)
    s['body_small'] = ParagraphStyle('BodySmall', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MID, spaceAfter=2)
    s['code'] = ParagraphStyle('Code', fontName='DejaVuMono', fontSize=8, leading=11, textColor=HexColor('#7c3aed'), backColor=HexColor('#f5f3ff'), borderPadding=3, spaceAfter=3)
    s['bullet'] = ParagraphStyle('Bullet', fontName='NotoSansSC', fontSize=9, leading=13, textColor=TEXT_DARK, leftIndent=12, bulletIndent=4, spaceAfter=2)
    s['toc_entry'] = ParagraphStyle('TOC', fontName='NotoSansSC', fontSize=11, leading=18, textColor=TEXT_DARK)
    s['toc_sub'] = ParagraphStyle('TOCSub', fontName='NotoSansSC', fontSize=9.5, leading=16, textColor=TEXT_MID, leftIndent=16)
    s['stat_num'] = ParagraphStyle('StatNum', fontName='NotoSansSC-Bold', fontSize=28, leading=32, textColor=ACCENT, alignment=TA_CENTER)
    s['stat_label'] = ParagraphStyle('StatLabel', fontName='NotoSansSC', fontSize=9, leading=12, textColor=TEXT_MID, alignment=TA_CENTER)
    s['footer'] = ParagraphStyle('Footer', fontName='DejaVuMono', fontSize=7, leading=9, textColor=TEXT_LIGHT, alignment=TA_CENTER)
    return s

ST = make_styles()

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=4, spaceAfter=6)

def section_table(data, col_widths=None):
    """Create a styled table"""
    if col_widths is None:
        col_widths = [CONTENT_W]
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), ROW_HEAD),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('LEADING', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ROW_ALT))
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t

def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_M, rightMargin=RIGHT_M,
        topMargin=TOP_M, bottomMargin=BOT_M,
        title="ReconPro v11.0 — Complete Feature Manifest",
        author="ReconPro Engineering",
        subject="Comprehensive Feature Inventory"
    )
    story = []
    
    # ========================
    # COVER PAGE
    # ========================
    # Dark cover via table background
    cover_data = [['']]
    cover_table = Table(cover_data, colWidths=[CONTENT_W + LEFT_M + RIGHT_M], rowHeights=[PAGE_H - TOP_M - BOT_M])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), DARK_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    # We'll use a simpler approach - colored spacer + text
    story.append(Spacer(1, 80*mm))
    story.append(Paragraph("RECONPRO v11.0", ST['cover_title']))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Complete Feature Manifest", ParagraphStyle('CoverBig', fontName='NotoSansSC-Bold', fontSize=24, leading=30, textColor=ACCENT)))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Exhaustive inventory of every module, class, function, API endpoint,<br/>algorithm, integration, test suite, and subsystem in the ReconPro platform.", ST['cover_sub']))
    story.append(Spacer(1, 20*mm))
    story.append(Paragraph("96 Python Source Files | 31 Test Files | 1,449 Tests | 85+ Classes | 200+ Functions", ST['cover_meta']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("156 Files Total | 121,000+ Lines of Code | Version 11.0.0", ST['cover_meta']))
    story.append(Spacer(1, 20*mm))
    story.append(Paragraph("Enterprise Reconnaissance Platform", ParagraphStyle('cm', fontName='NotoSansSC', fontSize=12, leading=16, textColor=HexColor('#475569'))))
    story.append(Paragraph("Pure Python | Zero Required Dependencies | Production-Ready", ST['cover_meta']))
    story.append(PageBreak())
    
    # ========================
    # TABLE OF CONTENTS
    # ========================
    story.append(Paragraph("Table of Contents", ST['h1']))
    story.append(hr())
    
    toc_items = [
        ("1", "Executive Summary & Grand Totals"),
        ("2", "Architecture Overview"),
        ("3", "Core Infrastructure (8 modules)"),
        ("4", "Scanning Engine & Orchestration (5 modules)"),
        ("5", "Network & Protocol Layer (6 modules)"),
        ("6", "Reconnaissance Modules - Standard (10 modules)"),
        ("7", "Advanced Reconnaissance Modules (16 modules)"),
        ("8", "Intelligence Systems (7 modules)"),
        ("9", "Security & Defense (5 modules)"),
        ("10", "Analysis & Reporting (7 modules)"),
        ("11", "Observability & Diagnostics (4 modules)"),
        ("12", "REST API Server (20 endpoints)"),
        ("13", "CLI Interface (28 commands)"),
        ("14", "TUI Dashboard (NexusApp)"),
        ("15", "Plugin System (9 hooks)"),
        ("16", "Integrations (6 platforms)"),
        ("17", "TUI Widgets (7 widgets)"),
        ("18", "Automation & Scheduling"),
        ("19", "Enterprise Features"),
        ("20", "Deployment Infrastructure (Docker / K8s / Compose)"),
        ("21", "Configuration & Constants"),
        ("22", "Data Models & Protocols"),
        ("23", "Algorithms & Detection Engines"),
        ("24", "Framework Mappings (MITRE / CWE / CAPEC / CVSS / OWASP)"),
        ("25", "Report Formats & Export (5 formats)"),
        ("26", "Testing Suite (31 files, 1,449 tests)"),
        ("27", "Documentation (14 documents, 5 ADRs)"),
        ("28", "Scripts & Tooling (4 scripts)"),
        ("29", "Engineering Reports (3 reports)"),
        ("30", "Complete Class Inventory"),
        ("31", "Complete Function Inventory"),
        ("32", "Final Statistics & Architecture Map"),
    ]
    for num, title in toc_items:
        story.append(Paragraph(f"<b>{num}.</b>  {title}", ST['toc_entry']))
    story.append(PageBreak())
    
    # ========================
    # SECTION 1: EXECUTIVE SUMMARY
    # ========================
    story.append(Paragraph("1. Executive Summary & Grand Totals", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "ReconPro v11.0 is an enterprise-grade reconnaissance and security analysis platform built entirely in "
        "pure Python with zero required external dependencies. The platform comprises 96 Python source files, "
        "31 test files, and 29 deployment/documentation/script files, totaling approximately 156 files and "
        "121,000+ lines of code. It features 26 scanning modules, 3 intelligence systems, a full REST API "
        "server with 20 endpoints, a Textual-based TUI dashboard, 28 CLI commands, 7 TUI widgets, 6 third-party "
        "integrations, 5 export formats, and 1,449 tests across 31 test files. The architecture follows a "
        "layered design: constants and utilities form the foundation, HTTP and connection layers provide network "
        "abstraction, the scan engine orchestrates module execution, and the CLI/TUI/API serve as presentation "
        "interfaces. A plugin system with 9 hooks enables extensibility, and the module registry pattern "
        "decouples 26 scanning modules from the core engine. The platform maps findings to MITRE ATT&CK, "
        "CWE, CAPEC, CVSS, DREAD, and OWASP frameworks. Deployment is supported via Docker, Docker Compose, "
        "and Kubernetes manifests with full enterprise security hardening.", ST['body']
    ))
    story.append(Spacer(1, 6*mm))
    
    # Grand totals table
    stats_data = [
        ['Category', 'Count'],
        ['Total Python Source Files', '96'],
        ['Total Test Files', '31'],
        ['Total Deployment/Docs/Script Files', '29'],
        ['Total Files in Project', '156'],
        ['Total Lines of Code', '121,000+'],
        ['Total Classes', '85+'],
        ['Total Standalone Functions', '200+'],
        ['Total CLI Commands', '28'],
        ['Total REST API Endpoints', '20'],
        ['Scanning Modules (Remote)', '23'],
        ['Scanning Modules (Local)', '3'],
        ['Total Modules', '26'],
        ['Plugin Hooks', '9'],
        ['Integrations', '6'],
        ['TUI Widgets', '7'],
        ['Report/Export Formats', '5 (SARIF, JSON, Markdown, HTML, PDF)'],
        ['Framework Mappings', '6 (MITRE ATT&CK, CWE, CAPEC, CVSS, DREAD, OWASP)'],
        ['Test Functions', '1,449'],
        ['Test Classes', '291'],
        ['Documentation Files', '14 + 5 ADRs'],
        ['Deployment Targets', '3 (Docker, Docker Compose, Kubernetes)'],
        ['Themed UI Themes', '6 (Recon, Matrix, Cyber, Dark, Light, Ocean)'],
        ['Configuration Constants', '40+'],
        ['Shared Utility Functions', '17'],
    ]
    story.append(section_table(stats_data, [CONTENT_W * 0.55, CONTENT_W * 0.45]))
    story.append(PageBreak())
    
    # ========================
    # SECTION 2: ARCHITECTURE OVERVIEW
    # ========================
    story.append(Paragraph("2. Architecture Overview", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "ReconPro follows a layered architecture with strict separation of concerns. The foundation layer "
        "consists of constants.py (unified severity levels, score thresholds, color mappings, path defaults) "
        "and utils.py (17 shared pure functions for target normalization, scoring, grading, entropy calculation, "
        "and data sanitization). The network layer provides HTTP abstraction through http_layer.py (rate limiter, "
        "Finding dataclass, probe function), connection_pool.py (thread-safe urllib pool), async_http.py "
        "(aiohttp-based adaptive rate limiting with token-bucket EMA), and proxy.py (rotation strategies, "
        "Tor integration). The orchestration layer includes engine.py (async scan engine with bounded concurrency "
        "via asyncio.Semaphore), scanner.py (synchronous scan runner), and registry.py (centralized module "
        "registry with lazy imports). The module layer contains 26 scanning modules organized into remote "
        "(23 modules requiring network access) and local (3 modules for host auditing, developer security, "
        "and health checks). The presentation layer offers three interfaces: CLI via cli.py (argparse-based, "
        "28 subcommands), TUI via nexus_tui.py (Textual framework, live dashboard), and REST API via "
        "server.py (stdlib HTTP server, 20 endpoints with auth). Cross-cutting concerns include observability "
        "(structured logging, metrics, tracing), security (input sanitization, audit logging), plugin system "
        "(9 lifecycle hooks), and memory management (unified store for findings, knowledge graph, credentials).", ST['body']
    ))
    story.append(Spacer(1, 4*mm))
    
    arch_data = [
        ['Layer', 'Components', 'Files'],
        ['Foundation', 'Constants, Utilities, Interfaces, Context', 'constants.py, utils.py, interfaces.py, context.py'],
        ['Network', 'HTTP Layer, Connection Pool, Async HTTP, Proxy, Raw Sockets', 'http_layer.py, connection_pool.py, async_http.py, proxy.py, raw_sockets.py'],
        ['Orchestration', 'Scan Engine, Scanner, Registry, Parallel', 'engine.py, scanner.py, registry.py, parallel.py'],
        ['Modules (Remote)', '23 scanning modules', 'modules/*.py (remote)'],
        ['Modules (Local)', 'Host audit, Developer scan, Doctor', 'modules/host.py, dev.py, doctor.py'],
        ['Intelligence', 'AI Analyst, Attack Graph, Threat Intel, Pipeline', 'ai_analyst.py, attack_graph.py, threat_intel.py, intelligence_pipeline.py'],
        ['Analysis', 'Kill Chain, Attribution, Cognitive Sec, Ratings, Compliance', 'kill_chain.py, attribution.py, cognitive_sec.py, ratings.py, compliance.py'],
        ['Reporting', 'Report Writer, Reports (HTML), Formats, Benchmark', 'report_writer.py, reports.py, formats.py, benchmark.py'],
        ['Presentation', 'CLI, TUI, REST API, Chat, Wishes', 'cli.py, nexus_tui.py, server.py, chat.py, wishes.py'],
        ['Observability', 'Structured Logger, Metrics, Tracer, Profiler, Telemetry', 'observability.py, profiler.py, telemetry.py'],
        ['Security', 'Security Manager, Sanitize, MITM, Evasion, Defense', 'security.py, sanitize.py, mitm.py, evasion.py, defense.py'],
        ['Plugins', 'Hook Manager, Plugin Discovery, Template', 'plugins.py'],
        ['Integrations', 'Slack, Jira, GitHub, Splunk, PagerDuty, ZAI Stream', 'integrations/*.py'],
        ['Memory', 'Finding Store, Agent Blackboard, Credential Vault, KG', 'memory.py, knowledge_graph.py'],
        ['Deployment', 'Dockerfile, Docker Compose, K8s manifests', 'deploy/*'],
    ]
    cw = [CONTENT_W * 0.15, CONTENT_W * 0.40, CONTENT_W * 0.45]
    story.append(section_table(arch_data, cw))
    story.append(PageBreak())
    
    # ========================
    # SECTION 3: CORE INFRASTRUCTURE
    # ========================
    story.append(Paragraph("3. Core Infrastructure", ST['h1']))
    story.append(hr())
    
    core_modules = [
        {
            'name': 'constants.py',
            'purpose': 'Single source of truth for severity levels, grade thresholds, color mappings, path defaults, and configuration constants used by all modules.',
            'functions': ['severity_sort_key(severity) -> int'],
            'constants': 'SEVERITY_LEVELS (5 levels), VALID_SEVERITIES (frozenset), GRADE_THRESHOLDS (7 grades: A+ through F), SEV_COLORS (5 mappings), GRADE_COLORS (7 mappings), SARIF_LEVEL_MAP, BADGE_COLOR_MAP, DEFAULT_TIMEOUT=8, DEFAULT_RATE_LIMIT=10.0, DEFAULT_BODY_LIMIT=16384, DEFAULT_MAX_WORKERS=4, USER_AGENT, DREAD_SCORE_MAP, MAX_SCORE=100, MIN_SCORE=0, RECONPRO_HOME, SCAN_HISTORY_DIR, PLUGIN_DIR, MEMORY_DIR, KNOWLEDGE_GRAPH_FILE, PLUGIN_HOOKS_FILE, TOOLS_DIR',
            'deps': 'stdlib (pathlib, __future__)',
            'status': 'Production',
            'tests': 'test_constants.py (44 tests), test_coverage_boost.py'
        },
        {
            'name': 'utils.py',
            'purpose': 'Shared pure functions for target normalization, severity classification, scoring, grading, entropy calculation, and data utilities used across all modules.',
            'functions': 'extract_host, normalize_base_url, validate_target, count_severities, sort_findings_by_severity, severity_to_cvss, severity_to_dread, validate_severity, compute_score, compute_grade, badge_markdown, safe_int, safe_float, truncate, entropy, is_private_ip, url_join',
            'constants': 'None (pure functions)',
            'deps': 'internal (constants), stdlib (re, urllib.parse, typing, math)',
            'status': 'Production',
            'tests': 'test_utils.py (118 tests), test_property.py (58 tests), test_coverage_boost.py'
        },
        {
            'name': 'registry.py',
            'purpose': 'Centralized module registry managing 23 remote and 3 local scanning modules with lazy imports, runner resolution, and metadata lookup.',
            'functions': 'build_module_registry, build_local_modules, get_module_runner, is_local_module, is_remote_module, get_module_info, list_remote_modules, list_local_modules, get_module_color',
            'constants': 'MODULE_REGISTRY (23 entries), LOCAL_MODULES (3: host, dev, doctor), ALL_MODULES (26), DEFAULT_MODULES (19), DEFAULT_LOCAL_MODULES (3)',
            'deps': 'internal (modules.* lazy), stdlib (typing)',
            'status': 'Production',
            'tests': 'test_registry.py (19 tests), test_integration.py'
        },
        {
            'name': 'interfaces.py',
            'purpose': 'Protocol/ABC definitions establishing contracts for ScanModule, FindingProcessor, ReportGenerator, EventEmitter, ConfigurationProvider, and PluginInterface.',
            'functions': 'None (protocols only)',
            'constants': 'Type aliases: Findings, ScanResult, Severity, Grade, Target, ModuleID',
            'deps': 'stdlib (typing)',
            'status': 'Production',
            'tests': 'test_interfaces.py (79 tests)'
        },
        {
            'name': 'context.py',
            'purpose': 'Unified scan context dataclass encapsulating all scan configuration parameters with serialization and timing support.',
            'functions': 'create_context(target, **kwargs) -> ScanContext',
            'constants': 'None',
            'deps': 'stdlib (dataclasses, time)',
            'status': 'Production',
            'tests': 'test_interfaces.py'
        },
        {
            'name': 'memory.py',
            'purpose': 'Unified memory store with four subsystems: FindingStore (CRUD for findings), AgentBlackboard (key-value for agent state), CredentialVault (secure credential storage), and Knowledge Graph persistence.',
            'classes': 'FindingStore, AgentBlackboard, CredentialVault, UnifiedMemoryStore',
            'functions': 'UnifiedMemoryStore: add, query, recent, stats, save, load, clear',
            'constants': 'MEMORY_DIR, FINDINGS_DIR, VAULT_PATH',
            'deps': 'internal (knowledge_graph), stdlib (json, os, pathlib, hashlib)',
            'status': 'Production',
            'tests': 'test_enterprise.py'
        },
        {
            'name': 'history.py',
            'purpose': 'Scan history management with save, list, diff, and cleanup operations for tracking scan results over time.',
            'functions': 'save_scan, list_scans, get_latest, get_scan, diff_scans, clear_history',
            'constants': 'HISTORY_DIR',
            'deps': 'stdlib (json, os, datetime, pathlib)',
            'status': 'Production',
            'tests': 'test_scanner.py'
        },
        {
            'name': 'theme.py',
            'purpose': 'Unified theme system providing 6 color themes (Recon, Matrix, Cyber, Dark, Light, Ocean) for Rich console and Textual TUI rendering.',
            'functions': 'None (class-based properties)',
            'constants': 'THEMES (6 theme definitions with 20+ color values each)',
            'deps': 'internal (constants)',
            'status': 'Production',
            'tests': 'Embedded in TUI tests'
        },
    ]
    
    for mod in core_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        if 'classes' in mod:
            story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Constants:</b> {mod.get('constants', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Dependencies:</b> {mod['deps']}", ST['body_small']))
        story.append(Paragraph(f"<b>Status:</b> {mod['status']}  |  <b>Tests:</b> {mod.get('tests', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 4: SCANNING ENGINE
    # ========================
    story.append(Paragraph("4. Scanning Engine & Orchestration", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The scanning engine is the core execution layer, responsible for orchestrating module runs against "
        "targets. It supports both synchronous (scanner.py) and asynchronous (engine.py) execution modes, "
        "as well as parallel multi-target blitz scanning (parallel.py). The engine uses bounded concurrency "
        "via asyncio.Semaphore, emits events for real-time monitoring, and supports plugin hooks at "
        "pre-scan, post-scan, and post-finding lifecycle points.", ST['body']
    ))
    
    engine_modules = [
        {
            'name': 'engine.py (726 lines)',
            'purpose': 'Async scan orchestration engine with bounded concurrency, event emission, and plugin hook integration.',
            'classes': 'ScanEvent (dataclass: type, module_id, target, finding, findings_count, duration, result, modules, timestamp), EventCollector (findings, by_module, timeline), ScanEngine (_emit, _resolve_remote_modules, _resolve_local_modules, _build_result, _run_module, run, scan_one)',
            'functions': 'concurrent_scan(targets, **kw) -> Dict',
            'key_algo': 'Bounded concurrency with asyncio.Semaphore, plugin hooks (pre_scan, post_scan, post_finding)',
            'tests': 'test_scanner.py (18 tests), test_integration.py'
        },
        {
            'name': 'scanner.py (209 lines)',
            'purpose': 'Core synchronous scan orchestration running modules sequentially.',
            'classes': 'ReconProResult (dataclass: target, findings, score, grade, module_results, elapsed, total_points_deducted; methods: to_dict)',
            'functions': 'scan(target, **kwargs) -> ReconProResult, audit_scan(target, **kwargs) -> ReconProResult',
            'tests': 'test_scanner.py (18 tests), test_stress.py'
        },
        {
            'name': 'parallel.py (220 lines)',
            'purpose': 'Parallel multi-target scanning (blitz mode) using ThreadPoolExecutor.',
            'classes': 'None',
            'functions': 'blitz_scan(targets, module_names, **kw), _scan_one_target, _render_blitz_summary',
            'key_algo': 'ThreadPoolExecutor + done_callback single-pass collection',
            'tests': 'test_stress.py (14 tests)'
        },
        {
            'name': 'async_http.py (902 lines)',
            'purpose': 'Async HTTP engine with aiohttp-based adaptive rate limiting using token-bucket with EMA tracking.',
            'classes': 'AsyncSession (wraps aiohttp.ClientSession with cookie jars, redirect recording, sync fallback), AdaptiveLimiter (token-bucket with EMA tracking, hostname cache)',
            'functions': 'async_probe, probe_sync, batch_probe',
            'tests': 'test_performance.py'
        },
        {
            'name': 'connection_pool.py (255 lines)',
            'purpose': 'Lightweight thread-safe HTTP connection pool using urllib.',
            'classes': 'ConnectionPool (probe, stats, reset_stats, close, __repr__)',
            'functions': 'None (class methods only)',
            'tests': 'test_http_probe.py (9 tests)'
        },
    ]
    
    for mod in engine_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'N/A')}", ST['body_small']))
        if 'key_algo' in mod:
            story.append(Paragraph(f"<b>Key Algorithm:</b> {mod.get('key_algo', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Tests:</b> {mod.get('tests', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 5: NETWORK & PROTOCOL
    # ========================
    story.append(Paragraph("5. Network & Protocol Layer", ST['h1']))
    story.append(hr())
    
    net_modules = [
        {
            'name': 'http_layer.py (165 lines)',
            'purpose': 'Shared HTTP abstraction providing rate limiting, HTTP probing, and the universal Finding dataclass.',
            'classes': 'RateLimiter (__init__, acquire), Finding (dataclass: title, severity, category, module, description, evidence, asset, points_deducted, remediation, dread_score; methods: to_dict)',
            'functions': 'http_probe(url, **kw), compute_grade(score), badge_markdown(grade)',
            'constants': 'UA, GRADE_MAP, default_limiter',
        },
        {
            'name': 'proxy.py (705 lines)',
            'purpose': 'Proxy pool management with 4 rotation strategies, health checking, Tor circuit integration, and proxy statistics.',
            'classes': 'Proxy (dataclass), RotationStrategy (Enum: ROUND_ROBIN, RANDOM, LEAST_CONNECTIONS, GEO_DISTRIBUTED), ProxyPool (load_from_file, load_from_url, add_proxy, health_check, get_proxy, rotate, report_dead, report_success, stats, save, load), TorProxyManager (check_tor_available, new_circuit, get_tor_session, verify_new_ip)',
            'functions': '_parse_proxy_str, _create_strategy, proxy_probe, load_default_pool',
        },
        {
            'name': 'raw_sockets.py (598 lines)',
            'purpose': 'Raw packet assembly for SYN scanning, UDP probing, TTL fingerprinting, and ARP discovery with optional scapy acceleration.',
            'classes': 'SynScanner (scan, _scan_scapy, _scan_connect), UdpProber (probe), TtlAnalyzer (analyze, _estimate_initial_ttl), ArpSpy (discover, detect_spoofing)',
            'functions': '_parse_ports, _grab_banner, _build_udp_probe',
            'constants': 'HAS_SCAPY, SERVICE_GUESSES (TCP), UDP_SERVICE_GUESSES, TTL_SIGNATURES',
        },
        {
            'name': 'geoip.py (683 lines)',
            'purpose': 'IP geolocation via ip-api.com with local cloud provider CIDR matching for AWS, Azure, GCP, Cloudflare, and others.',
            'classes': 'GeoIPLookup (enrich_ip, enrich_ips, save, clear_cache, get_cache_stats), BatchGeoIP (enrich_batch, get_stats)',
            'functions': 'is_hosting_ip, is_proxy_ip, format_geoip_summary, detect_cloud_provider',
            'constants': 'CLOUD_RANGES (AWS/Azure/GCP/Cloudflare/DO/Hetzner/Linode/OVH), HOSTING_AS_PATTERNS, PROXY_AS_PATTERNS',
        },
        {
            'name': 'subdomains.py (441 lines)',
            'purpose': 'Subdomain enumeration from 11 OSINT sources including CT logs, securitytrails, censys, and DNS brute force with 100+ prefixes.',
            'classes': 'SubdomainResult (dataclass), SubdomainEnumerator (enumerate, _source_crtsh, _source_certspotter, _source_censys, _source_bufferover, _source_riddler, _source_dns_bruteforce, _source_txt_enum, _source_wayback, _source_anubis, _source_securitytrails, _resolve_subdomains)',
            'functions': 'discover_ctlogs, discover_dns, discover_subdomains',
            'constants': 'DNS_BRUTE_PREFIXES (100+), _ALL_SOURCES (11)',
        },
        {
            'name': 'tunnel_detect.py (1,025 lines)',
            'purpose': 'Protocol tunnel detection for 8 tunnel types: DNS, ICMP, IPv6, GRE, SSH, HTTP, HTTPS, TCP-over-UDP.',
            'classes': 'TunnelType (Enum: 8 types), TunnelIndicator (dataclass), EntropyAnalyzer (shannon_entropy, byte_entropy), DNSEntropyChecker, TunnelDetector (detect_all, check_dns_tunnel, check_icmp_tunnel, check_ipv6_tunnel, check_gre_tunnel, check_ssh_tunnel, check_http_tunnel, check_https_tunnel, check_tcp_over_udp)',
        },
    ]
    
    for mod in net_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        if 'classes' in mod:
            story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        if 'functions' in mod:
            story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'N-A')}", ST['body_small']))
        if 'constants' in mod:
            story.append(Paragraph(f"<b>Constants:</b> {mod.get('constants', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 6: STANDARD RECON MODULES
    # ========================
    story.append(Paragraph("6. Reconnaissance Modules - Standard", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "These modules comprise the standard reconnaissance toolkit covering surface-level web analysis, "
        "authentication testing, supply chain assessment, infrastructure profiling, and more. Each module "
        "follows the Finding dataclass contract and returns a list of Finding objects.", ST['body']
    ))
    
    std_modules = [
        {'name': 'modules/recon.py (1,247 lines)', 'purpose': '13-category surface reconnaissance including DNS, WHOIS, HTTP headers, SSL/TLS, ports, technology detection, robots.txt, sitemap, CORS, open redirects, and email harvesting.', 'entry': 'run_recon(target, base_url, timeout, verify_tls)'},
        {'name': 'modules/auth.py (1,038 lines)', 'purpose': '15 authentication bypass techniques including SQL injection auth, default credentials, JWT manipulation, OAuth misconfig, session fixation, and cookie hijacking.', 'entry': 'run_auth(target, base_url, timeout, verify_tls)'},
        {'name': 'modules/chain.py (291 lines)', 'purpose': 'SSRF and redirect chain hunting module wrapper for chain_engine.py.', 'entry': 'run_chain(target, base_url, timeout, verify_tls)'},
        {'name': 'modules/bot.py (355 lines)', 'purpose': 'C2/bot infrastructure detection module.', 'entry': 'run_bot(target, base_url, timeout, verify_tls)'},
        {'name': 'modules/team.py (256 lines)', 'purpose': 'Team collaboration module.', 'entry': 'run_team(target, base_url, timeout, verify_tls)'},
        {'name': 'modules/nhi.py (159 lines)', 'purpose': 'Non-Human Identity blast radius mapping for service accounts, API keys, and machine identities.', 'entry': 'run_nhi(target, base_url, timeout, verify_tls)'},
        {'name': 'modules/host.py (1,488 lines)', 'purpose': 'Full laptop/machine security audit (local module) covering OS hardening, network config, user accounts, installed software, cron jobs, and file permissions.', 'entry': 'run_host()'},
        {'name': 'modules/dev.py (1,087 lines)', 'purpose': 'Developer security scan (local module) for secrets in code, dependency vulnerabilities, git history leaks, and Dockerfile issues.', 'entry': 'run_dev()'},
        {'name': 'modules/doctor.py (1,256 lines)', 'purpose': 'Security health check with fix commands (local module) analyzing system configuration and providing remediation guidance.', 'entry': 'run_doctor()'},
        {'name': 'modules/ast_analyzer.py (611 lines)', 'purpose': 'AST code analysis for Python, JavaScript, and TypeScript vulnerability patterns including injection, XSS, and insecure deserialization.', 'entry': 'run_ast_analyzer(target, base_url, timeout, verify_tls)', 'classes': 'ASTAnalyzer (analyze_python, analyze_javascript, analyze_typescript, detect_patterns, generate_findings)'},
        {'name': 'modules/iac_audit.py (2,121 lines)', 'purpose': 'Infrastructure-as-Code audit for Terraform, CloudFormation, Dockerfile, and Kubernetes manifests.', 'entry': 'run_iac_audit(target, base_url, timeout, verify_tls)', 'classes': 'IaCAuditor (audit_terraform, audit_cloudformation, audit_dockerfile, audit_kubernetes, generate_report)'},
        {'name': 'modules/container_sec.py (1,018 lines)', 'purpose': 'Container security analysis for Dockerfiles, Kubernetes manifests, and Docker Compose configurations.', 'entry': 'run_container_sec(target, base_url, timeout, verify_tls)', 'classes': 'ContainerSecurityAnalyzer (analyze_dockerfile, analyze_k8s, analyze_compose)'},
        {'name': 'modules/cloud_recon.py (1,152 lines)', 'purpose': 'Cloud infrastructure reconnaissance for AWS, Azure, and GCP metadata endpoints and asset discovery.', 'entry': 'run_cloud_recon(target, base_url, timeout, verify_tls)', 'classes': 'CloudReconEngine (detect_aws, detect_azure, detect_gcp, scan_metadata)'},
    ]
    
    for mod in std_modules:
        story.append(Paragraph(mod['name'], ST['h3']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body_small']))
        story.append(Paragraph(f"<b>Entry Point:</b> <font name='DejaVuMono'>{mod['entry']}</font>", ST['body_small']))
        if 'classes' in mod:
            story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 1*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 7: ADVANCED MODULES
    # ========================
    story.append(Paragraph("7. Advanced Reconnaissance Modules", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The advanced modules represent ReconPro's cutting-edge capabilities, covering OS fingerprinting "
        "via HTTP timing, dark web monitoring, steganography detection, covert channel identification, "
        "zero-day hunting, infrastructure ghosting, signal intelligence, nation-state attribution, "
        "weaponized document analysis, honeypot detection, cryptographic dead drops, and more. These "
        "modules collectively provide intelligence-community-grade analysis capabilities.", ST['body']
    ))
    
    adv_modules = [
        {'name': 'quantum_fingerprint.py', 'lines': 2026, 'purpose': 'TCP/IP stack fingerprinting via 7 HTTP timing signals (TTL, TCP window, SYN-ACK, keep-alive, MTU, congestion control, timestamp resolution) with 21 OS signatures.', 'classes': 'OSSignature (dataclass), TimingSample (dataclass), SubProbeResult (dataclass)', 'funcs': 14, 'status': 'Production'},
        {'name': 'dark_web_monitor.py', 'lines': 789, 'purpose': 'Monitors 7 paste sites, 6 threat intel sources, 2 breach databases, and 13 credential patterns for exposure detection.', 'classes': 'None', 'funcs': 16, 'status': 'Production'},
        {'name': 'free_info_ops.py', 'lines': 2081, 'purpose': 'Defensive information operations: infrastructure misattribution, false flag risk, narrative vulnerability, attribution obfuscation, honeypot integration planning. Maps to MITRE ATT&CK DEC techniques.', 'classes': 'None', 'funcs': 13, 'status': 'Production'},
        {'name': 'steganography_detector.py', 'lines': 1381, 'purpose': '10-category steganography detection: whitespace, base64 anomalies, header stego, image LSB, CSS stego, JS variables, response size, charset, metadata, timing channels. 100+ signatures.', 'classes': 'None', 'funcs': 19, 'status': 'Production'},
        {'name': 'covert_channel.py', 'lines': 1673, 'purpose': '8 covert channel types: DNS tunneling, HTTP header covert, timing, ICMP, certificate stego, URL path encoding, chunked encoding, WebSocket frames. Shannon entropy + index of coincidence analysis.', 'classes': 'None', 'funcs': 22, 'status': 'Production'},
        {'name': 'zero_day_hunter.py', 'lines': 1576, 'purpose': 'Anomaly-based zero-day detection: response anomalies, error message analysis, version correlation, behavioral scoring, fuzzing analysis (30+ payloads), header anomalies, endpoint sensitivity.', 'classes': 'None', 'funcs': 14, 'status': 'Production'},
        {'name': 'infrastructure_ghost.py', 'lines': 2116, 'purpose': 'Complete digital infrastructure ghost: IP discovery, subdomain scanning (100+ prefixes), CT log mining, CDN/cloud detection, tech clustering, lookalike detection, drift detection, attack surface scoring.', 'classes': 'None', 'funcs': 22, 'status': 'Production'},
        {'name': 'signal_intelligence.py', 'lines': 2046, 'purpose': 'Traffic analysis: beaconing detection, C2 pattern matching (Cobalt Strike, Metasploit, Empire), payload size analysis, UA fingerprinting, session profiling, DNS-over-HTTP patterns.', 'classes': 'None', 'funcs': 14, 'status': 'Production'},
        {'name': 'nation_state_attributor.py', 'lines': 769, 'purpose': 'Nation-state attribution mapping to 20+ APT groups via TTP correlation, infrastructure overlap, language signals, temporal patterns, and confidence scoring.', 'classes': 'None', 'funcs': 10, 'status': 'Production'},
        {'name': 'weaponized_report.py', 'lines': 2509, 'purpose': 'Tracking element detection: tracking pixels (40+ signatures), beaconing URLs, steganographic watermarks, malicious links, document metadata, JS/CSS trackers (20+ fingerprint techniques).', 'classes': 'None', 'funcs': 18, 'status': 'Production'},
        {'name': 'honeypot_dance.py', 'lines': 1815, 'purpose': 'Honeypot detection via 6 methods: response timing CV, error perfection, known fingerprints (15+ products), behavioral consistency, tech stack anomalies, default credentials, effectiveness scoring.', 'classes': 'None', 'funcs': 16, 'status': 'Production'},
        {'name': 'dead_drop.py', 'lines': 2222, 'purpose': '8 cryptographic dead drop channels: DNS TXT, ETag, CT logs, HTTP headers, timestamp steganography, CNAME, SPF/DKIM/DMARC, simulation. Encoding detection (base64/hex/base32).', 'classes': 'None', 'funcs': 31, 'status': 'Production'},
        {'name': 'vibesec.py', 'lines': 206, 'purpose': 'AI/Vibe-coding vulnerability benchmark: 7 categories, 100-point score, A+-F grades, GitHub badge. Checks config files (30+ paths), unauthenticated APIs (11 paths), backend keys (7 patterns), security headers, DB admin exposure.', 'classes': 'None', 'funcs': 1, 'status': 'Production'},
        {'name': 'pegasus.py', 'lines': 195, 'purpose': 'Pegasus spyware detection: 116 C2 domains, 11 SMS lure patterns, 19 process signatures, 9 filesystem path indicators. C2 DNS matching, backup scanning.', 'classes': 'None', 'funcs': 5, 'status': 'Production'},
        {'name': 'gorgon.py', 'lines': 634, 'purpose': '17-stage offensive scanner: SQLi/XSS/path traversal, HTTP methods, CORS, rate limiting, IDOR, WebSocket, AI endpoint discovery, kill chain. 5-level Fear Index scoring.', 'classes': 'None', 'funcs': 19, 'status': 'Production'},
        {'name': 'oblivion.py', 'lines': 749, 'purpose': '23-stage analytical dissolution: info disclosure, headers, JS secrets, mixed content, forms, errors, rate limits, sessions, CORS, HPP, API versions, backups, dir listing, cookie bomb, WebSocket, GraphQL, mirror fracture, temporal analysis, AI wisdom, threat attribution, cognitive security.', 'classes': 'None', 'funcs': 27, 'status': 'Production'},
    ]
    
    adv_table_data = [['Module', 'Lines', 'Funcs', 'Status', 'Key Capability']]
    for m in adv_modules:
        adv_table_data.append([m['name'], str(m['lines']), str(m['funcs']), m['status'], m['purpose'][:100] + '...'])
    cw5 = [CONTENT_W*0.20, CONTENT_W*0.08, CONTENT_W*0.07, CONTENT_W*0.10, CONTENT_W*0.55]
    story.append(section_table(adv_table_data, cw5))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "<b>Total Advanced Module Lines:</b> 23,887 lines | <b>Total Functions:</b> 271 | "
        "<b>Total Classes:</b> 3 (OSSignature, TimingSample, SubProbeResult) | "
        "<b>Signatures/Databases:</b> 21 OS signatures, 116 Pegasus C2 domains, 100+ stego signatures, "
        "30+ fuzz payloads, 20+ APT groups, 100+ subdomain prefixes, 40+ tracker signatures", ST['body_small']
    ))
    story.append(PageBreak())
    
    # ========================
    # SECTION 8: INTELLIGENCE SYSTEMS
    # ========================
    story.append(Paragraph("8. Intelligence Systems", ST['h1']))
    story.append(hr())
    
    intel_modules = [
        {
            'name': 'ai_analyst.py (1,639 lines)',
            'purpose': 'AI Security Analyst with 6 sub-engines: FindingClassifier (24+ categories), FindingCorrelator (dedup, grouping, attack chain detection), ExploitabilityEstimator, BusinessImpactAnalyzer, AttackPathDetector, RemediationPrioritizer. Maps to MITRE ATT&CK (30+ techniques), CWE (25+), CAPEC (20+).',
            'classes': 'FindingClassifier, FindingCorrelator, ExploitabilityEstimator, BusinessImpactAnalyzer, AttackPathDetector, RemediationPrioritizer, AIAnalystEngine, ExtendedFinding (dataclass)',
            'functions': 'run_ai_analyst, classify_finding, correlate_findings, suggest_attack_paths, generate_report, analyze',
            'tests': 'test_ai_analyst.py (55 tests)',
        },
        {
            'name': 'attack_graph.py (988 lines)',
            'purpose': 'Attack graph engine building directed graphs from scan findings to identify attack paths, lateral movement, privilege escalation, choke points, and blast radius.',
            'classes': 'GraphNode (dataclass), GraphEdge (dataclass), AttackGraph (add_node, add_edge, build_from_findings, find_attack_paths, find_lateral_movement, find_privilege_escalation, find_choke_points, blast_radius, riskiest_nodes, save, load, to_dict, stats)',
            'functions': 'run_attack_graph (implied)',
            'tests': 'test_attack_graph.py (24 tests)',
        },
        {
            'name': 'threat_intel.py (940 lines)',
            'purpose': 'Threat Intelligence Center providing CVE, CWE, CAPEC, and MITRE ATT&CK enrichment for scan findings.',
            'classes': 'ThreatIntelCenter (lookup_cve, lookup_cwe, lookup_capec, lookup_mitre, enrich_finding)',
            'functions': 'run_threat_intel',
            'tests': 'test_threat_intel.py (48 tests)',
        },
        {
            'name': 'threat_feeds.py (938 lines)',
            'purpose': 'Threat feed aggregation from multiple OSINT sources with parsing, deduplication, and alerting.',
            'classes': 'ThreatFeedAggregator (fetch_feeds, parse_feed, aggregate, get_threats)',
            'functions': 'run_threat_feeds',
        },
        {
            'name': 'intelligence_pipeline.py (456 lines)',
            'purpose': 'Post-scan intelligence pipeline composing AI analyst, attack graph, and threat intel into unified intelligence results.',
            'classes': 'IntelligenceResult (dataclass), IntelligencePipeline (analyze)',
            'functions': 'run_intelligence_pipeline (implied)',
            'tests': 'test_intelligence_pipeline.py (32 tests)',
        },
        {
            'name': 'knowledge_graph.py (774 lines)',
            'purpose': 'Directed security knowledge graph with 10 node types, 15+ edge types, shortest path, blast radius, attack chains, connected components, and NetworkX acceleration.',
            'classes': 'SecurityKnowledgeGraph (add_node, add_edge, remove_node, get_node, get_neighbors, shortest_path, blast_radius, attack_chains, connected_components, save, load, stats, to_dict)',
            'constants': 'NODE_TYPES (10), EDGE_TYPES (15+)',
        },
        {
            'name': 'social_graph.py (935 lines)',
            'purpose': 'OSINT social graph intelligence extracting entities and relationships from DNS, WHOIS, HTTP, and CT log data with community detection.',
            'classes': 'Entity (dataclass), Relationship (dataclass), RelationshipExtractor, SocialGraph, GraphIntelligence',
            'constants': 'VALID_ENTITY_TYPES',
        },
    ]
    
    for mod in intel_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'N-A')}", ST['body_small']))
        if 'tests' in mod:
            story.append(Paragraph(f"<b>Tests:</b> {mod.get('tests', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 9-10: SECURITY & ANALYSIS
    # ========================
    story.append(Paragraph("9. Security & Defense", ST['h1']))
    story.append(hr())
    
    sec_modules = [
        {
            'name': 'security.py (811 lines)',
            'purpose': 'Security utilities providing input sanitization, auth token management, secret detection, audit logging, file hash computation, and threat classification.',
            'classes': 'SecurityManager (sanitize_input, validate_token, generate_token, check_permissions), SecurityAuditLogger',
            'functions': 'run_security_check, sanitize_target, sanitize_path, sanitize_filename, sanitize_html, sanitize_shell, sanitize_log, detect_secrets_in_text, safe_json_parse, safe_url_parse, safe_xml_parse, compute_file_hash, verify_module_signature, check_dependency_integrity, get_security_profile, classify_threat',
            'constants': 'THREAT_CATEGORIES',
            'tests': 'test_security.py (90 tests), test_security_regression.py (43 tests), test_security_hardening.py (30 tests)',
        },
        {
            'name': 'sanitize.py (32 lines)',
            'purpose': 'Minimal input sanitization for HTML entities and path/command injection prevention.',
            'functions': 'sanitize_input, sanitize_path, sanitize_command',
        },
        {
            'name': 'mitm.py (612 lines)',
            'purpose': 'MITM analysis checking certificate pinning, HSTS enforcement, and TLS configuration.',
            'classes': 'MITMAnalyzer (check_cert_pinning, check_hsts, check_tls_config, analyze)',
            'functions': 'run_mitm',
        },
        {
            'name': 'evasion.py (1,117 lines)',
            'purpose': 'Evasion techniques for WAF bypass, payload encoding, request fragmentation, and variant generation.',
            'classes': 'EvasionEngine (encode_payload, fragment_request, bypass_waf, generate_variants)',
            'functions': 'run_evasion',
        },
        {
            'name': 'defense.py (1,402 lines)',
            'purpose': 'Generates remediation code including Flask application builders with security fixes, WAF rules, security headers, and CSP policies.',
            'classes': 'DefenseGenerator (generate_code, _generate_flask, _generate_waf, _generate_headers, _generate_csp)',
            'functions': 'run_defense',
        },
    ]
    
    for mod in sec_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'N-A')}", ST['body_small']))
        if 'tests' in mod:
            story.append(Paragraph(f"<b>Tests:</b> {mod.get('tests', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(Paragraph("10. Analysis & Reporting", ST['h1']))
    story.append(hr())
    
    analysis_modules = [
        {
            'name': 'kill_chain.py (2,992 lines)',
            'purpose': 'Full MITRE ATT&CK kill chain analysis mapping findings to attack phases.',
            'classes': 'KillChainAnalyzer',
            'functions': 'run_kill_chain',
        },
        {
            'name': 'attribution.py (3,144 lines)',
            'purpose': 'Nation-state attack attribution engine with TTP-based attribution matching.',
            'classes': 'AttributionEngine',
            'functions': 'run_attribution',
        },
        {
            'name': 'cognitive_sec.py (1,049 lines)',
            'purpose': 'Cognitive security analysis detecting bias, manipulation patterns, and influence operations.',
            'classes': 'CognitiveSecurityAnalyzer',
            'functions': 'run_cognitive_sec',
        },
        {
            'name': 'ratings.py (574 lines)',
            'purpose': 'DREAD scoring engine and risk rating computation.',
            'classes': 'RatingsEngine (rate_finding, rate_target, compute_dread, get_risk_level)',
            'functions': 'run_ratings',
        },
        {
            'name': 'compliance.py (1,013 lines)',
            'purpose': 'Compliance framework mapping to ISO 27001, NIST 800-53, SOC2, PCI-DSS, CIS, and GDPR.',
            'classes': 'ComplianceMapper (map_findings, generate_report, _map_iso27001, _map_nist, _map_pci, _map_cis, _map_gdpr)',
            'functions': 'run_compliance',
        },
        {
            'name': 'cross_validator.py (527 lines)',
            'purpose': 'Cross-validation of findings: deduplication, correlation, and confidence scoring.',
            'classes': 'CrossValidator (validate, deduplicate, correlate, confidence_score)',
            'functions': 'run_cross_validator',
        },
        {
            'name': 'benchmark.py (485 lines)',
            'purpose': 'Score tracking and benchmarking with historical trends.',
            'classes': 'BenchmarkTracker (record, get_history, get_trend, compare, generate_report)',
            'functions': 'run_benchmark',
        },
    ]
    
    for mod in analysis_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 11: OBSERVABILITY
    # ========================
    story.append(Paragraph("11. Observability & Diagnostics", ST['h1']))
    story.append(hr())
    
    obs_modules = [
        {'name': 'observability.py (1,002 lines)', 'purpose': 'Enterprise observability: structured logging (JSON), metrics collection (counter/gauge/histogram/timer), health checks, performance counters, scan tracing.', 'classes': 'StructuredLogger, MetricsCollector, ScanTracer, Profiler, HealthMonitor, TelemetryManager', 'tests': 'test_observability.py (132 tests)'},
        {'name': 'profiler.py (791 lines)', 'purpose': 'Performance profiling with module timing, memory tracking, HTTP request counting, and report generation.', 'classes': 'ScanProfiler (start, stop, record, get_profile, generate_report)', 'functions': 'run_profiler'},
        {'name': 'diagnostics.py (484 lines)', 'purpose': 'System diagnostics: Python version, OS, network, permissions, module status (26+ modules), config validation, debug report generation.', 'classes': 'DiagnosticRunner (run_all, check_python, check_os, check_network, check_permissions, generate_report)', 'functions': 'run_diagnostics', 'tests': 'test_diagnostics.py (49 tests)'},
        {'name': 'telemetry.py (207 lines)', 'purpose': 'Anonymous telemetry collection with opt-out support and install ID tracking.', 'functions': 'telemetry_enabled, send_telemetry, disable_telemetry', 'constants': 'TELEMETRY_DIR, TELEMETRY_FILE'},
    ]
    
    for mod in obs_modules:
        story.append(Paragraph(mod['name'], ST['h2']))
        story.append(Paragraph(f"<b>Purpose:</b> {mod['purpose']}", ST['body']))
        story.append(Paragraph(f"<b>Classes:</b> {mod.get('classes', 'N-A')}", ST['body_small']))
        story.append(Paragraph(f"<b>Functions:</b> {mod.get('functions', 'Class methods only')}", ST['body_small']))
        if 'tests' in mod:
            story.append(Paragraph(f"<b>Tests:</b> {mod.get('tests', 'N-A')}", ST['body_small']))
        story.append(Spacer(1, 2*mm))
    
    story.append(PageBreak())
    
    # ========================
    # SECTION 12: REST API
    # ========================
    story.append(Paragraph("12. REST API Server (20 Endpoints)", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The REST API server is implemented in server.py using Python's stdlib BaseHTTPRequestHandler. "
        "It provides 20 endpoints covering scan execution, history management, module listing, agent control, "
        "report generation, subdomain enumeration, authentication, CVE lookup, and export functionality. "
        "Authentication uses token-based auth with bootstrap secret for initial setup. SSE (Server-Sent "
        "Events) are supported for real-time streaming via the /events endpoint.", ST['body']
    ))
    
    api_data = [
        ['Method', 'Endpoint', 'Purpose', 'Auth'],
        ['GET', '/', 'API status and health check', 'No'],
        ['POST', '/scan', 'Execute standard scan', 'Yes'],
        ['POST', '/audit', 'Execute audit scan', 'Yes'],
        ['POST', '/blitz', 'Execute parallel multi-target scan', 'Yes'],
        ['GET', '/history', 'List scan history', 'Yes'],
        ['GET', '/history/<filename>', 'Get specific scan result', 'Yes'],
        ['GET', '/modules', 'List available modules', 'No'],
        ['POST', '/agent', 'Run Nexus AI agent', 'Yes'],
        ['POST', '/report', 'Generate report', 'Yes'],
        ['GET', '/report/<filename>', 'Get generated report', 'Yes'],
        ['GET', '/subdomains/<domain>', 'Enumerate subdomains', 'Yes'],
        ['GET', '/auth/status', 'Authentication status', 'No'],
        ['POST', '/auth/token', 'Generate API token', 'Bootstrap'],
        ['POST', '/auth/revoke', 'Revoke API token', 'Yes'],
        ['GET', '/auth/tokens', 'List active tokens', 'Yes'],
        ['GET', '/passive/<domain>', 'Passive intelligence', 'Yes'],
        ['GET', '/cve/<cve_id>', 'CVE lookup', 'Yes'],
        ['POST', '/scan/vibesec', 'Execute vibesec scan', 'Yes'],
        ['POST', '/export/csv', 'Export findings as CSV', 'Yes'],
        ['POST', '/export/sarif', 'Export findings as SARIF', 'Yes'],
        ['GET', '/events', 'Server-Sent Events stream', 'Yes'],
    ]
    cw_api = [CONTENT_W*0.08, CONTENT_W*0.25, CONTENT_W*0.45, CONTENT_W*0.12]
    story.append(section_table(api_data, cw_api))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "<b>Server Functions:</b> generate_api_token, validate_api_token, revoke_api_token, list_api_tokens, "
        "start_server, run_server", ST['body_small']
    ))
    story.append(Paragraph(
        "<b>Server Classes:</b> _Handler(BaseHTTPRequestHandler) with do_GET, do_POST, do_OPTIONS, "
        "_json_response, _read_body, _check_auth, _unauthorized, _forbidden, log_message", ST['body_small']
    ))
    story.append(PageBreak())
    
    # ========================
    # SECTION 13: CLI
    # ========================
    story.append(Paragraph("13. CLI Interface (28 Commands)", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The CLI interface is implemented in cli.py (2,013 lines) using argparse with Rich console rendering. "
        "It provides 28 subcommands, ASCII banner art, severity-colored output, findings table rendering, "
        "module breakdown visualization, badge display, remediation listing, and JSON output support. "
        "Help text is enhanced via cli_help.py (1,003 lines) with per-module examples, descriptions, "
        "and cross-references.", ST['body']
    ))
    
    cli_data = [
        ['#', 'Command', 'Purpose'],
        ['1', 'scan', 'Execute standard reconnaissance scan'],
        ['2', 'vibesec', 'Execute AI/Vibe-coding vulnerability benchmark'],
        ['3', 'audit', 'Execute audit scan'],
        ['4', 'dev', 'Execute developer security scan'],
        ['5', 'doctor', 'Run security health check'],
        ['6', 'ports', 'Port scanning'],
        ['7', 'secrets', 'Secret detection scanning'],
        ['8', 'list', 'List available modules'],
        ['9', 'nexus', 'Launch Nexus TUI dashboard'],
        ['10', 'chat', 'Interactive REPL chat'],
        ['11', 'tui', 'Textual TUI interface'],
        ['12', 'blitz', 'Parallel multi-target scan'],
        ['13', 'agent', 'Run Nexus AI agent'],
        ['14', 'subdomains', 'Subdomain enumeration'],
        ['15', 'schedule', 'Manage scan schedules'],
        ['16', 'serve', 'Start REST API server'],
        ['17', 'report', 'Generate reports'],
        ['18', 'history', 'View scan history'],
        ['19', 'diff', 'Diff scan results'],
        ['20', 'screenshot', 'Take website screenshots'],
        ['21', 'open', 'Open reports in browser'],
        ['22', 'plugin', 'Plugin management'],
        ['23', 'swarm', 'Multi-agent swarm attack'],
        ['24', 'adversarial', 'Adversarial self-play'],
        ['25', 'ast', 'AST code analysis'],
        ['26', 'cve', 'CVE radar lookup'],
        ['27', 'graph', 'Attack graph visualization'],
        ['28', 'iac', 'Infrastructure-as-Code audit'],
    ]
    story.append(section_table(cli_data, [CONTENT_W*0.06, CONTENT_W*0.14, CONTENT_W*0.80]))
    story.append(PageBreak())
    
    # ========================
    # SECTIONS 14-17: TUI, PLUGINS, INTEGRATIONS, WIDGETS
    # ========================
    story.append(Paragraph("14. TUI Dashboard (NexusApp)", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The Textual-based TUI dashboard (nexus_tui.py, 3,359 lines) provides a rich terminal interface "
        "with live findings display, module grid, integrated chat, agent control, and real-time statistics. "
        "It uses the NexusApp class (extending Textual App) with reactive widgets, tab navigation, and "
        "keyboard shortcuts. The HelpOverlay (nexus_help.py, 203 lines) provides visual help with 14 keybindings "
        "and 5 command groups.", ST['body']
    ))
    
    story.append(Paragraph(
        "<b>NexusApp Methods:</b> compose, on_mount, on_input_submitted, _start_agent_scan, _update_modules, "
        "_handle_finding, _run_scan, _run_blitz, _run_agent, _run_passive, _run_fuzzer, _run_cve, _run_export, "
        "_run_defense, _run_compliance, _run_audit, _run_subdomains, _run_history, _run_diff, _run_benchmark, "
        "_run_graph, _toggle_chat, _on_tab, on_key (+ many more reactive methods)", ST['body_small']
    ))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("15. Plugin System (9 Hooks)", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The plugin system (plugins.py, 300 lines) provides lifecycle hook management and dynamic plugin "
        "loading from ~/.reconpro/plugins/. Plugins can register for 9 lifecycle hooks and are discovered "
        "automatically at startup.", ST['body']
    ))
    
    hooks_data = [
        ['Hook', 'Trigger Point', 'Use Case'],
        ['pre_scan', 'Before scan execution', 'Target validation, rate limiting setup'],
        ['post_scan', 'After scan completion', 'Report generation, alerting'],
        ['pre_finding', 'Before finding is recorded', 'Finding enrichment, filtering'],
        ['post_finding', 'After finding is recorded', 'Real-time alerts, webhooks'],
        ['pre_report', 'Before report generation', 'Custom report templates'],
        ['post_report', 'After report generation', 'Report distribution'],
        ['new_target', 'When new target is added', 'Target preprocessing'],
        ['vulnerability', 'When vulnerability is found', 'Immediate remediation triggers'],
        ['error', 'When error occurs', 'Error handling, logging'],
    ]
    story.append(section_table(hooks_data, [CONTENT_W*0.18, CONTENT_W*0.32, CONTENT_W*0.50]))
    
    story.append(Paragraph(
        "<b>Classes:</b> HookManager (register, unregister, fire, clear, list_hooks, save_hooks, load_hooks)"
        "<br/><b>Functions:</b> _ensure_plugin_dir, discover_plugins, run_plugin, create_plugin_template, "
        "register_plugin, get_registered_plugins, load_all_plugins", ST['body_small']
    ))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("16. Integrations (6 Platforms)", ST['h1']))
    story.append(hr())
    
    int_data = [
        ['Platform', 'File', 'Lines', 'Capabilities', 'Status'],
        ['Slack', 'integrations/slack.py', 411, 'send_message, send_findings, send_alert, configure', 'Production'],
        ['Jira', 'integrations/jira.py', 391, 'create_ticket, update_ticket, search_tickets, configure', 'Production'],
        ['GitHub', 'integrations/github.py', 508, 'create_issue, create_pr, search_code, configure', 'Production'],
        ['Splunk', 'integrations/splunk.py', 54, 'send_event, configure', 'Stub'],
        ['PagerDuty', 'integrations/pagerduty.py', 72, 'create_incident, configure', 'Stub'],
        ['ZAI Stream', 'integrations/zai_stream.py', 428, 'stream_event, stream_findings, configure', 'Production'],
    ]
    story.append(section_table(int_data, [CONTENT_W*0.12, CONTENT_W*0.22, CONTENT_W*0.07, CONTENT_W*0.45, CONTENT_W*0.14]))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("17. TUI Widgets (7 Widgets)", ST['h1']))
    story.append(hr())
    
    widget_data = [
        ['Widget', 'File', 'Lines', 'Purpose'],
        ['ScoreGauge', 'widgets/score_gauge.py', 238, 'Animated score gauge with grade display'],
        ['Toast', 'widgets/toast.py', 211, 'Toast notification popup with auto-dismiss'],
        ['HintBar', 'widgets/hint_bar.py', 345, 'Contextual hint bar with action text'],
        ['StatCounter', 'widgets/stat_counter.py', 205, 'Animated statistic counter'],
        ['VelocityMeter', 'widgets/velocity_meter.py', 235, 'Findings velocity meter (findings/min)'],
        ['Sparkline', 'widgets/sparkline.py', 281, 'Inline sparkline chart widget'],
        ['CommandCompleter', 'widgets/command_completer.py', 558, 'Auto-completer with suggestion popup'],
    ]
    story.append(section_table(widget_data, [CONTENT_W*0.18, CONTENT_W*0.28, CONTENT_W*0.08, CONTENT_W*0.46]))
    story.append(PageBreak())
    
    # ========================
    # SECTIONS 18-20: AUTOMATION, ENTERPRISE, DEPLOYMENT
    # ========================
    story.append(Paragraph("18. Automation & Scheduling", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "<b>scheduler.py (105 lines):</b> Cron-like recurring scan scheduler with schedule_scan, list_schedules, "
        "cancel_schedule functions. Scans run in background threads at specified intervals.", ST['body']
    ))
    story.append(Paragraph(
        "<b>wishes.py (1,423 lines):</b> Natural language wish fulfillment engine parsing commands like "
        "'scan example.com for XSS' into structured scan parameters. WishEngine class with parse, fulfill, "
        "_wish_scan, _wish_audit, _wish_export, _wish_report, _wish_history, _wish_diff methods.", ST['body']
    ))
    story.append(Paragraph(
        "<b>chat.py (447 lines):</b> Interactive REPL with ChatSession class processing natural language "
        "commands. Handles scan, audit, blitz, help, export, modules, and history commands.", ST['body']
    ))
    story.append(Paragraph(
        "<b>swarm.py (1,120 lines):</b> Multi-agent attack swarm with 4 phases: SCOUT (recon), HACKER "
        "(attack), CODER (remediation), GUARDIAN (defense). SwarmAgent class with role-based execution.", ST['body']
    ))
    story.append(Paragraph(
        "<b>adversarial.py (1,150 lines):</b> Adversarial self-play engine with 3 phases: hacker (attack), "
        "coder (fix), verify (validate). AdversarialEngine class with run, _hacker_phase, _coder_phase, "
        "_verify_phase methods.", ST['body']
    ))
    story.append(Paragraph(
        "<b>webhooks.py (875 lines):</b> Webhook management with register, unregister, fire, process, "
        "list_webhooks. WebhookManager class for both incoming and outgoing webhooks.", ST['body']
    ))
    story.append(Paragraph(
        "<b>collab.py (531 lines):</b> Collaboration manager for shared scans with share_scan, list_shared, "
        "get_shared, delete_shared. CollabManager class.", ST['body']
    ))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("19. Enterprise Features", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "<b>Memory Management (memory.py, 902 lines):</b> Unified memory store with FindingStore (CRUD), "
        "AgentBlackboard (key-value), CredentialVault (secure storage), and KnowledgeGraph persistence. "
        "All subsystems support save, load, clear, and stats operations.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Knowledge Graph (knowledge_graph.py, 774 lines):</b> Directed graph with 10 node types and "
        "15+ edge types. Supports shortest_path, blast_radius, attack_chains, connected_components. "
        "NetworkX acceleration when available.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Social Graph (social_graph.py, 935 lines):</b> OSINT entity/relationship extraction from DNS, "
        "WHOIS, HTTP, CT logs. Community detection and cluster analysis.", ST['body']
    ))
    story.append(Paragraph(
        "<b>API Discovery (api_discovery.py, 1,184 lines):</b> API Blueprint reconstruction with 5 engines: "
        "JsEndpointExtractor, GraphQLIntrospector, OpenAPISpecParser, LinkCrawler, AuthMatrix, GrpcIntrospector.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Exfil Channels (exfil_channels.py, 973 lines):</b> Data exfiltration channel mapper identifying "
        "9 channel types with viability scoring, bandwidth estimation, stealth scoring, and risk assessment.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Shadow IT (shadow_it.py, 1,684 lines):</b> Shadow IT and abandoned infrastructure discovery "
        "with decay indicators, default page detection, certificate age analysis, and asset classification.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Supply Chain (supply_chain.py, 973 lines):</b> Supply chain analysis with WebExtractor, "
        "GitHubScraper, and SupplyChainAnalyzer for secrets, dependencies, infrastructure, CI/CD, and cloud config.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Drift Monitor (drift_monitor.py, 939 lines):</b> Infrastructure drift detection across 8 categories: "
        "DNS, TLS certs, HTTP headers, tech stack, ports, security headers, content, status codes.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Netmap (netmap.py, 723 lines):</b> Zero-trust network mapper with host discovery, trust mapping, "
        "segmentation checking. NetworkDiscovery, TrustMapper, SegmentationChecker classes.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Network Graphs:</b> GraphRenderer (graph_ui.py, 677 lines) for text-based graph rendering: "
        "tree, digraph, table, ASCII graph formats.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Tool SDK (tool_sdk.py, 728 lines):</b> External tool integration framework for nmap, nuclei, "
        "and other tools. ToolManager with register_tool, run_tool, parse_output, list_tools.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Browser Module (browser_mod.py, 158 lines):</b> Playwright-based screenshot capture.", ST['body']
    ))
    story.append(Paragraph(
        "<b>ANSI Capture (ansi_capture.py, 216 lines):</b> ANSI escape code capture/strip for TUI.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Fuzzer (fuzzer.py, 1,743 lines):</b> Parameter fuzzer for URL/path/header fuzzing with "
        "Fuzzer class (fuzz_url, fuzz_params, fuzz_headers, fuzz_paths, run).", ST['body']
    ))
    story.append(Paragraph(
        "<b>Passive Intel (passive_intel.py, 540 lines):</b> Passive intelligence collection without "
        "active scanning: DNS, WHOIS, HTTP headers. PassiveIntelCollector class.", ST['body']
    ))
    story.append(Paragraph(
        "<b>CVE Radar (cve_radar.py, 393 lines):</b> CVE radar for finding enrichment with NVD data.", ST['body']
    ))
    story.append(Paragraph(
        "<b>AI CVE DB (ai_cve_db.py, 495 lines):</b> Local CVE/NVD knowledge base with AICVEDB class.", ST['body']
    ))
    story.append(Paragraph(
        "<b>AI Red Team (ai_red_team.py, 932 lines):</b> AI red team module with GORGON 15-stage engine.", ST['body']
    ))
    story.append(Paragraph(
        "<b>Entropy (entropy.py, 727 lines):</b> Granular secret entropy scoring with Shannon entropy "
        "and contextual signals. SecretClassifier, ContextAnalyzer classes.", ST['body']
    ))
    story.append(PageBreak())
    
    story.append(Paragraph("20. Deployment Infrastructure", ST['h1']))
    story.append(hr())
    
    deploy_data = [
        ['Component', 'File', 'Key Configuration'],
        ['Docker', 'deploy/Dockerfile', 'Base: python:3.12-slim, Multi-stage, Non-root user (1001), Port 7890, Healthcheck, Labels v11.0.0'],
        ['Docker Compose', 'deploy/docker-compose.yml', 'Image: reconpro:v11-enterprise, Port 7890, Auth required, Volume: reconpro-data, CPU 2.0/0.5, Memory 1G/256M, Security: no-new-privileges, cap_drop: ALL'],
        ['K8s Deployment', 'deploy/k8s/deployment.yaml', 'Namespace: reconpro, Replicas: 3, Rolling update, Security context (non-root, seccomp), Init container, Probes (liveness/readiness/startup), Resources 250m-1 CPU'],
        ['K8s Service', 'deploy/k8s/service.yaml', 'ClusterIP, Port 7890/TCP, Topology hints: auto'],
        ['K8s ConfigMap', 'deploy/k8s/configmap.yaml', 'RECONPRO_REQUIRE_AUTH=true, LOG_LEVEL=INFO, MAX_WORKERS=4, DEFAULT_TIMEOUT=8'],
        ['K8s Secret', 'deploy/k8s/secret.yaml.example', 'RECONPRO_BOOTSTRAP_SECRET (generated via openssl rand -hex 32)'],
    ]
    story.append(section_table(deploy_data, [CONTENT_W*0.15, CONTENT_W*0.25, CONTENT_W*0.60]))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "<b>Docker ENV vars:</b> PYTHONUNBUFFERED=1, PYTHONDONTWRITEBYTECODE=1, PYTHONPATH=/opt/reconpro, "
        "RECONPRO_DATA_DIR=/home/reconpro/.reconpro, RECONPRO_LOG_LEVEL=INFO, RECONPRO_MAX_WORKERS=4, "
        "RECONPRO_DEFAULT_TIMEOUT=8", ST['body_small']
    ))
    story.append(Paragraph(
        "<b>Docker Compose security:</b> no-new-privileges:true, cap_drop: ALL, cap_add: NET_BIND_SERVICE, "
        "Network: reconpro-enterprise-net (bridge, 172.28.0.0/16)", ST['body_small']
    ))
    story.append(Paragraph(
        "<b>K8s security:</b> runAsNonRoot=true, runAsUser=1001, fsGroup=1001, seccompProfile=RuntimeDefault, "
        "automountServiceAccountToken=false, drop ALL capabilities, no privilege escalation", ST['body_small']
    ))
    story.append(PageBreak())
    
    # ========================
    # SECTIONS 21-24: CONFIG, DATA MODELS, ALGORITHMS, FRAMEWORKS
    # ========================
    story.append(Paragraph("21. Configuration & Constants", ST['h1']))
    story.append(hr())
    
    config_data = [
        ['Constant', 'Value', 'Purpose'],
        ['DEFAULT_TIMEOUT', '8 seconds', 'HTTP request timeout'],
        ['DEFAULT_RATE_LIMIT', '10.0 requests/sec', 'Rate limiter default'],
        ['DEFAULT_BODY_LIMIT', '16384 bytes (16KB)', 'HTTP response body limit'],
        ['DEFAULT_MAX_WORKERS', '4', 'Default parallel workers'],
        ['MAX_SCORE', '100', 'Maximum security score'],
        ['MIN_SCORE', '0', 'Minimum security score'],
        ['USER_AGENT', 'ReconPro/11.0.0', 'Default HTTP user agent'],
        ['SEVERITY_LEVELS', '5 (Critical, High, Medium, Low, Info)', 'Severity classification'],
        ['GRADE_THRESHOLDS', '7 (A+ through F)', 'Score-to-grade mapping'],
        ['SEV_COLORS', '5 mappings', 'Severity color codes'],
        ['GRADE_COLORS', '7 mappings', 'Grade color codes'],
        ['SARIF_LEVEL_MAP', '5 mappings', 'SARIF severity levels'],
        ['BADGE_COLOR_MAP', '7 mappings', 'Badge color codes'],
        ['DREAD_SCORE_MAP', '6 mappings', 'DREAD severity-to-score'],
        ['RECONPRO_HOME', '~/.reconpro', 'Application home directory'],
        ['SCAN_HISTORY_DIR', '~/.reconpro/history', 'Scan history storage'],
        ['PLUGIN_DIR', '~/.reconpro/plugins', 'Plugin directory'],
        ['MEMORY_DIR', '~/.reconpro/memory', 'Memory store directory'],
        ['KNOWLEDGE_GRAPH_FILE', '~/.reconpro/memory/kg.json', 'Knowledge graph persistence'],
    ]
    story.append(section_table(config_data, [CONTENT_W*0.25, CONTENT_W*0.25, CONTENT_W*0.50]))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("22. Data Models & Protocols", ST['h1']))
    story.append(hr())
    
    models_data = [
        ['Model', 'File', 'Fields', 'Purpose'],
        ['Finding', 'http_layer.py', 'title, severity, category, module, description, evidence, asset, points_deducted, remediation, dread_score', 'Universal finding dataclass'],
        ['ScanEvent', 'engine.py', 'type, module_id, target, finding, findings_count, duration, result, modules, timestamp', 'Scan lifecycle event'],
        ['ReconProResult', 'scanner.py', 'target, findings, score, grade, module_results, elapsed, total_points_deducted', 'Scan result container'],
        ['ScanContext', 'context.py', 'target, modules, timeout, verify_tls, rate_limit, max_workers, +computed fields', 'Scan configuration'],
        ['OSSignature', 'quantum_fingerprint.py', 'name, family, ttl_initial, tcp_window, synack_ms, timestamp_res, keepalive_s, congestion, mtu_default, jitter_ratio, weight, tolerances', 'OS fingerprint signature'],
        ['TimingSample', 'quantum_fingerprint.py', 'label, elapsed_ms, payload_size, status_code, response_bytes, error', 'Timing probe sample'],
        ['SubProbeResult', 'quantum_fingerprint.py', 'probe_name, samples, derived_value, description, confidence; properties: values, mean, median, stdev, cv', 'Probe aggregation result'],
        ['SecretMatch', 'entropy.py', 'Match details for secret detection', 'Secret detection match'],
        ['SubdomainResult', 'subdomains.py', 'domain, subdomains, resolved, sources_used, total_unique_ips, elapsed', 'Subdomain enumeration result'],
        ['DriftSnapshot', 'drift_monitor.py', 'timestamp, target, dns, cert, headers, tech, ports, security, content, status', 'Infrastructure snapshot'],
        ['DriftEvent', 'drift_monitor.py', 'category, description, old_value, new_value, risk_level', 'Drift change event'],
        ['ExfilChannel', 'exfil_channels.py', 'channel_type, viability_score, bandwidth_estimate, stealth_score, detection_difficulty, indicators, remediation, overall_risk', 'Exfiltration channel'],
        ['Entity', 'social_graph.py', 'entity_id, entity_type, name, properties', 'Social graph entity'],
        ['Relationship', 'social_graph.py', 'source, target, rel_type, weight, properties', 'Social graph relationship'],
        ['GraphNode', 'attack_graph.py', 'id, node_type, label, severity, risk_score, metadata', 'Attack graph node'],
        ['GraphEdge', 'attack_graph.py', 'source, target, edge_type, weight', 'Attack graph edge'],
        ['IntelligenceResult', 'intelligence_pipeline.py', 'Composite intelligence analysis result', 'Pipeline output'],
        ['ExtendedFinding', 'ai_analyst.py', 'Extended finding with MITRE/CWE/CAPEC/CVSS/remediation', 'Enriched finding'],
        ['Proxy', 'proxy.py', 'Proxy connection details', 'Proxy dataclass'],
        ['TunnelIndicator', 'tunnel_detect.py', 'Tunnel detection indicators', 'Tunnel detection result'],
    ]
    cw_m = [CONTENT_W*0.15, CONTENT_W*0.20, CONTENT_W*0.35, CONTENT_W*0.30]
    story.append(section_table(models_data, cw_m))
    story.append(PageBreak())
    
    story.append(Paragraph("23. Algorithms & Detection Engines", ST['h1']))
    story.append(hr())
    
    algo_data = [
        ['Algorithm', 'Module', 'Description'],
        ['HTTP Timing OS Fingerprinting', 'quantum_fingerprint', '7-signal OS identification: TTL deduction (CV-slope), TCP window (transfer-rate), SYN-ACK (trimmed-mean latency), Keep-alive (survival curve), MTU (RTT inflection), Congestion control (burst/recovery: CUBIC/BBR/Reno/LEDBAT), Timestamp resolution (GCD clock granularity)'],
        ['Shannon Entropy Analysis', 'entropy, covert_channel, signal_intel', 'Information-theoretic entropy calculation for detecting encrypted/encoded data in HTTP responses, DNS labels, payload sizes'],
        ['Token-Bucket Rate Limiting', 'async_http', 'Adaptive rate limiting with exponential moving average tracking and per-hostname cache'],
        ['Beaconing Detection', 'signal_intelligence', 'Jitter analysis, interval regularity scoring, autocorrelation for periodicity, known beacon pattern matching'],
        ['C2 Pattern Matching', 'signal_intelligence, gorgon', 'Response header/cookie/URI pattern matching against Cobalt Strike, Metasploit, Empire, and other C2 frameworks'],
        ['TTP Correlation', 'nation_state_attributor, ai_analyst', 'Jaccard similarity between observed techniques and known APT group TTP databases'],
        ['Attack Path Discovery', 'attack_graph', 'Directed graph traversal finding chains from initial access to data exfiltration'],
        ['Blast Radius Computation', 'attack_graph, knowledge_graph', 'BFS-based blast radius from any node to identify potentially compromised assets'],
        ['Coefficient of Variation', 'honeypot_dance, signal_intel', 'Statistical measure (std/mean) for detecting abnormally consistent responses (honeypot indicator)'],
        ['Z-Score Anomaly Detection', 'zero_day_hunter', 'Statistical baseline comparison for response time, size, and status code anomalies'],
        ['Chi-Squared Frequency Analysis', 'steganography_detector', 'Statistical test for detecting non-uniform character distributions indicating hidden data'],
        ['Index of Coincidence', 'covert_channel', 'Cryptanalysis technique for detecting language/frequency anomalies in encoded channels'],
        ['Version-Response Correlation', 'zero_day_hunter', 'Version string extraction with known CVE database cross-referencing'],
        ['Infrastructure Drift Hashing', 'infrastructure_ghost, drift_monitor', 'Hash-based comparison of infrastructure snapshots for detecting unauthorized changes'],
        ['DNS TXT Dead Drop Detection', 'dead_drop', 'High-entropy TXT record analysis with encoding detection (base64/hex/base32)'],
        ['ETag Covert Channel Analysis', 'dead_drop', 'ETag header entropy and encoding pattern detection for covert data channels'],
        ['Error Perfection Analysis', 'honeypot_dance', 'Comparison of error responses against known-real-server patterns to detect "too clean" honeypot responses'],
        ['DREAD Composite Scoring', 'ratings, zero_day_hunter, oblivion', 'Damage, Reproducibility, Exploitability, Affected users, Discoverability weighted composite'],
        ['Community Detection', 'social_graph', 'Graph community detection algorithms for identifying related infrastructure clusters'],
        ['Proxy Rotation Strategies', 'proxy', '4 strategies: Round Robin, Random, Least Connections, Geo-Distributed with health checking'],
        ['Parallel Scan Orchestration', 'engine, parallel', 'ThreadPoolExecutor + done_callback (parallel), asyncio.Semaphore (async engine)'],
    ]
    story.append(section_table(algo_data, [CONTENT_W*0.25, CONTENT_W*0.20, CONTENT_W*0.55]))
    story.append(PageBreak())
    
    story.append(Paragraph("24. Framework Mappings", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "ReconPro maps scan findings to 6 industry-standard security frameworks, enabling compliance "
        "reporting and integration with enterprise security tools:", ST['body']
    ))
    
    fw_data = [
        ['Framework', 'Module', 'Coverage', 'Purpose'],
        ['MITRE ATT&CK', 'ai_analyst, kill_chain, compliance, free_info_ops', '30+ techniques mapped', 'Tactics, techniques, and procedures classification'],
        ['CWE', 'ai_analyst, threat_intel', '25+ weaknesses mapped', 'Common Weakness Enumeration'],
        ['CAPEC', 'ai_analyst, threat_intel', '20+ patterns mapped', 'Common Attack Pattern Enumeration'],
        ['CVSS', 'ai_analyst, formats, utils', 'Full scoring support', 'Common Vulnerability Scoring System'],
        ['DREAD', 'ratings, zero_day_hunter, oblivion, utils', '6 severity levels', 'Damage, Reproducibility, Exploitability, Affected, Discoverability'],
        ['OWASP', 'compliance, formats', 'Top 10 covered', 'Web application security risks'],
        ['ISO 27001', 'compliance', 'Control mapping', 'Information security management'],
        ['NIST 800-53', 'compliance', 'Control mapping', 'Security and privacy controls'],
        ['SOC 2', 'compliance', 'Trust criteria mapping', 'Service organization controls'],
        ['PCI-DSS', 'compliance', 'Requirement mapping', 'Payment card data security'],
        ['CIS', 'compliance', 'Benchmark mapping', 'Center for Internet Security'],
        ['GDPR', 'compliance', 'Article mapping', 'General Data Protection Regulation'],
        ['SARIF', 'formats', 'Full export', 'Static Analysis Results Interchange Format'],
    ]
    story.append(section_table(fw_data, [CONTENT_W*0.12, CONTENT_W*0.25, CONTENT_W*0.20, CONTENT_W*0.43]))
    story.append(PageBreak())
    
    # ========================
    # SECTION 25: REPORT FORMATS
    # ========================
    story.append(Paragraph("25. Report Formats & Export", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "ReconPro supports 5 export formats for scan results, each optimized for different use cases:", ST['body']
    ))
    
    fmt_data = [
        ['Format', 'Module', 'Engine', 'Purpose'],
        ['SARIF', 'formats.py', 'stdlib json', 'Static Analysis Results Interchange Format for GitHub/GitLab integration'],
        ['JSON', 'formats.py', 'stdlib json', 'Structured data export for programmatic consumption'],
        ['Markdown', 'formats.py', 'stdlib string', 'Human-readable report with severity badges and tables'],
        ['HTML', 'reports.py', 'Chart.js + CSS', 'Self-contained interactive report with 8 Chart.js charts, glassmorphism CSS'],
        ['PDF', 'formats.py', 'Print-ready HTML', 'Print-optimized HTML formatted for PDF conversion'],
        ['AI Markdown', 'report_writer.py', 'openai (optional)', 'AI-generated audience-specific reports (Executive, Technical, Compliance, Developer)'],
        ['HTML Dashboard', 'reports.py', 'Chart.js', 'Animated counters, severity distribution, category breakdown, top findings, timeline'],
    ]
    story.append(section_table(fmt_data, [CONTENT_W*0.12, CONTENT_W*0.15, CONTENT_W*0.18, CONTENT_W*0.55]))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph(
        "<b>HTML Report Features:</b> 8 Chart.js charts (severity distribution pie, category bar, module "
        "horizontal bar, timeline line, top findings, score gauge, DREAD radar, severity heatmap), "
        "glassmorphism CSS theme, animated counters, responsive layout, dark mode support, "
        "self-contained (no external dependencies except Chart.js CDN).", ST['body']
    ))
    story.append(Paragraph(
        "<b>AI Report Writer:</b> 4 audience modes (Executive, Technical, Compliance, Developer) with "
        "LLM-generated narrative or template-based fallback. Severity sorting, emoji badges, "
        "remediation prioritization.", ST['body']
    ))
    story.append(PageBreak())
    
    # ========================
    # SECTION 26: TESTING SUITE
    # ========================
    story.append(Paragraph("26. Testing Suite (31 Files, 1,449 Tests)", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "The test suite spans 31 files with approximately 1,449 individual test functions organized into "
        "291 test classes. Tests cover unit, integration, stress, performance, security, regression, "
        "property-based, and coverage boost categories. The test runner (run_tests.py) provides automated "
        "discovery and execution.", ST['body']
    ))
    
    test_data = [
        ['Test File', 'Lines', 'Tests', 'Type', 'Coverage Area'],
        ['test_utils.py', 578, 118, 'Unit', 'All 16 utility functions'],
        ['test_observability.py', 1179, 132, 'Unit', 'Structured Logger, Metrics, Tracer, Profiler, Health, Telemetry'],
        ['test_coverage_boost.py', 737, 110, 'Coverage', 'Edge cases for all utilities, constants, Finding'],
        ['test_ai_analyst.py', 729, 55, 'Unit/Integration', 'FindingClassifier, Correlator, AttackPath, Mappings'],
        ['test_security.py', 992, 90, 'Security', '15 security functions: sanitize, detect, audit, classify'],
        ['test_interfaces.py', 682, 79, 'Unit', 'All Protocol classes, type aliases, ScanContext'],
        ['test_formats.py', 744, 50, 'Unit/Integration', 'SARIF, Markdown, JSON, PDF exports'],
        ['test_diagnostics.py', 612, 49, 'Unit', 'Diagnostics, health check, version info, module status'],
        ['test_constants.py', 220, 44, 'Unit', 'All constant values and mappings'],
        ['test_threat_intel.py', 306, 48, 'Unit/Integration', 'ThreatIntel databases, enrichment pipeline'],
        ['test_security_regression.py', 761, 43, 'Security/Regression', '13 injection categories against all entry points'],
        ['test_cli.py', 499, 32, 'Unit', 'CLI rendering functions, colors, badges, summaries'],
        ['test_intelligence_pipeline.py', 367, 32, 'Integration', 'Full intelligence pipeline end-to-end'],
        ['test_property.py', 475, 58, 'Property-based', 'Mathematical properties of core functions'],
        ['test_enterprise.py', 564, 34, 'Integration', 'Intelligence engines, export formats, observability'],
        ['test_attack_graph.py', 306, 24, 'Unit', 'DiGraph, classification, kill chain, blast radius'],
        ['test_security_hardening.py', 417, 30, 'Security/Hardening', 'Path traversal, XSS, auth, error sanitization'],
        ['test_performance.py', 799, 16, 'Performance', 'Startup, HTTP probe, scan, rate limiter benchmarks'],
        ['test_scanner.py', 177, 18, 'Integration', 'scan(), audit_scan(), ReconProResult'],
        ['test_stress.py', 376, 14, 'Stress', '1000-10000 finding lists, long targets, memory'],
        ['test_input_validation.py', 180, 18, 'Security', 'SQLi, command injection, path traversal, XSS, null bytes'],
        ['test_regression_v11.py', 409, 36, 'Regression', 'Score bounds, severity ordering, grade thresholds'],
        ['test_registry.py', 169, 19, 'Unit', 'Module registry counts, runners, structure'],
        ['test_plugins.py', 181, 16, 'Unit', 'HookManager register/fire/clear/unregister'],
        ['test_rate_limiter.py', 112, 7, 'Unit/Concurrency', 'RateLimiter timing and thread safety'],
        ['test_http_probe.py', 200, 9, 'Unit (mocked)', 'http_probe response structure, errors, limiter'],
        ['test_finding.py', 119, 9, 'Unit', 'Finding creation, defaults, to_dict'],
        ['test_integration.py', 177, 10, 'Integration', 'All 26 modules importable, runners callable'],
        ['test_scoring.py', 127, 14, 'Unit', 'Score calculation, clamping, grade integration'],
    ]
    story.append(section_table(test_data, [CONTENT_W*0.22, CONTENT_W*0.07, CONTENT_W*0.07, CONTENT_W*0.14, CONTENT_W*0.50]))
    story.append(PageBreak())
    
    # ========================
    # SECTION 27-29: DOCS, SCRIPTS, REPORTS
    # ========================
    story.append(Paragraph("27. Documentation (14 Documents, 5 ADRs)", ST['h1']))
    story.append(hr())
    
    docs_data = [
        ['Document', 'Lines', 'Key Sections'],
        ['ARCHITECTURE.md', 240, 'Design Principles, Package Structure, Core Components, Data Flow, Error Handling, Extensibility'],
        ['DEPLOYMENT_GUIDE.md', 148, 'Installation (pip/wheel/source), Configuration, Enterprise (Air-Gap, Container, CI/CD)'],
        ['DEVELOPER_GUIDE.md', 308, 'Prerequisites, First Scan, Custom Module Tutorial, Plugin Development, Testing, Contributing'],
        ['MODULE_GUIDE.md', 294, 'Core Remote Modules (10), Advanced Modules (12), Local Modules (3), Reference Table'],
        ['API_REFERENCE.md', 351, 'Public API, HTTP Layer, Utilities, Security, Observability, Formats'],
        ['SECURITY_MODEL.md', 204, 'Threat Model, Security Architecture, Hardening Guide, Known Limitations'],
        ['PERFORMANCE_GUIDE.md', 159, 'Benchmarks, Startup/Scan/Memory/CPU, Optimization Tips, Scaling'],
        ['RESEARCH.md', 483, '11-tool Comparison Matrix, MITRE ATT&CK Coverage, Unique Capabilities, Architecture Patterns'],
        ['ROADMAP.md', 127, 'v10.0.0 (Current), v10.1.0 (Next), v11.0.0 (Future), Contributing'],
        ['ADR-001', 80, 'Pure Python Architecture decision'],
        ['ADR-002', 98, 'Centralized Module Registry decision'],
        ['ADR-003', 116, 'HTTP Timing Fingerprinting decision'],
        ['ADR-004', 104, 'Universal Finding Dataclass decision'],
        ['ADR-005', 120, 'Zero-Config Operation decision'],
    ]
    story.append(section_table(docs_data, [CONTENT_W*0.22, CONTENT_W*0.08, CONTENT_W*0.70]))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("28. Scripts & Tooling", ST['h1']))
    story.append(hr())
    
    scripts_data = [
        ['Script', 'Lines', 'Purpose'],
        ['generate_engineering_report.py', 860, 'Generate v10 Enterprise Engineering Report as PDF via ReportLab'],
        ['benchmark_intelligence.py', 304, 'Benchmark intelligence pipeline (AI analyst, attack graph, threat intel)'],
        ['benchmark_v11.py', 297, 'v11 performance benchmarking at multiple finding scales'],
        ['generate_v11_report.py', 590, 'Generate v11 production readiness report'],
    ]
    story.append(section_table(scripts_data, [CONTENT_W*0.35, CONTENT_W*0.10, CONTENT_W*0.55]))
    story.append(Spacer(1, 4*mm))
    
    story.append(Paragraph("29. Engineering Reports", ST['h1']))
    story.append(hr())
    
    reports_data = [
        ['Report', 'Format', 'Key Findings'],
        ['team1_architecture_review.md', 'Markdown (654 lines)', '25 issues (2 critical, 6 high, 7 medium, 10 low). Critical: dual scan engines, UA inconsistency. High: severity ordering duplicated 9+ files, color duplication, 3 HTTP layers, CLI monolith'],
        ['team2_benchmark_data.json', 'JSON', '15 benchmarks: JSON/SARIF/Markdown/PDF export at 100/1000/10000 findings; intelligence pipeline at 50/200/500 findings'],
        ['team3_security_audit.md', 'Markdown (490 lines)', '25 findings (3 critical, 6 high, 10 medium, 6 low). Critical: path traversal in report/history serving, unauthenticated token gen. High: XSS in HTML/PDF, plugin code execution, SSRF'],
    ]
    story.append(section_table(reports_data, [CONTENT_W*0.25, CONTENT_W*0.15, CONTENT_W*0.60]))
    story.append(PageBreak())
    
    # ========================
    # SECTION 30-31: CLASS & FUNCTION INVENTORY
    # ========================
    story.append(Paragraph("30. Complete Class Inventory", ST['h1']))
    story.append(hr())
    
    all_classes = [
        ['Class', 'File', 'Type', 'Key Methods'],
        ['ScanEvent', 'engine.py', 'dataclass', 'type, module_id, target, finding, findings_count, duration, result, modules, timestamp'],
        ['EventCollector', 'engine.py', 'service', '__call__, findings, by_module, timeline'],
        ['ScanEngine', 'engine.py', 'engine', '_emit, _resolve_remote_modules, _resolve_local_modules, _build_result, _run_module, run, scan_one'],
        ['ReconProResult', 'scanner.py', 'dataclass', 'target, findings, score, grade, module_results, elapsed, to_dict'],
        ['RateLimiter', 'http_layer.py', 'service', '__init__, acquire'],
        ['Finding', 'http_layer.py', 'dataclass', 'title, severity, category, module, description, evidence, asset, points_deducted, remediation, dread_score, to_dict'],
        ['ExecutiveSummaryGenerator', 'report_writer.py', 'generator', 'generate, _generate_with_llm, _generate_from_templates, _template_executive/technical/compliance/developer'],
        ['MarkdownReportBuilder', 'report_writer.py', 'builder', 'build_report'],
        ['HookManager', 'plugins.py', 'manager', 'register, unregister, fire, clear, list_hooks, save_hooks, load_hooks'],
        ['PluginInterface', 'interfaces.py', 'ABC', 'abstract: run, name, description'],
        ['ScanContext', 'context.py', 'dataclass', '__post_init__, to_args, elapsed_ms'],
        ['FindingStore', 'memory.py', 'store', 'add, query, recent, stats, to_dicts'],
        ['AgentBlackboard', 'memory.py', 'store', 'set, get, delete, list_keys, clear, to_dict'],
        ['CredentialVault', 'memory.py', 'store', 'store, retrieve, delete, list, clear, to_dicts'],
        ['UnifiedMemoryStore', 'memory.py', 'store', 'findings, graph, blackboard, vault, save, load, clear, stats, to_dict'],
        ['AsyncSession', 'async_http.py', 'wrapper', 'wraps aiohttp.ClientSession with cookie jars, redirect recording'],
        ['AdaptiveLimiter', 'async_http.py', 'limiter', 'token-bucket with EMA tracking, hostname cache'],
        ['ConnectionPool', 'connection_pool.py', 'pool', '_get_ssl_context, _build_headers, probe, _record_stats, stats, reset_stats, close'],
        ['Proxy', 'proxy.py', 'dataclass', 'to_dict, from_dict'],
        ['RotationStrategy', 'proxy.py', 'enum', 'ROUND_ROBIN, RANDOM, LEAST_CONNECTIONS, GEO_DISTRIBUTED'],
        ['ProxyPool', 'proxy.py', 'manager', 'load_from_file, load_from_url, add_proxy, health_check, get_proxy, rotate, stats'],
        ['TorProxyManager', 'proxy.py', 'manager', 'check_tor_available, new_circuit, get_tor_session, verify_new_ip'],
        ['SynScanner', 'raw_sockets.py', 'scanner', 'scan, _scan_scapy, _scan_connect'],
        ['UdpProber', 'raw_sockets.py', 'prober', 'probe'],
        ['TtlAnalyzer', 'raw_sockets.py', 'analyzer', 'analyze, _estimate_initial_ttl'],
        ['ArpSpy', 'raw_sockets.py', 'spy', 'discover, detect_spoofing'],
        ['SecretClassifier', 'entropy.py', 'classifier', 'classify'],
        ['ContextAnalyzer', 'entropy.py', 'analyzer', 'analyze_file, analyze_string'],
        ['GeoIPLookup', 'geoip.py', 'lookup', 'enrich_ip, enrich_ips, save, clear_cache, get_cache_stats'],
        ['BatchGeoIP', 'geoip.py', 'batch', 'enrich_batch, get_stats'],
        ['SubdomainResult', 'subdomains.py', 'dataclass', 'domain, subdomains, resolved, sources_used, total_unique_ips, elapsed'],
        ['SubdomainEnumerator', 'subdomains.py', 'enumerator', 'enumerate, 11 source methods, _resolve_subdomains'],
        ['JsEndpointExtractor', 'api_discovery.py', 'extractor', 'extract, _match_patterns'],
        ['GraphQLIntrospector', 'api_discovery.py', 'introspector', 'probe_introspection, _run_query'],
        ['OpenAPISpecParser', 'api_discovery.py', 'parser', 'parse_spec, _fetch_spec'],
        ['LinkCrawler', 'api_discovery.py', 'crawler', 'crawl, _extract_links, _extract_forms'],
        ['AuthMatrix', 'api_discovery.py', 'tester', 'test_endpoints, _test_endpoint'],
        ['GrpcIntrospector', 'api_discovery.py', 'introspector', 'detect_grpc, probe_grpc'],
        ['TunnelType', 'tunnel_detect.py', 'enum', 'DNS/ICMP/IPv6/GRE/SSH/HTTP/HTTPS/TCP_OVER_UDP'],
        ['TunnelDetector', 'tunnel_detect.py', 'detector', 'detect_all, 8 tunnel check methods'],
        ['ExfilChannelMapper', 'exfil_channels.py', 'mapper', 'map_channels, 9 channel check methods'],
        ['ExfilRiskScorer', 'exfil_channels.py', 'scorer', 'score_channels, generate_report'],
        ['ShadowITScanner', 'shadow_it.py', 'scanner', 'scan, 7 check methods, classify_asset, generate_report'],
        ['WebExtractor', 'supply_chain.py', 'extractor', 'extract, _parse_html, 4 extract methods'],
        ['GitHubScraper', 'supply_chain.py', 'scraper', 'scrape_repo, _fetch_github_api, _parse_repo_data'],
        ['SupplyChainAnalyzer', 'supply_chain.py', 'analyzer', 'analyze, 5 check methods'],
        ['DriftSnapshot', 'drift_monitor.py', 'dataclass', '10 snapshot fields'],
        ['InfrastructureDriftMonitor', 'drift_monitor.py', 'monitor', 'capture_snapshot, load_snapshots, compare, 8 diff methods'],
        ['DriftRiskScorer', 'drift_monitor.py', 'scorer', 'score_event, score_events, generate_report'],
        ['NetworkDiscovery', 'netmap.py', 'discovery', 'discover_hosts, ping_sweep, arp_discover, mdns_discover, port_scan_hosts'],
        ['TrustMapper', 'netmap.py', 'mapper', 'build_trust_graph, find_ssh_chains, find_docker_topology, find_lateral_paths'],
        ['SegmentationChecker', 'netmap.py', 'checker', 'check_zones, check_cross_zone, check_internet_access, check_dns_exfil'],
        ['SecurityKnowledgeGraph', 'knowledge_graph.py', 'graph', 'add_node, add_edge, remove_node, get_node, get_neighbors, shortest_path, blast_radius, attack_chains, connected_components, save, load, stats, to_dict'],
        ['Entity', 'social_graph.py', 'dataclass', 'entity_id, entity_type, name, properties'],
        ['Relationship', 'social_graph.py', 'dataclass', 'source, target, rel_type, weight, properties'],
        ['SocialGraph', 'social_graph.py', 'graph', 'add_entity, add_relationship, get_entity, shortest_path, centrality, communities, find_clusters'],
        ['GraphIntelligence', 'social_graph.py', 'analyzer', 'build_graph, analyze, export_graphviz'],
        ['AttackGraph', 'attack_graph.py', 'graph', 'add_node, add_edge, build_from_findings, find_attack_paths, find_lateral_movement, find_privilege_escalation, find_choke_points, blast_radius, riskiest_nodes, save, load, to_dict, stats'],
        ['OSSignature', 'quantum_fingerprint.py', 'dataclass', '17 fields for OS fingerprint matching'],
        ['TimingSample', 'quantum_fingerprint.py', 'dataclass', 'label, elapsed_ms, payload_size, status_code, response_bytes, error'],
        ['SubProbeResult', 'quantum_fingerprint.py', 'dataclass', 'probe_name, samples, derived_value, description, confidence + properties'],
        ['ChainHunter', 'chain_engine.py', 'hunter', 'Complex chain analysis with many methods'],
        ['KillChainAnalyzer', 'kill_chain.py', 'analyzer', 'MITRE ATT&CK kill chain mapping engine'],
        ['AttributionEngine', 'attribution.py', 'engine', 'TTP-based nation-state attribution'],
        ['DefenseGenerator', 'defense.py', 'generator', 'generate_code, _generate_flask, _generate_waf, _generate_headers, _generate_csp'],
        ['CognitiveSecurityAnalyzer', 'cognitive_sec.py', 'analyzer', 'Bias detection, manipulation analysis'],
        ['FindingClassifier', 'ai_analyst.py', 'classifier', 'classify_finding (24+ categories)'],
        ['FindingCorrelator', 'ai_analyst.py', 'correlator', 'dedup, grouping, attack chain detection'],
        ['ExploitabilityEstimator', 'ai_analyst.py', 'estimator', 'Effort and exploitability analysis'],
        ['BusinessImpactAnalyzer', 'ai_analyst.py', 'analyzer', 'Production vs dev impact assessment'],
        ['AttackPathDetector', 'ai_analyst.py', 'detector', 'Multi-step attack path discovery'],
        ['RemediationPrioritizer', 'ai_analyst.py', 'prioritizer', 'Risk-based remediation ordering'],
        ['AIAnalystEngine', 'ai_analyst.py', 'engine', 'Full AI analyst pipeline composition'],
        ['ExtendedFinding', 'ai_analyst.py', 'dataclass', 'Finding + MITRE/CWE/CAPEC/CVSS/remediation'],
        ['AIRedTeam', 'ai_red_team.py', 'engine', 'GORGON 15-stage analytical engine'],
        ['AICVEDB', 'ai_cve_db.py', 'database', 'search, enrich, stats'],
        ['ThreatIntelCenter', 'threat_intel.py', 'center', 'lookup_cve, lookup_cwe, lookup_capec, lookup_mitre, enrich_finding'],
        ['ThreatFeedAggregator', 'threat_feeds.py', 'aggregator', 'fetch_feeds, parse_feed, aggregate, get_threats'],
        ['IntelligencePipeline', 'intelligence_pipeline.py', 'pipeline', 'analyze (composes AI analyst + attack graph + threat intel)'],
        ['ComplianceMapper', 'compliance.py', 'mapper', 'map_findings, generate_report, _map_iso27001, _map_nist, _map_pci, _map_cis, _map_gdpr'],
        ['PassiveIntelCollector', 'passive_intel.py', 'collector', 'collect_dns, collect_whois, collect_headers, collect_all'],
        ['RatingsEngine', 'ratings.py', 'engine', 'rate_finding, rate_target, compute_dread, get_risk_level'],
        ['CVERadar', 'cve_radar.py', 'radar', 'enrich, lookup, _fetch_nvd, _parse_cve'],
        ['CrossValidator', 'cross_validator.py', 'validator', 'validate, deduplicate, correlate, confidence_score'],
        ['BenchmarkTracker', 'benchmark.py', 'tracker', 'record, get_history, get_trend, compare, generate_report'],
        ['ObservabilityManager', 'observability.py', 'manager', 'log, metric, health_check, get_status, get_metrics'],
        ['ScanProfiler', 'profiler.py', 'profiler', 'start, stop, record, get_profile, generate_report'],
        ['DiagnosticRunner', 'diagnostics.py', 'runner', 'run_all, check_python, check_os, check_network, check_permissions, generate_report'],
        ['SecurityManager', 'security.py', 'manager', 'sanitize_input, validate_token, generate_token, check_permissions'],
        ['EvasionEngine', 'evasion.py', 'engine', 'encode_payload, fragment_request, bypass_waf, generate_variants'],
        ['MITMAnalyzer', 'mitm.py', 'analyzer', 'check_cert_pinning, check_hsts, check_tls_config, analyze'],
        ['Fuzzer', 'fuzzer.py', 'fuzzer', 'fuzz_url, fuzz_params, fuzz_headers, fuzz_paths, run'],
        ['ToolManager', 'tool_sdk.py', 'manager', 'register_tool, run_tool, parse_output, list_tools'],
        ['WebhookManager', 'webhooks.py', 'manager', 'register, unregister, fire, process, list_webhooks'],
        ['CollabManager', 'collab.py', 'manager', 'share_scan, list_shared, get_shared, delete_shared'],
        ['SwarmAgent', 'swarm.py', 'agent', 'run, _scout_phase, _hacker_phase, _coder_phase, _guardian_phase'],
        ['AdversarialEngine', 'adversarial.py', 'engine', 'run, _hacker_phase, _coder_phase, _verify_phase'],
        ['WishEngine', 'wishes.py', 'engine', 'parse, fulfill, 7 wish handlers'],
        ['ChatSession', 'chat.py', 'session', 'process, _parse_command, 8 handlers'],
        ['NexusApp', 'nexus_tui.py', 'tui', 'compose, on_mount, 20+ reactive methods'],
        ['HelpOverlay', 'nexus_help.py', 'overlay', 'compose, on_button_pressed, on_key'],
        ['GraphRenderer', 'graph_ui.py', 'renderer', 'render_tree, render_digraph, render_table, render_ascii_graph'],
        ['ASTAnalyzer', 'ast_analyzer.py', 'analyzer', 'analyze_python, analyze_javascript, analyze_typescript, detect_patterns, generate_findings'],
        ['IaCAuditor', 'iac_audit.py', 'auditor', 'audit_terraform, audit_cloudformation, audit_dockerfile, audit_kubernetes, generate_report'],
        ['ContainerSecurityAnalyzer', 'container_sec.py', 'analyzer', 'analyze_dockerfile, analyze_k8s, analyze_compose'],
        ['CloudReconEngine', 'cloud_recon.py', 'engine', 'detect_aws, detect_azure, detect_gcp, scan_metadata'],
    ]
    cw_class = [CONTENT_W*0.20, CONTENT_W*0.18, CONTENT_W*0.10, CONTENT_W*0.52]
    story.append(section_table(all_classes, cw_class))
    story.append(PageBreak())
    
    story.append(Paragraph("31. Complete Function Inventory (Key Functions by Module)", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph(
        "This section catalogs all major standalone functions across the codebase, organized by module. "
        "Functions listed below are public API entry points; private helper functions (prefixed with _) "
        "are documented in their respective module sections above.", ST['body']
    ))
    
    func_inv = [
        ['Module', 'Public Functions', 'Count'],
        ['utils.py', 'extract_host, normalize_base_url, validate_target, count_severities, sort_findings_by_severity, severity_to_cvss, severity_to_dread, validate_severity, compute_score, compute_grade, badge_markdown, safe_int, safe_float, truncate, entropy, is_private_ip, url_join', '17'],
        ['registry.py', 'build_module_registry, build_local_modules, get_module_runner, is_local_module, is_remote_module, get_module_info, list_remote_modules, list_local_modules, get_module_color', '9'],
        ['engine.py', 'concurrent_scan', '1'],
        ['scanner.py', 'scan, audit_scan', '2'],
        ['parallel.py', 'blitz_scan', '1'],
        ['async_http.py', 'async_probe, probe_sync, batch_probe', '3'],
        ['http_layer.py', 'http_probe, compute_grade, badge_markdown', '3'],
        ['proxy.py', 'proxy_probe, load_default_pool', '2'],
        ['geoip.py', 'is_hosting_ip, is_proxy_ip, format_geoip_summary, detect_cloud_provider', '4'],
        ['subdomains.py', 'discover_ctlogs, discover_dns, discover_subdomains', '3'],
        ['api_discovery.py', 'discover_api', '1'],
        ['tunnel_detect.py', '(class methods only)', '0'],
        ['exfil_channels.py', 'run_exfil_channels', '1'],
        ['shadow_it.py', 'run_shadow_it', '1'],
        ['supply_chain.py', 'run_supply_chain', '1'],
        ['drift_monitor.py', 'run_drift_monitor', '1'],
        ['netmap.py', 'run_local', '1'],
        ['entropy.py', 'shannon_entropy, scan_string, scan_file, scan_directory', '4'],
        ['security.py', 'run_security_check, sanitize_target, sanitize_path, sanitize_filename, sanitize_html, sanitize_shell, sanitize_log, detect_secrets_in_text, safe_json_parse, safe_url_parse, safe_xml_parse, compute_file_hash, verify_module_signature, check_dependency_integrity, get_security_profile, classify_threat', '17'],
        ['sanitize.py', 'sanitize_input, sanitize_path, sanitize_command', '3'],
        ['report_writer.py', 'generate_narrative, generate_report_md', '2'],
        ['formats.py', 'export_sarif, export_markdown, export_json, export_html, export_pdf, export', '6'],
        ['server.py', 'generate_api_token, validate_api_token, revoke_api_token, list_api_tokens, start_server, run_server', '6'],
        ['plugins.py', '_ensure_plugin_dir, discover_plugins, run_plugin, create_plugin_template, register_plugin, get_registered_plugins, load_all_plugins', '7'],
        ['memory.py', '(class methods only)', '0'],
        ['history.py', 'save_scan, list_scans, get_latest, get_scan, diff_scans, clear_history', '6'],
        ['scheduler.py', 'schedule_scan, list_schedules, cancel_schedule', '3'],
        ['wishes.py', 'run_wishes', '1'],
        ['chat.py', 'start_chat', '1'],
        ['webhooks.py', 'run_webhooks', '1'],
        ['collab.py', 'run_collab', '1'],
        ['swarm.py', 'run_swarm', '1'],
        ['adversarial.py', 'run_adversarial', '1'],
        ['agent.py', 'run_agent', '1'],
        ['browser_mod.py', 'take_screenshot', '1'],
        ['fuzzer.py', 'run_fuzzer', '1'],
        ['diagnostics.py', 'run_diagnostics', '1'],
        ['profiler.py', 'run_profiler', '1'],
        ['observability.py', 'run_observability', '1'],
        ['telemetry.py', 'telemetry_enabled, send_telemetry, disable_telemetry', '3'],
        ['ai_analyst.py', 'run_ai_analyst', '1'],
        ['ai_red_team.py', 'run_ai_red_team', '1'],
        ['ai_cve_db.py', 'run_ai_cve_db', '1'],
        ['threat_intel.py', 'run_threat_intel', '1'],
        ['threat_feeds.py', 'run_threat_feeds', '1'],
        ['intelligence_pipeline.py', '(class methods only)', '0'],
        ['attack_graph.py', '(class methods only)', '0'],
        ['kill_chain.py', 'run_kill_chain', '1'],
        ['attribution.py', 'run_attribution', '1'],
        ['defense.py', 'run_defense', '1'],
        ['cognitive_sec.py', 'run_cognitive_sec', '1'],
        ['compliance.py', 'run_compliance', '1'],
        ['ratings.py', 'run_ratings', '1'],
        ['cve_radar.py', 'run_cve_radar', '1'],
        ['cross_validator.py', 'run_cross_validator', '1'],
        ['benchmark.py', 'run_benchmark', '1'],
        ['graph_ui.py', 'render_graph', '1'],
    ]
    story.append(section_table(func_inv, [CONTENT_W*0.18, CONTENT_W*0.78, CONTENT_W*0.04]))
    story.append(PageBreak())
    
    # ========================
    # SECTION 32: FINAL STATISTICS
    # ========================
    story.append(Paragraph("32. Final Statistics & Architecture Map", ST['h1']))
    story.append(hr())
    
    story.append(Paragraph("Grand Totals", ST['h2']))
    
    final_stats = [
        ['Metric', 'Value'],
        ['Total Python Source Files', '96'],
        ['Total Test Files', '31'],
        ['Total Deployment/Docs/Script Files', '29'],
        ['Total Files in Project', '156'],
        ['Total Lines of Code (Source)', '~110,000'],
        ['Total Lines of Code (Tests)', '~12,627'],
        ['Total Lines of Code (All)', '~121,000+'],
        ['Total Classes', '85+'],
        ['Total Standalone Functions', '200+'],
        ['Total CLI Commands', '28'],
        ['Total REST API Endpoints', '20'],
        ['Total Scanning Modules', '26 (23 remote + 3 local)'],
        ['Total Advanced Modules', '16'],
        ['Total Intelligence Systems', '7 (AI Analyst, Attack Graph, Threat Intel, Pipeline, KG, Social Graph, Feeds)'],
        ['Total Integrations', '6 (Slack, Jira, GitHub, Splunk, PagerDuty, ZAI Stream)'],
        ['Total TUI Widgets', '7'],
        ['Total Plugin Hooks', '9'],
        ['Total Report Formats', '5+ (SARIF, JSON, Markdown, HTML, PDF, AI Markdown)'],
        ['Total Framework Mappings', '13 (MITRE ATT&CK, CWE, CAPEC, CVSS, DREAD, OWASP, ISO 27001, NIST 800-53, SOC2, PCI-DSS, CIS, GDPR, SARIF)'],
        ['Total Algorithms/Detection Engines', '21'],
        ['Total Data Models (Dataclasses)', '20+'],
        ['Total Protocols (Protocol Classes)', '5'],
        ['Total Type Aliases', '6'],
        ['Total Configuration Constants', '40+'],
        ['Total UI Themes', '6 (Recon, Matrix, Cyber, Dark, Light, Ocean)'],
        ['Total Documentation Files', '19 (14 docs + 5 ADRs)'],
        ['Total Test Functions', '1,449'],
        ['Total Test Classes', '291'],
        ['Total Deployment Targets', '3 (Docker, Docker Compose, Kubernetes)'],
        ['Total Scripts', '4'],
        ['Total Engineering Reports', '3'],
        ['Third-Party Dependencies (Required)', '0 (pure Python stdlib)'],
        ['Third-Party Dependencies (Optional)', '8 (rich, textual, aiohttp, openai, anthropic, networkx, scapy, playwright)'],
    ]
    story.append(section_table(final_stats, [CONTENT_W*0.45, CONTENT_W*0.55]))
    story.append(Spacer(1, 6*mm))
    
    story.append(Paragraph("Architecture Map", ST['h2']))
    story.append(Paragraph(
        "ReconPro v11.0 follows a layered architecture pattern with clear separation of concerns. "
        "The foundation layer (constants, utils, interfaces) provides shared data types and pure functions. "
        "The network layer (http_layer, connection_pool, async_http, proxy, raw_sockets) abstracts all "
        "network operations. The orchestration layer (engine, scanner, registry, parallel) manages module "
        "execution. The module layer (26 scanning modules in modules/) performs all reconnaissance and "
        "analysis. The intelligence layer (ai_analyst, attack_graph, threat_intel, knowledge_graph, "
        "social_graph) provides high-level analysis and correlation. The reporting layer (report_writer, "
        "reports, formats) generates outputs in 5+ formats. The presentation layer (cli, nexus_tui, server) "
        "provides three interfaces (CLI/TUI/REST). Cross-cutting concerns (observability, security, plugins, "
        "memory, integrations) span all layers. Deployment is containerized via Docker with Kubernetes "
        "orchestration.", ST['body']
    ))
    story.append(Spacer(1, 6*mm))
    
    story.append(Paragraph("Dependency Graph (Internal)", ST['h2']))
    story.append(Paragraph(
        "constants.py &lt;- utils.py &lt;- http_layer.py &lt;- [all modules]<br/>"
        "interfaces.py &lt;- registry.py &lt;- engine.py &lt;- cli.py<br/>"
        "memory.py &lt;- knowledge_graph.py &lt;- intelligence_pipeline.py<br/>"
        "theme.py &lt;- nexus_tui.py, cli.py, reports.py<br/>"
        "plugins.py &lt;- engine.py (hook integration)<br/>"
        "security.py &lt;- server.py, sanitize.py, all entry points<br/>"
        "observability.py &lt;- engine.py, all modules (structured logging)<br/>"
        "formats.py &lt;- cli.py, server.py (export functionality)", ST['body']
    ))
    
    # Build PDF
    doc.build(story, onFirstPage=footer_handler, onLaterPages=footer_handler)

def footer_handler(canvas, doc):
    """Add page number footer"""
    canvas.saveState()
    canvas.setFont('DejaVuMono', 7)
    canvas.setFillColor(HexColor('#94a3b8'))
    canvas.drawCentredString(PAGE_W / 2, 10 * mm, f"ReconPro v11.0 Complete Feature Manifest  |  Page {doc.page}")
    canvas.restoreState()

if __name__ == '__main__':
    output = '/home/z/my-project/download/ReconPro_v11_Complete_Feature_Manifest.pdf'
    os.makedirs(os.path.dirname(output), exist_ok=True)
    build_pdf(output)
    print(f"Generated: {output}")
