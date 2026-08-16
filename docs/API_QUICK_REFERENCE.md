# ReconPro API Quick Reference

> **Base URL:** `https://reconpro.dev/api`  
> **Auth:** `x-api-key: rp_live_<hex>` or session cookie  
> **84 endpoints across 54 route files**

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password, get session + API key |
| POST | `/api/auth/register` | No | Create account + org + API key |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/v1/auth/validate` | No | Validate an API key |

## System & Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | App health check + DB connectivity |
| GET | `/api/system/health` | No | System metrics (memory, CPU, DB) |

## Core Scanning

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/scan` | Yes | Full recon scan (DNS, SSL, ports, HTTP, subdomains, WHOIS, email, certs, geo) |
| GET | `/api/scan/stream` | Yes | SSE real-time scan stream |
| POST | `/api/vuln-scan` | Yes | Targeted vulnerability scan with CVE matching |

## Scans & History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/scans` | Yes | List 20 most recent scans |
| GET | `/api/scans/history` | Yes | Paginated scan history with filters |

## Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports` | Yes | Generate report (JSON/Markdown/HTML) |

## Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Yes | Aggregated scan statistics |
| GET | `/api/executive` | Yes | Executive dashboard (MTTD, MTTR, compliance, risk trends) |

## Threat Intelligence

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/threats` | Yes | Evidence-derived threat alerts |

## Compliance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/compliance` | Yes | SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, GDPR evaluation |

## Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/teams` | Yes | List teams |
| POST | `/api/teams` | Yes | Create team |
| PATCH | `/api/teams` | Yes | Update team |
| DELETE | `/api/teams` | Yes | Delete team |

## Members

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/members` | Yes | List members |
| POST | `/api/members` | Yes | Invite member |
| PATCH | `/api/members` | Yes | Update member role |
| DELETE | `/api/members` | Yes | Remove member |

## Monitoring

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/monitoring` | Yes | List policies, scheduled runs, alerts |
| POST | `/api/monitoring` | Yes | Create monitoring policy |
| PATCH | `/api/monitoring` | Yes | Update monitoring policy |
| DELETE | `/api/monitoring` | Yes | Delete monitoring policy |
| POST | `/api/monitoring/execute` | Yes | Execute due policies (scheduler tick) |

## Integrations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/integrations` | Yes | List integrations (Slack, Jira, Splunk, etc.) |
| POST | `/api/integrations` | Yes | Create integration |
| PATCH | `/api/integrations` | Yes | Update integration |
| DELETE | `/api/integrations` | Yes | Delete integration |

## Audit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/audit` | Yes | Combined audit trail (scans + threats) |

## Broadcast (Echo-Sign)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/broadcast` | No | List all broadcasts |
| POST | `/api/broadcast` | Yes | Create Ed25519-signed broadcast |
| GET | `/api/broadcast/active` | No | List active (non-expired) broadcasts |
| GET | `/api/broadcast/verify/[id]` | No | Verify broadcast signature |

## Genesis Stamps

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/genesis` | Yes | Issue trust attestation stamp |
| GET | `/api/genesis` | Yes | List stamps by org/domain |
| POST | `/api/genesis/revoke` | Yes | Revoke a stamp |
| GET | `/api/genesis/verify/[stampId]` | No | Public stamp verification |
| GET | `/api/genesis/embed/[stampId]` | No | Embeddable badge HTML |

## AI Red Team & Advisor

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai-advisor` | Yes | AI security advisor with CVE/remediation DB |
| GET | `/api/ai-leaderboard` | Yes | AI model fragility leaderboard |
| POST | `/api/ai-leaderboard` | Yes | Trigger AI red-team scan cycle |
| POST | `/api/cognitive-dread?action=scan` | Yes | Omni-model stress test |
| GET | `/api/cognitive-dread` | Yes | Dread engine info/models/results/leaderboard |

## PQC & CNI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/pqc-vault` | Yes | Post-quantum crypto readiness analysis |
| GET | `/api/pqc-vault/algorithms` | Yes | List PQC + classical algorithms |
| POST | `/api/cni-sentinel` | Yes | CNI threat analysis (SCADA/ICS) |
| GET | `/api/cni-sentinel` | Yes | SCADA protocols, APT groups, STIX/IODEF reports |

## Quantum & AI Analysis

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/doom-clock` | Yes | Quantum threat doom clock calculation |
| GET | `/api/doom-clock` | Yes | Doom clock via query params |
| POST | `/api/bot-hunter` | Yes | Botnet/honeypot detection scan |
| POST | `/api/oblivion` | Yes | OBLIVION 20-tool model analysis |
| GET | `/api/oblivion` | Yes | OBLIVION engine info + tools catalog |
| POST | `/api/model-redteam` | Yes | GORGON AI red-team scan |

## Simulation & Impact

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/implosion` | Yes | Breach financial impact simulation |
| GET | `/api/implosion` | Yes | List saved scenarios |
| DELETE | `/api/implosion` | Yes | Delete scenario |
| POST | `/api/sandbox` | Yes | Send message to confused deputy sandbox |
| GET | `/api/sandbox` | Yes | List sandbox sessions |

## Non-Human Identity (NHI)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/nhi` | Yes | List machine identities |
| POST | `/api/nhi` | Yes | Scan for identities |
| POST | `/api/nhi/seed` | Yes | Seed sample identity data |
| POST | `/api/nhi/revoke` | Yes | Revoke identities |
| POST | `/api/nhi/assess` | Yes | Pre-revocation impact assessment |
| POST | `/api/nhi/rollback` | Yes | Roll back revocations |
| GET | `/api/nhi/audit` | Yes | NHI audit logs |

## Intelligence & Gamification

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exposed-assets` | Yes | Global AI exposure map (simulated) |
| GET | `/api/wall-of-shame` | Yes | Anonymized incident ticker (simulated) |
| GET | `/api/fear-index` | Yes | CISO Fear Index (simulated) |
| GET | `/api/fear-index/feed` | Yes | RSS feed of fear index |
| GET | `/api/fear-index/history` | Yes | Historical fear index trend |
| GET | `/api/hall-of-fame` | Yes | VibeSec security leaderboard |
| POST | `/api/hall-of-fame` | Yes | Submit domain for micro-scan |

## Sovereign Control

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sovereign` | No | Sovereign status/audit/access-log |
| POST | `/api/sovereign` | Yes | Execute action or dead man's switch ping |

## System Internals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/system/scan` | Yes | Internal system recon (process, network, fs, logs, registry) |
| GET | `/api/` | Yes | Hello world |

---

## Rate Limit Quick Reference

| Requests / 60s | Endpoints |
|-----------------|----------|
| 1 | `/api/nhi/seed` |
| 5 | `/api/auth/*`, `/api/scan`, `/api/vuln-scan`, `/api/bot-hunter`, `/api/hall-of-fame` POST, `/api/system/scan`, most mutations |
| 10 | `/api/broadcast` POST, `/api/scan/stream`, `/api/sovereign` POST |
| 30 | Most GET endpoints, `/api/ai-advisor`, `/api/cognitive-dread`, `/api/oblivion`, `/api/doom-clock`, `/api/cni-sentinel` |
| 60 | `/api/health` |
| None | `/api/system/health` |
