# ReconPro System Architecture

Technical architecture documentation for ReconPro v0.2.0, covering system design, data flow, scanner engine internals, database schema, and technology decisions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Application Structure](#application-structure)
4. [Request Lifecycle](#request-lifecycle)
5. [Scanner Engine](#scanner-engine)
6. [Data Flow](#data-flow)
7. [Database Schema](#database-schema)
8. [Authentication Flow](#authentication-flow)
9. [API Architecture](#api-architecture)
10. [Frontend Architecture](#frontend-architecture)
11. [Specialized Engines](#specialized-engines)
12. [Integration Architecture](#integration-architecture)

---

## Architecture Overview

ReconPro is a full-stack monolithic application built on Next.js 16 with the App Router. It follows a server-driven architecture where data fetching, business logic, and API endpoints are co-located within the Next.js framework. The application is deployed as a standalone Node.js server with an embedded SQLite database.

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                       Client Layer                         │
│  Browser (React 19 SPA)  │  API Consumer (curl, SDK)     │
└────────────┬──────────────────────┬────────────────────────┘
             │                      │
             │ HTTP + Cookie       │ HTTP + X-API-Key
             ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│                   Next.js 16 Server                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Middleware│  │Route Handlers│  │  SSR Pages          │   │
│  │ Auth Guard│─▶│ API Routes   │─▶│  Dashboard          │   │
│  │ Headers  │  │ Protection    │  │  Marketing          │   │
│  └──────────┘  └──────┬───────┘  └────────────────────┘   │
│                       │                                    │
│  ┌────────────────────┼──────────────────────────────┐   │
│  │            Business Logic Layer                   │   │
│  │  Scanner Engine │ Auth │ Compliance │ NHI │ Genesis │   │
│  └────────────────────┼──────────────────────────────┘   │
│                       │                                    │
│  ┌────────────────────┼──────────────────────────────┐   │
│  │            Data Access Layer                       │   │
│  │         Prisma ORM 6 ──▶ SQLite                    │   │
│  └───────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Framework

| Technology | Version | Role |
|-----------|---------|------|
| **Next.js** | 16.1.x | Full-stack framework (App Router, Standalone output) |
| **React** | 19.0.x | UI rendering with concurrent features |
| **TypeScript** | 5.x | Type-safe application code |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Prisma** | 6.11.x | Type-safe database ORM |
| **SQLite** | (bundled) | Embedded relational database |

### UI Components

| Library | Purpose |
|---------|---------|
| **shadcn/ui** | Pre-built accessible component library |
| **Radix UI** | Headless primitive components |
| **Framer Motion** | Declarative animations |
| **Recharts** | Data visualization charts |
| **Lucide React** | Icon library |
| **cmdk** | Command palette component |
| **sonner** | Toast notifications |
| **react-hook-form** | Form state management |
| **vaul** | Drawer component |

### Security & Cryptography

| Library | Purpose |
|---------|---------|
| **bcryptjs** | Password hashing (12 rounds) |
| **tweetnacl** | Ed25519 signing for attestations |
| **@noble/hashes** | SHA-256 hashing |

### Build Toolchain

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration testing |
| **Testing Library** | React component testing |
| **ESLint** | Code linting |
| **sharp** | Server-side image optimization |
| **PostCSS** | CSS processing |

---

## Application Structure

### Route Groups

The application uses Next.js route groups for organizational clarity:

```
src/app/
├── (auth)/               # Authentication pages
│   ├── layout.tsx        # Auth-specific layout
│   ├── login/page.tsx    # Login form
│   ├── register/page.tsx # Registration form
│   └── forgot-password/page.tsx
├── (dashboard)/          # Protected dashboard pages
│   ├── layout.tsx        # Dashboard layout with sidebar
│   ├── overview/page.tsx # Executive overview
│   ├── scans/page.tsx    # Scan management
│   ├── findings/page.tsx # Finding management
│   ├── monitoring/page.tsx # Continuous monitoring
│   ├── compliance/page.tsx # Compliance reports
│   ├── teams/page.tsx   # Team management
│   ├── integrations/page.tsx # Integration config
│   ├── settings/page.tsx # User/org settings
│   ├── loading.tsx      # Dashboard loading skeleton
│   └── error.tsx        # Dashboard error boundary
├── (marketing)/         # Public pages
│   ├── layout.tsx        # Marketing layout (Navbar, Footer)
│   ├── page.tsx          # Landing page
│   ├── pricing/page.tsx
│   ├── docs/page.tsx
│   ├── security/page.tsx
│   ├── enterprise/page.tsx
│   ├── about/page.tsx
│   ├── careers/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── changelog/page.tsx
│   ├── roadmap/page.tsx
│   ├── status/page.tsx
│   └── contact/page.tsx
└── api/                  # API route handlers
    ├── health/route.ts
    ├── auth/{login,register,forgot-password}/route.ts
    ├── scan/route.ts
    ├── scan/stream/route.ts
    ├── scans/route.ts
    ├── scans/history/route.ts
    ├── compliance/route.ts
    ├── monitoring/route.ts
    ├── monitoring/execute/route.ts
    ├── nhi/route.ts
    ├── nhi/{revoke,assess,rollback,seed,audit}/route.ts
    ├── genesis/route.ts
    ├── genesis/{verify,revoke}/route.ts
    ├── genesis/embed/[stampId]/route.ts
    ├── implosion/route.ts
    ├── teams/route.ts
    ├── members/route.ts
    ├── integrations/route.ts
    ├── audit/route.ts
    ├── threats/route.ts
    ├── exposed-assets/route.ts
    ├── fear-index/route.ts
    ├── hall-of-fame/route.ts
    ├── vuln-scan/route.ts
    ├── bot-hunter/route.ts
    └── ... (additional endpoints)
```

### Library Modules

```
src/lib/
├── api-protection.ts     # Centralized API auth + rate limiting
├── api-security.ts        # Input validation + SSRF guards
├── db.ts                  # Prisma client singleton
├── utils.ts               # Utility functions (cn, etc.)
├── safe-fetch.ts         # Hardened HTTP client
├── native-dns.ts         # Native DNS resolution (dig/openssl)
├── genesis-crypto.ts     # Ed25519 attestation signing/verification
├── implosion-engine.ts   # Breach cost simulation
├── fear-index-engine.ts  # Threat intelligence scoring
├── pqc-vault-engine.ts   # Post-quantum crypto simulation
├── cni-sentinel-engine.ts # Critical infrastructure monitoring
├── sovereign-crypto.ts    # Sovereign key management
├── broadcast-engine.ts   # Broadcast attestation system
├── quantum-doom-engine.ts # Quantum threat simulation
└── recon/                 # Scanner engine modules
    ├── types.ts           # Finding/result type definitions
    ├── ssrf-guard.ts      # SSRF prevention
    ├── dns-recon.ts       # DNS record enumeration
    ├── http-recon.ts      # HTTP header analysis
    ├── ssl-recon.ts       # SSL/TLS inspection
    ├── subdomain-recon.ts # Subdomain discovery
    ├── port-check.ts      # Port scanning
    ├── cert-recon.ts      # Certificate analysis
    ├── ct-logs.ts         # Certificate transparency logs
    ├── email-recon.ts     # Email harvesting
    ├── whois-recon.ts     # WHOIS lookups
    ├── directory-recon.ts # Directory/path enumeration
    ├── geo-recon.ts       # Geolocation lookup
    ├── network-recon.ts   # Network reconnaissance
    ├── file-recon.ts      # File discovery
    ├── process-recon.ts   # Process detection
    ├── log-recon.ts       # Log analysis
    ├── registry-recon.ts  # Service registry check
    └── findings-formatter.ts # Finding normalization
```

---

## Request Lifecycle

### Dashboard Page Request

```
1. Browser sends request to /overview
2. Next.js middleware intercepts
   a. Checks for reconpro_session cookie
   b. Validates token format (sess_ prefix, length >= 20)
   c. If invalid: redirect to /login?redirect=/overview
   d. Applies security headers to response
   e. Generates CSP nonce
3. Route handler renders page (SSR or CSR)
4. React components hydrate
5. Client-side API calls to /api/* endpoints
6. API routes validate session via DB lookup
7. Prisma queries fetch data from SQLite
8. Response rendered with data
```

### API Scan Request

```
1. Client sends POST /api/scan with domain
2. withProtection() middleware:
   a. Extracts client IP (anti-spoofing)
   b. Checks rate limit (10/min for scan endpoint)
   c. Validates API key via SHA-256 hash lookup
3. validateScanTarget() SSRF guard:
   a. Sanitizes domain (strips protocol, paths, trailing dots)
   b. Checks blocked domain list
   c. Resolves DNS (A + AAAA in parallel)
   d. Validates resolved IPs are not private/reserved
4. Scanner engine runs:
   a. Parallel DNS enumeration (A, AAAA, MX, NS, TXT, CNAME, SOA)
   b. HTTP header analysis (security headers, technologies)
   c. SSL/TLS certificate inspection
   d. Subdomain enumeration via CT logs
   e. Port scanning (common ports)
   f. Directory enumeration
   g. Email harvesting from DNS TXT and web pages
   h. WHOIS lookup
5. Findings normalized and returned
6. Scan record persisted to database
```

---

## Scanner Engine

### Design Philosophy

The scanner engine prioritizes real, verifiable findings over simulated data. Each reconnaissance module executes actual network operations and returns concrete evidence.

### Module Architecture

Each recon module under `src/lib/recon/` follows a consistent pattern:

1. Accept a sanitized, validated domain/target
2. Execute network operations (DNS queries, HTTP requests, TLS handshakes)
3. Parse responses into structured findings
4. Return typed results with severity ratings

### DNS Enumeration (`dns-recon.ts`)

Runs all DNS queries in parallel for maximum speed:

- **A Records**: IPv4 addresses
- **AAAA Records**: IPv6 addresses
- **MX Records**: Mail servers
- **NS Records**: Name servers
- **TXT Records**: SPF, DKIM, DMARC, other configurations
- **CNAME Records**: Canonical names / aliases
- **SOA Records**: Start of authority (zone serial, refresh, retry)

Uses native Node.js `dns` module via `native-dns.ts`.

### HTTP Reconnaissance (`http-recon.ts`)

Analyzes the HTTP response from the target:

- **Status code and redirect chains**
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
- **Technology detection**: Server headers, meta tags, script patterns
- **Cookie analysis**: Secure, HttpOnly, SameSite flags

### SSL/TLS Inspection (`ssl-recon.ts`)

Extracts certificate details using native OpenSSL:

- **Certificate chain** (subject, issuer, validity dates)
- **Protocol version** (TLS 1.2, TLS 1.3)
- **Cipher suite** analysis
- **SAN (Subject Alternative Names)**
- **Days until expiry** warning
- **Self-signed certificate detection**
- **Weak algorithm detection**

### Subdomain Discovery (`subdomain-recon.ts`)

Enumerates subdomains via Certificate Transparency logs:

- Queries public CT log endpoints (crt.sh)
- Parses certificate Subject Alternative Names
- Returns unique subdomain list with source attribution

### Port Scanning (`port-check.ts`)

Checks common service ports:

- HTTP (80), HTTPS (443), SSH (22), FTP (21), SMTP (25, 587, 465)
- DNS (53), MySQL (3306), PostgreSQL (5432), Redis (6379)
- MongoDB (27017), Elasticsearch (9200)
- Returns port state (open, closed, filtered, timeout)

### Finding Severity Scale

| Level | Description | Example |
|-------|-------------|---------|
| **Critical** | Immediate security risk | Expired SSL, open admin panel |
| **High** | Significant vulnerability | Missing CSP, outdated TLS |
| **Medium** | Configuration issue | Missing HSTS, no SPF record |
| **Low** | Minor issue or informational | Cookie without SameSite |
| **Info** | Purely informational finding | Technology detected |

---

## Data Flow

### Registration Flow

```
POST /api/auth/register
    │
    ▼
┌─ Validate input (name, email, password) ─┐
│ Rate limit: 5/min per IP                   │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Check existing member by email ───────────┐
│ 409 if already exists                     │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Derive org slug from email domain ──────┐
│ Ensure uniqueness (append suffix)         │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Create Organization ─────────────────────┐
│ name, slug, plan=enterprise               │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Hash password (bcrypt, 12 rounds) ──────┐
└──────────────────┬────────────────────────┘
                   ▼
┌─ Create Member (role=owner) ──────────────┐
└──────────────────┬────────────────────────┘
                   ▼
┌─ Generate API key ───────────────────────┐
│ Format: rp_live_<32 hex chars>            │
│ Store SHA-256 hash + prefix               │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Return member + raw API key (once) ──────┐
│ HTTP 201                                  │
└───────────────────────────────────────────┘
```

### Scan and Persist Flow

```
POST /api/scan { domain }
    │
    ▼
┌─ Validate & Auth ────────────────────────┐
│ withProtection: auth + rate limit         │
│ validateScanTarget: SSRF guard            │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Create Scan record (status=pending) ────┐
└──────────────────┬────────────────────────┘
                   ▼
┌─ Run scanner modules in parallel ──────────┐
│ DNS, HTTP, SSL, subdomains, ports, etc.   │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Normalize findings ──────────────────────┐
│ findings-formatter.ts                      │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Update Scan record ──────────────────────┐
│ status=completed, scores, counts          │
└──────────────────┬────────────────────────┘
                   ▼
┌─ Return findings ────────────────────────┐
└───────────────────────────────────────────┘
```

---

## Database Schema

### Schema Overview

The Prisma schema defines 22 models organized into 8 functional domains:

#### Organization Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Organization** | Tenant container | name, slug (unique), plan, maxScans, maxMembers, ssoEnabled, apiQuota |
| **Team** | Sub-groups within org | organizationId, name, color |
| **Member** | User accounts | organizationId, email (indexed), role, passwordHash (nullable) |
| **TeamMember** | Many-to-many join | teamId, memberId, role (lead/member) |

#### Authentication Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Session** | Browser sessions | token (unique), memberId, organizationId, expiresAt |
| **ApiKey** | Programmatic access | keyHash (unique), keyPrefix, scopes (JSON), requestCount, expiresAt |

#### Scanner Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **ScanTarget** | Monitored assets | organizationId, teamId, domain, ip, tags (JSON), importance |
| **Scan** | Scan execution records | targetId, status, scanType, triggeredBy, riskScore, vuln counts |
| **Finding** | Individual findings | scanId, title, severity, category, description, evidence, cve, cvss |
| **ThreatAlert** | Active threat notifications | title, severity, source, ioc |

#### Compliance Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **ComplianceReport** | Framework assessments | organizationId, framework, overallScore, controls (JSON) |

#### Monitoring Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **MonitorPolicy** | Scheduled scan policies | organizationId, targetId, schedule, scanType, enabled, nextRunAt |

#### NHI (Non-Human Identity) Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **NHIIdentity** | Cloud service accounts | organizationId, identityType, identifier, cloudProvider, permissions (JSON), blastRadius |
| **NHIRevocation** | Revocation records | identityId, reason, status, rollbackData (JSON) |
| **NHIAuditLog** | NHI-specific audit | revocationId, action, details (JSON) |
| **NHIImpactAssessment** | Pre-revocation analysis | affectedIdentities, affectedResources, riskBefore, riskAfter |

#### Attestation Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **GenesisStamp** | Cryptographic attestations | stampId (unique), domain, score, grade, signature (Ed25519), publicKey, payloadHash |
| **GenesisAuditTrail** | Stamp event log | stampId, action, ipAddress, userAgent |

#### Simulation Domain

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **ImplosionScenario** | Breach cost simulation | organizationId, domain, dataBreachCost, regulatoryFines, stockImpactPct |

#### Supporting Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Integration** | Third-party connections | organizationId, type, config (JSON), enabled |
| **AuditLog** | General audit trail | organizationId, memberId, apiKeyId, action, resource, details (JSON) |
| **VibeSecEntry** | Community leaderboard | domain (unique), score, grade, findings |

### Index Strategy

Key indexes for query performance:

- `Member.email` — Fast login/registration lookups
- `Member.organizationId` — Organization member lists
- `Session.token` — Session validation (unique)
- `Session.expiresAt` — Expired session cleanup
- `ApiKey.keyHash` — API auth (unique)
- `Scan.targetId`, `Scan.status`, `Scan.startedAt` — Scan queries
- `Finding.scanId`, `Finding.severity`, `Finding.category` — Finding filtering
- `MonitorPolicy.nextRunAt` — Scheduled scan execution
- `NHIIdentity.status`, `NHIIdentity.identityType` — NHI queries
- `AuditLog.createdAt`, `AuditLog.organizationId` — Audit log queries

---

## Authentication Flow

### Session Authentication (Web)

```
Browser ──▶ POST /api/auth/login
               │
               ├─ Rate limit: 10/min per IP
               ├─ Find member by email
               ├─ bcrypt.compare(password, hash)
               ├─ Generate sess_<64 hex chars>
               ├─ Create Session record (24h expiry)
               ├─ Generate/find API key for org
               └─ Set HttpOnly cookie + return member data

Browser ──▶ GET /overview (cookie: reconpro_session)
               │
               ├─ Middleware checks cookie presence + format
               ├─ API routes validate session in DB
               └─ Return dashboard data
```

### API Key Authentication (Programmatic)

```
Client ──▶ POST /api/scan (header: X-API-Key: rp_live_...)
               │
               ├─ withProtection({ requireAuth: true })
               ├─ SHA-256 hash of provided key
               ├─ Find ApiKey by keyHash (unique index)
               ├─ Check isActive + expiresAt
               ├─ Increment requestCount, update lastUsedAt
               └─ Return auth context (id, orgId, scopes)
```

---

## API Architecture

### Route Organization

API routes follow RESTful conventions with functional grouping:

- `/api/auth/*` — Authentication (no auth required)
- `/api/health` — Health checks (no auth required)
- `/api/scan` — Single scan execution
- `/api/scans/*` — Scan history and management
- `/api/compliance/*` — Compliance reporting
- `/api/monitoring/*` — Monitoring policies
- `/api/nhi/*` — Non-human identity management
- `/api/genesis/*` — Attestation stamps
- `/api/implosion` — Breach simulation
- `/api/teams/*` — Team management
- `/api/members/*` — Member management
- `/api/integrations/*` — Third-party integrations
- `/api/audit` — Audit log queries

### Protection Pattern

Every API route follows the same protection pattern:

```typescript
export async function POST(request: NextRequest) {
  const { error, clientIp, domain, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
    validateDomainFromBody: true,
  });
  if (error) return error;
  // Business logic here
}
```

---

## Frontend Architecture

### Component Hierarchy

```
Marketing Layout
├── Navbar (logo, navigation links, CTA)
├── Page Content (per route)
└── Footer (links, social, legal)

Dashboard Layout
├── Sidebar (navigation, user menu)
├── Content Area (per dashboard route)
└── Bottom Dock (quick actions)
```

### UI Component Library

ReconPro uses shadcn/ui components built on Radix UI primitives. All components are located in `src/components/ui/` and include standard form elements, navigation components, overlays, and data display components.

### Feature Components

Located in `src/components/reconpro/`:

- **bento-dashboard.tsx** — Executive overview with metric cards
- **scan-input.tsx** — Domain input with validation
- **scan-results.tsx** — Scan finding display with severity filtering
- **sidebar.tsx** — Dashboard navigation sidebar
- **compliance-panel.tsx** — Compliance framework scores
- **monitoring-panel.tsx** — Monitoring policy management
- **team-management.tsx** — Team CRUD interface
- **integration-hub.tsx** — Integration configuration
- **risk-gauge.tsx** — Visual risk score gauge
- **radar-map.tsx** — Attack surface visualization
- **CommandPalette.tsx** — Command palette (cmdk)
- **Animated components** — Counters, neural network visualization, particle systems

---

## Specialized Engines

### Implosion Engine (`implosion-engine.ts`)

Executive risk simulation that models breach impact:

- **Input**: Industry type, company size, revenue, scan findings
- **Models**: Data breach cost (IBM/Ponemon benchmarks), regulatory fines, reputational damage, operational downtime
- **Output**: Financial impact breakdown with severity presets (minimal, moderate, severe, catastrophic)

### Fear Index Engine (`fear-index-engine.ts`)

Aggregates threat intelligence into a composite threat score, drawing from multiple data sources and normalizing to a 0-100 scale.

### Genesis Crypto (`genesis-crypto.ts`)

Ed25519-based cryptographic attestation system:

- Generates deterministic attestation payloads with canonical JSON
- Signs with Ed25519, hashes with SHA-256
- Produces human-readable stamp IDs (GS-XXXX-XXXX-XXXX)
- Verification endpoint validates signatures independently

---

## Integration Architecture

### Supported Integration Types

| Type | Direction | Protocol |
|------|-----------|-----------|
| **Slack** | Outbound | Webhook |
| **Jira** | Bidirectional | REST API |
| **Splunk** | Outbound | HEC (HTTP Event Collector) |
| **PagerDuty** | Outbound | REST API |
| **Microsoft Teams** | Outbound | Webhook |
| **Webhooks** | Outbound | Custom HTTP |
| **Email** | Outbound | SMTP |

### Integration Data Model

Each integration stores its configuration as JSON in the `config` field, enabling flexible configuration without schema changes. The `eventsTotal` counter tracks total events sent to each integration.

### Event Triggers

Integrations are triggered by system events:
- Critical finding discovered
- Compliance score drops below threshold
- NHI identity marked as suspect
- Scan completed or failed
- Scheduled monitoring policy executed
