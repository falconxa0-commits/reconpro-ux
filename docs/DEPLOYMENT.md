# ReconPro Deployment Guide

Complete deployment reference for ReconPro v0.2.0 across all supported platforms.

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Build Configuration](#build-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Railway Deployment](#railway-deployment)
5. [Render Deployment](#render-deployment)
6. [Fly.io Deployment](#flyio-deployment)
7. [DigitalOcean App Platform](#digitalocean-app-platform)
8. [VPS Deployment (Linux)](#vps-deployment-linux)
9. [Kubernetes Deployment](#kubernetes-deployment)
10. [Coolify Deployment](#coolify-deployment)
11. [Nginx Reverse Proxy](#nginx-reverse-proxy)
12. [TLS/SSL Configuration](#tls-ssl-configuration)
13. [Monitoring and Health Checks](#monitoring-and-health-checks)
14. [Scaling Considerations](#scaling-considerations)
15. [Backup and Disaster Recovery](#backup-and-disaster-recovery)

---

## Deployment Overview

ReconPro uses Next.js standalone output mode, which produces a self-contained server bundle that includes all necessary dependencies. This makes deployment straightforward across any Node.js-capable platform.

### Build Output

The build process (`npm run build`) produces:

```
.next/
├── standalone/           # Self-contained Node.js server
│   ├── server.js         # Entry point
│   └── .next/            # Server-side chunks
├── static/               # Static assets (JS, CSS, images)
```

The build script copies static assets into the standalone directory:

```bash
next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
```

### Production Configuration

The `next.config.ts` sets the following production options:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
};
```

Key production behaviors:
- All `console.*` calls are stripped from the build
- TypeScript errors fail the build (no silent failures)
- Images are optimized to AVIF/WebP with 1-hour cache TTL
- Strict React mode is enabled for catching potential issues

---

## Docker Deployment

### Dockerfile

ReconPro uses a multi-stage Docker build for minimal image size:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Build and Run

```bash
# Build the image
docker build -t reconpro:0.2.0 .

# Run with persistent volume
docker run -d \
  --name reconpro \
  -p 3000:3000 \
  -e DATABASE_URL=file:/app/db/reconpro.db \
  -e NODE_ENV=production \
  -v reconpro-db:/app/db \
  --memory=2g \
  --cpus=2 \
  --restart=unless-stopped \
  reconpro:0.2.0
```

### Docker Compose

```yaml
version: "3.9"

services:
  reconpro:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "file:/app/db/reconpro.db"
      NODE_ENV: "production"
    volumes:
      - reconpro-db:/app/db
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  reconpro-db:
    driver: local
```

### Database Initialization in Docker

The database needs to be initialized on first run. Add an entrypoint script:

```bash
#!/bin/sh
# entrypoint.sh
if [ ! -f /app/db/reconpro.db ]; then
  echo "Initializing database..."
  npx prisma db push
fi
exec "$@"
```

Update the Dockerfile:

```dockerfile
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
```

---

## Railway Deployment

Railway provides automatic deployment from GitHub with persistent volumes.

### Configuration

The `deploy/cloud/railway/railway.toml` configures Railway:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npx prisma generate && npm run build"

[deploy]
startCommand = "node .next/standalone/server.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### Deployment Steps

1. **Create a project**: Go to [railway.app](https://railway.app) and create a new project
2. **Connect repository**: Link your GitHub repository with the ReconPro code
3. **Configure environment**: Set the following environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=file:/app/db/reconpro.db`
4. **Add persistent volume**: Create a volume mounted at `/app/db` (minimum 1 GB)
5. **Deploy**: Railway automatically builds and deploys on every push to the connected branch

### Railway-Specific Notes

- Railway's Nixpacks builder auto-detects Next.js projects
- The volume is essential for SQLite persistence — data is lost on redeployment without it
- Railway provides automatic HTTPS with custom domains
- Monitor resource usage in the Railway dashboard

---

## Render Deployment

Render supports both Docker and native Node.js deployment.

### Docker Deployment (Recommended)

1. **Create Web Service**: Go to [render.com](https://render.com) and create a new Web Service
2. **Connect repository**: Link your GitHub repository
3. **Select Docker runtime**: Render builds the Dockerfile automatically
4. **Add persistent disk**: Mount at `/app/db` with at least 5 GB
5. **Set environment variables**:
   - `NODE_ENV=production`
   - `DATABASE_URL=file:/app/db/reconpro.db`
6. **Configure health check**: Path `/api/health`, interval 30 seconds

### Infrastructure as Code

The `deploy/cloud/render/render.yaml` enables one-click deployment:

```yaml
services:
  - type: web
    name: reconpro
    runtime: docker
    plan: starter
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: file:/app/db/reconpro.db
    disk:
      name: db
      mountPath: /app/db
      sizeGB: 5
    healthCheckPath: /api/health
```

### Node.js Deployment (Alternative)

If not using Docker:

- **Build Command**: `npm ci && npx prisma generate && npm run build`
- **Start Command**: `node .next/standalone/server.js`

---

## Fly.io Deployment

Fly.io deploys to edge locations worldwide with persistent volumes.

### Configuration

The `deploy/cloud/flyio/fly.toml` specifies:

```toml
app = "reconpro"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"
  DATABASE_URL = "file:/app/db/reconpro.db"

[[vm]]
  memory = "2gb"
  cpu_kind = "shared"
  cpus = 2

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  min_machines_running = 1

[[mounts]]
  source = "reconpro_data"
  destination = "/app/db"
```

### Deployment Steps

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Authenticate
fly auth login

# Launch (interactive setup using fly.toml)
fly launch

# Create persistent volume for SQLite
fly volumes create reconpro_data --size 5

# Deploy
fly deploy
```

### Fly.io-Specific Notes

- `auto_stop_machines = false` keeps the app running at all times (required for scheduled scans)
- `min_machines_running = 1` ensures at least one instance is always available
- The persistent volume survives deployments but not app destruction
- Scale to multiple regions for global coverage (SQLite single-writer applies)

---

## DigitalOcean App Platform

Configuration is provided at `deploy/cloud/digitalocean/app-spec.yaml`. DigitalOcean App Platform supports Docker-based deployments with persistent storage.

### Deployment Steps

1. Create a new app on DigitalOcean App Platform
2. Connect your GitHub repository
3. Select Docker as the build type
4. Configure persistent storage at `/app/db`
5. Set environment variables

---

## VPS Deployment (Linux)

### Automated Installation

```bash
curl -fsSL https://raw.githubusercontent.com/reconpro/reconpro/main/deploy/install.sh | bash
```

### Systemd Service

The service file at `deploy/systemd/reconpro.service` configures:

```ini
[Unit]
Description=ReconPro — Enterprise Attack Surface Management
After=network.target

[Service]
Type=simple
User=reconpro
Group=reconpro
WorkingDirectory=/opt/reconpro
EnvironmentFile=/opt/reconpro/.env
ExecStart=/usr/bin/node /opt/reconpro/.next/standalone/server.js
Restart=always
RestartSec=5
TimeoutStopSec=30

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/reconpro/db
PrivateTmp=true

# Resource limits
MemoryMax=2G
CPUQuota=200%
```

### Management Commands

```bash
# Start/stop/restart
sudo systemctl start reconpro
sudo systemctl stop reconpro
sudo systemctl restart reconpro

# View logs
sudo journalctl -u reconpro -f

# Check status
sudo systemctl status reconpro

# Enable on boot
sudo systemctl enable reconpro
```

---

## Kubernetes Deployment

A complete Kubernetes manifest is provided at `deploy/k8s/reconpro.yaml`.

### Resources Deployed

| Resource | Description |
|----------|-------------|
| `Deployment` (reconpro) | 2 replicas, 2 CPU / 2 Gi memory limits |
| `Service` | ClusterIP on port 80, proxies to container port 3000 |
| `Ingress` | TLS with cert-manager + Let's Encrypt |
| `PVC` | 5 Gi persistent volume for SQLite |
| `Deployment` (nginx) | Nginx sidecar for TLS termination |

### Deployment Steps

```bash
# Create namespace
kubectl create namespace reconpro

# Create secret for DATABASE_URL
kubectl create secret generic reconpro-secrets \
  --from-literal=database-url='file:/app/db/reconpro.db' \
  -n reconpro

# Apply manifests
kubectl apply -f deploy/k8s/reconpro.yaml -n reconpro
```

### Important Notes for K8s

- **SQLite single-writer limitation**: SQLite supports only one writer at a time. With 2 replicas, only one pod should perform write operations. Use leader election or a single-replica deployment for write-heavy workloads.
- **PVC access mode**: `ReadWriteOnce` means the volume is mounted to one node only. All pods must be scheduled on the same node.
- **Health probes**: Liveness and readiness probes hit `/api/health`

---

## Coolify Deployment

An environment template is at `deploy/cloud/coolify/coolify.env.example`. Coolify is a self-hosting PaaS that supports Docker-based deployments.

### Steps

1. Install Coolify on your server
2. Create a new resource and connect your repository
3. Use the provided environment template
4. Add a persistent volume at `/app/db`
5. Deploy

---

## Nginx Reverse Proxy

A production-ready Nginx configuration is provided at `deploy/nginx/reconpro.conf`.

### Features

- HTTP to HTTPS redirect (301)
- TLS 1.2 and 1.3 only
- Modern cipher suite with ECDHE key exchange
- OCSP stapling
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- Gzip compression for text assets
- Static asset caching (365 days for `/_next/static`)
- WebSocket support for streaming endpoints
- Health check access log suppression
- Hidden file blocking (dotfiles)

### Installation

```bash
sudo cp deploy/nginx/reconpro.conf /etc/nginx/sites-available/reconpro
sudo ln -s /etc/nginx/sites-available/reconpro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## TLS/SSL Configuration

### Let's Encrypt (Certbot)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d reconpro.example.com
```

Certbot automatically configures the SSL certificate and sets up auto-renewal via a systemd timer.

### Manual TLS

Place your certificates and update the Nginx config:

```nginx
ssl_certificate     /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
ssl_protocols       TLSv1.2 TLSv1.3;
```

---

## Monitoring and Health Checks

### Health Endpoint

`GET /api/health` returns:

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "timestamp": "...",
  "uptime": 12345.678,
  "responseTime": 12,
  "checks": {
    "database": "ok"
  }
}
```

### Recommended Monitoring

| Metric | Source | Threshold |
|--------|--------|-----------|
| HTTP response time | `/api/health` responseTime | < 200ms |
| Database status | `checks.database` | `ok` |
| Memory usage | Process RSS | < 1.5 GB |
| Uptime | `uptime` field | Continuous |
| Error rate | HTTP 5xx responses | < 1% |

### Log Monitoring

- **Systemd**: `journalctl -u reconpro -f`
- **Docker**: `docker logs -f reconpro`
- **Application logs**: Written to `server.log` via the start script

---

## Scaling Considerations

### Vertical Scaling

Increase resource limits as your organization grows:

| Organization Size | CPU | Memory | Disk |
|-------------------|-----|--------|------|
| Small (< 50 targets) | 1 core | 1 GB | 2 GB |
| Medium (50–500 targets) | 2 cores | 2 GB | 5 GB |
| Large (500+ targets) | 4 cores | 4 GB | 10 GB |

### Horizontal Scaling (Advanced)

SQLite has a single-writer limitation. For horizontal scaling:

1. Use read replicas for dashboard and reporting
2. Route write operations (scans, registrations) to a primary instance
3. Consider migrating to PostgreSQL for true multi-writer scenarios
4. Use a connection pooler (PgBouncer) if migrating to PostgreSQL

---

## Backup and Disaster Recovery

### SQLite Backup

```bash
# Online backup using SQLite's backup API (zero downtime)
sqlite3 /opt/reconpro/db/reconpro.db ".backup /opt/reconpro/db/reconpro.db.backup"

# File copy (requires stopping the service)
sudo systemctl stop reconpro
cp /opt/reconpro/db/reconpro.db /backup/reconpro-$(date +%Y%m%d).db
sudo systemctl start reconpro
```

### Automated Backup (Cron)

```bash
# Add to crontab
0 2 * * * sqlite3 /opt/reconpro/db/reconpro.db ".backup /backup/reconpro-$(date +\%Y\%m\%d).db"
```

### Disaster Recovery

1. Restore the SQLite database from backup
2. Verify database integrity: `sqlite3 reconpro.db "PRAGMA integrity_check;"`
3. Restart the application
4. Verify via health endpoint
