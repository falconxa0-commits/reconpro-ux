# ReconPro User Guide

End-user guide for the ReconPro v0.2.0 dashboard, covering scans, findings, reports, monitoring, and daily workflows.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Navigation](#navigation)
4. [Launching Scans](#launching-scans)
5. [Understanding Findings](#understanding-findings)
6. [Finding Management](#finding-management)
7. [Continuous Monitoring](#continuous-monitoring)
8. [Compliance Reports](#compliance-reports)
9. [Threat Intelligence](#threat-intelligence)
10. [NHI Identity Dashboard](#nhi-identity-dashboard)
11. [Breach Simulation](#breach-simulation)
12. [Genesis Stamps](#genesis-stamps)
13. [Team Collaboration](#team-collaboration)
14. [Integrations](#integrations)
15. [Settings and Profile](#settings-and-profile)
16. [API Usage](#api-usage)
17. [Command Palette](#command-palette)
18. [Best Practices](#best-practices)

---

## Getting Started

### Creating Your Account

1. Navigate to the ReconPro URL provided by your administrator
2. Click **Get Started** or go directly to `/register`
3. Fill in your details:
   - **Name**: Your full name
   - **Email**: Your work email address
   - **Password**: At least 8 characters
4. Click **Register**
5. Your account is created with the `owner` role for a new organization
6. An API key is automatically generated — copy and save it (shown only once)

### Logging In

1. Navigate to `/login`
2. Enter your email and password
3. Click **Login**
4. You are redirected to the dashboard overview

### Password Recovery

If you forget your password:

1. Navigate to `/forgot-password`
2. Enter your registered email
3. Follow the password reset link sent to your email
4. Set a new password

---

## Dashboard Overview

The overview page (`/overview`) provides an executive summary of your organization's security posture.

### Key Metrics

The dashboard displays the following metrics:

| Metric | Description |
|--------|-------------|
| **Risk Score** | Aggregate risk score across all recent scans (0-100) |
| **Total Findings** | Total count of open findings across all categories |
| **Critical Findings** | Count of critical-severity findings requiring immediate attention |
| **High Findings** | Count of high-severity findings |
| **Compliance Score** | Average compliance score across all assessed frameworks |
| **Active Targets** | Number of scan targets currently being monitored |
| **Recent Scans** | List of the most recent scans with status and results |

### Bento Dashboard Layout

The overview uses a bento grid layout with:

- Large metric cards for key scores
- Scan history timeline
- Severity distribution chart
- Compliance framework summary
- Recent threat alerts
- Quick action buttons for common tasks

### Refreshing Data

Dashboard data refreshes automatically when the page loads. To refresh manually, navigate away and back, or use the browser refresh. Real-time updates for ongoing scans are available via the streaming endpoint.

---

## Navigation

### Sidebar Navigation

The dashboard sidebar provides access to all major sections:

| Section | Icon | Description |
|---------|------|-------------|
| **Overview** | Layout | Executive dashboard |
| **Scans** | Search | Scan management and history |
| **Findings** | Alert | Finding triage and management |
| **Monitoring** | Activity | Continuous monitoring policies |
| **Compliance** | Shield | Compliance framework reports |
| **Teams** | Users | Team management and membership |
| **Integrations** | Plug | Third-party integration configuration |
| **Settings** | Gear | Organization and profile settings |

### Bottom Dock

Quick actions available in the bottom dock:

- Launch a new scan
- View latest findings
- Check threat alerts
- Open command palette

### Breadcrumb Navigation

Page headers include breadcrumbs for context:

```
Home > Scans > Scan Results > example.com
```

---

## Launching Scans

### Starting a New Scan

1. Navigate to `/scans` or use the scan input component
2. Enter the target domain (e.g., `example.com`)
3. Optionally select a scan type:
   - **Full**: Complete reconnaissance (recommended for first scan)
   - **Quick**: Fast surface check (DNS + HTTP headers only)
   - **Stealth**: Low-profile scan
   - **Compliance**: Compliance-focused assessment
4. Click **Start Scan**

### What Gets Scanned

A full scan performs the following checks in parallel:

#### DNS Enumeration

| Record Type | What It Checks |
|-------------|---------------|
| **A** | IPv4 addresses |
| **AAAA** | IPv6 addresses |
| **MX** | Mail server configuration |
| **NS** | Name server configuration |
| **TXT** | SPF, DKIM, DMARC, and other text records |
| **CNAME** | Domain aliases |
| **SOA** | Zone authority and serial numbers |

#### HTTP Header Analysis

- Presence and configuration of security headers
- Technology stack detection (web servers, frameworks, CDNs)
- Cookie security flags (Secure, HttpOnly, SameSite)
- Redirect chains

#### SSL/TLS Inspection

- Certificate validity and expiry timeline
- Protocol version (TLS 1.2, 1.3)
- Cipher suite strength
- Subject Alternative Names (SANs)
- Certificate chain completeness
- Self-signed certificate detection

#### Subdomain Discovery

- Queries Certificate Transparency logs (crt.sh)
- Extracts subdomains from certificate SANs
- Returns unique subdomain list

#### Port Scanning

- Common service ports (22, 25, 53, 80, 443, 3306, 5432, etc.)
- Port state: open, closed, filtered, or timeout
- Service identification

#### Additional Checks

- Email harvesting (from DNS TXT records and web pages)
- WHOIS registration data
- Directory enumeration (common paths)
- Geolocation of resolved IPs

### Scan Results

After a scan completes, results are displayed with:

- **Risk Score**: 0-100 composite score
- **Vulnerability Counts**: Breakdown by severity (critical, high, medium, low, info)
- **Compliance Score**: Framework alignment percentage
- **Duration**: Total scan execution time
- **Findings**: Individual findings with titles, severities, and evidence

### Scan History

Navigate to `/scans` to view historical scans:

| Column | Description |
|--------|-------------|
| **Target** | Scanned domain or IP |
| **Type** | full, quick, stealth, compliance |
| **Status** | pending, running, completed, failed |
| **Risk Score** | Composite risk score |
| **Critical/High/Med/Low/Info** | Finding counts by severity |
| **Triggered By** | manual, scheduled, api, webhook |
| **Started At** | Scan start timestamp |
| **Duration** | Execution time in milliseconds |

### Streaming Results

For real-time scan progress, use the streaming endpoint:

```
GET /api/scan/stream?domain=example.com
```

This provides a server-sent event stream with finding updates as they are discovered.

---

## Understanding Findings

### Finding Severity Levels

| Level | Color | Description | Response Time |
|-------|-------|-------------|---------------|
| **Critical** | Red | Immediate security risk that can be exploited | Within 24 hours |
| **High** | Orange | Significant vulnerability requiring prompt attention | Within 72 hours |
| **Medium** | Yellow | Configuration issue that should be addressed | Within 1 week |
| **Low** | Blue | Minor issue with minimal risk | Within 1 month |
| **Info** | Gray | Informational finding, no security impact | Review only |

### Finding Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **subdomain** | Subdomain-related findings | New subdomain discovered, wildcard DNS |
| **port** | Open port findings | SSH exposed, database port open |
| **technology** | Technology stack detection | Outdated framework, deprecated library |
| **ssl** | SSL/TLS findings | Expired certificate, weak cipher, self-signed cert |
| **dns** | DNS configuration issues | Missing SPF, open DNS resolver, no DKIM |
| **header** | HTTP security header issues | Missing CSP, no HSTS, X-Frame-Options not set |
| **vulnerability** | Specific vulnerabilities | CVE references, known exploits |

### Finding Details

Each finding includes:

| Field | Description |
|-------|-------------|
| **Title** | Short, descriptive title |
| **Severity** | critical, high, medium, low, info |
| **Category** | Finding category |
| **Description** | Detailed explanation of the finding |
| **Evidence** | Raw evidence from the scan (DNS output, HTTP headers, etc.) |
| **Asset** | The specific asset affected (domain, IP, port, etc.) |
| **Remediation** | Step-by-step fix guidance |
| **CVE** | CVE identifier if applicable |
| **CVSS** | CVSS score if applicable |

---

## Finding Management

### Finding Statuses

| Status | Description |
|--------|-------------|
| **open** | New finding, not yet reviewed |
| **acknowledged** | Reviewed and accepted as valid |
| **mitigated** | Fix has been applied |
| **false_positive** | Finding is not a real vulnerability |

### Triage Workflow

1. Navigate to `/findings`
2. Filter by severity, category, or status
3. Review the finding details and evidence
4. Update the finding status:
   - **Acknowledge**: Confirm the finding is valid
   - **Mitigate**: Mark as fixed after applying the remediation
   - **False Positive**: Dismiss if the finding is inaccurate

### Filtering and Sorting

Findings can be filtered by:

- Severity level (critical, high, medium, low, info)
- Category (subdomain, port, technology, ssl, dns, header, vulnerability)
- Status (open, acknowledged, mitigated, false_positive)
- Scan source
- Date range

Sort by: severity, date, category, or asset name.

### Bulk Actions

Select multiple findings to:

- Mark all as acknowledged
- Mark all as mitigated
- Export findings as JSON or CSV

---

## Continuous Monitoring

### Setting Up Monitoring

Continuous monitoring automates regular scans of your targets:

1. Navigate to `/monitoring`
2. Click **Create Policy**
3. Configure:
   - **Target**: Select a previously scanned domain
   - **Schedule**: How often to scan (hourly, daily, weekly, monthly)
   - **Scan Type**: full, quick, stealth, or compliance
   - **Name**: Descriptive policy name
4. Enable the policy

### Monitoring Dashboard

The monitoring page shows:

| Information | Description |
|-------------|-------------|
| **Active Policies** | Number of enabled monitoring policies |
| **Last Run** | Most recent scan execution time |
| **Next Run** | Scheduled next execution time |
| **Total Runs** | Cumulative scan count per policy |
| **Policy Status** | Enabled/disabled toggle |

### Schedule Options

| Schedule | Recommended Use Case |
|----------|---------------------|
| **Hourly** | Critical infrastructure with frequent changes |
| **Daily** | Standard production environments |
| **Weekly** | Staging or less dynamic environments |
| **Monthly** | Compliance-required periodic assessments |

### Alerting on Changes

When a monitoring scan detects changes from the previous scan (new findings, changed configurations, new subdomains), alerts can be sent via configured integrations (Slack, email, PagerDuty, etc.).

---

## Compliance Reports

### Viewing Compliance Reports

Navigate to `/compliance` to see assessment results:

### Supported Frameworks

| Framework | What It Assesses |
|-----------|-----------------|
| **SOC 2** | Access controls, encryption, monitoring, incident response |
| **HIPAA** | Protected health information safeguards |
| **PCI DSS** | Payment card data protection |
| **ISO 27001** | Information security management controls |
| **GDPR** | Data protection and privacy controls |
| **NIST CSF** | Identify, Protect, Detect, Respond, Recover functions |

### Report Components

| Component | Description |
|-----------|-------------|
| **Overall Score** | 0-100 aggregate compliance percentage |
| **Status** | pass, fail, in_progress, needs_review |
| **Controls** | Individual control checks with pass/fail status |
| **Generated At** | Report timestamp |
| **Source Scan** | Link to the originating scan |

### Generating a New Compliance Report

Run a compliance scan from `/scans` by selecting the `compliance` scan type. The scanner evaluates controls relevant to each enabled framework and produces a scored report.

### Interpreting Scores

| Score Range | Rating |
|-------------|--------|
| 90-100 | Excellent — Strong compliance posture |
| 75-89 | Good — Minor gaps to address |
| 60-74 | Fair — Several areas need improvement |
| 40-59 | Poor — Significant compliance gaps |
| 0-39 | Critical — Major non-compliance issues |

---

## Threat Intelligence

### Threat Alerts

Navigate to the threat alerts section to view:

- Active threat notifications
- Indicators of compromise (IOCs)
- Severity classification
- Source attribution

### Fear Index

The Fear Index provides a composite threat score (0-100) that aggregates global threat intelligence data. Higher scores indicate elevated threat levels.

### Threat Feed

The `/api/threats` endpoint provides a structured threat feed with:

- Threat title and description
- Severity rating
- Source attribution
- Indicators of compromise
- Timestamps

---

## NHI Identity Dashboard

The Non-Human Identity (NHI) dashboard manages cloud service accounts and their security posture.

### Viewing Identities

The NHI section displays all registered identities:

| Column | Description |
|--------|-------------|
| **Identity Type** | AWS IAM Role, GCP Service Account, etc. |
| **Identifier** | ARN, email, or client ID |
| **Cloud Provider** | AWS, GCP, Azure, GitHub |
| **Status** | active, revoked, expired, suspect |
| **Risk Level** | critical, high, normal, low |
| **Blast Radius** | Number of reachable resources |
| **Last Rotated** | Date of last credential rotation |

### Revoking an Identity

To revoke a non-human identity:

1. Select the identity from the list
2. Click **Revoke**
3. Select a reason: breach_detected, policy_violation, manual, scheduled_rotation, false_positive
4. Confirm the revocation

The system captures a snapshot of the identity's permissions at revocation time and preserves rollback data.

### Rolling Back a Revocation

If a revocation was made in error:

1. Navigate to the revocation record
2. Click **Rollback**
3. The identity is reinstated using the preserved rollback data

All rollback actions are recorded in the NHI audit log.

---

## Breach Simulation

### Running a Simulation

The Proof-of-Implosion engine simulates the financial and operational impact of a security breach:

1. Navigate to the Implosion section
2. Configure the simulation:
   - **Industry**: healthcare, finance, technology, retail, government, education
   - **Company Size**: Revenue, employee count, customer count
   - **Severity Preset**: minimal, moderate, severe, catastrophic
3. Run the simulation

### Simulation Outputs

| Output | Description |
|--------|-------------|
| **Data Breach Cost** | Estimated total cost (millions USD) |
| **Regulatory Fines** | Projected regulatory penalties |
| **Reputational Damage** | Brand damage estimate |
| **Operational Downtime** | Estimated hours of downtime |
| **Customer Churn Rate** | Projected percentage of customer loss |
| **Stock Impact** | Estimated stock price drop |
| **Insurance Premium Increase** | Projected premium increase percentage |

### Custom Factors

Adjust multipliers in the custom factors panel to fine-tune the simulation to your organization's specific risk profile.

---

## Genesis Stamps

### What Are Genesis Stamps?

Genesis Stamps are cryptographically signed security attestations that prove your security posture. They use Ed25519 digital signatures and can be embedded as trust badges on your website.

### Creating a Stamp

1. Navigate to the Genesis Stamp section
2. Enter the domain to attest
3. Select a tier (basic, professional, enterprise)
4. The system generates a stamp with:
   - Stamp ID (e.g., `GS-A1B2-C3D4-E5F6`)
   - Security score and grade (A+ to F)
   - Ed25519 signature
   - Compliance scores (if professional or enterprise)

### Verifying a Stamp

Anyone can verify a stamp by visiting the verification URL or calling the API:

```
GET /api/genesis/verify/GS-A1B2-C3D4-E5F6
```

### Embedding a Badge

Embed the badge on your website using the embed endpoint. The badge displays:

- Organization name
- Security score and grade
- Verification status
- Stamp ID

---

## Team Collaboration

### Working with Teams

Teams organize members around specific responsibilities:

1. Navigate to `/teams`
2. View existing teams and their members
3. Create new teams for different product lines or infrastructure domains
4. Assign scan targets to teams for focused monitoring

### Team Dashboard

Each team sees filtered data:

- Scans for team-assigned targets
- Findings from team targets
- Team-specific compliance reports

---

## Integrations

### Connecting Third-Party Tools

1. Navigate to `/integrations`
2. Select an integration type
3. Enter the required credentials or webhook URL
4. Enable the integration

### Common Integration Patterns

- **Slack**: Post critical finding alerts to a security channel
- **Jira**: Auto-create tickets for high-severity findings
- **PagerDuty**: Trigger incidents for critical vulnerabilities
- **Email**: Receive daily or weekly summary reports

---

## Settings and Profile

### Organization Settings

At `/settings`, configure:

- Organization name and domain
- Logo upload
- Subscription plan
- SSO configuration (enterprise)

### Profile Settings

Update your personal information:

- Display name
- Avatar
- Password change

### API Keys

Manage your API keys:

- View existing keys (prefix only)
- Create new keys with specific scopes
- Revoke old keys

---

## API Usage

### Making API Calls

All API calls require the `X-API-Key` header:

```bash
curl -H "X-API-Key: rp_live_your_key_here" \
  https://your-reconpro.com/api/scans
```

### Common API Operations

```bash
# Launch a scan
curl -X POST -H "X-API-Key: rp_live_..." \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com","scanType":"full"}' \
  https://your-reconpro.com/api/scan

# List scan history
curl -H "X-API-Key: rp_live_..." \
  https://your-reconpro.com/api/scans

# Get compliance report
curl -H "X-API-Key: rp_live_..." \
  https://your-reconpro.com/api/compliance

# Check system health (no auth required)
curl https://your-reconpro.com/api/health
```

---

## Command Palette

Press `Ctrl+K` (or `Cmd+K` on macOS) to open the command palette. The command palette provides quick access to:

- Navigate to any page
- Launch a scan
- Switch between scans
- Open settings
- Search for findings

---

## Best Practices

### Regular Scanning

- Schedule daily scans for critical production domains
- Run weekly compliance scans for regulated environments
- Scan new domains before they go live

### Finding Triage

- Review critical findings within 24 hours
- Acknowledge findings as you work on them
- Mark as mitigated only after verifying the fix
- Use false positive sparingly and document the reason

### Team Organization

- Create teams by product line or infrastructure area
- Assign scan targets to the responsible team
- Use security_lead roles to manage team-level triage

### API Key Security

- Never commit API keys to source control
- Use different keys for different environments
- Rotate keys quarterly
- Revoke keys immediately if compromised
