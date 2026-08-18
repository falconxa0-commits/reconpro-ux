# API Reference — ReconPro v11.0.0 Web Dashboard

Complete API reference for the ReconPro Next.js 16 web dashboard. All endpoints return JSON.

## Base URL
- Production: `https://your-domain.com`
- Development: `http://localhost:3000`

## Authentication
Include session token: `Authorization: Bearer <token>`

## Rate Limiting
100 requests/minute (configurable). Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Endpoints

### Health & System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/system` | Yes | System metrics |

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login, return session token |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/forgot-password` | No | Request password reset |

### Scanning
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/scan` | Yes | Start scan (SSE stream) |
| GET | `/api/scans` | Yes | List scans |
| GET | `/api/scans/[id]` | Yes | Scan details |

### Compliance & Monitoring
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/compliance` | Yes | SOC2/HIPAA/PCI-DSS/ISO27001/NIST/GDPR |
| GET | `/api/monitoring` | Yes | List monitoring rules |
| POST | `/api/monitoring` | Yes | Create rule |
| PUT/DELETE | `/api/monitoring/[id]` | Yes | Update/delete rule |

### Teams & Members
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/teams` | Yes | List/create teams |
| GET/POST | `/api/members` | Yes | List/add members |
| PUT/DELETE | `/api/members/[id]` | Yes | Update/remove member |

### Threat Intelligence
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/threats` | Yes | Evidence-derived threats |
| GET | `/api/exposed-assets` | Yes | Exposed asset map |

### Advanced Analysis
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/genesis` | Yes | Trust attestation |
| GET | `/api/implosion` | Yes | 20-tool breach simulation |
| GET | `/api/fear-index` | Yes | Threat fear index |
| GET | `/api/doom-clock` | Yes | Quantum threat countdown |
| GET | `/api/cni-sentinel` | Yes | SCADA/ICS monitoring |
| POST | `/api/ai-advisor` | Yes | CVE remediation |
| GET | `/api/ai-leaderboard` | Yes | Model fragility |
| GET | `/api/cognitive-dread` | Yes | Multi-model stress test |
| GET | `/api/sovereign` | Yes | Data sovereignty audit |
| GET | `/api/oblivion` | Yes | 23-stage DREAD analysis |
| GET | `/api/pqc-vault` | Yes | Post-quantum crypto status |
| POST | `/api/vuln-scan` | Yes | Vulnerability scan |
| GET | `/api/bot-hunter` | Yes | Botnet detection |
| GET | `/api/sandbox` | Yes | Code sandbox |

### NHI (Non-Human Identity)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/nhi` | Yes | List/register identities |
| GET/PUT/DELETE | `/api/nhi/[id]` | Yes | CRUD operations |
| POST | `/api/nhi/[id]/rollback` | Yes | Rollback identity |
| GET | `/api/nhi/blast-radius` | Yes | Blast radius analysis |

### Reports & Audit
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports` | Yes | Generate reports |
| GET | `/api/executive` | Yes | Executive dashboard |
| POST | `/api/broadcast` | Yes | Ed25519 broadcast |
| GET | `/api/audit` | Yes | Audit trail |

## Error Responses
```json
{"error": "Error type", "message": "Description", "code": "ERROR_CODE", "status": 400}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid input |
| 401 | UNAUTHORIZED | Missing auth |
| 403 | FORBIDDEN | Insufficient perms |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
