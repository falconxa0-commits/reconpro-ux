# ReconPro v11.0.0 INFERNO — Release Notes

**Release Date:** August 2025  **License:** MIT

## What's Included

### Python CLI Engine (v11.0.0)
- 83 core modules, 27 plugin modules, 6 integrations, 7 TUI widgets
- 77+ commands with --json output mode for CI/CD
- MITRE ATT&CK mapping, SARIF/PDF/CSV/HTML output
- Pure Python, cross-platform

### Next.js 16 Web Dashboard (v0.2.0)
- React 19 + Tailwind 4 + shadcn/ui + Prisma ORM
- 36 API routes, 3 route groups, 160 components
- CSP nonce rotation, HSTS, rate limiting, SSRF guard

## Quick Start

### CLI
```bash
pip install python/dist/reconpro-11.0.0-py3-none-any.whl
reconpro --help
```

### Web
```bash
cd web && npm ci && npx prisma generate && npm run dev
```

### Docker
```bash
docker compose up -d
```

## Deployment Targets
pip, Docker, Docker Compose, Systemd, Nginx, Vercel, K8s, Render, Railway, Fly.io, DigitalOcean, Coolify

## Key Features
- 25-category surface reconnaissance
- Subdomain discovery (CT logs + DNS)
- AI red team (15-stage), DREAD analysis (23-stage)
- Attack graph engine, threat intelligence
- Multi-agent swarm, adversarial simulation
- Engineering pipeline with auto-fix
- Post-quantum crypto monitoring

## Known Limitations
1. SQLite single-writer; use PostgreSQL for high concurrency
2. Large scans may exceed 60s timeout; adjust SCAN_TIMEOUT
3. LLM features require API keys
4. Browser automation needs Playwright binaries
5. Raw socket features require root privileges

*MIT License — Copyright (c) 2025 ReconPro Security*
