# ReconPro Installation Guide

This guide covers all methods for installing ReconPro v0.2.0, from local development environments to production deployments.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Local Development Setup](#local-development-setup)
3. [Docker Installation](#docker-installation)
4. [VPS Installation (Ubuntu/Debian)](#vps-installation-ubuntudebian)
5. [Cloud Platform Setup](#cloud-platform-setup)
6. [Post-Installation Verification](#post-installation-verification)
7. [Database Configuration](#database-configuration)
8. [Environment Reference](#environment-reference)
9. [Upgrading](#upgrading)

---

## System Requirements

### Minimum Requirements

| Resource | Local Dev | Production |
|----------|-----------|------------|
| **CPU** | 1 core | 2 cores |
| **Memory** | 1 GB RAM | 2 GB RAM |
| **Disk** | 500 MB | 5 GB SSD |
| **Node.js** | 20.x+ | 20.x+ |
| **OS** | macOS, Linux, Windows (WSL2) | Linux (Ubuntu 22.04+ recommended) |

### Runtime Options

- **Node.js 20.x** — Officially supported runtime
- **Bun** — Alternative runtime (supported via `bun` commands in package.json)
- **Docker** — Container-based deployment (Docker 20+)

### Network Requirements

- Outbound access to public DNS (port 53 UDP/TCP)
- Outbound HTTPS (port 443) for scan targets
- Outbound HTTP (port 80) for HTTP header analysis
- Inbound port 3000 (default) for application access

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/reconpro/reconpro.git
cd reconpro
```

### Step 2: Install Dependencies

Using npm:

```bash
npm install
```

Using pnpm:

```bash
pnpm install
```

Using Bun:

```bash
bun install
```

### Step 3: Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL=file:./db/reconpro.db
NODE_ENV=development
PORT=3000
```

### Step 4: Initialize the Database

```bash
# Generate the Prisma client from schema
npx prisma generate

# Push the schema to create tables
npx prisma db push
```

This creates an SQLite database file at `./db/reconpro.db` (relative to `prisma/schema.prisma`). The directory is created automatically if it does not exist.

### Step 5: Start the Development Server

```bash
npm run dev
```

The application starts on `http://localhost:3000`. The dev server includes:

- Hot module replacement for React components
- Prisma query logging in the console (disabled in production)
- Source maps for debugging

### Step 6: Create an Account

Navigate to `http://localhost:3000/register` to create your first account. The registration process:

1. Creates an organization with a slug derived from your email domain
2. Creates a member record with the `owner` role
3. Hashes your password with bcrypt (12 rounds)
4. Generates a default API key (`rp_live_...`) — this is displayed once and cannot be retrieved again

After registration, you are redirected to the dashboard at `/overview`.

---

## Docker Installation

### Option 1: Docker Compose

Create a `docker-compose.yml` file:

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
      - DATABASE_URL=file:/app/db/reconpro.db
      - NODE_ENV=production
    volumes:
      - reconpro-db:/app/db
    restart: unless-stopped

volumes:
  reconpro-db:
    driver: local
```

Start the service:

```bash
docker compose up -d
```

### Option 2: Docker Build and Run

```bash
# Build the image
docker build -t reconpro:0.2.0 .

# Run the container
docker run -d \
  --name reconpro \
  -p 3000:3000 \
  -e DATABASE_URL=file:/app/db/reconpro.db \
  -e NODE_ENV=production \
  -v reconpro-db:/app/db \
  reconpro:0.2.0
```

### Option 3: Pre-built Image

If a pre-built image is available from a container registry:

```bash
docker pull ghcr.io/reconpro/reconpro:0.2.0

docker run -d \
  --name reconpro \
  -p 3000:3000 \
  -e DATABASE_URL=file:/app/db/reconpro.db \
  -v reconpro-db:/app/db \
  ghcr.io/reconpro/reconpro:0.2.0
```

### Dockerfile Reference

The Dockerfile for ReconPro uses a multi-stage build:

1. **Stage 1 — Dependencies**: Install production dependencies with `npm ci --omit=dev`
2. **Stage 2 — Build**: Run `npx prisma generate` and `npm run build` to produce the standalone output
3. **Stage 3 — Runtime**: Copy standalone server, static assets, and Prisma engine into a minimal Node.js image

The build command in package.json performs post-build asset copying:

```json
"build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
```

---

## VPS Installation (Ubuntu/Debian)

### Quick Deploy Script

ReconPro includes an automated installation script for Ubuntu and Debian:

```bash
curl -fsSL https://raw.githubusercontent.com/reconpro/reconpro/main/deploy/install.sh | bash
```

This script performs the following steps:

1. Installs Node.js 20.x from NodeSource
2. Creates a dedicated `reconpro` system user
3. Deploys the application to `/opt/reconpro`
4. Installs production dependencies
5. Builds the application
6. Creates the `.env` configuration file
7. Initializes the SQLite database
8. Installs and enables the systemd service

### Manual Installation

If you prefer manual installation:

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Create application user
sudo useradd -r -s /bin/false -d /opt/reconpro reconpro

# 3. Create application directory
sudo mkdir -p /opt/reconpro/db
sudo chown reconpro:reconpro /opt/reconpro /opt/reconpro/db

# 4. Clone and build (as your user, then copy)
git clone https://github.com/reconpro/reconpro.git /tmp/reconpro
cd /tmp/reconpro
npm ci --omit=dev
npx prisma generate
NODE_ENV=production npm run build
sudo cp -r .next/standalone/* /opt/reconpro/
sudo cp -r .next/static /opt/reconpro/.next/
sudo cp -r public /opt/reconpro/
sudo cp -r node_modules/.prisma /opt/reconpro/node_modules/.prisma

# 5. Configure environment
sudo tee /opt/reconpro/.env > /dev/null <<EOF
DATABASE_URL=file:/app/db/reconpro.db
NODE_ENV=production
PORT=3000
EOF

# 6. Initialize database
cd /opt/reconpro
sudo -u reconpro npx prisma db push

# 7. Install systemd service
sudo cp deploy/systemd/reconpro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable reconpro
sudo systemctl start reconpro
```

### Systemd Service Details

The systemd service file (`deploy/systemd/reconpro.service`) includes:

- **Security hardening**: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`
- **Resource limits**: 2 GB memory, 200% CPU
- **Automatic restart**: 5-second delay between restart attempts
- **Logging**: Integrated with journald (`journalctl -u reconpro -f`)

### Nginx Reverse Proxy

After deploying the application, configure Nginx as a reverse proxy with TLS. A production-ready configuration is provided at `deploy/nginx/reconpro.conf`.

```bash
# Install Nginx and Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Copy the configuration
sudo cp deploy/nginx/reconpro.conf /etc/nginx/sites-available/reconpro
sudo ln -s /etc/nginx/sites-available/reconpro /etc/nginx/sites-enabled/

# Edit the server_name in the config
sudo sed -i 's/reconpro.example.com/your-domain.com/' /etc/nginx/sites-available/reconpro

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Issue TLS certificate
sudo certbot --nginx -d your-domain.com
```

---

## Cloud Platform Setup

### Railway

Railway deployment is configured via `deploy/cloud/railway/railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npx prisma generate && npm run build"

[deploy]
startCommand = "node .next/standalone/server.js"
```

**Steps:**

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Railway auto-detects the build configuration
4. Set environment variable: `DATABASE_URL=file:/app/db/reconpro.db`
5. Add a volume mount at `/app/db` for persistent SQLite storage
6. Railway deploys automatically on push

### Render

Render deployment is configured via `deploy/cloud/render/render.yaml`:

**Steps:**

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Select Docker as the runtime
4. Add a persistent disk at `/app/db` (minimum 5 GB)
5. Set environment variables from `.env`
6. Configure the health check path as `/api/health`

**Render.yaml (Infrastructure as Code):**

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

### Fly.io

Fly.io deployment is configured via `deploy/cloud/flyio/fly.toml`:

**Steps:**

1. Install the Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Authenticate: `fly auth login`
3. Launch the app: `fly launch` (uses `fly.toml`)
4. Create a persistent volume: `fly volumes create reconpro_data --size 5`
5. Deploy: `fly deploy`

**Machine Configuration:**

- 2 GB memory
- 2 shared CPU cores
- Persistent volume mounted at `/app/db`
- Force HTTPS enabled
- Minimum 1 machine running at all times

### DigitalOcean App Platform

A deployment spec is provided at `deploy/cloud/digitalocean/app-spec.yaml`. This configures the app to run as a web service with persistent storage.

### Coolify

Coolify configuration is available at `deploy/cloud/coolify/coolify.env.example`. Copy this to your Coolify environment configuration and set the required variables.

---

## Post-Installation Verification

### Health Check

After installation, verify the application is running:

```bash
# Health endpoint (public, no auth required)
curl https://your-reconpro.com/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "uptime": 1234.567,
  "responseTime": 12,
  "checks": {
    "database": "ok"
  }
}
```

### Dashboard Access

Navigate to your deployed URL. You should see the ReconPro landing page. Click "Get Started" to register your first account.

### First Scan

After logging in:

1. Navigate to `/scans`
2. Enter a domain to scan (e.g., `example.com`)
3. The scan engine runs parallel DNS, HTTP, SSL, and port checks
4. Results appear in the findings table at `/findings`

---

## Database Configuration

### SQLite (Default)

The default database is SQLite, stored in a file. The location is controlled by the `DATABASE_URL` environment variable:

```env
DATABASE_URL=file:./db/reconpro.db
```

Paths are relative to the directory containing `prisma/schema.prisma`.

### Database Commands

```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Run migrations (production)
npx prisma migrate deploy

# Reset database completely (DESTRUCTIVE)
npx prisma migrate reset

# Open database browser
npx prisma studio
```

### Backup

To back up the SQLite database:

```bash
# Stop the application first (or use SQLite's backup API)
cp /opt/reconpro/db/reconpro.db /opt/reconpro/db/reconpro.db.backup-$(date +%Y%m%d)
```

---

## Environment Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/reconpro.db` | SQLite database file path |
| `NODE_ENV` | `development` | Node.js environment (`development` or `production`) |
| `PORT` | `3000` | Application listen port |

### Behavior Differences by Environment

| Feature | Development | Production |
|---------|-------------|------------|
| Console logging | Full Prisma query logging | No logging |
| Error messages | Detailed error messages | Generic error with request ID |
| Session cookie `Secure` flag | Off | On |
| Console removal | Off | All `console.*` calls removed at build time |
| TypeScript build errors | Show warnings | Fail the build |

---

## Upgrading

### Standard Upgrade Procedure

```bash
# 1. Pull the latest code
git pull origin main

# 2. Install updated dependencies
npm install

# 3. Regenerate Prisma client
npx prisma generate

# 4. Apply database schema changes
npx prisma db push

# 5. Rebuild
npm run build

# 6. Restart the service
# For systemd:
sudo systemctl restart reconpro

# For Docker:
docker compose up -d --build
```

### Database Migrations

If the schema includes breaking changes, use Prisma migrations:

```bash
npx prisma migrate dev --name describe-change
npx prisma migrate deploy  # In production
```

### Rollback

If an upgrade causes issues:

```bash
# Revert to the previous git commit
git checkout <previous-tag>

# Rebuild and restart
npm install
npx prisma generate
npm run build
sudo systemctl restart reconpro
```

For database rollbacks with SQLite, restore from your backup file.
