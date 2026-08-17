# ReconPro Admin Guide

Administrative guide for managing ReconPro v0.2.0, covering initial setup, user management, organization management, monitoring, and maintenance.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [First-Time Configuration](#first-time-configuration)
3. [Organization Management](#organization-management)
4. [User Management](#user-management)
5. [Team Management](#team-management)
6. [Role-Based Access Control](#role-based-access-control)
7. [API Key Management](#api-key-management)
8. [Monitoring and Scheduling](#monitoring-and-scheduling)
9. [Integration Management](#integration-management)
10. [Compliance Management](#compliance-management)
11. [Audit Log Review](#audit-log-review)
12. [NHI Identity Management](#nhi-identity-management)
13. [Genesis Stamp Management](#genesis-stamp-management)
14. [System Maintenance](#system-maintenance)
15. [Health Monitoring](#health-monitoring)

---

## Initial Setup

### Creating the Admin Account

The first user registered through `/register` automatically becomes the organization **owner** with full administrative privileges. There is no separate admin registration flow.

1. Navigate to `https://your-reconpro.com/register`
2. Enter your name, email, and a password (minimum 8 characters)
3. The system creates:
   - An organization named `{name}'s Organization`
   - A slug derived from your email domain (e.g., `acme` for `user@acme.com`)
   - Your member record with `owner` role
   - A default API key for the organization
4. The raw API key is displayed once in the response. Save it securely — it cannot be retrieved again.

### After Registration

- You are automatically logged in with a session cookie
- Navigate to `/overview` for the executive dashboard
- Navigate to `/settings` to configure organization details

---

## First-Time Configuration

### Organization Settings

Access organization settings at `/settings`:

1. **Organization name**: Update from the default (`{name}'s Organization`) to your company name
2. **Domain**: Set your primary monitored domain (e.g., `acme.com`)
3. **Logo**: Upload an organization logo (displayed in the dashboard and Genesis Stamps)
4. **Plan**: Select your subscription plan (starter, professional, enterprise)
5. **SSO**: Enable SAML/SSO authentication (enterprise plans)

### Plan Tiers and Limits

| Plan | Max Scans | Max Members | API Quota | SSO |
|------|-----------|-------------|-----------|-----|
| **Starter** | 100 | 10 | 1,000 | No |
| **Professional** | 500 | 25 | 5,000 | No |
| **Enterprise** | 1,000 | 50 | 10,000 | Yes |

Default limits (enterprise) are applied at registration. Adjust via the organization settings or database.

---

## Organization Management

### Viewing Organization Details

The organization record contains:

| Field | Description |
|-------|-------------|
| **name** | Display name |
| **slug** | URL-safe identifier (unique) |
| **plan** | Subscription tier |
| **logo** | Uploaded logo URL |
| **domain** | Primary monitored domain |
| **maxScans** | Scan quota per billing period |
| **maxMembers** | Member limit |
| **ssoEnabled** | SAML SSO status |
| **apiQuota** | API request limit per billing period |

### Modifying Organization Settings

Organization owners and admins can modify settings through the `/settings` page. Changes are persisted to the database and reflected immediately.

### Multi-Organization Architecture

ReconPro uses a multi-tenant architecture where each organization is an isolated tenant. Data is scoped by `organizationId` in all database queries. Members belong to exactly one organization.

---

## User Management

### Inviting New Members

New members are created through the registration flow or via the members API:

1. Navigate to `/teams` or use the members management interface
2. New members receive the `analyst` role by default
3. The organization owner can change roles after creation

### Member Roles

| Role | Capabilities |
|------|-------------|
| **owner** | Full access: organization settings, member management, billing, all scans, all findings, API keys |
| **admin** | Organization settings, member management, scan management, finding management |
| **security_lead** | Scan management, finding triage (acknowledge, mitigate, false positive), team management |
| **analyst** | Launch scans, view findings, view reports, view compliance data |
| **viewer** | Read-only access to all data (no scan launching, no finding modifications) |

### Member Properties

| Property | Description |
|----------|-------------|
| **email** | Unique email address (used for login) |
| **name** | Display name |
| **passwordHash** | bcrypt hash (null for API-key-only accounts) |
| **avatar** | Profile avatar URL |
| **role** | Access level within the organization |
| **lastActive** | Timestamp of last authenticated activity |

### Password Management

- Members with `passwordHash = null` cannot log in via the web interface
- These are API-key-only accounts (service accounts)
- Password changes are handled through the profile settings
- Password reset is available via `/api/auth/forgot-password`

### Deactivating Members

To deactivate a member, remove their sessions and optionally their API keys. The member record remains in the database for audit trail integrity.

---

## Team Management

### Creating Teams

Teams provide logical grouping within an organization:

1. Navigate to `/teams`
2. Create a new team with a name, description, and color
3. Teams are scoped to the creating organization

### Team Roles

| Role | Description |
|------|-------------|
| **lead** | Team lead — can manage team members and assign targets |
| **member** | Regular team member |

### Assigning Targets to Teams

Scan targets can be assigned to specific teams, enabling team-based ownership of monitored assets. This supports security team structures where different teams are responsible for different product lines or infrastructure domains.

### Team-Target Relationship

- A target can belong to one team or be unassigned (organization-level)
- Team assignment filters the dashboard to show only relevant targets and findings
- Teams do not affect RBAC — permissions are still determined by the member's role

---

## Role-Based Access Control

### RBAC Implementation

ReconPro implements RBAC at two levels:

#### 1. Authentication Level (Middleware)

The middleware enforces that protected routes require a valid session cookie. This is a binary check — authenticated or not.

#### 2. Authorization Level (API Routes)

API routes check the member's role for write operations. The role is determined from the session or API key's associated organization.

### Permission Matrix

| Action | Owner | Admin | Security Lead | Analyst | Viewer |
|--------|-------|-------|---------------|---------|--------|
| View dashboard | Yes | Yes | Yes | Yes | Yes |
| Launch scans | Yes | Yes | Yes | Yes | No |
| View findings | Yes | Yes | Yes | Yes | Yes |
| Acknowledge findings | Yes | Yes | Yes | No | No |
| Manage members | Yes | Yes | No | No | No |
| Manage teams | Yes | Yes | Yes | No | No |
| Organization settings | Yes | Yes | No | No | No |
| Manage API keys | Yes | Yes | No | No | No |
| Manage integrations | Yes | Yes | No | No | No |
| View audit logs | Yes | Yes | Yes | No | No |
| NHI management | Yes | Yes | Yes | No | No |
| Generate stamps | Yes | Yes | Yes | No | No |

---

## API Key Management

### Creating API Keys

API keys are created during registration (default key) and can be created through the settings interface:

- Format: `rp_live_` + 32 hex characters (e.g., `rp_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`)
- The raw key is displayed only once upon creation
- Only the SHA-256 hash is stored in the database
- The first 12 characters (`keyPrefix`) are shown in the UI for identification

### Key Scopes

Default scopes for new keys:

| Scope | Description |
|-------|-------------|
| `scan:read` | Read scan results and history |
| `scan:write` | Launch new scans |
| `telemetry:write` | Push telemetry data |

### Key Lifecycle Management

1. **Active keys** are used for API authentication
2. **Expired keys** (past `expiresAt`) are rejected at authentication time
3. **Deactivated keys** (`isActive = false`) are rejected at authentication time
4. **Usage tracking**: Each authenticated request increments `requestCount` and updates `lastUsedAt`

### Key Rotation

To rotate an API key:

1. Create a new key through the settings interface
2. Update your integrations to use the new key
3. Deactivate the old key by setting `isActive = false`
4. The old key is preserved in the database for audit purposes

---

## Monitoring and Scheduling

### Creating Monitor Policies

Monitor policies automate regular scans of specific targets:

1. Navigate to `/monitoring`
2. Create a new policy with:
   - **Target**: The scan target to monitor
   - **Schedule**: `hourly`, `daily`, `weekly`, or `monthly`
   - **Scan type**: `full`, `quick`, `stealth`, or `compliance`
   - **Enabled**: Toggle the policy on/off

### Policy Properties

| Field | Description |
|-------|-------------|
| **name** | Policy display name |
| **schedule** | Scan frequency |
| **scanType** | Type of scan to execute |
| **enabled** | Active/inactive toggle |
| **lastRunAt** | Timestamp of last execution |
| **nextRunAt** | Calculated next execution time |
| **totalRuns** | Cumulative execution count |

### Trigger Types

Scans can be triggered by:

| Trigger | Description |
|---------|-------------|
| `manual` | User-initiated via dashboard or API |
| `scheduled` | Triggered by a monitor policy |
| `api` | Triggered via API call with authentication |
| `webhook` | Triggered by external webhook |

### Scan Types

| Type | Description |
|------|-------------|
| `full` | Complete reconnaissance (DNS, HTTP, SSL, subdomains, ports, emails, WHOIS) |
| `quick` | Fast surface scan (DNS + HTTP headers) |
| `stealth` | Low-profile scan to avoid detection |
| `compliance` | Compliance-focused scan (security headers, SSL, DNS records) |

---

## Integration Management

### Configuring Integrations

Navigate to `/integrations` to manage third-party connections:

1. Select the integration type (Slack, Jira, Splunk, PagerDuty, Teams, Webhooks, Email)
2. Provide the required configuration (webhook URL, API token, etc.)
3. Toggle the integration active/inactive
4. Test the connection

### Integration Types

| Type | Use Case |
|------|---------|
| **Slack** | Receive critical finding alerts in Slack channels |
| **Jira** | Auto-create tickets for high-severity findings |
| **Splunk** | Forward scan results and audit logs to Splunk |
| **PagerDuty** | Trigger incidents for critical vulnerabilities |
| **Microsoft Teams** | Post alerts to Teams channels |
| **Webhooks** | Custom HTTP endpoints for event forwarding |
| **Email** | Send reports and alerts via email |

### Monitoring Integration Health

The `lastSync` and `eventsTotal` fields track integration activity. An integration with `lastSync` far in the past may indicate a configuration issue.

---

## Compliance Management

### Supported Frameworks

| Framework | Description |
|-----------|-------------|
| **SOC 2** | Service Organization Control Type 2 |
| **HIPAA** | Health Insurance Portability and Accountability Act |
| **PCI DSS** | Payment Card Industry Data Security Standard |
| **ISO 27001** | Information Security Management System |
| **GDPR** | General Data Protection Regulation |
| **NIST** | NIST Cybersecurity Framework |

### Compliance Reports

Navigate to `/compliance` to view assessment results:

- **Overall Score**: 0-100 aggregate score
- **Status**: `pass`, `fail`, `in_progress`, `needs_review`
- **Controls**: Individual control checks stored as JSON array
- **Source Scan**: Link to the scan that generated the report

### Running Compliance Assessments

Compliance scans are triggered with `scanType: compliance`. The scanner evaluates security controls relevant to the selected framework and produces a scored report.

---

## Audit Log Review

### Accessing Audit Logs

Audit logs are accessible through the `/audit` API endpoint and the audit section of the dashboard. Logs record every significant action within the organization.

### Log Fields

| Field | Description |
|-------|-------------|
| **action** | Action type (e.g., `scan_launched`, `member_invited`) |
| **resource** | Resource type (e.g., `scan`, `finding`, `member`, `team`) |
| **resourceId** | ID of the affected resource |
| **details** | Additional context as JSON |
| **ipAddress** | Client IP address |
| **createdAt** | Timestamp of the action |
| **memberId** | Actor (if applicable) |
| **apiKeyId** | API key used (if applicable) |

### Action Types

- `scan_launched`, `scan_completed`, `scan_failed`
- `finding_acknowledged`, `finding_mitigated`, `finding_false_positive`
- `member_invited`, `member_role_changed`
- `team_created`, `team_member_added`
- `api_key_created`, `api_key_revoked`
- `policy_created`, `policy_modified`, `policy_enabled`, `policy_disabled`
- `integration_created`, `integration_modified`
- `nhi_identity_revoked`, `nhi_identity_rollback`
- `genesis_stamp_issued`, `genesis_stamp_revoked`

---

## NHI Identity Management

### Non-Human Identities

NHI (Non-Human Identity) management tracks and controls cloud service accounts:

- **AWS IAM Roles/Users**
- **GCP Service Accounts**
- **Azure App Registrations**
- **GitHub Personal Access Tokens (PATs)**

### Identity Properties

| Property | Description |
|----------|-------------|
| **identityType** | Type of cloud identity |
| **identifier** | ARN, email, client ID, or token identifier |
| **cloudProvider** | AWS, GCP, Azure, GitHub |
| **permissions** | JSON array of permission strings |
| **status** | `active`, `revoked`, `expired`, `suspect` |
| **riskLevel** | `critical`, `high`, `normal`, `low` |
| **blastRadius** | Number of reachable resources |

### Revocation Process

1. Navigate to the NHI management interface
2. Select an identity to revoke
3. Choose a reason: `breach_detected`, `policy_violation`, `manual`, `scheduled_rotation`, `false_positive`
4. The system records the revocation with a permissions snapshot
5. Rollback data is preserved for potential reinstatement

### Impact Assessment

Before revoking a high-blast-radius identity, run an impact assessment to evaluate:
- Number of affected identities
- Number of affected resources
- Risk score before and after revocation
- Scope: `single`, `team`, `org`, `multi_cloud`

---

## Genesis Stamp Management

### Creating Attestation Stamps

Genesis Stamps are cryptographically signed security attestations:

1. Navigate to the Genesis Stamp section or use `POST /api/genesis`
2. Select a domain and tier (`basic`, `professional`, `enterprise`)
3. The system runs a scan and generates a composite security score (0-100)
4. An Ed25519 signature is produced with the attestation payload
5. A human-readable stamp ID (`GS-XXXX-XXXX-XXXX`) is assigned
6. The stamp can be embedded as a badge on websites

### Stamp Tiers

| Tier | Features |
|------|----------|
| **Basic** | Score + grade |
| **Professional** | Basic + compliance scores |
| **Enterprise** | Professional + frameworks + findings summary |

### Stamp Lifecycle

| Status | Description |
|--------|-------------|
| **active** | Valid and verifiable |
| **expired** | Past expiration date |
| **revoked** | Manually revoked by the organization |

### Verification

External parties can verify stamps via `GET /api/genesis/verify/{stampId}`, which:
1. Retrieves the stamp from the database
2. Reconstructs the attestation payload
3. Verifies the Ed25519 signature against the stored public key
4. Increments the `verifiedCount`

### Embedding

Badges can be embedded on external websites via `GET /api/genesis/embed/{stampId}`, which returns an HTML snippet. The `embedViews` counter tracks badge renders.

---

## System Maintenance

### Database Maintenance

```bash
# Check database integrity
sqlite3 /opt/reconpro/db/reconpro.db "PRAGMA integrity_check;"

# Vacuum to reclaim space
sqlite3 /opt/reconpro/db/reconpro.db "VACUUM;"

# Analyze for query optimization
sqlite3 /opt/reconpro/db/reconpro.db "ANALYZE;"
```

### Session Cleanup

Expired sessions should be cleaned periodically. Run this as a scheduled task:

```sql
DELETE FROM Session WHERE expiresAt < datetime('now');
```

### Log Rotation

Application logs written to `server.log` should be rotated:

```bash
# Using logrotate
cat > /etc/logrotate.d/reconpro <<EOF
/opt/reconpro/server.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

### Software Updates

Follow the standard upgrade procedure from the Installation Guide. Always back up the database before upgrading.

---

## Health Monitoring

### Health Check Endpoint

```bash
curl https://your-reconpro.com/api/health
```

Response fields:

| Field | Description |
|-------|-------------|
| `status` | `healthy` or `degraded` |
| `version` | Application version (e.g., `0.2.0`) |
| `timestamp` | Current server time (ISO 8601) |
| `uptime` | Process uptime in seconds |
| `responseTime` | Response generation time in milliseconds |
| `checks.database` | Database connectivity status (`ok` or `degraded`) |

### Recommended Monitoring Alerts

- Alert if `status` is not `healthy`
- Alert if `responseTime` exceeds 500ms
- Alert if `checks.database` is `degraded`
- Alert if uptime resets unexpectedly (indicates a crash)
- Alert if health endpoint is unreachable for more than 60 seconds

### System Metrics

Monitor via systemd:

```bash
# CPU and memory usage
systemctl status reconpro

# Real-time resource monitoring
journalctl -u reconpro -f

# Process-level monitoring
ps aux | grep server.js
```
