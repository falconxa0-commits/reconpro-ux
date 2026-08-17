# ReconPro — Enterprise Attack Surface Management

<p align="center">
  <strong>Version 0.2.0</strong> — Real-time attack surface discovery, continuous monitoring, and compliance automation.
</p>

---

## Overview

ReconPro is an enterprise-grade attack surface management (ASM) platform that provides comprehensive visibility into your organization's external-facing assets. It combines automated reconnaissance, vulnerability assessment, compliance reporting, and executive risk simulation into a unified dashboard.

Built with a modern TypeScript stack, ReconPro delivers real-time scanning with native DNS resolution, HTTP header analysis, SSL/TLS inspection, subdomain enumeration, port scanning, certificate transparency log analysis, and WHOIS intelligence — all from a single web interface or API.

### Key Capabilities

- **Multi-layer Reconnaissance Engine** — Parallel DNS enumeration (A, AAAA, MX, NS, TXT, CNAME, SOA), HTTP header analysis, SSL/TLS inspection, subdomain discovery via certificate transparency logs, port scanning, directory enumeration, email harvesting, and WHOIS lookups.
- **Continuous Monitoring** — Schedule automated scans on a daily, weekly, or monthly cadence. Receive alerts when your attack surface changes.
- **Compliance Frameworks** — Built-in assessment modules for SOC 2, HIPAA, PCI DSS, ISO 27001, GDPR, and NIST CSF with scoring and control-level detail.
- **NHI Kill-Switch** — Non-human identity management for cloud service accounts across AWS IAM, GCP Service Accounts, Azure App Registrations, and GitHub PATs. One-click revocation with rollback capability.
- **Genesis Stamp** — Cryptographically signed attestation badges (Ed25519 + SHA-256) that prove your security posture to customers, auditors, and partners. Embeddable badges with tamper-proof verification API.
- **Proof-of-Implosion** — Executive risk simulation engine that models the financial and operational impact of a security breach using industry-specific cost models and real scan data.
- **VibeSec Hall of Fame** — Community-driven security scoring leaderboard where organizations can compete on security posture.
- **Team & Organization Management** — Multi-tenant architecture with role-based access control (Owner, Admin, Security Lead, Analyst, Viewer).
- **Integrations** — Native support for Slack, Jira, Splunk, PagerDuty, Microsoft Teams, webhooks, and email notifications.
- **Comprehensive Audit Trail** — Every action logged with actor, timestamp, IP address, and resource details.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Standalone Output) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui, Radix primitives |
| **Language** | TypeScript 5 (strict mode) |
| **Database** | SQLite via Prisma ORM 6 |
| **Authentication** | bcryptjs (password hashing), SHA-256 (API keys), Ed25519 (attestations) |
| **Cryptography** | tweetnacl, @noble/hashes |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **Runtime** | Node.js 20+ / Bun |
| **Testing** | Vitest, Testing Library, jsdom |
| **Linting** | ESLint 9 |

---

## Quick Start

### Prerequisites

- Node.js 20+ (or Bun)
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/reconpro/reconpro.git
cd reconpro

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Initialize the database
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Navigate to `/register` to create your first account.

### Environment Variables

Create a `.env` file in the project root:

```env
# Database (SQLite)
DATABASE_URL=file:./db/reconpro.db

# Optional: override defaults
NODE_ENV=development
PORT=3000
```

---

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build (standalone + static assets) |
| `npm start` | Start production server from standalone output |
| `npm run lint` | Run ESLint across the project |
| `npm run db:push` | Push schema changes to SQLite |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run development migrations |
| `npm run db:reset` | Reset database (destructive) |

---

## Project Structure

```
reconpro/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/               # Login, register, forgot-password
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── (marketing)/          # Public pages (pricing, docs, etc.)
│   │   └── api/                  # API route handlers
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── reconpro/             # Feature components
│   │   └── backgrounds/         # WebGL/Obsidian shaders
│   ├── hooks/                    # Custom React hooks
│   ├── lib/
│   │   ├── api-protection.ts     # API auth, rate limiting
│   │   ├── api-security.ts       # Input validation, SSRF guards
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── genesis-crypto.ts     # Ed25519 attestation signing
│   │   ├── implosion-engine.ts   # Breach cost simulation
│   │   ├── safe-fetch.ts        # Safe HTTP client
│   │   ├── native-dns.ts         # Native DNS resolution
│   │   └── recon/                # Scanner engine modules
│   │       ├── ssrf-guard.ts     # SSRF prevention
│   │       ├── dns-recon.ts      # DNS enumeration
│   │       ├── http-recon.ts     # HTTP header analysis
│   │       ├── ssl-recon.ts      # SSL/TLS inspection
│   │       ├── subdomain-recon.ts # Subdomain discovery
│   │       ├── port-check.ts     # Port scanning
│   │       ├── cert-recon.ts     # Certificate analysis
│   │       ├── ct-logs.ts        # Certificate transparency
│   │       ├── email-recon.ts    # Email harvesting
│   │       ├── whois-recon.ts    # WHOIS lookups
│   │       ├── geo-recon.ts      # Geolocation
│   │       └── ...               # More modules
│   └── middleware.ts             # Auth guard + security headers
├── prisma/
│   └── schema.prisma             # Database schema
├── deploy/
│   ├── install.sh                # VPS quick-deploy script
│   ├── nginx/reconpro.conf       # Nginx reverse proxy config
│   ├── systemd/reconpro.service  # systemd service unit
│   ├── k8s/                      # Kubernetes manifests
│   └── cloud/                   # Railway, Render, Fly.io configs
└── docs/                         # Documentation
```

---

## API

ReconPro exposes a RESTful API at `/api/`. All API endpoints (except `/api/health` and `/api/auth/*`) require authentication via the `X-API-Key` header.

### Authentication

```bash
# Using API key
curl -H "X-API-Key: rp_live_..." https://your-reconpro.com/api/scans

# Login (session-based)
curl -X POST https://your-reconpro.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"..."}'
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check (public) |
| `/api/auth/register` | POST | Register new account |
| `/api/auth/login` | POST | Login and receive session cookie |
| `/api/scan` | POST | Launch a reconnaissance scan |
| `/api/scans` | GET | List scan history |
| `/api/scans/history` | GET | Detailed scan history |
| `/api/compliance` | GET | Compliance report data |
| `/api/monitoring` | GET | Monitoring policies |
| `/api/nhi` | GET | Non-human identities |
| `/api/nhi/revoke` | POST | Revoke an identity |
| `/api/genesis` | POST | Create attestation stamp |
| `/api/genesis/verify/[stampId]` | GET | Verify a stamp |
| `/api/implosion` | POST | Run breach simulation |
| `/api/teams` | GET/POST | Team management |
| `/api/members` | GET | Organization members |
| `/api/integrations` | GET/POST | Integration management |
| `/api/audit` | GET | Audit log entries |
| `/api/fear-index` | GET | Fear Index threat feed |
| `/api/exposed-assets` | GET | Exposed asset inventory |
| `/api/threats` | GET | Threat intelligence feed |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](docs/INSTALL.md) | Local, Docker, VPS, and cloud installation |
| [Deployment Guide](docs/DEPLOYMENT.md) | Full deployment across all platforms |
| [Security Architecture](docs/SECURITY.md) | Auth, sessions, rate limiting, CSP, SSRF |
| [System Architecture](docs/ARCHITECTURE.md) | Data flow, scanner engine, DB schema |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Admin setup, user/org management |
| [User Guide](docs/USER_GUIDE.md) | Dashboard, scans, reports, findings |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Dev setup, coding standards, structure |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [Contributing Guide](docs/CONTRIBUTING.md) | Contribution workflow |
| [Roadmap](docs/ROADMAP.md) | Product development roadmap |
| [Changelog](CHANGELOG.md) | Version history |

---

## License

This project is proprietary software. All rights reserved.

---

## Support

- **Documentation**: [docs/](docs/)
- **Health Check**: `/api/health`
- **Issues**: Report through your organization's support channel
