#!/usr/bin/env python3
"""ReconPro OPERATION OMEGA FINAL AUDIT REPORT - Simplified"""
import os, sys, hashlib
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak,
    HRFlowable, SimpleDocTemplate
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('DejaVu', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBd', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('DejaVu', normal='DejaVu', bold='DejaVuBd')

# Colors
PAGE_BG    = colors.HexColor('#101211')
CARD_BG    = colors.HexColor('#1e2220')
TABLE_STRIPE= colors.HexColor('#1a1e1c')
HEADER_FILL= colors.HexColor('#293f34')
BORDER     = colors.HexColor('#466053')
ICON       = colors.HexColor('#75bf9a')
ACCENT     = colors.HexColor('#58e09c')
TEXT_P     = colors.HexColor('#e5e8e6')
TEXT_M     = colors.HexColor('#7d8782')
CRIT_C     = colors.HexColor('#ff4444')
HIGH_C     = colors.HexColor('#ff8800')
MED_C      = colors.HexColor('#ffcc00')
LOW_C      = colors.HexColor('#88aacc')
S_OK       = colors.HexColor('#87b998')
S_WARN     = colors.HexColor('#baa375')
S_ERR      = colors.HexColor('#c27b75')

W, H = A4
LM = RM = TM = BM = 20*mm
AW = W - LM - RM
OUT = '/home/z/my-project/download/ReconPro_Omega_Audit_Report.pdf'

# Reusable styles
S_TITLE = ParagraphStyle('T', fontName='DejaVuBd', fontSize=22, leading=28, textColor=ACCENT, spaceAfter=6)
S_H1 = ParagraphStyle('H1', fontName='DejaVuBd', fontSize=16, leading=22, textColor=ACCENT, spaceBefore=14, spaceAfter=6)
S_H2 = ParagraphStyle('H2', fontName='DejaVuBd', fontSize=12, leading=16, textColor=TEXT_P, spaceBefore=10, spaceAfter=4)
S_BD = ParagraphStyle('BD', fontName='DejaVu', fontSize=9, leading=13, textColor=TEXT_P, spaceAfter=5)
S_SM = ParagraphStyle('SM', fontName='DejaVu', fontSize=8, leading=11, textColor=TEXT_M, spaceAfter=3)
S_MONO = ParagraphStyle('MO', fontName='DejaVu', fontSize=7.5, leading=10, textColor=TEXT_M, spaceAfter=3)
S_VERD = ParagraphStyle('VD', fontName='DejaVuBd', fontSize=26, leading=32, textColor=S_ERR, alignment=1, spaceBefore=16, spaceAfter=16)
S_TH = ParagraphStyle('TH', fontName='DejaVuBd', fontSize=7.5, leading=10, textColor=colors.white)
S_TD = ParagraphStyle('TD', fontName='DejaVu', fontSize=7.5, leading=10, textColor=TEXT_P)
S_ACR = ParagraphStyle('ACR', fontName='DejaVu', fontSize=7.5, leading=10, textColor=TEXT_P, alignment=1)
S_ACRB = ParagraphStyle('ACRB', fontName='DejaVuBd', fontSize=7.5, leading=10, textColor=TEXT_P, alignment=1)
S_BADGE_C = ParagraphStyle('BC', fontName='DejaVuBd', fontSize=7, textColor=colors.white, backColor=CRIT_C, borderPadding=(1,4,1,4))
S_BADGE_H = ParagraphStyle('BH', fontName='DejaVuBd', fontSize=7, textColor=colors.white, backColor=HIGH_C, borderPadding=(1,4,1,4))
S_BADGE_M = ParagraphStyle('BM', fontName='DejaVuBd', fontSize=7, textColor=colors.white, backColor=MED_C, borderPadding=(1,4,1,4))
S_BADGE_L = ParagraphStyle('BL', fontName='DejaVuBd', fontSize=7, textColor=colors.white, backColor=LOW_C, borderPadding=(1,4,1,4))
S_TOC0 = ParagraphStyle('T0', fontName='DejaVuBd', fontSize=10, leading=15, textColor=ACCENT, leftIndent=0, spaceBefore=5)
S_TOC1 = ParagraphStyle('T1', fontName='DejaVu', fontSize=9, leading=13, textColor=TEXT_P, leftIndent=18, spaceBefore=2)
S_COV = ParagraphStyle('CV', fontName='DejaVuBd', fontSize=11, leading=14, textColor=TEXT_P, alignment=1)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6, spaceBefore=3)

def tbl(headers, rows, widths=None):
    if widths is None:
        widths = [AW / len(headers)] * len(headers)
    hdr = [Paragraph(h, S_TH) for h in headers]
    data = [hdr]
    for r in rows:
        data.append([Paragraph(str(c), S_TD) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE if i % 2 == 0 else CARD_BG))
    t.setStyle(TableStyle(cmds))
    return t

def badge(sev):
    m = {'CRITICAL': S_BADGE_C, 'HIGH': S_BADGE_H, 'MEDIUM': S_BADGE_M, 'LOW': S_BADGE_L}
    return Paragraph(sev, m.get(sev, S_BADGE_L))

class TocDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            self.notify('TOCEntry', (getattr(flowable, 'bookmark_level', 0), getattr(flowable, 'bookmark_text', ''), self.page, getattr(flowable, 'bookmark_key', '')))

def heading(text, style, level=0):
    p = Paragraph(text, style)
    p.bookmark_name = text.replace('<b>', '').replace('</b>', '')
    p.bookmark_level = level
    p.bookmark_text = text.replace('<b>', '').replace('</b>', '')
    p.bookmark_key = ''
    return p

def build():
    story = []

    # === COVER ===
    story.append(Spacer(1, 55*mm))
    story.append(Paragraph('OPERATION OMEGA', S_TITLE))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('FINAL SWARM CERTIFICATION AUDIT', S_COV))
    story.append(Spacer(1, 6*mm))
    story.append(hr())
    story.append(Paragraph('ReconPro Enterprise Reconnaissance Platform', S_ACRB))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(f'Audit Date: {datetime.now().strftime("%B %d, %Y")}', S_SM))
    story.append(Paragraph('Version: 0.2.0', S_SM))
    story.append(Paragraph('Auditor: Independent Swarm (12 Agents)', S_SM))
    story.append(Paragraph('Protocol: Zero Trust Certification', S_SM))
    story.append(Spacer(1, 25*mm))
    story.append(hr())
    story.append(Spacer(1, 6*mm))

    vd = Table([[Paragraph('<b>FINAL VERDICT</b>', S_SM)], [Paragraph('NOT READY FOR LAUNCH', S_VERD)]],
            colWidths=[AW])
    vd.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG), ('BOX', (0, 0), (-1, -1), 2, S_ERR),
        ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(vd)
    story.append(Spacer(1, 15*mm))
    story.append(Paragraph('CONFIDENTIAL - Evidence-Based Security Assessment', S_SM))
    story.append(PageBreak())

    # === TOC ===
    story.append(Paragraph('Table of Contents', S_H1))
    toc = TableOfContents()
    toc.levelStyles = [S_TOC0, S_TOC1]
    story.append(toc)
    story.append(PageBreak())

    # === 1. EXECUTIVE SUMMARY ===
    story.append(heading('<b>1. Executive Summary</b>', S_H1, 0))
    story.append(Paragraph(
        'This report presents the findings of OPERATION OMEGA, a comprehensive independent audit of the '
        'ReconPro Enterprise Reconnaissance Platform (v0.2.0). The audit was conducted by 12 specialized '
        'engineering agents working independently under a strict Zero Trust protocol. Every finding is '
        'backed by direct source code evidence, not marketing claims or prior summaries. The platform '
        'suffers from critical security vulnerabilities, broken authentication, complete multi-tenancy '
        'data leakage, and a production build that does not compile. The evidence overwhelmingly '
        'demonstrates that ReconPro is NOT READY for production launch.', S_BD))
    story.append(Paragraph(
        'ReconPro is a Next.js 16 application with TypeScript, Prisma ORM, SQLite, and Tailwind CSS. '
        'It comprises 56 API routes, 21 Prisma database models, 26 page routes, and approximately '
        '50,000 lines of TypeScript. Despite its ambitions, the platform cannot be deployed to any '
        'environment in its current state.', S_BD))

    story.append(heading('<b>Overall Production Readiness Score</b>', S_H2, 1))
    story.append(tbl(
        ['Category', 'Score', 'Rating'],
        [['Architecture', '4.2/10', 'BLOCKED'],
         ['Security', '1.5/10', 'BLOCKED'],
         ['Backend APIs', '5.0/10', 'BLOCKED'],
         ['Frontend/UX', '6.0/10', 'PARTIAL'],
         ['Database', '2.5/10', 'BLOCKED'],
         ['Performance', '4.0/10', 'BLOCKED'],
         ['Deployment', '2.0/10', 'BLOCKED'],
         ['Scanner Engine', '9.5/10', 'READY'],
         ['Product Accuracy', '5.0/10', 'PARTIAL']],
        [AW*0.4, AW*0.3, AW*0.3]))

    story.append(Spacer(1, 4*mm))
    story.append(heading('<b>Finding Summary</b>', S_H2, 1))
    story.append(tbl(
        ['Severity', 'Count', 'Launch Impact'],
        [[badge('CRITICAL'), Paragraph('15', S_ACR), Paragraph('Blocks all deployment', S_ACR)],
         [badge('HIGH'), Paragraph('22', S_ACR), Paragraph('Must fix before beta', S_ACR)],
         [badge('MEDIUM'), Paragraph('25', S_ACR), Paragraph('Should fix pre-launch', S_ACR)],
         [badge('LOW'), Paragraph('12', S_ACR), Paragraph('Technical debt', S_ACR)]],
        [AW*0.2, AW*0.15, AW*0.65]))
    story.append(PageBreak())

    # === 2. CRITICAL FINDINGS ===
    story.append(heading('<b>2. Critical Findings (15 Total)</b>', S_H1, 0))
    story.append(Paragraph(
        'Each finding is backed by direct source code evidence with file paths and line numbers. '
        'These are not theoretical concerns; they are verified vulnerabilities exploitable with trivial effort.', S_BD))

    crits = [
        ['VULN-01', 'Authentication Bypass - Static Cookie',
         'middleware.ts:20, login/page.tsx:57',
         'Cookie "reconpro_auth" value is static "authenticated". Middleware checks only presence. '
         'Anyone can bypass all dashboard auth: document.cookie="reconpro_auth=1".'],
        ['VULN-02', 'Unsalted SHA-256 Password Hashing',
         'auth/register:82-85, auth/login:58-62',
         'Plain SHA-256, no salt, no iterations. GPU cracking at 10B hashes/sec. '
         'All identical passwords produce identical hashes.'],
        ['VULN-03', 'Unauthenticated Host Reconnaissance',
         'api/system/scan/route.ts:1-73',
         'NO auth, NO rate limit. Exposes processes, network interfaces, env var names, '
         'SSH config, firewall rules, log contents.'],
        ['VULN-04', 'Dev-Mode Auth Bypass',
         'api-protection.ts:198-206',
         'DB errors silently bypass auth when NODE_ENV != production. '
         'Staging environments have zero effective auth.'],
        ['VULN-05', 'Unauthenticated Scan Proxy',
         'api/scan/stream/route.ts:52-55',
         'GET endpoint runs full recon (DNS, SSL, port, HTTP) on any domain '
         'without auth. Server abused as anonymized scanning proxy.'],
        ['VULN-06', 'Complete Multi-Tenancy Data Leak',
         'scans, dashboard, reports, audit, executive routes',
         'Zero routes filter by organizationId. Any user reads all organizations\' '
         'scans, findings, compliance scores. GDPR violation.'],
        ['VULN-07', 'SSRF via HTTP Redirect',
         'safe-fetch.ts:212-214',
         'safeFetch validates initial URL only. Redirect to 169.254.169.254 '
         'bypasses all SSRF protection when followRedirects=true.'],
        ['VULN-08', 'Login Destroys All API Keys',
         'auth/login/route.ts:96-112',
         'Every login deactivates ALL active API keys. Breaks all existing '
         'integrations and webhooks. No persistent sessions.'],
        ['BUILD-01', 'TypeScript Compilation Fails',
         'reports/route.ts:180,186',
         '3 TS errors prevent build. ES2017 target too low for regex dotAll flag '
         'and type mismatch in scan route.'],
        ['BUILD-02', 'Production Build Fails',
         'next.config.ts + tsconfig.json',
         'npm run build fails. No production artifact can be created. '
         'ignoreBuildErrors=false prevents broken deployment.'],
        ['QA-01', 'Scan Results Never Render',
         'scans/page.tsx:46-65',
         'API returns data.scan but client accesses data directly. Every scan shows '
         '0 findings, 0 risk score. Core feature completely broken.'],
        ['QA-02', 'Compliance Uses Wrong Org ID',
         'compliance/route.ts:357',
         'ScanTarget FK stored as organizationId. Tenant isolation corrupted '
         'for all compliance records.'],
        ['DB-01', 'Zero Database Indexes',
         'schema.prisma (entire file)',
         'Not a single @@index directive. All queries are full table scans. '
         'Degradation is linear with data growth.'],
        ['DB-02', 'Scan/Finding Lack organizationId',
         'schema.prisma:94-131',
         'Cannot filter by tenant without 2-table join through ScanTarget '
         '(which itself has nullable organizationId).'],
        ['PERF-01', 'Synchronous 20-60s Scan',
         'scan/route.ts:1100-1257',
         'Full scan blocks API worker for 20-60+ seconds. No async queue. '
         'Causes timeouts and resource exhaustion.'],
    ]
    for f in crits:
        story.append(heading(f'<b>{f[0]}: {f[1]}</b>', S_H2, 1))
        story.append(Paragraph(f'<b>Location:</b> {f[2]}', S_SM))
        story.append(Paragraph(f'<b>Evidence:</b> {f[3]}', S_BD))
    story.append(PageBreak())

    # === 3. HIGH SEVERITY FINDINGS ===
    story.append(heading('<b>3. High Severity Findings (22 Total)</b>', S_H1, 0))
    highs = [
        ['H-01', 'Timing Attack on Password Compare', 'auth/login:63', 'Uses !== instead of timingSafeEqual'],
        ['H-02', 'API Key in Response Body', 'auth/login:151', 'Full key in JSON, logged by proxies'],
        ['H-03', 'No Tenant Isolation on Scans', 'scan/route.ts:1124', 'No organizationId filter'],
        ['H-04', 'Unauthenticated Scans Listing', 'scans/route.ts:6', 'All scans returned, no auth'],
        ['H-05', 'Dead SSRF Guard Module', 'ssrf-guard.ts', 'Canonical guard exists but never imported'],
        ['H-06', 'In-Memory Rate Limiting', 'api-security.ts:183', 'Per-process Map, bypassable with N instances'],
        ['H-07', 'SQLite as Production DB', 'schema.prisma:7', 'Single-writer, no concurrent writes'],
        ['H-08', 'No Cascade Rules', 'schema.prisma (all)', 'Zero onDelete/onUpdate defined'],
        ['H-09', 'Stale Auth Headers Hook', 'use-auth-headers.ts:11', 'Empty useMemo deps never re-reads localStorage'],
        ['H-10', 'Missing useEffect Deps', 'findings/page.tsx:43', 'Empty deps cause stale data fetch'],
        ['H-11', 'Contact Form Non-Functional', 'contact-client.tsx:13', 'Only sets submitted=true'],
        ['H-12', 'Forgot Password Not Implemented', 'forgot-password:65', 'API succeeds, sends no email'],
        ['H-13', 'Compliance Uses All History', 'compliance:280', 'No scanId loads ALL findings'],
        ['H-14', 'Settings Save Always Fails', 'settings/page.tsx:62', 'Missing id in PATCH body'],
        ['H-15', 'Settings Loads Wrong Profile', 'settings/page.tsx:43', 'Takes members[0] not current user'],
        ['H-16', 'Cross-Tenant Audit Leak', 'integrations/route.ts:103', 'No org filter on activity log'],
        ['H-17', 'No Role-Based Authorization', 'members/route.ts:155', 'Viewer can promote self to owner'],
        ['H-18', 'No Password Complexity', 'auth/register:40', 'Only length >= 8 checked'],
        ['H-19', 'DNS Rebinding SSRF', 'scan/route.ts:1113', 'IP checked at T1, scan at T2+'],
        ['H-20', 'NHI Hardcodes org_default', 'nhi/route.ts:6', 'Cross-tenant fallback'],
        ['H-21', 'Duplicate ScanTarget IDs', 'vuln-scan/route.ts:895', 'Domain-as-ID conflicts with CUID'],
        ['H-22', 'No Deployment Mechanism', 'project root', 'No Dockerfile, no CI/CD for Next.js'],
    ]
    story.append(tbl(
        ['ID', 'Finding', 'Location', 'Description'],
        highs,
        [AW*0.08, AW*0.22, AW*0.28, AW*0.42]))
    story.append(PageBreak())

    # === 4. API ROUTE INVENTORY ===
    story.append(heading('<b>4. API Route Inventory (56 Routes)</b>', S_H1, 0))
    story.append(tbl(
        ['Category', 'Count', '%', 'Details'],
        [['REAL (Fully Implemented)', '28', '50%', 'scan, auth, dashboard, compliance, monitoring, teams, members, integrations, reports, genesis/*, implosion, nhi/*, hall-of-fame, bot-hunter'],
         ['PARTIAL', '11', '20%', 'forgot-password, nhi, nhi/seed, ai-advisor, broadcast/*, sovereign, cni-sentinel, doom-clock, pqc-vault'],
         ['MOCK/PLACEHOLDER', '12', '21%', 'ai-leaderboard, cognitive-dread, exposed-assets, wall-of-shame, fear-index/*, oblivion, sandbox, model-redteam'],
         ['EMPTY/STUB', '1', '2%', 'api/ (root returns "Hello, world")'],
         ['UNAUTHENTICATED', '36', '64%', 'Most GET routes have requireAuth:false'],
         ['WITH AUTH + ORG FILTER', '8', '14%', 'Only monitoring, teams, members, integrations']],
        [AW*0.2, AW*0.1, AW*0.1, AW*0.6]))
    story.append(Paragraph(
        'Only 14% of API routes properly enforce both authentication AND organization-level data isolation. '
        'The remaining 86% either lack authentication or fail to filter data by organizationId, '
        'enabling cross-tenant data access.', S_BD))
    story.append(PageBreak())

    # === 5. SCANNER VERIFICATION ===
    story.append(heading('<b>5. Scanner Verification (16/16 Implemented)</b>', S_H1, 0))
    story.append(Paragraph(
        'All 16 scanner modules were inspected. Every scanner uses real network operations '
        '(DNS queries, TLS handshakes, TCP connects, HTTP requests) and produces real findings '
        'persisted to the database. This is the strongest aspect of the codebase.', S_BD))
    story.append(tbl(
        ['Module', 'Scanner', 'Tech'],
        [['dns-recon.ts', 'DNS Enumeration', 'dns/promises, 3 servers, 7 record types'],
         ['ssl-recon.ts', 'SSL/TLS Analysis', 'TLS handshake, cipher/protocol analysis'],
         ['http-recon.ts', 'HTTP Header Analysis', 'Real HTTP, 30+ tech fingerprints'],
         ['port-check.ts', 'Port Scanner', 'TCP connect to 27 ports'],
         ['whois-recon.ts', 'WHOIS Intelligence', 'RDAP HTTPS + TCP WHOIS fallback'],
         ['subdomain-recon.ts', 'Subdomain Discovery', 'DNS perm + crt.sh CT logs'],
         ['directory-recon.ts', 'Directory Enumeration', 'HEAD requests to 80 paths'],
         ['email-recon.ts', 'Email Intelligence', 'MX + SMTP VRFY + SPF/DMARC'],
         ['cert-recon.ts', 'Certificate Analysis', 'CT logs API + TLS cert parsing'],
         ['geo-recon.ts', 'Geolocation Mapping', 'DNS + ip-api.com + reverse DNS'],
         ['network-recon.ts', 'Network Interface', 'os.networkInterfaces() + DNS'],
         ['process-recon.ts', 'Process Analyzer', 'execSync(ps aux) + env scanning'],
         ['file-recon.ts', 'File System', 'fs module, 18 paths, regex secrets'],
         ['log-recon.ts', 'Log Analyzer', 'fs reads /var/log/*, pattern matching'],
         ['registry-recon.ts', 'Registry/Config', 'Reads /etc/* + ufw/iptables'],
         ['ct-logs.ts', 'Certificate Transparency', 'crt.sh API queries']],
        [AW*0.22, AW*0.22, AW*0.56]))
    story.append(Paragraph(
        '<b>Scanner Engine Score: 9.5/10</b> - All 16 modules use native Node.js APIs with '
        'proper SSRF protection, timeout handling, and result persistence. Production-quality code.', S_BD))
    story.append(PageBreak())

    # === 6. SECURITY MATRIX ===
    story.append(heading('<b>6. Security Certification Matrix (OWASP Top 10)</b>', S_H1, 0))
    story.append(tbl(
        ['OWASP Category', 'Severity', 'Summary'],
        [['A01: Broken Access Control', badge('CRITICAL'), 'No tenant isolation, unauthenticated data, cookie bypass'],
         ['A02: Cryptographic Failures', badge('CRITICAL'), 'Unsalted SHA-256 passwords, API keys without HMAC'],
         ['A03: Injection', badge('LOW'), 'No command injection found (native APIs), ReDoS risk'],
         ['A04: Insecure Design', badge('HIGH'), 'Session is security theater, no /api/me endpoint'],
         ['A05: Security Misconfiguration', badge('HIGH'), 'Dev-mode bypass, deprecated middleware'],
         ['A06: Vulnerable Components', badge('MEDIUM'), 'No known CVEs; prisma in prod deps'],
         ['A07: Auth Failures', badge('CRITICAL'), 'Static cookie, timing attack, no brute-force protection'],
         ['A08: Data Integrity', badge('MEDIUM'), 'No audit logging on auth events'],
         ['A09: Logging Failures', badge('MEDIUM'), 'Auth events to console.error only'],
         ['A10: SSRF', badge('HIGH'), 'Redirect bypass, DNS rebinding, dead ssrf-guard']],
        [AW*0.35, AW*0.15, AW*0.5]))
    story.append(PageBreak())

    # === 7. FEATURE MATRIX ===
    story.append(heading('<b>7. Feature Matrix (Claims vs Reality)</b>', S_H1, 0))
    story.append(tbl(
        ['Claimed Feature', 'Status', 'Evidence'],
        [['16 Scanner Modules', 'Fully Implemented', 'All 16 use real network operations'],
         ['PDF Report Generation', 'MISSING', 'Only JSON/HTML/Markdown. No PDF code exists'],
         ['Real-time Monitoring', 'Partial', 'CRUD exists, no background scheduler'],
         ['Team Management', 'Fully Implemented', 'Full CRUD at /api/members and /api/teams'],
         ['Compliance Frameworks', 'Simulated', 'Algorithmic estimation, not real audits'],
         ['CLI Tool', 'Marketing Only', 'Terminal demo is hardcoded animation'],
         ['Integrations (Slack, Jira)', 'Marketing Only', 'Zero integration code exists'],
         ['55 API Endpoints', 'Approximate', '56 routes exist, 66 documented'],
         ['5 Implemented Scanners', 'FALSE', 'Header says 5 but ALL 16 show implemented']],
        [AW*0.25, AW*0.12, AW*0.63]))
    story.append(PageBreak())

    # === 8. PERFORMANCE ===
    story.append(heading('<b>8. Performance Review</b>', S_H1, 0))
    story.append(tbl(
        ['Issue', 'Severity', 'Impact'],
        [['Zero Database Indexes', badge('CRITICAL'), 'All queries are full table scans'],
         ['Sequential Finding Inserts', badge('CRITICAL'), '50-100+ individual INSERTs per scan'],
         ['Sequential Dashboard Queries', badge('HIGH'), '10 sequential DB round-trips'],
         ['Sequential Vuln-Scan Ports', badge('CRITICAL'), '22 ports probed sequentially (132s)'],
         ['Synchronous 20-60s Scan', badge('CRITICAL'), 'API route blocked entire duration'],
         ['No SSR on Landing Page', badge('HIGH'), 'All sections ssr:false, blank page'],
         ['Prisma in Production Deps', badge('HIGH'), '~10-15MB unnecessary code shipped'],
         ['N+1 Monitoring Queries', badge('MEDIUM'), 'One DB query per policy']],
        [AW*0.35, AW*0.12, AW*0.53]))
    story.append(PageBreak())

    # === 9. DEPLOYMENT ===
    story.append(heading('<b>9. Deployment Readiness</b>', S_H1, 0))
    story.append(tbl(
        ['Check', 'Status', 'Details'],
        [['TypeScript Compilation', 'FAIL', '3 errors: ES2017 target, type mismatch'],
         ['ESLint', 'PASS', 'Clean pass (30+ rules disabled)'],
         ['Production Build', 'FAIL', 'Fails on TS errors'],
         ['Prisma Schema', 'PASS', 'Validates successfully'],
         ['Prisma Client', 'PASS', 'Generated successfully'],
         ['Dockerfile', 'MISSING', 'No Dockerfile for Next.js app'],
         ['CI/CD Pipeline', 'MISSING', 'No GitHub Actions'],
         ['Environment Docs', 'FAIL', 'No .env.example'],
         ['Middleware Deprecation', 'WARNING', 'Next.js 16 deprecates middleware']],
        [AW*0.25, AW*0.12, AW*0.63]))
    story.append(PageBreak())

    # === 10. LAUNCH CHECKLIST ===
    story.append(heading('<b>10. Launch Checklist</b>', S_H1, 0))
    story.append(tbl(
        ['Category', 'Rating', 'Explanation'],
        [['Authentication', 'BLOCKED', 'Static cookie bypass, SHA-256 passwords, no sessions'],
         ['Authorization', 'BLOCKED', 'Zero tenant isolation across all data routes'],
         ['Database', 'BLOCKED', 'No indexes, no cascades, SQLite single-writer'],
         ['API Layer', 'BLOCKED', '64% unauthenticated, scan results broken'],
         ['Frontend', 'PARTIAL', 'Real data fetch but stale auth, broken settings'],
         ['Scanner Engine', 'READY', 'All 16 scanners real and operational'],
         ['Monitoring', 'PARTIAL', 'CRUD works but no background scheduler'],
         ['Compliance', 'BLOCKED', 'Wrong org ID, accumulates history'],
         ['Reporting', 'PARTIAL', '3 formats work, PDF missing, no auth'],
         ['Dashboard', 'PARTIAL', 'Fetches real data, scans never render'],
         ['Deployment', 'BLOCKED', 'Build fails, no Docker, no CI/CD'],
         ['Performance', 'BLOCKED', 'Zero indexes, sequential ops, 60s scans'],
         ['Security', 'BLOCKED', '15 critical vulns, 5 OWASP critical'],
         ['Documentation', 'PARTIAL', 'API overview honest, marketing contradicts']],
        [AW*0.15, AW*0.12, AW*0.73]))
    story.append(PageBreak())

    # === 11. TOP 10 REQUIRED FIXES ===
    story.append(heading('<b>11. Top 10 Required Fixes (Priority Order)</b>', S_H1, 0))
    story.append(tbl(
        ['ID', 'Fix', 'Severity', 'Effort', 'Details'],
        [['FIX-01', 'Fix tsconfig target ES2018', badge('CRITICAL'), '2m',
          'Change target to ES2018 in tsconfig.json'],
         ['FIX-02', 'Fix type mismatch', badge('CRITICAL'), '5m',
          'Change Finding evidence to string | null'],
         ['FIX-03', 'Real session management', badge('CRITICAL'), '4h',
          'HttpOnly Secure cookie with random token in DB'],
         ['FIX-04', 'Replace SHA-256 with bcrypt', badge('CRITICAL'), '2h',
          'bcrypt.hash(password, 12) for reg, compare for login'],
         ['FIX-05', 'Add orgId to all queries', badge('CRITICAL'), '1d',
          'Filter every query by auth.organizationId'],
         ['FIX-06', 'Add requireAuth to data routes', badge('CRITICAL'), '2h',
          'Set requireAuth:true on 10+ unauthenticated routes'],
         ['FIX-07', 'Secure system/scan endpoint', badge('CRITICAL'), '5m',
          'Add requireAuth + rate limiting'],
         ['FIX-08', 'Add auth to scan/stream', badge('HIGH'), '5m',
          'Add requireAuth:true to protection call'],
         ['FIX-09', 'Add database indexes', badge('HIGH'), '2h',
          '@@index on all FK and queried columns'],
         ['FIX-10', 'Fix scan results rendering', badge('HIGH'), '30m',
          'Destructure data.scan in scans/page.tsx']],
        [AW*0.06, AW*0.18, AW*0.1, AW*0.06, AW*0.6]))
    story.append(PageBreak())

    # === 12-14: Architecture, DB, Contradictions ===
    story.append(heading('<b>12-14. Architecture, Database, Contradictions</b>', S_H1, 0))
    story.append(Paragraph(
        '<b>Architecture Score: 4.2/10</b> - Clean route groups, proper scanner engine structure, '
        'no circular imports. Critical flaws: 1,256-line God route, no service layer, 7 fantasy engine '
        'modules (5,226 lines), 41 dead archive components (30K lines), in-memory state breaks '
        'horizontal scaling.', S_BD))
    story.append(Paragraph(
        '<b>Database Score: 2.5/10</b> - 21 models with appropriate relations. Critical flaws: zero '
        'indexes, zero cascade rules, Scan/Finding lack organizationId, nullable ScanTarget.orgId, '
        'no migration history, sequential finding inserts. SQLite single-writer prevents '
        'concurrent operations.', S_BD))
    story.append(Paragraph(
        '<b>Contradictions Resolved:</b> The previous summary claimed "only 1 API route exists" '
        '- FALSE. 56 route files exist, 28 fully implemented. It claimed "auth sends wrong field '
        'names" - FALSE. Fields match. It claimed "5 scanners implemented" - FALSE. All 16 are '
        'fully implemented.', S_BD))
    story.append(PageBreak())

    # === 15. ROADMAP ===
    story.append(heading('<b>15. Recommended Roadmap</b>', S_H1, 0))
    story.append(heading('<b>Phase 1: Critical Fixes (Week 1)</b>', S_H2, 1))
    story.append(Paragraph(
        'Fix TypeScript build errors, implement real session management, replace SHA-256 with bcrypt, '
        'add organizationId filtering to all routes, add requireAuth to data endpoints, '
        'secure/remove system/scan endpoint, fix scan results rendering.', S_BD))
    story.append(heading('<b>Phase 2: Security Hardening (Weeks 2-3)</b>', S_H2, 1))
    story.append(Paragraph(
        'Add database indexes, implement cascade rules, fix compliance orgId corruption, add '
        'role-based authorization, integrate SSRF guard, add brute-force protection, '
        'create Dockerfile and CI/CD pipeline.', S_BD))
    story.append(heading('<b>Phase 3: Production Readiness (Weeks 4-6)</b>', S_H2, 1))
    story.append(Paragraph(
        'Migrate SQLite to PostgreSQL, extract scan logic from God routes, implement async scan '
        'queue, parallelize DB queries, enable SSR, implement /api/me, remove fantasy '
        'endpoints, implement PDF reports, add password reset, batch inserts.', S_BD))
    story.append(heading('<b>Phase 4: Scale (Weeks 7-10)</b>', S_H2, 1))
    story.append(Paragraph(
        'Redis rate limiting, TypeScript API client, delete archive components, implement real '
        'integrations or remove claims, background monitoring scheduler, migrate middleware '
        'to Next.js 16 proxy, WebSocket notifications, integration/e2e tests.', S_BD))
    story.append(PageBreak())

    # === FINAL VERDICT ===
    story.append(Spacer(1, 35*mm))
    story.append(hr())
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph('FINAL CERTIFICATION', S_TITLE))
    story.append(Spacer(1, 6*mm))

    vf = Table([[Paragraph('NOT READY FOR LAUNCH', S_VERD)]], colWidths=[AW])
    vf.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG), ('BOX', (0, 0), (-1, -1), 3, S_ERR),
        ('TOPPADDING', (0, 0), (-1, -1), 14), ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(vf)
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(
        'ReconPro v0.2.0 contains 15 critical vulnerabilities, a broken production build, complete '
        'multi-tenancy data leakage, and a fundamentally broken authentication system. Despite '
        'having an excellent scanner engine (9.5/10), the platform is NOT suitable for any form of '
        'production deployment. Minimum effort to reach closed beta: 4-6 weeks.', S_BD))
    story.append(Spacer(1, 8*mm))
    story.append(hr())
    story.append(Paragraph(
        f'Report: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")} | '
        'OPERATION OMEGA SWARM CERTIFICATION | '
        '12 independent specialists | Zero Trust, Evidence Only',
        S_SM))

    # Build
    doc = TocDoc(OUT, pagesize=A4, leftMargin=LM, rightMargin=RM,
                 topMargin=TM, bottomMargin=BM,
                 title='ReconPro OMEGA Audit Report',
                 author='Independent Swarm Certification',
                 subject='Production Readiness Audit')
    doc.multiBuild(story)
    print(f'Report generated: {OUT}')

if __name__ == '__main__':
    build()
