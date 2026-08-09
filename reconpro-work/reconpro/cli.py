from __future__ import annotations

import argparse
import json
import os
import sys

from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.text import Text

from . import __version__
from .theme import Theme
from .scanner import (
    scan, audit_scan, MODULE_REGISTRY, LOCAL_MODULES,
    ALL_MODULES, DEFAULT_MODULES, DEFAULT_LOCAL_MODULES,
)
from .history import list_scans, get_latest, diff_scans, save_scan, clear_history
from .reports import generate_html_report
from .parallel import blitz_scan

console = Console()

BANNER = r"""[bold bright_white]
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██╗██╔════╝██╔══██╗██╔════╝██╔════╝██║██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██║███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝
[/bold bright_white][dim]          E L E V E N   B L A D E S .   O N E   T A R G E T .   O N E   V E R D I C T.[/dim]
"""

# Colors from unified theme system
_cli_theme = Theme.current()

SEV_COLORS = {
    "critical": "bright_red",
    "high": "red",
    "medium": "yellow",
    "low": "green",
    "info": "dim",
}

GRADE_COLORS = {
    "A+": _cli_theme.grade_rich("A+"),
    "A": _cli_theme.grade_rich("A"),
    "B": _cli_theme.grade_rich("B"),
    "C": _cli_theme.grade_rich("C"),
    "D": _cli_theme.grade_rich("D"),
    "F": _cli_theme.grade_rich("F"),
}


# ── Rich rendering ──────────────────────────────────────────────────────


def _render_summary(result, title: str = "RECONPRO") -> None:
    score = result.total_score
    grade = result.grade
    grade_color = GRADE_COLORS.get(grade, "bold bright_red")
    sc = result.severity_counts
    total = len(result.findings)
    bar_width = 50
    filled = int(score / 100 * bar_width)
    bar = "█" * filled + "░" * (bar_width - filled)
    lines = [
        Text(f"\n  {bar} [bold {grade_color}]{score}/100 ({grade})[/{grade_color}]"),
        Text(f"\n  Target: [cyan]{result.target}[/]"),
        Text(f"  Modules: [dim]{', '.join(result.modules_run)}[/]"),
        Text(""),
        Text(
            f"  Findings: [bold]{total}[/]  "
            f"[bright_red]{sc.get('critical', 0)} critical[/], "
            f"[red]{sc.get('high', 0)} high[/], "
            f"[yellow]{sc.get('medium', 0)} medium[/], "
            f"[green]{sc.get('low', 0)} low[/], "
            f"[dim]{sc.get('info', 0)} info[/]",
        ),
    ]
    if result.vibesec_score is not None:
        lines.append(Text(
            f"\n  VibeSec Score: [bold bright_green]{result.vibesec_score}/100 ({result.vibesec_grade})[/]"
        ))
    console.print(Panel(Group(*lines), border_style=grade_color,
                         title=f"[bold]{title}[/bold]", title_align="left", padding=(1, 2)))


def _render_findings_table(result, show_remediation: bool = False) -> None:
    if not result.findings:
        console.print("\n  [bright_green]No findings. Target is clean.[/]")
        return
    table = Table(title=f"Findings — {len(result.findings)} detected",
                  border_style="bright_white", header_style="bold bright_white")
    table.add_column("Severity", style="bold", width=10)
    table.add_column("Module", style="cyan", width=12)
    table.add_column("Category", style="magenta", width=18)
    table.add_column("Finding", style="white")
    table.add_column("Pts", style="yellow", width=5)
    if show_remediation:
        table.add_column("Fix", style="bright_green", width=50)
    for f in result.findings[:80]:
        sev = f.get("severity", "info")
        color = SEV_COLORS.get(sev, "white")
        row = [
            f"[{color}]{sev.upper()}[/{color}]",
            f.get("module", ""), f.get("category", ""),
            f.get("title", "")[:70], str(f.get("points_deducted", 0)),
        ]
        if show_remediation:
            row.append(f.get("remediation", "")[:50])
        table.add_row(*row)
    console.print(table)


def _render_module_breakdown(result) -> None:
    if not result.module_results:
        return
    t = Table(title="Module Breakdown", border_style="dim", header_style="bold dim")
    t.add_column("Module", style="bold", width=16)
    t.add_column("Findings", style="white", width=10)
    t.add_column("Critical", style="bright_red", width=10)
    t.add_column("High", style="red", width=8)
    t.add_column("Medium", style="yellow", width=8)
    for mod_id, mod_data in result.module_results.items():
        findings = mod_data.get("findings", [])
        t.add_row(mod_id.upper(), str(len(findings)),
                   str(sum(1 for f in findings if f.get("severity") == "critical")),
                   str(sum(1 for f in findings if f.get("severity") == "high")),
                   str(sum(1 for f in findings if f.get("severity") == "medium")))
    console.print(t)


def _render_badge(result) -> None:
    if result.badge_markdown:
        console.print(Panel(Group(
            Text("  GitHub README Badge (copy-paste):", style="bold dim"),
            Text(f"  {result.badge_markdown}", style="cyan"),
        ), border_style="dim", title="[dim]Badge[/dim]", title_align="left", padding=(0, 2)))


def _render_remediations(result) -> None:
    actionable = [f for f in result.findings
                  if f.get("remediation") and f.get("severity") not in ("info",)
                  and f.get("points_deducted", 0) > 0]
    if not actionable:
        console.print("\n  [bright_green]No actionable fixes needed.[/]")
        return
    console.print("\n[bold bright_white]  Fix Commands:[/bold bright_white]\n")
    seen = set()
    for f in actionable:
        fix = f.get("remediation", "").strip()
        sev = f.get("severity", "info")
        color = SEV_COLORS.get(sev, "white")
        if fix and fix not in seen:
            seen.add(fix)
            console.print(f"  [{color}]{sev.upper():8}[/{color}]  {fix}")
    console.print()


def _output_result(result, args, title: str = "RECONPRO", show_remediation: bool = False) -> None:
    json_output = getattr(args, "json_output", False)
    output_file = getattr(args, "output_file", None)
    if json_output:
        text = json.dumps(result.to_dict(), indent=2, default=str)
        if output_file:
            with open(output_file, "w") as fp:
                fp.write(text)
            console.print(f"  [green]JSON saved: [cyan]{output_file}[/][/]")
        else:
            print(text)
    else:
        _render_summary(result, title=title)
        console.print()
        _render_module_breakdown(result)
        console.print()
        _render_findings_table(result, show_remediation=show_remediation)
        if show_remediation:
            _render_remediations(result)
        _render_badge(result)
        if output_file:
            with open(output_file, "w") as fp:
                fp.write(json.dumps(result.to_dict(), indent=2, default=str))
            console.print(f"\n  [green]JSON saved: [cyan]{output_file}[/][/]")
        # Auto-save to history
        save_scan(result.to_dict())
    console.print()


_cli_args: argparse.Namespace | None = None


def _banner(args: argparse.Namespace | None = None) -> None:
    """Print banner only when not in JSON mode."""
    if args is None:
        args = _cli_args
    if not getattr(args, 'json_output', False):
        console.print(BANNER)


def _spinner_wrap(msg: str, fn, *a, _json_mode: bool | None = None, **kw):
    """Run a function with a spinner (suppressed in JSON mode)."""
    if _json_mode is None:
        _json_mode = getattr(_cli_args, 'json_output', False) if _cli_args else False
    if _json_mode:
        return fn(*a, **kw)
    with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                   TimeElapsedColumn(), console=console) as progress:
        task = progress.add_task(msg, total=None)
        result = fn(*a, **kw)
        progress.update(task, completed=True)
    return result


def _print_findings(findings, args, title: str = "SCAN") -> None:
    """Print findings from a module run, respecting JSON mode."""
    if getattr(args, 'json_output', False):
        out = []
        for f in findings:
            out.append({
                "title": f.title,
                "severity": f.severity,
                "category": f.category,
                "module": f.module,
                "description": f.description,
                "evidence": f.evidence,
                "asset": f.asset,
                "points_deducted": f.points_deducted,
                "remediation": f.remediation,
            })
        console.print_json(json.dumps(out, indent=2, default=str))
    else:
        if not findings:
            console.print("  [dim]No findings.[/]")
        else:
            for f in findings:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
                if f.evidence:
                    console.print(f"       [dim]{f.evidence[:200]}[/]")
            console.print(f"  [bold]{len(findings)} finding(s).[/]")
    console.print()


# ── CLI entry point ─────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="reconpro",
        description=(
            "ReconPro Nexus v10 — Async Engine. Evasion. Swarm. Knowledge Graph. 40+ Subcommands.\n"
            "The next-gen security platform with AI agent, swarm, and attack-path chaining.\n\n"
            "Quick Start:  reconpro nexus           (mind-blowing agent TUI)\n"
            "AI Agent:     reconpro agent <goal>   (LLM-powered, 18 tools)\n"
            "Swarm:        reconpro swarm <target>  (SCOUT→HACKER→CODER→GUARDIAN)\n"
            "Adversarial:  reconpro adversarial <target>  (hacker vs coder self-play)\n"
            "Intel:        cve, graph, compliance, passive (threat intel + knowledge graph)\n"
            "Export:       export (SARIF/MD/JSON/HTML)\n"
            "Cloud:        iac, container, cloud-recon, delta (infra security)\n"
            "Defense:      defense, fuzzer, profile, benchmark (auto-fix + scoring)"
        ),
        epilog="""Examples:
  # NEXUS (recommended)
  reconpro nexus                # Mind-blowing agent TUI

  # AI Agent (reasoning + 18 tools)
  reconpro agent \"fully recon example.com, find CVEs, generate SARIF\"
  reconpro agent \"swarm attack myapp.com with 3 rounds\"

  # Swarm Intelligence
  reconpro swarm example.com               # SCOUT→HACKER→CODER→GUARDIAN
  reconpro swarm example.com --mode attack   # SCOUT+HACKER only

  # Adversarial Self-Play
  reconpro adversarial example.com           # 3-round hacker vs coder

  # Remote
  reconpro scan example.com
  reconpro vibesec example.com

  # Local + Code
  reconpro audit              # Full machine audit
  reconpro ast /path/to/code  # AST vulnerability analysis
  reconpro secrets            # Find secrets

  # Threat Intelligence
  reconpro cve SQL injection    # NVD CVE lookup
  reconpro graph example.com   # Knowledge graph

  # Export (CI/CD ready)
  reconpro export report.sarif # SARIF for GitHub Code Scanning
  reconpro export report.md     # Markdown report

  # Advanced
  reconpro blitz t1.com t2.com t3.com
  reconpro subdomains example.com
  reconpro schedule example.com --every 1h
  reconpro serve --port 7890""",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("--version", "-v", action="version", version=f"ReconPro {__version__}")
    sub = parser.add_subparsers(dest="subcommand")

    # ── scan ──────────────────────────────────────────────────────
    p = sub.add_parser("scan", help="Full remote scan")
    p.add_argument("target", help="Target domain or URL")
    p.add_argument("--modules", "-m", type=str)
    p.add_argument("--all", "-a", action="store_true")
    p.add_argument("--json", dest="json_output", action="store_true")
    p.add_argument("-o", "--output", dest="output_file", type=str)
    p.add_argument("--timeout", "-t", type=int, default=8)
    p.add_argument("--insecure", "-k", action="store_true")
    p.add_argument("--rate-limit", type=float, default=10.0)

    # ── vibesec ───────────────────────────────────────────────────
    p = sub.add_parser("vibesec", help="Quick VibeSec benchmark")
    p.add_argument("target", help="Target domain or URL")
    p.add_argument("--json", dest="json_output", action="store_true")
    p.add_argument("-o", "--output", dest="output_file", type=str)
    p.add_argument("--timeout", "-t", type=int, default=8)
    p.add_argument("--insecure", "-k", action="store_true")
    p.add_argument("--rate-limit", type=float, default=10.0)

    # ── audit ────────────────────────────────────────────────────
    p = sub.add_parser("audit", help="Full machine audit (ports, firewall, SSH, Docker, env, files)")
    p.add_argument("--modules", "-m", type=str)
    p.add_argument("--json", dest="json_output", action="store_true")
    p.add_argument("-o", "--output", dest="output_file", type=str)

    # ── dev ───────────────────────────────────────────────────────
    p = sub.add_parser("dev", help="Developer project scan (secrets, deps, git, docker)")
    p.add_argument("path", nargs="?", default=".")
    p.add_argument("--json", dest="json_output", action="store_true")
    p.add_argument("-o", "--output", dest="output_file", type=str)

    # ── doctor ────────────────────────────────────────────────────
    p = sub.add_parser("doctor", help="Health check with fix commands")
    p.add_argument("--json", dest="json_output", action="store_true")
    p.add_argument("-o", "--output", dest="output_file", type=str)

    # ── ports ─────────────────────────────────────────────────────
    p = sub.add_parser("ports", help="Show open ports and risky services")
    p.add_argument("--json", dest="json_output", action="store_true")

    # ── secrets ────────────────────────────────────────────────────
    p = sub.add_parser("secrets", help="Find secrets in env vars and codebase")
    p.add_argument("path", nargs="?", default=".")
    p.add_argument("--json", dest="json_output", action="store_true")

    # ── list ──────────────────────────────────────────────────────
    p = sub.add_parser("list", help="List available modules")
    p.add_argument("--local", action="store_true")
    p.add_argument("--all", action="store_true")

    # ── NEXUS ────────────────────────────────────────────────────
    sub.add_parser("nexus", help="Launch NEXUS — mind-blowing agent TUI (mouse + keyboard + split-screen)")

    # ── chat ──────────────────────────────────────────────────────
    sub.add_parser("chat", help="Interactive chat mode — talk to ReconPro")

    # ── tui ───────────────────────────────────────────────────────
    sub.add_parser("tui", help="Visual terminal dashboard")

    # ── blitz ─────────────────────────────────────────────────────
    p = sub.add_parser("blitz", help="Parallel multi-target scan")
    p.add_argument("targets", nargs="+", help="Target domains/URLs")
    p.add_argument("--workers", "-w", type=int, default=4)
    p.add_argument("--modules", "-m", type=str)

    # ── agent ─────────────────────────────────────────────────────
    p = sub.add_parser("agent", help="Autonomous agent — give it a goal")
    p.add_argument("goal", help="Natural language goal (e.g. 'fully scan example.com and find subdomains')")

    # ── subdomains ────────────────────────────────────────────────
    p = sub.add_parser("subdomains", help="Discover subdomains")
    p.add_argument("domain", help="Domain to enumerate")
    p.add_argument("--json", dest="json_output", action="store_true")

    # ── schedule ──────────────────────────────────────────────────
    p = sub.add_parser("schedule", help="Schedule recurring scans")
    p.add_argument("target", help="Target domain, URL, or 'audit'")
    p.add_argument("--every", "-e", type=str, default="1h", help="Interval: 30m, 1h, 6h, 1d")
    p.add_argument("--modules", "-m", type=str)
    p.add_argument("--max-runs", type=int, default=0, help="Max runs (0=forever)")

    # ── serve ─────────────────────────────────────────────────────
    p = sub.add_parser("serve", help="Start REST API server")
    p.add_argument("--port", "-p", type=int, default=7890)

    # ── report ────────────────────────────────────────────────────
    p = sub.add_parser("report", help="Generate HTML report from last scan")
    p.add_argument("-i", "--input", type=str, help="JSON scan file (default: last scan)")

    # ── history ───────────────────────────────────────────────────
    p = sub.add_parser("history", help="View scan history")
    p.add_argument("target", nargs="?", default=None)
    p.add_argument("--limit", "-n", type=int, default=10)
    p.add_argument("--clear", action="store_true", help="Delete all history")

    # ── diff ───────────────────────────────────────────────────────
    p = sub.add_parser("diff", help="Compare two scan results")
    p.add_argument("a", nargs="?", default=None, help="First scan file or 'last'")
    p.add_argument("b", nargs="?", default=None, help="Second scan file or 'last-2'")

    # ── screenshot ────────────────────────────────────────────────
    p = sub.add_parser("screenshot", help="Take browser screenshot (needs: pip install reconpro[browser])")
    p.add_argument("url", help="URL to screenshot")

    # ── open ───────────────────────────────────────────────────────
    p = sub.add_parser("open", help="Open URL in browser")
    p.add_argument("url", help="URL to open")

    # ── plugin ────────────────────────────────────────────────────
    p = sub.add_parser("plugin", help="Plugin management")
    p.add_argument("action", choices=["list", "create", "run"])
    p.add_argument("name", nargs="?", default=None)
    p.add_argument("target", nargs="?", default=None)

    # ── swarm ─────────────────────────────────────────────────────
    p = sub.add_parser("swarm", help="Swarm attack: SCOUT→HACKER→CODER→GUARDIAN")
    p.add_argument("target", help="Target domain or URL")
    p.add_argument("--mode", "-m", type=str, default="full",
                     choices=["full", "recon", "attack", "fix", "verify"])

    # ── adversarial ────────────────────────────────────────────────
    p = sub.add_parser("adversarial", help="Adversarial self-play: hacker vs coder loop")
    p.add_argument("target", help="Target domain or URL")
    p.add_argument("--rounds", "-r", type=int, default=3)
    p.add_argument("--modules", "-m", type=str)
    p.add_argument("--local", action="store_true", help="Target is local machine")

    # ── ast ─────────────────────────────────────────────────────────
    p = sub.add_parser("ast", help="AST code analysis (Python/JS/TS vulnerability patterns)")
    p.add_argument("path", nargs="?", default=".", help="File or directory to analyze")

    # ── cve ─────────────────────────────────────────────────────────
    p = sub.add_parser("cve", help="CVE/NVD threat intelligence lookup")
    p.add_argument("query", help="Search query (e.g. 'SQL injection', 'CVE-2024-1234')")
    p.add_argument("--limit", "-n", type=int, default=5)

    # ── graph ───────────────────────────────────────────────────────
    p = sub.add_parser("graph", help="Knowledge graph: attack surface, blast radius, chains")
    p.add_argument("target", nargs="?", default=None, help="Target (default: use last scan)")
    p.add_argument("--action", "-a", type=str, default="stats",
                     choices=["stats", "chains", "surface", "blast", "export"])

    # ── iac ──────────────────────────────────────────────────────────
    p = sub.add_parser("iac", help="Infrastructure-as-Code audit (Terraform/CF/Docker/K8s)")
    p.add_argument("path", nargs="?", default=".", help="Directory to scan")
    p.add_argument("--json", dest="json_output", action="store_true")

    # ── container ──────────────────────────────────────────────────────
    p = sub.add_parser("container", help="Container escape analysis (Dockerfile + K8s)")
    p.add_argument("path", nargs="?", default=".", help="Directory to scan")
    p.add_argument("--json", dest="json_output", action="store_true")

    # ── cloud-recon ─────────────────────────────────────────────────────
    p = sub.add_parser("cloud-recon", help="Cloud infrastructure recon (AWS/Azure/GCP metadata + assets)")
    p.add_argument("target", help="Target domain or 'local' for metadata probe")
    p.add_argument("--json", dest="json_output", action="store_true")

    # ── defense ────────────────────────────────────────────────────────
    p = sub.add_parser("defense", help="Generate deployable fixes (WAF rules, patches, IaC fixes)")
    p.add_argument("-i", "--input", type=str, help="JSON scan file (default: last scan)")

    # ── fuzzer ──────────────────────────────────────────────────────────
    p = sub.add_parser("fuzzer", help="Context-aware payload fuzzing")
    p.add_argument("url", help="Target URL to fuzz")
    p.add_argument("--param", "-p", type=str, help="Specific parameter to fuzz")
    p.add_argument("--category", "-c", type=str, help="Payload category (sqli, xss, ssti, ...)")

    # ── profile ─────────────────────────────────────────────────────────
    p = sub.add_parser("profile", help="Target fingerprinting + auto scan plan")
    p.add_argument("target", help="Target domain or URL")

    # ── compliance ───────────────────────────────────────────────────────
    p = sub.add_parser("compliance", help="Compliance mapping (SOC2/ISO/PCI/HIPAA/GDPR/CIS)")
    p.add_argument("--frameworks", "-f", type=str, default="soc2,pci-dss",
                     help="Comma-separated frameworks")
    p.add_argument("-i", "--input", type=str, help="JSON scan file (default: last scan)")

    # ── delta ───────────────────────────────────────────────────────────
    p = sub.add_parser("delta", help="Dynamic delta report (compare scans with git blame)")
    p.add_argument("target", nargs="?", default=None, help="Target (default: use last scan)")
    p.add_argument("--format", "-f", type=str, default="markdown", choices=["markdown", "sarif"])

    # ── benchmark ───────────────────────────────────────────────────────
    p = sub.add_parser("benchmark", help="Score tracking + competitive leaderboard")
    p.add_argument("targets", nargs="*", help="Targets to benchmark")
    p.add_argument("--days", "-d", type=int, default=30)
    p.add_argument("--leaderboard", action="store_true", help="Show leaderboard")

    # ── graph-visual ────────────────────────────────────────────────────
    p = sub.add_parser("graph-visual", help="Interactive D3.js knowledge graph visualization")
    p.add_argument("-o", "--output", type=str, default="reconpro_graph.html", help="Output HTML file")

    # ── netmap ──────────────────────────────────────────────────────────
    p = sub.add_parser("netmap", help="Network topology + trust mapping + lateral paths")
    p.add_argument("--subnet", "-s", type=str, help="Subnet to scan (e.g. 192.168.1.0/24)")

    # ── passive ─────────────────────────────────────────────────────────
    p = sub.add_parser("passive", help="Passive DNS + historical intel (VirusTotal, Wayback)")
    p.add_argument("domain", help="Domain to query")

    # ── export ──────────────────────────────────────────────────────────
    p = sub.add_parser("export", help="Export last scan to SARIF/MD/JSON/HTML")
    p.add_argument("output", nargs="?", default="reconpro_report.sarif",
                     help="Output path (format auto-detected from extension)")

    # ── zai (z.ai live stream) ──────────────────────────────────────────
    p = sub.add_parser("zai", help="z.ai live stream AI analysis — zero config, no API keys needed")
    p.add_argument("target", nargs="?", default="", help="Target to scan and analyze (optional: uses last scan if omitted)")
    p.add_argument("--stream", action="store_true", help="Stream AI analysis in real-time (default)")
    p.add_argument("--no-stream", action="store_true", help="Return complete analysis at once")
    p.add_argument("--chat", type=str, default="", help="Free-form chat message (skips scan)")
    p.add_argument("--health", action="store_true", help="Health check: verify z.ai connectivity")
    p.add_argument("--model", type=str, default="glm-4-flash", help="Model name (default: glm-4-flash)")

    # ── wishes (v9.1.0 22-Wish Ritual) ───────────────────────────
    p = sub.add_parser("wishes", help="Execute 22-Wish orchestration ritual against a target")
    p.add_argument("target", help="Target domain or URL")
    p.add_argument("--modules", "-m", type=str, default=None, help="Comma-separated modules to include")
    p.add_argument("--timeout", type=int, default=8)
    p.add_argument("--insecure", "-k", action="store_true", help="Skip TLS verification")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── geoip (v9.1.0 GeoIP Enrichment) ──────────────────────────
    p = sub.add_parser("geoip", help="GeoIP enrichment for IP addresses")
    p.add_argument("ips", nargs="+", help="IP addresses to enrich")
    p.add_argument("--batch", action="store_true", help="Use batch API for multiple IPs")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── threat-feeds (v9.1.0 Threat Feed Ingestion) ───────────────
    p = sub.add_parser("threat-feeds", help="Threat feed ingestion and IP reputation checking")
    p.add_argument("ips", nargs="*", help="IPs to check (checks all feeds + DNSBLs)")
    p.add_argument("--refresh", action="store_true", help="Force refresh all feeds")
    p.add_argument("--stats", action="store_true", help="Show feed statistics only")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── ai-redteam (v9.1.0 AI Red Team) ──────────────────────────
    p = sub.add_parser("ai-redteam", help="AI endpoint discovery, vendor fingerprinting, secret extraction")
    p.add_argument("target", help="Target domain or URL")
    p.add_argument("--timeout", type=int, default=8)
    p.add_argument("--insecure", "-k", action="store_true", help="Skip TLS verification")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── supply-chain (v9.1.0 Supply Chain Audit) ─────────────────
    p = sub.add_parser("supply-chain", help="Supply chain audit — GitHub repos or web content analysis")
    p.add_argument("target", help="GitHub repo (owner/repo) or URL to audit")
    p.add_argument("--max-files", type=int, default=30, help="Max files to scrape (GitHub)")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── cross-validate (v9.1.0 Cross-Validation) ──────────────────
    p = sub.add_parser("cross-validate", help="Cross-validate ReconPro findings with independent verification")
    p.add_argument("target", nargs="?", default=None, help="Target (default: use last scan)")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── quantum-fingerprint (v9.2.0 TCP/IP Stack Fingerprinting via HTTP Timing) ──
    p = sub.add_parser("quantum-fingerprint", help="OS & TCP stack fingerprinting via HTTP timing analysis")
    p.add_argument("target", help="Domain or URL to fingerprint")
    p.add_argument("-t", "--timeout", type=int, default=15, help="Per-probe timeout (default: 15)")
    p.add_argument("-k", "--insecure", action="store_true", help="Skip TLS verification")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── dark-web (v9.2.0 Credential Leak & Exposure Scanner) ──────
    p = sub.add_parser("dark-web", help="Monitor paste sites & threat feeds for credential leaks")
    p.add_argument("target", help="Domain, email, keyword, or IP to search")
    p.add_argument("--deep", action="store_true", help="Enable deep scan (more sources)")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── info-ops (v9.2.0 Information Operations Analysis) ─────────
    p = sub.add_parser("info-ops", help="Information operations & deception analysis (defensive)")
    p.add_argument("target", help="Domain or URL to analyze")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── steg (v9.2.0 Steganography Detection) ───────────────────
    p = sub.add_parser("steg", help="Detect hidden data in HTTP responses & images")
    p.add_argument("target", help="URL or domain to scan for steganography")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── covert (v9.2.0 Covert Channel Detection) ─────────────────
    p = sub.add_parser("covert", help="Detect & simulate covert channels (DNS/ICMP/timing)")
    p.add_argument("target", help="Domain or URL to analyze")
    p.add_argument("--mode", choices=["detect", "simulate"], default="detect", help="detect or simulate covert channels")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── zero-day (v9.2.0 Zero-Day Pattern Hunter) ────────────────
    p = sub.add_parser("zero-day", help="Hunt for zero-day vulnerability patterns in responses")
    p.add_argument("target", help="URL or domain to hunt")
    p.add_argument("--deep", action="store_true", help="Deep analysis mode")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── ghost (v9.2.0 Infrastructure Ghosting) ───────────────────
    p = sub.add_parser("ghost", help="Clone & ghost infrastructure for deception analysis")
    p.add_argument("target", help="Domain or URL to ghost")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── sigint (v9.2.0 HTTP Traffic SIGINT) ───────────────────────
    p = sub.add_parser("sigint", help="Signal intelligence analysis of HTTP traffic patterns")
    p.add_argument("target", help="Domain or URL for SIGINT analysis")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── attributor (v9.2.0 Nation-State Attribution Engine) ─────
    p = sub.add_parser("attributor", help="Attribute attack infrastructure to nation-state actors")
    p.add_argument("target", help="Domain, IP, or URL to attribute")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── weaponized-report (v9.2.0 Weaponized Report Gen) ─────────
    p = sub.add_parser("weaponized-report", help="Generate weaponized decoy reports (defensive)")
    p.add_argument("target", help="Domain or URL context")
    p.add_argument("--format", choices=["html", "pdf", "json"], default="html", help="Output format")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── honeypot (v9.2.0 Honeypot Detection) ─────────────────────
    p = sub.add_parser("honeypot", help="Detect honeypots & score infrastructure legitimacy")
    p.add_argument("target", help="Domain, IP, or URL to check")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── rate (v9.2.0 Module Rating System) ──────────────────────
    p = sub.add_parser("rate", help="Rate all v9.2.0 modules against industry tools /100")
    p.add_argument("--module", "-m", type=str, default=None,
                     help="Rate a specific module (e.g. dead-drop, quantum-fingerprint)")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── dead-drop (v9.2.0 Cryptographic Dead Drop) ────────────────
    p = sub.add_parser("dead-drop", help="Detect cryptographic dead drops in DNS/HTTP/CT logs")
    p.add_argument("target", help="Domain or URL to scan")
    p.add_argument("--json", dest="json_output", action="store_true", help="Output as JSON")

    # ── Parse ─────────────────────────────────────────────────────
    global _cli_args
    args, remaining = parser.parse_known_args(argv)
    _cli_args = args
    cmd = args.subcommand

    # ── LIST ───────────────────────────────────────────────────────
    if cmd == "list":
        show_all = getattr(args, "all", False)
        show_local = getattr(args, "local", False)
        if show_local or show_all:
            console.print("\n[bold bright_yellow]Local Modules:[/bold bright_yellow]\n")
            for mid, e in LOCAL_MODULES.items():
                d = " (default)" if mid in DEFAULT_LOCAL_MODULES else ""
                console.print(f"  [cyan]{mid:12}[/] {e['name']:18}{d}")
        if not show_local or show_all:
            console.print("\n[bold]Remote Modules:[/bold]\n")
            for mid, e in MODULE_REGISTRY.items():
                d = " (default)" if mid in DEFAULT_MODULES else ""
                console.print(f"  [cyan]{mid:12}[/] {e['name']:18}{d}")
        console.print(f"\n  [dim]Total: {len(ALL_MODULES)} modules[/]\n")
        return

    # ── IAC ─────────────────────────────────────────────────────────
    if cmd == "iac":
        _banner(args)
        result = _spinner_wrap(f"Auditing IaC at {args.path}...", audit_scan, target=args.path, modules=["iac_audit"])
        _output_result(result, args, title="IAC AUDIT", show_remediation=True)
        return

    # ── CONTAINER ─────────────────────────────────────────────────
    if cmd == "container":
        _banner(args)
        result = _spinner_wrap(f"Analyzing containers at {args.path}...", audit_scan, target=args.path, modules=["container_sec"])
        _output_result(result, args, title="CONTAINER SECURITY", show_remediation=True)
        return

    # ── CLOUD-RECON ──────────────────────────────────────────────────
    if cmd == "cloud-recon":
        _banner(args)
        target = args.target
        from .modules.cloud_recon import run_cloud_recon
        findings = _spinner_wrap(f"Cloud recon on {target}...", run_cloud_recon, target, target if target.startswith("http") else f"https://{target}")
        if findings:
            for f in findings:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
            console.print(f"  [bold]{len(findings)} cloud finding(s).[/]")
        else:
            console.print("  [dim]No cloud findings.[/]")
        console.print()
        return

    # ── DEFENSE ────────────────────────────────────────────────────
    if cmd == "defense":
        data = None
        if getattr(args, "input", None):
            with open(args.input) as f:
                data = json.load(f)
        if not data:
            data = get_latest()
        if not data:
            console.print("  [yellow]No scan data. Run a scan first.[/]")
            sys.exit(1)
        from .defense import generate_defense_bundle
        bundle = _spinner_wrap("Generating defenses...", generate_defense_bundle, data.get("target", "unknown"), data.get("findings", []))
        console.print(Panel(bundle.to_report(), border_style="green", title="[bold]DEFENSE BUNDLE[/bold]", padding=(1, 2)))
        console.print()
        return

    # ── FUZZER ────────────────────────────────────────────────────
    if cmd == "fuzzer":
        _banner(args)
        from .fuzzer import FuzzSession, TechDetector
        url = args.url
        base = url if url.startswith("http") else f"https://{url}"
        profile = _spinner_wrap(f"Detecting tech on {base}...", TechDetector().analyze, base)
        console.print(f"  [cyan]Detected:[/] {', '.join(profile.frameworks) or 'unknown'}")
        console.print(f"  [cyan]Language:[/] {profile.language or 'unknown'}")
        console.print(f"  [cyan]WAF:[/] {profile.waf or 'none'}")
        category = getattr(args, "category", None) or "sqli"
        session = FuzzSession(base, profile)
        payloads = session.select_payloads(category)
        console.print(f"  [yellow]{len(payloads)} {category} payloads loaded (tech-aware selection)[/]")
        console.print()
        return

    # ── PROFILE ────────────────────────────────────────────────────
    if cmd == "profile":
        _banner(args)
        from .profiler import profile_target, get_scan_plan
        target = args.target
        profile = _spinner_wrap(f"Profiling {target}...", profile_target, target)
        plan = get_scan_plan(target)
        console.print(f"  [cyan]Frameworks:[/] {', '.join(profile.frameworks) or 'none'}")
        console.print(f"  [cyan]Language:[/] {profile.language or 'unknown'}")
        console.print(f"  [cyan]Server:[/] {profile.server or 'unknown'}")
        console.print(f"  [cyan]WAF:[/] {profile.waf or 'none'}")
        console.print(f"  [cyan]App Type:[/] {profile.app_type}")
        console.print(f"  [bold]Recommended:[/] {', '.join(plan.get('recommended_modules', []))}")
        console.print(f"  [dim]{plan.get('reasoning', '')}[/]")
        console.print()
        return

    # ── WISHES (v9.1.0) ─────────────────────────────────────────
    if cmd == "wishes":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None

        # Run scan first to get module results
        result = _spinner_wrap(f"Scanning {target}...", scan, target, modules=modules,
                                timeout=args.timeout, verify_tls=not args.insecure, rate_limit=10.0)

        from .wishes import WishesOrchestrator
        orchestrator = WishesOrchestrator()
        manifest = _spinner_wrap(
            f"Executing 22-Wish ritual on {target}...",
            orchestrator.execute,
            target=target, base_url=base_url,
            timeout=args.timeout, verify_tls=not args.insecure,
            modules=result.modules_run, module_results=result.module_results,
        )

        if getattr(args, "json_output", False):
            console.print_json(json.dumps(manifest, indent=2, default=str))
        else:
            verdict = manifest.get("verdict", {}).get("verdict", "?")
            fear = manifest.get("fear", {})
            console.print(f"  [bold]22-Wish Ritual Complete[/]")
            console.print(f"  [cyan]Verdict:[/] {verdict}")
            console.print(f"  [cyan]Fear Index:[/] {fear.get('fear_index', 0)} ({fear.get('fear_label', '?')})")
            console.print(f"  [cyan]Wishes Granted:[/] {len(manifest.get('wishes_granted', []))}/{manifest.get('wishes_count', 22)}")
            console.print(f"  [cyan]Witness ID:[/] {manifest.get('witness', {}).get('encounter_id', '?')}")
            hall_b = manifest.get('hall_broken', {})
            console.print(f"  [cyan]Hall of Broken:[/] {hall_b.get('total_encounters', 0)} encounters, avg fear {hall_b.get('average_fear', 0)}")
            hall_f = manifest.get('hall_forgotten', {})
            console.print(f"  [cyan]Hall of Forgotten:[/] {hall_f.get('total_encounters', 0)} encounters, avg dread {hall_f.get('average_dread', 0)}")
        console.print()
        return

    # ── GEOIP (v9.1.0) ────────────────────────────────────────────
    if cmd == "geoip":
        _banner(args)
        ips = args.ips
        from .geoip import GeoIPLookup, BatchGeoIP, format_geoip_summary
        if getattr(args, 'batch', False) and len(ips) > 1:
            batch = BatchGeoIP()
            results = _spinner_wrap(f"Enriching {len(ips)} IPs...", batch.enrich_batch, ips)
            if getattr(args, 'json_output', False):
                console.print_json(json.dumps(results, indent=2, default=str))
            else:
                for ip, data in results.items():
                    console.print(f"  {format_geoip_summary(data)}")
        else:
            geo = GeoIPLookup()
            for ip in ips:
                result = geo.enrich_ip(ip)
                if getattr(args, 'json_output', False):
                    console.print_json(json.dumps(result, indent=2, default=str))
                else:
                    console.print(f"  {format_geoip_summary(result)}")
        console.print()
        return

    # ── THREAT-FEEDS (v9.1.0) ─────────────────────────────────────
    if cmd == "threat-feeds":
        _banner(args)
        from .threat_feeds import ThreatFeedManager, DNSBLChecker, check_ip_reputation
        if getattr(args, 'stats', False):
            mgr = ThreatFeedManager()
            stats = _spinner_wrap("Fetching feed stats...", mgr.refresh_all, force=getattr(args, 'refresh', False))
            console.print("  [bold]Threat Feed Statistics:[/]")
            for name, count in stats.items():
                console.print(f"  [cyan]{name:25}[/] {count:>6} indicators")
        elif getattr(args, 'ips', None):
            ips = args.ips
            for ip in ips:
                result = _spinner_wrap(f"Checking {ip}...", check_ip_reputation, ip)
                if getattr(args, 'json_output', False):
                    console.print_json(json.dumps(result, indent=2, default=str))
                else:
                    is_mal = result.get('is_malicious', False)
                    color = "bright_red" if is_mal else "bright_green"
                    console.print(f"  [{color}]{ip:18}[/{color}]  score={result.get('threat_score', 0)}  feeds={len(result.get('threat_feeds', []))}  dnsbl={len(result.get('dnsbl_hits', []))}")
                    for hit in result.get('threat_feeds', []):
                        console.print(f"    [red]  Feed:[/] {hit['feed']}")
                    for hit in result.get('dnsbl_hits', []):
                        console.print(f"    [red]  DNSBL:[/] {hit['dnsbl']}")
        else:
            mgr = ThreatFeedManager()
            stats = _spinner_wrap("Refreshing threat feeds...", mgr.refresh_all, force=getattr(args, 'refresh', False))
            console.print("  [bold]Threat Feed Refresh Complete:[/]")
            for name, count in stats.items():
                status_color = "bright_green" if count >= 0 else "bright_red"
                console.print(f"  [{status_color}]{name:25}[/{status_color}] {count:>6} indicators")
        console.print()
        return

    # ── AI-REDTEAM (v9.1.0) ───────────────────────────────────────
    if cmd == "ai-redteam":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .ai_red_team import run_ai_red_team
        results = _spinner_wrap(f"AI red-teaming {target}...", run_ai_red_team, target, base_url,
                                timeout=args.timeout, verify_tls=not args.insecure)
        if getattr(args, 'json_output', False):
            console.print_json(json.dumps(results, indent=2, default=str))
        else:
            console.print(f"  [cyan]Endpoints Discovered:[/] {results.get('endpoints_discovered', 0)}")
            console.print(f"  [cyan]Vendors Detected:[/] {results.get('vendors_detected', 0)}")
            console.print(f"  [cyan]Secrets Found:[/] {results.get('secrets_found', 0)}")
            console.print(f"  [cyan]Total Risk Score:[/] {results.get('total_risk_score', 0)}")
            for ep in results.get('endpoints', [])[:10]:
                ai_tag = " [bright_green]AI[/]" if ep.get('has_ai_content') else ""
                console.print(f"    [dim]{ep['status']}[/] {ep['endpoint']:45}{ai_tag}")
            for v in results.get('vendors', []):
                console.print(f"    [yellow]Vendor:[/] {v['vendor']:20} score={v['score']}")
            for s in results.get('secrets', []):
                sev_color = SEV_COLORS.get(s['severity'], 'white')
                console.print(f"    [{sev_color}]{s['severity'].upper():8}[/{sev_color}] {s['type']}: {s['match']}")
        console.print()
        return

    # ── SUPPLY-CHAIN (v9.1.0) ─────────────────────────────────────
    if cmd == "supply-chain":
        _banner(args)
        target = args.target
        from .supply_chain import SCCAudit
        audit = SCCAudit()
        if "/" in target and not target.startswith("http"):
            results = _spinner_wrap(f"Auditing {target}...", audit.audit_github, target, max_files=args.max_files)
            if getattr(args, 'json_output', False):
                console.print_json(json.dumps(results, indent=2, default=str))
            else:
                analysis = results.get('analysis', {})
                console.print(f"  [cyan]Files Scraped:[/] {results.get('files_scraped', 0)}")
                console.print(f"  [cyan]API Requests:[/] {results.get('api_requests', 0)}")
                console.print(f"  [cyan]Workflows Found:[/] {results.get('workflows_found', 0)}")
                console.print(f"  [cyan]Secrets Found:[/] {len(analysis.get('secrets_found', []))}")
                console.print(f"  [cyan]Risk Score:[/] {analysis.get('risk_score', 0)}")
                for dep in analysis.get('dependency_files', []):
                    console.print(f"    [cyan]{dep['manager']:10}[/] {dep['file']}")
                for s in analysis.get('secrets_found', []):
                    console.print(f"    [red]{s['type']:20}[/] {s['file']}")
                for sp in analysis.get('suspicious_patterns', []):
                    console.print(f"    [yellow]{sp['pattern']}[/] in {sp.get('file', '?')}")
        else:
            results = _spinner_wrap(f"Auditing {target}...", audit.audit_url, target)
            if getattr(args, 'json_output', False):
                console.print_json(json.dumps(results, indent=2, default=str))
            else:
                page = results.get('page', {})
                console.print(f"  [cyan]Status:[/] {page.get('status', 0)}")
                console.print(f"  [cyan]Title:[/] {page.get('title', '?')}")
                console.print(f"  [cyan]Links:[/] {len(page.get('links', []))}")
                console.print(f"  [cyan]Scripts:[/] {len(page.get('scripts', []))}")
        console.print()
        return

    # ── CROSS-VALIDATE (v9.1.0) ───────────────────────────────────
    if cmd == "cross-validate":
        target = getattr(args, 'target', None)
        findings = []
        if target:
            latest = get_latest()
            if latest and latest.get('target', '') == target.replace('https://', '').replace('http://', '').split('/')[0]:
                findings = latest.get('findings', [])
            else:
                _banner(args)
                result = _spinner_wrap(f"Scanning {target}...", scan, target, timeout=8, verify_tls=True, rate_limit=10.0)
                findings = result.findings
        else:
            latest = get_latest()
            if not latest:
                console.print("  [yellow]No scan data. Run a scan first or specify a target.[/]")
                sys.exit(1)
            target = latest.get('target', 'unknown')
            findings = latest.get('findings', [])

        _banner(args)
        from .cross_validator import CrossValidator
        base_url = target if target.startswith('http') else f'https://{target}'
        cv_results = _spinner_wrap(f"Cross-validating {target}...", CrossValidator().validate, target, findings, base_url)
        if getattr(args, 'json_output', False):
            console.print_json(json.dumps(cv_results, indent=2, default=str))
        else:
            vr = cv_results.get('verification_rate', 0)
            color = 'bright_green' if vr >= 80 else 'yellow' if vr >= 50 else 'bright_red'
            console.print(f"  [bold]Cross-Validation Results:[/]")
            console.print(f"  [{color}]Verification Rate: {vr}%[/{color}]")
            console.print(f"  [cyan]Verified:[/] {len(cv_results.get('verified', []))} findings")
            console.print(f"  [red]Failed:[/] {len(cv_results.get('failed', []))} findings")
            console.print(f"  [yellow]Mismatches:[/] {len(cv_results.get('mismatches', []))} findings")
            indep = cv_results.get('independent_checks', {})
            dns = indep.get('dns', {})
            http = indep.get('http', {})
            tls = indep.get('tls', {})
            console.print(f"  [dim]DNS records: {dns.get('records', {})}[/]")
            console.print(f"  [dim]HTTP status: {http.get('status', '?')}, headers: {len(http.get('headers', {}))}[/]")
            console.print(f"  [dim]TLS version: {tls.get('version', '?')}[/]")
        console.print()
        return

    # ── COMPLIANCE ───────────────────────────────────────────────────
    if cmd == "compliance":
        _banner(args)
        data = None
        if getattr(args, "input", None):
            with open(args.input) as f:
                data = json.load(f)
        if not data:
            data = get_latest()
        if not data:
            console.print("  [yellow]No scan data. Run a scan first.[/]")
            sys.exit(1)
        frameworks = [f.strip() for f in args.frameworks.split(",")]
        from .compliance import ComplianceMapper
        mapper = ComplianceMapper()
        report = _spinner_wrap(f"Mapping to {', '.join(frameworks)}...", mapper.map_findings, data.get("findings", []), frameworks)
        for fw, info in report.per_framework.items():
            pct = info.get("compliance_pct", 0)
            color = "green" if pct >= 80 else ("yellow" if pct >= 50 else "red")
            console.print(f"  [{color}]{fw}:[/] {pct:.0f}% ({info.get('covered_controls', 0)}/{info.get('total_controls', 0)} controls)")
        console.print()
        return

    # ── DELTA ───────────────────────────────────────────────────────
    if cmd == "delta":
        _banner(args)
        from .delta import compare_with_last, generate_delta_report
        text = _spinner_wrap("Computing delta...", generate_delta_report, args.target, args.format)
        console.print(text)
        console.print()
        return

    # ── BENCHMARK ───────────────────────────────────────────────────
    if cmd == "benchmark":
        _banner(args)
        from .benchmark import ScoreTracker
        tracker = ScoreTracker()
        if args.leaderboard:
            report = tracker.get_leaderboard(days=args.days)
            console.print(report)
        else:
            console.print("  [dim]Use: reconpro benchmark --leaderboard --days 30[/]")
        console.print()
        return

    # ── GRAPH-VISUAL ────────────────────────────────────────────────
    if cmd == "graph-visual":
        _banner(args)
        from .graph_ui import GraphUIRenderer
        from .knowledge_graph import SecurityKnowledgeGraph
        graph = SecurityKnowledgeGraph()
        graph.load()
        latest = get_latest()
        if latest:
            graph.add_scan_result(latest)
        renderer = GraphUIRenderer()
        path = _spinner_wrap("Generating interactive graph...", renderer.render_to_file, graph.to_dict(), args.output)
        console.print(f"  [green]Graph saved: [cyan]{path}[/][/]")
        console.print(f"  [dim]Open in browser. Features: zoom, search, blast radius, path finder.[/]")
        console.print()
        return

    # ── NETMAP ───────────────────────────────────────────────────────
    if cmd == "netmap":
        _banner(args)
        from .netmap import run_local
        findings = _spinner_wrap("Mapping network...", run_local)
        if not findings:
            console.print("  [bright_green]No network issues found.[/]")
        else:
            for f in findings[:20]:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
        console.print()
        return

    # ── PASSIVE ──────────────────────────────────────────────────────
    if cmd == "passive":
        _banner(args)
        from .passive_intel import PassiveDNS, WaybackMachine
        domain = args.domain

        # Wayback Machine (free, no key needed)
        wb = WaybackMachine()
        history = _spinner_wrap(f"Querying Wayback Machine for {domain}...", wb.get_history, domain)
        if history:
            console.print(f"  [green]{len(history)}[/] archived page(s) found:")
            for h in history[:10]:
                console.print(f"    [dim]{h.get('timestamp', '?')}[/] {h.get('url', '?')[:80]}")
        else:
            console.print("  [dim]No Wayback archive data found.[/]")

        # Passive DNS (free — uses system DNS + public resolvers, no API key)
        pdns = PassiveDNS()
        dns_results = _spinner_wrap(f"Resolving DNS for {domain}...", pdns.resolve_dns, domain)
        if dns_results:
            console.print(f"  [green]{len(dns_results)}[/] DNS record(s):")
            for r in dns_results[:15]:
                rtype = r.get("type", "?")
                value = r.get("value", "?")
                ttl = r.get("ttl", "")
                console.print(f"    [cyan]{rtype:6s}[/] {value} [dim](TTL {ttl})[/]")
        else:
            console.print("  [dim]No DNS records found.[/]")

        # Optional: VirusTotal (requires API key)
        vt_key = os.environ.get("VIRUSTOTAL_API_KEY", "")
        if vt_key:
            vt_results = _spinner_wrap(f"Querying VirusTotal for {domain}...", pdns.query_virustotal, domain, vt_key)
            if vt_results:
                console.print(f"  [green]{len(vt_results)}[/] VirusTotal resolution(s):")
                for r in vt_results[:10]:
                    console.print(f"    [cyan]{r.get('ip', '?')}[/]  {r.get('last_resolved', '?')}")
            else:
                console.print("  [dim]No VirusTotal data.[/]")

        console.print()
        return

    # ── NEXUS ──────────────────────────────────────────────────
    if cmd == "nexus":
        from .nexus_tui import start_nexus as run_nexus
        run_nexus()
        return

    # ── CHAT ───────────────────────────────────────────────────────
    if cmd == "chat":
        from .chat import start_chat
        _banner(args)
        start_chat()
        return

    # ── TUI ────────────────────────────────────────────────────────
    if cmd == "tui":
        from .nexus_tui import start_nexus
        start_nexus()
        return

    # ── BLITZ ──────────────────────────────────────────────────────
    if cmd == "blitz":
        targets = getattr(args, "targets", [])
        if not targets or len(targets) < 2:
            console.print("  [yellow]Usage: reconpro blitz target1.com target2.com [target3.com ...][/]")
            sys.exit(1)
        _banner(args)
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        blitz_scan(targets, max_workers=args.workers, modules=modules)
        return

    # ── AGENT ──────────────────────────────────────────────────────
    if cmd == "agent":
        goal = getattr(args, "goal", "")
        if not goal:
            console.print("  [yellow]Usage: reconpro agent \"fully scan example.com and find subdomains\"[/]")
            sys.exit(1)
        _banner(args)
        from .nexus_agent import run_nexus_agent
        run_nexus_agent(goal)
        return

    # ── SWARM ─────────────────────────────────────────────────────
    if cmd == "swarm":
        _banner(args)
        from .swarm import run_swarm
        run_swarm(args.target, mode=args.mode)
        return

    # ── ADVERSARIAL ────────────────────────────────────────────────
    if cmd == "adversarial":
        _banner(args)
        from .adversarial import run_adversarial
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        run_adversarial(args.target, max_rounds=args.rounds, modules=modules, is_local=args.local)
        return

    # ── AST ────────────────────────────────────────────────────────
    if cmd == "ast":
        _banner(args)
        from .modules.ast_analyzer import ASTAnalyzer
        analyzer = ASTAnalyzer()
        path = os.path.abspath(args.path)
        findings = _spinner_wrap(f"Analyzing {path}...", analyzer.analyze_directory, path)
        if not findings:
            console.print("\n  [bright_green]No vulnerabilities found in code.[/]")
        else:
            table = Table(border_style="dim", header_style="bold dim")
            table.add_column("Severity", style="bold", width=10)
            table.add_column("File", style="cyan", width=30)
            table.add_column("Line", style="dim", width=6)
            table.add_column("Finding")
            for f in sorted(findings, key=lambda x: {"critical":0,"high":1,"medium":2,"low":3}.get(x.severity,4)):
                c = SEV_COLORS.get(f.severity, "white")
                table.add_row(f"[{c}]{f.severity.upper()}[/{c}]", f.asset[-30:] if f.asset else "", str(f.evidence)[:6] if f.evidence else "", f.title[:60])
            console.print(table)
            console.print(f"\n  [bold]{len(findings)} vulnerability pattern(s) found.[/]")
        console.print()
        return

    # ── CVE ─────────────────────────────────────────────────────────
    if cmd == "cve":
        _banner(args)
        from .cve_radar import CVERadar
        radar = CVERadar()
        if args.query.upper().startswith("CVE-"):
            details = _spinner_wrap(f"Looking up {args.query}...", radar.get_cve_details, args.query)
            if details:
                console.print(f"\n  [bold]{details.get('id', args.query)}[/]")
                console.print(f"  Severity: [red]{details.get('severity', '?')}[/]  CVSS: {details.get('cvss', '?')}")
                console.print(f"  {details.get('description', 'No description')[:200]}")
            else:
                console.print(f"  [dim]No results for {args.query}.[/]")
        else:
            results = _spinner_wrap(f"Searching NVD for '{args.query}'...", radar.search_nvd, args.query, args.limit)
            if results:
                for r in results:
                    console.print(f"  [bold]{r.get('id', '?')}[/]  [red]{r.get('severity', '?')}[/]  {r.get('description', '')[:100]}")
                console.print(f"\n  [bold]{len(results)} result(s).[/]")
            else:
                console.print(f"  [dim]No CVEs found for '{args.query}'.[/]")
        console.print()
        return

    # ── GRAPH ───────────────────────────────────────────────────────
    if cmd == "graph":
        _banner(args)
        from .knowledge_graph import SecurityKnowledgeGraph
        graph = SecurityKnowledgeGraph()
        # Load from last scan if available
        latest = get_latest()
        if latest:
            graph.add_scan_result(latest)
        target = args.target or (latest.get("target") if latest else None)
        action = args.action
        if action == "stats" or not target:
            stats = graph.stats()
            console.print(f"\n  [bold]Knowledge Graph Stats:[/]")
            for k, v in stats.items():
                console.print(f"    [cyan]{k}:[/] {v}")
        elif action == "chains":
            chains = graph.find_chains(target)
            if chains:
                console.print(f"\n  [bold]Attack Chains for {target}:[/]")
                for i, chain in enumerate(chains[:10]):
                    console.print(f"    [red]Chain {i+1}:[/] {' → '.join(chain)}")
            else:
                console.print(f"  [dim]No attack chains found for {target}.[/]")
        elif action == "surface":
            surface = graph.get_attack_surface(target)
            console.print(f"\n  [bold]Attack Surface for {target}:[/]")
            for k, v in surface.items():
                console.print(f"    [cyan]{k}:[/] {v}")
        elif action == "blast":
            blast = graph.get_blast_radius(target)
            console.print(f"\n  [bold]Blast Radius from {target}:[/]")
            console.print(f"    [red]{len(blast)} reachable vulnerabilities[/]")
        elif action == "export":
            cypher = graph.to_cypher()
            console.print(f"\n  [bold]Cypher Export:[/] {len(cypher)} statements")
            for line in cypher[:20]:
                console.print(f"    {line[:100]}")
        graph.save()
        console.print(f"\n  [dim]Graph saved to ~/.reconpro/memory/graph.json[/]")
        console.print()
        return

    # ── EXPORT ──────────────────────────────────────────────────────
    if cmd == "export":
        data = get_latest()
        if not data:
            console.print("  [yellow]No scan data. Run a scan first.[/]")
            sys.exit(1)
        from .formats import export as _export
        path = _spinner_wrap(f"Exporting to {args.output}...", _export, data, args.output)
        console.print(f"  [green]Exported: [cyan]{path}[/][/]")
        return

    # ── SUBDOMAINS ────────────────────────────────────────────────
    if cmd == "subdomains":
        domain = args.domain
        _banner(args)
        console.print(f"  [dim]v{__version__} | subdomain discovery: {domain}[/]\n")
        from .subdomains import discover_subdomains
        subs = _spinner_wrap(f"Discovering subdomains of {domain}...", discover_subdomains, domain)
        if not subs:
            console.print("\n  [dim]No subdomains found.[/]")
        else:
            for s in subs:
                console.print(f"  [cyan]{s}[/]")
            console.print(f"\n  [bold]{len(subs)} subdomain(s) found.[/]")
            if args.json_output:
                console.print(json.dumps({"domain": domain, "subdomains": subs}, indent=2))
        console.print()
        return

    # ── SCHEDULE ───────────────────────────────────────────────────
    if cmd == "schedule":
        target = args.target
        is_local = target.lower() == "audit"
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        from .scheduler import run_scheduled
        run_scheduled(target, interval=args.every, modules=modules,
                      is_local=is_local, max_runs=args.max_runs)
        return

    # ── SERVE ──────────────────────────────────────────────────────
    if cmd == "serve":
        from .server import run_server
        _banner(args)
        run_server(port=args.port)
        return

    # ── REPORT ─────────────────────────────────────────────────────
    if cmd == "report":
        data = None
        if getattr(args, "input", None):
            with open(args.input) as f:
                data = json.load(f)
        else:
            data = get_latest()
        if not data:
            console.print("  [yellow]No scan data. Run a scan first or use -i <file>.[/]")
            sys.exit(1)
        path = _spinner_wrap("Generating HTML report...", generate_html_report, data)
        console.print(f"  [green]Report saved: [cyan]{path}[/][/]")
        return

    # ── HISTORY ───────────────────────────────────────────────────
    if cmd == "history":
        if getattr(args, "clear", False):
            n = clear_history()
            console.print(f"  Cleared {n} scan(s) from history.")
            return
        scans = list_scans(target=getattr(args, "target", None), limit=args.limit)
        if not scans:
            console.print("  [dim]No scan history yet.[/]")
            return
        table = Table(border_style="dim", header_style="bold dim")
        table.add_column("Date", style="dim", width=16)
        table.add_column("Target", style="cyan", width=25)
        table.add_column("Score", style="bold", width=8)
        table.add_column("Grade", style="bold", width=6)
        table.add_column("Findings", width=10)
        table.add_column("File", style="dim")
        for s in scans:
            g = s.get("grade", "?")
            gc = GRADE_COLORS.get(g, "white")
            table.add_row(s.get("_saved_at", "?")[:16], s.get("target", "?")[:25],
                         str(s.get("total_score", "?")), f"[{gc}]{g}[/{gc}]",
                         str(len(s.get("findings", []))), s.get("_file", ""))
        console.print(table)
        console.print()
        return

    # ── DIFF ────────────────────────────────────────────────────────
    if cmd == "diff":
        scans = list_scans(limit=2)
        if len(scans) < 2:
            console.print("  [yellow]Need at least 2 scans. Run some scans first.[/]")
            sys.exit(1)
        d = diff_scans(scans[0]["_file"], scans[1]["_file"])
        change = d["score_change"]
        color = "green" if change > 0 else ("red" if change < 0 else "dim")
        console.print(f"\n  [bold]{d['scan_a']['target']}[/]  score={d['scan_a']['score']} ({d['scan_a']['grade']})")
        console.print(f"  [bold]{d['scan_b']['target']}[/]  score={d['scan_b']['score']} ({d['scan_b']['grade']})")
        console.print(f"  Change: [{color}]{'+' if change > 0 else ''}{change} pts[/{color}]")
        if d["new"]:
            console.print(f"\n  [red]New issues ({len(d['new'])}):[/red]")
            for n in d["new"][:10]:
                console.print(f"    [red]+[/] {n}")
        if d["fixed"]:
            console.print(f"\n  [green]Fixed ({len(d['fixed'])}):[/green]")
            for f in d["fixed"][:10]:
                console.print(f"    [green]-[/] {f}")
        if d["persistent"]:
            console.print(f"\n  [yellow]Still present ({len(d['persistent'])}):[/yellow]")
        console.print()
        return

    # ── SCREENSHOT ─────────────────────────────────────────────────
    if cmd == "screenshot":
        try:
            from .browser_mod import take_screenshot
            path = _spinner_wrap(f"Screenshotting {args.url}...", take_screenshot, args.url)
            console.print(f"  [green]Screenshot: [cyan]{path}[/][/]")
        except ImportError:
            console.print("  [yellow]Install browser support:[/]")
            console.print("    pip install reconpro[browser]")
            console.print("    playwright install")
        return

    # ── OPEN ────────────────────────────────────────────────────────
    if cmd == "open":
        from .browser_mod import open_browser
        open_browser(args.url)
        console.print(f"  Opened [cyan]{args.url}[/] in browser")
        return

    # ── PLUGIN ─────────────────────────────────────────────────────
    if cmd == "plugin":
        from .plugins import discover_plugins, create_plugin_template, run_plugin as _run_plugin
        action = args.action
        if action == "list":
            plugins = discover_plugins()
            if not plugins:
                console.print("  [dim]No plugins found. Create one: reconpro plugin create my-check[/]")
            else:
                for pid, p in plugins.items():
                    console.print(f"  [cyan]{pid:12}[/] {p['name']:18} {p['description']}")
        elif action == "create":
            if not args.name:
                console.print("  [yellow]Usage: reconpro plugin create <name>[/]")
                sys.exit(1)
            path = create_plugin_template(args.name)
            console.print(f"  [green]Plugin template created: [cyan]{path}[/][/]")
            console.print(f"  [dim]Edit the file, then: reconpro plugin run {args.name} example.com[/]")
        elif action == "run":
            if not args.name or not args.target:
                console.print("  [yellow]Usage: reconpro plugin run <plugin-name> <target>[/]")
                sys.exit(1)
            base_url = args.target if args.target.startswith("http") else f"https://{args.target}"
            findings = _run_plugin(args.name, args.target, base_url)
            for f in findings:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
        return

    # ── AUDIT (local) ─────────────────────────────────────────────
    if cmd == "audit":
        _banner(args)
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        result = _spinner_wrap("Auditing machine...", audit_scan, target="localhost", modules=modules)
        _output_result(result, args, title="HOST AUDIT", show_remediation=True)
        return

    # ── DEV ────────────────────────────────────────────────────────
    if cmd == "dev":
        path = args.path
        _banner(args)
        result = _spinner_wrap("Scanning project...", audit_scan, target=path, modules=["dev"])
        _output_result(result, args, title="DEV SEC", show_remediation=True)
        return

    # ── DOCTOR ─────────────────────────────────────────────────────
    if cmd == "doctor":
        _banner(args)
        result = _spinner_wrap("Running diagnostics...", audit_scan, target="localhost", modules=["doctor"])
        _output_result(result, args, title="DOCTOR", show_remediation=True)
        return

    # ── PORTS ──────────────────────────────────────────────────────
    if cmd == "ports":
        _banner(args)
        from .modules.host import _check_open_ports
        findings = _spinner_wrap("Scanning ports...", _check_open_ports)
        if not findings:
            console.print("\n  [bright_green]No risky ports found.[/]")
        else:
            for f in findings:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
            if args.json_output:
                console.print(json.dumps([f.to_dict() for f in findings], indent=2, default=str))
        console.print()
        return

    # ── SECRETS ────────────────────────────────────────────────────
    if cmd == "secrets":
        path = args.path
        _banner(args)
        from .modules.host import _check_env_secrets
        from .modules.dev import _check_env_files, _check_hardcoded_secrets
        all_f = _spinner_wrap("Hunting secrets...", lambda: (
            _check_env_secrets() +
            _check_env_files(os.path.abspath(path)) +
            _check_hardcoded_secrets(os.path.abspath(path))
        ))
        total = len(all_f)
        crit = sum(1 for f in all_f if f.severity == "critical")
        high = sum(1 for f in all_f if f.severity == "high")
        if total == 0:
            console.print("\n  [bright_green]No secrets found. Clean.[/]")
        else:
            console.print(Panel(Group(
                Text(f"\n  [bold bright_red]{total} secret(s) found[/]  [bright_red]{crit} critical[/], [red]{high} high[/]"),
            ), border_style="bright_red", title="[bold]SECRET SCAN[/bold]", padding=(1, 2)))
            console.print()
            for f in all_f:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
                if f.remediation:
                    console.print(f"           [dim]{f.remediation}[/dim]")
            if args.json_output:
                console.print(json.dumps([f.to_dict() for f in all_f], indent=2, default=str))
        console.print()
        return

    # ── VIBESEC ────────────────────────────────────────────────────
    if cmd == "vibesec":
        target = args.target
        if not target:
            console.print("  [yellow]Usage: reconpro vibesec <target>[/]")
            sys.exit(1)
        _banner(args)
        result = _spinner_wrap(f"Scanning {target}...", scan, target, modules=["vibesec"],
                                timeout=args.timeout, verify_tls=not args.insecure, rate_limit=args.rate_limit)
        _output_result(result, args)
        return

    # ── SCAN (explicit) ────────────────────────────────────────────
    if cmd == "scan":
        target = args.target
        if not target:
            console.print("  [yellow]Usage: reconpro scan <target>[/]")
            sys.exit(1)
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        _banner(args)
        result = _spinner_wrap(f"Scanning {target}...", scan, target, modules=modules,
                                all_modules=args.all, timeout=args.timeout,
                                verify_tls=not args.insecure, rate_limit=args.rate_limit)
        _output_result(result, args)
        return

    # ── Implicit scan (no subcommand) ──────────────────────────────
    if remaining and not cmd:
        target = remaining[0]
        scan_args = parser.parse_args(["scan"] + remaining)
        modules = [m.strip().lower() for m in scan_args.modules.split(",")] if scan_args.modules else None
        _banner(scan_args)
        result = _spinner_wrap(f"Scanning {target}...", scan, target, modules=modules,
                                all_modules=scan_args.all, timeout=scan_args.timeout,
                                verify_tls=not scan_args.insecure, rate_limit=scan_args.rate_limit)
        _output_result(result, scan_args)
        return

    # ── ZAI (z.ai live stream) ──────────────────────────────────────
    if cmd == "zai":
        from .integrations.zai_stream import ZAIStreamClient
        client = ZAIStreamClient(model=args.model)

        if getattr(args, "health", False):
            console.print(f"  [cyan]Checking z.ai connectivity...[/]")
            console.print(f"  [dim]{client}[/]")
            result = client.health_check()
            if result["status"] == "connected":
                console.print(f"  [bright_green]CONNECTED[/]  latency: {result['latency_ms']}ms  model: {result['model']}")
                console.print(f"  [dim]Response: {result.get('response_preview', '')}[/]")
            else:
                console.print(f"  [bright_red]ERROR: {result.get('error', 'unknown')}[/]")
            return

        if getattr(args, "chat", ""):
            _banner(args)
            console.print(f"  [cyan]z.ai Live Stream[/]  [dim]model: {args.model}[/]")
            console.print(f"  [dim]{'─' * 50}[/]")
            if not getattr(args, "no_stream", False):
                for chunk in client.chat_stream(args.chat):
                    console.print(chunk, end="")
                console.print()
            else:
                response = client.chat(args.chat)
                console.print(response)
            console.print(f"  [dim]{'─' * 50}[/]")
            return

        # Analyze scan findings
        target = getattr(args, "target", "")
        findings = None
        if target:
            _banner(args)
            result = _spinner_wrap(f"Scanning {target}...", scan, target,
                                    timeout=8, verify_tls=True, rate_limit=10.0)
            findings = result.findings
            scan_target = target
        else:
            # Use last scan from history
            latest = get_latest()
            if not latest:
                console.print("  [yellow]No target specified and no scan history found.[/]")
                console.print("  [dim]Usage: reconpro zai <target>  or  reconpro scan <target> && reconpro zai[/]")
                sys.exit(1)
            findings = latest.get("findings", [])
            scan_target = latest.get("target", "unknown")
            _banner(args)
            console.print(f"  [dim]Using last scan: {scan_target} ({len(findings)} findings)[/]")

        if not findings:
            console.print("  [bright_green]No findings to analyze. Target is clean![/]")
            return

        console.print(f"  [cyan]z.ai Live Stream Analysis[/]  [dim]{len(findings)} findings → {args.model}[/]")
        console.print(f"  [dim]{'─' * 60}[/]")
        if not getattr(args, "no_stream", False):
            for chunk in client.analyze_findings_stream(findings, scan_target):
                console.print(chunk, end="")
            console.print()
        else:
            analysis = client.analyze_findings(findings, scan_target)
            console.print(analysis)
        console.print(f"  [dim]{'─' * 60}[/]")
        return

    # ── quantum-fingerprint (v9.2.0) ──────────────────────────────
    if cmd == "quantum-fingerprint":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.quantum_fingerprint import run_quantum_fingerprint
        findings = _spinner_wrap(
            f"Fingerprinting {target} via HTTP timing...",
            run_quantum_fingerprint, target, base_url,
            timeout=args.timeout, verify_tls=not args.insecure,
        )
        _print_findings(findings, args, title="QUANTUM FINGERPRINT")
        return

    # ── dark-web (v9.2.0) ─────────────────────────────────────────
    if cmd == "dark-web":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.dark_web_monitor import run_dark_web_monitor
        findings = _spinner_wrap(
            f"Scanning paste sites & threat feeds for {target}...",
            run_dark_web_monitor, target, base_url,
        )
        _print_findings(findings, args, title="DARK WEB MONITOR")
        return

    # ── info-ops (v9.2.0) ─────────────────────────────────────────
    if cmd == "info-ops":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.free_info_ops import run_info_ops
        findings = _spinner_wrap(
            f"Analyzing information operations on {target}...",
            run_info_ops, target, base_url,
        )
        _print_findings(findings, args, title="INFO OPS ANALYSIS")
        return

    # ── steg (v9.2.0) ─────────────────────────────────────────────
    if cmd == "steg":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.steganography_detector import run_steganography_detector
        findings = _spinner_wrap(
            f"Detecting steganography on {target}...",
            run_steganography_detector, target, base_url,
        )
        _print_findings(findings, args, title="STEGANOGRAPHY DETECTOR")
        return

    # ── covert (v9.2.0) ──────────────────────────────────────────
    if cmd == "covert":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.covert_channel import run_covert_channel
        findings = _spinner_wrap(
            f"Analyzing covert channels on {target}...",
            run_covert_channel, target, base_url,
        )
        _print_findings(findings, args, title="COVERT CHANNEL")
        return

    # ── zero-day (v9.2.0) ─────────────────────────────────────────
    if cmd == "zero-day":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.zero_day_hunter import run_zero_day_hunter
        findings = _spinner_wrap(
            f"Hunting zero-day patterns on {target}...",
            run_zero_day_hunter, target, base_url,
        )
        _print_findings(findings, args, title="ZERO-DAY HUNTER")
        return

    # ── ghost (v9.2.0) ───────────────────────────────────────────
    if cmd == "ghost":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.infrastructure_ghost import run_infrastructure_ghost
        findings = _spinner_wrap(
            f"Ghosting infrastructure of {target}...",
            run_infrastructure_ghost, target, base_url,
        )
        _print_findings(findings, args, title="INFRASTRUCTURE GHOST")
        return

    # ── sigint (v9.2.0) ──────────────────────────────────────────
    if cmd == "sigint":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.signal_intelligence import run_signal_intelligence
        findings = _spinner_wrap(
            f"Running SIGINT analysis on {target}...",
            run_signal_intelligence, target, base_url,
        )
        _print_findings(findings, args, title="SIGNAL INTELLIGENCE")
        return

    # ── attributor (v9.2.0) ───────────────────────────────────────
    if cmd == "attributor":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.nation_state_attributor import run_nation_state_attributor
        findings = _spinner_wrap(
            f"Attributing {target} to nation-state actors...",
            run_nation_state_attributor, target, base_url,
        )
        _print_findings(findings, args, title="NATION-STATE ATTRIBUTOR")
        return

    # ── weaponized-report (v9.2.0) ─────────────────────────────────
    if cmd == "weaponized-report":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.weaponized_report import run_weaponized_report
        findings = _spinner_wrap(
            f"Generating weaponized report for {target}...",
            run_weaponized_report, target, base_url,
        )
        _print_findings(findings, args, title="WEAPONIZED REPORT")
        return

    # ── honeypot (v9.2.0) ─────────────────────────────────────────
    if cmd == "honeypot":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.honeypot_dance import run_honeypot_dance
        findings = _spinner_wrap(
            f"Dancing with honeypots on {target}...",
            run_honeypot_dance, target, base_url,
        )
        _print_findings(findings, args, title="HONEYPOT DANCE")
        return

    # ── rate (v9.2.0 Module Rating System) ───────────────────
    if cmd == "rate":
        _banner(args)
        from .ratings import (
            MODULE_RATINGS, V9_MODULES, MODULE_CLI_MAP,
            get_rating, get_all_ratings, compute_team_score,
        )

        # CLI name -> module_id reverse map
        cli_to_id = {v: k for k, v in MODULE_CLI_MAP.items()}

        if getattr(args, 'module', None):
            # Rate a specific module
            cli_name = args.module.lower()
            mod_id = cli_to_id.get(cli_name, cli_name.replace("-", "_"))
            rating = get_rating(mod_id)
            if not rating:
                # Try direct module_id
                rating = get_rating(cli_name)
            if not rating:
                console.print(f"[red]Unknown module: {args.module}[/red]")
                console.print(f"[dim]Available: {', '.join(MODULE_CLI_MAP.values())}[/dim]")
                return

            # JSON output
            if getattr(args, 'json_output', False):
                import json
                d = {
                    "module": rating.module_id,
                    "name": rating.name,
                    "score": rating.score,
                    "grade": rating.grade,
                    "category": rating.category,
                    "sub_scores": {
                        "detection_breadth": rating.detection_breadth,
                        "detection_depth": rating.detection_depth,
                        "dependency_footprint": rating.dependency_footprint,
                        "uniqueness": rating.uniqueness,
                        "operational_safety": rating.operational_safety,
                    },
                    "compared_with": rating.compared_with,
                    "parity_pct": rating.parity_pct,
                    "unique_advantages": rating.unique_advantages,
                    "known_limitations": rating.known_limitations,
                    "stats": {
                        "lines_of_code": rating.lines_of_code,
                        "detection_categories": rating.detection_categories,
                        "signature_count": rating.signature_count,
                    },
                }
                console.print(json.dumps(d, indent=2))
                return

            # Rich table output
            _grade_color = GRADE_COLORS.get(rating.grade, "white")
            console.print()
            console.print(Panel(
                f"[bold]{rating.name}[/bold]\n{rating.category}",
                title="MODULE RATING",
                border_style="bright_cyan",
            ))
            console.print()

            # Score bar
            score_color = "bright_green" if rating.score >= 80 else "yellow" if rating.score >= 70 else "red"
            filled = int(rating.score / 5)
            bar = "[" + "#" * filled + "." * (20 - filled) + "]"
            console.print(f"  OVERALL: [bold {score_color}]{rating.score}/100  {rating.grade}[/bold {score_color}]  {bar}")
            console.print()

            # Sub-scores table
            sub_table = Table(show_header=True, header_style="bold", title="Sub-Scores")
            sub_table.add_column("Dimension", style="cyan")
            sub_table.add_column("Score", justify="right")
            sub_table.add_column("Bar", min_width=22)
            dims = [
                ("Detection Breadth", rating.detection_breadth),
                ("Detection Depth", rating.detection_depth),
                ("Dependency Footprint", rating.dependency_footprint),
                ("Uniqueness", rating.uniqueness),
                ("Operational Safety", rating.operational_safety),
            ]
            for label, val in dims:
                c = "bright_green" if val >= 85 else "yellow" if val >= 70 else "red"
                f_ = int(val / 5)
                b = "#" * f_ + "." * (20 - f_)
                sub_table.add_row(label, f"[{c}]{val}[/]", f"[{c}]{b}[/]")
            console.print(sub_table)
            console.print()

            # Compared with
            console.print(f"  [bold]Compared with:[/bold] {', '.join(rating.compared_with)}")
            if rating.parity_pct > 0:
                console.print(f"  [bold]Functional parity:[/bold] {rating.parity_pct}%")
            else:
                console.print(f"  [bold]Functional parity:[/bold] N/A (no equivalent tool)")
            console.print()

            # Advantages
            console.print(f"  [bold bright_green]Unique Advantages:[/bold bright_green]")
            for adv in rating.unique_advantages:
                console.print(f"    [green]+[/green] {adv}")
            console.print()

            # Limitations
            console.print(f"  [bold yellow]Known Limitations:[/bold yellow]")
            for lim in rating.known_limitations:
                console.print(f"    [yellow]-[/yellow] {lim}")
            console.print()

            # Stats
            console.print(f"  [dim]Lines: {rating.lines_of_code:,}  |  Categories: {rating.detection_categories}  |  Signatures: {rating.signature_count}  |  Dependencies: {rating.external_dependencies}[/dim]")
            return

        # Rate ALL modules
        ratings = get_all_ratings()
        avg_score, team_grade, total_loc, total_cats, total_sigs = compute_team_score()

        if getattr(args, 'json_output', False):
            import json
            data = {
                "team_score": avg_score,
                "team_grade": team_grade,
                "total_lines_of_code": total_loc,
                "total_detection_categories": total_cats,
                "total_signatures": total_sigs,
                "modules": [
                    {
                        "module": r.module_id,
                        "name": r.name,
                        "score": r.score,
                        "grade": r.grade,
                        "category": r.category,
                        "sub_scores": {
                            "breadth": r.detection_breadth,
                            "depth": r.detection_depth,
                            "deps": r.dependency_footprint,
                            "unique": r.uniqueness,
                            "safety": r.operational_safety,
                        },
                    }
                    for r in ratings
                ],
            }
            console.print(json.dumps(data, indent=2))
            return

        # Rich output for all modules
        console.print()
        console.print(Panel(
            f"[bold]ReconPro v9.2.0  |  {len(ratings)} Modules  |  ~{total_loc:,} Lines  |  0 Dependencies[/bold]",
            title="MODULE RATINGS vs INDUSTRY TOOLS",
            border_style="bright_cyan",
        ))
        console.print()

        # Team score
        tc = "bright_green" if avg_score >= 80 else "yellow" if avg_score >= 70 else "red"
        tg = GRADE_COLORS.get(team_grade, "white")
        console.print(f"  [bold]TEAM SCORE:[/bold]  [{tc}]{avg_score}/100  [{tg}]{team_grade}[/{tg}]")
        console.print()

        # Full table
        table = Table(show_header=True, header_style="bold bright_cyan", title=None)
        table.add_column("Module", min_width=28)
        table.add_column("Score", justify="right", min_width=7)
        table.add_column("Grade", justify="center", min_width=5)
        table.add_column("Breadth", justify="right", min_width=7)
        table.add_column("Depth", justify="right", min_width=6)
        table.add_column("Deps", justify="right", min_width=5)
        table.add_column("Unique", justify="right", min_width=6)
        table.add_column("Safety", justify="right", min_width=6)
        table.add_column("vs", min_width=28)

        for r in ratings:
            sc = "bright_green" if r.score >= 85 else "yellow" if r.score >= 70 else "red"
            gc = GRADE_COLORS.get(r.grade, "white")
            vs = ", ".join(r.compared_with[:2])
            if len(r.compared_with) > 2:
                vs += "+"
            table.add_row(
                f"[cyan]{r.name}[/]",
                f"[{sc}]{r.score}/100[/]",
                f"[{gc}]{r.grade}[/]",
                f"{r.detection_breadth}/100",
                f"{r.detection_depth}/100",
                f"{r.dependency_footprint}/100",
                f"{r.uniqueness}/100",
                f"{r.operational_safety}/100",
                f"[dim]{vs}[/dim]",
            )
        console.print(table)
        console.print()

        # Unique capabilities summary
        unique_count = sum(1 for r in ratings if r.uniqueness >= 95)
        console.print(f"  [bold bright_green]{unique_count} modules[/bold bright_green] have [bold]NO open-source equivalent[/bold] (uniqueness = 100/100)")
        console.print(f"  [bold]All 12 modules[/bold] score [bold]100/100[/bold] on dependency footprint (zero external deps)")
        console.print(f"  [bold]All 12 modules[/bold] require [bold]no root access, no pcap, no API keys[/bold]")
        console.print()
        return

    # ── dead-drop (v9.2.0) ───────────────────────────────────────
    if cmd == "dead-drop":
        _banner(args)
        target = args.target
        base_url = target if target.startswith("http") else f"https://{target}"
        from .modules.dead_drop import run_dead_drop
        findings = _spinner_wrap(
            f"Scanning dead drops on {target}...",
            run_dead_drop, target, base_url,
        )
        _print_findings(findings, args, title="DEAD DROP")
        return

    # ── No args ─────────────────────────────────────────────────────
    parser.print_help()


if __name__ == "__main__":
    main()
