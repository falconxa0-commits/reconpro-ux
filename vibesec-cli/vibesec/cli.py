"""VibeSec CLI — beautiful terminal interface using Rich."""

from __future__ import annotations

import argparse
import json
import sys

from rich.console import Console, Group
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from . import __version__
from .scanner import scan, VibeSecResult

console = Console()


# ── Rich rendering ──────────────────────────────────────────────────────

SEV_COLORS = {
    "critical": "bright_red",
    "high": "red",
    "medium": "yellow",
    "low": "green",
    "info": "dim",
}

GRADE_RICH_COLORS = {
    "A+": "bright_green",
    "A": "green",
    "B": "yellow",
    "C": "red",
    "D": "bright_red",
    "F": "bold bright_red",
}


def _render_result(result: VibeSecResult) -> None:
    """Render scan results as a Rich panel with grade, table, and badge."""
    score = result.score
    grade = result.grade
    grade_color = GRADE_RICH_COLORS.get(grade, "bold bright_red")
    sc = result.severity_counts
    total = len(result.findings)

    # Score bar
    bar_width = 40
    filled = int(score / 100 * bar_width)
    bar = "█" * filled + "░" * (bar_width - filled)

    console.print(Panel(
        Group(
            Text("\n  VIBESEC BENCHMARK — AI/Vibe-Coding Vulnerability Audit", style="bold bright_green"),
            Text(""),
            Text(f"  Score: {bar} [bold {grade_color}]{score}/100 ({grade})[/{grade_color}]", style="white"),
            Text(""),
            Text(
                f"  Findings: [bold]{total}[/]  "
                f"[bright_red]{sc.get('critical', 0)} critical[/], "
                f"[red]{sc.get('high', 0)} high[/], "
                f"[yellow]{sc.get('medium', 0)} medium[/], "
                f"[green]{sc.get('low', 0)} low[/], "
                f"[dim]{sc.get('info', 0)} info[/]",
            ),
        ),
        border_style="bright_green",
        title="[bold]VIBESEC[/bold]",
        title_align="left",
        padding=(1, 2),
    ))

    # Category summary
    cats = result.categories_checked
    cat_counts: dict[str, int] = {}
    for f in result.findings:
        cat_counts[f["category"]] = cat_counts.get(f["category"], 0) + 1
    cat_line_parts = []
    for c in cats:
        n = cat_counts.get(c, 0)
        cat_line_parts.append(f"[cyan]{c}[/]: {n}")
    console.print(f"  Categories: {'  '.join(cat_line_parts)}")
    console.print()

    # Findings table
    if result.findings:
        table = Table(
            title=f"Vibe Coding Vulnerabilities — {len(result.findings)} detected",
            border_style="bright_green",
            header_style="bold bright_green",
            show_lines=False,
        )
        table.add_column("Severity", style="bold", width=10)
        table.add_column("Category", style="cyan", width=18)
        table.add_column("Finding", style="white")
        table.add_column("Pts", style="yellow", width=5)
        for f in result.findings[:30]:
            sev = f["severity"]
            color = SEV_COLORS.get(sev, "white")
            table.add_row(
                f"[{color}]{sev.upper()}[/{color}]",
                f["category"],
                f["title"][:70],
                str(f.get("points_deducted", 0)),
            )
        console.print(table)

    # Badge snippet
    if result.badge_markdown:
        console.print()
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


def _render_json(result: VibeSecResult) -> str:
    """Return JSON-serialised result."""
    return json.dumps(result.to_dict(), indent=2, default=str)


# ── CLI entry point ─────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> None:
    """Parse args and run VibeSec scan."""
    parser = argparse.ArgumentParser(
        prog="vibesec",
        description=(
            "VibeSec — The security scanner for AI-built apps. "
            "100-point benchmark. A+ to F grades. GitHub badge included."
        ),
        epilog="Example: vibesec example.com --json -o report.json",
    )
    parser.add_argument("target", nargs="?", help="Target domain or URL to scan")
    parser.add_argument("--json", dest="json_output", action="store_true",
                        help="Output results as JSON")
    parser.add_argument("-o", "--output", dest="output_file", type=str, default=None,
                        help="Save JSON output to file")
    parser.add_argument("--timeout", type=int, default=5,
                        help="Per-request timeout in seconds (default: 5)")
    parser.add_argument("--version", action="version",
                        version=f"vibesec {__version__}")

    args = parser.parse_args(argv)

    if not args.target:
        parser.print_help()
        sys.exit(1)

    target = args.target.strip()

    # Banner
    console.print()
    console.print("[bold bright_green]  ██╗    ██╗ ██████╗ ███████╗███████╗██╗███╗   ██╗ ██████╗ ███████╗████████╗[/]")
    console.print("[bold bright_green]  ██║    ██║██╔═══██╗██╔════╝██╔════╝██║████╗  ██║██╔═══██╗██╔════╝╚══██╔══╝[/]")
    console.print("[bold bright_green]  ██║ █╗ ██║██║   ██║███████╗███████╗██║██╔██╗ ██║██║   ██║███████╗   ██║   [/]")
    console.print("[bold bright_green]  ██║███╗██║██║   ██║╚════██║╚════██║██║██║╚██╗██║██║   ██║╚════██║   ██║   [/]")
    console.print("[bold bright_green]  ╚███╔███╔╝╚██████╔╝███████║███████║██║██║ ╚████║╚██████╔╝███████║   ██║   [/]")
    console.print("[bold bright_green]   ╚══╝╚══╝  ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝   ╚═╝   [/]")
    console.print(f"  [dim]v{__version__} | AI/Vibe-Coding Vulnerability Benchmark | {target}[/]")
    console.print()

    # Scan
    console.print(f"  [bold]Scanning [cyan]{target}[/] ...[/]")
    console.print()

    try:
        result = scan(target, timeout=args.timeout, json_output=args.json_output)
    except KeyboardInterrupt:
        console.print("\n  [yellow]Scan interrupted.[/]", style="bold")
        sys.exit(130)
    except Exception as exc:
        console.print(f"  [bright_red]Error:[/] {exc}")
        sys.exit(1)

    # Output
    if args.json_output:
        text = _render_json(result)
        if args.output_file:
            with open(args.output_file, "w") as fp:
                fp.write(text)
            console.print(f"  [green]JSON report saved to [cyan]{args.output_file}[/][/]")
        else:
            console.print(text)
    else:
        _render_result(result)
        if args.output_file:
            with open(args.output_file, "w") as fp:
                fp.write(_render_json(result))
            console.print(f"  [green]JSON report also saved to [cyan]{args.output_file}[/][/]")

    console.print()
    sys.exit(0)


if __name__ == "__main__":
    main()
