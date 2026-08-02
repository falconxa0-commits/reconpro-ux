from __future__ import annotations

import argparse
import json
import os
import sys
import time

from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.text import Text
from rich.columns import Columns
from rich.rule import Rule
from rich.markdown import Markdown

from . import __version__
from .scanner import (
    scan, audit_scan, MODULE_REGISTRY, LOCAL_MODULES,
    ALL_MODULES, DEFAULT_MODULES, DEFAULT_LOCAL_MODULES,
)

console = Console()

BANNER = r"""[bold bright_white]
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██╗███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
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
    "A+": "bright_green",
    "A": "green",
    "B": "yellow",
    "C": "red",
    "D": "bright_red",
    "F": "bold bright_red",
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

    console.print(Panel(
        Group(*lines),
        border_style=grade_color,
        title=f"[bold]{title}[/bold]",
        title_align="left",
        padding=(1, 2),
    ))


def _render_findings_table(result, show_remediation: bool = False) -> None:
    if not result.findings:
        console.print("\n  [bright_green]No findings. Target is clean.[/]")
        return

    table = Table(
        title=f"Findings — {len(result.findings)} detected",
        border_style="bright_white",
        header_style="bold bright_white",
        show_lines=False,
    )
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
            f.get("module", ""),
            f.get("category", ""),
            f.get("title", "")[:70],
            str(f.get("points_deducted", 0)),
        ]
        if show_remediation:
            row.append(f.get("remediation", "")[:50])
        table.add_row(*row)

    console.print(table)


def _render_module_breakdown(result) -> None:
    if not result.module_results:
        return

    modules_table = Table(
        title="Module Breakdown",
        border_style="dim",
        header_style="bold dim",
    )
    modules_table.add_column("Module", style="bold", width=16)
    modules_table.add_column("Findings", style="white", width=10)
    modules_table.add_column("Critical", style="bright_red", width=10)
    modules_table.add_column("High", style="red", width=8)
    modules_table.add_column("Medium", style="yellow", width=8)

    for mod_id, mod_data in result.module_results.items():
        findings = mod_data.get("findings", [])
        crit = sum(1 for f in findings if f.get("severity") == "critical")
        high = sum(1 for f in findings if f.get("severity") == "high")
        med = sum(1 for f in findings if f.get("severity") == "medium")
        modules_table.add_row(
            mod_id.upper(),
            str(len(findings)),
            str(crit),
            str(high),
            str(med),
        )

    console.print(modules_table)


def _render_badge(result) -> None:
    if result.badge_markdown:
        console.print(Panel(
            Group(
                Text("  GitHub README Badge (copy-paste):", style="bold dim"),
                Text(f"  {result.badge_markdown}", style="cyan"),
            ),
            border_style="dim",
            title="[dim]Badge[/dim]",
            title_align="left",
            padding=(0, 2),
        ))


def _render_remediations(result) -> None:
    """Show only findings with remediations (actionable fixes)."""
    actionable = [f for f in result.findings if f.get("remediation") and f.get("severity") not in ("info",)
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


# ── CLI entry point ─────────────────────────────────────────────────────


def _add_scan_args(p: argparse.ArgumentParser) -> None:
    """Add shared scan arguments to a parser."""
    p.add_argument("target", nargs="?", default=None, help="Target domain, URL, or directory")
    p.add_argument("--json", dest="json_output", action="store_true",
                    help="Output as JSON")
    p.add_argument("-o", "--output", dest="output_file", type=str,
                    help="Save JSON to file")
    p.add_argument("--timeout", "-t", type=int, default=8,
                    help="Per-request timeout in seconds (default: 8)")
    p.add_argument("--insecure", "-k", action="store_true",
                    help="Skip TLS verification")
    p.add_argument("--rate-limit", type=float, default=10.0,
                    help="Max requests per second (default: 10)")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="reconpro",
        description=(
            "ReconPro Enterprise — Eleven Blades. One Target. One Verdict.\n"
            "The full-spectrum security reconnaissance platform.\n\n"
            "Remote:  scan, vibesec (target a URL/domain)\n"
            "Local:   audit, dev, doctor, ports, secrets (scan your machine)"
        ),
        epilog="""Examples:
  # Remote scanning
  reconpro scan example.com
  reconpro example.com --modules recon,auth,vibesec
  reconpro example.com --all --json -o report.json
  reconpro vibesec example.com

  # Local machine audit
  reconpro audit              # Full laptop security audit
  reconpro dev                # Scan current project for secrets & issues
  reconpro dev /path/to/project
  reconpro doctor             # Quick security health check
  reconpro ports              # Show open ports & risky services
  reconpro secrets            # Find secrets in environment & codebase

  # List modules
  reconpro list               # Remote modules
  reconpro list --local       # Local modules
  reconpro list --all         # All 11 modules""",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("--version", "-v", action="version",
                        version=f"ReconPro {__version__}")

    subparsers = parser.add_subparsers(dest="subcommand")

    # ── Remote subcommands ───────────────────────────────────────────
    vibesec_p = subparsers.add_parser("vibesec", help="Quick VibeSec benchmark (remote)")
    _add_scan_args(vibesec_p)

    scan_p = subparsers.add_parser("scan", help="Full remote scan with module selection")
    scan_p.add_argument("target", help="Target domain or URL")
    scan_p.add_argument("--modules", "-m", type=str, default=None,
                        help="Comma-separated module list")
    scan_p.add_argument("--all", "-a", action="store_true", help="Run all remote modules")
    scan_p.add_argument("--json", dest="json_output", action="store_true")
    scan_p.add_argument("-o", "--output", dest="output_file", type=str)
    scan_p.add_argument("--timeout", "-t", type=int, default=8)
    scan_p.add_argument("--insecure", "-k", action="store_true")
    scan_p.add_argument("--rate-limit", type=float, default=10.0)

    # ── Local subcommands ────────────────────────────────────────────
    audit_p = subparsers.add_parser("audit", help="Full laptop/machine security audit")
    audit_p.add_argument("--modules", "-m", type=str, default=None,
                         help="Comma-separated local module list (host,dev,doctor)")
    audit_p.add_argument("--json", dest="json_output", action="store_true")
    audit_p.add_argument("-o", "--output", dest="output_file", type=str)

    dev_p = subparsers.add_parser("dev", help="Developer security scan (secrets, deps, git, docker)")
    dev_p.add_argument("path", nargs="?", default=".", help="Directory to scan (default: .)")
    dev_p.add_argument("--json", dest="json_output", action="store_true")
    dev_p.add_argument("-o", "--output", dest="output_file", type=str)

    doctor_p = subparsers.add_parser("doctor", help="Quick security health check with fix commands")
    doctor_p.add_argument("--json", dest="json_output", action="store_true")
    doctor_p.add_argument("-o", "--output", dest="output_file", type=str)

    ports_p = subparsers.add_parser("ports", help="Show open ports and risky services")
    ports_p.add_argument("--json", dest="json_output", action="store_true")

    secrets_p = subparsers.add_parser("secrets", help="Find secrets in env vars and codebase")
    secrets_p.add_argument("path", nargs="?", default=".", help="Directory to scan (default: .)")
    secrets_p.add_argument("--json", dest="json_output", action="store_true")

    # list subcommand
    list_p = subparsers.add_parser("list", help="List available modules")
    list_p.add_argument("--local", action="store_true", help="Show local modules only")
    list_p.add_argument("--all", action="store_true", help="Show all 11 modules")

    # Parse
    args, remaining = parser.parse_known_args(argv)

    # ── List modules ─────────────────────────────────────────────────
    if args.subcommand == "list":
        show_all = getattr(args, "all", False)
        show_local = getattr(args, "local", False)

        if show_local or show_all:
            console.print("\n[bold bright_yellow]Local Modules (scan your machine):[/bold bright_yellow]\n")
            for mid, entry in LOCAL_MODULES.items():
                default = " (default)" if mid in DEFAULT_LOCAL_MODULES else ""
                console.print(f"  [cyan]{mid:12}[/] {entry['name']:18}{default}")

        if not show_local or show_all:
            console.print("\n[bold]Remote Modules (scan URLs/domains):[/bold]\n")
            for mid, entry in MODULE_REGISTRY.items():
                default = " (default)" if mid in DEFAULT_MODULES else ""
                console.print(f"  [cyan]{mid:12}[/] {entry['name']:18}{default}")

        console.print(f"\n  [dim]Remote default: {', '.join(DEFAULT_MODULES)}[/]")
        console.print(f"  [dim]Local default: {', '.join(DEFAULT_LOCAL_MODULES)}[/]")
        console.print(f"  [dim]Total: {len(ALL_MODULES)} modules[/]\n")
        return

    # ── Audit subcommand (full local machine scan) ──────────────────
    if args.subcommand == "audit":
        console.print(BANNER)
        modules = None
        if getattr(args, "modules", None):
            modules = [m.strip().lower() for m in args.modules.split(",")]
        console.print(f"  [dim]v{__version__} | auditing local machine | modules: {modules or 'default'}[/]\n")
        console.print("  [bold]Scanning [bright_yellow]your machine[/] ...[/]\n")

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("Auditing machine...", total=None)
            result = audit_scan(target="localhost", modules=modules)
            progress.update(task, completed=True)

        _output_result(result, args, title="HOST AUDIT", show_remediation=True)
        return

    # ── Dev subcommand (developer project scan) ─────────────────────
    if args.subcommand == "dev":
        path = getattr(args, "path", ".")
        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | dev scan: {os.path.abspath(path)}[/]\n")
        console.print(f"  [bold]Scanning [bright_cyan]project[/] ...[/]\n")

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("Scanning project...", total=None)
            result = audit_scan(target=path, modules=["dev"])
            progress.update(task, completed=True)

        _output_result(result, args, title="DEV SEC", show_remediation=True)
        return

    # ── Doctor subcommand (health check) ─────────────────────────────
    if args.subcommand == "doctor":
        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | security health check[/]\n")
        console.print("  [bold bright_green]Running diagnostics...[/]\n")

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("Running doctor...", total=None)
            result = audit_scan(target="localhost", modules=["doctor"])
            progress.update(task, completed=True)

        _output_result(result, args, title="DOCTOR", show_remediation=True)
        return

    # ── Ports subcommand (quick port scan) ───────────────────────────
    if args.subcommand == "ports":
        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | port scan[/]\n")

        from .modules.host import _check_open_ports
        hostname = __import__("os").uname().nodename

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("Scanning ports...", total=None)
            findings = _check_open_ports()
            progress.update(task, completed=True)

        if not findings:
            console.print("\n  [bright_green]No open ports detected.[/]")
        else:
            console.print(f"\n  [bold]{len(findings)} finding(s):[/bold]\n")
            for f in findings:
                sev = f.severity
                color = SEV_COLORS.get(sev, "white")
                console.print(f"  [{color}]{sev.upper():8}[/{color}]  {f.title}")
        console.print()
        return

    # ── Secrets subcommand (find secrets) ────────────────────────────
    if args.subcommand == "secrets":
        path = getattr(args, "path", ".")
        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | secret scan: {os.path.abspath(path)}[/]\n")
        console.print("  [bold bright_red]Hunting for secrets...[/]\n")

        from .modules.host import _check_env_secrets
        from .modules.dev import _check_env_files, _check_hardcoded_secrets

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("Scanning for secrets...", total=None)
            all_findings = []
            all_findings.extend(_check_env_secrets())
            all_findings.extend(_check_env_files(os.path.abspath(path)))
            all_findings.extend(_check_hardcoded_secrets(os.path.abspath(path)))
            progress.update(task, completed=True)

        # Count
        total = len(all_findings)
        crit = sum(1 for f in all_findings if f.severity == "critical")
        high = sum(1 for f in all_findings if f.severity == "high")

        if total == 0:
            console.print("\n  [bright_green]No secrets found. Clean.[/]")
        else:
            console.print(Panel(
                Group(
                    Text(f"\n  [bold bright_red]{total} secret(s) found[/bold bright_red]  "
                         f"[bright_red]{crit} critical[/], [red]{high} high[/]"),
                ),
                border_style="bright_red",
                title="[bold]SECRET SCAN[/bold]",
                title_align="left",
                padding=(1, 2),
            ))
            console.print()
            for f in all_findings:
                sev = f.severity
                color = SEV_COLORS.get(sev, "white")
                console.print(f"  [{color}]{sev.upper():8}[/{color}]  {f.title}")
                if f.remediation:
                    console.print(f"           [dim]{f.remediation}[/dim]")
        console.print()
        return

    # ── VibeSec subcommand ───────────────────────────────────────────
    if args.subcommand == "vibesec":
        target = args.target
        if not target:
            parser.parse_args(["vibesec", "--help"])
            sys.exit(1)
        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | {target} | modules: vibesec[/]\n")
        console.print(f"  [bold]Scanning [cyan]{target}[/] ...[/]\n")

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("ReconPro scanning...", total=None)
            result = scan(target, modules=["vibesec"],
                          timeout=args.timeout, verify_tls=not args.insecure,
                          rate_limit=args.rate_limit)
            progress.update(task, completed=True)

        _output_result(result, args)
        return

    # ── Scan subcommand (explicit) ───────────────────────────────────
    if args.subcommand == "scan":
        target = args.target
        if not target:
            parser.parse_args(["scan", "--help"])
            sys.exit(1)
        modules = ([m.strip().lower() for m in args.modules.split(",")]
                  if args.modules else None)
        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | {target} | modules: {modules or 'default'}[/]\n")
        console.print(f"  [bold]Scanning [cyan]{target}[/] ...[/]\n")

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("ReconPro scanning...", total=None)
            result = scan(target, modules=modules, all_modules=args.all,
                          timeout=args.timeout, verify_tls=not args.insecure,
                          rate_limit=args.rate_limit)
            progress.update(task, completed=True)

        _output_result(result, args)
        return

    # ── Implicit scan (no subcommand, first arg is target) ───────────
    if remaining and not args.subcommand:
        target = remaining[0]
        scan_args = parser.parse_args(["scan"] + remaining)
        modules = ([m.strip().lower() for m in scan_args.modules.split(",")]
                  if scan_args.modules else None)

        console.print(BANNER)
        console.print(f"  [dim]v{__version__} | {target} | modules: {modules or 'default'}[/]\n")
        console.print(f"  [bold]Scanning [cyan]{target}[/] ...[/]\n")

        with Progress(SpinnerColumn(), TextColumn("[bold]{task.description}[/]"),
                       TimeElapsedColumn(), console=console) as progress:
            task = progress.add_task("ReconPro scanning...", total=None)
            result = scan(target, modules=modules, all_modules=scan_args.all,
                          timeout=scan_args.timeout, verify_tls=not scan_args.insecure,
                          rate_limit=scan_args.rate_limit)
            progress.update(task, completed=True)

        _output_result(result, scan_args)
        return

    # ── No args: show help ───────────────────────────────────────────
    parser.print_help()
    sys.exit(0)


def _output_result(result, args, title: str = "RECONPRO", show_remediation: bool = False) -> None:
    """Render a result to the terminal."""
    json_output = getattr(args, "json_output", False)
    output_file = getattr(args, "output_file", None)

    if json_output:
        text = json.dumps(result.to_dict(), indent=2, default=str)
        if output_file:
            with open(output_file, "w") as fp:
                fp.write(text)
            console.print(f"  [green]JSON report saved to [cyan]{output_file}[/][/]")
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
            console.print(f"\n  [green]JSON report saved to [cyan]{output_file}[/][/]")

    console.print()


if __name__ == "__main__":
    main()
