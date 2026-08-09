"""Parallel multi-target scanning.

Blitz mode: scan N targets simultaneously using ThreadPoolExecutor.
"""
from __future__ import annotations

import concurrent.futures
import threading
from typing import Any, Dict, List, Optional, Tuple

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn, BarColumn
from rich.table import Table
from rich.text import Text

from .scanner import scan, audit_scan
from .http import Finding, compute_grade

console = Console()

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


def _scan_one_target(
    target: str,
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 8,
    verify_tls: bool = True,
    rate_limit: float = 10.0,
    is_local: bool = False,
) -> Tuple[str, Any, Optional[Exception]]:
    """Scan a single target. Returns (target, result_or_none, error_or_none)."""
    try:
        if is_local:
            result = audit_scan(target=target, modules=modules)
        else:
            result = scan(
                target, modules=modules, all_modules=all_modules,
                timeout=timeout, verify_tls=verify_tls, rate_limit=rate_limit,
            )
        return (target, result, None)
    except Exception as e:
        return (target, None, e)


def blitz_scan(
    targets: List[str],
    max_workers: int = 4,
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 8,
    verify_tls: bool = True,
    rate_limit: float = 10.0,
    save: bool = True,
) -> Dict[str, Any]:
    """Scan multiple targets in parallel.

    Returns a summary dict with all results.
    """
    results: Dict[str, Any] = {}
    lock = threading.Lock()
    errors: List[str] = []
    completed_count = [0]

    def on_done(future: concurrent.futures.Future) -> None:
        target, result, error = future.result()
        with lock:
            if error:
                errors.append(f"{target}: {error}")
            elif result:
                results[target] = result
                if save:
                    from .history import save_scan
                    save_scan(result.to_dict(), label="blitz")
            completed_count[0] += 1

    console.print(f"  [bold]Blitz scanning [cyan]{len(targets)}[/] targets with [yellow]{max_workers}[/] workers...[/]")

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for target in targets:
            f = executor.submit(
                _scan_one_target, target, modules, all_modules,
                timeout, verify_tls, rate_limit,
            )
            f.add_done_callback(on_done)
            futures[f] = target

        with Progress(
            SpinnerColumn(),
            BarColumn(),
            TextColumn("[bold]{task.completed}/{task.total}[/]"),
            TimeElapsedColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("Blitz", total=len(targets))
            for f in concurrent.futures.as_completed(futures):
                progress.update(task, advance=1)

    # Build summary
    total_findings = sum(len(r.findings) for r in results.values())
    avg_score = (sum(r.total_score for r in results.values()) / len(results)) if results else 0
    avg_grade = compute_grade(int(avg_score))

    summary = {
        "targets_scanned": len(targets),
        "successful": len(results),
        "failed": len(errors),
        "total_findings": total_findings,
        "average_score": int(avg_score),
        "average_grade": avg_grade,
        "results": {t: r.to_dict() for t, r in results.items()},
        "errors": errors,
    }

    # Render results
    _render_blitz_summary(summary, results)

    return summary


def _render_blitz_summary(summary: Dict, results: Dict) -> None:
    """Render a nice blitz results table."""
    # Score summary table
    table = Table(
        title=f"Blitz Results — {summary['targets_scanned']} targets, {summary['total_findings']} findings",
        border_style="bright_white",
        header_style="bold bright_white",
    )
    table.add_column("Target", style="cyan", width=30)
    table.add_column("Score", style="bold", width=8)
    table.add_column("Grade", style="bold", width=8)
    table.add_column("Findings", style="white", width=10)
    table.add_column("Critical", style="bright_red", width=10)
    table.add_column("High", style="red", width=8)
    table.add_column("Modules", style="dim")

    for target, result in results.items():
        grade = result.grade
        gc = GRADE_COLORS.get(grade, "white")
        sc = result.severity_counts
        table.add_row(
            target[:30],
            str(result.total_score),
            f"[{gc}]{grade}[/{gc}]",
            str(len(result.findings)),
            str(sc.get("critical", 0)),
            str(sc.get("high", 0)),
            ", ".join(result.modules_run),
        )

    console.print(table)

    # Overall
    gc = GRADE_COLORS.get(summary["average_grade"], "white")
    console.print(f"\n  [bold]Average Score:[/] [{gc}]{summary['average_score']}/100 ({summary['average_grade']})[/{gc}]")

    if summary["errors"]:
        console.print(f"\n  [red]{len(summary['errors'])} failed:[/]")
        for e in summary["errors"]:
            console.print(f"    [red]✗[/] {e}")
    console.print()
