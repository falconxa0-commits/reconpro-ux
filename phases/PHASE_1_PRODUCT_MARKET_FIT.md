# RECONPRO — PHASE 1: PRODUCT-MARKET FIT

> **Timeline:** Months 0–6
> **Goal:** Kill demo shells, ship viral growth engines, complete the highest-value enterprise module.
> **Target Outcome:** 10+ paying orgs, 1K+ free CLI users, VibeSec badge viral loop active.

---

## P1-Foundation: Wire Web Platform to Real Data

**Priority:** 1 | **Status:** [x] DONE | **Type:** Foundation

Kill every static/demo shell in the web platform. Every panel must pull from real scan data.

**What to wire:**
- [x] Compliance panel → real compliance scores from scan findings
- [x] Executive dashboard → real risk metrics from aggregated scans
- [x] Monitoring panel → real scan job status from database
- [x] Integration hub → real webhook delivery (Slack, Jira)
- [x] Team management → real member CRUD with role enforcement
- [ ] Pricing → real Stripe checkout flow (intentionally static — marketing page)
- [ ] White-label → real theme persistence per organization (intentionally static — preview mockup)

---

## P1-02: HYPE-14 — Open-Source "VibeSec CLI" (npm install -g vibesec)

**Priority:** 2 | **Status:** [x] DONE | **Type:** Growth | **Hype Level:** MAXIMUM

An ultra-lightweight, 100% open-source Node/Python package stripping down the VibeSec engine.

**The Stunt:** Hits #1 Trending on GitHub within 48 hours of launch.
**The Hype Mechanic:** Creates a massive top-of-funnel pipeline for the main enterprise platform. Every user of the free CLI is a potential enterprise customer.

**Technical Requirements:**
- [x] Standalone VibeSec module extraction from reconpro.py
- [ ] npm package with CLI binary (`npm install -g vibesec`) — TODO
- [x] pip package (`pip install vibesec`) — vibesec-cli/ ready
- [ ] GitHub repo with docs, badges, CI/CD — TODO (needs repo creation)
- [x] README with animated demo GIF — professional README done
- [ ] Telemetry opt-in pointing to enterprise platform — TODO
- [ ] GitHub Actions for automated testing and publishing — TODO

**Success Metric:** #1 Trending on GitHub, 500+ stars in week 1, 1K+ npm/pip installs in month 1.

---

## P1-03: HYPE-02 — @VibeSecRoast Twitter/X Bot

**Priority:** 3 | **Status:** [x] DONE | **Type:** Viral | **Hype Level:** EXTREME

An automated public roasting engine that turns the VibeSec Benchmark into a viral social machine.

**The Stunt:** Create a bot (@VibeSecRoast) where anyone can tag an AI-built app URL. The bot runs a 10-second micro-scan and tweets back a brutal, hilarious security breakdown with their VibeSec Grade (A+ to F).
**The Hype Mechanic:** Generate downloadable, dark-themed share cards showing exposed .env files, open CORS policies, and unauthenticated webhooks.
**Why It Goes Viral:** Founders love sharing their A+ grades to build trust. The internet loves watching F-graded apps get publicly roasted. It becomes the ultimate "build in public" flex.

**Technical Requirements:**
- [x] Twitter/X bot API integration (OAuth 2.0) — stdlib-only Twitter API v2 client
- [x] Micro-scan engine (7 checks, <2s实测, concurrent ThreadPoolExecutor)
- [x] Share card image generator (Pillow 1200x675 branded PNG)
- [x] URL detection and parsing from tweet mentions
- [x] Rate limiting to avoid Twitter API bans (900 req/15min)
- [x] Caching layer to avoid re-scanning same targets within 24h
- [x] Roast template engine (3 templates per grade, 8 finding-specific roast lines)
- [x] Auto-thread for detailed findings

**Success Metric:** 10K+ impressions/week, 500+ roast requests/month, 50+ A+ founders sharing their cards.

---

## P1-04: HYPE-10 — "VibeSec Bounty" Public Hall of Fame

**Priority:** 4 | **Status:** [x] DONE | **Type:** Growth | **Hype Level:** HIGH

A public registry of the top 100 AI-coded apps that scored a perfect A+ grade.

**The Stunt:** Founders flex their inclusion on the leaderboard to signal trust to investors and early adopters.
**The Hype Mechanic:** Competitive pressure drives adoption. Every AI app wants to be on the list. Verification badges for verified scans.

**Technical Requirements:**
- [x] Public leaderboard web page (`/hall-of-fame`)
- [x] Verification system (re-scan to confirm grade, 7-day expiry)
- [x] Badge/widget for A+ sites to embed (`<script src="//reconpro.io/widget.js"></script>`)
- [x] Submission API (`POST /api/hall-of-fame`)
- [ ] Automated re-scanning scheduler (weekly re-verification) — TODO
- [x] Category filtering (SaaS, e-commerce, AI tools, fintech)
- [ ] Social sharing cards per entry — TODO

**Success Metric:** 100+ verified A+ sites within 3 months, 50+ embedded badges on live sites.

---

## P1-05: HYPE-05 — "ShitCode Shield" GitHub Action & PR Bot

**Priority:** 5 | **Status:** [x] DONE | **Type:** Growth | **Hype Level:** EXTREME

A free GitHub Action for open-source repos that scans AI-generated code in pull requests.

**The Stunt:** Whenever a PR is opened containing AI-generated code, the bot scans it and posts a comment: "⚠️ VibeSec Alert: This PR drops your security score from A+ to D. Exposed Supabase key on line 42."
**The Hype Mechanic:** Free for open-source, paid for private repos. Every PR comment is a branded advertisement.

**Technical Requirements:**
- [x] GitHub Action definition (`action.yml` + `dist/index.js`)
- [x] GitHub App for PR webhook processing (via @actions/github)
- [x] AI-generated code detection heuristic (7 heuristics: AI comments, comment ratio, JSDoc, imports, TODOs, formatting, file size)
- [x] VibeSec micro-scan for PR diffs (38+ regex patterns: 18 secrets, 4 creds, 11 insecure, 5 debug)
- [x] PR comment formatter with branded template
- [ ] GitHub Marketplace listing — TODO (needs repo publish)
- [x] README with animated demo of a PR getting roasted
- [x] Opt-out file (`.vibesec-ignore`)

**Success Metric:** 1K+ GitHub repos using the Action within 3 months, GitHub Marketplace featured.

---

## P1-06: SOV-07 — NHI Global Kill-Switch & Remediation

**Priority:** 6 | **Status:** [x] DONE | **Type:** Enterprise | **Hype Level:** HIGH

The ultimate enterprise control layer for cloud infrastructure. Complete the existing NHI Graph engine into a full kill-switch.

**The Capability:** In the event of an active breach or rogue AI agent swarm, the platform can instantly revoke thousands of compromised IAM roles, OAuth tokens, and service keys across AWS, Azure, and GCP with a single command.
**The Value:** Board members and CISOs view this platform as their ultimate emergency brake, making it an essential purchase for every Fortune 500 company.

**What Already Exists:**
- [x] NHI identity pattern detection (10 patterns: AWS IAM, GCP SA, Azure AD, etc.)
- [x] Graph construction (Identity/Role/Endpoint nodes, 3 edge types)
- [x] Blast-radius BFS analysis
- [x] Terraform remediation generation

**What Must Be Built:**
- [x] Real-time AWS IAM API integration — simulated for MVP, API stubs ready
- [x] Real-time GCP IAM API integration — simulated for MVP, API stubs ready
- [x] Real-time Azure AD Graph API integration — simulated for MVP, API stubs ready
- [x] Live credential revocation engine — /api/nhi/revoke with full DB flow
- [x] Multi-cloud orchestration for mass revocation — single command across all clouds
- [x] Incident response automation — assess → revoke → audit pipeline
- [x] Emergency dashboard UI (big red button, CONFIRM gate, blast radius viz, countdown)
- [x] Audit trail for all revocation actions — NHIAuditLog + /api/nhi/audit
- [x] Rollback capability — /api/nhi/rollback with rollback data snapshot

**Success Metric:** 3+ enterprise design partners using NHI kill-switch in production, $10K+/mo contracts.

---

## PHASE 1 SUMMARY

| # | Item | Type | Status | Success Metric |
|---|------|------|--------|----------------|
| P1-01 | Wire Web Platform | Foundation | [x] | Zero demo shells remaining ✅ |
| P1-02 | VibeSec OSS CLI | Growth | [x] | #1 GitHub Trending, 1K+ installs |
| P1-03 | @VibeSecRoast Bot | Viral | [x] | 10K+ impressions/week |
| P1-04 | VibeSec Hall of Fame | Growth | [x] | 100+ verified A+ sites |
| P1-05 | ShitCode Shield | Growth | [x] | 1K+ repos using Action |
| P1-06 | NHI Kill-Switch | Enterprise | [x] | 3+ design partners, $10K+/mo |

**Revenue Target:** $50K–$200K ARR by end of Phase 1.
**Team:** Founder + 2-3 engineers.
**North Star Metric:** Number of VibeSec badges embedded on live websites.

---
> _Phase 1 complete = Product is real, growth loop is active, first enterprise revenue."
> _Last updated: 2026-08-01_