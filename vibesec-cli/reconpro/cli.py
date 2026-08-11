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


# ── CLI entry point ─────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="reconpro",
        description=(
            "ReconPro Nexus v7 — Async Engine. Evasion. Swarm. Knowledge Graph. 40+ Subcommands.\n"
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

    # ── INTELLIGENCE ──────────────────────────────────────────────
    p = sub.add_parser("intelligence", help="Intelligence analysis: confidence, target profile, engineering score, recommendations")
    p.add_argument("target", nargs="?", help="Target domain (uses last scan if omitted)")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    # ── SCORE ──────────────────────────────────────────────────────
    p = sub.add_parser("score", help="Engineering score: architecture, security, reliability, performance dimensions")
    p.add_argument("target", nargs="?", help="Target (uses last scan if omitted)")

    # ── RECOMMEND ──────────────────────────────────────────────────
    p = sub.add_parser("recommend", help="Prioritized fix recommendations from last scan")
    p.add_argument("--target", help="Target (uses last scan if omitted)")
    p.add_argument("--quick-wins", action="store_true", help="Show only quick wins")

    # ── LEARN ──────────────────────────────────────────────────────
    p = sub.add_parser("learn", help="Learning system: scan history, module effectiveness, regressions")
    p.add_argument("target", nargs="?", help="Target to show history for")
    p.add_argument("--effectiveness", action="store_true", help="Show module effectiveness")
    p.add_argument("--regressions", action="store_true", help="Detect regressions")

    # ── PLAN ───────────────────────────────────────────────────────
    p = sub.add_parser("plan", help="AI scan plan: optimal modules, order, and strategy for a target")
    p.add_argument("target", help="Target to plan against")
    p.add_argument("--modules", help="Comma-separated available modules (default: all)")

    # ── VALIDATE ───────────────────────────────────────────────────
    p = sub.add_parser("validate", help="Validate ReconPro code: syntax, imports, security, tests")
    p.add_argument("--syntax", action="store_true", help="Check syntax only")
    p.add_argument("--imports", action="store_true", help="Check imports only")
    p.add_argument("--security", action="store_true", help="Security scan only")
    p.add_argument("--tests", action="store_true", help="Run tests only")

    # ── PROMPT-CHECK ───────────────────────────────────────────────
    p = sub.add_parser("prompt-check", help="Test prompt injection defense on input text")
    p.add_argument("text", help="Text to check for injection patterns")

    # ── AUDIT-CODE ─────────────────────────────────────────────────
    p = sub.add_parser("audit-code", help="Security audit: hardcoded secrets, eval/exec, unsafe patterns")
    p.add_argument("--path", default=".", help="Path to audit (default: current dir)")
    p.add_argument("--severity", help="Minimum severity: critical, high, medium, low")

    # ── zai (z.ai live stream) ──────────────────────────────────────────
    p = sub.add_parser("zai", help="z.ai live stream AI analysis — zero config, no API keys needed")
    p.add_argument("target", nargs="?", default="", help="Target to scan and analyze (optional: uses last scan if omitted)")
    p.add_argument("--stream", action="store_true", help="Stream AI analysis in real-time (default)")
    p.add_argument("--no-stream", action="store_true", help="Return complete analysis at once")
    p.add_argument("--chat", type=str, default="", help="Free-form chat message (skips scan)")
    p.add_argument("--health", action="store_true", help="Health check: verify z.ai connectivity")
    p.add_argument("--model", type=str, default="glm-4-flash", help="Model name (default: glm-4-flash)")

    # ── AGE V: AUTONOMOUS SYSTEM ────────────────────────────────────
    # ── auto-plan ───────────────────────────────────────────────────
    p = sub.add_parser("auto-plan", help="Autonomous planner: convert goal to execution strategy")
    p.add_argument("goal", help="Natural language goal (e.g. 'Assess attack surface for example.com')")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    # ── agents ─────────────────────────────────────────────────────
    p = sub.add_parser("agents", help="Run autonomous multi-agent pipeline against a target")
    p.add_argument("target", help="Target domain, URL, IP, or 'localhost'")
    p.add_argument("--goal", default="full assessment", help="Goal description (default: full assessment)")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    # ── correlate ──────────────────────────────────────────────────
    p = sub.add_parser("correlate", help="Evidence correlation: merge, deduplicate, boost confidence")
    p.add_argument("--target", help="Target to correlate findings for (default: last scan)")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    # ── executive ──────────────────────────────────────────────────
    p = sub.add_parser("executive", help="Executive intelligence report: summary, risk matrix, remediation")
    p.add_argument("--target", help="Target for report (default: last scan)")
    p.add_argument("--markdown", action="store_true", help="Output as Markdown")
    p.add_argument("--json", action="store_true", help="Output as JSON")

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

    # ── TUI (deprecated alias for nexus) ───────────────────────────
    if cmd == "tui":
        console.print("  [yellow]'reconpro tui' is deprecated — use 'reconpro nexus' instead.[/]")
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

    # ── INTELLIGENCE ──────────────────────────────────────────────
    if cmd == "intelligence":
        _banner(args)
        from .intelligence_pipeline import IntelligencePipeline
        from .history import get_latest
        latest = get_latest()
        if not latest and not getattr(args, "target", None):
            console.print("  [yellow]No scan data. Run a scan first or provide a target.[/]")
            sys.exit(1)
        target = getattr(args, "target", None) or (latest.get("target") if latest else None)
        if not target:
            console.print("  [yellow]No target available.[/]")
            sys.exit(1)
        findings = latest.get("findings", []) if latest else []
        if not findings:
            console.print(f"  [bright_green]No findings for {target}. Target is clean.[/]")
            return
        pipeline = IntelligencePipeline()
        # Build a ReconProResult-like object from dict data for the pipeline
        from .scanner import ReconProResult
        try:
            report = _spinner_wrap(f"Running intelligence pipeline on {target}...",
                                   pipeline.process_result, latest)
            if getattr(args, "json", False):
                print(json.dumps(report.to_dict(), indent=2, default=str))
            else:
                console.print(f"\n  [bold]Intelligence Report: [cyan]{report.target}[/][/]")
                console.print(f"  Timestamp:   [dim]{report.timestamp}[/]")
                console.print(f"  Findings:    [bold]{report.findings_count}[/]")
                console.print(f"  Processed:   [dim]{report.processing_time_ms:.1f}ms[/]")
                if report.target_intel:
                    ti = report.target_intel
                    console.print(f"\n  [bold]Target Intelligence:[/]")
                    console.print(f"    App Type:       [cyan]{ti.get('app_type', '?')}[/]")
                    console.print(f"    Overall Risk:   [red]{ti.get('overall_risk', 0):.2f}[/]")
                    console.print(f"    Confidence:     [green]{ti.get('confidence', 0):.2f}[/]")
                    console.print(f"    Critical:       [bright_red]{ti.get('critical_count', 0)}[/]  High: [red]{ti.get('high_count', 0)}[/]")
                    if ti.get('attack_surface'):
                        console.print(f"    Attack Surface:")
                        for s in ti['attack_surface']:
                            console.print(f"      [dim]• {s}[/]")
                    if ti.get('suggested_next_actions'):
                        console.print(f"    Next Actions:")
                        for a in ti['suggested_next_actions'][:5]:
                            console.print(f"      [bright_green]→ {a}[/]")
                if report.engineering_report:
                    er = report.engineering_report
                    grade = er.get('grade', '?')
                    gc = GRADE_COLORS.get(grade, 'white')
                    console.print(f"\n  [bold]Engineering Score: [{gc}]{er.get('overall_score', 0)}/100 ({grade})[/{gc}][/]")
                if report.confidence_scores:
                    avg_conf = sum(f.get('confidence', 0) for f in report.confidence_scores) / max(len(report.confidence_scores), 1)
                    console.print(f"  Avg Confidence:  [bold]{avg_conf:.2f}[/]")
                    high_conf = [f for f in report.confidence_scores if f.get('confidence', 0) >= 0.8]
                    console.print(f"  High Confidence: [green]{len(high_conf)}/{len(report.confidence_scores)} findings[/]")
        except Exception as exc:
            console.print(f"  [red]Intelligence pipeline error: {exc}[/]")
        console.print()
        return

    # ── SCORE ────────────────────────────────────────────────────
    if cmd == "score":
        _banner(args)
        from .engineering_score import EngineeringScorer
        from .history import get_latest
        latest = get_latest()
        target = getattr(args, "target", None) or (latest.get("target") if latest else None)
        if not latest or not target:
            console.print("  [yellow]No scan data. Run a scan first or provide a target.[/]")
            sys.exit(1)
        findings = latest.get("findings", [])
        if not findings:
            console.print(f"  [bright_green]No findings for {target}. Score is 100/100 (A+).[/]")
            return
        scorer = EngineeringScorer()
        report = _spinner_wrap(f"Scoring {target}...", scorer.score, target, findings, None)
        rd = report.to_dict()
        grade = rd['grade']
        gc = GRADE_COLORS.get(grade, 'white')
        console.print(f"\n  [bold]Engineering Score: [cyan]{rd['target']}[/][/]  [{gc}]{rd['overall_score']}/100 ({grade})[/{gc}]")
        console.print(f"  Total findings: [bold]{rd['total_findings']}[/]")
        console.print()
        table = Table(border_style="dim", header_style="bold dim")
        table.add_column("Dimension", style="bold", width=18)
        table.add_column("Score", style="bold", width=8)
        table.add_column("Findings", width=10)
        table.add_column("Bar", width=30)
        for dim_name, dim_data in rd['dimensions'].items():
            sc = dim_data['score']
            fc = dim_data['findings_count']
            bar_w = 20
            filled = int(sc / 100 * bar_w)
            bar = "[bright_green]" + "█" * filled + "[/][dim]" + "░" * (bar_w - filled) + "[/]"
            color = "green" if sc >= 80 else ("yellow" if sc >= 60 else "red")
            table.add_row(dim_name.title(), f"[{color}]{sc:.1f}[/{color}]", str(fc), bar)
            if dim_data.get('recommendations'):
                for rec in dim_data['recommendations'][:2]:
                    table.add_row("", "", "", f"[dim]→ {rec}[/]")
        console.print(table)
        console.print()
        return

    # ── RECOMMEND ────────────────────────────────────────────────
    if cmd == "recommend":
        _banner(args)
        from .recommendation_engine import RecommendationEngine
        from .history import get_latest
        latest = get_latest()
        target = getattr(args, "target", None) or (latest.get("target") if latest else None)
        if not latest or not target:
            console.print("  [yellow]No scan data. Run a scan first or provide a target.[/]")
            sys.exit(1)
        findings = latest.get("findings", [])
        if not findings:
            console.print(f"  [bright_green]No findings for {target}. Nothing to recommend.[/]")
            return
        engine = RecommendationEngine()
        report = _spinner_wrap(f"Generating recommendations for {target}...", engine.recommend, findings, target)
        quick_wins_only = getattr(args, "quick_wins", False)
        if quick_wins_only:
            wins = report.quick_wins
            if not wins:
                console.print(f"  [dim]No quick wins found for {target}.[/]")
            else:
                console.print(f"\n  [bold bright_green]Quick Wins for {target}:[/]")
                for w in wins:
                    sev = w.get('severity', 'info')
                    c = SEV_COLORS.get(sev, 'white')
                    console.print(f"  [{c}]{sev.upper():8}[/{c}]  [bold]{w.get('category', '')}[/]: {w.get('summary', '')}")
                    for step in w.get('steps', [])[:3]:
                        console.print(f"           [bright_green]→ {step}[/]")
        else:
            rd = report.to_dict()
            console.print(f"\n  [bold]Recommendations for [cyan]{rd['target']}[/][/]")
            console.print(f"  Findings: [bold]{rd['total_findings']}[/]  Quick Wins: [bright_green]{len(rd['quick_wins'])}[/]  Long-term: [yellow]{len(rd['long_term_fixes'])}[/]")
            console.print(f"  Est. Total Hours: [bold]{rd['estimated_total_hours']}[/]  Risk Reduction: [bold]{rd['overall_risk_reduction']:.0%}[/]")
            if rd['quick_wins']:
                console.print(f"\n  [bold bright_green]⚡ Quick Wins:[/]")
                for w in rd['quick_wins']:
                    console.print(f"    [bright_green]• {w.get('category', '')}[/]: {w.get('summary', '')}")
            if rd['category_summary']:
                console.print(f"\n  [bold]Category Summary:[/]")
                for cat, info in rd['category_summary'].items():
                    sev = info.get('max_severity', 'info')
                    c = SEV_COLORS.get(sev, 'white')
                    console.print(f"    [{c}]{sev.upper():8}[/{c}]  {cat}: {info.get('count', 0)} finding(s) — {info.get('summary', '')}")
        console.print()
        return

    # ── LEARN ────────────────────────────────────────────────────
    if cmd == "learn":
        _banner(args)
        from .learning_system import LearningSystem
        ls = LearningSystem()
        target = getattr(args, "target", None)
        show_effectiveness = getattr(args, "effectiveness", False)
        show_regressions = getattr(args, "regressions", False)

        if show_effectiveness:
            eff = ls.get_scan_effectiveness()
            console.print(f"\n  [bold]Module Effectiveness[/]  [dim]({eff['total_scans']} total scans)[/]")
            if eff['module_rankings']:
                table = Table(border_style="dim", header_style="bold dim")
                table.add_column("Module", style="cyan", width=18)
                table.add_column("Runs", width=8)
                table.add_column("Total Findings", width=16)
                table.add_column("Avg Findings", width=14)
                for m in eff['module_rankings']:
                    table.add_row(m['module'], str(m['runs']), str(m['total_findings']), str(m['avg_findings']))
                console.print(table)
            else:
                console.print("  [dim]No module data yet. Run some scans first.[/]")
            console.print()
            return

        if show_regressions:
            if not target:
                console.print("  [yellow]Usage: reconpro learn <target> --regressions[/]")
                sys.exit(1)
            latest = get_latest()
            if not latest:
                console.print("  [yellow]No scan data. Run a scan first.[/]")
                sys.exit(1)
            findings = latest.get('findings', [])
            regs = ls.detect_regressions(target, findings)
            if not regs:
                console.print(f"  [bright_green]No regressions detected for {target}.[/]")
            else:
                console.print(f"\n  [bold bright_red]Regressions detected for {target}: {len(regs)} new issue(s)[/]")
                for r in regs:
                    sev = r.get('severity', 'info')
                    c = SEV_COLORS.get(sev, 'white')
                    console.print(f"  [{c}]{sev.upper():8}[/{c}]  [bold]{r.get('category', '')}[/]: {r.get('title', '')}")
            console.print()
            return

        # Default: show target history
        if not target:
            console.print("  [dim]Usage: reconpro learn <target>  or  reconpro learn --effectiveness[/]")
            sys.exit(1)
        history = ls.get_target_history(target)
        if history['scan_count'] == 0:
            console.print(f"  [dim]No scan history for {target}.[/]")
        else:
            console.print(f"\n  [bold]Scan History: [cyan]{target}[/][/]")
            console.print(f"  Total Scans: [bold]{history['scan_count']}[/]")
            console.print(f"  Latest Score: [bold]{history['latest_score']}[/]")
            console.print(f"  Categories: [dim]{', '.join(history['latest_categories']) or 'none'}[/]")
            console.print(f"  Modules Used: [cyan]{', '.join(history['modules_used']) or 'none'}[/]")
            if history['all_scores']:
                scores = history['all_scores']
                console.print(f"  Score Trend: [bold]{scores[0]}[/] → [bold]{scores[-1]}[/]  ({len(scores)} data points)")
        console.print()
        return

    # ── PLAN ─────────────────────────────────────────────────────
    if cmd == "plan":
        _banner(args)
        from .decision_engine import DecisionEngine
        target = args.target
        if not target:
            console.print("  [yellow]Usage: reconpro plan <target>[/]")
            sys.exit(1)
        available = list(ALL_MODULES.keys())
        if getattr(args, "modules", None):
            available = [m.strip().lower() for m in args.modules.split(",")]
        engine = DecisionEngine()
        # Try to load learning data for better decisions.
        try:
            from .learning_system import LearningSystem
            ls = LearningSystem()
            learning = ls.get_scan_effectiveness()
            plan = _spinner_wrap(f"Planning scan for {target}...", engine.plan_scan, target, available, learning)
        except Exception:
            plan = _spinner_wrap(f"Planning scan for {target}...", engine.plan_scan, target, available)
        pd = plan.to_dict()
        console.print(f"\n  [bold]Scan Plan: [cyan]{pd['target']}[/]  [dim]({pd['target_type']})[/][/]")
        console.print(f"  Estimated Time: [bold]{pd['estimated_time']}s[/]")
        console.print(f"  Modules to Run: [bold]{len(pd['modules_to_run'])}[/]")
        if pd['skip_reasons']:
            console.print(f"  [yellow]Skipped Modules:[/]")
            for mod, reason in pd['skip_reasons'].items():
                console.print(f"    [dim]✗ {mod}: {reason}[/]")
        console.print(f"\n  [bold]Execution Order:[/]")
        for i, mod in enumerate(pd['order'], 1):
            retries = pd['retry_modules'].get(mod, 0)
            retry_str = f" [dim](retries: {retries})[/]" if retries else ""
            console.print(f"    [cyan]{i:2}.[/] {mod}{retry_str}")
        if pd['throttle_flags']:
            console.print(f"\n  Throttle Flags: [yellow]{', '.join(pd['throttle_flags'])}[/]")
        console.print()
        return

    # ── VALIDATE ────────────────────────────────────────────────
    if cmd == "validate":
        _banner(args)
        from .auto_validation import AutoValidator
        validator = AutoValidator()
        do_syntax = getattr(args, "syntax", False)
        do_imports = getattr(args, "imports", False)
        do_security = getattr(args, "security", False)
        do_tests = getattr(args, "tests", False)
        # If no specific check requested, run all.
        run_all = not (do_syntax or do_imports or do_security or do_tests)
        if run_all:
            report = _spinner_wrap("Running full validation...", validator.run_all)
            for check in report.checks:
                status = "[bright_green]PASS[/]" if check.passed else "[bright_red]FAIL[/]"
                console.print(f"  {status}  {check.name} [dim]({check.duration_ms:.0f}ms)[/]")
                for detail in check.details[:5]:
                    console.print(f"         [dim]{detail[:100]}[/]")
            overall = "[bright_green]ALL PASSED[/]" if report.passed else "[bright_red]SOME CHECKS FAILED[/]"
            console.print(f"\n  [bold]{overall}[/]  [dim]({report.total_duration_ms:.0f}ms total)[/]")
        else:
            if do_syntax:
                r = _spinner_wrap("Checking syntax...", validator.validate_syntax)
                status = "[bright_green]PASS[/]" if r.passed else "[bright_red]FAIL[/]"
                console.print(f"  {status}  Syntax [dim]({r.duration_ms:.0f}ms)[/]")
                for d in r.details[:5]:
                    console.print(f"         [dim]{d[:100]}[/]")
            if do_imports:
                r = _spinner_wrap("Checking imports...", validator.validate_imports)
                status = "[bright_green]PASS[/]" if r.passed else "[bright_red]FAIL[/]"
                console.print(f"  {status}  Imports [dim]({r.duration_ms:.0f}ms)[/]")
                for d in r.details[:5]:
                    console.print(f"         [dim]{d[:100]}[/]")
            if do_security:
                r = _spinner_wrap("Checking security...", validator.validate_security)
                status = "[bright_green]PASS[/]" if r.passed else "[bright_red]FAIL[/]"
                console.print(f"  {status}  Security [dim]({r.duration_ms:.0f}ms)[/]")
                for d in r.details[:10]:
                    console.print(f"         {d[:120]}")
            if do_tests:
                r = _spinner_wrap("Running tests...", validator.validate_tests)
                status = "[bright_green]PASS[/]" if r.passed else "[bright_red]FAIL[/]"
                console.print(f"  {status}  Tests [dim]({r.duration_ms:.0f}ms)[/]")
                for d in r.details[-10:]:
                    console.print(f"         [dim]{d[:120]}[/]")
        console.print()
        return

    # ── PROMPT-CHECK ────────────────────────────────────────────
    if cmd == "prompt-check":
        from .prompt_defense import PromptDefense, ThreatLevel
        text = args.text
        if not text:
            console.print("  [yellow]Usage: reconpro prompt-check <text>[/]")
            sys.exit(1)
        defense = PromptDefense(sensitivity="high")
        result = defense.sanitize_input(text)
        if result.is_safe:
            console.print(f"  [bright_green]✓ SAFE[/]  No injection patterns detected.")
        else:
            tl = result.threat_level.value
            color = SEV_COLORS.get(tl, "red")
            console.print(f"  [{color}]⚠ THREAT DETECTED: {tl.upper()}[/{color}]")
            console.print(f"  Matched Patterns ({len(result.matched_patterns)}):")
            for p_name in result.matched_patterns:
                console.print(f"    [red]• {p_name}[/]")
            if result.cleaned != text:
                console.print(f"\n  [dim]Cleaned text available (control chars stripped).[/]")
        console.print()
        return

    # ── AUDIT-CODE ──────────────────────────────────────────────
    if cmd == "audit-code":
        _banner(args)
        from .security_audit import SecurityAuditor
        auditor = SecurityAuditor()
        path = getattr(args, "path", ".")
        min_severity = getattr(args, "severity", None)
        report = _spinner_wrap(f"Auditing {path}...", auditor.audit_codebase, path)
        if report.total_findings == 0:
            console.print(f"\n  [bright_green]No security issues found. {report.files_scanned} file(s) scanned.[/]")
        else:
            sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
            min_val = sev_order.get(min_severity.lower(), 4) if min_severity else 4
            filtered = [f for f in report.findings if sev_order.get(f.severity.value, 4) <= min_val]
            if not filtered:
                console.print(f"\n  [bright_green]No findings at or above '{min_severity}' severity. {report.files_scanned} file(s) scanned.[/]")
            else:
                console.print(f"\n  [bold]Security Audit: [cyan]{path}[/]  ({report.files_scanned} files)[/]")
                for sev_name, count in report.severity_counts.items():
                    c = SEV_COLORS.get(sev_name, 'white')
                    console.print(f"  [{c}]{sev_name.upper():8}[/{c}]  {count}")
                console.print()
                for f in sorted(filtered, key=lambda x: sev_order.get(x.severity.value, 4))[:30]:
                    c = SEV_COLORS.get(f.severity.value, 'white')
                    console.print(f"  [{c}]{f.severity.value.upper():8}[/{c}]  [cyan]{f.file}[/]:{f.line}  {f.description}")
                    if f.evidence:
                        console.print(f"           [dim]{f.evidence[:100]}[/]")
        console.print()
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

    # ── AGE V: AUTO-PLAN ──────────────────────────────────────────
    if cmd == "auto-plan":
        from .autonomous_planner import AutonomousPlanner
        _banner(args)
        planner = AutonomousPlanner()
        strategy = _spinner_wrap(
            f"Planning: [cyan]{args.goal}[/]...",
            planner.plan, args.goal,
        )
        if getattr(args, "json", False):
            console.print_json(data=strategy.to_dict())
        else:
            d = strategy.to_dict()
            console.print(f"\n  [bold]Autonomous Plan[/]")
            console.print(f"  Goal:       [cyan]{d['goal']}[/]")
            console.print(f"  Target:     [cyan]{d['target']}[/]")
            console.print(f"  Goal Type:  [bright_cyan]{d['goal_type']}[/]")
            console.print(f"  Est. Time:  {d['estimated_time']}s")
            console.print(f"  Phases:     {len(d['phases'])}")
            for i, phase in enumerate(d['phases'], 1):
                mods = ', '.join(phase['module_group'])
                par = '[bright_green]parallel[/]' if phase['parallel'] else 'sequential'
                console.print(f"    Phase {i}: [{par}] {mods}")
                if phase.get('depends_on'):
                    console.print(f"      depends: {', '.join(phase['depends_on'])}")
            if d.get('warnings'):
                for w in d['warnings']:
                    console.print(f"  [yellow]Warning: {w}[/]")
        return

    # ── AGE V: AGENTS ──────────────────────────────────────────────
    if cmd == "agents":
        from .agent_runtime import AgentOrchestrator
        _banner(args)
        orchestrator = AgentOrchestrator()
        target = args.target
        goal = getattr(args, "goal", "full assessment")
        console.print(f"\n  [bold]Autonomous Agent Pipeline[/]")
        console.print(f"  Target: [cyan]{target}[/]")
        console.print(f"  Goal:   [cyan]{goal}[/]")
        result = _spinner_wrap(
            "Running agent pipeline...",
            orchestrator.run_goal, goal, target,
        )
        if getattr(args, "json", False):
            console.print_json(data=result)
        else:
            console.print(f"\n  [bold]Agent Pipeline Complete[/]")
            total_findings = len(result.get('findings', []))
            console.print(f"  Total Findings: [bold]{total_findings}[/]")
            console.print(f"  Agent Results:   {len(result.get('agent_results', []))}")
            for ar in result.get('agent_results', []):
                console.print(f"    [cyan]{ar['agent_id']:12}[/] {ar['role']:16} {ar['findings_count']:4} findings  {ar['processing_time_ms']:.0f}ms")
            console.print(f"  Total Time:     {result.get('total_time_ms', 0):.0f}ms")
        return

    # ── AGE V: CORRELATE ──────────────────────────────────────────
    if cmd == "correlate":
        from .evidence_correlation import EvidenceCorrelator
        _banner(args)
        target = getattr(args, "target", None)
        findings = []
        if target:
            result = _spinner_wrap(f"Scanning {target}...", scan, target)
            findings = result.findings
        else:
            latest = get_latest()
            if latest:
                findings = latest.get("findings", [])
                console.print(f"  [dim]Using last scan: {latest.get('target', 'unknown')} ({len(findings)} findings)[/]")
            else:
                console.print("  [yellow]No target specified and no scan history found.[/]")
                return
        correlator = EvidenceCorrelator()
        correlation = correlator.correlate(findings)
        if getattr(args, "json", False):
            console.print_json(data=correlation.to_dict())
        else:
            console.print(f"\n  [bold]Evidence Correlation[/]")
            console.print(f"  Chains:          {len(correlation.chains)}")
            console.print(f"  Deduplicated:    {correlation.deduplicated_count}")
            console.print(f"  Confidence Boosted: {correlation.confidence_boosted}")
            console.print(f"  Severity Upgrades:  {len(correlation.severity_upgrades)}")
            for chain in correlation.chains[:10]:
                sev = chain.severity
                c = SEV_COLORS.get(sev, "white")
                console.print(f"    [{c}]{sev.upper():8}[/{c}] {chain.primary_finding.get('title', 'unknown'):30} conf={chain.confidence:.2f}  sources={','.join(chain.source_modules)}")
        return

    # ── AGE V: EXECUTIVE ──────────────────────────────────────────
    if cmd == "executive":
        from .executive_intelligence import ExecutiveIntelligence
        from .evidence_correlation import EvidenceCorrelator
        _banner(args)
        target = getattr(args, "target", None)
        scan_data = None
        if target:
            result = _spinner_wrap(f"Scanning {target}...", scan, target)
            scan_data = result.to_dict()
        else:
            latest = get_latest()
            if latest:
                scan_data = latest
                console.print(f"  [dim]Using last scan: {latest.get('target', 'unknown')}[/]")
            else:
                console.print("  [yellow]No target specified and no scan history found.[/]")
                return
        ei = ExecutiveIntelligence()
        correlator = EvidenceCorrelator()
        correlation = correlator.correlate(scan_data.get("findings", []))
        report = ei.generate(scan_data, correlation_result=correlation.to_dict())
        if getattr(args, "json", False):
            console.print_json(data=report.to_dict())
        elif getattr(args, "markdown", False):
            console.print(report.to_markdown())
        else:
            d = report.to_dict()
            console.print(f"\n  [bold]Executive Intelligence Report[/]")
            console.print(f"  Target:     [cyan]{report.target}[/]")
            console.print(f"  Score:      [bold]{d['scan_summary']['total_score']}/100 ({d['scan_summary']['grade']})[/]")
            console.print(f"  Findings:   {d['scan_summary']['total_findings']}")
            console.print(f"  Risk Items: {len(report.risk_matrix)}")
            console.print(f"  Chains:     {len(report.evidence_chains)}")
            console.print()
            if report.executive_summary:
                console.print(Panel(report.executive_summary, title="Executive Summary", border_style="cyan"))
            if report.remediation_plan:
                console.print(f"\n  [bold]Top Remediations:[/]")
                for r in report.remediation_plan[:5]:
                    sev = r.get("severity", "info")
                    c = SEV_COLORS.get(sev, "white")
                    console.print(f"    [{c}]{sev.upper():8}[/{c}] {r.get('title', r.get('category', 'unknown'))}")
        return

    # ── No args ─────────────────────────────────────────────────────
    parser.print_help()


if __name__ == "__main__":
    main()
