"""Report generation — HTML reports.

Generates self-contained HTML security reports with charts.
Colors pulled from unified theme system.
"""
from __future__ import annotations

import json
import math
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from .theme import Theme


_report_theme = Theme.current()


def generate_html_report(data: Dict[str, Any], output_path: str = "") -> str:
    """Generate a self-contained HTML report. Returns file path."""
    if not output_path:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        target = data.get("target", "scan").replace("/", "_").replace(":", "")[:30]
        output_path = f"reconpro_report_{target}_{ts}.html"

    score = data.get("total_score", 0)
    grade = data.get("grade", "N/A")
    target = data.get("target", "Unknown")
    findings = data.get("findings", [])
    sc = data.get("severity_counts", {})
    modules = data.get("modules_run", [])
    badge = data.get("badge_markdown", "")

    # Get version dynamically
    try:
        from . import __version__ as _v
        version_str = _v
    except Exception:
        version_str = "7.0.0"

    # Theme colors
    grade_color = _report_theme.grade_color(grade)
    html_style = _report_theme.html_style()
    h_body_bg = html_style.get("body_bg", "#0a0a0f")
    h_card_bg = html_style.get("card_bg", "#111118")
    h_border = html_style.get("border", "#1a1a2e")
    h_text = html_style.get("text", "#e0e0e0")
    h_muted = html_style.get("muted", "#666")
    h_crit_color = _report_theme.sev_hex("critical")
    h_high_color = _report_theme.sev_hex("high")
    h_med_color = _report_theme.sev_hex("medium")
    h_low_color = _report_theme.sev_hex("low")
    h_info_color = _report_theme.sev_hex("info")

    # Build findings rows
    findings_rows = ""
    for f in findings:
        sev = f.get("severity", "info")
        color = _report_theme.sev_hex(sev)
        findings_rows += f'''
        <tr>
          <td style="color:{color};font-weight:600;text-transform:uppercase;font-size:12px">{sev}</td>
          <td style="color:{h_muted}">{f.get("module", "")}</td>
          <td style="color:{h_muted}">{f.get("category", "")}</td>
          <td>{f.get("title", "")}</td>
          <td style="text-align:center;color:{h_med_color}">-{f.get("points_deducted", 0)}</td>
          <td style="color:{h_muted};font-size:12px">{f.get("remediation", "")[:80]}</td>
        </tr>'''

    if not findings_rows:
        findings_rows = f'<tr><td colspan="6" style="text-align:center;color:{h_low_color};padding:40px">No findings. Target is clean.</td></tr>'

    # Score ring SVG
    score_angle = score / 100 * 360
    score_r = 70
    score_cx = 100
    score_cy = 100
    if score_angle >= 360:
        score_arc = ""
    else:
        end_x = score_cx + score_r * math.cos(math.radians(score_angle - 90))
        end_y = score_cy + score_r * math.sin(math.radians(score_angle - 90))
        large = 1 if score_angle > 180 else 0
        score_arc = f'<path d="M {score_cx} {score_cy - score_r} A {score_r} {score_r} 0 {large} 1 {end_x} {end_y} L {score_cx} {score_cy} Z" fill="{grade_color}" opacity="0.9"/>'

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ReconPro Report — {target}</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ background:{h_body_bg}; color:{h_text}; font-family:'SF Mono','Fira Code',monospace; padding:40px; }}
  .container {{ max-width:1100px; margin:0 auto; }}
  h1 {{ font-size:28px; color:#fff; margin-bottom:4px; }}
  .subtitle {{ color:{h_muted}; font-size:14px; margin-bottom:30px; }}
  .header {{ display:flex; align-items:center; justify-content:space-between; padding:30px; background:{h_card_bg}; border:1px solid {h_border}; border-radius:12px; margin-bottom:24px; }}
  .score-ring {{ flex-shrink:0; }}
  .header-info {{ flex:1; padding-left:30px; }}
  .score-big {{ font-size:48px; font-weight:800; color:{grade_color}; }}
  .grade-big {{ font-size:28px; color:{grade_color}; }}
  .stat-grid {{ display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:24px; }}
  .stat-card {{ background:{h_card_bg}; border:1px solid {h_border}; border-radius:8px; padding:16px; text-align:center; }}
  .stat-num {{ font-size:28px; font-weight:700; }}
  .stat-label {{ font-size:11px; color:{h_muted}; text-transform:uppercase; margin-top:4px; }}
  table {{ width:100%; border-collapse:collapse; background:{h_card_bg}; border:1px solid {h_border}; border-radius:8px; overflow:hidden; }}
  th {{ text-align:left; padding:12px 16px; font-size:11px; text-transform:uppercase; color:{h_muted}; border-bottom:1px solid {h_border}; background:{h_body_bg}; }}
  td {{ padding:10px 16px; font-size:13px; border-bottom:1px solid {h_border}; }}
  tr:hover {{ background:{h_card_bg}; }}
  .section-title {{ font-size:16px; color:#fff; margin:24px 0 12px; padding-left:12px; border-left:3px solid {grade_color}; }}
  .modules {{ display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }}
  .module-tag {{ background:{h_border}; color:{h_muted}; padding:4px 12px; border-radius:20px; font-size:12px; }}
  .badge-box {{ margin-top:24px; padding:16px; background:{h_card_bg}; border:1px solid {h_border}; border-radius:8px; }}
  .badge-box code {{ color:#58a6ff; font-size:13px; }}
  .footer {{ text-align:center; color:{h_muted}; font-size:12px; margin-top:40px; }}
</style>
</head>
<body>
<div class="container">
  <h1>RECONPRO</h1>
  <p class="subtitle">Security Assessment Report &mdash; Generated {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>

  <div class="header">
    <div class="score-ring">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="70" fill="none" stroke="{h_border}" stroke-width="12"/>
        {score_arc}
        <text x="100" y="95" text-anchor="middle" fill="white" font-size="36" font-weight="800">{score}</text>
        <text x="100" y="120" text-anchor="middle" fill="{grade_color}" font-size="20" font-weight="600">{grade}</text>
      </svg>
    </div>
    <div class="header-info">
      <div style="color:{h_muted};font-size:12px;text-transform:uppercase">Target</div>
      <div style="font-size:24px;color:#fff;margin-bottom:16px">{target}</div>
      <div class="modules">
        {"".join(f'<span class="module-tag">{m}</span>' for m in modules)}
      </div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:{h_crit_color}">{sc.get("critical",0)}</div><div class="stat-label">Critical</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_high_color}">{sc.get("high",0)}</div><div class="stat-label">High</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_med_color}">{sc.get("medium",0)}</div><div class="stat-label">Medium</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_low_color}">{sc.get("low",0)}</div><div class="stat-label">Low</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_info_color}">{sc.get("info",0)}</div><div class="stat-label">Info</div></div>
  </div>

  <div class="section-title">Findings ({len(findings)})</div>
  <table>
    <thead><tr><th>Severity</th><th>Module</th><th>Category</th><th>Finding</th><th>Pts</th><th>Remediation</th></tr></thead>
    <tbody>{findings_rows}</tbody>
  </table>

  <div class="badge-box">
    <div style="color:{h_muted};font-size:12px;margin-bottom:8px">GITHUB README BADGE</div>
    <code>{badge}</code>
  </div>

  <div class="footer">Generated by ReconPro v{version_str} &mdash; Eleven Blades. One Target. One Verdict.</div>
</div>
</body>
</html>'''

    with open(output_path, "w") as f:
        f.write(html)

    return os.path.abspath(output_path)
