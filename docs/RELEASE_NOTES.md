# ReconPro v0.2.0 — Release Notes

## Release Date: August 16, 2026

## Overview

ReconPro v0.2.0 is the first production-ready release of the enterprise attack surface management platform. This release includes a complete scanning engine, real-time monitoring, compliance reporting, team management, and a hardened security architecture.

## What's New

### Scanner Engine
- **15 scanner modules**: DNS, subdomain enumeration, HTTP analysis, port scanning, SSL/TLS analysis, certificate transparency logs, WHOIS lookup, email reconnaissance, geolocation, directory enumeration, network interface analysis, log analysis, process analysis, file system scanning, and registry analysis
- **Real-time streaming**: SSE-based scan progress updates via `/api/scan/stream`
- **Configurable scan types**: Full, quick, stealth, and compliance scans

### Security Architecture
- **Dual authentication**: Password-based (bcrypt, 12 rounds) and API key-based (SHA-256 hashed)
- **Session management**: Server-side sessions with HttpOnly, Secure, SameSite=Lax cookies
- **SSRF protection**: Private IP rejection, DNS validation, redirect blocking, IPv6 support
- **Rate limiting**: Per-IP configurable rate limits on all API endpoints
- **Security headers**: HSTS (1 year), X-Frame-Options DENY, COOP/CORP/COEP, CSP with nonces
- **Input validation**: Domain sanitization, request body size limits, SQL injection protection via Prisma

### Dashboard & UI
- **OLED Void design system**: Deep black (#000000) with champagne gold (#C9A96E) and ice blue (#4FADDB)
- **Bento dashboard**: Overview with radar map, recent scans, risk scoring, and quick actions
- **26 active components**: Full coverage of scan, findings, monitoring, compliance, teams, and settings
- **Responsive design**: Works on desktop and mobile with dark-mode-first approach

### Database
- **21 Prisma models**: Complete data model with organizations, teams, members, sessions, scans, findings, monitoring, compliance, NHI management, and audit logging
- **15+ database indexes**: Optimized query performance on all frequently accessed fields
- **Full referential integrity**: All foreign keys have proper @relation decorators

## Security Fixes
- Fixed: Password hashing upgraded from unsalted SHA-256 to bcrypt (12 rounds)
- Fixed: Middleware now validates session token format, not just cookie existence
- Fixed: API key invalidation on login removed (keys are no longer rotated)
- Fixed: `/api/system/scan` now requires authentication
- Fixed: Legacy `reconpro_auth` cookie automatically cleaned up

## Database Improvements
- Added: `@relation` decorators to 6 orphaned models (ComplianceReport, NHIIdentity, NHIRevocation, NHIAuditLog, NHIImpactAssessment, ImplosionScenario)
- Added: 15+ `@@index` directives for query performance
- Added: Organization reverse relations for all connected models

## Frontend Improvements
- Fixed: Stale closure in compliance panel (selectedFramework ref pattern)
- Fixed: Dead navigation target 'unified-cli' redirected to 'scan'
- Fixed: Missing useEffect dependency arrays in findings and settings pages

## Infrastructure
- Docker support with multi-stage build
- Docker Compose with Nginx reverse proxy
- Systemd service configuration
- Kubernetes manifests
- Deployment guides for Railway, Render, Fly.io, Coolify, DigitalOcean, AWS, Azure, GCP

## Testing
- 705 tests passing
- Test categories: chaos forge, mutation testing, scan engine, component safety, IPv6 SSRF, database schema, adversarial auth, XSS, middleware security, landing page, SEO, production readiness, error handling

## Known Limitations
- Password reset emails are not yet sent (endpoint returns success to prevent enumeration)
- Some dashboard data is simulated (fear-index, doom-clock, etc.) — clearly labeled in source
- SQLite is the default database; PostgreSQL support is available but not default
- No MFA support yet (planned for v0.3.0)

## Upgrade Path
- Database: Run `npx prisma db push` to apply schema changes
- No breaking API changes
- Existing sessions remain valid

## Contributors
- ReconPro Engineering Team

## License
Proprietary. All rights reserved.
