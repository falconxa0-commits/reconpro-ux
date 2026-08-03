"""Report generation — Chart.js-powered HTML reports.

Phase F: Complete overhaul with interactive Chart.js visualizations.
Generates a single self-contained HTML file with CDN-loaded Chart.js.

Charts included:
  - Score gauge (doughnut with center text)
  - Severity breakdown (doughnut)
  - Module findings bar chart
  - Points deducted per module (horizontal bar)
  - Category distribution (horizontal bar)
  - Findings timeline (line chart, if timestamps available)

Colors pulled from unified theme system for consistency.
"""
from __future__ import annotations

import json
import math
import os
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .theme import Theme


_report_theme = Theme.current()


# ── Chart.js CDN ────────────────────────────────────────────────────────

_CHARTJS_CDN = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>'
_CHARTJS_DATE_ADAPTER = '<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>'


# ── Helpers ─────────────────────────────────────────────────────────────


def _module_breakdown(findings: List[Dict[str, Any]]) -> Dict[str, int]:
    """Count findings per module."""
    counts: Dict[str, int] = {}
    for f in findings:
        m = f.get("module", "unknown")
        counts[m] = counts.get(m, 0) + 1
    return counts


def _category_breakdown(findings: List[Dict[str, Any]]) -> Dict[str, int]:
    """Count findings per category."""
    counts: Dict[str, int] = {}
    for f in findings:
        c = f.get("category", "general")
        counts[c] = counts.get(c, 0) + 1
    return counts


def _points_per_module(findings: List[Dict[str, Any]]) -> Dict[str, int]:
    """Sum points deducted per module."""
    pts: Dict[str, int] = {}
    for f in findings:
        m = f.get("module", "unknown")
        pts[m] = pts.get(m, 0) + f.get("points_deducted", 0)
    return pts


def _severity_per_module(
    findings: List[Dict[str, Any]],
) -> Dict[str, Dict[str, int]]:
    """Count findings per module per severity."""
    matrix: Dict[str, Dict[str, int]] = {}
    for f in findings:
        m = f.get("module", "unknown")
        s = f.get("severity", "info").lower()
        matrix.setdefault(m, {})
        matrix[m][s] = matrix[m].get(s, 0) + 1
    return matrix


def _chart_colors(n: int, palette: str = "severity") -> List[str]:
    """Generate n distinct colors for charts."""
    if palette == "severity":
        base = [
            _report_theme.sev_hex("critical"),
            _report_theme.sev_hex("high"),
            _report_theme.sev_hex("medium"),
            _report_theme.sev_hex("low"),
            _report_theme.sev_hex("info"),
            "#8b5cf6",
            "#ec4899",
            "#14b8a6",
            "#f97316",
            "#6366f1",
            "#a3e635",
            "#22d3ee",
        ]
    else:
        base = [
            "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981",
            "#ef4444", "#ec4899", "#6366f1", "#14b8a6",
            "#f97316", "#a3e635", "#22d3ee", "#e879f9",
        ]
    # Cycle if we need more than available
    return [base[i % len(base)] for i in range(n)]


def _escape_js(s: str) -> str:
    """Escape a string for safe embedding in JS/JSON."""
    return json.dumps(s)


# ── Chart Generators (return <script> blocks) ───────────────────────────


def _chart_score_gauge(score: int, grade: str, grade_color: str) -> str:
    """Doughnut chart showing score with center label."""
    remain = 100 - score
    return f'''
    <script>
      (function() {{
        const ctx = document.getElementById('chart-score-gauge').getContext('2d');
        new Chart(ctx, {{
          type: 'doughnut',
          data: {{
            labels: ['Score', 'Remaining'],
            datasets: [{{
              data: [{score}, {remain}],
              backgroundColor: ['{grade_color}', '{_report_theme.html_style().get("border", "#1a1a2e")}'],
              borderWidth: 0,
              cutout: '78%',
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: true,
            plugins: {{
              legend: {{ display: false }},
              tooltip: {{ enabled: false }}
            }}
          }},
          plugins: [{{
            id: 'centerText',
            afterDraw(chart) {{
              const {{ ctx, width, height }} = chart;
              ctx.save();
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const cy = height / 2;
              ctx.font = '800 42px "SF Mono", "Fira Code", monospace';
              ctx.fillStyle = '#ffffff';
              ctx.fillText('{score}', width / 2, cy - 12);
              ctx.font = '600 22px "SF Mono", "Fira Code", monospace';
              ctx.fillStyle = '{grade_color}';
              ctx.fillText('{grade}', width / 2, cy + 18);
              ctx.restore();
            }}
          }}]
        }});
      }})();
    </script>'''


def _chart_severity_doughnut(sc: Dict[str, int]) -> str:
    """Doughnut chart of severity distribution."""
    labels = []
    values = []
    colors = []
    for sev in ("critical", "high", "medium", "low", "info"):
        v = sc.get(sev, 0)
        if v > 0:
            labels.append(sev.capitalize())
            values.append(v)
            colors.append(_report_theme.sev_hex(sev))

    if not values:
        return '<p style="color:#666;text-align:center;padding:30px">No findings to chart.</p>'

    return f'''
    <script>
      (function() {{
        const ctx = document.getElementById('chart-severity').getContext('2d');
        new Chart(ctx, {{
          type: 'doughnut',
          data: {{
            labels: {json.dumps(labels)},
            datasets: [{{
              data: {json.dumps(values)},
              backgroundColor: {json.dumps(colors)},
              borderWidth: 0,
              cutout: '55%',
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: true,
            plugins: {{
              legend: {{
                position: 'bottom',
                labels: {{ color: '#999', padding: 16, font: {{ size: 12, family: '"SF Mono", "Fira Code", monospace' }} }}
              }}
            }}
          }}
        }});
      }})();
    </script>'''


def _chart_module_bar(module_breakdown: Dict[str, int]) -> str:
    """Vertical bar chart of findings per module."""
    if not module_breakdown:
        return '<p style="color:#666;text-align:center;padding:30px">No module data.</p>'

    # Sort by count descending, top 12
    sorted_mods = sorted(module_breakdown.items(), key=lambda x: x[1], reverse=True)[:12]
    labels = [m.upper() for m, _ in sorted_mods]
    values = [c for _, c in sorted_mods]
    colors = _chart_colors(len(labels))

    return f'''
    <script>
      (function() {{
        const ctx = document.getElementById('chart-modules').getContext('2d');
        new Chart(ctx, {{
          type: 'bar',
          data: {{
            labels: {json.dumps(labels)},
            datasets: [{{
              label: 'Findings',
              data: {json.dumps(values)},
              backgroundColor: {json.dumps(colors)},
              borderRadius: 4,
              borderSkipped: false,
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            scales: {{
              x: {{ ticks: {{ color: '#666', font: {{ size: 10 }} }}, grid: {{ display: false }} }},
              y: {{ beginAtZero: true, ticks: {{ color: '#666', stepSize: 1 }}, grid: {{ color: '#1a1a2e' }} }}
            }},
            plugins: {{ legend: {{ display: false }} }}
          }}
        }});
      }})();
    </script>'''


def _chart_points_hbar(pts_per_mod: Dict[str, int]) -> str:
    """Horizontal bar chart of points deducted per module."""
    if not pts_per_mod:
        return ''

    sorted_mods = sorted(pts_per_mod.items(), key=lambda x: x[1], reverse=True)[:10]
    labels = [m.upper() for m, _ in sorted_mods]
    values = [p for _, p in sorted_mods]
    colors = [_report_theme.sev_hex("high") if p > 15 else _report_theme.sev_hex("medium") if p > 5 else _report_theme.sev_hex("low") for p in values]

    return f'''
    <script>
      (function() {{
        const ctx = document.getElementById('chart-points').getContext('2d');
        new Chart(ctx, {{
          type: 'bar',
          data: {{
            labels: {json.dumps(labels)},
            datasets: [{{
              label: 'Points Deducted',
              data: {json.dumps(values)},
              backgroundColor: {json.dumps(colors)},
              borderRadius: 4,
              borderSkipped: false,
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {{
              x: {{ beginAtZero: true, ticks: {{ color: '#666' }}, grid: {{ color: '#1a1a2e' }} }},
              y: {{ ticks: {{ color: '#999', font: {{ size: 11 }} }}, grid: {{ display: false }} }}
            }},
            plugins: {{ legend: {{ display: false }} }}
          }}
        }});
      }})();
    </script>'''


def _chart_category_hbar(cat_breakdown: Dict[str, int]) -> str:
    """Horizontal bar chart of findings per category."""
    if not cat_breakdown:
        return ''

    sorted_cats = sorted(cat_breakdown.items(), key=lambda x: x[1], reverse=True)[:10]
    labels = [c.replace("_", " ").title() for c, _ in sorted_cats]
    values = [v for _, v in sorted_cats]
    colors = _chart_colors(len(labels), palette="module")

    return f'''
    <script>
      (function() {{
        const ctx = document.getElementById('chart-categories').getContext('2d');
        new Chart(ctx, {{
          type: 'bar',
          data: {{
            labels: {json.dumps(labels)},
            datasets: [{{
              label: 'Findings',
              data: {json.dumps(values)},
              backgroundColor: {json.dumps(colors)},
              borderRadius: 4,
              borderSkipped: false,
            }}]
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {{
              x: {{ beginAtZero: true, ticks: {{ color: '#666', stepSize: 1 }}, grid: {{ color: '#1a1a2e' }} }},
              y: {{ ticks: {{ color: '#999', font: {{ size: 11 }} }}, grid: {{ display: false }} }}
            }},
            plugins: {{ legend: {{ display: false }} }}
          }}
        }});
      }})();
    </script>'''


def _chart_severity_stacked_bar(sev_matrix: Dict[str, Dict[str, int]]) -> str:
    """Stacked bar chart: severity breakdown per module."""
    if not sev_matrix:
        return ''

    # Get all modules and severities
    all_modules = sorted(sev_matrix.keys(), key=lambda m: sum(sev_matrix[m].values()), reverse=True)[:10]
    severities = ["critical", "high", "medium", "low", "info"]
    sev_colors = {s: _report_theme.sev_hex(s) for s in severities}

    datasets = []
    for sev in severities:
        data = [sev_matrix.get(m, {}).get(sev, 0) for m in all_modules]
        if any(d > 0 for d in data):
            datasets.append({
                "label": sev.capitalize(),
                "data": data,
                "backgroundColor": sev_colors[sev],
                "borderRadius": 2,
                "borderSkipped": False,
            })

    if not datasets:
        return ''

    labels = [m.upper() for m in all_modules]
    return f'''
    <script>
      (function() {{
        const ctx = document.getElementById('chart-stacked').getContext('2d');
        new Chart(ctx, {{
          type: 'bar',
          data: {{
            labels: {json.dumps(labels)},
            datasets: {json.dumps(datasets)}
          }},
          options: {{
            responsive: true,
            maintainAspectRatio: true,
            scales: {{
              x: {{ stacked: true, ticks: {{ color: '#666', font: {{ size: 10 }} }}, grid: {{ display: false }} }},
              y: {{ stacked: true, beginAtZero: true, ticks: {{ color: '#666', stepSize: 1 }}, grid: {{ color: '#1a1a2e' }} }}
            }},
            plugins: {{
              legend: {{
                position: 'bottom',
                labels: {{ color: '#999', padding: 12, font: {{ size: 11 }} }}
              }}
            }}
          }}
        }});
      }})();
    </script>'''


# ── Main Report Generator ───────────────────────────────────────────────


def generate_html_report(data: Dict[str, Any], output_path: str = "") -> str:
    """Generate a Chart.js-powered HTML report. Returns file path.

    Phase F: Complete overhaul with interactive charts:
    - Score gauge (doughnut with center text)
    - Severity breakdown (doughnut)
    - Findings per module (vertical bar)
    - Points deducted per module (horizontal bar)
    - Category distribution (horizontal bar)
    - Severity stacked per module (stacked bar)
    """
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
    scan_time = data.get("scan_time", "")

    # Version
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
    h_accent = _report_theme.CYAN if hasattr(_report_theme, 'CYAN') else "#06b6d4"

    # Data processing
    mod_counts = _module_breakdown(findings)
    cat_counts = _category_breakdown(findings)
    pts_mod = _points_per_module(findings)
    sev_matrix = _severity_per_module(findings)
    total_findings = len(findings)
    total_pts = sum(f.get("points_deducted", 0) for f in findings)

    # ── Chart scripts ──
    chart_score = _chart_score_gauge(score, grade, grade_color)
    chart_severity = _chart_severity_doughnut(sc)
    chart_modules = _chart_module_bar(mod_counts)
    chart_points = _chart_points_hbar(pts_mod)
    chart_categories = _chart_category_hbar(cat_counts)
    chart_stacked = _chart_severity_stacked_bar(sev_matrix)

    # ── Findings table rows ──
    sorted_findings = sorted(
        findings,
        key=lambda f: {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}.get(
            f.get("severity", "info").lower(), 99
        ),
    )
    findings_rows = ""
    for i, f in enumerate(sorted_findings, 1):
        sev = f.get("severity", "info").lower()
        color = _report_theme.sev_hex(sev)
        evidence = f.get("evidence", "")
        evidence_short = (evidence[:100] + "..." if len(evidence) > 100 else evidence) if evidence else ""
        evidence_cell = f'<td style="color:{h_muted};font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{evidence_short}</td>' if evidence_short else '<td></td>'
        findings_rows += f'''
        <tr>
          <td style="color:#666;width:40px">{i}</td>
          <td style="color:{color};font-weight:600;text-transform:uppercase;font-size:11px;width:70px">{sev}</td>
          <td style="color:{h_muted};font-size:12px;width:90px">{f.get("module", "")}</td>
          <td style="color:{h_text}">{f.get("title", "")}</td>
          <td style="color:{h_muted};font-size:12px;width:120px">{f.get("category", "")}</td>
          <td style="text-align:center;color:{h_med_color};width:40px">-{f.get("points_deducted", 0)}</td>
          {evidence_cell}
        </tr>'''

    if not findings_rows:
        findings_rows = f'<tr><td colspan="7" style="text-align:center;color:{h_low_color};padding:60px 20px">No findings detected. Target appears clean.</td></tr>'

    # ── Module tags ──
    module_tags = "".join(f'<span class="module-tag">{m}</span>' for m in modules)

    # ── Top risk findings (critical + high) ──
    top_risk = [f for f in sorted_findings if f.get("severity", "").lower() in ("critical", "high")]
    risk_items = ""
    for f in top_risk[:5]:
        sev = f.get("severity", "").lower()
        color = _report_theme.sev_hex(sev)
        risk_items += f'''
        <div class="risk-item">
          <span class="risk-sev" style="background:{color}">{sev.upper()[:1]}</span>
          <span class="risk-title">{f.get("title", "")}</span>
          <span class="risk-module">{f.get("module", "")}</span>
        </div>'''
    if not risk_items:
        risk_items = f'<p style="color:{h_low_color};padding:16px;text-align:center">No critical or high findings.</p>'

    # ── Show/hide chart containers based on data availability ──
    has_modules = bool(mod_counts)
    has_points = bool(pts_mod)
    has_categories = bool(cat_counts) and len(cat_counts) > 1
    has_stacked = bool(sev_matrix)

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ReconPro Report \u2014 {target}</title>
{_CHARTJS_CDN}
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ background:{h_body_bg}; color:{h_text}; font-family:'SF Mono','Fira Code','Cascadia Code',monospace; padding:24px; line-height:1.5; }}
  .container {{ max-width:1200px; margin:0 auto; }}

  /* Header */
  .report-header {{ display:flex; align-items:center; justify-content:space-between; padding:28px 32px; background:{h_card_bg}; border:1px solid {h_border}; border-radius:16px; margin-bottom:24px; gap:24px; }}
  .brand {{ flex-shrink:0; }}
  .brand h1 {{ font-size:22px; color:#fff; letter-spacing:2px; }}
  .brand .ver {{ color:{h_muted}; font-size:12px; margin-top:2px; }}
  .header-center {{ flex:1; text-align:center; }}
  .target-name {{ font-size:26px; color:#fff; font-weight:700; margin-bottom:4px; word-break:break-all; }}
  .scan-meta {{ color:{h_muted}; font-size:13px; }}
  .header-right {{ flex-shrink:0; width:180px; height:180px; }}

  /* Stat cards */
  .stat-grid {{ display:grid; grid-template-columns:repeat(6,1fr); gap:10px; margin-bottom:24px; }}
  .stat-card {{ background:{h_card_bg}; border:1px solid {h_border}; border-radius:10px; padding:16px 12px; text-align:center; transition:transform 0.2s; }}
  .stat-card:hover {{ transform:translateY(-2px); }}
  .stat-num {{ font-size:28px; font-weight:800; }}
  .stat-label {{ font-size:10px; color:{h_muted}; text-transform:uppercase; margin-top:4px; letter-spacing:1px; }}

  /* Chart grid */
  .chart-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }}
  .chart-card {{ background:{h_card_bg}; border:1px solid {h_border}; border-radius:12px; padding:20px; }}
  .chart-card.full-width {{ grid-column: 1 / -1; }}
  .chart-title {{ font-size:12px; color:{h_muted}; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid {h_border}; }}
  .chart-wrap {{ position:relative; width:100%; }}
  .chart-wrap.tall {{ height:320px; }}

  /* Risk panel */
  .risk-panel {{ background:{h_card_bg}; border:1px solid {h_border}; border-radius:12px; padding:20px; margin-bottom:24px; }}
  .risk-item {{ display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid {h_border}; }}
  .risk-item:last-child {{ border-bottom:none; }}
  .risk-sev {{ width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:800; flex-shrink:0; }}
  .risk-title {{ flex:1; font-size:13px; color:{h_text}; }}
  .risk-module {{ color:{h_muted}; font-size:11px; }}

  /* Findings table */
  .section-title {{ font-size:14px; color:#fff; margin:24px 0 12px; padding-left:12px; border-left:3px solid {grade_color}; text-transform:uppercase; letter-spacing:1px; }}
  table {{ width:100%; border-collapse:collapse; background:{h_card_bg}; border:1px solid {h_border}; border-radius:12px; overflow:hidden; }}
  th {{ text-align:left; padding:12px 14px; font-size:10px; text-transform:uppercase; color:{h_muted}; border-bottom:1px solid {h_border}; background:{h_body_bg}; letter-spacing:1px; }}
  td {{ padding:10px 14px; font-size:12px; border-bottom:1px solid {h_border}; }}
  tr:hover {{ background:rgba(255,255,255,0.02); }}

  /* Module tags */
  .modules {{ display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }}
  .module-tag {{ background:{h_border}; color:{h_muted}; padding:3px 10px; border-radius:16px; font-size:11px; }}

  /* Badge box */
  .badge-box {{ margin-top:24px; padding:16px 20px; background:{h_card_bg}; border:1px solid {h_border}; border-radius:10px; }}
  .badge-box .label {{ color:{h_muted}; font-size:11px; text-transform:uppercase; margin-bottom:8px; letter-spacing:1px; }}
  .badge-box code {{ color:#58a6ff; font-size:13px; word-break:break-all; }}

  /* Footer */
  .footer {{ text-align:center; color:{h_muted}; font-size:11px; margin-top:40px; padding-top:20px; border-top:1px solid {h_border}; }}

  /* Responsive */
  @media (max-width:768px) {{
    .report-header {{ flex-direction:column; text-align:center; }}
    .stat-grid {{ grid-template-columns:repeat(3,1fr); }}
    .chart-grid {{ grid-template-columns:1fr; }}
    .header-right {{ width:160px; height:160px; }}
  }}
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="report-header">
    <div class="brand">
      <h1>RECONPRO</h1>
      <div class="ver">v{version_str} \u00b7 Security Report</div>
    </div>
    <div class="header-center">
      <div class="target-name">{target}</div>
      <div class="scan-meta">{datetime.now().strftime("%Y-%m-%d %H:%M:%S")} \u00b7 {total_findings} findings \u00b7 {len(modules)} modules \u00b7 -{total_pts} points</div>
      <div class="modules">{module_tags}</div>
    </div>
    <div class="header-right">
      <canvas id="chart-score-gauge"></canvas>
    </div>
  </div>
  {chart_score}

  <!-- Stat cards -->
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:{h_crit_color}">{sc.get("critical",0)}</div><div class="stat-label">Critical</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_high_color}">{sc.get("high",0)}</div><div class="stat-label">High</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_med_color}">{sc.get("medium",0)}</div><div class="stat-label">Medium</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_low_color}">{sc.get("low",0)}</div><div class="stat-label">Low</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{h_info_color}">{sc.get("info",0)}</div><div class="stat-label">Info</div></div>
    <div class="stat-card"><div class="stat-num" style="color:{grade_color}">{score}</div><div class="stat-label">Score</div></div>
  </div>

  <!-- Charts row 1: severity doughnut + module bar -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Severity Distribution</div>
      <div class="chart-wrap"><canvas id="chart-severity"></canvas></div>
      {chart_severity}
    </div>
    <div class="chart-card">
      <div class="chart-title">Findings per Module</div>
      <div class="chart-wrap"><canvas id="chart-modules"></canvas></div>
      {chart_modules}
    </div>
  </div>

  <!-- Top Risk -->
  {f'<div class="risk-panel"><div class="chart-title">Top Risk Findings</div>{risk_items}</div>' if top_risk else ''}

  <!-- Charts row 2: points + categories (if data available) -->
  <div class="chart-grid">
    {'<div class="chart-card"><div class="chart-title">Points Deducted per Module</div><div class="chart-wrap tall"><canvas id="chart-points"></canvas></div>{chart_points}</div>' if has_points else ''}
    {'<div class="chart-card"><div class="chart-title">Category Breakdown</div><div class="chart-wrap tall"><canvas id="chart-categories"></canvas></div>{chart_categories}</div>' if has_categories else ''}
  </div>

  <!-- Stacked severity per module -->
  {'<div class="chart-card full-width" style="margin-bottom:24px"><div class="chart-title">Severity Breakdown by Module</div><div class="chart-wrap"><canvas id="chart-stacked"></canvas></div>{chart_stacked}</div>' if has_stacked else ''}

  <!-- Findings table -->
  <div class="section-title">All Findings ({total_findings})</div>
  <table>
    <thead><tr><th>#</th><th>Sev</th><th>Module</th><th>Finding</th><th>Category</th><th>Pts</th><th>Evidence</th></tr></thead>
    <tbody>{findings_rows}</tbody>
  </table>

  <!-- Badge -->
  <div class="badge-box">
    <div class="label">GitHub README Badge</div>
    <code>{badge}</code>
  </div>

  <div class="footer">Generated by ReconPro v{version_str} \u2014 Eleven Blades. One Target. One Verdict.</div>
</div>
</body>
</html>'''

    with open(output_path, "w") as f:
        f.write(html)

    return os.path.abspath(output_path)
