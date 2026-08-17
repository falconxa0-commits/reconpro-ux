# ReconPro API Documentation

> **Version:** 0.2.0  
> **Base URL:** `https://reconpro.dev/api`  
> **Auth Header:** `x-api-key: rp_live_<hex>` or session cookie `reconpro_session`  
> **Rate Limits:** Enforced via IP-based sliding window per endpoint  
> **Content-Type:** `application/json`

---

## Table of Contents

- [Authentication](#1-authentication)
- [System & Health](#2-system--health)
- [Core Scanning](#3-core-scanning)
- [Scans & History](#4-scans--history)
- [Reports](#5-reports)
- [Dashboard](#6-dashboard)
- [Executive Dashboard](#7-executive-dashboard)
- [Threat Intelligence](#8-threat-intelligence)
- [Compliance](#9-compliance)
- [Teams (CRUD)](#10-teams-crud)
- [Members (CRUD)](#11-members-crud)
- [Monitoring (CRUD)](#12-monitoring-crud)
- [Integrations (CRUD)](#13-integrations-crud)
- [Audit Logs](#14-audit-logs)
- [Broadcast (Echo-Sign)](#15-broadcast-echo-sign)
- [Genesis Stamps](#16-genesis-stamps)
- [AI Red Team](#17-ai-red-team)
- [AI Advisor](#18-ai-advisor)
- [AI Leaderboard](#19-ai-leaderboard)
- [Cognitive Dread Engine](#20-cognitive-dread-engine)
- [PQC Sovereign Vault](#21-pqc-sovereign-vault)
- [CNI Sentinel](#22-cni-sentinel)
- [Doom Clock (Quantum)](#23-doom-clock-quantum)
- [Bot Hunter](#24-bot-hunter)
- [Confused Deputy Sandbox](#25-confused-deputy-sandbox)
- [Oblivion](#26-oblivion)
- [Model Red Team (GORGON)](#27-model-red-team-gorgon)
- [Implosion Simulation](#28-implosion-simulation)
- [Non-Human Identity (NHI)](#29-non-human-identity-nhi)
- [Exposed Assets](#30-exposed-assets)
- [Wall of Shame](#31-wall-of-shame)
- [Fear Index](#32-fear-index)
- [Hall of Fame (VibeSec)](#33-hall-of-fame-vibesec)
- [Sovereign Control](#34-sovereign-control)
- [Vulnerability Scan](#35-vulnerability-scan)
- [System Scan](#36-system-scan)
- [Root Endpoint](#37-root-endpoint)

---

## Common Error Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request — missing or invalid fields |
| `401` | Unauthorized — invalid API key or session |
| `403` | Forbidden — internal domain, insufficient permissions, or cross-org access denied |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource or already revoked |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |

---

## 1. Authentication

### POST `/api/auth/login`

Authenticate with email/password and receive a session token + API key.

- **Auth Required:** No (public endpoint)
- **Rate Limit:** 10 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | User email |
| `password` | `string` | Yes | User password (min 1 char) |

- **Response (200):**
```json
{
  "success": true,
  "member": { "id": "cm...", "name": "Alex Chen", "email": "alex@acme.com", "role": "owner" },
  "org_id": "org_...",
  "api_key": "rp_live_..."
}
```
- Sets `reconpro_session` HttpOnly cookie (24h expiry).

### POST `/api/auth/register`

Create a new account, organization, and API key in one step.

- **Auth Required:** No (public endpoint)
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `email` | `string` | Yes | Valid email address |
| `password` | `string` | Yes | Min 8 characters |

- **Response (201):**
```json
{
  "success": true,
  "member": { "id": "cm...", "name": "Alex Chen", "email": "alex@acme.com", "role": "owner" },
  "api_key": "rp_live_...",
  "org_id": "org_..."
}
```
- **Notes:** API key is shown only once. Organization slug is auto-derived from email domain.

### POST `/api/auth/forgot-password`

Request password reset instructions.

- **Auth Required:** No (public endpoint)
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | Account email |

- **Response (200):**
```json
{ "success": true, "message": "If an account exists with this email, password reset instructions will be sent." }
```
- **Notes:** Always returns success to prevent email enumeration. Actual reset functionality is not yet implemented.

### POST `/api/v1/auth/validate`

Validate an API key and return metadata.

- **Auth Required:** No (key passed in body)
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key` | `string` | Yes | Raw API key to validate |

- **Response (200):**
```json
{
  "valid": true,
  "org_id": "org_...",
  "quota_remaining": 1000,
  "scopes": ["scan:read", "scan:write", "telemetry:write"],
  "key_name": "Default key",
  "key_prefix": "rp_live_a1b2",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

## 2. System & Health

### GET `/api/health`

Application health check with database connectivity.

- **Auth Required:** No
- **Rate Limit:** 60 requests / 60s
- **Response (200):**
```json
{
  "status": "healthy",
  "version": "0.2.0",
  "timestamp": "2025-07-19T12:00:00.000Z",
  "uptime": 86400,
  "responseTime": 5,
  "checks": { "database": "ok" }
}
```

### GET `/api/system/health`

Internal system health with memory, CPU, and DB status.

- **Auth Required:** No
- **Rate Limit:** None
- **Response (200):**
```json
{
  "uptime": 86400,
  "memory": { "rss": 125829120, "heapTotal": 67108864, "heapUsed": 45000000 },
  "system": { "platform": "linux", "arch": "x64", "hostname": "app-01", "totalMemory": 17179869184, "freeMemory": 8589934592, "cpuCount": 4 },
  "database": { "status": "connected" }
}
```
- **Notes:** No `withProtection` wrapper — no rate limiting or auth.

---

## 3. Core Scanning

### POST `/api/scan`

Full reconnaissance scan against a target domain. Runs DNS, SSL/TLS, port, HTTP, subdomain, WHOIS, email, cert, and geo analysis modules.

- **Auth Required:** Yes (`x-api-key` header)
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | `string` | Yes | Target domain (FQDN) |
| `scanType` | `string` | No | `"full"` (default) or `"quick"` |
| `triggeredBy` | `string` | No | `"manual"`, `"scheduled"`, or `"api"` |

- **Response (200):**
```json
{
  "success": true,
  "domain": "example.com",
  "scanId": "scan_...",
  "status": "completed",
  "riskScore": 42,
  "findings": [
    { "title": "SPF Record Missing", "severity": "high", "category": "dns", "description": "...", "evidence": null, "asset": "example.com" }
  ],
  "summary": { "total": 15, "critical": 1, "high": 3, "medium": 5, "low": 4, "info": 2 }
}
```
- **Error Codes:** 400 (invalid domain, missing field), 403 (internal/blocked domain, private IP resolution), 401, 429, 500.

### GET `/api/scan/stream`

Server-Sent Events (SSE) real-time scan stream.

- **Auth Required:** Yes
- **Rate Limit:** 10 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | `string` | Yes | Target domain |

- **Response:** `Content-Type: text/event-stream`
  - Events: `phase_start`, `phase_complete`, `phase_error`, `finding`, `scan_complete`, `scan_error`
- **Phases:** DNS Reconnaissance → SSL/TLS Analysis → Port Scanning → HTTP Header Analysis

### POST `/api/vuln-scan`

Targeted vulnerability scan with native Node.js port probing, TLS analysis, and CVE matching.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | `string` | Yes | Target domain |

- **Response (200):** Similar to `/api/scan` with detailed findings including CVE and CVSS data.

---

## 4. Scans & History

### GET `/api/scans`

List the 20 most recent scans with targets and findings.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "scans": [
    { "id": "scan_...", "target": { "domain": "example.com" }, "findings": [...], "startedAt": "...", "riskScore": 42 }
  ]
}
```

### GET `/api/scans/history`

Paginated scan history with filtering.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | `number` | No | Page number (default 1) |
| `limit` | `number` | No | Items per page (default 20, max 100) |
| `severity` | `string` | No | Filter: `critical`, `high`, `medium`, `low`, `info` |
| `domain` | `string` | No | Search by target domain |

- **Response (200):**
```json
{
  "scans": [{ "id": "...", "domain": "...", "status": "completed", "riskScore": 42, "findings": [...] }],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
}
```

---

## 5. Reports

### GET `/api/reports`

Generate a security assessment report in JSON, Markdown, or HTML.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `scanId` | `string` | No | Specific scan ID (defaults to most recent) |
| `format` | `string` | No | `json` (default), `markdown`, or `html` |

- **Response:** Returns JSON, Markdown text, or HTML document based on `format`.
- **Error Codes:** 400 (invalid format), 404 (scan not found), 500.

---

## 6. Dashboard

### GET `/api/dashboard`

Aggregated dashboard statistics from all scan data.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "stats": { "totalScans": 10, "totalFindings": 150, "criticalFindings": 5, "highFindings": 20, "mediumFindings": 40, "lowFindings": 50, "infoFindings": 35, "avgRiskScore": 45 },
  "recentScans": [...],
  "categoryBreakdown": [{ "category": "ssl", "_count": { "id": 30 } }],
  "severityBreakdown": [{ "name": "Critical", "value": 5, "color": "#ef4444" }]
}
```

---

## 7. Executive Dashboard

### GET `/api/executive`

Executive-level dashboard with MTTD, MTTR, compliance scores, and risk trends.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "overview": { "totalScans": 10, "totalFindings": 150, "avgRiskScore": 45, "mttd": "12.5s", "mttr": "3.2 days" },
  "topAssets": [...],
  "riskTrend": [{ "date": "2025-07-01", "score": 42 }],
  "compliance": { "soc2": { "score": 85, "status": "pass" }, "hipaa": { "score": 72, "status": "warn" } },
  "recentActivity": [...]
}
```

---

## 8. Threat Intelligence

### GET `/api/threats`

Evidence-derived threat intelligence from scan findings and CVE matching.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "threats": [
    { "id": "scan-threat-0", "title": "Expired Certificate — Active MITM Attack Window", "severity": "critical", "source": "Scan Analysis", "description": "...", "ioc": null, "createdAt": "..." }
  ],
  "source": "evidence_derived"
}
```
- **Notes:** Threats are derived from actual scan data (SSL, DNS, port, header, technology findings). Returns empty if no scans exist.

---

## 9. Compliance

### GET `/api/compliance`

Evaluate findings against SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, and GDPR frameworks.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `scanId` | `string` | No | Evaluate specific scan (otherwise all findings) |

- **Response (200):**
```json
{
  "overallScore": 78,
  "lastAssessed": "2025-07-19",
  "frameworks": [
    { "id": "soc2", "name": "SOC 2", "score": 85, "status": "pass", "controlsPassed": 10, "controlsTotal": 12, "controls": [...] }
  ]
}
```

---

## 10. Teams (CRUD)

### GET `/api/teams`

List all teams for the authenticated organization.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{ "teams": [{ "id": "...", "name": "Red Team", "description": "...", "color": "#00ff88", "memberCount": 5 }] }
```

### POST `/api/teams`

Create a new team.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Team name |
| `description` | `string` | No | Team description |
| `color` | `string` | No | Hex color (default `#00ff88`) |

- **Response (201):** Created team object.

### PATCH `/api/teams`

Update an existing team.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Team ID |
| `name` | `string` | No | New name |
| `description` | `string` | No | New description |
| `color` | `string` | No | New color |

- **Error Codes:** 400 (missing id), 404 (not found or cross-org).

### DELETE `/api/teams?id=<id>`

Delete a team and its member associations.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Error Codes:** 400 (missing id), 404 (not found or cross-org).

---

## 11. Members (CRUD)

### GET `/api/members`

List all members in the authenticated organization.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "members": [{ "id": "...", "name": "Alex Chen", "email": "alex@acme.com", "role": "Admin", "avatar": "...", "lastActive": "2h ago", "teamMemberships": ["Red Team"], "status": "online" }]
}
```
- **Valid Roles:** `owner`, `admin`, `security_lead`, `analyst`, `viewer`

### POST `/api/members`

Invite a new member.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `email` | `string` | Yes | Email address |
| `role` | `string` | No | Default `viewer` |

- **Response (201):** Created member object.

### PATCH `/api/members`

Update a member's role.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Member ID |
| `role` | `string` | Yes | New role |

### DELETE `/api/members?id=<id>`

Remove a member from the organization.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s

---

## 12. Monitoring (CRUD)

### GET `/api/monitoring`

List monitoring policies, scheduled runs, and alerts.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "policies": [{ "id": "...", "name": "Daily Production Scan", "schedule": "daily", "targetDomain": "app.com", "scanType": "full", "status": "active", "findings": 5 }],
  "scheduledRuns": [{ "id": "...", "policyName": "...", "scheduledTime": "Tomorrow, 12:00 PM", "status": "pending" }],
  "alerts": [{ "id": "...", "severity": "critical", "policy": "...", "description": "...", "status": "new" }]
}
```

### POST `/api/monitoring`

Create a new monitoring policy.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Policy name |
| `targetDomain` | `string` | Yes | Domain to monitor |
| `schedule` | `string` | No | `hourly`, `daily` (default), `weekly`, `monthly` |
| `scanType` | `string` | No | `full` (default) |

### PATCH `/api/monitoring`

Update a monitoring policy.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Policy ID |
| `enabled` | `boolean` | No | Enable/disable |
| `schedule` | `string` | No | New schedule |

### DELETE `/api/monitoring?id=<id>`

Delete a monitoring policy.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s

### POST `/api/monitoring/execute`

Execute all due monitoring policies (scheduler tick).

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Response (200):**
```json
{
  "executed": 3,
  "message": "3 monitoring policy(s) executed successfully",
  "policies": [{ "policyId": "...", "policyName": "...", "targetDomain": "...", "scanId": "...", "nextRunAt": "..." }]
}
```

---

## 13. Integrations (CRUD)

### GET `/api/integrations`

List all third-party integrations with activity logs.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "integrations": [{ "id": "...", "name": "Slack Alerts", "type": "slack", "connected": true, "eventCount": "1.2K", "eventType": "events sent" }],
  "activity": [{ "id": "...", "integration": "Slack Alerts", "action": "created", "timestamp": "2h ago", "status": "success" }]
}
```
- **Valid Types:** `slack`, `jira`, `splunk`, `pagerduty`, `microsoft_teams`, `webhooks`, `email`

### POST `/api/integrations`

Create a new integration.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Integration type (see valid types above) |
| `name` | `string` | Yes | Integration name |
| `config` | `object` | No | Provider-specific configuration |

### PATCH `/api/integrations`

Update an integration.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Integration ID |
| `enabled` | `boolean` | No | Enable/disable |
| `config` | `object` | No | New configuration |

### DELETE `/api/integrations?id=<id>`

Delete an integration.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s

---

## 14. Audit Logs

### GET `/api/audit`

Retrieve combined audit trail from scans and threat alerts.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "logs": [
    { "id": "...", "action": "scan_completed", "resource": "scan", "description": "Scan completed for example.com with risk score 42/100", "severity": "high", "timestamp": "..." }
  ]
}
```

---

## 15. Broadcast (Echo-Sign)

### GET `/api/broadcast`

List all broadcast messages.

- **Auth Required:** No
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `priority` | `string` | No | `INFO`, `WARNING`, `CRITICAL`, `SOVEREIGN` |
| `channel` | `string` | No | `cli`, `web`, `email`, `slack`, `pagerduty`, `webhook` |
| `active` | `boolean` | No | `true` for non-expired only |

### POST `/api/broadcast`

Create and sign a new broadcast (Ed25519 signed).

- **Auth Required:** Yes
- **Rate Limit:** 10 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `priority` | `string` | Yes | Priority level |
| `title` | `string` | Yes | Broadcast title |
| `body` | `string` | Yes | Broadcast body |
| `channel` | `string` | Yes | Delivery channel |
| `targetScope` | `string` | No | `all` (default), `enterprise`, `government` |

### GET `/api/broadcast/active`

List currently active (non-expired) broadcasts.

- **Auth Required:** No
- **Rate Limit:** 30 requests / 60s

### GET `/api/broadcast/verify/[id]`

Verify a broadcast's Ed25519 signature.

- **Auth Required:** No
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{ "ok": true, "id": "...", "verified": true, "expired": false, "broadcast": { ... } }
```

---

## 16. Genesis Stamps

Cryptographic trust attestation system with Ed25519 signed stamps.

### POST `/api/genesis`

Issue a new Genesis Stamp for a domain.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | `string` | Yes | Domain to attest |
| `tier` | `string` | No | `basic` (90d), `professional` (60d), `enterprise` (30d) |
| `scanId` | `string` | No | Use specific scan data |

- **Response (201):** Stamp object with signature, publicKey, payloadHash, and embed code.

### GET `/api/genesis`

List stamps by organization or domain.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `organizationId` or `domain` (at least one required).

### POST `/api/genesis/revoke`

Revoke an active Genesis Stamp.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stampId` | `string` | Yes | Stamp ID to revoke |
| `reason` | `string` | No | Revocation reason |

### GET `/api/genesis/verify/[stampId]`

Public verification endpoint for a Genesis Stamp.

- **Auth Required:** No
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{
  "valid": true,
  "stamp": { "stampId": "...", "domain": "...", "score": 85, "grade": "A", "status": "active" },
  "verification": { "signatureValid": true, "notExpired": true, "notRevoked": true, "verifiedAt": "..." }
}
```

### GET `/api/genesis/embed/[stampId]`

Get embeddable badge HTML for a Genesis Stamp.

- **Auth Required:** No
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{ "html": "<div ...>Genesis Stamp badge HTML</div>", "score": 85, "grade": "A", "domain": "...", "stampId": "..." }
```

---

## 17. AI Red Team

### POST `/api/ai-advisor`

AI-powered security advisor with CVE database, remediations, and attack path intelligence.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | Yes | User question |
| `findings` | `array` | No | Array of scan findings for context |
| `history` | `array` | No | Conversation history (multi-turn) |

- **Response (200):**
```json
{ "success": true, "reply": { "content": "Detailed security guidance...", "role": "assistant" }, "findingsContext": 5 }
```

---

## 18. AI Advisor

(See Section 17 — `/api/ai-advisor` is the AI Advisor endpoint)

---

## 19. AI Leaderboard

### GET `/api/ai-leaderboard`

Fragility score leaderboard for frontier AI models.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sort` | `string` | No | `fragility` (default), `grade`, `name` |
| `direction` | `string` | No | `desc` (default), `asc` |

- **Response (200):**
```json
{
  "success": true, "isSimulated": true, "stats": { "totalModelsTested": 8, "totalTestsRun": 2625, "totalAlignmentBreaks": 158 },
  "models": [{ "name": "Claude 3 Opus", "provider": "Anthropic", "fragilityScore": 28, "grade": "A-", "testsPassed": 380, "alignmentBreaks": 5 }]
}
```
- **Notes:** Uses simulated data by default. Falls back to real `ModelRedTeamResult` DB records if available.

### POST `/api/ai-leaderboard`

Trigger a new AI red-team scan cycle.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Response (202):**
```json
{ "success": true, "jobId": "GORGON-SCAN-...", "status": "demo_pending", "modelsQueued": 8 }
```

---

## 20. Cognitive Dread Engine

Omni-model stress testing framework.

### GET `/api/cognitive-dread`

Engine info or query models/results/leaderboard.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `action` — one of:
  - _(empty)_ — Engine info
  - `models` — List testable models and attack types
  - `results` — List recent scan results
  - `leaderboard` — Run quick comparison of all models

### POST `/api/cognitive-dread?action=scan`

Run a stress test against a specific AI model.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `modelId` | `string` | Yes | Target model (e.g. `gpt-4o`, `claude-3.5-sonnet`) |
| `attackTypes` | `string[]` | No | Attack types to run (default all 10) |
| `intensity` | `string` | No | `light`, `moderate` (default), `aggressive` |

- **Response (200):** Full scan result with per-attack scores, category breakdowns, defense recommendations.
- **Simulated:** All results are generated via PRNG — no real LLM API calls.

---

## 21. PQC Sovereign Vault

Post-Quantum Cryptography readiness analysis.

### POST `/api/pqc-vault`

Run full PQC analysis for an organization.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationType` | `string` | Yes | `central_bank`, `clearing_house`, `tier1_bank`, `payment_processor`, `government`, `enterprise` |
| `protocols` | `string[]` | Yes | Protocols to analyze (e.g. `["tls_1.2", "tls_1.3"]`) |
| `domain` | `string` | No | Domain for TLS data generation |
| `tlsData` | `object` | No | Custom TLS asset data |
| `complianceFrameworks` | `string[]` | No | Compliance frameworks to check |

### GET `/api/pqc-vault/algorithms`

List all PQC and classical cryptographic algorithms.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{ "pqcAlgorithms": [...], "classicalAlgorithms": [...], "protocols": [...] }
```
- **Notes:** GET to `/api/pqc-vault` without `/algorithms` returns 404.

---

## 22. CNI Sentinel

Critical National Infrastructure threat analysis.

### POST `/api/cni-sentinel`

Run full CNI threat analysis.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `networkSegment` | `string` | Yes | `scada`, `plc`, `hmi`, `dcs`, `enterprise`, `dmz` |
| `industry` | `string` | Yes | `energy`, `water`, `transportation`, `telecom`, `defense`, `manufacturing` |
| `protocols` | `string[]` | Yes | SCADA/ICS protocol keys |
| `devices` | `array` | No | Device info array |
| `scanFindings` | `array` | No | Scan findings to analyze |

### GET `/api/cni-sentinel`

Query SCADA protocols, APT groups, or download reports.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `resource` — one of:
  - _(empty)_ — Available endpoints
  - `protocols` — List SCADA/ICS protocols
  - `apt-groups` — List known APT groups
  - `stix-report` — Download STIX 2.1 JSON report
  - `iodef-report` — Download IODEF XML report

---

## 23. Doom Clock (Quantum)

Quantum threat timeline analysis.

### POST `/api/doom-clock`

Calculate doom clock for TLS assets.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | `string` | Yes* | Target domain (*or `tlsData`) |
| `companyName` | `string` | No | Display name |
| `industry` | `string` | No | `finance`, `healthcare`, `technology`, `government`, `retail`, `energy`, `telecom`, `education` |
| `tlsData` | `array` | Yes* | Custom TLS data (*or `domain`) |

### GET `/api/doom-clock?domain=xxx`

Get doom clock analysis via query params.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `domain` (required), `companyName`, `industry`
- **Response:** Same structure as POST.

---

## 24. Bot Hunter

Automated botnet/honeypot detection via TCP probing and banner grabbing.

### POST `/api/bot-hunter`

Scan a target for botnet infrastructure signatures.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | `string` | Yes | IP address or hostname |
| `ports` | `number[]` | No | Ports to scan (default common botnet ports) |

- **Response (200):** Detailed findings with TCP probes, banner analysis, and threat classification.

---

## 25. Confused Deputy Sandbox

Simulated AI agent with defense rules against prompt injection.

### POST `/api/sandbox`

Send a message to the sandbox agent.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | No | Resume existing session |
| `message` | `string` | Yes | User message to agent |
| `enableDefenseMode` | `boolean` | No | Enable defense rules |

- **Response (200):** Agent response with action, points, and annotations.
- **Simulated:** Pattern-matched responses, no real LLM.

### GET `/api/sandbox`

List active sandbox sessions or session details.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `sessionId` (optional — for specific session)

---

## 26. Oblivion

AI model analysis engine (20 tools of analytical dissolution).

### POST `/api/oblivion`

Run the OBLIVION analysis engine against a target.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | `string` | Yes | Target host/domain |

- **Response (200):** Full analysis with threat score, dread index, tool results, wisdom quote, and hall of the forgotten stats.

### GET `/api/oblivion`

Get OBLIVION engine info, tools catalog, and wisdom quotes.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s

---

## 27. Model Red Team (GORGON)

AI red-team engine for frontier models — "The Gaze That Breaks Models".

### POST `/api/model-redteam`

Run GORGON red-team analysis against a target AI model's API endpoint.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | `string` | Yes | Target AI model API URL |
| `testTypes` | `string[]` | No | Specific test types to run |

- **Response (200):** Comprehensive red-team results with per-test scores and findings.

---

## 28. Implosion Simulation

Breach financial impact simulation.

### POST `/api/implosion`

Run an implosion simulation.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `industry` | `string` | Yes | `healthcare`, `finance`, `technology`, `retail`, `government`, `education` |
| `companyName` | `string` | No | Company name |
| `annualRevenue` | `number` | No | Annual revenue ($USD) |
| `employeeCount` | `number` | No | Number of employees |
| `customerCount` | `number` | No | Number of customers |
| `severityPreset` | `string` | No | `mild`, `moderate`, `severe`, `catastrophic` |
| `scanId` | `string` | No | Use real scan findings |
| `domain` | `string` | No | Domain |
| `customFactors` | `object` | No | Multipliers for cost, downtime, churn, stock, insurance |

- **Response (201):** Full simulation result with financial impact, narrative, and industry comparison.

### GET `/api/implosion`

List saved implosion scenarios.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `organizationId` or `domain` (at least one required).

### DELETE `/api/implosion?id=<id>`

Delete a saved scenario.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s

---

## 29. Non-Human Identity (NHI)

Machine identity discovery, revocation, and rollback.

### GET `/api/nhi`

List non-human identities with revocation stats.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | No | `active`, `suspect`, `revoked`, `expired` |
| `cloud` | `string` | No | Cloud provider filter |

- **Response (200):**
```json
{
  "identities": [{ "id": "...", "identityType": "aws_iam_role", "identifier": "arn:aws:iam::...", "displayName": "EC2 Full Access Admin", "cloudProvider": "aws", "riskLevel": "critical", "blastRadius": 342, "status": "active", "revocations": 0 }],
  "stats": { "total": 14, "active": 10, "suspect": 2, "revoked": 2, "critical": 4, "revoked24h": 1 }
}
```

### POST `/api/nhi`

Scan for non-human identities (seeds sample data for MVP).

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | `string` | No | Scan target |
| `cloudProviders` | `string[]` | No | Filter by providers |

### POST `/api/nhi/seed`

Seed the database with sample identity data.

- **Auth Required:** Yes
- **Rate Limit:** 1 request / 60s
- **Response (200):** `{ "success": true, "identities": 14, "message": "Seeded 14 identities with sample data" }`

### POST `/api/nhi/revoke`

Revoke one or more non-human identities.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identityIds` | `string[]` | Yes | IDs to revoke |
| `reason` | `string` | Yes | Revocation reason |

- **Response (200):** `{ "revoked": 2, "failed": 0, "identities": [...] }`

### POST `/api/nhi/assess`

Run impact assessment before revocation.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identityIds` | `string[]` | Yes | Target identities |
| `scope` | `string` | Yes | `single`, `team`, `org`, `multi_cloud` |

- **Response (200):** Assessment with affectedIdentities, affectedResources, riskBefore/After, riskReduction.

### POST `/api/nhi/rollback`

Roll back previous revocations.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `revocationIds` | `string[]` | Yes | Revocation IDs to roll back |

### GET `/api/nhi/audit`

List NHI audit logs.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `limit` (default 50, max 200)

---

## 30. Exposed Assets

### GET `/api/exposed-assets`

Global AI asset exposure map (simulated).

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | No | `env_files`, `open_databases`, `exposed_llm_endpoints`, `unprotected_apis`, `cloud_misconfig`, `all` |
| `region` | `string` | No | `na`, `eu`, `asia`, `sa`, `africa`, `oceania`, `all` |

- **Response (200):**
```json
{
  "totalExposed": 12847,
  "assetsByType": { "env_files": 3854, "open_databases": 3212 },
  "assetsByRegion": { "north_america": 3854 },
  "recentAssets": [{ "id": "EXP-...", "type": "env_files", "severity": "critical", "lat": 37.77, "lng": -122.42, "city": "San Francisco", "description": "..." }],
  "timeSeries": [{ "hour": "00:00", "count": 18 }],
  "stats": { "detectedToday": 432, "peakHour": 14 },
  "simulated": true
}
```

---

## 31. Wall of Shame

### GET `/api/wall-of-shame`

Anonymized live incident ticker (simulated PRNG data).

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | `number` | No | Max incidents (default 50) |
| `severity` | `string` | No | `critical`, `high`, `medium`, `low` |
| `industry` | `string` | No | `fintech`, `healthcare`, `saas`, `government`, `ecommerce`, `education`, `energy`, `defense` |

- **Response (200):** Array of simulated incident objects with IDs, timestamps, severity, industry, finding types, and descriptions.

---

## 32. Fear Index

### GET `/api/fear-index`

Current CISO Fear Index value (simulated).

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):**
```json
{ "timestamp": "...", "index": 67, "level": "HIGH_FEAR", "change": 3.2, "simulated": true }
```

### GET `/api/fear-index/feed`

RSS feed of fear index updates.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response:** `Content-Type: application/xml`

### GET `/api/fear-index/history`

Historical fear index trend data.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `days` (default 90, range 7–365)
- **Response (200):**
```json
{ "generatedAt": "...", "days": 90, "data": [{ "date": "2025-04-20", "index": 62, "level": "ELEVATED" }], "simulated": true }
```

---

## 33. Hall of Fame (VibeSec)

### GET `/api/hall-of-fame`

VibeSec security leaderboard.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | `string` | No | Category filter |
| `search` | `string` | No | Domain search |

- **Response (200):**
```json
{
  "entries": [{ "rank": 1, "id": "...", "domain": "example.com", "score": 95, "grade": "A+", "findings": 0, "category": "saas" }],
  "stats": { "totalEntries": 100, "avgScore": 62, "aPlusCount": 12 }
}
```

### POST `/api/hall-of-fame`

Submit a domain for VibeSec micro-scanning.

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | `string` | Yes | Domain to scan |
| `submittedBy` | `string` | No | Submitter name |
| `category` | `string` | No | Category tag |

- **Response (200):** Scan result with score, grade, and probe results for 5 common paths.

---

## 34. Sovereign Control

Cryptographic authority with Ed25519 signed actions and dead man's switch.

### GET `/api/sovereign`

Sovereign status and audit trail.

- **Auth Required:** No (read-only)
- **Rate Limit:** 30 requests / 60s
- **Query Params:** `view` — one of:
  - _(empty)_ — Operational status
  - `status` — Master key, dead man's switch, lockdown status
  - `audit` — Action log (last 50)
  - `access-log` — API access log

### POST `/api/sovereign`

Execute sovereign action or dead man's switch ping.

- **Auth Required:** Yes
- **Rate Limit:** 10 requests / 60s
- **Request Body (ping):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `string` | Yes | `"ping"` |
| `signature` | `string` | No | Ed25519 signature for verification |

- **Request Body (execute):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `string` | Yes | `"execute"` |
| `actionType` | `string` | Yes | `emergency_lockdown`, `global_broadcast`, `override_tenant`, `revoke_all_keys`, `system_maintenance`, `access_grant`, `certification_sign`, `dead_man_switch` |
| `targetScope` | `string` | No | Scope (default `platform`) |
| `payload` | `object` | No | Action-specific payload |
| `signature` | `string` | No | Ed25519 signature |

- **Notes:** All action execution is **simulated** — no real infrastructure changes occur.

---

## 35. Vulnerability Scan

(See Section 3 — `/api/vuln-scan` is documented above)

---

## 36. System Scan

### POST `/api/system/scan`

Run internal system reconnaissance (processes, network, filesystem, logs, registry).

- **Auth Required:** Yes
- **Rate Limit:** 5 requests / 60s
- **Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scanners` | `string[]` | No | Scanners to run (default: all). Valid: `process`, `network`, `filesystem`, `logs`, `registry` |

- **Response (200):**
```json
{ "scanners": ["process", "network"], "results": { "process": {...}, "network": {...} }, "findingsCount": 15 }
```

---

## 37. Root Endpoint

### GET `/api/`

Simple hello-world endpoint.

- **Auth Required:** Yes
- **Rate Limit:** 30 requests / 60s
- **Response (200):** `{ "message": "Hello, world!" }`

---

## Rate Limit Summary

| Limit | Endpoints |
|-------|----------|
| 1 req / 60s | `POST /api/nhi/seed` |
| 5 req / 60s | Login, Register, Forgot Password, Scan (all), Vuln Scan, Bot Hunter, Hall of Fame POST, System Scan, Genesis issue/revoke, Implosion DELETE, NHI POST/revoke/rollback, AI Leaderboard POST, most PATCH/DELETE mutations |
| 10 req / 60s | Broadcast POST, Scan Stream, Sovereign POST |
| 30 req / 60s | Most GET endpoints, AI Advisor, Cognitive Dread, Oblivion, Doom Clock, CNI Sentinel, PQC Vault, Implosion POST, Exposed Assets, Wall of Shame, Fear Index, AI Leaderboard GET |
| 60 req / 60s | Health check |

---

## Authentication Notes

1. **API Key:** Pass via `x-api-key` header. Format: `rp_live_<32 hex chars>`.
2. **Session Cookie:** Set by `/api/auth/login` as `reconpro_session` (HttpOnly, Secure, SameSite=Lax, 24h).
3. **Validation:** `/api/v1/auth/validate` accepts key in request body for programmatic checks.
4. **Rate limits are IP-based** — shared across all requests from the same IP regardless of auth.

---

*Documentation auto-generated from source code analysis. 54 route files, 84 individual HTTP endpoint handlers.*
