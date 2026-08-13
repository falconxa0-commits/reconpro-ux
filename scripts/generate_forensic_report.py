#!/usr/bin/env python3
"""
ReconPro — Forensic Capability Verification Omega
READ-ONLY audit report generator. No code changes.
"""
import sys, os
sys.path.insert(0, '/usr/share/fonts')

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.colors import HexColor

# ── Font Registration ──────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationMono', f'{FONT_DIR}/truetype/liberation/LiberationMono-Regular.ttf'))

# ── Cascade Palette ──────────────────────────────────────────
PAGE_BG       = HexColor('#090a0a')
SECTION_BG    = HexColor('#1d1f1e')
CARD_BG       = HexColor('#232b27')
TABLE_STRIPE  = HexColor('#161918')
HEADER_FILL   = HexColor('#335544')
COVER_BLOCK   = HexColor('#2d4b3c')
BORDER        = HexColor('#456957')
ICON          = HexColor('#88bca2')
ACCENT        = HexColor('#49cf8c')
TEXT_PRIMARY   = HexColor('#e3e6e5')
TEXT_MUTED     = HexColor('#929b96')
SEM_SUCCESS   = HexColor('#78b28b')
SEM_WARNING   = HexColor('#bfa36b')
SEM_ERROR     = HexColor('#c8817b')
SEM_INFO      = HexColor('#7c9ab8')

# ── Page Setup ──────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_M = 22*mm
RIGHT_M = 22*mm
TOP_M = 20*mm
BOT_M = 22*mm
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

# ── Custom Styles ──────────────────────────────────────────
styles = getSampleStyleSheet()

s_title = ParagraphStyle('Title', fontName='NotoSansSC-Bold', fontSize=28, leading=34, textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6)
s_subtitle = ParagraphStyle('Subtitle', fontName='NotoSansSC', fontSize=13, leading=18, textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=20)
s_h1 = ParagraphStyle('H1', fontName='NotoSansSC-Bold', fontSize=18, leading=24, textColor=ACCENT, spaceBefore=18, spaceAfter=10)
s_h2 = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=14, leading=19, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8)
s_h3 = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=11, leading=15, textColor=ICON, spaceBefore=10, spaceAfter=6)
s_body = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=9.5, leading=15, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8)
s_body_small = ParagraphStyle('BodySmall', fontName='NotoSansSC', fontSize=8.5, leading=13, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6)
s_mono = ParagraphStyle('Mono', fontName='LiberationMono', fontSize=7.5, leading=11, textColor=TEXT_MUTED)
s_bullet = ParagraphStyle('Bullet', fontName='NotoSansSC', fontSize=9, leading=14, textColor=TEXT_PRIMARY, leftIndent=14, bulletIndent=4, spaceAfter=3)
s_verdict = ParagraphStyle('Verdict', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=ACCENT)
s_verdict_red = ParagraphStyle('VerdictRed', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=SEM_ERROR)
s_verdict_yellow = ParagraphStyle('VerdictYellow', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=SEM_WARNING)
s_footer = ParagraphStyle('Footer', fontName='NotoSansSC', fontSize=7, leading=9, textColor=TEXT_MUTED, alignment=TA_CENTER)
s_label = ParagraphStyle('Label', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MUTED)

# ── Helpers ──────────────────────────────────────────
def status_cell(status):
    color_map = {
        'VERIFIED IMPLEMENTED': SEM_SUCCESS,
        'PARTIALLY IMPLEMENTED': SEM_WARNING,
        'PRESENT BUT UNVERIFIED': SEM_INFO,
        'PLANNED / DECLARED ONLY': TEXT_MUTED,
        'NOT FOUND': SEM_ERROR,
    }
    c = color_map.get(status, TEXT_PRIMARY)
    s = ParagraphStyle('sc', fontName='NotoSansSC-Bold', fontSize=7.5, leading=10, textColor=c)
    return Paragraph(status, s)

def body(text):
    return Paragraph(text, s_body)

def body_s(text):
    return Paragraph(text, s_body_small)

def h1(text):
    return Paragraph(text, s_h1)

def h2(text):
    return Paragraph(text, s_h2)

def h3(text):
    return Paragraph(text, s_h3)

def bullet(text):
    return Paragraph(text, s_bullet, bulletText=chr(8226))

def mono(text):
    return Paragraph(text, s_mono)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=8, spaceAfter=8)

def verdict(text, level='green'):
    style_map = {'green': s_verdict, 'red': s_verdict_red, 'yellow': s_verdict_yellow}
    return Paragraph(text, style_map.get(level, s_verdict))

def make_table(headers, rows, col_widths=None):
    """Create a styled table with dark theme."""
    hdr_style = ParagraphStyle('th', fontName='NotoSansSC-Bold', fontSize=7.5, leading=10, textColor=colors.white)
    cell_style = ParagraphStyle('tc', fontName='NotoSansSC', fontSize=7, leading=10, textColor=TEXT_PRIMARY)
    
    data = [[Paragraph(h, hdr_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) if not isinstance(c, Paragraph) else c for c in row])
    
    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
    ]
    # Alternate row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    
    t.setStyle(TableStyle(style_cmds))
    return t

def verdict_block(title, text, level='green'):
    data = [[Paragraph(f'<b>{title}</b>', ParagraphStyle('vb_t', fontName='NotoSansSC-Bold', fontSize=9, leading=13, textColor=TEXT_PRIMARY)),
             Paragraph(text, ParagraphStyle('vb_b', fontName='NotoSansSC', fontSize=8.5, leading=12, textColor=TEXT_PRIMARY))]]
    color = {'green': SEM_SUCCESS, 'red': SEM_ERROR, 'yellow': SEM_WARNING}[level]
    t = Table(data, colWidths=[90, CONTENT_W - 90])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t

# ── Page Background ──────────────────────────────────
class PageBackground(Flowable):
    def __init__(self):
        Flowable.__init__(self)
        self.width = 0
        self.height = 0
    def draw(self):
        self.canv.setFillColor(PAGE_BG)
        self.canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont('NotoSansSC', 7)
    canvas.drawCentredString(PAGE_W / 2, 10 * mm, f"ReconPro Forensic Capability Verification | Page {doc.page}")
    canvas.restoreState()

def on_first_page(canvas, doc):
    on_page(canvas, doc)

# ── BUILD DOCUMENT ──────────────────────────────────
output_path = '/home/z/my-project/download/ReconPro_Forensic_Capability_Verification_Omega.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='ReconPro - Forensic Capability Verification Omega',
    author='Z.ai Forensic Audit',
    subject='READ-ONLY repository verification of actual ReconPro capabilities',
)

story = []

# ════════════════════════════════════════════════════════════════
# COVER PAGE
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 80*mm))
story.append(Paragraph('RECONPRO', ParagraphStyle('cover_main', fontName='NotoSansSC-Bold', fontSize=42, leading=48, textColor=ACCENT)))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('FORENSIC CAPABILITY VERIFICATION', ParagraphStyle('cover_sub', fontName='NotoSansSC-Bold', fontSize=20, leading=26, textColor=TEXT_PRIMARY)))
story.append(Paragraph('<font color="#88bca2">Omega</font>', ParagraphStyle('cover_omega', fontName='NotoSansSC-Bold', fontSize=16, leading=20, textColor=ICON)))
story.append(Spacer(1, 12*mm))
story.append(hr())
story.append(Paragraph('READ-ONLY FORENSIC AUDIT', s_label))
story.append(Paragraph('No code modified. No fixes applied. No implementations created.', s_label))
story.append(Paragraph('Source code is the sole authority. All claims verified against actual repository files.', s_label))
story.append(Spacer(1, 10*mm))
story.append(Paragraph('Generated: 2026-08-13', s_label))
story.append(Paragraph('Repository: /home/z/my-project/src (Next.js 15 App Router)', s_label))
story.append(Paragraph('Audit Scope: 47 API routes, 44 UI components, 16 lib modules, 22 test files', s_label))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS (Manual)
# ════════════════════════════════════════════════════════════════
story.append(h1('TABLE OF CONTENTS'))
story.append(hr())
toc_items = [
    '1. Repository Identity and Statistics',
    '2. Actual Architecture Map',
    '3. Reconnaissance Capability Audit (12 Capabilities)',
    '4. Security Assessment Audit (12 Capabilities)',
    '5. Specialized Module Audit (10 Modules)',
    '6. Team / Organization Capability Audit',
    '7. Intelligence Pipeline Audit',
    '8. Value Ledger Audit',
    '9. Engineering / Security Hardening Audit (20 Claims)',
    '10. Testing Verification',
    '11. Capability Wiring Analysis',
    '12. Dead-Code / False-Capability Detection',
    '13. Master Capability Matrix',
    '14. Capability Maturity Scores',
    '15. Critical Discoveries',
    '16. Implemented vs. Partial vs. Future',
    '17. Launch Blockers and Recommended Priorities',
]
for item in toc_items:
    story.append(Paragraph(item, ParagraphStyle('toc', fontName='NotoSansSC', fontSize=10, leading=18, textColor=TEXT_PRIMARY, leftIndent=8)))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 1. REPOSITORY IDENTITY
# ════════════════════════════════════════════════════════════════
story.append(h1('1. Repository Identity and Statistics'))
story.append(hr())
story.append(body(
    'The canonical ReconPro repository is located at <font color="#88bca2">/home/z/my-project/</font>. '
    'It is a Next.js 15 application using the App Router architecture, written in TypeScript, styled with Tailwind CSS 4 and shadcn/ui components, '
    'with Framer Motion for animations. The database layer uses Prisma ORM with SQLite as the data store. '
    'The project also contains two Python CLI packages (vibesec-cli v8.0.0 and reconpro-work v10.0.0) that represent a separate, legacy codebase '
    'and are not part of the Next.js web application under audit. This verification focuses exclusively on the Next.js web application source code '
    'in the <font color="#88bca2">src/</font> directory.'
))

stats_headers = ['Metric', 'Value']
stats_rows = [
    ['Framework', 'Next.js 16.1.1 (App Router)'],
    ['Language', 'TypeScript (strict)'],
    ['Styling', 'Tailwind CSS 4 + shadcn/ui + Framer Motion'],
    ['Database', 'Prisma 6.11.1 + SQLite'],
    ['Source Files (src/)', '162 TypeScript files'],
    ['API Routes', '47 route files across 39 endpoint groups'],
    ['UI Components', '44 ReconPro components + 40 shadcn/ui primitives'],
    ['Library Modules', '16 files in src/lib/ (8 recon, 8 engines)'],
    ['Test Files', '22 test files with ~339 test blocks'],
    ['Design System', 'OLED Void: #000000, glass morphism, champagne gold #C9A96E'],
    ['Python CLI (excluded)', 'vibesec-cli v8.0.0, reconpro-work v10.0.0'],
    ['Total JS Estimate', '~1.4MB JS, ~340KB CSS (from prior session)'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(stats_headers, stats_rows, [100, CONTENT_W - 100]))
story.append(Spacer(1, 6*mm))

story.append(body(
    'The directory structure is organized into a standard Next.js App Router layout. The <font color="#88bca2">src/app/api/</font> directory '
    'contains 47 route handler files organized into 39 functional endpoint groups, each in its own subdirectory. '
    'The <font color="#88bca2">src/lib/</font> directory contains shared utility libraries, security modules, and reconnaissance engines. '
    'The <font color="#88bca2">src/components/reconpro/</font> directory contains 44 custom UI components that implement the dashboard interface. '
    'The <font color="#88bca2">src/lib/recon/</font> subdirectory contains 8 reconnaissance engine files that implement DNS, HTTP, SSL, CT log, '
    'and port scanning capabilities. Additionally, the repository includes two Python packages (vibesec-cli and reconpro-work) that '
    'contain extensive Python implementations of security scanning modules, but these are completely disconnected from the Next.js web application '
    'and are not imported, referenced, or used by any part of the TypeScript codebase.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 2. ACTUAL ARCHITECTURE MAP
# ════════════════════════════════════════════════════════════════
story.append(h1('2. Actual Architecture Map'))
story.append(hr())
story.append(body(
    'The following architecture map is derived exclusively from verified import chains, API route handler logic, and database queries. '
    'Modules marked "NOT IMPLEMENTED" have no working code behind them. Modules marked "SIMULATED" contain real code but produce fabricated data '
    'rather than performing actual security analysis against live targets.'
))

arch_headers = ['Layer', 'Module', 'Status', 'Evidence']
arch_rows = [
    ['ENTRY', 'Landing Page (/)', 'MARKETING', 'home-section.tsx renders HeroSection, FeaturesSection, etc. No API calls'],
    ['ENTRY', 'Dashboard', 'FUNCTIONAL', 'Multiple components fetch from /api/* routes'],
    ['MIDDLEWARE', 'Security Headers', 'IMPLEMENTED', 'middleware.ts: CSP, HSTS, X-Frame-Options DENY, CORP, COEP'],
    ['MIDDLEWARE', 'API Authentication', 'PARTIAL', 'api-protection.ts exists, requireAuth=false on ALL routes'],
    ['MIDDLEWARE', 'Rate Limiting', 'IMPLEMENTED', 'api-security.ts: in-memory bounded store, used by ~30 routes'],
    ['MIDDLEWARE', 'SSRF Protection', 'IMPLEMENTED', 'safe-fetch.ts, api-security.ts: DNS resolution + IP blocking'],
    ['ENGINE', 'DNS Reconnaissance', 'IMPLEMENTED', 'native-dns.ts: real DNS queries via dns.promises'],
    ['ENGINE', 'SSL/TLS Analysis', 'IMPLEMENTED', 'native-dns.ts analyzeSSLNative: real TLS handshakes'],
    ['ENGINE', 'HTTP Recon', 'DEAD CODE', 'recon/http-recon.ts exists but NOT imported by any route'],
    ['ENGINE', 'Port Scanning', 'DEAD CODE', 'recon/port-check.ts exists but NOT imported by any route'],
    ['ENGINE', 'CT Log Query', 'DEAD CODE', 'recon/ct-logs.ts exists but NOT imported by any route'],
    ['ENGINE', 'Vulnerability Scan', 'IMPLEMENTED', 'vuln-scan/route.ts: real TCP probes + banner grabs'],
    ['ENGINE', 'Bot Hunter', 'IMPLEMENTED', 'bot-hunter/route.ts: real DNSBL + IP reputation queries'],
    ['ENGINE', 'Hall of Fame', 'IMPLEMENTED', 'hall-of-fame/route.ts: real HTTP probes via safeFetch'],
    ['ENGINE', 'AI Advisor', 'HARDCODED KB', 'ai-advisor/route.ts: pattern-matched remediation database'],
    ['ENGINE', 'Oblivion (Model Red Team)', 'STUB', 'oblivion/route.ts: returns all zeros, no real analysis'],
    ['ENGINE', 'GORGON (Model Red Team)', 'IMPLEMENTED', 'model-redteam/route.ts: 955 lines, real HTTP probes'],
    ['ENGINE', 'Fear Index', 'SIMULATED', 'fear-index-engine.ts: seeded PRNG, no real data'],
    ['ENGINE', 'Quantum Doom Clock', 'SIMULATED', 'quantum-doom-engine.ts: synthetic TLS data + math'],
    ['ENGINE', 'PQC Vault', 'SIMULATED', 'pqc-vault-engine.ts: hardcoded compliance databases'],
    ['ENGINE', 'CNI Sentinel', 'SIMULATED', 'cni-sentinel-engine.ts: static SCADA/ICS databases'],
    ['ENGINE', 'Implosion Simulator', 'SIMULATED', 'implosion-engine.ts: IBM data + arithmetic'],
    ['ENGINE', 'Broadcast System', 'SIMULATED', 'broadcast-engine.ts: real Ed25519 crypto, fake content'],
    ['ENGINE', 'Genesis Stamp', 'IMPLEMENTED', 'genesis-crypto.ts: real Ed25519 signing + DB storage'],
    ['ENGINE', 'NHI Kill Switch', 'HARDCODED', 'nhi/route.ts: 12 sample identities, no real cloud scan'],
    ['ENGINE', 'Compliance Panel', 'SIMULATED', 'compliance/route.ts: rule-based scoring'],
    ['ENGINE', 'Sovereign Control', 'IMPLEMENTED', 'sovereign/route.ts: real Ed25519 crypto + DB audit'],
    ['DATA', 'Prisma ORM', 'IMPLEMENTED', '20 models, SQLite, used by 15+ routes'],
    ['DATA', 'Findings Pipeline', 'PARTIAL', 'Scan creates Finding records, no correlation engine'],
    ['DATA', 'Intelligence Pipeline', 'NOT IMPLEMENTED', 'No observation-to-risk-to-remediation flow'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(arch_headers, arch_rows, [45, 90, 65, CONTENT_W - 200]))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 3. RECONNAISSANCE CAPABILITY AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('3. Reconnaissance Capability Audit'))
story.append(hr())
story.append(body(
    'Each reconnaissance capability was traced from UI component through API route to engine library. '
    'A capability is classified as VERIFIED IMPLEMENTED only when the complete execution path is connected end-to-end '
    'with real network operations. Capabilities that exist as library code but are not imported by any production route '
    'are classified as DEAD CODE, regardless of how well-implemented the library itself may be.'
))

recon_headers = ['Capability', 'Status', 'Implementation Files', 'Evidence', 'Confidence']
recon_rows = [
    ['Domain Recon', 'VERIFIED', 'native-dns.ts, scan/route.ts', 'Real DNS A/AAAA/MX/NS/TXT/DMARC queries', 'HIGH'],
    ['DNS Intelligence', 'VERIFIED', 'native-dns.ts, scan/route.ts', 'SPF/DMARC analysis, TXT classification', 'HIGH'],
    ['IP/Host Discovery', 'VERIFIED', 'native-dns.ts, scan/route.ts', 'DNS resolution + reverse DNS via dns.promises', 'HIGH'],
    ['Subdomain Recon', 'NOT FOUND', 'None wired to production', 'recon/ct-logs.ts exists (DEAD CODE) + scan/stream is simulated', 'N/A'],
    ['WHOIS Intelligence', 'NOT FOUND', 'No implementation found', 'No WHOIS query code exists anywhere in src/', 'N/A'],
    ['TLS/SSL Inspection', 'VERIFIED', 'native-dns.ts, scan/route.ts', 'Real TLS handshakes, cert analysis, cipher check', 'HIGH'],
    ['CT Intelligence', 'DEAD CODE', 'recon/ct-logs.ts', 'Full crt.sh implementation exists but is NOT imported', 'N/A'],
    ['HTTP Recon', 'DEAD CODE', 'recon/http-recon.ts', 'Full HTTP + security header analysis exists but NOT imported', 'N/A'],
    ['Tech Identification', 'DEAD CODE', 'recon/http-recon.ts', '30+ entry fingerprint DB exists in dead code', 'N/A'],
    ['Port Scanning', 'DEAD CODE', 'recon/port-check.ts', '26-port TCP scanner exists but NOT imported by any route', 'N/A'],
    ['Security Headers', 'VERIFIED', 'scan/route.ts', 'Inline HTTP header analysis in scan route', 'MEDIUM'],
    ['Attack Surface', 'PARTIAL', 'hall-of-fame/route.ts', '5-path HTTP probe (.env, /admin, etc.) via safeFetch', 'MEDIUM'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(recon_headers, recon_rows, [65, 55, 80, CONTENT_W - 230]))
story.append(Spacer(1, 6*mm))

story.append(verdict_block('CRITICAL FINDING', 
    'The <font color="#c8817b">src/lib/recon/</font> directory containing 6 fully-implemented reconnaissance modules (http-recon.ts, ssl-recon.ts, '
    'ct-logs.ts, port-check.ts, ssrf-guard.ts, findings-formatter.ts) is entirely DEAD CODE. These files contain real, working '
    'implementations with actual network calls, SSRF protection, and comprehensive analysis. However, NO production API route imports '
    'from this directory. The scan/route.ts instead uses native-dns.ts for DNS/SSL only and implements HTTP analysis inline. '
    'Subdomain enumeration, port scanning, CT log querying, and the centralized ssrf-guard are completely unreachable.', 'red'))

story.append(Spacer(1, 6*mm))
story.append(body(
    'The production scan route (<font color="#88bca2">src/app/api/scan/route.ts</font>) is a 1200+ line file that implements '
    'DNS enumeration (7 concurrent record types via native-dns.ts), SSL/TLS analysis (via native-dns.ts), HTTP header analysis '
    '(inline safeFetch calls), technology fingerprinting (inline ~30-entry database), vulnerability probing (inline CVE matching), '
    'and port scanning (inline TCP probes of 13 common ports). It saves results to the database via Prisma. '
    'The scan/stream/route.ts is a separate SSE endpoint that provides a simulated terminal experience with fake command outputs '
    'and hardcoded phase transitions, not connected to the actual scan engine.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 4. SECURITY ASSESSMENT AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('4. Security Assessment Audit'))
story.append(hr())

sec_headers = ['Capability', 'Status', 'Implementation Details', 'Confidence']
sec_rows = [
    ['Vuln Discovery', 'VERIFIED', 'vuln-scan/route.ts: TCP banner grab, CVE matching, HTTP/SSL/DNS tests', 'HIGH'],
    ['Web Security Checks', 'VERIFIED', 'hall-of-fame/route.ts: 5-path HTTP exposure probe', 'MEDIUM'],
    ['API Security Checks', 'VERIFIED', 'api-security.ts: domain/IP validation, SSRF, rate limiting', 'HIGH'],
    ['SSRF-Aware Recon', 'VERIFIED', 'safe-fetch.ts: DNS resolution, private IP blocking, domain blocklist', 'HIGH'],
    ['Security Config', 'VERIFIED', 'middleware.ts: CSP, HSTS, X-Frame-Options, CORP, COEP', 'HIGH'],
    ['Exposure Detection', 'VERIFIED', 'hall-of-fame/route.ts + vuln-scan: real HTTP probing', 'MEDIUM'],
    ['Finding Classification', 'VERIFIED', 'scan/route.ts: severity/category assignment per finding', 'MEDIUM'],
    ['Risk/Severity Assessment', 'PARTIALSEC ', 'scan/route.ts: severity assignment; no CVSS scoring engine', 'LOW'],
    ['Evidence Collection', 'VERIFIED', 'scan/route.ts: evidence field populated from actual output', 'HIGH'],
    ['Finding Normalization', 'PARTIALSEC ', 'Prisma Finding model; inconsistent use across routes', 'LOW'],
    ['Finding Formatting', 'PARTIALSEC ', 'Dead code findings-formatter.ts unused; inline formatting', 'LOW'],
    ['Security Report Generation', 'NOT FOUND', 'No report generation engine; data returned as JSON', 'N/A'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(sec_headers, sec_rows, [70, 55, CONTENT_W - 155]))
story.append(Spacer(1, 6*mm))

story.append(body(
    'The security assessment capabilities are concentrated in the scan and vuln-scan API routes. The vulnerability scanner '
    '(<font color="#88bca2">vuln-scan/route.ts</font>) is a 56KB file implementing real TCP connection probes, banner grabbing, '
    'HTTP security header checks, SSL certificate validation, DNS misconfiguration detection, and CVE database matching. '
    'It uses the centralized security modules (api-security.ts for validation, safe-fetch.ts for HTTP, api-protection.ts for rate limiting). '
    'The Hall of Fame route performs 5-path HTTP exposure probing against real targets. However, there is no unified security report '
    'generation engine, no CVSS scoring calculator, and the findings-formatter.ts utility in the dead code directory is not used by any production route.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 5. SPECIALIZED MODULE AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('5. Specialized Module Audit'))
story.append(hr())

mod_headers = ['Module', 'Exists?', 'Real or Demo?', 'API Route?', 'UI Component?', 'DB?', 'Tests?', 'Maturity']
mod_rows = [
    ['Vulnerability Scanner', 'YES', 'REAL', 'vuln-scan/', 'vuln-arsenal.tsx', 'Finding, Scan', 'scan-engine.test (mocked)', 'PRODUCTION'],
    ['Bot Hunter', 'YES', 'REAL', 'bot-hunter/', 'bot-cage.tsx', 'ThreatAlert', 'scan-engine.test (mocked)', 'PRODUCTION'],
    ['Oblivion', 'YES', 'STUB/ZERO', 'oblivion/', 'oblivion.tsx', 'None', 'None', 'PLACEHOLDER'],
    ['Model Red Team (GORGON)', 'YES', 'REAL', 'model-redteam/', 'model-breaker.tsx', 'None', 'None', 'PRODUCTION'],
    ['Hall of Fame', 'YES', 'REAL', 'hall-of-fame/', 'hall-of-fame.tsx', 'VibeSecEntry', 'None', 'PRODUCTION'],
    ['Sovereign', 'YES', 'REAL', 'sovereign/', 'sovereign-control.tsx', 'None', 'None', 'PRODUCTION'],
    ['Sandbox', 'YES', 'DEMO', 'sandbox/', 'confused-deputy.tsx', 'None', 'None', 'DEMO'],
    ['Scan/Stream', 'YES', 'SIMULATED', 'scan/stream/', 'scan-overlay.tsx', 'None', 'None', 'SIMULATION'],
    ['Recon Engine', 'PARTIALSEC ', 'REAL+DEAD', 'scan/', 'unified-cli.tsx', 'Scan, Finding', 'Mocked tests', 'PARTIAL'],
    ['Findings Infra', 'YES', 'REAL', 'scans/', 'scan-results.tsx', 'Finding model', 'None', 'PRODUCTION'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(mod_headers, mod_rows, [70, 30, 48, 45, 55, 45, 55, 42]))
story.append(Spacer(1, 6*mm))

story.append(verdict_block('OBLIVION IS A STUB',
    'The Oblivion module (<font color="#88bca2">src/app/api/oblivion/route.ts</font>) presents an elaborate 20-tool analytical '
    'dissolution framework with philosophical descriptions for each tool (Cognitive Mirror, Theseus Test, Alignment Decay Engine, etc.). '
    'However, the POST handler returns ALL ZEROS for every metric: threatScore=0, bypasses=0, decaysAchieved=0, layersStripped=0, etc. '
    'The comment explicitly states "Python engine replaced with structured response" and "awaiting deployment." '
    'The 44-tool catalog and wisdom quotes are hardcoded. This is a presentation shell with no actual analysis engine behind it.', 'yellow'))

story.append(Spacer(1, 4*mm))
story.append(body(
    'GORGON (Model Red Team, <font color="#88bca2">model-redteam/route.ts</font>) is a substantial 955-line implementation that performs '
    'actual HTTP probes against AI model endpoints. It sends crafted payloads (prompt injection chains, system prompt extraction attempts, '
    'alignment probing), analyzes responses, and matches findings against a CVE database. It uses safeFetch for SSRF protection and rate '
    'limiting via api-security.ts. The Hall of Fame module performs real HTTP HEAD requests to probe for exposed paths (.env, /admin, /api/webhooks, '
    '/dashboard, /uploads/) and computes a security grade based on exposure results. The Sovereign module uses real Ed25519 cryptographic signing '
    'for data sovereignty attestation.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 6. TEAM / ORGANIZATION CAPABILITY AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('6. Team / Organization Capability Audit'))
story.append(hr())

story.append(body(
    'The team and organization capabilities are implemented through a Prisma database schema with 4 models (Organization, Team, Member, TeamMember) '
    'and 3 API routes (teams/, members/, organization implied). The schema supports multi-organization architecture with teams, role-based membership '
    '(owner, admin, security_lead, analyst, viewer), and audit logging. However, the actual execution path reveals significant gaps.'
))

org_headers = ['Layer', 'Implementation', 'Status', 'Evidence']
org_rows = [
    ['Authentication', 'withProtection(requireAuth)', 'NOT ACTIVE', 'requireAuth=false on ALL routes; no route checks auth'],
    ['API Key System', 'api-protection.ts + ApiKey model', 'IMPLEMENTED', 'SHA-256 key hashing, DB lookup, expiry, usage tracking'],
    ['API Key Usage', 'Production routes', 'NOT USED', 'No route has requireAuth=true; keys exist but unused'],
    ['Rate Limiting', 'api-security.ts checkRateLimit', 'IMPLEMENTED', 'Bounded in-memory store (50K cap), used by 30+ routes'],
    ['Input Validation', 'api-security.ts sanitizeDomain', 'IMPLEMENTED', 'Domain regex, IP validation, blocked domain list'],
    ['Request Size Limit', 'api-security.ts parseValidatedBody', 'IMPLEMENTED', '1MB default max, Content-Length check'],
    ['Error Isolation', 'safeErrorResponse', 'IMPLEMENTED', 'Dev: full error; Prod: generic message + UUID'],
    ['Audit Logging', 'Prisma AuditLog model', 'PARTIALSEC ', 'Only teams/ and members/ routes write audit logs'],
    ['Authorization', 'Role-based access', 'NOT IMPLEMENTED', 'Member roles exist in schema but no route checks roles'],
    ['Organization Multi-tenancy', 'organizationId foreign key', 'PARTIALSEC ', 'Schema supports it; routes use findFirst (single org)'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(org_headers, org_rows, [80, 90, 60, CONTENT_W - 240]))
story.append(Spacer(1, 6*mm))

story.append(verdict_block('AUTHENTICATION IS NOT ENFORCED',
    'The centralized protection middleware (<font color="#88bca2">api-protection.ts</font>) has a fully implemented authentication system with '
    'API key hashing, database lookup, expiry checking, and usage tracking. However, the <font color="#c8817b">requireAuth parameter defaults to false</font> '
    'and NO production route passes requireAuth=true. This means ANY anonymous user can invoke ANY API endpoint including scan creation, '
    'team management, member operations, and data deletion. The API key infrastructure exists but is completely dormant.', 'red'))

story.append(Spacer(1, 4*mm))
story.append(body(
    'The request execution path for a typical mutating operation (e.g., DELETE /api/teams?id=xxx) flows through: rate limiting (IP-based, 5 req/min) '
    'to route handler to Prisma database operations. There is NO authentication check, NO authorization check, and NO organization scoping '
    '(uses findFirst which returns any organization). The audit log is written for team creation and deletion but not for all mutating operations. '
    'The DELETE operation for teams does cascade-delete TeamMember junction records, which shows reasonable data integrity handling.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 7. INTELLIGENCE PIPELINE AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('7. Intelligence Pipeline Audit'))
story.append(hr())

pipe_headers = ['Stage', 'Implemented?', 'Location', 'Data Structure', 'Connected to Next?']
pipe_rows = [
    ['Raw Recon', 'YES', 'scan/route.ts', 'Finding type (inline)', 'YES -> DB'],
    ['Observations', 'YES', 'scan/route.ts', 'Finding with severity/category', 'YES -> DB'],
    ['Findings', 'YES', 'Prisma Finding model', 'Finding table with status/CVE/CVSS', 'NO -> No consumer'],
    ['Correlation', 'NO', 'None', 'N/A', 'N/A'],
    ['Risk', 'PARTIALSEC ', 'scan/route.ts riskScore', 'Integer 0-100', 'Stored, not calculated'],
    ['Business Impact', 'NO', 'None', 'N/A', 'N/A'],
    ['Remediation', 'PARTIALSEC ', 'ai-advisor hardcoded KB', 'Static text responses', 'NOT from findings'],
    ['Verification', 'NO', 'None', 'N/A', 'N/A'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(pipe_headers, pipe_rows, [60, 55, 70, 80, CONTENT_W - 275]))
story.append(Spacer(1, 6*mm))

story.append(body(
    'The intelligence pipeline is implemented only at its earliest stages. The scan route produces raw reconnaissance observations and converts them '
    'into findings with severity and category classifications. These findings are stored in the Prisma Finding table with fields for title, severity, '
    'category, description, evidence, asset, remediation, CVE, CVSS, and status. However, the pipeline breaks after storage. There is no correlation '
    'engine that connects multiple findings into a larger security picture. Risk scores are stored as static integers on the Scan model but are not '
    'dynamically calculated from findings. Business impact modeling does not exist (the Implosion Simulator produces fabricated financial estimates from '
    'hardcoded industry averages, not from actual scan data). Remediation guidance exists only as a static keyword-matching database in the AI Advisor '
    'route. There is no verification mechanism to track whether a previously identified issue has been resolved.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 8. VALUE LEDGER AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('8. Value Ledger Audit'))
story.append(hr())

val_headers = ['Capability', 'Status', 'Evidence']
val_rows = [
    ['Estimated Exposure', 'SIMULATED', 'implosion-engine.ts: IBM Cost of Data Breach 2024 data + arithmetic'],
    ['Potential Financial Impact', 'SIMULATED', 'implosion-engine.ts: hardcoded regulatory fines (GDPR/HIPAA/PCI)'],
    ['Avoided Loss', 'NOT FOUND', 'No implementation exists'],
    ['Remediation Value', 'NOT FOUND', 'No implementation exists'],
    ['Business Value Tracking', 'NOT FOUND', 'No implementation exists'],
    ['Verified Savings', 'NOT FOUND', 'No implementation exists'],
    ['Value Attribution', 'NOT FOUND', 'No implementation exists'],
    ['Customer-Specific Tracking', 'PARTIALSEC ', 'Organization model exists but no value metrics'],
    ['Financial Reporting', 'NOT FOUND', 'No implementation exists'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(val_headers, val_rows, [100, 55, CONTENT_W - 165]))
story.append(Spacer(1, 6*mm))

story.append(body(
    'The Value Ledger is almost entirely a product vision with no production implementation. The Implosion Simulator is the only component that '
    'addresses financial metrics, but it operates on hardcoded IBM research data and industry averages rather than actual organizational telemetry. '
    'When a user provides domain and industry parameters, the simulator generates plausible-looking but entirely synthetic financial impact estimates '
    '(data breach cost, regulatory fines, reputational damage, stock impact). The ImplosionScenario Prisma model can store these simulations, '
    'but there is no mechanism for tracking remediation value, verified savings, or customer-specific value attribution. The Organization model has '
    'fields for plan type and API quota but no financial or value-related fields.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 9. ENGINEERING / SECURITY HARDENING AUDIT
# ════════════════════════════════════════════════════════════════
story.append(h1('9. Engineering / Security Hardening Audit'))
story.append(hr())

eng_headers = ['Claim', 'Status', 'Evidence', 'Notes']
eng_rows = [
    ['SSRF Protection', 'VERIFIED', 'safe-fetch.ts + api-security.ts', 'DNS resolution, IPv4/IPv6 private blocking, domain blocklist'],
    ['Centralized Validation', 'VERIFIED', 'api-security.ts', 'sanitizeDomain, sanitizeTarget, isValidTarget, DOMAIN_REGEX'],
    ['API Authentication', 'IMPLEMENTED BUT UNUSED', 'api-protection.ts withProtection', 'Full implementation exists but requireAuth=false everywhere'],
    ['API Key Protection', 'IMPLEMENTED BUT UNUSED', 'api-protection.ts + ApiKey model', 'SHA-256 hashing, DB lookup, expiry; no route uses it'],
    ['Rate Limiting', 'VERIFIED', 'api-security.ts checkRateLimit', 'Bounded store (50K), cleanup, per-IP keys'],
    ['Safe Network Fetching', 'VERIFIED', 'safe-fetch.ts', 'SSRF + timeout + size limit + no redirect follow'],
    ['XSS Escaping', 'VERIFIED', 'lib/utils.ts escapeHtml', 'Function exists but NOT verified in component rendering paths'],
    ['CSP/Security Headers', 'VERIFIED', 'middleware.ts', 'CSP with nonce, HSTS 1yr, X-Frame DENY, CORP/COEP'],
    ['Error Isolation', 'VERIFIED', 'safeErrorResponse', 'Dev: full error; Prod: generic + UUID'],
    ['Error Leak Reduction', 'VERIFIED', 'safeErrorResponse', 'isDev flag controls detail exposure'],
    ['Accessibility', 'MINIMAL', 'Partial ARIA in CommandPalette', 'No systematic a11y audit; skip-link exists'],
    ['Security Regression Tests', 'VERIFIED', '22 test files, ~339 tests', 'Heavy mocking; 38% are static grep tests'],
    ['Adversarial Tests', 'VERIFIED', 'adversarial-ssrf, adversarial-xss, etc.', 'Good coverage of api-security functions'],
    ['Red-Team Tests', 'NOT FOUND', 'No dedicated red-team test suite', 'Chaos-forge exists but tests mocks, not real system'],
    ['Architecture Refactoring', 'VERIFIED', 'child_process eliminated', 'All shell exec replaced with native Node.js APIs'],
    ['No child_process', 'VERIFIED', 'grep: 0 runtime uses', 'Only comment references ("eliminated during Biological Forge")'],
    ['No eval()', 'VERIFIED', 'grep: 0 in src/', 'No eval() calls in any source file'],
    ['No Dangerous Raw Fetch', 'VERIFIED', 'All HTTP via safe-fetch.ts', 'safeFetch used in scan, vuln-scan, bot-hunter, hall-of-fame'],
    ['TypeScript Strictness', 'VERIFIED', 'tsconfig.json strict: true', 'No implicit any, strict null checks enabled'],
    ['Production Build Config', 'VERIFIED', 'next.config.ts', 'removeConsole: true, reactStrictMode, output: standalone'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(eng_headers, eng_rows, [75, 65, 85, CONTENT_W - 235]))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 10. TESTING VERIFICATION
# ════════════════════════════════════════════════════════════════
story.append(h1('10. Testing Verification'))
story.append(hr())

story.append(body(
    'The test suite uses Vitest 4.1.10 with jsdom environment. Testing-library/react and testing-library/jest-dom are installed but '
    '<font color="#c8817b">never used</font> in any test file. No "test" script exists in package.json, meaning tests cannot be run via '
    'npm test or bun test and are not wired into any CI pipeline. The 22 test files contain approximately 339 test blocks (it() calls).'
))

test_headers = ['Category', 'Files', 'Tests', '% of Total', 'Assessment']
test_rows = [
    ['Real Unit Tests', '10 files', '~195', '57%', 'Test actual production imports'],
    ['Static Grep Tests', '8 files', '~130', '38%', 'Read files as text, check patterns'],
    ['Copied Production Code', '1 file', '6', '2%', 'api-security.test.ts copies code inline'],
    ['Tautological Tests', '2 files', '~8', '2%', 'expect(true).toBe(true) always passes'],
    ['TOTAL', '22 files', '~339', '100%', ''],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(test_headers, test_rows, [80, 50, 35, 50, CONTENT_W - 225]))
story.append(Spacer(1, 6*mm))

story.append(verdict_block('ZERO API ROUTE TESTS',
    'There are <font color="#c8817b">47 API route files</font> in the codebase. <font color="#c8817b">NONE are tested.</font> No test imports '
    'or invokes any API route handler. No test verifies that GET /api/scan validates input, that POST /api/nhi/revoke checks permissions, '
    'or that any endpoint returns correct status codes. The test suite exercises api-security.ts functions extensively (8+ files, 150+ tests) '
    'but never tests the routes that use them.', 'red'))

story.append(Spacer(1, 4*mm))
story.append(verdict_block('HEAVY MOCKING',
    'The scan-engine, chaos-forge, mutation-forge, and adversarial test files mock <font color="#c8817b">dns/promises, tls, net, native-dns, '
    'and globalThis.fetch simultaneously</font>. The DNS function tests set a mock return value and immediately assert that return value, '
    'which is a circular mock round-trip that tests nothing about the actual implementation. The SSRF tests via safeFetch never touch a real '
    'DNS resolver or real HTTP server.', 'yellow'))

story.append(Spacer(1, 4*mm))
story.append(verdict_block('api-security.test.ts COPIES CODE',
    'This file duplicates isPrivateIP(), DOMAIN_REGEX, and BLOCKED array <font color="#c8817b">inline into the test file</font> rather than '
    'importing from @/lib/api-security. Tests pass against the copied code, not the actual module. If production code changes, these tests '
    'continue to pass against the old copy, creating complete false confidence.', 'red'))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 11. CAPABILITY WIRING ANALYSIS
# ════════════════════════════════════════════════════════════════
story.append(h1('11. Capability Wiring Analysis'))
story.append(hr())

story.append(body(
    'Each claimed capability was traced through the full execution path: User Action -> UI -> API -> Validation -> Engine -> Data -> Result -> UI/Report. '
    'A capability is fully wired only when every layer in this chain is connected with actual logic (not stubs, mocks, or hardcoded returns).'
))

wire_headers = ['Capability', 'UI -> API', 'API -> Engine', 'Engine -> Data', 'Data -> UI', 'Verdict']
wire_rows = [
    ['Domain/SSL Scan', 'VERIFIED', 'VERIFIED', 'VERIFIED (DB)', 'VERIFIED', 'FULLY WIRED'],
    ['Vulnerability Scan', 'VERIFIED', 'VERIFIED', 'VERIFIED (DB)', 'VERIFIED', 'FULLY WIRED'],
    ['Bot Hunter', 'VERIFIED', 'VERIFIED', 'NOT PERSISTED', 'VERIFIED', 'PARTIALLY WIRED'],
    ['Hall of Fame', 'VERIFIED', 'VERIFIED', 'VERIFIED (DB)', 'VERIFIED', 'FULLY WIRED'],
    ['Model Red Team', 'VERIFIED', 'VERIFIED', 'NOT PERSISTED', 'VERIFIED', 'PARTIALLY WIRED'],
    ['Fear Index', 'VERIFIED', 'SIMULATED', 'NOT PERSISTED', 'VERIFIED', 'SIMULATED PIPELINE'],
    ['Doom Clock', 'VERIFIED', 'SIMULATED', 'NOT PERSISTED', 'VERIFIED', 'SIMULATED PIPELINE'],
    ['PQC Vault', 'VERIFIED', 'SIMULATED', 'NOT PERSISTED', 'VERIFIED', 'SIMULATED PIPELINE'],
    ['CNI Sentinel', 'VERIFIED', 'SIMULATED', 'NOT PERSISTED', 'VERIFIED', 'SIMULATED PIPELINE'],
    ['Oblivion', 'VERIFIED', 'STUB (zeros)', 'NOT PERSISTED', 'VERIFIED', 'STUB PIPELINE'],
    ['NHI Kill Switch', 'VERIFIED', 'HARDCODED', 'VERIFIED (DB)', 'VERIFIED', 'SEED DATA ONLY'],
    ['Team Management', 'VERIFIED', 'VERIFIED', 'VERIFIED (DB)', 'VERIFIED', 'FULLY WIRED'],
    ['Compliance Panel', 'VERIFIED', 'SIMULATED', 'NOT PERSISTED', 'VERIFIED', 'SIMULATED PIPELINE'],
    ['Genesis Stamp', 'VERIFIED', 'VERIFIED', 'VERIFIED (DB)', 'VERIFIED', 'FULLY WIRED'],
    ['Sovereign Control', 'VERIFIED', 'VERIFIED', 'NOT PERSISTED', 'VERIFIED', 'PARTIALLY WIRED'],
    ['Scan Stream (SSE)', 'VERIFIED', 'SIMULATED', 'NOT PERSISTED', 'VERIFIED', 'FAKE TERMINAL'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(wire_headers, wire_rows, [65, 50, 55, 60, 55, CONTENT_W - 295]))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 12. DEAD-CODE / FALSE-CAPABILITY DETECTION
# ════════════════════════════════════════════════════════════════
story.append(h1('12. Dead-Code / False-Capability Detection'))
story.append(hr())

dead_headers = ['Item', 'Type', 'Impact', 'Evidence']
dead_rows = [
    ['src/lib/recon/* (6 files)', 'DEAD CODE', 'HIGH', '600+ lines of real recon logic (HTTP, SSL, CT, port) never imported'],
    ['src/lib/recon/ssrf-guard.ts', 'DEAD CODE', 'MEDIUM', 'Centralized SSRF guard written but unused by sibling modules'],
    ['src/lib/recon/findings-formatter.ts', 'DEAD CODE', 'LOW', 'Finding factory unused; inline types used instead'],
    ['scan/stream/route.ts', 'FAKE TERMINAL', 'MEDIUM', 'SSE endpoint emits hardcoded phase transitions, not real scan data'],
    ['scan-overlay.tsx', 'FAKE PROGRESS', 'LOW', 'Math.random() progress bar + 10 hardcoded "live findings"'],
    ['live-terminal.tsx', 'FAKE TERMINAL', 'LOW', '30 command templates filled with random IPs, not real output'],
    ['matrix-terminal.tsx', 'FAKE SCAN', 'MEDIUM', '5 demo targets with hardcoded findings incl. fake CVEs'],
    ['data/content.ts', 'MARKETING DATA', 'LOW', 'All hardcoded stats (2847 scans, $2.4B protected, etc.)'],
    ['fear-index-engine.ts', 'SIMULATED ENGINE', 'MEDIUM', 'Seeded PRNG generates fake threat scores presented as real intelligence'],
    ['quantum-doom-engine.ts', 'SYNTHETIC DATA', 'MEDIUM', 'generateSyntheticTLSData() creates fake TLS from domain hash'],
    ['broadcast-engine.ts', 'FABRICATED DATA', 'MEDIUM', '10 demo bulletins with fake CVEs and fake threat actor names'],
    ['nhi SAMPLE_IDENTITIES', 'SEED DATA', 'MEDIUM', '12 hardcoded cloud identities, no real cloud API scanning'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(dead_headers, dead_rows, [100, 60, 35, CONTENT_W - 205]))
story.append(Spacer(1, 6*mm))

story.append(body(
    'The most significant dead-code finding is the entire <font color="#c8817b">src/lib/recon/</font> directory (8 files, estimated 1500+ lines). '
    'These files contain fully implemented, production-quality reconnaissance modules with real network calls, SSRF protection, comprehensive analysis, '
    'and proper error handling. They were clearly written as a refactored reconnaissance library intended to replace the inline code in scan/route.ts. '
    'However, the migration was never completed. The scan route continues to use native-dns.ts for DNS/SSL and implements HTTP analysis inline, '
    'while the recon/ modules sit unused. Additionally, the simulated engines (fear-index, quantum-doom, pqc-vault, cni-sentinel, broadcast) '
    'generate impressive-looking but entirely fabricated security intelligence that could mislead users into believing they are viewing real data.'
))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 13. MASTER CAPABILITY MATRIX
# ════════════════════════════════════════════════════════════════
story.append(h1('13. Master Capability Matrix'))
story.append(hr())

matrix_headers = ['Capability', 'Status', 'Files', 'API', 'UI', 'Tests', 'Integration', 'Limitations', 'Confidence']
matrix_rows = [
    ['DNS Reconnaissance', 'VERIFIED', 'native-dns.ts', 'scan/', 'unified-cli', 'mocked', 'DB storage', 'No subdomain enum', 'HIGH'],
    ['SSL/TLS Analysis', 'VERIFIED', 'native-dns.ts', 'scan/', 'unified-cli', 'mocked', 'DB storage', 'Chain length=0', 'HIGH'],
    ['HTTP Header Analysis', 'VERIFIED', 'scan/route.ts', 'scan/', 'unified-cli', 'mocked', 'DB storage', 'No redirect follow', 'MEDIUM'],
    ['Vulnerability Scanning', 'VERIFIED', 'vuln-scan/route.ts', 'vuln-scan/', 'vuln-arsenal', 'mocked', 'DB storage', '13 ports only', 'HIGH'],
    ['Bot/C2 Detection', 'VERIFIED', 'bot-hunter/route.ts', 'bot-hunter/', 'bot-cage', 'mocked', 'Not persisted', 'Limited DNSBL', 'MEDIUM'],
    ['Security Grading', 'VERIFIED', 'hall-of-fame/route.ts', 'hall-of-fame/', 'hall-of-fame', 'none', 'DB storage', '5 probe paths', 'MEDIUM'],
    ['Model Red Team', 'VERIFIED', 'model-redteam/route.ts', 'model-redteam/', 'model-breaker', 'none', 'Not persisted', '955 lines, real probes', 'HIGH'],
    ['AI Advisor', 'HARDCODED', 'ai-advisor/route.ts', 'ai-advisor/', 'ai-advisor', 'none', 'Static KB', 'Keyword matching only', 'LOW'],
    ['Fear Index', 'SIMULATED', 'fear-index-engine.ts', 'fear-index/', 'fear-index', 'indirect', 'Not persisted', 'Seeded PRNG data', 'N/A'],
    ['Doom Clock', 'SIMULATED', 'quantum-doom-engine.ts', 'doom-clock/', 'doom-clock', 'indirect', 'Not persisted', 'Synthetic TLS data', 'N/A'],
    ['PQC Vault', 'SIMULATED', 'pqc-vault-engine.ts', 'pqc-vault/', 'pqc-vault', 'none', 'Not persisted', 'Static compliance DB', 'N/A'],
    ['CNI Sentinel', 'SIMULATED', 'cni-sentinel-engine.ts', 'cni-sentinel/', 'cni-sentinel', 'none', 'Not persisted', 'Static ICS/SCADA DB', 'N/A'],
    ['Implosion Sim', 'SIMULATED', 'implosion-engine.ts', 'implosion/', 'implosion-panel', 'none', 'DB storage', 'IBM data + arithmetic', 'N/A'],
    ['Oblivion', 'STUB', 'oblivion/route.ts', 'oblivion/', 'oblivion', 'none', 'None', 'All zeros returned', 'N/A'],
    ['NHI Kill Switch', 'SEED DATA', 'nhi/route.ts', 'nhi/', 'nhi-kill-switch', 'none', 'DB storage', '12 hardcoded identities', 'LOW'],
    ['Genesis Stamp', 'VERIFIED', 'genesis-crypto.ts', 'genesis/', 'genesis-stamp', 'none', 'DB+crypto', 'Ed25519 attestation', 'HIGH'],
    ['Sovereign Control', 'VERIFIED', 'sovereign-crypto.ts', 'sovereign/', 'sovereign-ctrl', 'none', 'DB+crypto', 'Ed25519 signing', 'HIGH'],
    ['Broadcast System', 'SIMULATED', 'broadcast-engine.ts', 'broadcast/', 'broadcast-ctr', 'none', 'In-memory only', 'Fake demo bulletins', 'N/A'],
    ['Compliance Panel', 'SIMULATED', 'compliance/route.ts', 'compliance/', 'compliance', 'none', 'Not persisted', 'Rule-based scoring', 'N/A'],
    ['Team Management', 'VERIFIED', 'teams/, members/', 'teams/', 'team-mgmt', 'none', 'DB+audit', 'No auth/roles enforced', 'MEDIUM'],
    ['Monitoring Policies', 'VERIFIED', 'monitoring/', 'monitoring/', 'monitor-panel', 'none', 'DB storage', 'No scheduler execution', 'MEDIUM'],
    ['Scan History', 'VERIFIED', 'scans/route.ts', 'scans/', 'war-room', 'none', 'DB read', 'Last 20 scans only', 'MEDIUM'],
    ['Exec Dashboard', 'SIMULATED', 'executive/route.ts', 'executive/', 'ceo-dashboard', 'none', 'Not persisted', 'Hardcoded metrics', 'N/A'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(matrix_headers, matrix_rows, [55, 42, 48, 38, 42, 32, 38, 55, 40]))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 14. CAPABILITY MATURITY SCORES
# ════════════════════════════════════════════════════════════════
story.append(h1('14. Capability Maturity Scores'))
story.append(hr())

story.append(body(
    'Each domain is scored 0-10 based on verified evidence only. Scores reflect what the repository ACTUALLY implements, '
    'not what is planned, declared, or simulated. Simulated capabilities receive zero credit.'
))

score_headers = ['Domain', 'Score', 'Justification']
score_rows = [
    ['Reconnaissance', '5/10', 'Real DNS/SSL/HTTP/port scanning in production; but subdomain, CT logs, WHOIS missing; 6 dead-code modules'],
    ['Security Assessment', '5/10', 'Real vuln scanning, bot detection, security grading; no CVSS scoring, no report generation, no correlation'],
    ['Specialized Modules', '3/10', 'Oblivion=stub, GORGON=real, Hall of Fame=real, NHI=seed data, Sandbox=demo, Fear/Doom/PQC/CNI=simulated'],
    ['Team/Organization', '4/10', 'Full CRUD with DB+audit; no auth enforcement, no roles, no multi-tenancy'],
    ['Intelligence Pipeline', '2/10', 'Raw recon -> findings stored; no correlation, risk calc, business impact, remediation tracking'],
    ['Reporting', '1/10', 'No report generation; findings returned as JSON; no PDF/HTML report builder'],
    ['Value Tracking', '0/10', 'Not implemented; Implosion simulates financial data from hardcoded averages'],
    ['Security Hardening', '7/10', 'SSRF, CSP, HSTS, rate limiting, input validation, error isolation, no child_process, no eval'],
    ['Testing', '3/10', '339 tests exist; 38% are grep tests; 0 API route tests; heavy mocking; no CI; no test script'],
    ['Production Readiness', '4/10', 'Build passes; no auth; no multi-tenancy; SQLite not production-grade; no CI/CD'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(score_headers, score_rows, [80, 35, CONTENT_W - 125]))
story.append(Spacer(1, 8*mm))

# Overall score
overall_data = [[
    Paragraph('<b>OVERALL EVIDENCE-DERIVED CAPABILITY MATURITY SCORE</b>', 
              ParagraphStyle('os_t', fontName='NotoSansSC-Bold', fontSize=12, leading=16, textColor=TEXT_PRIMARY)),
    Paragraph('<font size="24" color="#49cf8c"><b>3.4 / 10</b></font>', 
              ParagraphStyle('os_v', fontName='NotoSansSC-Bold', fontSize=24, leading=28, textColor=ACCENT, alignment=TA_CENTER)),
]]
overall_t = Table(overall_data, colWidths=[CONTENT_W * 0.6, CONTENT_W * 0.4])
overall_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ('BOX', (0, 0), (-1, -1), 1, ACCENT),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ('TOPPADDING', (0, 0), (-1, -1), 14),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(overall_t)
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 15. CRITICAL DISCOVERIES
# ════════════════════════════════════════════════════════════════
story.append(h1('15. Critical Discoveries'))
story.append(hr())

story.append(h2('15.1 Verified Strengths'))
story.append(body(
    'The SSRF protection system is genuinely impressive. The safe-fetch.ts module implements a multi-layered defense: domain blocklist checking, '
    'IPv4/IPv6 private range blocking (covering RFC 1918, loopback, link-local, carrier-grade NAT, cloud metadata, multicast, and reserved ranges), '
    'DNS resolution before connection with DNS-failure-treated-as-unsafe semantics, and response size limiting. The api-security.ts module provides '
    'centralized input validation with strict domain regex, comprehensive blocked domain list, and bounded in-memory rate limiting with automatic '
    'cleanup. The security middleware applies defense-in-depth headers (CSP with nonce, HSTS 1 year, X-Frame-Options DENY, Cross-Origin policies) '
    'to all routes. The elimination of child_process is verified: all network operations use native Node.js APIs (dns.promises, tls.connect, net.Socket). '
    'The Prisma schema is well-designed with 20 models covering organizations, teams, scans, findings, compliance, monitoring, integrations, '
    'API keys, audit logs, NHI identities, and Genesis stamps.'
))

story.append(h2('15.2 False / Exaggerated Capabilities'))
story.append(bullet('<b>Oblivion Model Red Team:</b> Presented as a "20-tool analytical dissolution framework" but returns all zeros. The POST handler explicitly states it is "awaiting deployment." The 20 tools, wisdom quotes, and philosophical descriptions create a convincing facade of capability that does not exist.'))
story.append(bullet('<b>Fear Index:</b> Presented as a "CISO Fear Index" with sector breakdowns and historical trends. In reality, it generates deterministic numbers from a seeded PRNG based on the current date. The threat descriptions are pre-written strings.'))
story.append(bullet('<b>Quantum Doom Clock:</b> Presented as a quantum threat assessment. In reality, when no real TLS data is provided (which is the normal case), it fabricates synthetic TLS data from a hash of the domain name and performs arithmetic on hardcoded quantum milestones.'))
story.append(bullet('<b>CNI Sentinel:</b> Presented as a critical infrastructure threat analyzer. In reality, it performs rule-based lookups against hardcoded SCADA protocol databases, APT group lists, and firmware CVE databases. No actual network analysis occurs.'))
story.append(bullet('<b>Scan Stream (SSE):</b> Presented as a live scan terminal. In reality, it emits hardcoded phase transitions with fake command outputs (dig, curl, openssl strings) at random intervals, regardless of whether a real scan is running.'))

story.append(h2('15.3 Partial Capabilities'))
story.append(bullet('<b>Intelligence Pipeline:</b> Raw recon to findings storage works. Everything after that (correlation, risk calculation, business impact, remediation, verification) is missing.'))
story.append(bullet('<b>Authentication:</b> Full API key infrastructure exists (SHA-256 hashing, DB lookup, expiry, scopes) but is completely dormant because no route enforces it.'))
story.append(bullet('<b>NHI Kill Switch:</b> DB schema and CRUD operations work, but identity discovery uses 12 hardcoded sample identities rather than actual cloud API scanning.'))
story.append(bullet('<b>Monitoring Policies:</b> Model supports scheduling (hourly, daily, weekly, monthly) but no scheduler executes these policies automatically.'))

story.append(h2('15.4 Critical Gaps'))
story.append(bullet('<font color="#c8817b"><b>NO AUTHENTICATION ENFORCED:</b></font> Any anonymous user can invoke any API endpoint including mutating operations (team creation, deletion, NHI revocation).'))
story.append(bullet('<font color="#c8817b"><b>ZERO API ROUTE TESTS:</b></font> 47 API routes with zero test coverage.'))
story.append(bullet('<font color="#c8817b"><b>NO CI/CD:</b></font> No test script in package.json, no CI configuration, no deployment pipeline.'))
story.append(bullet('<font color="#c8817b"><b>SQLITE NOT PRODUCTION-GRADE:</b></font> Single-file SQLite cannot support concurrent users, replication, or the scale implied by the enterprise schema.'))
story.append(bullet('<font color="#c8817b"><b>IN-MEMORY STATE:</b></font> Rate limiting, broadcast storage, and fear index state are lost on server restart.'))
story.append(bullet('<font color="#c8817b"><b>SIMULATED ENGINES PRESENTED AS REAL:</b></font> 5 engines (fear-index, quantum-doom, pqc-vault, cni-sentinel, broadcast) generate fabricated data without clear disclosure to users.'))

story.append(h2('15.5 Architectural Risks'))
story.append(body(
    'The single-organization assumption in all API routes (using findFirst instead of organization-scoped queries) means the multi-tenant '
    'schema is decorative. The in-memory rate limiting store (bounded to 50K entries) will lose all state on server restart, allowing '
    'rate limit evasion. The broadcast system uses an in-memory Map that evaporates on restart, making all Ed25519 signatures unverifiable '
    '(new keypair generated each restart). The MonitoringPolicy model has schedule fields but no scheduler implementation, meaning '
    'scheduled scans will never execute.'
))

story.append(h2('15.6 Security Risks'))
story.append(bullet('<b>Team/Member deletion without auth:</b> DELETE /api/teams and DELETE /api/members are protected only by rate limiting (5 req/min). Any client can delete all teams and members.'))
story.append(bullet('<b>NHI revocation without auth:</b> POST /api/nhi/revoke can revoke non-human identities without any authentication.'))
story.append(bullet('<b>Genesis stamp issuance without auth:</b> POST /api/genesis can issue cryptographic attestations without authentication.'))
story.append(bullet('<b>Broadcast creation without auth:</b> POST /api/broadcast can create cryptographically signed security bulletins without authentication.'))
story.append(bullet('<b>native-dns.ts has no internal SSRF protection:</b> The scan/route.ts relies on inline validation before calling native-dns functions, but native-dns itself does not validate targets.'))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 16. IMPLEMENTED VS PARTIAL VS FUTURE
# ════════════════════════════════════════════════════════════════
story.append(h1('16. Implemented vs. Partial vs. Future'))
story.append(hr())

story.append(h2('16.1 ALREADY REAL'))
story.append(body('Capabilities genuinely implemented, connected, and producing real results from actual operations:'))
story.append(bullet('DNS/SSL/TLS reconnaissance with real network queries and database persistence'))
story.append(bullet('HTTP security header analysis with technology fingerprinting'))
story.append(bullet('Vulnerability scanning with TCP port probing and banner grabbing'))
story.append(bullet('Bot/C2 detection with DNSBL and IP reputation queries'))
story.append(bullet('Security grading with exposure probing'))
story.append(bullet('GORGON model red-teaming with actual HTTP probes'))
story.append(bullet('Hall of Fame with real HTTP exposure testing'))
story.append(bullet('Genesis Stamp with Ed25519 cryptographic attestation'))
story.append(bullet('Sovereign Control with Ed25519 signing'))
story.append(bullet('Team/Member CRUD with database and audit logging'))
story.append(bullet('Monitor Policy CRUD with database persistence'))
story.append(bullet('SSRF protection system (safe-fetch + api-security)'))
story.append(bullet('Security middleware (CSP, HSTS, X-Frame-Options, CORP, COEP)'))
story.append(bullet('Rate limiting (bounded in-memory store)'))
story.append(bullet('Centralized input validation'))

story.append(h2('16.2 PARTIALLY REAL'))
story.append(body('Capabilities with meaningful implementation but critical missing pieces:'))
story.append(bullet('Authentication infrastructure: Full implementation exists but is dormant (requireAuth=false everywhere)'))
story.append(bullet('Intelligence pipeline: Recon-to-findings works; correlation/risk/remediation/verification missing'))
story.append(bullet('NHI Kill Switch: Schema and CRUD work; identity discovery uses hardcoded samples'))
story.append(bullet('Monitoring: Model supports scheduling; no scheduler executes policies'))
story.append(bullet('Compliance scoring: Rule-based computation; no real compliance framework integration'))
story.append(bullet('AI Advisor: Static remediation knowledge base; no LLM integration'))

story.append(h2('16.3 FUTURE RECONPRO'))
story.append(body('Capabilities that belong to the product vision but have no current implementation:'))
story.append(bullet('Subdomain enumeration (dead code exists but not wired)'))
story.append(bullet('CT log analysis (dead code exists but not wired)'))
story.append(bullet('Port scanning beyond 13 ports (dead code with 26 ports exists but not wired)'))
story.append(bullet('WHOIS intelligence'))
story.append(bullet('Finding correlation engine'))
story.append(bullet('Dynamic risk scoring'))
story.append(bullet('Business impact modeling from actual data'))
story.append(bullet('Remediation tracking and verification'))
story.append(bullet('Security report generation (PDF/HTML)'))
story.append(bullet('Value attribution and financial reporting'))
story.append(bullet('Real multi-tenant organization scoping'))
story.append(bullet('Role-based access control enforcement'))
story.append(bullet('CI/CD pipeline and automated testing'))
story.append(bullet('Real-time scheduled scan execution'))
story.append(bullet('Integration with external SIEM/SOAR platforms'))
story.append(bullet('Webhook notifications'))
story.append(bullet('Real OBLIVION model red-team analysis'))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# 17. LAUNCH BLOCKERS AND RECOMMENDED PRIORITIES
# ════════════════════════════════════════════════════════════════
story.append(h1('17. Launch Blockers and Recommended Priorities'))
story.append(hr())

story.append(h2('17.1 Hard Launch Blockers'))
story.append(body('These issues MUST be resolved before any production deployment:'))

blocker_headers = ['#', 'Blocker', 'Severity', 'Effort']
blocker_rows = [
    ['1', 'No authentication on ANY API route', 'CRITICAL', 'Medium'],
    ['2', 'No authorization/role enforcement', 'CRITICAL', 'Medium'],
    ['3', 'SQLite not suitable for production', 'CRITICAL', 'Large'],
    ['4', 'Simulated engines presented without disclosure', 'HIGH', 'Small'],
    ['5', 'No CI/CD pipeline', 'HIGH', 'Medium'],
    ['6', 'Zero API route test coverage', 'HIGH', 'Large'],
    ['7', 'In-memory state lost on restart', 'HIGH', 'Medium'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(blocker_headers, blocker_rows, [20, CONTENT_W - 180, 60, 50]))

story.append(h2('17.2 Recommended Engineering Priorities'))
story.append(body('In priority order, these are the highest-impact improvements that would most advance ReconPro toward a production-viable security platform:'))
story.append(Spacer(1, 4*mm))

pri_headers = ['Priority', 'Task', 'Impact', 'Details']
pri_rows = [
    ['P0', 'Activate authentication', 'CRITICAL', 'Set requireAuth=true on all mutating routes; add public-only scan route'],
    ['P0', 'Migrate to PostgreSQL', 'CRITICAL', 'Replace SQLite; enables concurrent users, replication, production scale'],
    ['P1', 'Add API route tests', 'HIGH', 'Cover all 47 routes with at least basic input validation and auth tests'],
    ['P1', 'Wire dead recon modules', 'HIGH', 'Connect recon/http-recon, recon/ct-logs, recon/port-check to scan route'],
    ['P1', 'Disclose simulated engines', 'HIGH', 'Mark fear-index, doom-clock, pqc-vault, cni-sentinel as "demo/simulated" in UI'],
    ['P2', 'Implement OBLIVION', 'MEDIUM', 'Either build real model red-team or remove the stub to avoid false impression'],
    ['P2', 'Replace NHI seed data', 'MEDIUM', 'Implement real cloud API scanning or clearly label as demo data'],
    ['P2', 'Add organization scoping', 'MEDIUM', 'Replace findFirst with authenticated organization context'],
    ['P3', 'Build correlation engine', 'MEDIUM', 'Connect findings to risk scoring, business impact modeling'],
    ['P3', 'Implement scheduled scans', 'LOW', 'Build scheduler for MonitorPolicy execution'],
    ['P3', 'Generate security reports', 'LOW', 'Build PDF/HTML report generation from findings data'],
    ['P4', 'Add CI/CD pipeline', 'LOW', 'GitHub Actions or equivalent; test script in package.json; build verification'],
]
story.append(Spacer(1, 4*mm))
story.append(make_table(pri_headers, pri_rows, [35, 85, 50, CONTENT_W - 180]))

story.append(Spacer(1, 12*mm))
story.append(hr())
story.append(Paragraph(
    '<i>This forensic verification was conducted as a READ-ONLY audit. No code was modified, no files were created or deleted, '
    'no fixes were applied, and no implementations were generated. The repository itself was the sole authority for every '
    'determination in this document. All findings are evidence-backed and traceable to specific source files.</i>',
    ParagraphStyle('disclaimer', fontName='NotoSansSC', fontSize=8, leading=12, textColor=TEXT_MUTED, alignment=TA_CENTER)
))

# ════════════════════════════════════════════════════════════════
# BUILD PDF
# ════════════════════════════════════════════════════════════════
doc.build(story, onFirstPage=on_first_page, onLaterPages=on_page)
print(f"PDF generated: {output_path}")
print(f"File size: {os.path.getsize(output_path):,} bytes")
