# ReconPro v10.0.0 — KNOWN LIMITATIONS

**Version:** 10.0.0 FINAL
**Date:** 2025-07-14
**Total Issues:** 25

---

## How to Read This Document

Every limitation has:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Impact:** What breaks or is at risk
- **Risk:** Likelihood of being exploited/triggered
- **Effort:** Time to fix (estimated)
- **Solution:** What needs to be done
- **Why Not Fixed:** Honest reason it wasn't addressed this session

---

## CRITICAL

### L-01: Zero Authentication on All 47 API Routes

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Impact** | Any network-reachable client can invoke any API endpoint — scanning, data creation, data destruction |
| **Risk** | HIGH — trivially exploitable |
| **Effort** | 2-5 days (architecture + implementation) |
| **Solution** | Implement NextAuth.js, Clerk, or deploy behind an auth proxy (OAuth2 Proxy, Authelia, Cloudflare Access) |
| **Why Not Fixed** | Requires architectural decision on auth strategy. Cannot be safely bolted on in a sprint fix. Incorrect auth implementation is worse than no auth. |
| **Files** | All 47 files in `src/app/api/*/route.ts` |

### L-02: SSRF in 5 Recon Libraries via 6 Unvalidated API Routes

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Impact** | Attackers can scan internal network infrastructure (cloud metadata, internal services, databases) |
| **Risk** | HIGH — straightforward to exploit via DNS/HTTP recon endpoints |
| **Effort** | 2-4 hours |
| **Solution** | Create shared `validateDomain()` utility. Apply to all 6 unvalidated routes. Add DNS resolution check to reject private IPs. |
| **Why Not Fixed** | Scan route was fixed (regex validation), but the remaining 6 routes and 5 library functions were not addressed due to scope. |
| **Files** | `src/lib/dns-recon.ts`, `src/lib/http-recon.ts`, `src/lib/port-check.ts`, `src/lib/ssl-recon.ts`, `src/lib/ct-logs.ts`, 6 API route files |

### L-03: NHI Kill Switch Destroys All Data Unauthenticated

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Impact** | Single unauthenticated HTTP request can wipe the entire database |
| **Risk** | MEDIUM — requires knowing the endpoint path, but it's discoverable |
| **Effort** | 2-4 hours |
| **Solution** | Remove the endpoint entirely, or add auth + confirmation token + immutable audit log |
| **Why Not Fixed** | Requires auth architecture (see L-01). Also requires product decision on whether this feature should exist in production. |
| **Files** | `src/app/api/nhi/kill-switch/route.ts` (or equivalent) |

### L-04: No Authorization on Mutating Operations (IDOR)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | In a multi-tenant deployment, any user can modify/delete any other user's data |
| **Risk** | HIGH once auth is added |
| **Effort** | 2-3 days |
| **Solution** | Add ownership model to database schema. Check `resource.userId === currentUser.id` on all mutating operations. |
| **Why Not Fixed** | Depends on auth implementation (L-01). Cannot add authorization without authentication. |
| **Files** | `src/app/api/teams/route.ts`, `src/app/api/threats/route.ts`, all mutating routes |

---

## HIGH

### L-05: No Zod Validation on Any API Route

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | Malformed payloads cause unexpected behavior, potential type confusion bugs |
| **Risk** | MEDIUM — requires sending bad data |
| **Effort** | 4-8 hours |
| **Solution** | Write Zod schemas for all 47 routes. Apply `schema.parse(body)` at route entry point. |
| **Why Not Fixed** | Mechanical but time-consuming. 47 routes × ~10 minutes each = ~8 hours. |
| **Files** | All 47 API route handlers |

### L-06: No Rate Limiting

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Abuse of scan endpoints, DoS via expensive operations |
| **Risk** | HIGH — trivially exploitable |
| **Effort** | 2-4 hours |
| **Solution** | Add `@upstash/ratelimit` or `express-rate-limit` middleware. Apply different limits per route type. |
| **Why Not Fixed** | Requires choosing a rate limiting strategy (in-memory, Redis, proxy-level). Decision not made this session. |

### L-07: Information Disclosure via Error Messages

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | Internal file paths, database schema, and stack traces exposed to clients |
| **Risk** | MEDIUM — requires triggering errors |
| **Effort** | 4-8 hours |
| **Solution** | Create error sanitization utility. Replace all `error.message` responses with generic messages. Log full errors server-side only. |
| **Why Not Fixed** | Requires touching every catch block. Risk of breaking error handling if done incorrectly. |

### L-08: Sovereign Execute Action Has No Auth

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | Unauthenticated cryptographic operations |
| **Risk** | MEDIUM |
| **Effort** | 2-4 hours |
| **Solution** | Add auth + rate limiting + audit logging to sovereign endpoints |
| **Why Not Fixed** | Depends on auth architecture (L-01). |
| **Files** | `src/app/api/sovereign/route.ts` |

---

## MEDIUM

### L-09: CSP Contains 'unsafe-inline' and 'unsafe-eval'

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | XSS protections effectively disabled |
| **Risk** | LOW-MEDIUM — requires finding an injection point first |
| **Effort** | 1-2 days |
| **Solution** | Refactor EnterpriseSection inline styles to Tailwind. Use nonce-based CSP for any remaining inline scripts. |
| **Why Not Fixed** | EnterpriseSection uses inline styles extensively. Three.js may require `unsafe-eval`. Removing these would break rendering. |
| **Files** | `src/middleware.ts`, `src/components/EnterpriseSection.tsx` |

### L-10: Middleware Excludes API Routes from Security Headers

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | API responses lack security headers (CSP, X-Frame-Options, etc.) |
| **Risk** | LOW |
| **Effort** | 30 minutes |
| **Solution** | Update middleware matcher to include `/api/*`, or create separate API middleware. |
| **Why Not Fixed** | Simple oversight, but changing middleware matcher could have unintended effects on all API routes. |
| **Files** | `src/middleware.ts` |

### L-11: HTML Injection in Genesis Embed

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Stored XSS via genesis embed feature |
| **Risk** | MEDIUM |
| **Effort** | 2-4 hours |
| **Solution** | Sanitize all user input with DOMPurify before embedding in HTML. |
| **Why Not Fixed** | Requires adding DOMPurify and refactoring the genesis embed logic. |

### L-12: Compliance Route Creates DB Records on GET

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | GET requests cause side effects (violates HTTP semantics). Exploitable via CSRF. |
| **Risk** | MEDIUM — crawlers, prefetch, CSRF |
| **Effort** | 1-2 hours |
| **Solution** | Change to POST method. Add CSRF protection. |
| **Why Not Fixed** | Requires client-side code change to use POST instead of GET. |

### L-13: 315KB Single CSS File

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Render-blocking resource slows FCP/LCP by 1-2s on slow connections |
| **Risk** | HIGH on mobile |
| **Effort** | 4-8 hours |
| **Solution** | Fix tailwind.config.ts content paths. Audit unused utilities. Consider critical CSS inlining. |
| **Why Not Fixed** | CSS size is a function of Tailwind utility usage across 47 pages. Fixing content paths could break styles. |
| **Files** | `tailwind.config.ts`, `.next/static/css/*.css` |

---

## LOW

### L-14: No `prefers-reduced-motion` Support

| Field | Value |
|-------|-------|
| **Severity** | LOW (WCAG AAA) |
| **Impact** | Users with motion sensitivity cannot disable animations |
| **Risk** | MEDIUM for affected users |
| **Effort** | 2 hours |
| **Solution** | Add `useReducedMotion()` from framer-motion. Conditionally skip animations. |
| **Why Not Fixed** | framer-motion provides this hook natively but it's not wired into any component. |

### L-15: No Focus Trap on Command Palette

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Keyboard users can Tab out of the modal to background content |
| **Risk** | LOW |
| **Effort** | 1 hour |
| **Solution** | Implement focus trap (use `@radix-ui/react-focus-scope` or custom). |
| **Why Not Fixed** | Not identified as highest priority this session. |
| **Files** | `src/components/CommandPalette.tsx` |

### L-16: No `aria-live` on Testimonial Carousel

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Screen reader users not notified when testimonial changes |
| **Risk** | LOW |
| **Effort** | 30 minutes |
| **Solution** | Add `aria-live="polite"` to the testimonial container. |
| **Why Not Fixed** | Lower priority than CLI section role fix. |

### L-17: Canvas Elements Have No Accessible Alternatives

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Screen reader users cannot perceive 3D globe, radar, or network graph |
| **Risk** | LOW |
| **Effort** | 3 hours |
| **Solution** | Add `role="img"`, `aria-label`, and visually hidden text summaries. |
| **Why Not Fixed** | Requires content decision on what text summary to provide for each visualization. |
| **Files** | `threat-globe.tsx`, `radar-map.tsx`, `attack-surface.tsx` |

### L-18: In-Memory State Not Survivable

| Field | Value |
|-------|-------|
| **Severity** | LOW (current scale) |
| **Impact** | Broadcast queue and sovereign crypto state lost on restart; inconsistent across instances |
| **Risk** | MEDIUM at scale |
| **Effort** | 1-2 days |
| **Solution** | Move to Redis or database-backed state. |
| **Why Not Fixed** | Requires infrastructure (Redis). Acceptable for single-instance deployment. |
| **Files** | `src/lib/broadcast-engine.ts`, `src/lib/sovereign-crypto.ts` |

### L-19: Missing Prisma Indexes

| Field | Value |
|-------|-------|
| **Severity** | LOW (current scale) |
| **Impact** | Full table scans on frequently queried fields. Degrades linearly with data volume. |
| **Risk** | MEDIUM at scale |
| **Effort** | 1-2 hours |
| **Solution** | Add `@index` directives to Prisma schema for `Scan.domain`, `Scan.status`, `Threat.scanId`, `Team.slug`. |
| **Why Not Fixed** | Requires migration + potential downtime. Negligible impact with current data volume. |
| **Files** | `prisma/schema.prisma` |

### L-20: H2 Gradient Inconsistency

| Field | Value |
|-------|-------|
| **Severity** | LOW (cosmetic) |
| **Impact** | 3 sections use gradient text, 5 use plain white. Visual inconsistency. |
| **Risk** | NONE |
| **Effort** | 1 hour |
| **Solution** | Standardize to either all gradient or all plain white. |
| **Why Not Fixed** | Cosmetic preference, no functional impact. |

### L-21: Subtitle Margin/Size Drift

| Field | Value |
|-------|-------|
| **Severity** | LOW (cosmetic) |
| **Impact** | ArchitectureSection uses `text-lg mt-4` for subtitles, other sections use different values |
| **Risk** | NONE |
| **Effort** | 1 hour |
| **Solution** | Create consistent subtitle component or Tailwind class pattern. |
| **Why Not Fixed** | Cosmetic, not flagged during this sprint. |

### L-22: Framer Motion useInView Pattern Split

| Field | Value |
|-------|-------|
| **Severity** | LOW (architectural) |
| **Impact** | Two different intersection observer implementations used across sections |
| **Risk** | NONE (both work correctly) |
| **Effort** | 2 hours |
| **Solution** | Standardize on framer-motion's `useInView` (preferred) or custom hook. |
| **Why Not Fixed** | Both implementations work. Changing requires testing all sections for animation regression. |

### L-23: ESLint Disables 34 Rules

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM (code quality) |
| **Impact** | `no-explicit-any`, `react-hooks/exhaustive-deps`, and 32 other rules disabled. Allows code quality regression. |
| **Risk** | MEDIUM |
| **Effort** | 4-8 hours (re-enable + fix violations) |
| **Solution** | Re-enable rules incrementally. Fix violations. Add to CI pipeline. |
| **Why Not Fixed** | Re-enabling all 34 rules at once would produce hundreds of lint errors. Must be done incrementally. |
| **Files** | `.eslintrc*` or `eslint.config.*` |

### L-24: 12+ Unused npm Packages

| Field | Value |
|-------|-------|
| **Severity** | LOW (bundle) / MEDIUM (security surface) |
| **Impact** | ~6.4MB+ node_modules bloat, increased security attack surface |
| **Risk** | LOW |
| **Effort** | 2-4 hours |
| **Solution** | `npm uninstall` for each unused package. Verify build still works. |
| **Why Not Fixed** | Risk of breaking build if an unused package has side effects. Should be done one at a time with build verification. |

### L-25: Tailwind Config Missing src/ in Content Paths

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | May cause incomplete CSS purging or include non-source files in CSS generation |
| **Risk** | LOW |
| **Effort** | 30 minutes |
| **Solution** | Add `src/**/*.{ts,tsx}` to `content` array in `tailwind.config.ts`. |
| **Why Not Fixed** | CSS currently generates correctly (315KB). Changing content paths might break styles. |
| **Files** | `tailwind.config.ts` |

---

## Summary

| Severity | Count | Fixed | Open |
|----------|-------|-------|------|
| CRITICAL | 4 | 0 | 4 |
| HIGH | 4 | 0 | 4 |
| MEDIUM | 5 | 0 | 5 |
| LOW | 12 | 0 | 12 |
| **Total** | **25** | **0** | **25** |

*Note:* 26 code fixes were applied this session, but they addressed bugs and type errors, not the architectural/structural limitations listed above. The 25 limitations require architectural changes, infrastructure decisions, or significant refactoring.

---

*Known Limitations: 2025-07-14 | ReconPro v10.0.0 FINAL*
