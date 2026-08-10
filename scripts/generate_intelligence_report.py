#!/usr/bin/env python3
"""
ReconPro FULL CODEBASE INTELLIGENCE REPORT
20-Part Exhaustive Intelligence Report Generator
"""
import os, sys, hashlib
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfgen import canvas

# ━━ FONT REGISTRATION ━━
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
# LiberationSans variable font not compatible with ReportLab - use Liberation Sans as fallback
pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans-Bold')

# ━━ CASCADE PALETTE (dark mode) ━━
PAGE_BG       = colors.HexColor('#0e0f0f')
SECTION_BG    = colors.HexColor('#1b1f1d')
CARD_BG       = colors.HexColor('#212724')
TABLE_STRIPE  = colors.HexColor('#151716')
HEADER_FILL   = colors.HexColor('#37604b')
COVER_BLOCK   = colors.HexColor('#25362e')
BORDER        = colors.HexColor('#426453')
ICON          = colors.HexColor('#90c1a8')
ACCENT        = colors.HexColor('#61d49b')
ACCENT_2      = colors.HexColor('#49cbcb')
TEXT_PRIMARY   = colors.HexColor('#e8eae9')
TEXT_MUTED     = colors.HexColor('#808985')
SEM_SUCCESS   = colors.HexColor('#86bc98')
SEM_WARNING   = colors.HexColor('#c1ad84')
SEM_ERROR     = colors.HexColor('#c06961')
SEM_INFO      = colors.HexColor('#718eab')

# ━━ STYLES ━━
styles = {}
styles['title'] = ParagraphStyle('title', fontName='LiberationSans-Bold', fontSize=28, leading=34, textColor=ACCENT, alignment=TA_LEFT, spaceAfter=6*mm)
styles['h1'] = ParagraphStyle('h1', fontName='LiberationSans-Bold', fontSize=20, leading=26, textColor=ACCENT, alignment=TA_LEFT, spaceBefore=10*mm, spaceAfter=4*mm)
styles['h2'] = ParagraphStyle('h2', fontName='LiberationSans-Bold', fontSize=14, leading=18, textColor=ICON, alignment=TA_LEFT, spaceBefore=6*mm, spaceAfter=3*mm)
styles['h3'] = ParagraphStyle('h3', fontName='LiberationSans-Bold', fontSize=11, leading=14, textColor=ACCENT_2, alignment=TA_LEFT, spaceBefore=4*mm, spaceAfter=2*mm)
styles['body'] = ParagraphStyle('body', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=2*mm)
styles['body_small'] = ParagraphStyle('body_small', fontName='NotoSerifSC', fontSize=8, leading=11, textColor=TEXT_MUTED, alignment=TA_JUSTIFY, spaceAfter=1.5*mm)
styles['bullet'] = ParagraphStyle('bullet', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=1*mm, leftIndent=8*mm, bulletIndent=4*mm)
styles['code'] = ParagraphStyle('code', fontName='DejaVuMono', fontSize=7.5, leading=10, textColor=ACCENT, backColor=CARD_BG, leftIndent=4*mm, rightIndent=4*mm, spaceBefore=2*mm, spaceAfter=2*mm, borderPadding=2*mm)
styles['caption'] = ParagraphStyle('caption', fontName='LiberationSans', fontSize=7, leading=9, textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=3*mm)
styles['status'] = ParagraphStyle('status', fontName='LiberationSans-Bold', fontSize=8, leading=10, textColor=ACCENT, alignment=TA_LEFT, spaceAfter=1*mm)
styles['critical'] = ParagraphStyle('critical', fontName='LiberationSans-Bold', fontSize=8, leading=10, textColor=SEM_ERROR, alignment=TA_LEFT)
styles['warning'] = ParagraphStyle('warning', fontName='LiberationSans-Bold', fontSize=8, leading=10, textColor=SEM_WARNING, alignment=TA_LEFT)

def heading(text, style_key='h1'):
    return Paragraph(text, styles[style_key])

def body(text):
    return Paragraph(text, styles['body'])

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', styles['bullet'])

def status_badge(text, style_key='status'):
    return Paragraph(text, styles[style_key])

def critical(text):
    return Paragraph(f'[CRITICAL] {text}', styles['critical'])

def warning_badge(text):
    return Paragraph(f'[WARNING] {text}', styles['warning'])

def make_table(data, col_widths=None, has_header=True):
    """Create styled table."""
    avail = 170*mm
    if col_widths is None:
        ncols = len(data[0]) if data else 1
        col_widths = [avail / ncols] * ncols
    t = Table(data, colWidths=col_widths, repeatRows=1 if has_header else 0)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('FONTNAME', (0, 0), (-1, -1), 'LiberationSans'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('LEADING', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5*mm),
    ]
    if has_header:
        style_cmds += [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'LiberationSans-Bold'),
        ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=3*mm, spaceAfter=3*mm)

def spacer(h=3):
    return Spacer(1, h*mm)

# ━━ OUTPUT ━━
OUTPUT = '/home/z/my-project/download/ReconPro_Full_Codebase_Intelligence_Report.pdf'

# ━━ BUILD DOCUMENT ━━
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    topMargin=20*mm, bottomMargin=20*mm,
    leftMargin=18*mm, rightMargin=18*mm,
    title='ReconPro Full Codebase Intelligence Report',
    author='Z.ai',
    subject='Exhaustive 20-Part Codebase Intelligence Analysis'
)

story = []

# ═══════════════════════════════════════════════════════════
# PART 0: COVER PAGE
# ═══════════════════════════════════════════════════════════
story.append(Spacer(1, 40*mm))
story.append(Paragraph('RECONPRO', ParagraphStyle('cover_main', fontName='LiberationSans-Bold', fontSize=42, leading=48, textColor=ACCENT, alignment=TA_CENTER)))
story.append(Spacer(1, 5*mm))
story.append(Paragraph('FULL CODEBASE INTELLIGENCE REPORT', ParagraphStyle('cover_sub', fontName='LiberationSans-Bold', fontSize=16, leading=20, textColor=ICON, alignment=TA_CENTER)))
story.append(Spacer(1, 8*mm))
story.append(HRFlowable(width="60%", thickness=1, color=ACCENT, spaceBefore=2*mm, spaceAfter=2*mm))
story.append(Spacer(1, 5*mm))
story.append(Paragraph('20-Part Exhaustive Intelligence Analysis', ParagraphStyle('cover_desc', fontName='NotoSerifSC', fontSize=11, leading=15, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Paragraph('200+ Files | 121,000+ Lines of Code | 28 Modules | 50+ CLI Commands', ParagraphStyle('cover_desc2', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Spacer(1, 15*mm))

meta_data = [
    ['Classification', 'Confidential', 'Version', 'v11.0.0'],
    ['Date', '2026-08-11', 'Python', '3.10+ Pure Stdlib'],
    ['Methodology', 'Full File Inspection', 'LOC Analyzed', '121,000+'],
]
meta_table = Table(meta_data, colWidths=[35*mm, 40*mm, 35*mm, 40*mm])
meta_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ('TEXTCOLOR', (0, 0), (-1, 0), ACCENT),
    ('TEXTCOLOR', (0, 1), (-1, 1), ACCENT),
    ('TEXTCOLOR', (0, 2), (-1, 2), ACCENT),
    ('TEXTCOLOR', (1, 0), (1, -1), TEXT_PRIMARY),
    ('TEXTCOLOR', (3, 0), (3, -1), TEXT_PRIMARY),
    ('FONTNAME', (0, 0), (0, -1), 'LiberationSans-Bold'),
    ('FONTNAME', (1, 0), (-1, -1), 'LiberationSans'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
]))
story.append(meta_table)

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════
story.append(heading('TABLE OF CONTENTS'))
story.append(hr())

toc_items = [
    ('PART 1', 'Executive Summary'),
    ('PART 2', 'Architecture Overview'),
    ('PART 3', 'Module Registry and Organization'),
    ('PART 4', 'Core Infrastructure Layer'),
    ('PART 5', 'Dual Scan Engines'),
    ('PART 6', 'CLI and TUI Systems'),
    ('PART 7', 'Scanning Modules Inventory (28 Modules)'),
    ('PART 8', 'Intelligence Systems (3 Engines)'),
    ('PART 9', 'Security Architecture'),
    ('PART 10', 'Network and Protocol Layer'),
    ('PART 11', 'Report Generation System'),
    ('PART 12', 'Integration Layer (6 Clients)'),
    ('PART 13', 'Knowledge Graph and Social Graph'),
    ('PART 14', 'Kill Chain Engine'),
    ('PART 15', 'Advanced Capabilities'),
    ('PART 16', 'Observability and Telemetry'),
    ('PART 17', 'Testing Infrastructure'),
    ('PART 18', 'Deployment and Configuration'),
    ('PART 19', 'Known Issues and Technical Debt'),
    ('PART 20', 'Roadmap and Recommendations'),
]

toc_data = [[Paragraph(f'<b>{num}</b>', ParagraphStyle('toc_num', fontName='LiberationSans-Bold', fontSize=8, textColor=ACCENT)),
              Paragraph(name, ParagraphStyle('toc_name', fontName='NotoSerifSC', fontSize=9, textColor=TEXT_PRIMARY))]
             for num, name in toc_items]

toc_table = Table(toc_data, colWidths=[25*mm, 135*mm])
toc_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
    ('GRID', (0, 0), (-1, -1), 0.2, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4*mm),
    ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
]))
for i in range(len(toc_data)):
    if i % 2 == 1:
        toc_table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE)]))

story.append(toc_table)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 1: EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 1: Executive Summary'))
story.append(hr())

story.append(body(
    'ReconPro is a pure-Python enterprise security reconnaissance framework comprising 121,000+ lines of code across 200+ source files. '
    'The system operates with zero external runtime dependencies (Python stdlib only), requiring only Python 3.10+ and optionally the Rich library for terminal rendering. '
    'The codebase implements 28 scanning modules, 3 intelligence engines, 50+ CLI commands, 6 enterprise integrations, and a full Textual-based TUI application. '
    'Three dual output channels serve operators: a synchronous CLI scanner, an asynchronous concurrent engine, and a REST API server with token-based authentication.'
))
story.append(body(
    'The architecture follows a layered design with 7 levels (L0 Constants through L6 Entry Points), centered on a universal Finding dataclass that standardizes output across all modules. '
    'A centralized registry pattern in registry.py eliminates circular dependencies by providing a single source of truth for 24 remote and 3 local modules. '
    'The three intelligence systems (AI Analyst, Attack Graph, Threat Intel) compose into a unified Intelligence Pipeline that produces composite risk scores, attack paths, and threat correlations post-scan.'
))
story.append(body(
    'Performance benchmarks reveal that the Attack Graph engine is the primary bottleneck at scale, exhibiting O(n^2) growth. At 2000 findings, the full intelligence pipeline takes approximately 37 seconds, '
    'with the Attack Graph consuming 87.6% of total execution time. The AI Analyst scales at approximately O(n^1.3) and Threat Intel maintains linear O(n) scaling. '
    'Memory usage remains manageable even at scale, peaking at approximately 24MB for 2000 findings.'
))

# Key Metrics Table
story.append(spacer(2))
metrics_data = [
    ['Metric', 'Value', 'Metric', 'Value'],
    ['Total Files', '200+', 'Total LOC', '121,000+'],
    ['Python Modules', '28', 'CLI Commands', '50+'],
    ['Intelligence Engines', '3', 'Integrations', '6'],
    ['Test Files', '29', 'Test Methods', '1,250+'],
    ['REST API Endpoints', '20+', 'TUI Widgets', '7'],
    ['Report Formats', '5', 'Scoring Systems', '3'],
]
story.append(make_table(metrics_data, col_widths=[35*mm, 30*mm, 40*mm, 30*mm]))
story.append(spacer(2))

story.append(heading('Production Readiness Assessment', 'h2'))
story.append(body(
    'A prior 10-team engineering review assigned ReconPro a Production Readiness Score of 91/100 (Grade A). '
    'The architecture supports Docker containerization with production-grade Kubernetes manifests including security contexts, resource limits, health probes, topology-aware routing, and pod anti-affinity. '
    'Six security fixes have been applied addressing path traversal, XSS injection, severity sort inversion, shared mutable state, and silent exception swallowing. '
    'However, critical issues remain including version string inconsistency across 7+ files, dual scan engine divergence, and 274 lines of duplicated constant definitions.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 2: ARCHITECTURE OVERVIEW
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 2: Architecture Overview'))
story.append(hr())

story.append(body(
    'ReconPro employs a 7-layer architecture (L0 through L6) that enforces strict dependency directionality. '
    'L0 (Constants) provides shared definitions including severity levels, grade thresholds, color mappings, and path constants. '
    'L1 (Utilities) offers 17 pure functions for target validation, severity normalization, score computation, and cryptographic operations. '
    'L2 (Core) contains the universal Finding dataclass, RateLimiter, and HTTP probe abstraction that every module depends on. '
    'L3 (Engine) houses the dual scan engines (synchronous scanner.py and asynchronous engine.py) along with the module registry. '
    'L4 (Intelligence) implements the three analysis engines and their orchestration pipeline. '
    'L5 (Outputs) handles all report generation (PDF, HTML, JSON, Markdown, SARIF, XML, CSV). '
    'L6 (Entry Points) provides CLI, TUI, REST API, chat mode, and agent interfaces.'
))

story.append(heading('Key Architectural Decisions', 'h2'))

adr_data = [
    ['ADR', 'Decision', 'Status', 'Files Affected'],
    ['ADR-001', 'Pure Python stdlib only', 'Accepted', 'All modules'],
    ['ADR-002', 'Centralized module registry', 'Accepted', 'registry.py, scanner.py'],
    ['ADR-003', 'HTTP timing OS fingerprinting', 'Accepted', 'quantum_fingerprint.py'],
    ['ADR-004', 'Universal Finding dataclass', 'Accepted', 'http_layer.py, all modules'],
    ['ADR-005', 'Zero-config operation', 'Accepted', 'constants.py, cli.py'],
]
story.append(make_table(adr_data, col_widths=[20*mm, 55*mm, 25*mm, 45*mm]))
story.append(spacer(2))

story.append(heading('Design Patterns', 'h2'))
story.append(body(
    'The codebase implements several well-established design patterns. The Registry Pattern centralizes module definitions in a single file, eliminating circular imports between scanner.py and individual modules. '
    'The Strategy Pattern governs proxy rotation with four strategies (Round Robin, Random, Least Connections, Geo-Distributed). '
    'The Observer Pattern appears in the event-driven scan engine, where ScanEvent objects are emitted to EventCollector callbacks. '
    'The Template Method Pattern structures defense generation with category-specific fix templates. '
    'Lazy imports are used extensively throughout, with over 30 modules employing deferred import inside function bodies to prevent circular dependencies and reduce startup time. '
    'Duck typing is pervasive, with utility functions accepting both Finding objects and plain dictionaries via hasattr/getattr patterns.'
))

story.append(heading('Dependency Flow', 'h2'))
story.append(body(
    'The dependency graph is strictly hierarchical with one universal dependency: every scanning module imports from http_layer.py (L2) for the Finding dataclass and http_probe function. '
    'Cross-module dependencies are minimal and always lazy-loaded via try/except blocks. Five modules import sibling packages: bot.py imports threat_feeds, geoip, tunnel_detect, and exfil_channels; '
    'chain.py imports cross_validator and drift_monitor; recon.py imports wishes, social_graph, and sovereignty; oblivion.py imports zai_stream, wishes, ai_red_team, attribution, and cognitive_sec; '
    'and gorgon.py imports zai_stream, wishes, ai_red_team, ai_cve_db, kill_chain, and shadow_it. All cross-module imports are wrapped in try/except, ensuring graceful degradation when sibling packages are unavailable.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 3: MODULE REGISTRY AND ORGANIZATION
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 3: Module Registry and Organization'))
story.append(hr())

story.append(body(
    'The module registry system in registry.py serves as the single source of truth for all scanning modules. '
    'It defines 24 remote scanning modules, 3 local audit modules, and maintains default module lists for standard operations. '
    'The lazy-loaded _get_runners() function caches all module runner functions on first access, preventing repeated imports. '
    'However, since MODULE_REGISTRY is assigned at module level, all 25 modules are actually imported when registry.py is first imported, effectively defeating the lazy-loading pattern.'
))

mod_cat_data = [
    ['Category', 'Count', 'Modules', 'Default'],
    ['Core Remote', '11', 'recon, auth, chain, bot, gorgon, oblivion, vibesec, nhi, pegasus, cloud_recon, team', '8 of 11'],
    ['Advanced Remote', '12', 'quantum_fingerprint, dark_web_monitor, info_ops, steg, covert_channel, zero_day_hunter, infra_ghost, sigint, attributor, weaponized_report, honeypot_dance, dead_drop', 'All 12'],
    ['Local Audit', '3', 'host, dev, doctor', 'All 3'],
    ['Special', '2', 'iac_audit (Terraform/K8s/Docker), container_sec (escape analysis)', 'Excluded'],
]
story.append(make_table(mod_cat_data, col_widths=[25*mm, 12*mm, 80*mm, 20*mm]))
story.append(spacer(2))

story.append(body(
    'Adding a new module requires changes to three files: the module file itself in modules/, the __init__.py re-export list, and the registry.py build_module_registry function. '
    'Each module must expose a run_*(target, base_url, timeout, verify_tls) -> List[Finding] entry point. '
    'The vibesec module is uniquely handled across the codebase because it returns a 4-tuple (findings, score, grade, badge_markdown) instead of just a list of Findings. '
    'Default scans run 20 modules, excluding cloud_recon, team, and nhi for performance reasons. '
    'The team module is available but excluded from default scans as it manages local team membership rather than performing remote scanning.'
))

story.append(heading('Registry Functions', 'h2'))
reg_fn_data = [
    ['Function', 'Purpose', 'Returns'],
    ['build_module_registry()', 'Builds remote module dict', 'Dict[str, Dict]'],
    ['build_local_modules()', 'Builds local module dict', 'Dict[str, Dict]'],
    ['get_module_runner(id)', 'Gets runner function by ID', 'Callable or None'],
    ['is_local_module(id)', 'Checks if module is local', 'bool'],
    ['is_remote_module(id)', 'Checks if module is remote', 'bool'],
    ['list_remote_modules()', 'Lists all remote module IDs', 'List[str]'],
    ['list_local_modules()', 'Lists all local module IDs', 'List[str]'],
    ['get_module_color(id)', 'Gets display color for module', 'str'],
]
story.append(make_table(reg_fn_data, col_widths=[45*mm, 60*mm, 40*mm]))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 4: CORE INFRASTRUCTURE LAYER
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 4: Core Infrastructure Layer'))
story.append(hr())

story.append(heading('__init__.py (73 LOC)', 'h2'))
story.append(body(
    'The package entry point defines version 11.0.0 and exports scan, ReconProResult, audit_scan, and __version__ as the public API. '
    'The 67-line module docstring serves as the canonical catalog, listing all remote modules (13 listed, but 24 actual), advanced modules (12), '
    'local modules (3), powers (13), and intelligence systems (3) with descriptions and CLI usage examples. '
    'The banner text "Twenty-Three Blades" is stale, dating from an earlier version. Imports scan from scanner.py (synchronous), not engine.py (asynchronous).'
))

story.append(heading('constants.py (117 LOC)', 'h2'))
story.append(body(
    'The single source of truth for all shared constants. Defines SEVERITY_LEVELS (5 levels: critical through info), GRADE_THRESHOLDS (6 tiers: A+ through F), '
    'color mappings for Rich console output, SARIF level mappings, badge color mappings, default timeouts (8s), rate limits (10.0/s), body limits (16KB), '
    'and max workers (4). Path constants define RECONPRO_HOME (~/.reconpro) with subdirectories for scans, plugins, memory, knowledge graph, and tools. '
    'The USER_AGENT string says "ReconPro/10.0" but __version__ is "11.0.0", representing a stale version string that has not been updated.'
))

story.append(heading('utils.py (277 LOC)', 'h2'))
story.append(body(
    'Seventeen shared utility functions with zero side effects and no ReconPro-internal imports beyond constants. '
    'Key functions include extract_host() for URL parsing, validate_target() for input validation with private IP detection, '
    'count_severities() for duck-type finding counting, sort_findings_by_severity() for stable sorting, '
    'severity_to_cvss() and severity_to_dread() for framework mapping, compute_score() for additive point deduction from base 100, '
    'compute_grade() for numeric-to-letter grade conversion, and badge_markdown() for GitHub shields.io badge generation. '
    'Shannon entropy calculation, private IP detection, and URL joining utilities round out the collection. '
    'Notably, severity_to_dread() uses a lazy import from constants despite constants already being imported at the module level.'
))

story.append(heading('interfaces.py (91 LOC)', 'h2'))
story.append(body(
    'Defines 5 runtime-checkable Protocols (ScanModule, FindingProcessor, ReportGenerator, EventEmitter, ConfigurationProvider) and one ABC (PluginInterface). '
    'Type aliases are defined but loosely typed: Findings = list provides no type safety. '
    'The dual typing approach allows modules to use either structural typing (Protocols) or nominal typing (ABCs). '
    'Backward compatibility is maintained as existing modules do not need to implement any interface explicitly.'
))

story.append(heading('context.py (75 LOC)', 'h2'))
story.append(body(
    'Defines a ScanContext dataclass intended to replace the 4-argument pattern (target, base_url, timeout, verify_tls) with a single context object. '
    'Includes auto-populated fields for trace_id (12-char UUID hex), started_at timestamp, and lazily extracted host/scheme/port. '
    'The to_args() method provides backward compatibility. However, this context class is defined but NOT actually used by scanner.py or engine.py, '
    'representing a planned migration that was never completed. The port field is declared but never populated, always remaining 0.'
))

story.append(heading('delta.py (708 LOC)', 'h2'))
story.append(body(
    'Dynamic delta reporting system comparing two scan results with git integration. Provides DeltaReporter class with compare(), generate_markdown(), and generate_sarif() methods. '
    'Supports snapshot save/load/compare operations persisted to ~/.reconpro/snapshots/. Integrates with git for blame attribution on new findings. '
    'Notable issues include duplicated _SEV_ORDER from constants.py, stale SARIF version "8.5.0" (should be 11.0.0), finding deduplication using title as key (fragile), '
    'and dead code in _git_blame() where summary parsing attempts to extract a hash from the summary field instead of the first output line.'
))

story.append(heading('formats.py (502 LOC)', 'h2'))
story.append(body(
    'Multi-format export system supporting SARIF 2.1.0, Markdown, JSON, HTML, and PDF (via print-ready HTML with @media print CSS). '
    'The export_sarif() function builds unique rules per category, maps findings to SARIF results with locations, properties, and evidence, '
    'and includes CVE data, intelligence scores, and attack path information. The export_markdown() function generates GitHub-style reports with badges, '
    'severity tables, module breakdowns, remediation sections, and intelligence analysis. '
    'Notable duplication: _SARIF_LEVEL and _SEV_ORDER are copied from constants.py instead of being imported.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 5: DUAL SCAN ENGINES
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 5: Dual Scan Engines'))
story.append(hr())

story.append(heading('scanner.py - Synchronous Engine (210 LOC)', 'h2'))
story.append(body(
    'The original sequential scan orchestrator. Runs modules one-by-one in a for loop, collecting findings into ReconProResult. '
    'Creates a RateLimiter instance but never passes it to any module runner (dead code). Does NOT run the IntelligencePipeline post-scan, '
    'meaning results have intelligence=None when using this engine. Does NOT call HookManager for plugin integration. '
    'This is the engine imported by __init__.py and used by the CLI, making it the default execution path for reconpro.scan(). '
    'Special-cases the vibesec module which returns a 4-tuple instead of a list.'
))

story.append(heading('engine.py - Asynchronous Engine (727 LOC)', 'h2'))
story.append(body(
    'The concurrent scan orchestrator designed as a drop-in replacement for scanner.scan(). Uses asyncio.Semaphore for bounded concurrency (default 5). '
    'Implements ScanEvent-driven architecture with EventCollector for real-time progress tracking. '
    'Creates per-scan RateLimiter instances (fixed shared-state bug from prior sessions). Runs IntelligencePipeline.analyze() post-scan. '
    'Integrates HookManager for pre_scan, post_finding, and post_scan plugin lifecycle hooks. '
    'Module exceptions are caught and recorded as info-severity findings, meaning a crashing module silently downgrades to non-affecting results. '
    'The concurrent_scan() function has dead code: creates a global_semaphore that is never used, as each scan_one() creates its own ScanEngine with internal semaphore.'
))

engine_comp = [
    ['Feature', 'scanner.py (Sync)', 'engine.py (Async)'],
    ['Execution', 'Sequential for-loop', 'Concurrent asyncio tasks'],
    ['Intelligence Pipeline', 'No', 'Yes (post-scan)'],
    ['Hook System', 'No', 'Yes (HookManager)'],
    ['Rate Limiter', 'Created but unused', 'Per-scan instances'],
    ['Event System', 'None', 'ScanEvent + EventCollector'],
    ['Module Error Handling', 'Raises exception', 'Creates info-severity finding'],
    ['CLI Default', 'Yes', 'No'],
    ['vibesec Handling', '4-tuple detection', '4-tuple + fallback'],
]
story.append(spacer(2))
story.append(make_table(engine_comp, col_widths=[35*mm, 50*mm, 60*mm]))
story.append(spacer(2))

story.append(critical('Dual Engine Divergence: The two engines have fundamentally different behavior regarding intelligence analysis, '
    'plugin hooks, error handling, and rate limiting. This is a CRITICAL architectural issue identified in the Team 1 Architecture Review.'))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 6: CLI AND TUI SYSTEMS
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 6: CLI and TUI Systems'))
story.append(hr())

story.append(heading('cli.py - Command Line Interface (2,014 LOC)', 'h2'))
story.append(body(
    'A massive 2,014-line file implementing 50+ subcommands via argparse. The main() function alone spans 1,765 lines, constituting a God function '
    'that should be decomposed into separate command modules. Uses Rich for terminal rendering with progress bars, tables, panels, and spinners. '
    'Imports MODULE_REGISTRY and other registries from scanner.py (which re-exports from registry.py), creating an indirect dependency chain. '
    'SEV_COLORS is hardcoded locally instead of imported from constants.py, creating a maintenance risk. '
    'Many advanced module commands follow identical patterns (banner -> lazy import -> spinner wrap -> print findings) that should be abstracted into a generic dispatcher. '
    'The implicit scan feature auto-parses positional arguments as scan targets when no subcommand is given.'
))

story.append(heading('Key CLI Commands', 'h2'))
cli_cmd_data = [
    ['Category', 'Commands', 'Count'],
    ['Scanning', 'scan, vibesec, audit, dev, doctor, blitz, ports, secrets', '8'],
    ['Advanced Modules', 'quantum-fingerprint, dark-web, info-ops, steg, covert, zero-day, ghost, sigint, attributor, weaponized-report, honeypot, dead-drop', '12'],
    ['Intelligence', 'agent, graph, nexus, ai-redteam, supply-chain, cross-validate', '6'],
    ['Recon & Intel', 'subdomains, passive, cve, threat-feeds, geoip', '5'],
    ['Infrastructure', 'serve, schedule, swarm, adversarial, deploy', '5'],
    ['Analysis', 'report, history, diff, delta, benchmark, rate, profile', '7'],
    ['Meta', 'list, open, plugin, chat, tui, export, zai, wishes, info', '9'],
]
story.append(make_table(cli_cmd_data, col_widths=[30*mm, 110*mm, 15*mm]))
story.append(spacer(2))

story.append(heading('cli_help.py - Help Database (1,004 LOC)', 'h2'))
story.append(body(
    'A pure data file containing help text for 36+ modules and 25+ CLI commands, totaling approximately 700 lines of structured help data. '
    'Each module entry includes description, examples, details, output format, and cross-references. '
    'The render_module_help() function formats help boxes with DESCRIPTION, DETAILS, EXAMPLES, OUTPUT, and SEE ALSO sections. '
    'render_all_modules() produces a complete module listing, and render_quick_start() generates a 12-step getting-started guide.'
))

story.append(heading('nexus_tui.py - Terminal UI (3,359 LOC)', 'h2'))
story.append(body(
    'The second-largest file in the codebase implements a full Textual-based TUI application with 124 methods in the NexusApp class. '
    'Features include animated boot sequence, real-time module status indicators, pulsing status dots, scan progress tracking, '
    'session persistence to JSON, command completion with fuzzy matching, vim-style keybindings, and a responsive layout system. '
    'Seven custom widgets (ScoreGauge, Sparkline, StatCounter, VelocityMeter, CommandCompleter, HintBar, Toast) provide rich visual feedback. '
    'The TUI supports 20+ scan types including scan, audit, dev, doctor, blitz, subdomains, agent, swarm, adversarial, graph, passive, fuzzer, cve, profile, netmap, defense, compliance, delta, benchmark, iac, container, ast, cloud_recon.'
))

story.append(heading('chat.py - Interactive Chat Mode (448 LOC)', 'h2'))
story.append(body(
    'Natural language interface allowing operators to "talk to ReconPro like a teammate." Supports commands like scan, audit, dev, doctor, blitz, subdomains, agent, history, compare, report, score, secrets, ports, and screenshot. '
    'Bare domain/URL input is automatically treated as a scan target. Features ASCII art banner and Rich-formatted colored output.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 7: SCANNING MODULES INVENTORY
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 7: Scanning Modules Inventory (28 Modules)'))
story.append(hr())

story.append(body(
    'The scanning modules directory contains 30 Python files (28 modules + __init__.py + container_sec.py), totaling approximately 34,902 lines of code. '
    'All modules are fully implemented with complete logic and zero stubs. Every module exposes a run_*(target, base_url, timeout, verify_tls) -> List[Finding] entry point '
    'and uses the universal Finding dataclass from http_layer.py for output standardization. The average module is approximately 1,163 lines of code.'
))

story.append(heading('Core Remote Modules', 'h2'))
core_mod_data = [
    ['Module', 'LOC', 'Category', 'Key Capabilities', 'Status'],
    ['recon.py', '1,247', 'Surface Recon', '25-category recon: DNS, headers, tech, TLS, ports, WAF', 'Implemented'],
    ['auth.py', '1,038', 'Authentication', 'JWT analysis, bypass, OAuth, session, rate limiting', 'Implemented'],
    ['chain.py', '291', 'SSRF/Redirect', 'Redirect chains, SSRF injection, open redirect', 'Implemented'],
    ['bot.py', '355', 'C2 Detection', 'Malware signatures, C2 paths, threat feed reputation', 'Implemented'],
    ['gorgon.py', '634', 'Adversarial', '17-stage fear engine, DREAD scoring', 'Implemented'],
    ['oblivion.py', '748', 'Deep Oracle', '23-stage DREAD analysis, 6 fear levels', 'Implemented'],
    ['vibesec.py', '206', 'Vibe Benchmark', '7-category AI/vibe-coding vuln scoring', 'Implemented'],
    ['nhi.py', '159', 'Non-Human ID', 'Cloud metadata, token scanning, credential probing', 'Implemented'],
    ['pegasus.py', '195', 'Spyware', '116 C2 domains, SMS patterns, backup analysis', 'Implemented'],
    ['cloud_recon.py', '1,152', 'Cloud Infra', 'AWS/Azure/GCP/DO metadata, S3, DNS', 'Implemented'],
    ['team.py', '256', 'Team Mgmt', 'Local team CRUD, activity logging, invite codes', 'Implemented'],
]
story.append(make_table(core_mod_data, col_widths=[22*mm, 12*mm, 22*mm, 60*mm, 20*mm]))
story.append(spacer(2))

story.append(heading('Advanced Remote Modules (v9.2.0)', 'h2'))
adv_mod_data = [
    ['Module', 'LOC', 'Key Innovation', 'Status'],
    ['quantum_fingerprint.py', '2,025', '7-signal HTTP timing OS fingerprinting (novel)', 'Implemented'],
    ['dark_web_monitor.py', '788', '7 paste sources, 6 OSINT APIs, breach DB', 'Implemented'],
    ['free_info_ops.py', '2,080', 'Deception resilience, false flag analysis', 'Implemented'],
    ['steganography_detector.py', '1,381', '10 detection categories, chi-squared test', 'Implemented'],
    ['covert_channel.py', '1,673', '8 channel classes, simulation + detection', 'Implemented'],
    ['zero_day_hunter.py', '1,576', 'Statistical anomaly detection, fuzzing analysis', 'Implemented'],
    ['infrastructure_ghost.py', '2,116', 'IP discovery, CT mining, drift detection', 'Implemented'],
    ['signal_intelligence.py', '2,046', '9 C2 frameworks, beaconing, traffic analysis', 'Implemented'],
    ['nation_state_attributor.py', '769', '22 APT groups, 5 attribution methods', 'Implemented'],
    ['weaponized_report.py', '2,509', '50+ tracker signatures, stego watermarks', 'Implemented'],
    ['honeypot_dance.py', '1,815', 'Response timing, 15+ honeypot fingerprints', 'Implemented'],
    ['dead_drop.py', '2,222', '8 crypto channels, DNS/TXT/ETag/CT detection', 'Implemented'],
]
story.append(make_table(adv_mod_data, col_widths=[30*mm, 15*mm, 75*mm, 20*mm]))
story.append(spacer(2))

story.append(heading('Local Audit Modules', 'h2'))
local_mod_data = [
    ['Module', 'LOC', 'Platform', 'Checks', 'Status'],
    ['host.py', '1,488', 'Linux/macOS/Win', '27: ports, SSH, Docker, env, SUID, kernel CVEs', 'Implemented'],
    ['dev.py', '1,087', 'All', '19: deps, git, .env, secrets, Docker, lockfile CVEs', 'Implemented'],
    ['doctor.py', '1,256', 'Linux/macOS/Win', '17: password, encryption, antivirus, firewall', 'Implemented'],
]
story.append(make_table(local_mod_data, col_widths=[22*mm, 15*mm, 22*mm, 70*mm, 20*mm]))
story.append(spacer(2))

story.append(heading('Special Modules', 'h2'))
story.append(body(
    'iac_audit.py (2,121 LOC) parses Terraform, CloudFormation, Dockerfiles, K8s manifests, and Docker Compose files with custom parsers that require no external YAML library. '
    'container_sec.py (1,018 LOC) analyzes Dockerfiles and K8s manifests for container escape vectors with compound risk evaluation. '
    'ast_analyzer.py (611 LOC) performs Python AST walking with 20 security checks plus JS/TS regex scanning with 14 patterns.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 8: INTELLIGENCE SYSTEMS
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 8: Intelligence Systems (3 Engines)'))
story.append(hr())

story.append(body(
    'The intelligence layer consists of three engines that compose into a unified Intelligence Pipeline. All three are rule-based (no LLM required) '
    'and use only Python standard library. They are orchestrated by intelligence_pipeline.py which runs them sequentially and computes composite risk scores.'
))

story.append(heading('AI Analyst Engine (ai_analyst.py - 1,639 LOC)', 'h2'))
story.append(body(
    'A pure-Python rule-based security analysis engine implementing 6 sub-engines and 12 classes. The FindingClassifier uses 35 regex patterns and 17 module rules '
    'with 4-phase scoring (title match, module source, category hint, evidence enrichment). The FindingCorrelator uses SHA256 deduplication and O(n^2) pair analysis '
    'capped at 50,000 pairs to detect shared-asset correlations and attack chains across 17 chain templates. '
    'The ExploitabilityEstimator provides category-specific baseline scores for 14 vulnerability types. '
    'The BusinessImpactAnalyzer assesses 5 impact dimensions (financial, reputational, operational, compliance, legal). '
    'The AttackPathDetector uses DFS/BFS graph traversal across 11 multi-step chain templates. '
    'The RemediationPrioritizer ranks fixes by weighted priority (severity x0.35 + exploitability x0.25 + impact x0.25 + confidence x0.15). '
    'Known issue: _detect_chains line 662 has "if shared or True:" which always executes regardless of the shared check (debug leftover).'
))

story.append(heading('Attack Graph Engine (attack_graph.py - 988 LOC)', 'h2'))
story.append(body(
    'Builds directed attack graphs from scan findings using a custom DiGraph implementation with adjacency lists. '
    'Supports BFS path finding, DFS all-paths enumeration, approximate betweenness centrality, choke point detection (30% path concentration threshold), '
    'and single-point-of-failure identification via path-block simulation. Maps findings to 7 Lockheed Martin kill chain phases via 30 category-to-phase mappings. '
    'Uses 33 relationship templates defining how vulnerability categories connect. '
    'Maximum graph size: 5,000 nodes and 20,000 edges with safe edge addition. This is the CRITICAL BOTTLENECK scaling at O(n^2), '
    'consuming 87.6% of pipeline time at 2000 findings.'
))

story.append(heading('Threat Intel Engine (threat_intel.py - 940 LOC)', 'h2'))
story.append(body(
    'Centralized threat intelligence enrichment engine with thread-safe caching and TTL eviction. '
    'Contains embedded databases: 25 known CVE entries (Log4Shell, XZ Utils Backdoor, etc.), CISA KEV list, CWE mappings for 24 categories, '
    'MITRE ATT&CK technique mappings, CAPEC mappings, and OWASP Top 10 with full descriptions. '
    'Implements 32 technology detection regex patterns and online NVD API lookup with SSRF protection (host validation, HTTPS-only, 65KB response cap). '
    'Scales linearly O(n) making it the most efficient of the three engines.'
))

story.append(heading('Intelligence Pipeline (intelligence_pipeline.py - 456 LOC)', 'h2'))
story.append(body(
    'Post-scan orchestration composing all three engines. Supports selective engine activation via flags. '
    'Computes 5 composite scores: executive_risk_score (severity x count_factor + chain_boost), exposure_score (critical x15 + high x8 x asset_factor), '
    'mission_impact_score, infrastructure_health_score (100 - executive_risk), and threat_confidence_index. '
    'Risk levels: CRITICAL (>75), HIGH (>55), MEDIUM (>35), LOW (>15), MINIMAL. '
    'Maximum finding cap: 10,000. All engine failures are caught and reported as errors without crashing the pipeline.'
))

perf_data = [
    ['Finding Count', 'AI Analyst (ms)', 'Attack Graph (ms)', 'Threat Intel (ms)', 'Pipeline (ms)'],
    ['100', '205', '84', '36', '312'],
    ['500', '1,089', '1,835', '168', '3,188'],
    ['1,000', '1,966', '7,493', '342', '9,977'],
    ['2,000', '3,772', '30,973', '709', '36,968'],
]
story.append(spacer(2))
story.append(Paragraph('<b>Intelligence Pipeline Performance Benchmarks</b>', ParagraphStyle('tbl_title', fontName='LiberationSans-Bold', fontSize=9, textColor=ACCENT, spaceAfter=2*mm)))
story.append(make_table(perf_data, col_widths=[25*mm, 30*mm, 30*mm, 30*mm, 30*mm]))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 9: SECURITY ARCHITECTURE
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 9: Security Architecture'))
story.append(hr())

story.append(heading('security.py (811 LOC)', 'h2'))
story.append(body(
    'Centralized security hardening layer providing multi-layered input validation, safe parsing, secret detection, and audit logging. '
    'Implements 5 sanitization functions (target, path, filename, HTML, shell), 3 safe parsers (JSON with 1MB/20-depth/10K-key limits, URL with scheme whitelist, XML with entity expansion prevention), '
    '10 regex-based secret detection patterns, structured JSON audit logging with rotating file handler (10MB, 5 backups), file hash computation, '
    'and supply chain integrity checking. Classifies threats into 5 categories: injection, crypto, network, data, and auth.'
))

story.append(heading('defense.py (1,402 LOC)', 'h2'))
story.append(body(
    'Autonomous defense generation producing deployable WAF rules (ModSecurity, Nginx, Cloudflare), code patches with before/after diffs, '
    'Terraform infrastructure fixes, and remediation text for 20+ vulnerability categories. '
    'Uses template-based generation with variable substitution. DefenseBundle computes a defense readiness score 0-100.'
))

story.append(heading('sanitize.py (32 LOC)', 'h2'))
story.append(body(
    'Convenience re-export facade providing clean import path from reconpro.sanitize to 11 security.py functions. '
    'No original code. Pure re-export module.'
))

story.append(heading('entropy.py (727 LOC)', 'h2'))
story.append(body(
    'Granular secret entropy scoring combining Shannon entropy with contextual signals. Contains 50+ known secret prefixes '
    '(AWS, GitHub, GitLab, Slack, Stripe, Twilio, Google, JWT, Azure) with format validation for 12+ prefix types. '
    '8-rule classification matrix produces severity levels (CRITICAL through INFO). Supports file and directory scanning '
    'with 29 default extensions, skipping 20+ blacklisted directories and binary files.'
))

story.append(heading('Security Audit Findings (Team 3)', 'h2'))
sec_data = [
    ['Severity', 'Count', 'Key Issues'],
    ['CRITICAL', '3', 'Path traversal in /report and /history, unauthenticated token generation'],
    ['HIGH', '6', 'XSS in HTML reports, unsandboxed plugins, SSRF, shell=True, error leakage'],
    ['MEDIUM', '10', 'CORS wildcard, unbounded SSE/token dict, no rate limiting on scan endpoint'],
    ['LOW', '6', 'Sensitive MITM captures, missing audit validation, stale code'],
]
story.append(make_table(sec_data, col_widths=[20*mm, 15*mm, 115*mm]))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 10: NETWORK AND PROTOCOL LAYER
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 10: Network and Protocol Layer'))
story.append(hr())

story.append(heading('http_layer.py (165 LOC)', 'h2'))
story.append(body(
    'The universal HTTP abstraction used by every scanning module. Defines the Finding dataclass (10 fields: title, severity, category, module, description, evidence, asset, points_deducted, remediation, dread_score), '
    'a token-bucket RateLimiter, and the http_probe() function with hardened error handling, 16KB body limit, and TLS configuration. '
    'Also provides compute_grade() and badge_markdown() utility functions. All modules import from this file, making it the most depended-upon file in the codebase.'
))

net_mod_data = [
    ['Module', 'LOC', 'Purpose', 'Key Feature'],
    ['async_http.py', '902', 'Async HTTP with adaptive rate limiting', 'Per-domain EMA, aiohttp->urllib fallback'],
    ['connection_pool.py', '255', 'Thread-safe HTTP pool with SSL caching', 'Double-checked locking, perf counters'],
    ['proxy.py', '705', 'Proxy pool with rotation strategies', '4 strategies, Tor circuit management'],
    ['evasion.py', '1,117', 'Anti-fingerprinting and WAF bypass', '40+ UAs, JA3/JA4, timing jitter'],
    ['raw_sockets.py', '598', 'SYN scan, UDP probe, OS fingerprint', 'Scapy fallback, 3-method TTL analysis'],
    ['tunnel_detect.py', '1,025', 'Protocol tunnel detection', '8 tunnel types, entropy analysis'],
    ['mitm.py', '612', 'MITM proxy and traffic analysis', '15 token patterns, auth bypass testing'],
    ['browser_mod.py', '158', 'Playwright browser automation', 'JS-rendered secret scanning'],
]
story.append(make_table(net_mod_data, col_widths=[28*mm, 12*mm, 45*mm, 55*mm]))
story.append(spacer(2))

story.append(body(
    'Three competing HTTP layers exist: http_layer.py (synchronous, used by all modules), async_http.py (async with adaptive rate limiting), '
    'and connection_pool.py (thread-safe pool with SSL context caching). Each has different User-Agent strings: ReconPro/10.0, ReconPro/10.0, and ReconPro/2.0 respectively. '
    'The async_http.py module provides the most sophisticated implementation with per-domain adaptive rate limiting using exponential moving average for response time and error rate, '
    'automatic back-off on 429/503 responses with jitter, concurrent limit reduction on timeouts, and manual redirect following with 303->GET conversion.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 11: REPORT GENERATION SYSTEM
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 11: Report Generation System'))
story.append(hr())

story.append(heading('report_writer.py (551 LOC)', 'h2'))
story.append(body(
    'AI-powered report generation with optional LLM enhancement (OpenAI) and template fallback. '
    'Supports 4 audience modes: executive (max 5 findings, business risk focus), technical (all findings), compliance (framework-mapped with ISO 27001/NIST 800-53), '
    'and developer (actionable PRs). The ExecutiveSummaryGenerator tries LLM first, falls back to templates. '
    'Template methods generate structured markdown with severity overviews, module breakdowns, and priority remediation lists.'
))

story.append(heading('reports.py (1,959 LOC)', 'h2'))
story.append(body(
    'Chart.js-powered HTML report generation with interactive visualizations. Generates 8 chart types: '
    'score gauge, severity doughnut, DREAD radar, module bar, points horizontal bar, category bar, severity stacked bar, and DREAD grouped bar. '
    'All charts use CDN-loaded Chart.js 4.4.7. The HTML report is a single self-contained file with inline CSS, glassmorphism cards, gradient accent lines, '
    'animated stat counters, smooth scroll navigation, and responsive design. Also generates CSV, SARIF, XML, Markdown, and JSON reports. '
    'The PDF generation function is a placeholder that generates print-ready HTML instead of actual PDF.'
))

story.append(heading('Report Formats Summary', 'h2'))
rpt_data = [
    ['Format', 'Engine', 'Features', 'Status'],
    ['SARIF 2.1.0', 'formats.py', 'Full rules, locations, CVE data, intelligence', 'Complete'],
    ['Markdown', 'formats.py / report_writer.py', 'GitHub badges, tables, remediation', 'Complete'],
    ['HTML Interactive', 'reports.py', 'Chart.js, glassmorphism, animated', 'Complete'],
    ['JSON', 'formats.py', 'Pretty-printed, all fields', 'Complete'],
    ['PDF (print HTML)', 'formats.py', '@media print CSS, styled', 'Placeholder'],
    ['CSV', 'reports.py', 'Tabular data export', 'Complete'],
    ['XML', 'reports.py', 'Structured data export', 'Complete'],
]
story.append(make_table(rpt_data, col_widths=[25*mm, 35*mm, 70*mm, 20*mm]))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 12: INTEGRATION LAYER
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 12: Integration Layer (6 Clients)'))
story.append(hr())

story.append(body(
    'The integration layer provides 6 enterprise clients, all using only Python stdlib (urllib.request for HTTP, json for serialization). '
    'All clients implement a consistent sync_findings(findings, target) interface returning structured dicts. '
    'Configuration is file-based (YAML or JSON) stored at ~/.reconpro/integrations/.'
))

int_data = [
    ['Client', 'LOC', 'Auth', 'Config', 'Key Features'],
    ['JiraClient', '391', 'Basic (email:token)', 'YAML', 'ADF descriptions, issue sync, JQL search'],
    ['SlackClient', '411', 'Webhook/Bot Token', 'YAML', 'Block Kit alerts, daily digest, mrkdwn'],
    ['GitHubClient', '508', 'Bearer token', 'YAML', 'SARIF upload, PR comments, commit status'],
    ['SplunkClient', '54', 'HEC token', 'Explicit', 'Minimal HEC sender'],
    ['PagerDutyClient', '72', 'API key', 'Explicit', 'Incident creation (5 cap)'],
    ['ZAIStreamClient', '428', 'Bearer + SSE', 'Auto-discover', 'Streaming analysis, chat, health check'],
]
story.append(make_table(int_data, col_widths=[25*mm, 12*mm, 25*mm, 18*mm, 60*mm]))
story.append(spacer(2))

story.append(body(
    'Notable patterns: Jira, Slack, and GitHub clients share identical _load_config() functions (copy-pasted across 3 files, should be extracted). '
    'The ZAIStreamClient is the most complex integration with SSE parser, streaming support, and auto-config discovery from three search paths. '
    'Splunk and PagerDuty are minimal implementations without file-based config loading. Error handling is inconsistent: '
    'Jira/GitHub/Slack raise RuntimeError while Splunk/PagerDuty return error dicts.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 13: KNOWLEDGE GRAPH AND SOCIAL GRAPH
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 13: Knowledge Graph and Social Graph'))
story.append(hr())

story.append(heading('knowledge_graph.py (774 LOC)', 'h2'))
story.append(body(
    'Directed security knowledge graph supporting 11 node types (target, subdomain, port, service, vulnerability, finding, CVE, asset, endpoint, technology, certificate) '
    'and 9 edge types. Features BFS-based attack surface analysis (depth-3), blast radius computation (depth-10), DFS attack chain discovery (max 8 hops), '
    'cross-correlation via shared technology/port, and Neo4j-compatible Cypher output. '
    'NetworkX is optional with a complete pure-Python fallback implementation (_FallbackDiGraph). '
    'The dual-backend approach results in approximately 20 occurrences of if/else branching that could be abstracted behind a unified graph interface. '
    'Persistence via JSON serialization with NetworkX node-link format or fallback dict format.'
))

story.append(heading('social_graph.py (935 LOC)', 'h2'))
story.append(body(
    'OSINT social graph intelligence extracting entities and relationships from 4 passive data sources: DNS resolution, WHOIS records, HTTP headers, and crt.sh certificate transparency logs. '
    'Detects CDN providers (11: Cloudflare, AWS CloudFront, Fastly, Vercel, etc.), proxy chains, and co-hosted domains. '
    'Implements Tarjan\'s articulation point algorithm (O(V+E)) for bridge entity detection, unweighted BFS shortest path, and connected component clustering. '
    'WHOIS extraction depends on the system whois command which may not be available on all platforms. crt.sh queries are not rate-limited.'
))

story.append(heading('graph_ui.py (678 LOC)', 'h2'))
story.append(body(
    'Generates self-contained HTML files with D3.js force-directed graph visualization. All JavaScript and CSS embedded inline (no external dependencies). '
    'Node coloring by type (target=blue, vulnerability=red, CVE=orange, technology=gray, etc.). Interactive features: hover tooltips, zoom, pan, click details.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 14: KILL CHAIN ENGINE
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 14: Kill Chain Engine'))
story.append(hr())

story.append(body(
    'The kill_chain.py module (2,992 LOC) implements a full 7-phase Lockheed Martin Cyber Kill Chain automation with the largest single class in the codebase (KillChainEngine with 54 methods). '
    'Each phase maps to MITRE ATT&CK techniques: Reconnaissance (5 techniques), Weaponization (4), Delivery (6), Exploitation (6), Installation (5), Command & Control (5), and Actions on Objectives (4).'
))

kc_data = [
    ['Phase', 'Methods', 'Key Techniques'],
    ['Reconnaissance', '6', 'DNS harvest, WHOIS, subnet enum, subdomain extract, ASN lookup, tech detect'],
    ['Weaponization', '3', 'SQLi/XSS/LFI payload generation'],
    ['Delivery', '7', 'MX/SPF/DMARC, upload endpoints, phishing, SSRF, open relay'],
    ['Exploitation', '10', 'Remote services, public apps, sensitive paths, backups, DB dumps, cron'],
    ['Installation', '7', 'Persistence, C2 paths, botnet, reverse shell, WebSocket, proxy, encrypted'],
    ['Command & Control', '3', 'Exfiltration risk, lateral movement, priv       esc paths'],
    ['Actions on Objectives', '4', 'Business impact, data classification, DoS, alternate exfil'],
]
story.append(make_table(kc_data, col_widths=[25*mm, 15*mm, 105*mm]))
story.append(spacer(2))

story.append(body(
    'The ThreatMatrix cross-references phases with MITRE ATT&CK tactics, computing weighted overall risk (exploit=0.25, install=0.20, delivery=0.15, C2=0.15, weaponize=0.10, actions=0.10, recon=0.05). '
    'The AttackTree builds an OR-tree representation from phase data. Technology signatures for 8 platforms (WordPress, Drupal, Joomla, Apache, Nginx, IIS, PHP, ASP.NET) '
    'include actual exploit payloads for testing purposes. '
    'The C2_PATH_SIGNATURES constant contains 21 common C2 URI patterns for detection.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 15: ADVANCED CAPABILITIES
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 15: Advanced Capabilities'))
story.append(hr())

adv_cap_data = [
    ['Module', 'LOC', 'Purpose', 'Notable'],
    ['attribution.py', '3,145', 'Nation-state attack attribution', '22 APT groups, 14 campaigns, 5 signals'],
    ['fuzzer.py', '1,744', 'Context-aware payload fuzzing', 'Tech stack detection, payload selection'],
    ['chain_engine.py', '2,228', 'Multi-vector attack path chaining', '50+ rules, graph-based, LLM-assisted'],
    ['adversarial.py', '1,150', '3-agent remediation loop', 'HACKER/CODER/GUARDIAN, 20+ rules'],
    ['swarm.py', '1,121', 'Multi-agent multiprocessing', '4 agents (SCOUT/HACKER/CODER/GUARDIAN)'],
    ['webhooks.py', '876', 'VCS webhook listeners', 'HMAC-SHA256, PR comments, commit status'],
    ['api_discovery.py', '1,185', 'Dynamic API blueprint reconstruction', '6 sub-engines, GraphQL, gRPC, OpenAPI'],
    ['netmap.py', '724', 'Zero-trust network mapping', 'ICMP/ARP/mDNS/port scan, trust mapping'],
    ['geoip.py', '684', 'IP geolocation enrichment', 'Batch API, cloud provider heuristics, cache'],
    ['shadow_it.py', '1,684', 'Shadow IT discovery', 'Abandoned infrastructure, orphaned DNS, credential leaks'],
    ['memory.py', '903', 'Unified memory store', 'FindingStore, AgentBlackboard, CredentialVault'],
    ['exfil_channels.py', '974', 'Exfiltration channel mapping', 'Channel viability scoring, risk assessment'],
    ['wishes.py', 'Large', '22-wish ritual orchestration', 'Fear Index, witness records, hall of fame'],
    ['nexus_agent.py', '3,417', 'Agentic security engine', '22 tools, LLM/rule-based, CVSS scoring'],
]
story.append(make_table(adv_cap_data, col_widths=[25*mm, 12*mm, 50*mm, 60*mm]))
story.append(spacer(2))

story.append(body(
    'The attribution.py module is the third-largest file at 3,145 LOC, implementing TTP matching with Jaccard similarity, campaign tracking, '
    'nation-state profiling via weighted voting (ASN 0.25, TLS 0.25, language 0.20, WAF 0.20, timezone 0.10), and country-specific signatures for CN, RU, IR, KP, VN, PK. '
    'The nexus_agent.py is the largest file at 3,417 LOC, serving as the core intelligence brain with 22 registered tools, '
    'CVSS v3.1 scoring (16 category profiles), 25 correlation rules, and support for both OpenAI and Anthropic LLM backends with pure rule-based fallback.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 16: OBSERVABILITY AND TELEMETRY
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 16: Observability and Telemetry'))
story.append(hr())

story.append(body(
    'The observability layer implements structured logging, metrics collection, distributed tracing, and health monitoring using only Python stdlib. '
    'No external observability frameworks (OpenTelemetry, Prometheus client, etc.) are used.'
))

obs_data = [
    ['Component', 'Purpose', 'Key Features'],
    ['StructuredLogger', 'JSON logging with trace context', 'File output, rotating handler, exception logging'],
    ['MetricsCollector', 'Counters, gauges, histograms, timers', 'Thread-safe, snapshot, reset, disabled mode'],
    ['ScanTracer', 'Distributed tracing for scans', 'Span timing, module tracking, trace propagation'],
    ['PerformanceProfiler', 'Code profiling', 'Function timing, call counting, memory tracking'],
    ['HealthMonitor', 'Component health checking', 'Periodic checks, degradation detection'],
    ['TelemetryManager', 'Unified telemetry API', 'Convenience methods, global singleton'],
]
story.append(make_table(obs_data, col_widths=[30*mm, 40*mm, 80*mm]))
story.append(spacer(2))

story.append(body(
    'Testing coverage for observability is excellent with 132 test methods covering all components, including thread safety verification, '
    'disabled mode behavior, file output validation, exception handling, and convenience API surface.'
))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 17: TESTING INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 17: Testing Infrastructure'))
story.append(hr())

story.append(body(
    'The test suite consists of 29 test files with approximately 1,250+ test methods totaling 11,185 lines of code. All tests use unittest.TestCase (stdlib). '
    'No pytest framework or external mocking libraries are used (except unittest.mock in diagnostics and performance tests). '
    'Every test file manually inserts the project root into sys.path.'
))

test_data = [
    ['Test File', 'Tests', 'Coverage Area', 'Assessment'],
    ['test_security.py', '181', 'All security.py functions', 'Very Comprehensive'],
    ['test_observability.py', '132', 'All observability components', 'Very Comprehensive'],
    ['test_utils.py', '118', 'All 17 utility functions', 'Very Comprehensive'],
    ['test_coverage_boost.py', '110', 'Edge cases, boundary values', 'Comprehensive'],
    ['test_diagnostics.py', '103', 'Health checks, version info', 'Comprehensive'],
    ['test_ai_analyst.py', '81', 'All AI analyst sub-engines', 'Comprehensive'],
    ['test_constants.py', '44', 'Every constant group', 'Comprehensive'],
    ['test_threat_intel.py', '48', 'Databases, enrichment, engine', 'Comprehensive'],
    ['test_interfaces.py', '79', 'All protocols, ABCs, context', 'Comprehensive'],
    ['test_cli.py', '47', 'Rendering, commands, edge cases', 'Comprehensive'],
    ['test_widgets/*', '0', 'TUI widgets', 'NO COVERAGE'],
    ['test_integrations/*', '0', 'Jira, Slack, GitHub clients', 'NO COVERAGE'],
]
story.append(make_table(test_data, col_widths=[35*mm, 12*mm, 60*mm, 30*mm]))
story.append(spacer(2))

story.append(critical('Zero test coverage for the entire TUI widget layer (7 widgets, ~2,000 LOC) and all 6 enterprise integration clients (~1,900 LOC).'))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 18: DEPLOYMENT AND CONFIGURATION
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 18: Deployment and Configuration'))
story.append(hr())

story.append(heading('Docker Configuration', 'h2'))
story.append(body(
    'Production-grade multi-stage Dockerfile using python:3.12-slim builder. Runtime uses non-root user (UID/GID 1001), PYTHONUNBUFFERED=1, '
    'and installs reconpro[full] with rich, textual, requests, and optional aiohttp. '
    'Health check via curl to localhost:7890 every 30s. Entrypoint: reconpro serve --port 7890. '
    'docker-compose.yml provides resource limits (2 CPU / 1GB RAM), security hardening (no-new-privileges, cap_drop ALL), '
    'custom bridge networking (172.28.0.0/16), named volume, JSON logging (50MB, 5 files), and horizontal scaling support.'
))

story.append(heading('Kubernetes Manifests', 'h2'))
story.append(body(
    'Production-grade K8s deployment with 3 replicas, RollingUpdate strategy, security context (runAsNonRoot, seccomp RuntimeDefault, no privilege escalation), '
    'liveness/readiness/startup probes, resource requests (250m/256Mi) and limits (1/512Mi), PVC for persistent data, '
    'topology spread constraints, pod anti-affinity, tolerations for dedicated nodes, and Prometheus scrape annotation. '
    'Service is ClusterIP with topology-aware routing hints. Namespace: reconpro.'
))

story.append(heading('pyproject.toml', 'h2'))
story.append(body(
    'Declares version 10.0.0 (contradicts deploy configs at v11). Requires Python >=3.8. Core dependencies: rich>=13.0.0, textual>=0.40.0, requests>=2.28.0 '
    '(contradicts ADR-001 zero-dependency claim). Optional groups: async (aiohttp), browser (playwright), llm (openai, anthropic), graph (networkx), '
    'raw (scapy), intel (shodan), collab (websockets), integrations (jira, slack-sdk), and full (all combined). Entry point: reconpro = reconpro.cli:main.'
))

story.append(critical('Version Inconsistency: pyproject.toml says 10.0.0, code says 11.0.0, deploy says v11, README says v9.0.0'))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 19: KNOWN ISSUES AND TECHNICAL DEBT
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 19: Known Issues and Technical Debt'))
story.append(hr())

story.append(heading('Critical Issues', 'h2'))
crit_data = [
    ['ID', 'Severity', 'Issue', 'Location', 'Status'],
    ['C-01', 'CRITICAL', 'Path traversal in /report endpoint', 'server.py', 'Fixed'],
    ['C-02', 'CRITICAL', 'Path traversal in /history endpoint', 'server.py', 'Fixed'],
    ['C-03', 'CRITICAL', 'Unauthenticated token generation', 'server.py', 'Known'],
    ['C-04', 'CRITICAL', 'Dual engine divergence', 'scanner.py/engine.py', 'Known'],
    ['C-05', 'CRITICAL', 'Version inconsistency (4+ versions)', '7+ files', 'Known'],
]
story.append(make_table(crit_data, col_widths=[10*mm, 15*mm, 55*mm, 35*mm, 15*mm]))
story.append(spacer(2))

story.append(heading('Code Duplication (~274 LOC)', 'h2'))
dup_data = [
    ['Duplication', 'Files', 'Lines', 'Recommendation'],
    ['SEVERITY_LEVELS/_SEV_ORDER', 'constants, delta, formats', '~15', 'Import from constants'],
    ['SARIF_LEVEL_MAP', 'constants, delta, formats', '~12', 'Import from constants'],
    ['SEV_COLORS/GRADE_COLORS', 'constants, cli, reports', '~20', 'Import from constants'],
    ['compute_grade()', 'utils, http_layer, formats', '~30', 'Import from utils'],
    ['_load_config()', 'jira, slack, github', '~45', 'Extract shared utility'],
    ['Finding classification', 'ai_analyst, attack_graph, threat_intel', '~80', 'Extract shared classifier'],
    ['User-Agent strings', 'http_layer, connection_pool, async_http, proxy', '~8', 'Centralize in constants'],
]
story.append(make_table(dup_data, col_widths=[35*mm, 35*mm, 15*mm, 60*mm]))
story.append(spacer(2))

story.append(heading('Dead Code and Unused Features', 'h2'))
story.append(bullet('ScanContext in context.py - defined but never used by any scanner'))
story.append(bullet('global_semaphore in engine.py concurrent_scan() - created but never used'))
story.append(bullet('RateLimiter in scanner.py line 86 - instantiated but never passed to modules'))
story.append(bullet('Dead code in delta.py _git_blame() lines 125-126'))
story.append(bullet('ai_analyst.py line 662: "if shared or True:" debug leftover'))
story.append(bullet('port field in context.py - declared but always 0'))
story.append(bullet('generate_pdf_report in reports.py - placeholder returning HTML'))
story.append(bullet('README.md - stale v9.0.0 placeholder with no content'))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# PART 20: ROADMAP AND RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════
story.append(heading('PART 20: Roadmap and Recommendations'))
story.append(hr())

story.append(heading('Prioritized Recommendations', 'h2'))

rec_data = [
    ['Priority', 'Recommendation', 'Impact', 'Effort'],
    ['P0', 'Unify version strings across all files to single source of truth', 'Critical', 'Low'],
    ['P0', 'Consolidate dual scan engines into single engine with sync/async modes', 'Critical', 'High'],
    ['P0', 'Eliminate constant duplication (import from constants.py everywhere)', 'High', 'Low'],
    ['P1', 'Fix unauthenticated token generation (C-03 security issue)', 'Critical', 'Low'],
    ['P1', 'Add test coverage for TUI widgets (0% currently)', 'Medium', 'Medium'],
    ['P1', 'Add test coverage for integration clients (0% currently)', 'Medium', 'Medium'],
    ['P1', 'Optimize Attack Graph O(n^2) to asset-indexed adjacency', 'High', 'High'],
    ['P2', 'Extract shared _load_config from integration clients', 'Low', 'Low'],
    ['P2', 'Complete ScanContext migration in scanner/engine', 'Medium', 'Medium'],
    ['P2', 'Implement real PDF generation (replace HTML placeholder)', 'Low', 'Medium'],
    ['P2', 'Decompose cli.py main() (1,765 lines) into command modules', 'Medium', 'Medium'],
    ['P3', 'Abstract graph backend (NetworkX vs fallback) into interface', 'Low', 'Medium'],
    ['P3', 'Replace custom YAML parser with PyYAML dependency', 'Low', 'Low'],
    ['P3', 'Add finding UUID for proper deduplication', 'Medium', 'Medium'],
]
story.append(make_table(rec_data, col_widths=[12*mm, 70*mm, 15*mm, 15*mm]))
story.append(spacer(3))

story.append(heading('Roadmap Alignment', 'h2'))
story.append(body(
    'The existing ROADMAP.md describes v10 as current and v11 as future, but the code already identifies as v11 in constants.py and deploy manifests. '
    'Key planned features for v11 include: distributed agent mesh, real-time collaborative scanning, plugin marketplace with signing, GraphQL API, '
    'web dashboard, cross-scan correlation engine, active exploitation, network-level scanning (raw sockets), wireless assessment, cloud API testing, '
    'RBAC, compliance mapping (SOC2/ISO 27001/PCI DSS), and multi-tenant MSSP support. '
    'Many of these capabilities already exist in partial form (collab.py for collaboration, graph_ui.py for dashboard, raw_sockets.py for network scanning), '
    'suggesting the roadmap should be updated to reflect current implementation status.'
))

story.append(heading('Competitive Positioning', 'h2'))
story.append(body(
    'ReconPro occupies a unique niche with no direct open-source equivalent. The combination of 28 modules, zero external dependencies, '
    'pure-Python portability, and integrated intelligence pipeline (AI analyst + attack graph + threat intel) is unmatched. '
    'Key differentiators with no OSS equivalent include: HTTP timing OS fingerprinting (novel approach), nation-state attribution (22+ APT groups), '
    'covert channel detection (8 classes), infrastructure ghosting, integrated DREAD scoring, and the 22-wish ritual orchestration system. '
    'The primary competitive weakness is the lack of persistent data storage and the absence of STIX/TAXII output format for threat intelligence sharing.'
))

# ━━ BUILD PDF ━━
def add_page_number(canvas, doc):
    """Add page numbers and footer."""
    canvas.saveState()
    canvas.setFont('LiberationSans', 7)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(18*mm, 12*mm, 'ReconPro Full Codebase Intelligence Report')
    canvas.drawRightString(170*mm, 12*mm, f'Page {doc.page}')
    canvas.setStrokeColor(BORDER)
    canvas.line(18*mm, 15*mm, 195*mm, 15*mm)
    canvas.restoreState()

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f'PDF generated: {OUTPUT}')
print(f'Size: {os.path.getsize(OUTPUT):,} bytes')
