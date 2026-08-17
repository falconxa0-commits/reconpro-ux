"""REST API server for ReconPro.

Run as a background service:
  reconpro serve [--port 7890]

Endpoints:
  GET  /                          Status
  POST /scan                     Start a remote scan
  POST /audit                    Start a local audit
  POST /blitz                    Multi-target parallel scan
  GET  /history                   List scan history
  GET  /history/<filename>        Get specific scan
  GET  /modules                   List modules
  POST /agent                    Run agent mode
  POST /report                   Generate HTML report from scan data
  GET  /report/<filename>        Serve generated reports
  GET  /subdomains/<domain>       Discover subdomains
"""
from __future__ import annotations

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any, Dict
from urllib.parse import urlparse, parse_qs

from . import __version__
from .scanner import scan, audit_scan, MODULE_REGISTRY, LOCAL_MODULES, ALL_MODULES
from .parallel import blitz_scan
from .history import list_scans, get_scan
from .subdomains import discover_subdomains
from .reports import generate_html_report
from .agent import run_agent

REPORTS_DIR = os.path.join(os.path.expanduser("~/.reconpro"), "reports")


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging

    def _json_response(self, code: int, data: Any) -> None:
        body = json.dumps(data, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> Dict:
        length = int(self.headers.get("Content-Length", 0))
        if length:
            return json.loads(self.rfile.read(length))
        return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        qs = parse_qs(parsed.query)

        # Status
        if path == "" or path == "/":
            self._json_response(200, {
                "name": "ReconPro API",
                "version": __version__,
                "modules": len(ALL_MODULES),
                "endpoints": [
                    "POST /scan", "POST /audit", "POST /blitz",
                    "GET /history", "GET /modules",
                    "POST /agent", "GET /subdomains/<domain>",
                ],
            })
            return

        # Modules
        if path == "/modules":
            mods = {}
            for k, v in MODULE_REGISTRY.items():
                mods[k] = v["name"]
            for k, v in LOCAL_MODULES.items():
                mods[k] = v["name"]
            self._json_response(200, {"modules": mods})
            return

        # History
        if path == "/history":
            target = qs.get("target", [None])[0]
            limit = int(qs.get("limit", ["20"])[0])
            scans = list_scans(target=target, limit=limit)
            self._json_response(200, {"scans": scans})
            return

        # History detail
        if path.startswith("/history/"):
            filename = path.split("/history/")[1]
            data = get_scan(filename)
            if data:
                self._json_response(200, data)
            else:
                self._json_response(404, {"error": "Scan not found"})
            return

        # Subdomains
        if path.startswith("/subdomains/"):
            domain = path.split("/subdomains/")[1]
            subs = discover_subdomains(domain)
            self._json_response(200, {"domain": domain, "subdomains": subs, "count": len(subs)})
            return

        # Serve reports
        if path.startswith("/report/"):
            filename = path.split("/report/")[1]
            fpath = os.path.join(REPORTS_DIR, filename)
            if os.path.exists(fpath):
                with open(fpath, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self._json_response(404, {"error": "Report not found"})
            return

        self._json_response(404, {"error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self._read_body()

        try:
            if path == "/scan":
                target = body.get("target")
                if not target:
                    return self._json_response(400, {"error": "target required"})
                result = scan(
                    target,
                    modules=body.get("modules"),
                    all_modules=body.get("all_modules", False),
                    timeout=body.get("timeout", 8),
                    verify_tls=body.get("verify_tls", True),
                    rate_limit=body.get("rate_limit", 10.0),
                )
                from .history import save_scan
                save_scan(result.to_dict())
                return self._json_response(200, result.to_dict())

            if path == "/audit":
                result = audit_scan(
                    target=body.get("target", "."),
                    modules=body.get("modules"),
                )
                from .history import save_scan
                save_scan(result.to_dict())
                return self._json_response(200, result.to_dict())

            if path == "/blitz":
                targets = body.get("targets", [])
                if not targets:
                    return self._json_response(400, {"error": "targets required"})
                result = blitz_scan(
                    targets,
                    max_workers=body.get("max_workers", 4),
                    modules=body.get("modules"),
                )
                return self._json_response(200, result)

            if path == "/agent":
                goal = body.get("goal", "")
                if not goal:
                    return self._json_response(400, {"error": "goal required"})
                result = run_agent(goal, save=False)
                return self._json_response(200, result)

            if path == "/report":
                scan_data = body.get("scan_data")
                if not scan_data:
                    return self._json_response(400, {"error": "scan_data required"})
                os.makedirs(REPORTS_DIR, exist_ok=True)
                fpath = generate_html_report(scan_data, output_path=os.path.join(REPORTS_DIR, f"report_{int(os.times()[4]*1000)}.html"))
                return self._json_response(200, {"report_path": fpath, "url": f"/report/{os.path.basename(fpath)}"})

            self._json_response(404, {"error": "Not found"})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def run_server(port: int = 7890) -> None:
    """Start the ReconPro API server."""
    server = HTTPServer(("0.0.0.0", port), _Handler)
    print(f"  [bright_green]ReconPro API v{__version__}[/] running on [cyan]http://localhost:{port}[/]")
    print(f"  [dim]Endpoints: POST /scan, /audit, /blitz, /agent | GET /history, /modules, /subdomains/<domain>[/]")
    print(f"  [dim]Press Ctrl+C to stop[/]")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  [yellow]Server stopped.[/]")
        server.server_close()
