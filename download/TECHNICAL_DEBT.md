# ReconPro v10.0.0 — TECHNICAL DEBT REGISTER

**Version:** 10.0.0 FINAL
**Date:** 2025-07-14
**Total Items:** 10
**Estimated Total Effort:** 40-80 hours

---

## Register

### TD-01: Unused npm Packages (12+)

| Field | Value |
|-------|-------|
| **Category** | Dependency Bloat |
| **Priority** | HIGH |
| **Effort** | 2-4 hours |
| **Interest Rate** | Low (if not imported, no runtime cost) but increases security audit scope |

**Description:** 12+ packages are installed in `package.json` but never imported anywhere in the codebase. They add ~6.4MB to `node_modules` and expand the security audit surface.

**Packages:**
| Package | Est. Size | Risk if Removed |
|---------|----------|----------------|
| `uuid` | ~15KB | LOW — not imported |
| `next-intl` | ~200KB | MEDIUM — may inject Next.js plugin |
| `next-auth` | ~300KB+ | MEDIUM — may inject middleware |
| `date-fns` | ~70KB | LOW — tree-shakeable, not imported |
| `react-markdown` | ~50KB | LOW — not imported |
| `react-syntax-highlighter` | ~200KB | LOW — not imported |
| `@reactuses/core` | ~30KB | LOW — not imported |
| `@mdxeditor/editor` | ~500KB+ | LOW — not imported |
| `@dnd-kit/core` | ~30KB | LOW — not imported |
| `@dnd-kit/sortable` | ~20KB | LOW — not imported |
| `sharp` | ~5MB (native) | LOW — server-side only |
| `zod` | ~15KB | LOW — not imported (but SHOULD be used) |

**Remediation:** Remove one at a time, run `npm run build` after each removal. Priority: `@mdxeditor/editor` (500KB+), `react-syntax-highlighter` (200KB), `next-auth` (300KB, if not implementing auth).

---

### TD-02: EnterpriseSection Inline Styles

| Field | Value |
|-------|-------|
| **Category** | CSS Architecture |
| **Priority** | MEDIUM |
| **Effort** | 4-8 hours |
| **Interest Rate** | Medium — blocks CSP hardening, inconsistent with Tailwind approach |

**Description:** `EnterpriseSection.tsx` uses inline `style={{}}` objects instead of Tailwind utility classes. This is inconsistent with the rest of the application and prevents tightening the Content Security Policy (removing `unsafe-inline`).

**Impact:**
- Blocks CSP hardening (TD-08)
- Inconsistent with design system
- Harder to maintain and audit

**Remediation:** Convert all inline styles to Tailwind classes. Test all pricing cards and feature comparisons for visual regression.

---

### TD-03: Framer Motion useInView Pattern Split

| Field | Value |
|-------|-------|
| **Category** | Code Consistency |
| **Priority** | LOW |
| **Effort** | 2 hours |
| **Interest Rate** | Low — both work correctly, but cognitive overhead for maintainers |

**Description:** Two different intersection observer implementations exist:
- `FeaturesSection.tsx` and `EnterpriseSection.tsx` use framer-motion's built-in `useInView`
- `ArchitectureSection.tsx`, `ModulesSection.tsx` and others use custom `useInView` hook from `src/hooks/useInView.ts`

**Remediation:** Standardize on framer-motion's `useInView` (preferred, maintained by library). Remove custom hook. Test all animated sections.

---

### TD-04: Missing Prisma Indexes

| Field | Value |
|-------|-------|
| **Category** | Database Performance |
| **Priority** | MEDIUM |
| **Effort** | 1-2 hours |
| **Interest Rate** | High at scale — full table scans degrade linearly with data |

**Description:** Prisma schema lacks indexes on frequently queried fields.

**Required Indexes:**
```prisma
model Scan {
  domain    String   @index  // Queried by domain lookup
  status    String   @index  // Filtered by status
  // ...
}

model Threat {
  scanId    String   @index  // JOIN queries
  // ...
}

model Team {
  slug      String   @unique @index  // Lookup by slug
  // ...
}
```

**Remediation:** Add `@index` directives. Run `prisma migrate dev`. Verify query plans.

---

### TD-05: ESLint Bypass (34 Rules Disabled)

| Field | Value |
|-------|-------|
| **Category** | Code Quality |
| **Priority** | HIGH |
| **Effort** | 4-8 hours |
| **Interest Rate** | High — allows continuous accumulation of bugs and dead code |

**Description:** The ESLint configuration disables 34 rules including critical ones:

| Rule | Why It Matters |
|------|--------------|
| `no-explicit-any` | Allows untyped code to accumulate |
| `react-hooks/exhaustive-deps` | Allows stale closure bugs in useEffect |
| `@typescript-eslint/no-unused-vars` | Allows dead code accumulation (contributed to 225-line dead code in CLISection) |
| `no-console` | Allows console.log in production builds |

**Impact:** The disabled rules are directly responsible for some of the issues fixed this session (dead code, type safety violations, React hook dependency bugs).

**Remediation:** Re-enable rules in phases:
1. Phase 1: `no-explicit-any`, `@typescript-eslint/no-unused-vars` (catch existing issues)
2. Phase 2: `react-hooks/exhaustive-deps` (may reveal stale closures)
3. Phase 3: Remaining rules

Each phase requires fixing all violations before re-enabling.

---

### TD-06: Missing Zod Validation on All API Routes

| Field | Value |
|-------|-------|
| **Category** | API Quality |
| **Priority** | HIGH |
| **Effort** | 4-8 hours |
| **Interest Rate** | High — every new route is vulnerable to malformed input |

**Description:** `zod` is installed but never imported. All 47 API routes trust request input implicitly.

**Current Pattern (unsafe):**
```typescript
const { domain } = await request.json();
// domain could be anything
```

**Required Pattern:**
```typescript
import { z } from 'zod';

const ScanRequest = z.object({
  domain: z.string().regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/),
});

const body = ScanRequest.parse(await request.json());
```

**Remediation:** Create Zod schemas for all routes. Apply at route entry points. This is mechanical but time-consuming.

---

### TD-07: CSP Weakness ('unsafe-inline', 'unsafe-eval')

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | HIGH |
| **Effort** | 1-2 days |
| **Interest Rate** | High — XSS protection is effectively disabled |

**Description:** Content Security Policy includes `unsafe-inline` and `unsafe-eval`, making XSS protections ineffective.

**Root Causes:**
1. EnterpriseSection uses inline styles (TD-02)
2. Three.js may require `unsafe-eval` for shader compilation

**Remediation:**
1. Convert EnterpriseSection to Tailwind (removes `unsafe-inline` for styles)
2. Use nonce-based CSP for any remaining inline scripts
3. Test if Three.js works without `unsafe-eval` (may require `importmap` or specific R3F configuration)

---

### TD-08: In-Memory State (Broadcast Engine, Sovereign Crypto)

| Field | Value |
|-------|-------|
| **Category** | State Management |
| **Priority** | LOW (current scale) |
| **Effort** | 1-2 days |
| **Interest Rate** | High at scale — breaks with multiple instances or restarts |

**Description:**
- `broadcast-engine.ts`: Maintains subscriber list and message queue in module-level variables
- `sovereign-crypto.ts`: Maintains crypto state in module-level variables

**Impact:**
- Server restart loses all broadcast messages and subscribers
- Horizontal scaling (multiple instances) causes state inconsistency
- No persistence or recovery mechanism

**Remediation:** Move to Redis Pub/Sub for broadcast, database for sovereign state. Requires infrastructure (Redis).

---

### TD-09: Tailwind Config Content Paths

| Field | Value |
|-------|-------|
| **Category** | Build Configuration |
| **Priority** | LOW |
| **Effort** | 30 minutes |
| **Interest Rate** | Medium — may cause CSS bloat or missing styles |

**Description:** `tailwind.config.ts` content paths may be missing `src/` prefix, potentially causing Tailwind to not properly tree-shake unused utilities or scan the wrong directories.

**Remediation:** Verify and fix content paths:
```typescript
content: [
  './src/**/*.{ts,tsx}',
],
```

---

### TD-10: No Shared Domain Validation Utility

| Field | Value |
|-------|-------|
| **Category** | Security / DRY |
| **Priority** | HIGH |
| **Effort** | 2-4 hours |
| **Interest Rate** | High — every new route will likely forget validation |

**Description:** Domain validation was added to `scan/route.ts` this session but is not extracted into a shared utility. The 6 other recon routes and 5 recon libraries have no validation.

**Current State:**
- `scan/route.ts`: Has regex validation ✅
- `recon/dns/route.ts`: No validation ❌
- `recon/http/route.ts`: No validation ❌
- `recon/ssl/route.ts`: No validation ❌
- `recon/ports/route.ts`: No validation ❌
- `recon/ct-logs/route.ts`: No validation ❌
- `recon/full/route.ts`: No validation ❌

**Remediation:**
```typescript
// src/lib/validate-domain.ts
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
const BLOCKED_DOMAINS = ['localhost', '*.local', '*.internal'];

export function validateDomain(domain: string): void {
  if (!DOMAIN_REGEX.test(domain)) {
    throw new Error('Invalid domain format');
  }
  if (BLOCKED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d.replace('*.', '')))) {
    throw new Error('Internal domains are not allowed');
  }
}
```

Apply to all 7 routes and optionally to recon library functions.

---

## Summary

| ID | Debt Item | Priority | Effort | Interest Rate |
|----|-----------|----------|--------|-------------|
| TD-01 | Unused packages (12+) | HIGH | 2-4h | Low |
| TD-02 | EnterpriseSection inline styles | MEDIUM | 4-8h | Medium |
| TD-03 | useInView pattern split | LOW | 2h | Low |
| TD-04 | Missing Prisma indexes | MEDIUM | 1-2h | High at scale |
| TD-05 | ESLint bypass (34 rules) | HIGH | 4-8h | High |
| TD-06 | Missing Zod validation | HIGH | 4-8h | High |
| TD-07 | CSP weakness | HIGH | 1-2d | High |
| TD-08 | In-memory state | LOW | 1-2d | High at scale |
| TD-09 | Tailwind content paths | LOW | 30m | Medium |
| TD-10 | No shared domain validation | HIGH | 2-4h | High |

**Recommended Paydown Order:** TD-10 → TD-06 → TD-05 → TD-01 → TD-04 → TD-02 → TD-07 → TD-03 → TD-09 → TD-08

---

*Technical Debt Register: 2025-07-14 | ReconPro v10.0.0 FINAL*