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

SEV_COLORS = {
    "critical": "bright_red",
    "high": "red",
    "medium": "yellow",
    "low": "green",
    "info": "dim",
}

GRADE_COLORS = {
    "A+": "bright_green", "A": "green", "B": "yellow",
    "C": "red", "D": "bright_red", "F": "bold bright_red",
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
            console.print(text)
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


def _spinner_wrap(msg: str, fn, *a, **kw):
    """Run a function with a spinner."""
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
            "ReconPro Nexus v6 — Eleven Blades. Swarm Intelligence. Agentic AI.\n"
            "The full-spectrum security platform with AI agent, swarm, and knowledge graph.\n\n"
            "Quick Start:  reconpro nexus           (mind-blowing agent TUI)\n"
            "AI Agent:     reconpro agent <goal>   (LLM-powered, 18 tools)\n"
            "Swarm:        reconpro swarm <target>  (SCOUT→HACKER→CODER→GUARDIAN)\n"
            "Adversarial:  reconpro adversarial <target>  (hacker vs coder self-play)\n"
            "Intel:        cve, graph (threat intel + knowledge graph)\n"
            "Export:       export (SARIF/MD/JSON/HTML)"
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

    # ── export ──────────────────────────────────────────────────────
    p = sub.add_parser("export", help="Export last scan to SARIF/MD/JSON/HTML")
    p.add_argument("output", nargs="?", default="reconpro_report.sarif",
                     help="Output path (format auto-detected from extension)")

    # ── Parse ─────────────────────────────────────────────────────
    args, remaining = parser.parse_known_args(argv)
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

    # ── NEXUS ──────────────────────────────────────────────────
    if cmd == "nexus":
        from .nexus_tui import run_nexus
        run_nexus()
        return

    # ── CHAT ───────────────────────────────────────────────────────
    if cmd == "chat":
        from .chat import start_chat
        console.print(BANNER)
        start_chat()
        return

    # ── TUI ────────────────────────────────────────────────────────
    if cmd == "tui":
        from .tui_app import start_tui
        start_tui()
        return

    # ── BLITZ ──────────────────────────────────────────────────────
    if cmd == "blitz":
        targets = getattr(args, "targets", [])
        if not targets or len(targets) < 2:
            console.print("  [yellow]Usage: reconpro blitz target1.com target2.com [target3.com ...][/]")
            sys.exit(1)
        console.print(BANNER)
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        blitz_scan(targets, max_workers=args.workers, modules=modules)
        return

    # ── AGENT ──────────────────────────────────────────────────────
    if cmd == "agent":
        goal = getattr(args, "goal", "")
        if not goal:
            console.print("  [yellow]Usage: reconpro agent \"fully scan example.com and find subdomains\"[/]")
            sys.exit(1)
        console.print(BANNER)
        from .nexus_agent import run_nexus_agent
        run_nexus_agent(goal)
        return

    # ── SWARM ─────────────────────────────────────────────────────
    if cmd == "swarm":
        console.print(BANNER)
        from .swarm import run_swarm
        run_swarm(args.target, mode=args.mode)
        return

    # ── ADVERSARIAL ────────────────────────────────────────────────
    if cmd == "adversarial":
        console.print(BANNER)
        from .adversarial import run_adversarial
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        run_adversarial(args.target, max_rounds=args.rounds, modules=modules, is_local=args.local)
        return

    # ── AST ────────────────────────────────────────────────────────
    if cmd == "ast":
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
        modules = [m.strip().lower() for m in args.modules.split(",")] if args.modules else None
        result = _spinner_wrap("Auditing machine...", audit_scan, target="localhost", modules=modules)
        _output_result(result, args, title="HOST AUDIT", show_remediation=True)
        return

    # ── DEV ────────────────────────────────────────────────────────
    if cmd == "dev":
        path = args.path
        console.print(BANNER)
        result = _spinner_wrap("Scanning project...", audit_scan, target=path, modules=["dev"])
        _output_result(result, args, title="DEV SEC", show_remediation=True)
        return

    # ── DOCTOR ─────────────────────────────────────────────────────
    if cmd == "doctor":
        console.print(BANNER)
        result = _spinner_wrap("Running diagnostics...", audit_scan, target="localhost", modules=["doctor"])
        _output_result(result, args, title="DOCTOR", show_remediation=True)
        return

    # ── PORTS ──────────────────────────────────────────────────────
    if cmd == "ports":
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
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
        console.print(BANNER)
        result = _spinner_wrap(f"Scanning {target}...", scan, target, modules=modules,
                                all_modules=scan_args.all, timeout=scan_args.timeout,
                                verify_tls=not scan_args.insecure, rate_limit=scan_args.rate_limit)
        _output_result(result, scan_args)
        return

    # ── No args ─────────────────────────────────────────────────────
    parser.print_help()


if __name__ == "__main__":
    main()
