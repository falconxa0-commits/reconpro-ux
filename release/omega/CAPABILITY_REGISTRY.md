# ReconPro — Capability Registry

> Complete inventory of all 32 capabilities across 3 categories.
> Generated for release audit.

---

## Summary

| Metric | Value |
|---|---|
| Total Capabilities | 32 |
| Real (Production-Ready) | 10 |
| Simulated (Honestly Labeled) | 14 |
| Hybrid (Real + Fabricated) | 8 |
| Total Routes | 44 |
| Auth-Protected Routes | 21 |
| Public Routes | 23 |
| Test Files | 23 |
| Total Tests | 638 |
| Auth Middleware | Centralized `withProtection` on all 44 routes |

---

## Real Capabilities (10)

Fully functional capabilities backed by real system calls, network APIs, or database operations.

| # | Capability | Location | Entry Point | Classification | Tests | Production Ready |
|---|---|---|---|---|---|
| 1 | DNS Reconnaissance | `src/lib/recon/dns-recon.ts` | `/api/scan` | COMPLETE | `scan-engine.test.ts` | YES (real `dns.promises`) |
| 2 | HTTP Security Analysis | `src/lib/recon/http-recon.ts` | `/api/scan` | COMPLETE | `scan-engine.test.ts` | YES (real `safeFetch`) |
| 3 | SSL/TLS Analysis | `src/lib/recon/ssl-recon.ts` | `/api/scan` | COMPLETE | `scan-engine.test.ts` | YES (real `tls.connect`) |
| 4 | Port Scanning | `src/lib/recon/port-check.ts` | `/api/scan` | COMPLETE | `scan-engine.test.ts` | YES (real `net.connect`) |
| 5 | CT Log Queries | `src/lib/recon/ct-logs.ts` | `/api/scan` | COMPLETE | `scan-engine.test.ts` | YES (real crt.sh API) |
| 6 | Bot Hunter | `src/app/api/bot-hunter/route.ts` | `/api/bot-hunter` | COMPLETE | (unit tests) | YES (real IP/HTTP probes) |
| 7 | Vulnerability Scanning | `src/app/api/vuln-scan/route.ts` | `/api/vuln-scan` | COMPLETE | (unit tests) | YES (real recon modules) |
| 8 | Organization CRUD | `src/app/api/teams/route.ts` | `/api/teams` | COMPLETE | `database-schema.test.ts` | YES (Prisma CRUD) |
| 9 | Threat Feeds | `src/app/api/threats/route.ts` | `/api/threats` | PARTIAL | (unit tests) | PARTIAL (evidence-derived, no padding) |
| 10 | NHI Management | `src/app/api/nhi/` | `/api/nhi/*` | PARTIAL | `test_stage1_nhi.py` | PARTIAL (DB CRUD real, cloud API simulated) |

---

## Simulated Capabilities (14)

All honestly labeled with `simulated: true`. No real external data — content is generated via PRNG, hardcoded values, or fabricated datasets.

| # | Capability | Location | Entry Point | Why Simulated |
|---|---|---|---|---|
| 1 | Fear Index | `src/lib/fear-index-engine.ts` | `/api/fear-index` | Seeded PRNG, no real threat data |
| 2 | Fear Index History | `src/lib/fear-index-engine.ts` | `/api/fear-index/history` | Generated from PRNG |
| 3 | Fear Index Feed | `src/lib/fear-index-engine.ts` | `/api/fear-index/feed` | Fabricated RSS entries |
| 4 | Wall of Shame | `src/app/api/wall-of-shame/route.ts` | `/api/wall-of-shame` | Mulberry32 PRNG fake incidents |
| 5 | AI Leaderboard | `src/app/api/ai-leaderboard/route.ts` | `/api/ai-leaderboard` | Explicit `SIMULATED_DATA` constant |
| 6 | Cognitive Dread | `src/app/api/cognitive-dread/route.ts` | `/api/cognitive-dread` | `seededRandom()` fake test results |
| 7 | Exposed Assets | `src/app/api/exposed-assets/route.ts` | `/api/exposed-assets` | Hardcoded multiplier "simulated" |
| 8 | Sandbox | `src/app/api/sandbox/route.ts` | `/api/sandbox` | Self-admits "simulated response" |
| 9 | Doom Clock | `src/lib/quantum-doom-engine.ts` | `/api/doom-clock` | Static NIST timeline calculator |
| 10 | CNI Sentinel | `src/lib/cni-sentinel-engine.ts` | `/api/cni-sentinel` | Static SCADA protocol database |
| 11 | PQC Vault | `src/lib/pqc-vault-engine.ts` | `/api/pqc-vault` | Static PQC algorithm database |
| 12 | Oblivion | `src/app/api/oblivion/route.ts` | `/api/oblivion` | Returns zeros/fabricated data |
| 13 | Sovereign Execution | `src/app/api/sovereign/route.ts` | `/api/sovereign` POST | In-memory counters, simulated results |
| 14 | Broadcast Content | `src/lib/broadcast-engine.ts` | `/api/broadcast` | `seedDemoBroadcasts` fabricated data |

---

## Hybrid Capabilities (8)

Real cryptographic operations or infrastructure paired with fabricated or heuristic-derived data.

| # | Capability | Real Part | Fake Part |
|---|---|---|---|
| 1 | Sovereign Crypto | Ed25519 signing via `tweetnacl` | Demo action log via `seedDemoActions()` |
| 2 | Broadcast Signing | Ed25519 broadcast signatures | Content from `seedDemoBroadcasts()` |
| 3 | Genesis Crypto | Ed25519 attestation + SHA-256 | Fabricated certification concept |
| 4 | Implosion Engine | Mathematical breach cost model | IBM statistics + multipliers, no real data |
| 5 | AI Advisor | Structured CVE knowledge base | Hardcoded attack paths, not AI-powered |
| 6 | Scan Stream | Rate limiting + SSRF checks | Pre-programmed SSE phases (`setTimeout`) |
| 7 | NHI GET | Real Prisma queries | Hardcoded org fallback |
| 8 | Hall of Fame POST | Real DB writes | Domain scoring uses heuristic rules |

---

## Authentication Posture

- **All 44 routes** use centralized `withProtection` middleware.
- **21 routes** require authentication (protected behind auth gate).
- **23 routes** are publicly accessible (pass through `withProtection` without auth check).

## Test Coverage

- **23 test files** covering the full capability surface.
- **638 tests** in total.
- Core recon capabilities (DNS, HTTP, SSL/TLS, Port, CT Logs) tested via `scan-engine.test.ts`.
- Database layer verified via `database-schema.test.ts`.
- NHI module verified via `test_stage1_nhi.py`.
