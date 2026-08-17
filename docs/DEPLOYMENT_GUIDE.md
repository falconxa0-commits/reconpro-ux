# Deployment Guide — ReconPro v11.0.0 INFERNO

Complete guide for deploying ReconPro v11.0.0 in production.

## System Requirements

### Python CLI
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Python | 3.8 | 3.12+ |
| RAM | 64 MB | 256 MB |
| Disk | 5 MB | 10 MB |

### Web Dashboard
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 20.x | 20.x LTS |
| RAM | 512 MB | 2 GB |
| Database | SQLite | PostgreSQL 15+ |

## Python CLI Installation

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install python/dist/reconpro-11.0.0-py3-none-any.whl
reconpro --version
```

### Optional extras
```bash
pip install reconpro[full]    # All features
pip install reconpro[async]   # aiohttp
pip install reconpro[browser] # Playwright
pip install reconpro[llm]     # OpenAI + Anthropic
```

## Web Dashboard

```bash
cd web
npm ci
npx prisma generate
npm run build
npx next start -p 3000
```

## Docker

```bash
docker build -t reconpro:11.0.0 .
docker run -d -p 3000:3000 -v reconpro-data:/app/db reconpro:11.0.0
```

Multi-stage: deps → builder (prisma + next build) → runner (node:20-alpine, non-root, health check)

## Docker Compose

```bash
docker compose up -d                              # App only
docker compose --profile production up -d          # App + Nginx TLS
```

Services: reconpro (3000), nginx (80/443, production profile)

## Nginx Reverse Proxy

```bash
sudo cp deploy/nginx/reconpro.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/reconpro /etc/nginx/sites-enabled/
sudo cp fullchain.pem privkey.pem /etc/nginx/ssl/
sudo nginx -t && sudo systemctl reload nginx
```

Features: TLS 1.2+1.3, HSTS preload, security headers, gzip, WebSocket support

## Systemd

```bash
sudo useradd -r -s /bin/false reconpro
sudo cp -r .next/standalone/* /opt/reconpro/
sudo chown -R reconpro:reconpro /opt/reconpro
sudo cp deploy/systemd/reconpro.service /etc/systemd/system/
sudo systemctl enable reconpro && sudo systemctl start reconpro
```

Hardening: NoNewPrivileges, ProtectSystem=strict, ProtectHome=true, PrivateTmp=true

## Vercel
```bash
vercel --prod
```

## Kubernetes
```bash
kubectl apply -f deploy/k8s/
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | production | Node environment |
| PORT | 3000 | Application port |
| DATABASE_URL | file:/app/db/reconpro.db | Database connection |
| SESSION_SECRET | (required) | 64-char hex string |
| SCAN_CONCURRENCY | 5 | Max concurrent scans |
| RATE_LIMIT_MAX | 100 | Requests per minute |

## Post-Deploy Verification

```bash
curl -s http://localhost:3000/api/health | jq .
bash scripts/verify-deployment.sh
```

*MIT License — Copyright (c) 2025 ReconPro Security*
