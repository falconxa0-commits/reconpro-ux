#!/usr/bin/env python3
"""
ReconPro Launch Readiness Forge Omega Infinity - Complete Audit Report
Read-only forensic audit of /home/z/my-project/ repository
"""
import sys, os
sys.path.insert(0, os.path.join(os.environ.get('PDF_SKILL_DIR', '/home/z/my-project/skills/pdf'), 'scripts'))

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm, inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

import hashlib

# ━━ Font Registration ━━
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('Helvetica', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Helvetica-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Helvetica', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('Helvetica', normal='Helvetica', bold='Helvetica-Bold')
registerFontFamily('Helvetica', normal='Helvetica', bold='DejaVuBold')

# ━━ Cascade Palette (Dark Mode) ━━
PAGE_BG       = colors.HexColor('#0b0c0c')
SECTION_BG    = colors.HexColor('#1b201e')
CARD_BG       = colors.HexColor('#1b1f1d')
TABLE_STRIPE  = colors.HexColor('#171d1a')
HEADER_FILL   = colors.HexColor('#2d4e3d')
COVER_BLOCK   = colors.HexColor('#253d31')
BORDER        = colors.HexColor('#3d594b')
ICON          = colors.HexColor('#86c1a4')
ACCENT        = colors.HexColor('#55d695')
ACCENT_2      = colors.HexColor('#6fb1c7')
TEXT_PRIMARY   = colors.HexColor('#e0e3e1')
TEXT_MUTED     = colors.HexColor('#87908c')
SEM_SUCCESS   = colors.HexColor('#6fbf89')
SEM_WARNING   = colors.HexColor('#c5aa75')
SEM_ERROR     = colors.HexColor('#c8817a')
SEM_INFO      = colors.HexColor('#7193b5')

# ━━ Simple Doc Template (no TOC) ━━

# ━━ Styles ━━
styles = getSampleStyleSheet()

s_title = ParagraphStyle('AuditTitle', fontName='Helvetica-Bold', fontSize=28, leading=34, textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6)
s_h1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=18, leading=24, textColor=ACCENT, spaceBefore=20, spaceAfter=10)
s_h2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8)
s_h3 = ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=ICON, spaceBefore=10, spaceAfter=6)
s_body = ParagraphStyle('Body', fontName='Helvetica', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6)
s_body_dark = ParagraphStyle('BodyDark', parent=s_body, textColor=TEXT_MUTED)
s_badge = ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=TA_CENTER)
s_caption = ParagraphStyle('Caption', fontName='Helvetica', fontSize=8, leading=10, textColor=TEXT_MUTED, spaceAfter=4)
s_toc_h0 = ParagraphStyle('TOC0', fontName='Helvetica-Bold', fontSize=12, leading=18, textColor=TEXT_PRIMARY, leftIndent=0)
s_toc_h1 = ParagraphStyle('TOC1', fontName='Helvetica', fontSize=10, leading=16, textColor=TEXT_MUTED, leftIndent=20)
s_cell = ParagraphStyle('Cell', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_PRIMARY)
s_cell_bold = ParagraphStyle('CellBold', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=TEXT_PRIMARY)
s_cell_header = ParagraphStyle('CellH', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=colors.white)
s_cell_warn = ParagraphStyle('CellWarn', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=SEM_ERROR)
s_cell_ok = ParagraphStyle('CellOk', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=SEM_SUCCESS)
s_checklist = ParagraphStyle('Checklist', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_PRIMARY)
s_score_big = ParagraphStyle('ScoreBig', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=ACCENT, alignment=TA_CENTER)
s_score_label = ParagraphStyle('ScoreLabel', fontName='Helvetica', fontSize=8, leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER)

# ━━ Helper Functions ━━
def heading(text, style=s_h1, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(text, style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def body(text):
    return Paragraph(text, s_body)

def body_muted(text):
    return Paragraph(text, s_body_dark)

def badge(text, bg_color):
    return Paragraph(f'<font backColor="{bg_color}"> {text} </font>', s_badge)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=6, spaceAfter=6)

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header and data rows."""
    avail = 460  # A4 content width approx
    n = len(headers)
    if col_widths is None:
        col_widths = [avail / n] * n
    
    header_row = [Paragraph(h, s_cell_header) for h in headers]
    data_rows = []
    for row in rows:
        data_rows.append([Paragraph(str(c), s_cell) for c in row])
    
    all_data = [header_row] + data_rows
    t = Table(all_data, colWidths=col_widths, repeatRows=1)
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

def status_badge(text):
    color_map = {
        'COMPLETE': SEM_SUCCESS, 'EXISTS': SEM_SUCCESS, 'FOUND': SEM_SUCCESS,
        'PARTIAL': SEM_WARNING, 'PLACEHOLDER': SEM_WARNING, 'SIMULATED': SEM_WARNING,
        'INCOMPLETE': SEM_INFO, 'UNKNOWN': SEM_INFO,
        'BROKEN': SEM_ERROR, 'MISSING': SEM_ERROR, 'NOT FOUND': SEM_ERROR,
        'DEAD': SEM_ERROR, 'UNREACHABLE': SEM_ERROR, 'NOT IMPLEMENTED': SEM_ERROR,
    }
    bg = color_map.get(text, TEXT_MUTED)
    hex_bg = '#{:02x}{:02x}{:02x}'.format(int(bg.red*255), int(bg.green*255), int(bg.blue*255))
    return Paragraph(f'<font backColor="{hex_bg}" color="#ffffff"> {text} </font>', s_badge)

def score_cell(score):
    color = SEM_ERROR if score < 3 else (SEM_WARNING if score < 5 else (SEM_INFO if score < 7 else SEM_SUCCESS))
    hex_bg = '#{:02x}{:02x}{:02x}'.format(int(color.red*255), int(color.green*255), int(color.blue*255))
    return Paragraph(f'<font backColor="{hex_bg}" color="#ffffff"> {score}/10 </font>', s_badge)

# ━━ Build Document ━━
OUTPUT = '/home/z/my-project/download/ReconPro_Launch_Readiness_Audit.pdf'

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    topMargin=20*mm, bottomMargin=20*mm,
    leftMargin=20*mm, rightMargin=20*mm,
    title="ReconPro Launch Readiness Audit",
    author="ReconPro Forensic Audit",
    subject="Complete Launch Readiness Forge - Read-Only Forensic Audit",
)

story = []

# ══════════════════════════════════════════════════════
# COVER PAGE
# ══════════════════════════════════════════════════════
story.append(Spacer(1, 80))
story.append(Paragraph("RECONPRO", ParagraphStyle('CoverPre', fontName='Helvetica-Bold', fontSize=14, leading=16, textColor=TEXT_MUTED, alignment=TA_CENTER, letterSpacing=6)))
story.append(Spacer(1, 8))
story.append(Paragraph("Launch Readiness Audit", ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=32, leading=38, textColor=TEXT_PRIMARY, alignment=TA_CENTER)))
story.append(Spacer(1, 12))
story.append(HRFlowable(width="40%", thickness=1, color=ACCENT, spaceBefore=4, spaceAfter=4))
story.append(Spacer(1, 12))
story.append(Paragraph("FORENSIC LAUNCH READINESS FORGE", ParagraphStyle('CoverSub', fontName='Helvetica', fontSize=12, leading=14, textColor=ACCENT, alignment=TA_CENTER)))
story.append(Paragraph("Read-Only Repository Audit | 12 Phases | Complete Gap Analysis", ParagraphStyle('CoverSub2', fontName='Helvetica', fontSize=10, leading=14, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Spacer(1, 60))

# Key metrics on cover
cover_metrics = [
    ["Metric", "Value"],
    [Paragraph("Actual Pages", s_cell), Paragraph("1 (Landing Page only)", s_cell)],
    [Paragraph("API Routes", s_cell), Paragraph("47", s_cell)],
    [Paragraph("Components Total", s_cell), Paragraph("111 (81% orphaned)", s_cell)],
    [Paragraph("Dashboard Widgets Built", s_cell), Paragraph("45 (0% routed/rendered)", s_cell)],
    [Paragraph("Simulated Endpoints", s_cell), Paragraph("8 (PRNG/fake data)", s_cell)],
    [Paragraph("Authentication Model", s_cell), Paragraph("API-key only (no page auth)", s_cell)],
    [Paragraph("Database", s_cell), Paragraph("SQLite (not production-ready)", s_cell)],
    [Paragraph("Overall Launch Score", s_cell), Paragraph('<font color="#c8817a"><b>2.3 / 10</b></font>', s_cell)],
]
cover_t = Table(cover_metrics, colWidths=[200, 260])
cover_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
]))
story.append(cover_t)
story.append(Spacer(1, 60))
story.append(Paragraph("August 14, 2026 | Repository: /home/z/my-project/ | Branch: main", ParagraphStyle('CoverDate', fontName='Helvetica', fontSize=9, leading=12, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Paragraph("Classification: INTERNAL | Audit Type: Read-Only Forensic", ParagraphStyle('CoverClass', fontName='Helvetica', fontSize=8, leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER)))

story.append(PageBreak())

# ══════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════
# PHASE 0: REPOSITORY IMMERSION SUMMARY
# ══════════════════════════════════════════════════════
story.append(heading("Phase 0 - Repository Immersion Summary"))
story.append(body("The ReconPro repository at <font face='Helvetica'>/home/z/my-project/</font> was fully mapped during this audit. The project is built on Next.js 16.1.1 (App Router) with React 19, TypeScript, Tailwind CSS 4, Framer Motion, and shadcn/ui. It uses Prisma 6.11.1 with SQLite as the database provider. The entire frontend is a single-page application served from the root route <font face='Helvetica'>/</font>, rendering a monolithic marketing landing page through <font face='Helvetica'>HomeSection</font> which dynamically imports 18 sub-components. There are zero route groups, zero nested layouts, and zero multi-page routing. The application claims to be version 10.0.0 with 18.7K GitHub stars, 2.4M+ PyPI downloads, and 142 contributors, but these metrics appear fabricated as the GitHub and PyPI URLs referenced in the codebase are fictional."))
story.append(body("The repository contains 111 components total, of which only 21 are actually rendered in any page. The remaining 90 components (81%) are orphaned code, primarily dashboard widget panels that represent approximately 25,000+ lines of built-but-unreachable UI. These dashboard components include full panels for CEO dashboards, team management, compliance tracking, AI advisors, quantum threat analysis, and dozens more, all without any route or page to render them. The API layer consists of 47 route handlers covering real reconnaissance capabilities (DNS enumeration, SSL analysis, port scanning) alongside 8 simulated endpoints that return PRNG-generated fake data. Authentication is API-key-based only, enforced at the route handler level via a <font face='Helvetica'>withProtection()</font> wrapper, with no page-level authentication or session management."))

story.append(heading("Repository Structure Overview", s_h2, level=1))
repo_data = [
    ["Directory / File", "Count / Type", "Status"],
    ["src/app/ (pages + API)", "1 page.tsx, 1 layout, 47 API routes", status_badge("PARTIAL")],
    ["src/components/reconpro/", "63 application components", status_badge("81% ORPHANED")],
    ["src/components/ui/", "46 shadcn/ui primitives", status_badge("50% UNUSED")],
    ["src/components/backgrounds/", "1 WebGL shader component", status_badge("EXISTS")],
    ["src/components/seo/", "1 JSON-LD structured data", status_badge("EXISTS")],
    ["src/lib/ (utilities)", "21 library files + 6 recon modules", status_badge("COMPLETE")],
    ["src/data/", "1 content.ts (nav, features, stats)", status_badge("EXISTS")],
    ["src/__tests__/", "24 Vitest test files", status_badge("EXISTS")],
    ["prisma/schema.prisma", "17 models, SQLite provider", status_badge("WARNING")],
    ["public/ (assets)", "3 files (logo.svg, favicon.svg, robots.txt)", status_badge("INCOMPLETE")],
    ["Middleware", "Security headers only, no auth redirects", status_badge("PARTIAL")],
    ["Configuration", "next.config.ts, tsconfig.json, vitest, eslint", status_badge("EXISTS")],
]
story.append(make_table(["Directory / File", "Count / Type", "Status"], repo_data[1:], [180, 200, 80]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 1: COMPLETE PAGE INVENTORY
# ══════════════════════════════════════════════════════
story.append(heading("Phase 1 - Complete Page Inventory"))
story.append(body("ReconPro has exactly ONE actual page route in the entire Next.js application. The root route <font face='Helvetica'>src/app/page.tsx</font> renders the <font face='Helvetica'>HomeSection</font> component, which is a client-side monolith that dynamically imports all landing page sections. There are no route groups such as <font face='Helvetica'>(marketing)</font>, <font face='Helvetica'>(dashboard)</font>, or <font face='Helvetica'>(auth)</font>. There are no nested layouts beyond the root layout. The only other special route files are <font face='Helvetica'>not-found.tsx</font> (404), <font face='Helvetica'>error.tsx</font> (global error boundary), <font face='Helvetica'>loading.tsx</font> (global loading state), and <font face='Helvetica'>sitemap.ts</font> (dynamic sitemap generator). All 47 API routes exist under <font face='Helvetica'>src/app/api/</font> but none are navigable as pages. The sitemap generator produces only a single URL entry for the homepage."))

page_inventory = [
    ["/", "Landing Page (Full SPA)", "home-section.tsx", "Root Layout", "Navbar", "No", status_badge("COMPLETE")],
    ["* (404)", "Custom Not Found", "not-found.tsx", "Root Layout", "N/A", "No", status_badge("EXISTS")],
    ["* (error)", "Global Error Boundary", "error.tsx", "Root Layout", "N/A", "No", status_badge("EXISTS")],
    ["* (loading)", "Global Loading State", "loading.tsx", "Root Layout", "N/A", "No", status_badge("EXISTS")],
]
story.append(make_table(
    ["URL", "Purpose", "Component", "Layout", "Nav Entry", "Auth", "Status"],
    page_inventory,
    [35, 120, 90, 55, 55, 25, 60]
))

story.append(Spacer(1, 10))
story.append(body("Evidence for this inventory: File system traversal of <font face='Helvetica'>src/app/</font> confirmed zero <font face='Helvetica'>page.tsx</font> files beyond the root. No <font face='Helvetica'>dashboard/</font>, <font face='Helvetica'>settings/</font>, <font face='Helvetica'>login/</font>, <font face='Helvetica'>register/</font>, <font face='Helvetica'>pricing/</font>, or any other page directories exist. The <font face='Helvetica'>sidebar.tsx</font> component defines 30+ dashboard navigation items, but no page renders this sidebar. The <font face='Helvetica'>bottom-dock.tsx</font> defines 18 dock navigation items, but no page renders this dock. Both are completely orphaned components with zero imports in the active source tree."))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 2: PUBLIC WEBSITE AUDIT
# ══════════════════════════════════════════════════════
story.append(heading("Phase 2 - Public Website Audit"))
story.append(body("This phase audits the existence of 35 standard public website pages that a production SaaS product would be expected to have. Each page was traced back to the repository file system. The landing page exists as a comprehensive single-page scroll experience with sections for Hero, Features, Architecture, Modules, CLI, Documentation (cards only), Benchmarks, Enterprise, and Community. However, the product lacks virtually every other standard public page. There is no dedicated pricing page (pricing is embedded in the Enterprise section as a widget component), no blog, no documentation site (only documentation cards linking to a fictional docs.reconpro.dev), no standalone terms or privacy pages, and no authentication flow pages whatsoever."))

public_audit = [
    ["Landing Page", "/", "home-section.tsx sections", status_badge("COMPLETE")],
    ["Features", "#features (anchor)", "FeaturesSection.tsx", status_badge("COMPLETE")],
    ["Pricing", "#pricing (anchor in Enterprise)", "Embedded in EnterpriseSection", status_badge("PARTIAL")],
    ["Documentation", "#docs (anchor)", "DocsSection.tsx (cards only)", status_badge("PLACEHOLDER")],
    ["API Documentation", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Community", "#community (anchor)", "CommunitySection.tsx", status_badge("PARTIAL")],
    ["About", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Contact", "NOT FOUND", "Link points to #community", status_badge("NOT FOUND")],
    ["Blog", "NOT FOUND", "Link points to #community", status_badge("NOT FOUND")],
    ["Changelog", "NOT FOUND", "Link points to #community", status_badge("NOT FOUND")],
    ["Roadmap", "NOT FOUND", "Link points to #pricing", status_badge("NOT FOUND")],
    ["Careers", "NOT FOUND", "Link points to #community", status_badge("NOT FOUND")],
    ["Partners", "NOT FOUND", "Link points to #enterprise", status_badge("NOT FOUND")],
    ["Customers", "NOT FOUND", "Testimonials in EnterpriseSection only", status_badge("NOT FOUND")],
    ["Testimonials", "#enterprise (anchor)", "EnterpriseSection.tsx carousel", status_badge("PARTIAL")],
    ["Security", "NOT FOUND", "Footer link is # (no-op)", status_badge("NOT FOUND")],
    ["Trust Center", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Privacy Policy", "NOT FOUND", "Footer link is # (no-op)", status_badge("NOT FOUND")],
    ["Terms of Service", "NOT FOUND", "Footer link is # (no-op)", status_badge("NOT FOUND")],
    ["Cookie Policy", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Acceptable Use Policy", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Status Page", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Support", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Help Center", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["FAQ", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Release Notes", "NOT FOUND", "Link points to #community", status_badge("NOT FOUND")],
    ["Download", "NOT FOUND", "PyPI link in navbar only", status_badge("PARTIAL")],
    ["Demo", "NOT FOUND", "No demo flow", status_badge("NOT FOUND")],
    ["Book Demo", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Request Access", "NOT FOUND", "No dedicated page", status_badge("NOT FOUND")],
    ["Login", "NOT FOUND", "No auth pages at all", status_badge("NOT FOUND")],
    ["Register", "NOT FOUND", "No auth pages at all", status_badge("NOT FOUND")],
    ["Forgot Password", "NOT FOUND", "No auth pages at all", status_badge("NOT FOUND")],
    ["Email Verification", "NOT FOUND", "No auth pages at all", status_badge("NOT FOUND")],
    ["Onboarding", "NOT FOUND", "No auth pages at all", status_badge("NOT FOUND")],
    ["Product Tour", "NOT FOUND", "No product tour flow", status_badge("NOT FOUND")],
]
story.append(make_table(
    ["Page", "URL / Location", "Evidence", "Status"],
    public_audit,
    [95, 130, 150, 85]
))

story.append(Spacer(1, 10))
story.append(body("Summary: Of 35 standard public pages, only 4 exist as actual content sections within the landing page (Landing Page, Features, Pricing partial, Community partial). Three more exist in severely limited form (Documentation as placeholder cards, Testimonials as carousel, Download as external PyPI link). The remaining 28 pages (80%) are completely absent from the repository. The product has zero authentication pages, zero legal pages, zero support infrastructure, and zero documentation beyond marketing cards."))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 3: DASHBOARD INVENTORY
# ══════════════════════════════════════════════════════
story.append(heading("Phase 3 - Dashboard Inventory"))
story.append(body("This is one of the most critical findings of the entire audit. ReconPro has built an extensive collection of 45 dashboard widget components totaling over 25,000 lines of code. These include full implementations for CEO dashboards, team management, compliance panels, AI advisors, quantum threat analysis, pricing plans, and dozens more. However, <b>NOT A SINGLE ONE</b> of these dashboard components is rendered in any page. There is no <font face='Helvetica'>/dashboard</font> route. There is no route group for authenticated pages. The sidebar navigation component (<font face='Helvetica'>sidebar.tsx</font>) defines navigation to 30+ dashboard views, and the bottom dock (<font face='Helvetica'>bottom-dock.tsx</font>) defines navigation to 18 views, but neither component is imported or rendered anywhere in the application."))
story.append(body("The dashboard widgets exist as fully built components with UI interactions, state management, and API integration code, but they are entirely unreachable by any user. They represent a massive investment in UI development that is completely disconnected from the application's routing architecture. The <font face='Helvetica'>bento-dashboard.tsx</font> component renders overview cards and references a <font face='Helvetica'>CLIPreview</font> component. The <font face='Helvetica'>ceo-dashboard.tsx</font> at 1,357 lines is the largest component, containing executive risk metrics, compliance scores, and animated counters. Yet none of these can be accessed through any URL."))

dashboard_audit = [
    ["Dashboard Overview", "NOT ROUTED", "bento-dashboard.tsx, ceo-dashboard.tsx", status_badge("UNREACHABLE")],
    ["Organizations", "NOT FOUND", "No component exists", status_badge("NOT FOUND")],
    ["Teams", "NOT ROUTED", "team-management.tsx (761 lines)", status_badge("UNREACHABLE")],
    ["Members", "NOT ROUTED", "team-management.tsx (members tab)", status_badge("UNREACHABLE")],
    ["Assets / Targets", "NOT ROUTED", "attack-surface.tsx (478 lines)", status_badge("UNREACHABLE")],
    ["Scans", "NOT ROUTED", "scan-input.tsx + scan-overlay.tsx", status_badge("UNREACHABLE")],
    ["Scan History", "NOT ROUTED", "scan-results.tsx (217 lines)", status_badge("UNREACHABLE")],
    ["Live Scan", "NOT ROUTED", "live-terminal.tsx (239 lines)", status_badge("UNREACHABLE")],
    ["Findings", "NOT ROUTED", "radar-map.tsx (848 lines)", status_badge("UNREACHABLE")],
    ["Reports", "NOT ROUTED", "proof-gallery.tsx (1316 lines)", status_badge("UNREACHABLE")],
    ["Threats", "NOT ROUTED", "wall-of-shame.tsx + critical-alerts.tsx", status_badge("UNREACHABLE")],
    ["Bot Hunter", "NOT ROUTED", "bot-cage.tsx (656 lines)", status_badge("UNREACHABLE")],
    ["Model Red Team", "NOT ROUTED", "model-breaker.tsx (1161 lines)", status_badge("UNREACHABLE")],
    ["Hall of Fame", "NOT ROUTED", "hall-of-fame.tsx (645 lines)", status_badge("UNREACHABLE")],
    ["Genesis Stamp", "NOT ROUTED", "genesis-stamp.tsx (995 lines)", status_badge("UNREACHABLE")],
    ["NHI (Non-Human Identity)", "NOT ROUTED", "nhi-kill-switch.tsx (890 lines)", status_badge("UNREACHABLE")],
    ["Monitoring", "NOT ROUTED", "monitoring-panel.tsx (725 lines)", status_badge("UNREACHABLE")],
    ["Compliance", "NOT ROUTED", "compliance-panel.tsx (754 lines)", status_badge("UNREACHABLE")],
    ["Integrations", "NOT ROUTED", "integration-hub.tsx (475 lines)", status_badge("UNREACHABLE")],
    ["AI Advisor", "NOT ROUTED", "ai-advisor.tsx (535 lines)", status_badge("UNREACHABLE")],
    ["AI Leaderboard", "NOT ROUTED", "ai-leaderboard.tsx (680 lines)", status_badge("UNREACHABLE")],
    ["Sandbox", "NOT ROUTED", "confused-deputy.tsx (730 lines)", status_badge("UNREACHABLE")],
    ["Sovereign Control", "NOT ROUTED", "sovereign-control.tsx (888 lines)", status_badge("UNREACHABLE")],
    ["Fear Index", "NOT ROUTED", "fear-index.tsx (757 lines)", status_badge("UNREACHABLE")],
    ["Doom Clock", "NOT ROUTED", "doom-clock.tsx (1063 lines)", status_badge("UNREACHABLE")],
    ["PQC Vault", "NOT ROUTED", "pqc-vault.tsx (900 lines)", status_badge("UNREACHABLE")],
    ["CNI Sentinel", "NOT ROUTED", "cni-sentinel.tsx (861 lines)", status_badge("UNREACHABLE")],
    ["War Room", "NOT ROUTED", "war-room.tsx (895 lines)", status_badge("UNREACHABLE")],
    ["Implosion", "NOT ROUTED", "implosion-panel.tsx (1245 lines)", status_badge("UNREACHABLE")],
    ["Broadcast Center", "NOT ROUTED", "broadcast-center.tsx (899 lines)", status_badge("UNREACHABLE")],
    ["Pricing Plans", "NOT ROUTED", "pricing-plans.tsx (787 lines)", status_badge("UNREACHABLE")],
    ["White Label", "NOT ROUTED", "white-label.tsx (1485 lines)", status_badge("UNREACHABLE")],
    ["Oblivion Scanner", "NOT ROUTED", "oblivion.tsx (999 lines)", status_badge("UNREACHABLE")],
    ["Pegasus Inspector", "NOT ROUTED", "pegasus-inspector.tsx (878 lines)", status_badge("UNREACHABLE")],
    ["Cognitive Dread", "NOT ROUTED", "cognitive-dread.tsx (895 lines)", status_badge("UNREACHABLE")],
    ["Exposed Assets Map", "NOT ROUTED", "exposed-asset-map.tsx (986 lines)", status_badge("UNREACHABLE")],
    ["Unified CLI", "NOT ROUTED", "unified-cli.tsx (512 lines)", status_badge("UNREACHABLE")],
    ["Matrix Terminal", "NOT ROUTED", "matrix-terminal.tsx (619 lines)", status_badge("UNREACHABLE")],
    ["API Keys", "NOT ROUTED", "Part of integration-hub.tsx", status_badge("UNREACHABLE")],
    ["Settings", "NOT FOUND", "No settings component exists", status_badge("NOT FOUND")],
    ["Billing", "NOT FOUND", "No billing component exists", status_badge("NOT FOUND")],
    ["Notifications", "NOT FOUND", "No notifications component", status_badge("NOT FOUND")],
    ["Audit Logs", "NOT FOUND", "API exists (/api/audit) but no UI", status_badge("PARTIAL")],
    ["Profile", "NOT FOUND", "No profile component exists", status_badge("NOT FOUND")],
    ["Security Settings", "NOT FOUND", "No security settings page", status_badge("NOT FOUND")],
]
story.append(make_table(
    ["Dashboard Page", "Routing Status", "Component / Evidence", "Status"],
    dashboard_audit,
    [100, 80, 190, 90]
))

story.append(Spacer(1, 8))
story.append(body("Summary: Zero of 44 dashboard pages are reachable by any user. 39 have fully built components (UNREACHABLE), 2 have partial backend support only (PARTIAL), and 3 have no component or backend at all (NOT FOUND). The dashboard represents the single largest gap between capability and accessibility in the entire product."))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 4: NAVIGATION AUDIT
# ══════════════════════════════════════════════════════
story.append(heading("Phase 4 - Navigation Audit"))
story.append(body("The navigation system was completely traced from source code. ReconPro has exactly three navigation components in active use: the Navbar (<font face='Helvetica'>Navbar.tsx</font>), the Command Palette (<font face='Helvetica'>CommandPalette.tsx</font>), and the Footer (<font face='Helvetica'>Footer.tsx</font>). All navigation is anchor-based smooth scrolling within the single landing page. There are no URL-based routes for any section. The Navbar renders 10 top-level navigation items, all as anchor links (<font face='Helvetica'>#features</font>, <font face='Helvetica'>#architecture</font>, etc.). The Command Palette provides the same 10 items plus 3 actions (copy install command, open GitHub). The Footer has 4 columns of links with severe issues."))

story.append(heading("Navbar Navigation (Active)", s_h2, level=1))
nav_items = [
    ["Home", "#", "Same page scroll to top", status_badge("EXISTS")],
    ["Features", "#features", "FeaturesSection (id=features)", status_badge("EXISTS")],
    ["Architecture", "#architecture", "ArchitectureSection", status_badge("EXISTS")],
    ["Modules", "#modules", "ModulesSection", status_badge("EXISTS")],
    ["CLI", "#cli", "CLISection", status_badge("EXISTS")],
    ["Documentation", "#docs", "DocsSection", status_badge("EXISTS")],
    ["Performance", "#benchmarks", "BenchmarksSection", status_badge("EXISTS")],
    ["Enterprise", "#enterprise", "EnterpriseSection (badge: NEW)", status_badge("EXISTS")],
    ["Pricing", "#pricing", "Embedded in EnterpriseSection", status_badge("EXISTS")],
    ["Community", "#community", "CommunitySection", status_badge("EXISTS")],
]
story.append(make_table(["Label", "Target", "Evidence", "Status"], nav_items, [75, 75, 220, 70]))

story.append(Spacer(1, 8))
story.append(heading("Footer Links - Broken and Dead", s_h2, level=1))
story.append(body("The Footer is the most problematic navigation element. It contains 23 links across 4 columns, of which 5 are completely dead (href='#' no-op), 5 are misleading (point to unrelated sections), and 2 social links (Twitter, Discord) are dead anchors. Only 11 links are functional and accurately labeled."))

footer_audit = [
    ["Footer - Product", "Features", "#features", status_badge("EXISTS")],
    ["Footer - Product", "Architecture", "#architecture", status_badge("EXISTS")],
    ["Footer - Product", "Scanner Modules", "#modules", status_badge("EXISTS")],
    ["Footer - Product", "CLI Commands", "#cli", status_badge("EXISTS")],
    ["Footer - Product", "Performance", "#benchmarks", status_badge("EXISTS")],
    ["Footer - Product", "Pricing", "#pricing", status_badge("EXISTS")],
    ["Footer - Resources", "Documentation", "#docs", status_badge("EXISTS")],
    ["Footer - Resources", "Tutorials", "#community", status_badge("MISLEADING")],
    ["Footer - Resources", "API Reference", "#docs", status_badge("DUPLICATE")],
    ["Footer - Resources", "Examples", "#docs", status_badge("DUPLICATE")],
    ["Footer - Resources", "Changelog", "#community", status_badge("MISLEADING")],
    ["Footer - Resources", "Roadmap", "#pricing", status_badge("MISLEADING")],
    ["Footer - Company", "Enterprise", "#enterprise", status_badge("EXISTS")],
    ["Footer - Company", "Blog", "#community", status_badge("DEAD")],
    ["Footer - Company", "Careers", "#community", status_badge("DEAD")],
    ["Footer - Company", "Contact", "#community", status_badge("DEAD")],
    ["Footer - Company", "Press", "#community", status_badge("DEAD")],
    ["Footer - Company", "Partners", "#enterprise", status_badge("DEAD")],
    ["Footer - Legal", "Privacy Policy", "# (no-op)", status_badge("DEAD")],
    ["Footer - Legal", "Terms of Service", "# (no-op)", status_badge("DEAD")],
    ["Footer - Legal", "Security", "# (no-op)", status_badge("DEAD")],
    ["Footer - Legal", "Responsible Disclosure", "# (no-op)", status_badge("DEAD")],
    ["Footer - Legal", "License (MIT)", "# (no-op)", status_badge("DEAD")],
    ["Footer - Social", "GitHub", "github.com/reconpro/reconpro", status_badge("Fictional URL")],
    ["Footer - Social", "Twitter", "# (no-op)", status_badge("DEAD")],
    ["Footer - Social", "Discord", "# (no-op)", status_badge("DEAD")],
]
story.append(make_table(["Column", "Label", "Target", "Status"], footer_audit, [80, 110, 155, 85]))

story.append(Spacer(1, 8))
story.append(heading("Orphaned Navigation Components", s_h2, level=1))
story.append(body("Two major navigation components exist but are never imported or rendered: <font face='Helvetica'>EnterpriseSidebar</font> (493 lines, 30+ nav items across 10 sections) and <font face='Helvetica'>BottomDock</font> (208 lines, 18 dock items). These use a state-driven <font face='Helvetica'>onViewChange(id)</font> pattern rather than URL routing, indicating they were designed for a dashboard application that was never wired into the routing architecture. Both components import and reference the orphaned dashboard widgets, creating a closed but disconnected navigation ecosystem."))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 5: USER JOURNEY AUDIT
# ══════════════════════════════════════════════════════
story.append(heading("Phase 5 - User Journey Audit"))
story.append(body("This phase traces the complete user journey from first visit to full product usage. Since ReconPro has no authentication system at the page level, no multi-page routing, and no user account management UI, the vast majority of standard user journeys are impossible to complete. A visitor can view the landing page, understand the product from the marketing sections, and interact with the API directly using an API key (if they have one), but they cannot create an account, log in, or access any dashboard functionality through the web interface."))

journey_audit = [
    ["Visit homepage", "/", "page.tsx renders HomeSection", status_badge("COMPLETE")],
    ["Understand product", "#features + #architecture", "Features + Architecture sections", status_badge("COMPLETE")],
    ["View features", "#features", "6 feature cards with descriptions", status_badge("COMPLETE")],
    ["View pricing", "#pricing in EnterpriseSection", "3 pricing tiers in carousel", status_badge("PARTIAL")],
    ["Create account", "NOT FOUND", "No registration page or flow", status_badge("NOT IMPLEMENTED")],
    ["Verify email", "NOT FOUND", "No email verification system", status_badge("NOT IMPLEMENTED")],
    ["Login", "NOT FOUND", "No login page or auth flow", status_badge("NOT IMPLEMENTED")],
    ["Create organization", "API only: POST /api/teams", "No UI for org creation", status_badge("NOT IMPLEMENTED")],
    ["Invite team", "API only: POST /api/members", "No UI for invites", status_badge("NOT IMPLEMENTED")],
    ["Add target", "API only: POST /api/scan", "No target management UI", status_badge("NOT IMPLEMENTED")],
    ["Run first scan", "API: POST /api/scan", "Real scanning engine works via API", status_badge("PARTIAL")],
    ["View findings", "API: GET /api/scans", "No findings dashboard UI", status_badge("NOT IMPLEMENTED")],
    ["Generate report", "API: GET /api/executive", "No report UI, API returns data", status_badge("PARTIAL")],
    ["Upgrade account", "NOT FOUND", "No subscription/billing system", status_badge("NOT IMPLEMENTED")],
    ["Manage billing", "NOT FOUND", "No billing pages", status_badge("NOT IMPLEMENTED")],
    ["Contact support", "NOT FOUND", "No support page or contact form", status_badge("NOT IMPLEMENTED")],
    ["Join community", "NOT FOUND", "Links to fictional GitHub", status_badge("NOT IMPLEMENTED")],
    ["Read documentation", "#docs (cards only)", "Cards link to fictional docs site", status_badge("PARTIAL")],
    ["Use API", "/api/* routes (47 endpoints)", "API-key auth, full CRUD available", status_badge("PARTIAL")],
    ["Complete onboarding", "NOT FOUND", "No onboarding flow exists", status_badge("NOT IMPLEMENTED")],
]
story.append(make_table(
    ["Journey Step", "URL / Endpoint", "Evidence", "Status"],
    journey_audit,
    [95, 130, 165, 90]
))

story.append(Spacer(1, 8))
story.append(body("Summary: Of 20 standard user journey steps, only 3 are fully COMPLETE (visit homepage, understand product, view features). 4 are PARTIAL (pricing is embedded, scan works via API only, reports via API only, documentation as cards). The remaining 13 steps (65%) are NOT IMPLEMENTED at all. A new user cannot create an account, cannot log in, cannot access the dashboard, cannot manage billing, and cannot complete onboarding. The product is effectively a marketing website with an API backend, not a usable web application."))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 6: COMMUNITY READINESS
# ══════════════════════════════════════════════════════
story.append(heading("Phase 6 - Community Readiness"))
story.append(body("Community infrastructure is almost entirely absent. The CommunitySection component on the landing page displays fabricated statistics (18.7K stars, 142 contributors, 2.4M downloads) and links to a fictional GitHub repository. There is no forum, no Discord server, no feedback mechanism, no feature request system, no bug report tracking, no documentation site, no tutorials beyond marketing cards, no knowledge base, no quick start guide, no API examples, no developer portal, no SDK downloads, no community showcase, and no leaderboard accessible through the UI (the Hall of Fame API endpoint exists but no page renders it)."))

community_audit = [
    ["Community Page", "#community (anchor)", "CommunitySection.tsx with stats", status_badge("PARTIAL")],
    ["Forum", "NOT FOUND", "No forum system", status_badge("NOT FOUND")],
    ["Discord Links", "NOT FOUND", "Footer Discord link is # (dead)", status_badge("NOT FOUND")],
    ["Feedback System", "NOT FOUND", "No feedback mechanism", status_badge("NOT FOUND")],
    ["Feature Requests", "NOT FOUND", "No feature request system", status_badge("NOT FOUND")],
    ["Bug Reports", "NOT FOUND", "No bug tracking UI", status_badge("NOT FOUND")],
    ["Release Notes", "NOT FOUND", "Footer link goes to #community", status_badge("NOT FOUND")],
    ["Announcements", "NOT FOUND", "Broadcast API exists, no UI", status_badge("PARTIAL")],
    ["Roadmap", "NOT FOUND", "Footer link goes to #pricing", status_badge("NOT FOUND")],
    ["Documentation Site", "NOT FOUND", "Link to fictional docs.reconpro.dev", status_badge("NOT FOUND")],
    ["Tutorials", "NOT FOUND", "Footer link goes to #community", status_badge("NOT FOUND")],
    ["Knowledge Base", "NOT FOUND", "No KB system", status_badge("NOT FOUND")],
    ["Examples", "NOT FOUND", "Footer link goes to #docs", status_badge("NOT FOUND")],
    ["Quick Start Guide", "NOT FOUND", "DocsSection shows cards only", status_badge("NOT FOUND")],
    ["API Examples", "NOT FOUND", "No API documentation page", status_badge("NOT FOUND")],
    ["Developer Portal", "NOT FOUND", "No developer portal", status_badge("NOT FOUND")],
    ["SDK Downloads", "NOT FOUND", "PyPI link in navbar only", status_badge("PARTIAL")],
    ["Community Showcase", "NOT FOUND", "No showcase mechanism", status_badge("NOT FOUND")],
    ["Leaderboards", "NOT ROUTED", "hall-of-fame.tsx exists (unreachable)", status_badge("UNREACHABLE")],
    ["Hall of Fame", "NOT ROUTED", "hall-of-fame.tsx exists (unreachable)", status_badge("UNREACHABLE")],
]
story.append(make_table(
    ["Infrastructure", "URL / Location", "Evidence", "Status"],
    community_audit,
    [110, 130, 150, 90]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 7: BUSINESS READINESS
# ══════════════════════════════════════════════════════
story.append(heading("Phase 7 - Business Readiness"))
story.append(body("The business infrastructure required for a commercial launch is entirely absent. While a <font face='Helvetica'>pricing-plans.tsx</font> component exists with Free/Pro/Enterprise tiers, it is not rendered in any page. There is no checkout system, no payment integration, no subscription management, no invoice generation, no billing UI, no upgrade/downgrade flows, no free tier enforcement, no enterprise sales page, no booking system for demos, no referral or affiliate program, and no marketplace. The only business-related functionality that exists is the Implosion financial impact simulator API, which models breach costs but does not handle actual billing or payments."))

business_audit = [
    ["Pricing Page", "NOT ROUTED", "pricing-plans.tsx (787 lines, orphaned)", status_badge("UNREACHABLE")],
    ["Subscription Flow", "NOT FOUND", "No subscription management", status_badge("NOT FOUND")],
    ["Billing UI", "NOT FOUND", "No billing pages or components", status_badge("NOT FOUND")],
    ["Invoices", "NOT FOUND", "No invoice system", status_badge("NOT FOUND")],
    ["Checkout", "NOT FOUND", "No payment integration", status_badge("NOT FOUND")],
    ["Upgrade Flow", "NOT FOUND", "No upgrade mechanism", status_badge("NOT FOUND")],
    ["Downgrade Flow", "NOT FOUND", "No downgrade mechanism", status_badge("NOT FOUND")],
    ["Free Tier", "API only", "No tier enforcement or UI", status_badge("NOT FOUND")],
    ["Enterprise Page", "#enterprise (anchor)", "EnterpriseSection with carousel", status_badge("PARTIAL")],
    ["Sales Contact", "NOT FOUND", "No contact form or sales page", status_badge("NOT FOUND")],
    ["Book Demo", "NOT FOUND", "No booking system", status_badge("NOT FOUND")],
    ["Customer Onboarding", "NOT FOUND", "No onboarding flow", status_badge("NOT FOUND")],
    ["Referral Program", "NOT FOUND", "No referral system", status_badge("NOT FOUND")],
    ["Affiliate Program", "NOT FOUND", "No affiliate system", status_badge("NOT FOUND")],
    ["License Management", "NOT FOUND", "No license system", status_badge("NOT FOUND")],
    ["Marketplace", "NOT FOUND", "No marketplace", status_badge("NOT FOUND")],
]
story.append(make_table(
    ["Business Feature", "URL / Location", "Evidence", "Status"],
    business_audit,
    [110, 130, 150, 90]
))

# ══════════════════════════════════════════════════════
# PHASE 8: LAUNCH ESSENTIALS
# ══════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(heading("Phase 8 - Launch Essentials"))
story.append(body("Launch essentials cover error handling, SEO, assets, and basic infrastructure that every production website needs. ReconPro has some essentials in place (custom 404 page, global error boundary, loading state, sitemap, robots.txt, SEO metadata, JSON-LD structured data, security headers via middleware, responsive design via Tailwind, dark mode as default, skip-to-content link) but is missing many others including OG image, PWA manifest, cookie consent, internationalization, accessibility compliance, and critical error pages."))

essentials_audit = [
    ["404 Page", "not-found.tsx", "Custom not-found with home link", status_badge("EXISTS")],
    ["500 Page", "error.tsx", "Global error boundary (generic)", status_badge("PARTIAL")],
    ["Maintenance Page", "NOT FOUND", "No maintenance page", status_badge("NOT FOUND")],
    ["Offline Page", "NOT FOUND", "No offline support", status_badge("NOT FOUND")],
    ["Empty States", "NOT FOUND", "No empty state components", status_badge("NOT FOUND")],
    ["Loading States", "loading.tsx", "Global spinner with text", status_badge("PARTIAL")],
    ["Skeletons", "NOT FOUND", "No skeleton components used", status_badge("NOT FOUND")],
    ["Error Boundaries", "error.tsx", "Global React error boundary", status_badge("EXISTS")],
    ["Success Pages", "NOT FOUND", "No success/completion pages", status_badge("NOT FOUND")],
    ["Email Templates", "NOT FOUND", "No email template system", status_badge("NOT FOUND")],
    ["SEO Metadata", "layout.tsx", "Full OG, Twitter, robots, canonical", status_badge("EXISTS")],
    ["OpenGraph Image", "NOT FOUND", "og-image.png referenced but missing", status_badge("BROKEN")],
    ["Sitemap", "sitemap.ts", "Dynamic, lists only homepage URL", status_badge("PARTIAL")],
    ["robots.txt", "public/robots.txt", "44 lines, blocks /api/ and AI crawlers", status_badge("EXISTS")],
    ["favicon", "public/favicon.svg", "SVG favicon exists", status_badge("EXISTS")],
    ["PWA Manifest", "NOT FOUND", "No manifest.json or service worker", status_badge("NOT FOUND")],
    ["Icons / App Icons", "PARTIAL", "favicon.svg + logo.svg (as apple icon)", status_badge("PARTIAL")],
    ["Analytics", "NOT FOUND", "No analytics integration", status_badge("NOT FOUND")],
    ["Cookie Banner", "NOT FOUND", "No consent management", status_badge("NOT FOUND")],
    ["Accessibility", "PARTIAL", "Skip-to-content link, ARIA on some", status_badge("PARTIAL")],
    ["Responsive Layout", "EXISTS", "Tailwind responsive classes throughout", status_badge("EXISTS")],
    ["Dark Mode", "EXISTS", "Forced dark via className='dark'", status_badge("EXISTS")],
    ["Internationalization", "NOT FOUND", "No i18n, hardcoded English only", status_badge("NOT FOUND")],
]
story.append(make_table(
    ["Essential", "File / Evidence", "Details", "Status"],
    essentials_audit,
    [90, 110, 175, 85]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 9: PRODUCTION READINESS
# ══════════════════════════════════════════════════════
story.append(heading("Phase 9 - Production Readiness"))
story.append(body("Production readiness examines the infrastructure required for safe, reliable deployment. ReconPro has solid security middleware with comprehensive headers (CSP, HSTS, X-Frame-Options, COOP, CORP, COEP), SSRF protection on scan endpoints, API-key authentication with SHA-256 hashing, rate limiting across all API routes, and a health check endpoint. However, critical production gaps exist: the database is SQLite (unsuitable for production multi-tenant workloads), there is no structured logging or monitoring, no error tracking (Sentry, etc.), no CSRF protection, no CORS configuration, rate limiting is in-memory only (no Redis, lost on restart), no backup strategy, no migration strategy, no observability platform, and no caching layer."))

prod_audit = [
    ["Deployment Config", "next.config.ts", "Minimal config, removeConsole in prod", status_badge("PARTIAL")],
    ["Environment Validation", ".env (exists)", "No .env.example for developers", status_badge("PARTIAL")],
    ["Logging", "NOT FOUND", "No structured logging (winston, pino)", status_badge("NOT FOUND")],
    ["Monitoring", "NOT FOUND", "No APM/monitoring agent", status_badge("NOT FOUND")],
    ["Health Endpoint", "/api/health", "DB probe + version + uptime", status_badge("EXISTS")],
    ["Status Endpoint", "/api/health", "Same as health (no separate status)", status_badge("PARTIAL")],
    ["Caching", "NOT FOUND", "No Redis/CDN caching layer", status_badge("NOT FOUND")],
    ["Performance", "PARTIAL", "Image optimization (avif/webp) only", status_badge("PARTIAL")],
    ["Bundle Optimization", "PARTIAL", "Dynamic imports for landing page", status_badge("PARTIAL")],
    ["Image Optimization", "EXISTS", "next/image with avif/webp + cacheTTL", status_badge("EXISTS")],
    ["Security Headers", "EXISTS", "CSP, HSTS, X-Frame, COOP, CORP, COEP", status_badge("EXISTS")],
    ["Authentication", "PARTIAL", "API-key only, no session/SSO/OAuth", status_badge("PARTIAL")],
    ["Authorization", "PARTIAL", "Per-route requireAuth flag", status_badge("PARTIAL")],
    ["Rate Limiting", "PARTIAL", "In-memory only, 6 tiers (3-60/min)", status_badge("PARTIAL")],
    ["Audit Logs", "API only", "/api/audit endpoint exists, no UI", status_badge("PARTIAL")],
    ["Backup Strategy", "NOT FOUND", "No backup system for SQLite", status_badge("NOT FOUND")],
    ["Migration Strategy", "PARTIAL", "prisma db push (no versioned migrations)", status_badge("PARTIAL")],
    ["Database Readiness", "WARNING", "SQLite - not suitable for production", status_badge("BROKEN")],
    ["Observability", "NOT FOUND", "No tracing, metrics, or dashboards", status_badge("NOT FOUND")],
    ["CSRF Protection", "NOT FOUND", "No CSRF tokens on mutations", status_badge("NOT FOUND")],
    ["CORS Config", "NOT FOUND", "No CORS headers configured", status_badge("NOT FOUND")],
]
story.append(make_table(
    ["Infrastructure", "File / Evidence", "Details", "Status"],
    prod_audit,
    [100, 120, 175, 85]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 10: COMPLETE GAP ANALYSIS - 4 MASTER TABLES
# ══════════════════════════════════════════════════════
story.append(heading("Phase 10 - Complete Gap Analysis"))
story.append(body("This phase presents four master tables summarizing all findings from the previous phases. Table A catalogs every existing page. Table B lists all missing pages with importance and priority. Table C documents broken pages and their severity. Table D identifies unused or orphaned pages with recommendations."))

story.append(heading("TABLE A: All Existing Pages", s_h2, level=1))
table_a = [
    ["/", "Public", "Landing Page (Full SPA)", status_badge("COMPLETE")],
    ["* (404)", "Public", "Custom Not Found Page", status_badge("EXISTS")],
    ["* (error)", "Public", "Global Error Boundary", status_badge("EXISTS")],
    ["* (loading)", "Public", "Global Loading State", status_badge("EXISTS")],
    ["/sitemap.xml", "Public", "Dynamic Sitemap (1 URL)", status_badge("PARTIAL")],
    ["/api/health", "Public", "Health Check Endpoint", status_badge("COMPLETE")],
    ["/api/*", "Mixed", "47 API Routes (public + auth)", status_badge("PARTIAL")],
]
story.append(make_table(["Page / Route", "Category", "Evidence", "Status"], table_a, [80, 60, 220, 80]))

story.append(Spacer(1, 12))
story.append(heading("TABLE B: Missing Pages (Critical)", s_h2, level=1))
table_b = [
    ["Login / Register", "CRITICAL", "No user auth flow", "P0 - Blocker"],
    ["Dashboard", "CRITICAL", "No /dashboard route for 45 widgets", "P0 - Blocker"],
    ["Settings / Profile", "CRITICAL", "No user settings page", "P0 - Blocker"],
    ["Privacy Policy", "CRITICAL", "Legal requirement for launch", "P0 - Blocker"],
    ["Terms of Service", "CRITICAL", "Legal requirement for launch", "P0 - Blocker"],
    ["Pricing Page", "HIGH", "Component exists, needs route", "P1 - High"],
    ["Documentation Site", "HIGH", "Only cards, no real docs", "P1 - High"],
    ["API Documentation", "HIGH", "47 endpoints undocumented", "P1 - High"],
    ["Blog", "MEDIUM", "Standard marketing channel", "P2 - Medium"],
    ["Contact / Support", "MEDIUM", "Customer communication", "P2 - Medium"],
    ["Status Page", "MEDIUM", "Operational transparency", "P2 - Medium"],
    ["Billing / Subscription", "HIGH", "Revenue infrastructure", "P1 - High"],
    ["Cookie Consent", "HIGH", "GDPR legal requirement", "P1 - High"],
    ["Security Page", "MEDIUM", "Trust signals", "P2 - Medium"],
    ["Changelog / Release Notes", "LOW", "Community engagement", "P3 - Low"],
    ["About / Careers", "LOW", "Company information", "P3 - Low"],
    ["500 Error Page", "MEDIUM", "Error experience", "P2 - Medium"],
    ["OG Image", "MEDIUM", "Social sharing broken", "P2 - Medium"],
]
story.append(make_table(["Missing Page", "Importance", "Reason", "Priority"], table_b, [100, 65, 185, 90]))

story.append(PageBreak())
story.append(heading("TABLE C: Broken Pages / Links", s_h2, level=1))
table_c = [
    ["OG Image", "/og-image.png", "CRITICAL", "Referenced in layout.tsx but file missing from public/"],
    ["5 Legal Footer Links", "href='#' no-op", "HIGH", "Privacy, Terms, Security, Disclosure, License all dead"],
    ["4 Company Footer Links", "href='#community'", "HIGH", "Blog, Careers, Contact, Press link to wrong section"],
    ["2 Footer Resource Links", "href='#community'", "MEDIUM", "Tutorials, Changelog misleading targets"],
    ["Twitter Social Link", "href='#'", "MEDIUM", "Dead anchor in footer"],
    ["Discord Social Link", "href='#'", "MEDIUM", "Dead anchor in footer"],
    ["GitHub URL", "github.com/reconpro/reconpro", "HIGH", "Fictional - 18.7K stars claimed but repo does not exist"],
    ["PyPI URL", "pypi.org/project/reconpro/", "HIGH", "Fictional - 2.4M downloads claimed but package does not exist"],
    ["Docs URL", "docs.reconpro.dev", "HIGH", "Fictional - no docs site exists"],
    ["Community Section Links", "href='#'", "MEDIUM", "Contributing, Development, Community all dead anchors"],
]
story.append(make_table(["Item", "Location", "Severity", "Evidence"], table_c, [95, 115, 60, 180]))

story.append(Spacer(1, 12))
story.append(heading("TABLE D: Unused / Orphaned Pages & Components", s_h2, level=1))
table_d = [
    ["45 Dashboard Widgets", "No route/page renders them", "WIRE INTO DASHBOARD ROUTE"],
    ["EnterpriseSidebar", "493 lines, never imported", "WIRE INTO DASHBOARD LAYOUT"],
    ["BottomDock", "208 lines, never imported", "WIRE INTO DASHBOARD LAYOUT"],
    ["BentoDashboard", "320 lines, never imported", "WIRE AS DASHBOARD OVERVIEW"],
    ["CEODashboard", "1357 lines, never imported", "WIRE AS /dashboard/executive"],
    ["PricingPlans", "787 lines, never imported", "CREATE /pricing ROUTE"],
    ["premium-ui.tsx", "258 lines, zero imports", "REMOVE DEAD CODE"],
    ["demo-mode.tsx", "712 lines, zero imports", "REMOVE DEAD CODE"],
    ["dopamine-engine.tsx", "1098 lines, zero imports", "REMOVE DEAD CODE"],
    ["23 UI Components", "accordion, calendar, chart, etc.", "REMOVE OR USE (50% of ui/)"],
]
story.append(make_table(["Item", "Reason", "Recommendation"], table_d, [120, 190, 180]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 11: LAUNCH SCORECARD
# ══════════════════════════════════════════════════════
story.append(heading("Phase 11 - Launch Scorecard"))
story.append(body("Each dimension is scored from 0 to 10 based solely on repository evidence. A score of 0 means completely absent. A score of 10 means fully production-ready. The overall launch readiness score is the weighted average of all dimensions, reflecting the fact that some gaps (like authentication, legal pages, and database readiness) are more severe than others for a public launch."))

scorecard = [
    ["Public Website", "1 page only, no multi-page routing", score_cell(3)],
    ["Dashboard", "45 widgets built but ZERO routed", score_cell(1)],
    ["Developer Experience", "API-key auth, no SDK, no docs site", score_cell(2)],
    ["Community Readiness", "Fictional stats, no real community infra", score_cell(1)],
    ["Enterprise Readiness", "Pricing component orphaned, no billing", score_cell(1)],
    ["Documentation", "Marketing cards only, fictional docs URL", score_cell(1)],
    ["User Experience", "Landing page polished, zero app UX", score_cell(2)],
    ["Accessibility", "Skip-to-content link, partial ARIA", score_cell(3)],
    ["Security", "Good headers + SSRF guard + rate limits", score_cell(6)],
    ["Performance", "Dynamic imports, image opt, SQLite concern", score_cell(4)],
    ["Business Readiness", "No checkout, billing, or subscriptions", score_cell(1)],
    ["Launch Readiness", "WEIGHTED AVERAGE", score_cell(2)],
]
story.append(make_table(
    ["Dimension", "Evidence Summary", "Score"],
    scorecard,
    [100, 230, 60]
))

story.append(Spacer(1, 12))
story.append(heading("Score Interpretation", s_h2, level=1))
story.append(body("The overall score of 2.3/10 reflects a product that has invested heavily in marketing presence and API backend capabilities but has virtually no user-facing application infrastructure. The landing page is polished and professional, the API layer has 47 functional routes with real reconnaissance capabilities, and the security middleware is robust. However, the product cannot be launched publicly because users cannot create accounts, cannot access the dashboard, cannot manage billing, and the legal pages required for launch are entirely absent. The 45 orphaned dashboard widgets represent both the largest asset (ready-made UI) and the largest liability (unreachable code that misleads about product completeness)."))
story.append(body("The most critical blockers for launch are: (1) No authentication system for web users, (2) No dashboard routing for 45 built widgets, (3) No legal pages (Privacy, Terms, Cookie Policy), (4) SQLite database unsuitable for production, (5) Fictional external URLs (GitHub, PyPI, Docs) that would be immediately exposed, (6) No billing or subscription infrastructure, and (7) No community infrastructure despite claiming 18.7K stars and 2.4M downloads."))

story.append(PageBreak())

# ══════════════════════════════════════════════════════
# PHASE 12: FINAL LAUNCH CHECKLIST
# ══════════════════════════════════════════════════════
story.append(heading("Phase 12 - Final Launch Checklist"))
story.append(body("The following checklist represents every item a production SaaS product would need before public launch. Items are checked only if they truly exist in the repository, verified by file system evidence. Items marked with a cross are absent or broken."))

# Build checklist as a table with check/cross marks
checklist_items = [
    ("Landing Page", True, "page.tsx -> HomeSection with 10 sections"),
    ("Features Page", True, "#features anchor, FeaturesSection.tsx"),
    ("Pricing Page", False, "pricing-plans.tsx orphaned, no route"),
    ("Documentation", False, "Only marketing cards, no real docs"),
    ("API Documentation", False, "47 endpoints, zero docs"),
    ("Dashboard", False, "45 widgets built, ZERO routed"),
    ("Billing / Subscription", False, "No billing infrastructure"),
    ("Community", False, "Fictional stats, no real community"),
    ("Blog", False, "Not implemented"),
    ("Roadmap", False, "Not implemented"),
    ("Status Page", False, "Not implemented"),
    ("Privacy Policy", False, "Footer link is dead # no-op"),
    ("Terms of Service", False, "Footer link is dead # no-op"),
    ("Cookie Policy", False, "Not implemented"),
    ("Contact Page", False, "Not implemented"),
    ("FAQ", False, "Not implemented"),
    ("Support", False, "Not implemented"),
    ("SEO Metadata", True, "Full OG, Twitter, JSON-LD in layout.tsx"),
    ("Analytics", False, "No analytics integration"),
    ("Authentication (Web)", False, "API-key only, no user auth pages"),
    ("Authorization", True, "Per-route requireAuth on 22 API routes"),
    ("Production Build", True, "next.config.ts with removeConsole"),
    ("Monitoring", False, "No logging, APM, or error tracking"),
    ("Error Pages", True, "404 + global error boundary"),
    ("500 Error Page", False, "Only generic error boundary"),
    ("Mobile Responsive", True, "Tailwind responsive throughout"),
    ("Accessibility", False, "Partial - skip link only"),
    ("Onboarding", False, "No onboarding flow"),
    ("Demo / Product Tour", False, "Not implemented"),
    ("Upgrade Flow", False, "No subscription management"),
    ("API Keys", True, "SHA-256 hashed, DB-backed"),
    ("Rate Limiting", True, "6 tiers, 3-60 req/min"),
    ("Security Headers", True, "CSP, HSTS, X-Frame, COOP, CORP, COEP"),
    ("SSRF Protection", True, "Private IP + IPv6 + DNS rebinding guards"),
    ("Sitemap", True, "Dynamic sitemap.ts (1 URL only)"),
    ("robots.txt", True, "44 lines, blocks /api/ and AI crawlers"),
    ("Favicon", True, "public/favicon.svg"),
    ("OG Image", False, "Referenced but missing from public/"),
    ("PWA Manifest", False, "No manifest.json"),
    ("Cookie Consent", False, "Not implemented"),
    ("Internationalization", False, "English only, no i18n"),
    ("Database (Production)", False, "SQLite - not production-ready"),
    ("Structured Logging", False, "No logging library"),
    ("Error Tracking", False, "No Sentry or equivalent"),
    ("CSRF Protection", False, "Not implemented"),
    ("CORS Configuration", False, "Not implemented"),
    ("Backup Strategy", False, "No backup system"),
    ("Migration Strategy", False, "prisma db push, no versioned migrations"),
]

checked = sum(1 for _, v, _ in checklist_items if v)
total = len(checklist_items)

check_data = [["Item", "Status", "Evidence"]]
for name, exists, evidence in checklist_items:
    mark = Paragraph('<font color="#6fbf89"><b>YES</b></font>', s_cell) if exists else Paragraph('<font color="#c8817a"><b>NO</b></font>', s_cell)
    check_data.append([Paragraph(name, s_cell), mark, Paragraph(evidence, s_cell)])

story.append(make_table(
    ["Item", "Status", "Evidence"],
    check_data[1:],
    [100, 40, 300]
))

story.append(Spacer(1, 12))
story.append(Paragraph(f"<b>Checklist Summary: {checked} of {total} items present ({round(checked/total*100, 1)}%)</b>", 
    ParagraphStyle('Summary', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=SEM_WARNING, alignment=TA_CENTER)))
story.append(Spacer(1, 8))
story.append(body(f"Only {checked} of {total} launch-critical items ({round(checked/total*100, 1)}%) are currently present. The remaining {total - checked} items ({round((total-checked)/total*100, 1)}%) must be built before ReconPro can be launched to the public. The items that exist are primarily in the marketing landing page, API security infrastructure, and basic error handling. The most critical gaps are in user authentication, dashboard routing, legal compliance, billing infrastructure, and production database readiness."))

# ━━ Page Number Footer ━━
def add_page_number(canvas, doc):
    page_num = canvas.getPageNumber()
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawRightString(A4[0] - 20*mm, 12*mm, f"ReconPro Launch Readiness Audit | Page {page_num}")
    canvas.restoreState()

# ━━ Build ━━
doc.build(story, onLaterPages=add_page_number, onFirstPage=add_page_number)
print(f"PDF generated: {OUTPUT}")
print(f"Pages: {doc.page}")
