#!/usr/bin/env python3
"""Fix JSON compliance across all CLI commands.
Replace console.print(json.dumps(...)) with print(json.dumps(...))
and ensure JSON-only stdout when --json is active.
"""
import re

filepath = "/home/z/my-project/reconpro-work/reconpro/cli.py"

with open(filepath, 'r') as f:
    content = f.read()

changes = []

# ── Fix 1: _print_findings — use print() not console.print_json() ──
old = '''    if getattr(args, 'json_output', False):
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
        console.print_json(json.dumps(out, indent=2, default=str))'''
new = '''    if getattr(args, 'json_output', False):
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
        print(json.dumps(out, indent=2, default=str))
        return'''

if old in content:
    content = content.replace(old, new)
    changes.append("Fix _print_findings: console.print_json -> print + return")

# ── Fix 2: ports command — JSON mode should skip Rich output ──
old_ports = '''    if cmd == "ports":
        _banner(args)
        from .modules.host import _check_open_ports
        findings = _spinner_wrap("Scanning ports...", _check_open_ports)
        if not findings:
            console.print("\\n  [bright_green]No risky ports found.[/]")
        else:
            for f in findings:
                c = SEV_COLORS.get(f.severity, "white")
                console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
            if args.json_output:
                console.print(json.dumps([f.to_dict() for f in findings], indent=2, default=str))
        console.print()
        return'''
new_ports = '''    if cmd == "ports":
        from .modules.host import _check_open_ports
        findings = _spinner_wrap("Scanning ports...", _check_open_ports)
        if getattr(args, 'json_output', False):
            print(json.dumps([f.to_dict() for f in findings], indent=2, default=str))
        else:
            _banner(args)
            if not findings:
                console.print("\\n  [bright_green]No risky ports found.[/]")
            else:
                for f in findings:
                    c = SEV_COLORS.get(f.severity, "white")
                    console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
            console.print()
        return'''

if old_ports in content:
    content = content.replace(old_ports, new_ports)
    changes.append("Fix ports: JSON mode skips Rich")

# ── Fix 3: secrets command — JSON mode should skip Rich output ──
old_secrets = '''    if cmd == "secrets":
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
            console.print("\\n  [bright_green]No secrets found. Clean.[/]")
        else:
            console.print(Panel(Group(
                Text(f"\\n  [bold bright_red]{total} secret(s) found[/]  [bright_red]{crit} critical[/], [red]{high} high[/]"),
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
        return'''
new_secrets = '''    if cmd == "secrets":
        path = args.path
        from .modules.host import _check_env_secrets
        from .modules.dev import _check_env_files, _check_hardcoded_secrets
        all_f = _spinner_wrap("Hunting secrets...", lambda: (
            _check_env_secrets() +
            _check_env_files(os.path.abspath(path)) +
            _check_hardcoded_secrets(os.path.abspath(path))
        ))
        if getattr(args, 'json_output', False):
            print(json.dumps([f.to_dict() for f in all_f], indent=2, default=str))
        else:
            _banner(args)
            total = len(all_f)
            crit = sum(1 for f in all_f if f.severity == "critical")
            high = sum(1 for f in all_f if f.severity == "high")
            if total == 0:
                console.print("\\n  [bright_green]No secrets found. Clean.[/]")
            else:
                console.print(Panel(Group(
                    Text(f"\\n  [bold bright_red]{total} secret(s) found[/]  [bright_red]{crit} critical[/], [red]{high} high[/]"),
                ), border_style="bright_red", title="[bold]SECRET SCAN[/bold]", padding=(1, 2)))
                console.print()
                for f in all_f:
                    c = SEV_COLORS.get(f.severity, "white")
                    console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
                    if f.remediation:
                        console.print(f"           [dim]{f.remediation}[/dim]")
            console.print()
        return'''

if old_secrets in content:
    content = content.replace(old_secrets, new_secrets)
    changes.append("Fix secrets: JSON mode skips Rich")

# ── Fix 4: All console.print(json.dumps(...)) → print(json.dumps(...)) ──
# This is a systematic replacement across the file
pattern_console_json = re.compile(r'console\.print\((_json\.dumps|json\.dumps)\(', re.MULTILINE)
matches = pattern_console_json.findall(content)
if matches:
    # Replace console.print(json.dumps/ _json.dumps with print(
    content = re.sub(r'console\.print\((_json\.dumps|json\.dumps)\(', r'print(\1(', content)
    changes.append(f"Fix console.print(json) -> print(json): {len(matches)} occurrences")

# ── Fix 5: console.print_json → print ──
pattern_print_json = re.compile(r'console\.print_json\(json\.dumps\(', re.MULTILINE)
matches_pj = pattern_print_json.findall(content)
if matches_pj:
    content = re.sub(r'console\.print_json\(json\.dumps\(', r'print(json.dumps(', content)
    changes.append(f"Fix console.print_json -> print: {len(matches_pj)} occurrences")

# ── Fix 6: engineering command — suppress Rich progress message in JSON ──
old_eng = '''    if cmd == "engineering":
        _banner(args)
        from .engineering_workflow import ContinuousEngineeringOrchestrator
        import json as _json
        repo = getattr(args, "repo", ".")
        console.print(f"\\n  [bold]Running full engineering pipeline on [cyan]{repo}[/]...[/]")'''
new_eng = '''    if cmd == "engineering":
        from .engineering_workflow import ContinuousEngineeringOrchestrator
        import json as _json
        repo = getattr(args, "repo", ".")
        if not getattr(args, "json_output", False):
            _banner(args)
            console.print(f"\\n  [bold]Running full engineering pipeline on [cyan]{repo}[/]...[/]")'''

if old_eng in content:
    content = content.replace(old_eng, new_eng)
    changes.append("Fix engineering: skip banner in JSON mode")

# ── Fix 7: validate command — suppress Rich in JSON ──
old_val = '''    if cmd == "validate":
        _banner(args)
        from .auto_validation import ValidationPipeline
        import json as _json
        repo = getattr(args, "repo", ".")
        console.print(f"\\n  [bold]Running validation pipeline on [cyan]{repo}[/]...[/]")'''
new_val = '''    if cmd == "validate":
        from .auto_validation import ValidationPipeline
        import json as _json
        repo = getattr(args, "repo", ".")
        if not getattr(args, "json_output", False):
            _banner(args)
            console.print(f"\\n  [bold]Running validation pipeline on [cyan]{repo}[/]...[/]")'''

if old_val in content:
    content = content.replace(old_val, new_val)
    changes.append("Fix validate: skip banner in JSON mode")

# ── Fix 8: benchmark-engineering — suppress Rich in JSON ──
old_bench = '''    if cmd == "benchmark-engineering":
        _banner(args)
        from .benchmark_automation import BenchmarkAutomation
        import json as _json
        console.print("\\n  [bold]Running engineering benchmarks...[/]")'''
new_bench = '''    if cmd == "benchmark-engineering":
        from .benchmark_automation import BenchmarkAutomation
        import json as _json
        if not getattr(args, "json_output", False):
            _banner(args)
            console.print("\\n  [bold]Running engineering benchmarks...[/]")'''

if old_bench in content:
    content = content.replace(old_bench, new_bench)
    changes.append("Fix benchmark-engineering: skip banner in JSON mode")

# ── Fix 9: auto-fix — suppress Rich progress in JSON ──
old_autofix = '''    if cmd == "auto-fix":
        _banner(args)
        from .auto_fix import AutoFixEngine
        import json as _json
        console.print("\\n  [bold]Analyzing for auto-fix proposals...[/]")'''
new_autofix = '''    if cmd == "auto-fix":
        from .auto_fix import AutoFixEngine
        import json as _json
        if not getattr(args, "json_output", False):
            _banner(args)
            console.print("\\n  [bold]Analyzing for auto-fix proposals...[/]")'''

if old_autofix in content:
    content = content.replace(old_autofix, new_autofix)
    changes.append("Fix auto-fix: skip banner in JSON mode")

# ── Fix 10: rate command — suppress Rich in JSON ──
old_rate = '''    if cmd == "rate":
        _banner(args)
        from .ratings import ('''
new_rate = '''    if cmd == "rate":
        from .ratings import ('''

if old_rate in content:
    content = content.replace(old_rate, new_rate)
    changes.append("Fix rate: skip banner in JSON mode")

# ── Fix 11: info health — fix console.print(_json.dumps → print ──
# Already handled by Fix 4

# ── Fix 12: report command — needs JSON handling ──
# Check report dispatch
old_report_check = '''    if cmd == "report":
        _banner(args)'''
# Need to see report section more carefully

# ── Fix 13: dashboard — check if it uses _output_result ──
# Need to read the dashboard dispatch

# ── Fix 14: export command — check JSON handling ──
# Need to read export dispatch

# ── Fix 15: digital-twin JSON mode ──
old_digital = '''    if cmd == "digital-twin":
        _banner(args)
        from .digital_twin import DigitalTwin
        import json as _json
        twin = DigitalTwin()
        if getattr(args, "capture", False):
            console.print("\\n  [bold]Capturing system state...[/]")
            state = twin.capture_state()
            twin.persist()
            console.print(f"  [green]State captured and persisted.[/]")
            console.print(f"  Components: {len(state.components)}")
            console.print(f"  Overall status: {state.overall_status}")
            return
        if getattr(args, "anomaly", False):
            console.print("\\n  [bold]Detecting anomalies...[/]")
            anomalies = twin.detect_anomaly()
            if anomalies:
                for a in anomalies[:20]:
                    console.print(f"  [yellow]ANOMALY[/]: {a}")
            else:
                console.print("  [green]No anomalies detected.[/]")
            return
        console.print("  Use: reconpro digital-twin --capture | --anomaly")
        return'''
new_digital = '''    if cmd == "digital-twin":
        from .digital_twin import DigitalTwin
        import json as _json
        twin = DigitalTwin()
        json_mode = getattr(args, "json_output", False)
        if getattr(args, "capture", False):
            state = twin.capture_state()
            twin.persist()
            if json_mode:
                print(_json.dumps(state.to_dict() if hasattr(state, "to_dict") else {"components": len(state.components), "status": state.overall_status}, indent=2, default=str))
            else:
                _banner(args)
                console.print("\\n  [bold]Capturing system state...[/]")
                console.print(f"  [green]State captured and persisted.[/]")
                console.print(f"  Components: {len(state.components)}")
                console.print(f"  Overall status: {state.overall_status}")
            return
        if getattr(args, "anomaly", False):
            anomalies = twin.detect_anomaly()
            if json_mode:
                print(_json.dumps({"anomalies": anomalies, "count": len(anomalies)}, indent=2, default=str))
            else:
                _banner(args)
                console.print("\\n  [bold]Detecting anomalies...[/]")
                if anomalies:
                    for a in anomalies[:20]:
                        console.print(f"  [yellow]ANOMALY[/]: {a}")
                else:
                    console.print("  [green]No anomalies detected.[/]")
            return
        if json_mode:
            print(_json.dumps({"error": "specify --capture or --anomaly"}, indent=2))
        else:
            _banner(args)
            console.print("  Use: reconpro digital-twin --capture | --anomaly")
        return'''

if old_digital in content:
    content = content.replace(old_digital, new_digital)
    changes.append("Fix digital-twin: JSON mode")

# ── Fix 16: regression --report JSON ──
old_regression = '''        if getattr(args, "report", False):
            report = ri.generate_regression_report()
            console.print(Panel(report, title="[bold]REGRESSION REPORT[/bold]", border_style="bright_cyan"))
            return'''
new_regression = '''        if getattr(args, "report", False):
            report = ri.generate_regression_report()
            if getattr(args, "json_output", False):
                print(_json.dumps(report, indent=2, default=str))
            else:
                console.print(Panel(report, title="[bold]REGRESSION REPORT[/bold]", border_style="bright_cyan"))
            return'''

if old_regression in content:
    content = content.replace(old_regression, new_regression)
    changes.append("Fix regression --report: JSON mode")

# ── Fix 17: notifications JSON ──
old_notif = '''        if digest:
            d = nc.digest()
            console.print(Panel(str(d), title="[bold]Notification Digest[/bold]", border_style="cyan", padding=(1, 2)))
        else:
            notifs = nc.get_all(level=level)
            if not notifs:
                console.print("  [dim]No notifications.[/]")
            else:
                table = Table(title=f"Notifications ({len(notifs)})", show_header=True, header_style="bold", border_style="dim")
                table.add_column("Level", width=10)
                table.add_column("Source", width=12)
                table.add_column("Time", width=8)
                table.add_column("Message")
                for n in notifs:
                    lvl = n.level.value if hasattr(n.level, "value") else str(n.level)
                    lvl_color = {"CRITICAL": "bright_red", "WARNING": "yellow", "ERROR": "red", "INFO": "dim", "SUCCESS": "bright_green"}.get(lvl.upper(), "white")
                    table.add_row(f"[{lvl_color}]{lvl.upper()}[/{lvl_color}]", n.source, n.timestamp[:19] if n.timestamp else "", n.message)
                console.print(table)
        console.print()
        return'''

new_notif = '''        json_out = getattr(args, "json_output", False)
        if json_out:
            import json as _json
            notifs = nc.get_all(level=level)
            print(_json.dumps([{"level": str(n.level), "source": n.source, "timestamp": n.timestamp, "message": n.message} for n in notifs], indent=2, default=str))
        elif digest:
            d = nc.digest()
            console.print(Panel(str(d), title="[bold]Notification Digest[/bold]", border_style="cyan", padding=(1, 2)))
        else:
            notifs = nc.get_all(level=level)
            if not notifs:
                console.print("  [dim]No notifications.[/]")
            else:
                table = Table(title=f"Notifications ({len(notifs)})", show_header=True, header_style="bold", border_style="dim")
                table.add_column("Level", width=10)
                table.add_column("Source", width=12)
                table.add_column("Time", width=8)
                table.add_column("Message")
                for n in notifs:
                    lvl = n.level.value if hasattr(n.level, "value") else str(n.level)
                    lvl_color = {"CRITICAL": "bright_red", "WARNING": "yellow", "ERROR": "red", "INFO": "dim", "SUCCESS": "bright_green"}.get(lvl.upper(), "white")
                    table.add_row(f"[{lvl_color}]{lvl.upper()}[/{lvl_color}]", n.source, n.timestamp[:19] if n.timestamp else "", n.message)
                console.print(table)
        console.print()
        return'''

if old_notif in content:
    content = content.replace(old_notif, new_notif)
    changes.append("Fix notifications: JSON mode")

# ── Fix 18: copilot JSON ──
old_copilot = '''    if cmd == "copilot":
        from .ai_copilot import AICopilot
        copilot = AICopilot()
        action = args.action
        finding = getattr(args, "finding", None)
        copilot_args = args.args if hasattr(args, "args") else []
        if action == "chat":
            message = " ".join(copilot_args) if copilot_args else "Hello"
            copilot.chat(message)
        elif action == "explain" and finding:
            copilot.explain(finding)
        elif action == "explain":
            copilot.explain(" ".join(copilot_args) if copilot_args else "No finding specified")
        elif action == "summarize":
            copilot.summarize()
        elif action == "remediate" and finding:
            copilot.remediate(finding)
        elif action == "remediate":
            copilot.remediate(" ".join(copilot_args) if copilot_args else "No finding specified")
        elif action == "compare":
            copilot.compare()
        console.print()
        return'''
new_copilot = '''    if cmd == "copilot":
        from .ai_copilot import AICopilot
        import json as _json
        copilot = AICopilot()
        action = args.action
        finding = getattr(args, "finding", None)
        copilot_args = args.args if hasattr(args, "args") else []
        json_mode = getattr(args, "json_output", False)
        result_data = {"action": action, "status": "executed"}
        if action == "chat":
            message = " ".join(copilot_args) if copilot_args else "Hello"
            copilot.chat(message)
        elif action == "explain" and finding:
            copilot.explain(finding)
        elif action == "explain":
            copilot.explain(" ".join(copilot_args) if copilot_args else "No finding specified")
        elif action == "summarize":
            copilot.summarize()
        elif action == "remediate" and finding:
            copilot.remediate(finding)
        elif action == "remediate":
            copilot.remediate(" ".join(copilot_args) if copilot_args else "No finding specified")
        elif action == "compare":
            copilot.compare()
        console.print()
        return'''

if old_copilot in content:
    content = content.replace(old_copilot, new_copilot)
    changes.append("Fix copilot: stub JSON mode")

# ── Fix 19: report command — add JSON for no-data case ──
# The report command with _output_result should already work
# But check the error path
old_report_err = '''        if not data:
            console.print("  [yellow]No scan data. Run a scan first.[/]")
            sys.exit(1)'''
new_report_err = '''        if not data:
            if getattr(args, 'json_output', False):
                print(json.dumps({"error": "no scan data", "message": "Run a scan first"}, indent=2))
            else:
                console.print("  [yellow]No scan data. Run a scan first.[/]")
            sys.exit(1)'''

if old_report_err in content:
    content = content.replace(old_report_err, new_report_err)
    changes.append("Fix report error path: JSON mode")

# ── Fix 20: cloud-recon — JSON mode ──
old_cloud = '''    if cmd == "cloud-recon":
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
        return'''
new_cloud = '''    if cmd == "cloud-recon":
        target = args.target
        from .modules.cloud_recon import run_cloud_recon
        findings = _spinner_wrap(f"Cloud recon on {target}...", run_cloud_recon, target, target if target.startswith("http") else f"https://{target}")
        if getattr(args, 'json_output', False):
            print(json.dumps([f.to_dict() for f in findings], indent=2, default=str))
        else:
            _banner(args)
            if findings:
                for f in findings:
                    c = SEV_COLORS.get(f.severity, "white")
                    console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
                console.print(f"  [bold]{len(findings)} cloud finding(s).[/]")
            else:
                console.print("  [dim]No cloud findings.[/]")
            console.print()
        return'''

if old_cloud in content:
    content = content.replace(old_cloud, new_cloud)
    changes.append("Fix cloud-recon: JSON mode")

# ── Fix 21: netmap — JSON mode ──
old_netmap = '''    if cmd == "netmap":
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
        return'''
new_netmap = '''    if cmd == "netmap":
        from .netmap import run_local
        findings = _spinner_wrap("Mapping network...", run_local)
        if getattr(args, 'json_output', False):
            print(json.dumps([f.to_dict() for f in findings], indent=2, default=str))
        else:
            _banner(args)
            if not findings:
                console.print("  [bright_green]No network issues found.[/]")
            else:
                for f in findings[:20]:
                    c = SEV_COLORS.get(f.severity, "white")
                    console.print(f"  [{c}]{f.severity.upper():8}[/{c}]  {f.title}")
            console.print()
        return'''

if old_netmap in content:
    content = content.replace(old_netmap, new_netmap)
    changes.append("Fix netmap: JSON mode")

# ── Fix 22: compliance — JSON mode ──
old_compliance = '''    if cmd == "compliance":
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
        return'''
new_compliance = '''    if cmd == "compliance":
        data = None
        if getattr(args, "input", None):
            with open(args.input) as f:
                data = json.load(f)
        if not data:
            data = get_latest()
        if not data:
            if getattr(args, 'json_output', False):
                print(json.dumps({"error": "no scan data"}, indent=2))
            else:
                _banner(args)
                console.print("  [yellow]No scan data. Run a scan first.[/]")
            sys.exit(1)
        frameworks = [f.strip() for f in args.frameworks.split(",")]
        from .compliance import ComplianceMapper
        mapper = ComplianceMapper()
        report = _spinner_wrap(f"Mapping to {', '.join(frameworks)}...", mapper.map_findings, data.get("findings", []), frameworks)
        if getattr(args, 'json_output', False):
            result_data = {}
            for fw, info in report.per_framework.items():
                result_data[fw] = {"compliance_pct": info.get("compliance_pct", 0), "covered_controls": info.get("covered_controls", 0), "total_controls": info.get("total_controls", 0)}
            print(json.dumps(result_data, indent=2, default=str))
        else:
            _banner(args)
            for fw, info in report.per_framework.items():
                pct = info.get("compliance_pct", 0)
                color = "green" if pct >= 80 else ("yellow" if pct >= 50 else "red")
                console.print(f"  [{color}]{fw}:[/] {pct:.0f}% ({info.get('covered_controls', 0)}/{info.get('total_controls', 0)} controls)")
            console.print()
        return'''

if old_compliance in content:
    content = content.replace(old_compliance, new_compliance)
    changes.append("Fix compliance: JSON mode")

# ── Fix 23: passive — JSON mode ──
old_passive = '''    if cmd == "passive":
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
        return'''
new_passive = '''    if cmd == "passive":
        from .passive_intel import PassiveDNS, WaybackMachine
        domain = args.domain
        json_mode = getattr(args, 'json_output', False)
        wb = WaybackMachine()
        history = _spinner_wrap(f"Querying Wayback Machine for {domain}...", wb.get_history, domain)
        pdns = PassiveDNS()
        dns_results = _spinner_wrap(f"Resolving DNS for {domain}...", pdns.resolve_dns, domain)
        vt_key = os.environ.get("VIRUSTOTAL_API_KEY", "")
        vt_results = None
        if vt_key:
            vt_results = _spinner_wrap(f"Querying VirusTotal for {domain}...", pdns.query_virustotal, domain, vt_key)
        if json_mode:
            print(json.dumps({"domain": domain, "wayback": history, "dns": dns_results, "virustotal": vt_results}, indent=2, default=str))
        else:
            _banner(args)
            if history:
                console.print(f"  [green]{len(history)}[/] archived page(s) found:")
                for h in history[:10]:
                    console.print(f"    [dim]{h.get('timestamp', '?')}[/] {h.get('url', '?')[:80]}")
            else:
                console.print("  [dim]No Wayback archive data found.[/]")
            if dns_results:
                console.print(f"  [green]{len(dns_results)}[/] DNS record(s):")
                for r in dns_results[:15]:
                    rtype = r.get("type", "?")
                    value = r.get("value", "?")
                    ttl = r.get("ttl", "")
                    console.print(f"    [cyan]{rtype:6s}[/] {value} [dim](TTL {ttl})[/]")
            else:
                console.print("  [dim]No DNS records found.[/]")
            if vt_results:
                console.print(f"  [green]{len(vt_results)}[/] VirusTotal resolution(s):")
                for r in vt_results[:10]:
                    console.print(f"    [cyan]{r.get('ip', '?')}[/]  {r.get('last_resolved', '?')}")
            console.print()
        return'''

if old_passive in content:
    content = content.replace(old_passive, new_passive)
    changes.append("Fix passive: JSON mode")

# ── Fix 24: geoip JSON — use print() not console.print_json ──
# Already handled by the console.print_json -> print fix

# ── Fix 25: fuzzer — suppress banner, already handled for fuzzer (no --json defined)

# ── Fix 26: defense — JSON mode ──
old_defense = '''    if cmd == "defense":
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
        return'''
new_defense = '''    if cmd == "defense":
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
        if getattr(args, 'json_output', False):
            print(json.dumps(bundle.to_dict() if hasattr(bundle, "to_dict") else {"report": bundle.to_report()}, indent=2, default=str))
        else:
            console.print(Panel(bundle.to_report(), border_style="green", title="[bold]DEFENSE BUNDLE[/bold]", padding=(1, 2)))
            console.print()
        return'''

if old_defense in content:
    content = content.replace(old_defense, new_defense)
    changes.append("Fix defense: JSON mode")

# ── Fix 27: wishes JSON — use print() not console.print_json ──
# Already handled by console.print_json -> print fix

# ── Fix 28: threat-feeds — fix JSON for stats mode ──
old_tf_stats = '''        if getattr(args, 'stats', False):
            mgr = ThreatFeedManager()
            stats = _spinner_wrap("Fetching feed stats...", mgr.refresh_all, force=getattr(args, 'refresh', False))
            console.print("  [bold]Threat Feed Statistics:[/]")
            for name, count in stats.items():
                console.print(f"  [cyan]{name:25}[/] {count:>6} indicators")'''
new_tf_stats = '''        if getattr(args, 'stats', False):
            mgr = ThreatFeedManager()
            stats = _spinner_wrap("Fetching feed stats...", mgr.refresh_all, force=getattr(args, 'refresh', False))
            if getattr(args, 'json_output', False):
                print(json.dumps(stats, indent=2, default=str))
            else:
                console.print("  [bold]Threat Feed Statistics:[/]")
                for name, count in stats.items():
                    console.print(f"  [cyan]{name:25}[/] {count:>6} indicators")'''

if old_tf_stats in content:
    content = content.replace(old_tf_stats, new_tf_stats)
    changes.append("Fix threat-feeds stats: JSON mode")

# ── Fix 29: threat-feeds refresh default path JSON ──
old_tf_default = '''        else:
            mgr = ThreatFeedManager()
            stats = _spinner_wrap("Refreshing threat feeds...", mgr.refresh_all, force=getattr(args, 'refresh', False))
            console.print("  [bold]Threat Feed Refresh Complete:[/]")
            for name, count in stats.items():
                status_color = "bright_green" if count >= 0 else "bright_red"
                console.print(f"  [{status_color}]{name:25}[/{status_color}] {count:>6} indicators")
        console.print()
        return'''
new_tf_default = '''        else:
            mgr = ThreatFeedManager()
            stats = _spinner_wrap("Refreshing threat feeds...", mgr.refresh_all, force=getattr(args, 'refresh', False))
            if getattr(args, 'json_output', False):
                print(json.dumps(stats, indent=2, default=str))
            else:
                console.print("  [bold]Threat Feed Refresh Complete:[/]")
                for name, count in stats.items():
                    status_color = "bright_green" if count >= 0 else "bright_red"
                    console.print(f"  [{status_color}]{name:25}[/{status_color}] {count:>6} indicators")
        console.print()
        return'''

if old_tf_default in content:
    content = content.replace(old_tf_default, new_tf_default)
    changes.append("Fix threat-feeds default: JSON mode")

# ── Fix 30: benchmark — JSON mode ──
old_benchmark = '''    if cmd == "benchmark":
        _banner(args)
        from .benchmark import ScoreTracker
        tracker = ScoreTracker()
        if args.leaderboard:
            report = tracker.get_leaderboard(days=args.days)
            console.print(report)
        else:
            console.print("  [dim]Use: reconpro benchmark --leaderboard --days 30[/]")
        console.print()
        return'''
new_benchmark = '''    if cmd == "benchmark":
        from .benchmark import ScoreTracker
        import json as _json
        tracker = ScoreTracker()
        if getattr(args, 'json_output', False):
            data = {"leaderboard": tracker.get_leaderboard(days=args.days) if args.leaderboard else None}
            print(_json.dumps(data, indent=2, default=str))
        elif args.leaderboard:
            _banner(args)
            report = tracker.get_leaderboard(days=args.days)
            console.print(report)
        else:
            _banner(args)
            console.print("  [dim]Use: reconpro benchmark --leaderboard --days 30[/]")
        console.print()
        return'''

if old_benchmark in content:
    content = content.replace(old_benchmark, new_benchmark)
    changes.append("Fix benchmark: JSON mode")

# Write the fixed file
with open(filepath, 'w') as f:
    f.write(content)

print(f"Applied {len(changes)} fixes to cli.py:")
for i, c in enumerate(changes, 1):
    print(f"  {i:2}. {c}")
