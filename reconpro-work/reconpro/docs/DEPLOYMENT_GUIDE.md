# ReconPro v10 -- Deployment Guide

## Installation Methods

### pip install

The simplest method. Requires Python 3.10+ and internet access::

    pip install reconpro

This installs the `reconpro` CLI command and the `reconpro` Python package.
The only runtime dependency is `rich` for terminal rendering.

### Wheel Package

For air-gapped or restricted networks::

    # On a connected machine:
    pip wheel reconpro -w ./wheels/

    # Transfer wheels/ directory to air-gapped machine, then:
    pip install --no-index --find-links=./wheels/ reconpro

### From Source

    git clone https://github.com/reconpro-security/reconpro.git
    cd reconpro
    pip install -e .

Editable installs (`-e`) are useful for development since changes to
the source are reflected immediately.

## Configuration

### Environment Variables

ReconPro does not require environment variables for basic operation.
All configuration is done via CLI flags or function parameters.
The tool creates `~/.reconpro/` on first run with these subdirectories:

- `~/.reconpro/scans/` -- Saved scan results (JSON)
- `~/.reconpro/plugins/` -- Custom plugin modules
- `~/.reconpro/memory/` -- Knowledge graph data
- `~/.reconpro/tools/` -- Tool configuration

### File Locations

| Path | Purpose | Created on demand |
|---|---|---|
| `~/.reconpro/scans/` | Scan history (JSON files) | Yes |
| `~/.reconpro/plugins/` | Custom modules (`.py` files) | Yes |
| `~/.reconpro/plugins/_hooks.json` | Plugin lifecycle hooks | No |
| `~/.reconpro/memory/graph.json` | Knowledge graph | Yes |
| `~/.reconpro/audit.log` | Security audit log | Yes |

### Plugin Directory

Place custom plugins as `.py` files in `~/.reconpro/plugins/`.
Each plugin must export a `run(target, base_url, **kwargs)` function
that returns a list of `Finding` objects.

## Enterprise Deployment

### Air-Gapped Networks

ReconPro's pure-Python, zero-dependency design makes it ideal for
air-gapped environments:

1. Pre-build a wheel on a connected machine: `pip wheel reconpro -w ./wheels/`
2. Transfer the wheel file to the air-gapped network
3. Install: `pip install ./reconpro-10.0.0-py3-none-any.whl`
4. No external API calls are needed for local modules (host, dev, doctor)
5. Remote modules require network access to the target but not to the internet

### Containerized Deployment

Minimal Dockerfile::

    FROM python:3.12-slim
    RUN pip install reconpro
    ENTRYPOINT ["reconpro"]

For a scan runner with persistent history::

    FROM python:3.12-slim
    RUN pip install reconpro
    VOLUME /root/.reconpro
    ENTRYPOINT ["reconpro"]

For headless CI/CD use (no rich dependency issues)::

    FROM python:3.12-slim
    RUN pip install reconpro
    RUN reconpro audit --json -o /dev/stdout > /dev/null 2>&1 || true
    COPY scan_script.py /scan_script.py
    CMD ["python", "/scan_script.py"]

### CI/CD Integration

**GitHub Actions with SARIF:**

    - name: Run ReconPro
      run: |
        pip install reconpro
        reconpro ${{ vars.TARGET }} --json -o results.json
        reconpro ${{ vars.TARGET }} --sarif -o results.sarif
    - name: Upload SARIF
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: results.sarif

**Programmatic CI scan:**

    from reconpro import scan
    from reconpro.formats import export_json, export_sarif

    result = scan("example.com", timeout=15)
    data = result.to_dict()
    export_json(data, "results.json")
    export_sarif(data, "results.sarif")
    if result.total_score < 50:
        raise SystemExit(f"Security score too low: {result.total_score}")

### Scan Automation

**Recurring scans via scheduler:**

    reconpro schedule add --cron "0 6 * * 1" --target example.com --modules recon,auth,chain

**REST API server:**

    reconpro serve --port 8080

This starts a FastAPI-based server (defined in `server.py`) that exposes
scan endpoints for integration with external tools.

**Webhook notifications:**

After scans, findings can be forwarded to:

- **Slack**: `reconpro integrations slack --webhook-url ...`
- **Jira**: Create tickets from critical/high findings
- **PagerDuty**: Alert on critical findings
- **Splunk**: Forward structured audit logs via HEC
- **GitHub**: Create issues from scan results

All integrations live in `integrations/` and use the same `Finding` data
as the core scanner.
