from __future__ import annotations

import argparse
import json
import sys
import time

from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.text import Text
from rich.columns import Columns
from rich.rule import Rule

from . import __version__
from .scanner import scan, MODULE_REGISTRY, ALL_MODULES, DEFAULT_MODULES

console = Console()

BANNER = r"""[bold bright_white]
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██║███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝
[/bold bright_white][dim]          E I G H T   B L A D E S .   O N E   T A R G E T .   O N E   V E R D I C T.[/dim]
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


def _render_summary(result) -> None:
    score = result.total_score
    grade = result.grade
    grade_color = GRADE_COLORS.get(grade, "bold bright_red")
    sc = result.severity_counts
    total = len(result.findings)

    bar_width = 50
    filled = int(score / 100 * bar_width)
    bar = "█" * filled + "░" * (bar_width - filled)

    console.print(Panel(
        Group(
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
            *(
                [Text(f"\n  VibeSec Score: [bold bright_green]{result.vibesec_score}/100 ({result.vibesec_grade})[/]")]
                if result.vibesec_score is not None else []
            ),
        ),
        border_style=grade_color,
        title="[bold]RECONPRO[/bold]",
        title_align="left",
        padding=(1, 2),
    ))


def _render_findings_table(result) -> None:
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

    for f in result.findings[:50]:
        sev = f.get("severity", "info")
        color = SEV_COLORS.get(sev, "white")
        table.add_row(
            f"[{color}]{sev.upper()}[/{color}]",
            f.get("module", ""),
            f.get("category", ""),
            f.get("title", "")[:70],
            str(f.get("points_deducted", 0)),
        )

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


# ── CLI entry point ─────────────────────────────────────────────────────


def _add_scan_args(p: argparse.ArgumentParser) -> None:
    """Add shared scan arguments to a parser."""
    p.add_argument("target", help="Target domain or URL")
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
            "ReconPro Enterprise — Eight Blades. One Target. One Verdict.\n"
            "The full-spectrum security reconnaissance platform."
        ),
        epilog="Examples:\n"
            "  reconpro example.com\n"
            "  reconpro example.com --modules recon,auth,vibesec\n"
            "  reconpro example.com --all --json -o report.json\n"
            "  reconpro vibesec example.com",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("--version", "-v", action="version",
                        version=f"ReconPro {__version__}")

    subparsers = parser.add_subparsers(dest="subcommand")

    # vibesec quick subcommand
    vibesec_p = subparsers.add_parser("vibesec", help="Quick VibeSec benchmark")
    _add_scan_args(vibesec_p)

    # scan subcommand (default behavior)
    scan_p = subparsers.add_parser("scan", help="Full scan with module selection")
    scan_p.add_argument("target", help="Target domain or URL")
    scan_p.add_argument("--modules", "-m", type=str, default=None,
                        help="Comma-separated module list")
    scan_p.add_argument("--all", "-a", action="store_true",
                        help="Run all 8 modules")
    scan_p.add_argument("--json", dest="json_output", action="store_true")
    scan_p.add_argument("-o", "--output", dest="output_file", type=str)
    scan_p.add_argument("--timeout", "-t", type=int, default=8)
    scan_p.add_argument("--insecure", "-k", action="store_true")
    scan_p.add_argument("--rate-limit", type=float, default=10.0)

    # list subcommand
    subparsers.add_parser("list", help="List available modules")

    # Catchall: if first positional doesn't match a subcommand, treat as scan
    args, remaining = parser.parse_known_args(argv)

    # List modules
    if args.subcommand == "list":
        console.print("\n[bold]Available Modules:[/bold]\n")
        for mid, entry in MODULE_REGISTRY.items():
            default = " (default)" if mid in DEFAULT_MODULES else ""
            console.print(f"  [cyan]{mid:12}[/] {entry['name']:18}{default}")
        console.print(f"\n  [dim]Default: {', '.join(DEFAULT_MODULES)}[/]")
        console.print(f"  [dim]Use --all to run all 8 modules[/]\n")
        return

    # Handle vibesec subcommand
    if args.subcommand == "vibesec":
        if not args.target:
            parser.parse_args(["vibesec", "--help"])
            sys.exit(1)
        target = args.target
        modules = ["vibesec"]
        json_output = args.json_output
        output_file = args.output_file
        timeout = args.timeout
        verify_tls = not args.insecure
        rate_limit = args.rate_limit
    # Handle explicit scan subcommand
    elif args.subcommand == "scan":
        if not args.target:
            parser.parse_args(["scan", "--help"])
            sys.exit(1)
        target = args.target
        modules = ([m.strip().lower() for m in args.modules.split(",")]
                  if args.modules else None)
        json_output = args.json_output
        output_file = args.output_file
        timeout = args.timeout
        verify_tls = not args.insecure
        rate_limit = args.rate_limit
        all_modules = args.all
    # Handle implicit scan (no subcommand, first arg is the target)
    elif remaining and not args.subcommand:
        target = remaining[0]
        # Re-parse with explicit scan subcommand to get flags
        scan_args = parser.parse_args(["scan"] + remaining)
        modules = ([m.strip().lower() for m in scan_args.modules.split(",")]
                  if scan_args.modules else None)
        json_output = scan_args.json_output
        output_file = scan_args.output_file
        timeout = scan_args.timeout
        verify_tls = not scan_args.insecure
        rate_limit = scan_args.rate_limit
        all_modules = scan_args.all
    else:
        parser.print_help()
        sys.exit(1)

    target = target.strip()

    # Banner
    console.print(BANNER)
    console.print(f"  [dim]v{__version__} | {target} | modules: {modules or 'default'}[/]\n")
    console.print(f"  [bold]Scanning [cyan]{target}[/] ...[/]\n")

    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold]{task.description}[/]"),
            TimeElapsedColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("ReconPro scanning...", total=None)
            result = scan(
                target,
                modules=modules,
                all_modules=all_modules if args.subcommand == "scan" else False,
                timeout=timeout,
                verify_tls=verify_tls,
                rate_limit=rate_limit,
            )
            progress.update(task, completed=True)
    except KeyboardInterrupt:
        console.print("\n  [yellow]Scan interrupted.[/]")
        sys.exit(130)
    except Exception as exc:
        console.print(f"  [bright_red]Error:[/] {exc}")
        sys.exit(1)

    # Output
    if json_output:
        text = json.dumps(result.to_dict(), indent=2, default=str)
        if output_file:
            with open(output_file, "w") as fp:
                fp.write(text)
            console.print(f"  [green]JSON report saved to [cyan]{output_file}[/][/]")
        else:
            console.print(text)
    else:
        _render_summary(result)
        console.print()
        _render_module_breakdown(result)
        console.print()
        _render_findings_table(result)
        _render_badge(result)

        if output_file:
            with open(output_file, "w") as fp:
                fp.write(json.dumps(result.to_dict(), indent=2, default=str))
            console.print(f"\n  [green]JSON report saved to [cyan]{output_file}[/][/]")

    console.print()
    sys.exit(0)


if __name__ == "__main__":
    main()