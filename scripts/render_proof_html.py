#!/usr/bin/env python3
"""Convert the captured ANSI terminal output to a styled HTML proof document."""
import html
import re
from pathlib import Path

ANSI_FILE = '/home/z/my-project/download/reconpro_unified_gemini_terminal.ansi'
HTML_FILE = '/home/z/my-project/download/reconpro_unified_gemini_proof.html'

raw = Path(ANSI_FILE).read_text(errors='replace')

# Strip ANSI escape sequences but preserve structure
# Convert basic ANSI colors to spans
ansi_to_css = {
    '30': 'color:#444', '31': 'color:#e06c75', '32': 'color:#98c379',
    '33': 'color:#e5c07b', '34': 'color:#61afef', '35': 'color:#c678dd',
    '36': 'color:#56b6c2', '37': 'color:#abb2bf',
    '90': 'color:#5c6370', '91': 'color:#ff6b6b', '92': 'color:#7ec699',
    '93': 'color:#f0c674', '94': 'color:#80a0ff', '95': 'color:#d8a0ff',
    '96': 'color:#8cc8ff', '97': 'color:#ffffff',
    '1': 'font-weight:bold', '2': 'opacity:0.6', '3': 'font-style:italic',
    '4': 'text-decoration:underline',
}

def ansi_to_html(text):
    # Remove control sequences except colors
    text = re.sub(r'\x1b\[\d*[A-Z]', '', text)  # cursor moves
    text = re.sub(r'\x1b\[\?25[lh]', '', text)  # hide/show cursor
    text = re.sub(r'\x1b\[\d*[JK]', '', text)  # erase line/screen
    text = re.sub(r'\x1b\[\d*;?\d*[Hf]', '', text)  # cursor position
    # Now process SGR (color) sequences
    out = []
    i = 0
    current_styles = []
    while i < len(text):
        if text[i] == '\x1b' and i + 1 < len(text) and text[i+1] == '[':
            j = i + 2
            while j < len(text) and text[j] not in 'm':
                j += 1
            if j < len(text):
                codes = text[i+2:j].split(';')
                if '0' in codes or codes == ['']:
                    if current_styles:
                        out.append('</span>')
                        current_styles = []
                else:
                    new_styles = []
                    for c in codes:
                        if c in ansi_to_css:
                            new_styles.append(ansi_to_css[c])
                    if new_styles:
                        if current_styles:
                            out.append('</span>')
                        out.append(f'<span style="{";".join(new_styles)}">')
                        current_styles = new_styles
                i = j + 1
                continue
        # escape HTML
        ch = text[i]
        if ch == '<': out.append('&lt;')
        elif ch == '>': out.append('&gt;')
        elif ch == '&': out.append('&amp;')
        else: out.append(ch)
        i += 1
    if current_styles:
        out.append('</span>')
    return ''.join(out)

content = ansi_to_html(raw)

# Build the HTML page
html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ReconPro UNIFIED — Gemini Proof</title>
<style>
  body {{
    background: #0d1117;
    color: #c9d1d9;
    font-family: 'JetBrains Mono', 'SF Mono', 'Geist Mono', Menlo, Consolas, monospace;
    margin: 0;
    padding: 24px;
    min-height: 100vh;
  }}
  .header {{
    background: linear-gradient(135deg, #1a103a 0%, #0d1117 100%);
    border: 1px solid #a855f7;
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }}
  .header h1 {{
    color: #a855f7;
    margin: 0 0 4px 0;
    font-size: 22px;
    letter-spacing: 0.2em;
  }}
  .header .tagline {{
    color: #06b6d4;
    font-size: 13px;
    font-style: italic;
  }}
  .header .meta {{
    color: #6c7687;
    font-size: 11px;
    margin-top: 8px;
  }}
  .meta span {{
    color: #c9d1d9;
  }}
  .terminal {{
    background: #000;
    border: 1px solid #21262d;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.4;
    white-space: pre;
  }}
  .footer {{
    margin-top: 16px;
    padding: 12px 16px;
    background: #161b22;
    border: 1px solid #21262d;
    border-radius: 6px;
    color: #6c7687;
    font-size: 11px;
  }}
  .footer a {{
    color: #06b6d4;
    text-decoration: none;
  }}
  .proof-box {{
    background: #0d1117;
    border-left: 3px solid #a855f7;
    padding: 12px 16px;
    margin: 12px 0;
    color: #c9d1d9;
    font-size: 12px;
  }}
  .proof-box b {{ color: #e6edf3; }}
</style>
</head>
<body>
<div class="header">
  <h1>RECONPRO UNIFIED — PROOF OF SCAN</h1>
  <div class="tagline">Six Blades. One Target. One Verdict.</div>
  <div class="meta">
    Target: <span>generativelanguage.googleapis.com</span> (Google Gemini API) ·
    Encounter: <span>RPU-F0C6A4505BEB</span> ·
    Duration: <span>70.96s</span> ·
    Timestamp: <span>2026-07-26T14:03:29Z</span>
  </div>
</div>

<div class="proof-box">
<b>Scan configuration:</b> All 6 modules executed against the live Google Gemini API endpoint
(<code>generativelanguage.googleapis.com</code>).<br>
<b>Modules:</b> RECON (13 categories) · AUTH BYPASS (15 techniques × 5 endpoints) · CHAIN HUNTER (10 SSRF vectors) ·
BOT HUNTER (10 C2 signatures) · GORGON ULTRA (15 stages) · OBLIVION (23 stages).<br>
<b>Verdict:</b> <span style="color:#475569;font-weight:bold;">MUNDANE</span> — Unified score 19/100.
Gemini's API is hardened: 0 auth bypasses, 0 SSRF, 0 bot indicators. The strongest modules (GORGON, OBLIVION)
reached only 15/100 and 34/100 respectively because Google blocks anonymous chat at the edge.
</div>

<div class="terminal">{content}</div>

<div class="footer">
  Generated by ReconPro UNIFIED CLI v1.0 · Signature: X-R3c0nPr0-Un1f13d-S1x-Bl4d3s-0n3-T4rg3t-2026<br>
  Full JSON report: <code>/home/z/my-project/download/reconpro_unified_gemini_report.json</code> (180 KB)<br>
  Raw ANSI capture: <code>/home/z/my-project/download/reconpro_unified_gemini_terminal.ansi</code>
</div>
</body>
</html>
"""

Path(HTML_FILE).write_text(html_doc)
print(f'HTML proof saved: {HTML_FILE}')
print(f'Size: {len(html_doc)} bytes')
