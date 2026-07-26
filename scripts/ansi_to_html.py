#!/usr/bin/env python3
"""Convert ANSI terminal output to standalone HTML with dark theme."""
import sys
import re
import html

def ansi_to_html(text: str) -> str:
    # escape HTML first
    text = html.escape(text)
    # ANSI color map
    colors = {
        '30': '#000', '31': '#ff5555', '32': '#50fa7b', '33': '#f1fa8c',
        '34': '#bd93f9', '35': '#ff79c6', '36': '#8be9fd', '37': '#f8f8f2',
        '90': '#6272a4', '91': '#ff6e6e', '92': '#69ff94', '93': '#ffffa5',
        '94': '#d6acff', '95': '#ff92df', '96': '#a4ffff', '97': '#ffffff',
    }
    # Split into lines for processing
    out = []
    i = 0
    cur_style = []
    open_spans = 0
    
    # Simple approach: replace each ANSI escape with </span><span style="...">
    def repl(m):
        codes = m.group(1).split(';')
        styles = []
        # reset
        if '0' in codes:
            return '</span>' * open_spans  # reset all
        for c in codes:
            if c in colors:
                styles.append(f'color:{colors[c]}')
            elif c == '1':
                styles.append('font-weight:bold')
            elif c == '2':
                styles.append('opacity:0.7')
            elif c == '3':
                styles.append('font-style:italic')
            elif c == '4':
                styles.append('text-decoration:underline')
        return f'</span><span style="{";".join(styles)}">'
    
    # Replace ANSI codes
    text = re.sub(r'\x1b\[([0-9;]*)m', repl, text)
    # Replace \r (carriage return) with newline
    text = text.replace('\r', '')
    return text

def render_html(ansi_text: str, title: str) -> str:
    body = ansi_to_html(ansi_text)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  body {{
    background: #0a0a0f;
    color: #f8f8f2;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.45;
    margin: 0;
    padding: 24px;
    min-height: 100vh;
  }}
  .terminal {{
    max-width: 1280px;
    margin: 0 auto;
    background: #050507;
    border: 1px solid #1f1f2e;
    border-radius: 8px;
    padding: 18px 22px;
    box-shadow: 0 0 80px rgba(139, 233, 253, 0.08), 0 0 200px rgba(255, 121, 198, 0.06);
  }}
  .term-header {{
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0 14px;
    border-bottom: 1px solid #1f1f2e;
    margin-bottom: 14px;
    color: #6272a4;
    font-size: 12px;
  }}
  .dot {{ width: 12px; height: 12px; border-radius: 50%; }}
  .dot.r {{ background: #ff5555; }}
  .dot.y {{ background: #f1fa8c; }}
  .dot.g {{ background: #50fa7b; }}
  .term-title {{ margin-left: 12px; }}
  pre {{
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
  }}
  .meta {{
    max-width: 1280px;
    margin: 18px auto 0;
    color: #6272a4;
    font-size: 11px;
    text-align: center;
  }}
  .meta b {{ color: #8be9fd; }}
</style>
</head>
<body>
  <div class="terminal">
    <div class="term-header">
      <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
      <span class="term-title">reconpro@unified — zsh — 120×40</span>
    </div>
    <pre>{body}</pre>
  </div>
  <div class="meta">
    Rendered from raw ANSI capture · <b>ReconPro UNIFIED CLI v1.0</b> · Six Blades, One Target, One Verdict
  </div>
</body>
</html>"""

if __name__ == "__main__":
    inp = sys.stdin.read()
    title = sys.argv[1] if len(sys.argv) > 1 else "ReconPro UNIFIED CLI — Proof"
    out = sys.argv[2] if len(sys.argv) > 2 else "/home/z/my-project/download/reconpro_cli_proof.html"
    with open(out, "w") as f:
        f.write(render_html(inp, title))
    print(f"Saved {len(inp)} bytes -> {out}")
