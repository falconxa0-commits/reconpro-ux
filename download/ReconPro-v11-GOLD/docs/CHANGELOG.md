# ReconPro Changelog

All notable changes to the ReconPro platform. This project follows [Keep a Changelog](https://keepachangelog.com/) format.

---

## [0.2.0] — 2025-01-15

ReconPro v0.2.0 is a major release that introduces the enterprise-grade dashboard, real-time reconnaissance engine, compliance framework, NHI identity management, cryptographic attestations, and a comprehensive security architecture.

### Added

#### Core Platform

- **Next.js 16 App Router** with three route groups: `(auth)`, `(dashboard)`, and `(marketing)`
- **React 19** with concurrent rendering features and strict mode
- **Tailwind CSS 4** with utility-first styling and `tw-animate-css` animations
- **shadcn/ui** component library with 40+ accessible UI primitives
- **Standalone build output** for optimized single-file deployment
- **Production console stripping** via `removeConsole` compiler option

#### Authentication and Security

- **Dual authentication system**: Session-based (cookie) and API key-based (X-API-Key header)
- **Session management** with database-backed sessions, `HttpOnly`/`Secure`/`SameSite=Lax` cookies
- **API key authentication** with SHA-256 hashed keys, scope-based permissions, and usage tracking
- **Centralized API protection middleware** (`withProtection()`) with rate limiting, auth, and input validation
- **Content Security Policy** with per-request cryptographic nonce for script execution
- **Comprehensive security headers**: HSTS (1 year with preload), X-Frame-Options DENY, COOP, CORP, COEP
- **SSRF protection** with three-step validation: domain sanitization, blocked domain check, DNS resolution with private IP rejection
- **IPv6 SSRF protection** covering loopback, link-local, ULA, multicast, documentation, and Teredo ranges
- **Blocked domain list** covering localhost, cloud metadata, Kubernetes internal services, caches, and special-use TLDs
- **Rate limiting** with bounded in-memory store (50,000 entry cap), amortized cleanup, and overflow protection
- **IP extraction** with anti-spoofing: walks X-Forwarded-For right-to-left, skipping private IPs
- **Password hashing** with bcryptjs (12 rounds)
- **Safe error responses** that suppress internal details in production with request IDs

#### Reconnaissance Engine

- **Real-time DNS enumeration** with parallel queries for A, AAAA, MX, NS, TXT, CNAME, and SOA records
- **HTTP header analysis** with security header evaluation and technology detection
- **SSL/TLS certificate inspection** using native OpenSSL with expiry timeline and cipher analysis
- **Subdomain discovery** via Certificate Transparency log queries
- **Port scanning** for common service ports with state detection (open, closed, filtered)
- **Directory enumeration** for common web paths
- **Email harvesting** from DNS TXT records and web pages
- **WHOIS registration data** lookup
- **Geolocation** resolution for target IPs
- **Native DNS resolution** via Node.js dns module and custom dig implementation
- **SSRF guard** module (`validateScanTarget()`) for all scan endpoints

#### Database Schema (22 Models)

- **Organization management**: Organization, Team, Member, TeamMember
- **Authentication**: Session, ApiKey
- **Scanner engine**: ScanTarget, Scan, Finding, ThreatAlert
- **Compliance**: ComplianceReport (SOC 2, HIPAA, PCI DSS, ISO 27001, GDPR, NIST)
- **Monitoring**: MonitorPolicy with scheduling
- **Integrations**: Integration model supporting Slack, Jira, Splunk, PagerDuty, Teams, Webhooks, Email
- **NHI management**: NHIIdentity, NHIRevocation, NHIAuditLog, NHIImpactAssessment
- **Attestations**: GenesisStamp with Ed25519 signatures, GenesisAuditTrail
- **Simulation**: ImplosionScenario with breach cost modeling
- **Audit**: AuditLog with actor tracking
- **Community**: VibeSecEntry leaderboard
- All models include appropriate indexes for query performance

#### Cryptographic Attestations (Genesis Stamp)

- **Ed25519 digital signatures** via tweetnacl for attestation signing
- **SHA-256 payload hashing** via @noble/hashes with canonical JSON serialization
- **Human-readable stamp IDs** in GS-XXXX-XXXX-XXXX format (48 bits of entropy)
- **Verification API** (`/api/genesis/verify/[stampId]`) for independent signature validation
- **Embeddable badge** endpoint for website integration
- **Tiered attestations**: basic, professional, enterprise with escalating detail

#### NHI (Non-Human Identity) Management

- **Multi-cloud identity tracking** for AWS IAM, GCP Service Accounts, Azure App Registrations, GitHub PATs
- **One-click revocation** with reason tracking and permissions snapshot
- **Rollback capability** with preserved reinstatement data
- **Impact assessment** before revocation (affected identities, resources, risk delta)
- **Blast radius calculation** for identity reachability
- **NHI-specific audit log** for compliance tracking

#### Compliance Framework

- **Six framework modules**: SOC 2, HIPAA, PCI DSS, ISO 27001, GDPR, NIST CSF
- **Scored assessments** (0-100) with pass/fail status
- **Control-level granularity** with individual check results stored as JSON
- **Compliance scan type** for targeted framework evaluation

#### Breach Simulation (Proof-of-Implosion)

- **Executive risk modeling** with industry-specific cost estimates
- **Multi-factor impact**: data breach cost, regulatory fines, reputational damage, downtime, churn, stock impact
- **Severity presets**: minimal, moderate, severe, catastrophic
- **Custom factor multipliers** for organization-specific risk profiles

#### Dashboard and UI

- **Executive overview** with bento grid layout, metric cards, and scan timeline
- **Scan management** page with history, filtering, and status tracking
- **Finding triage** interface with severity filtering, status management, and bulk actions
- **Continuous monitoring** policy management with scheduling
- **Compliance reports** page with framework scores and control details
- **Team management** with member assignment and role configuration
- **Integration hub** for third-party connection configuration
- **Settings page** for organization and profile management
- **Command palette** (cmdk) for keyboard-driven navigation
- **Marketing pages**: landing, pricing, docs, security, enterprise, about, careers, privacy, terms, changelog, roadmap, status, contact
- **Responsive design** with mobile sidebar support
- **Dark mode support** via next-themes
- **Framer Motion animations** for interactive components

#### API Endpoints (40+)

- `POST /api/auth/login` — Session-based login
- `POST /api/auth/register` — Account registration with org creation
- `POST /api/auth/forgot-password` — Password recovery
- `GET /api/health` — Health check
- `POST /api/scan` — Launch reconnaissance scan
- `GET /api/scan/stream` — Streaming scan results (SSE)
- `GET /api/scans` — Scan history
- `GET /api/scans/history` — Detailed scan history
- `GET /api/compliance` — Compliance report data
- `GET /api/monitoring` — Monitoring policies
- `POST /api/monitoring/execute` — Execute monitoring policy
- `GET /api/nhi` — List NHI identities
- `POST /api/nhi/revoke` — Revoke identity
- `POST /api/nhi/assess` — Impact assessment
- `POST /api/nhi/rollback` — Rollback revocation
- `POST /api/nhi/seed` — Seed test identities
- `GET /api/nhi/audit` — NHI audit trail
- `POST /api/genesis` — Create attestation stamp
- `POST /api/genesis/revoke` — Revoke stamp
- `GET /api/genesis/verify/[stampId]` — Verify stamp
- `GET /api/genesis/embed/[stampId]` — Embed badge
- `POST /api/implosion` — Run breach simulation
- `GET /api/teams` — Team management
- `GET /api/members` — Member listing
- `GET/POST /api/integrations` — Integration management
- `GET /api/audit` — Audit log
- `GET /api/threats` — Threat intelligence
- `GET /api/exposed-assets` — Exposed asset inventory
- `GET /api/fear-index` — Fear Index feed
- `GET /api/fear-index/feed` — Fear Index data
- `GET /api/fear-index/history` — Fear Index history
- `GET /api/hall-of-fame` — Community leaderboard
- `POST /api/vuln-scan` — Vulnerability scan
- `POST /api/bot-hunter` — Bot detection
- `GET /api/executive` — Executive dashboard data
- `GET /api/reports` — Report generation
- `GET /api/dashboard` — Dashboard aggregation
- `GET /api/ai-leaderboard` — AI model leaderboard
- `GET /api/broadcast` — Broadcast attestations
- `POST /api/system/scan` — System scan
- `GET /api/system/health` — System health

#### Deployment

- **Dockerfile** with multi-stage build for minimal image size
- **Docker Compose** configuration with persistent volumes
- **systemd service** with security hardening (NoNewPrivileges, ProtectSystem, PrivateTmp)
- **Nginx reverse proxy** configuration with TLS 1.2/1.3, OCSP stapling, and security headers
- **Railway** deployment config (`railway.toml`)
- **Render** deployment config (`render.yaml`) with Docker and persistent disk
- **Fly.io** deployment config (`fly.toml`) with persistent volumes
- **DigitalOcean** App Platform spec
- **Coolify** environment template
- **Kubernetes** manifests (Deployment, Service, Ingress, PVC, sidecar Nginx)
- **VPS install script** for Ubuntu/Debian with automated setup

#### Testing

- **Vitest** test suite with 20+ test files covering:
  - API security module validation
  - SSRF protection (including IPv6)
  - Authentication rate limiting
  - XSS prevention
  - Middleware security headers
  - Scan engine functionality
  - Database schema validation
  - Production readiness checks
  - Error handling and resilience

### Changed

- Migrated from experimental Next.js features to stable App Router patterns
- Adopted `output: "standalone"` for all deployment targets
- Centralized all API protection through `withProtection()` middleware
- Unified finding output format across all scanner modules via `ReconFinding` type

### Security

- All security headers applied at middleware level (not route-level only)
- XSS protection shifted from `X-XSS-Protection` to CSP (X-XSS-Protection set to 0)
- API key authentication uses SHA-256 hash comparison instead of prefix matching
- DNS resolution failure in SSRF guard is treated as unsafe (prevents TOCTOU bypass)
- Rate limit store bounded to 50,000 entries to prevent memory exhaustion
- Production errors return generic messages with request IDs (no stack traces)
- Legacy `reconpro_auth` cookie actively cleaned up on every request
- Session tokens validated for format before database lookup
