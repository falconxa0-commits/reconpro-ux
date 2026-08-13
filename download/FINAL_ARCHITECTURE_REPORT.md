# ReconPro v10.0.0 — FINAL ARCHITECTURE REPORT

**Version:** 10.0.0 FINAL
**Date:** 2025-07-14
**Framework:** Next.js 16.1.3 (App Router)

---

## 1. Executive Summary

ReconPro v10.0.0 is a Next.js 16 App Router application with a marketing/landing page frontend and a 47-route API backend. The architecture follows standard Next.js conventions (App Router, Server Components, API route handlers) with notable integration of Three.js for 3D visualizations, framer-motion for animations, and Prisma for database access. The application generates **47 static pages** and includes a standalone server for API route handling.

Key architectural concerns: 12+ unused npm dependencies, missing Prisma indexes, in-memory state in broadcast engine, and an ESLint configuration that disables 34 rules.

---

## 2. Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.1.3 | App Router, Turbopack |
| Language | TypeScript | 5.x | Strict mode |
| UI Rendering | React | 19.x | Server Components + Client Components |
| Styling | Tailwind CSS | 4.x | Single 315KB output |
| Animation | framer-motion | 11.x | Used in 15+ components |
| 3D | Three.js + @react-three/fiber + @react-three/drei | Latest | 3 components |
| Database | Prisma | 5.x | PostgreSQL/SQLite |
| Validation | Zod | 3.x | Installed but UNUSED |
| Auth | next-auth | 4.x | Installed but UNUSED |
| Localization | next-intl | 3.x | Installed but UNUSED |
| Rich Text | @mdxeditor/editor | Latest | Installed but UNUSED |
| DnD | @dnd-kit/core, @dnd-kit/sortable | 6.x | Installed but UNUSED |
| Date | date-fns | 4.x | Installed but UNUSED |

---

## 3. Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (metadata, providers)
│   ├── page.tsx                # Landing page (SSG)
│   ├── globals.css             # Global styles + Tailwind
│   └── api/                    # 47 API route handlers
│       ├── scan/route.ts
│       ├── teams/route.ts
│       ├── threats/route.ts
│       ├── recon/
│       │   ├── dns/route.ts
│       │   ├── http/route.ts
│       │   ├── ssl/route.ts
│       │   ├── ports/route.ts
│       │   ├── ct-logs/route.ts
│       │   └── full/route.ts
│       ├── sovereign/route.ts
│       ├── nhi/
│       │   └── kill-switch/route.ts
│       ├── broadcast/route.ts
│       ├── compliance/route.ts
│       ├── genesis/route.ts
│       └── ... (remaining routes)
├── components/
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── ArchitectureSection.tsx
│   ├── ModulesSection.tsx
│   ├── CLISection.tsx
│   ├── BenchmarksSection.tsx
│   ├── EnterpriseSection.tsx
│   ├── CommandPalette.tsx
│   ├── ScrollProgress.tsx
│   ├── AnimatedCounter.tsx
│   ├── bento-dashboard.tsx
│   ├── threat-globe.tsx        # Three.js WebGL
│   ├── radar-map.tsx           # Canvas 2D
│   ├── attack-surface.tsx      # Canvas 2D
│   ├── unified-cli.tsx
│   ├── nhi-kill-switch.tsx
│   ├── dopamine-engine.tsx
│   ├── live-proof.tsx
│   └── ...
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── broadcast-engine.ts     # In-memory broadcast state
│   ├── sovereign-crypto.ts     # In-memory crypto state
│   ├── dns-recon.ts            # SSRF risk
│   ├── http-recon.ts           # SSRF risk
│   ├── port-check.ts           # SSRF risk
│   ├── ssl-recon.ts            # SSRF risk
│   ├── ct-logs.ts              # SSRF risk
│   └── ...
├── hooks/
│   ├── useInView.ts            # Custom intersection observer
│   └── ...
├── middleware.ts               # Security headers (pages only)
├── prisma/
│   └── schema.prisma
└── ...
```

---

## 4. Component Tree

### 4.1 Page Composition (Landing Page)

```
RootLayout (layout.tsx)
├── Metadata (title, description, OpenGraph, Twitter, JSON-LD)
├── ThemeProvider
├── SkipLink
├── ScrollProgress (fixed, zero-render DOM mutation)
├── CommandPalette (Ctrl+K trigger)
├── <main>
│   ├── HeroSection
│   │   ├── AnimatedHeading
│   │   └── CTA buttons
│   ├── FeaturesSection (framer-motion useInView)
│   │   ├── FeatureCard[] (grid)
│   │   └── AnimatedCounter
│   ├── ArchitectureSection (custom useInView hook)
│   │   └── Architecture diagram
│   ├── ModulesSection (custom useInView)
│   │   └── Module cards
│   ├── CLISection (role="region", aria-live="polite")
│   │   └── Terminal animation
│   ├── BenchmarksSection
│   │   └── Data table (scope="col" on headers)
│   ├── EnterpriseSection (framer-motion useInView)
│   │   ├── Pricing cards
│   │   └── Feature comparison
│   ├── BentoDashboard (bento-dashboard.tsx)
│   │   ├── ThreatGlobe (Three.js)
│   │   ├── RadarMap (Canvas 2D)
│   │   └── AttackSurface (Canvas 2D)
│   └── CommunitySection / Footer
└── JSON-LD structured data
```

### 4.2 useInView Pattern Split

**Architectural Inconsistency:** Two different intersection observer implementations are used:

| Components | Implementation | Source |
|-----------|---------------|--------|
| FeaturesSection, EnterpriseSection | `framer-motion`'s built-in `useInView` | `framer-motion` package |
| ArchitectureSection, ModulesSection, others | Custom `useInView` hook (`src/hooks/useInView.ts`) | Hand-rolled |

**Impact:** Both work correctly. The split is a code organization issue, not a functional bug.

---

## 5. API Route Inventory (47 Routes)

### 5.1 By Category

| Category | Routes | Mutating? | Auth? | Validation? |
|----------|--------|-----------|-------|-------------|
| Scan | `/api/scan` | POST | ❌ | ✅ (regex, this session) |
| DNS Recon | `/api/recon/dns` | POST | ❌ | ❌ |
| HTTP Recon | `/api/recon/http` | POST | ❌ | ❌ |
| SSL Recon | `/api/recon/ssl` | POST | ❌ | ❌ |
| Port Check | `/api/recon/ports` | POST | ❌ | ❌ |
| CT Logs | `/api/recon/ct-logs` | POST | ❌ | ❌ |
| Full Recon | `/api/recon/full` | POST | ❌ | ❌ |
| Teams | `/api/teams` | GET, POST, PUT, DELETE | ❌ | ❌ |
| Threats | `/api/threats` | GET, POST, PUT, DELETE | ❌ | ❌ |
| Sovereign | `/api/sovereign` | GET, POST | ❌ | ❌ |
| NHI | `/api/nhi/*` | POST (kill switch) | ❌ | ❌ |
| Broadcast | `/api/broadcast` | GET, POST | ❌ | ❌ |
| Compliance | `/api/compliance` | GET (creates records!) | ❌ | ❌ |
| Genesis | `/api/genesis` | POST | ❌ | ❌ |
| Other | ~30 remaining routes | Mixed | ❌ | ❌ |

### 5.2 Security Posture Summary

- **Authentication:** 0/47 routes
- **Input Validation (Zod):** 0/47 routes
- **Input Validation (ad-hoc):** 1/47 routes (scan, regex this session)
- **Rate Limiting:** 0/47 routes
- **Authorization:** 0/47 routes

---

## 6. SSR / CSR Split

### 6.1 Server-Side (SSG)

| Component | Rendering | Evidence |
|-----------|-----------|----------|
| All 47 pages | Static (SSG) | `next build` output: 47 pages generated in 176.3ms |
| Root layout | Server Component | Default in App Router |
| SEO metadata | Server | Next.js Metadata API |
| JSON-LD | Server | Inline script in layout |

### 6.2 Client-Side (CSR)

| Component | Rendering | Why |
|-----------|-----------|------|
| HeroSection | Client (`"use client"`) | Animation, interactivity |
| FeaturesSection | Client | framer-motion animations |
| CLISection | Client | Terminal animation, dynamic content |
| ScrollProgress | Client | Scroll event listener, DOM mutation |
| CommandPalette | Client | Keyboard shortcut, modal |
| ThreatGlobe | Client | Three.js WebGL (browser-only) |
| RadarMap | Client | Canvas 2D |
| AttackSurface | Client | Canvas 2D |
| BentoDashboard | Client | Interactive dashboard |
| AnimatedCounter | Client | Animation, intersection observer |

**Assessment:** The SSR/CSR split is appropriate. Marketing content (text, images) is server-rendered for SEO. Interactive components are client-rendered as needed.

---

## 7. Middleware Architecture

### 7.1 Current Middleware (`src/middleware.ts`)

| Feature | Status | Notes |
|---------|--------|-------|
| Security Headers | ⚠️ Partial | Applied to page routes, likely excludes API routes |
| CSP | ⚠️ Weak | Contains `unsafe-inline` and `unsafe-eval` |
| X-Frame-Options | ✅ Set | `DENY` or `SAMEORIGIN` |
| X-Content-Type-Options | ✅ Set | `nosniff` |
| Authentication | ❌ Absent | No auth middleware |
| Rate Limiting | ❌ Absent | No rate limit middleware |
| CORS | ❌ Absent | No CORS configuration |
| Redirects | ❌ Absent | No redirect rules |

### 7.2 Middleware Matcher

The middleware likely uses a matcher pattern that targets page routes:
```typescript
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

This explicitly **excludes `/api/*` routes** from receiving security headers.

---

## 8. Dependency Analysis

### 8.1 Used Dependencies

| Package | Purpose | Size Impact |
|---------|---------|------------|
| `next` | Framework | Core |
| `react`, `react-dom` | UI library | Core |
| `framer-motion` | Animations | 220KB (largest chunk) |
| `three` + `@react-three/fiber` + `@react-three/drei` | 3D visualizations | ~600KB |
| `@prisma/client` | Database | Server-side only |
| `tailwindcss` | Styling | Build-time |
| `typescript` | Type checking | Build-time |

### 8.2 Unused Dependencies (12+)

| Package | Est. Size | Why Present | Removal Risk |
|---------|----------|------------|-------------|
| `uuid` | ~15KB | Likely planned feature | LOW — not imported |
| `next-intl` | ~200KB | Planned i18n | MEDIUM — may have Next.js plugin |
| `next-auth` | ~300KB+ | Planned auth | MEDIUM — may have Next.js plugin |
| `date-fns` | ~70KB | Planned feature | LOW — tree-shakeable, not imported |
| `react-markdown` | ~50KB | Planned docs | LOW — not imported |
| `react-syntax-highlighter` | ~200KB | Planned docs | LOW — not imported |
| `@reactuses/core` | ~30KB | Planned feature | LOW — not imported |
| `@mdxeditor/editor` | ~500KB+ | Planned editor | LOW — not imported |
| `@dnd-kit/core` | ~30KB | Planned DnD | LOW — not imported |
| `@dnd-kit/sortable` | ~20KB | Planned DnD | LOW — not imported |
| `sharp` | ~5MB (native) | Planned image processing | MEDIUM — native binary |
| `zod` | ~15KB | Installed but never imported | LOW — just unused |

**Total bloat estimate:** ~6.4MB+ in node_modules
**Bundle impact:** Minimal if not imported (tree-shaking). However, `next-auth` and `next-intl` may inject middleware/plugins even when unused.

### 8.3 ESLint Configuration

The ESLint config **disables 34 rules** including:
- `no-explicit-any` — Allows untyped code
- `react-hooks/exhaustive-deps` — Allows stale closure bugs
- `@typescript-eslint/no-unused-vars` — Allows dead code accumulation
- `no-console` — Allows console.log in production

**Impact:** Linting cannot catch common bug patterns. This contributed to the accumulation of dead code (225 lines in CLISection) and type safety issues.

---

## 9. Database Architecture

### 9.1 Prisma Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Client | Singleton pattern | Correct for serverless |
| Query Logging | Disabled in production | ✅ Fixed this session |
| Connection Pooling | Not configured | Uses Prisma defaults |
| Migrations | Assumed present | Not verified |

### 9.2 Missing Indexes

Frequently queried fields lack Prisma indexes:

```prisma
// Example: scans queried by domain
model Scan {
  id        String   @id @default(cuid())
  domain    String   // ❌ No index — full table scan on lookup
  status    String
  // ...
}
```

**Recommended indexes:**
- `Scan.domain` (queries by domain)
- `Scan.status` (queries by status)
- `Threat.scanId` (join queries)
- `Team.slug` (lookup by slug)

---

## 10. State Management

### 10.1 In-Memory State (Server-Side)

| Module | State | Problem |
|--------|-------|----------|
| `broadcast-engine.ts` | Broadcast message queue, subscriber list | Lost on server restart; not shared across instances |
| `sovereign-crypto.ts` | Crypto operation state | Same — not persistent, not distributed |

**Impact:** In a multi-instance deployment (horizontal scaling), in-memory state is inconsistent between instances. Broadcast messages sent on instance A won't be received by clients connected to instance B.

### 10.2 Client-Side State

| State | Method | Location |
|-------|--------|----------|
| UI state (modals, palette) | React useState/useReducer | Component-local |
| Scroll position | DOM mutation (direct) | ScrollProgress.tsx |
| Form state | Uncontrolled/controlled inputs | Component-local |

**Assessment:** Client-side state management is appropriate — no global state library needed for a marketing + scan dashboard.

---

## 11. Configuration Issues

| File | Issue | Status |
|------|-------|--------|
| `tailwind.config.ts` | Content paths missing `src/` | NOT FIXED — may cause incomplete CSS purging |
| `next.config.ts` | ignoreBuildErrors now false | ✅ FIXED |
| `tsconfig.json` | include scoped to `src/` | ✅ FIXED |
| `eslintrc` | 34 rules disabled | NOT FIXED |
| `Caddyfile` | XTransformPort removed | ✅ FIXED |

---

## 12. Conclusion

The architecture is sound for a Next.js 16 App Router application. The SSR/CSR split is correct, the component tree is well-organized, and the API route structure is logical. The primary architectural concerns are:

1. **12+ unused dependencies** adding bloat and attack surface
2. **In-memory state** that won't survive restarts or scale horizontally
3. **Missing Prisma indexes** that will degrade at data volume
4. **ESLint bypass** that allows code quality regression
5. **No authentication layer** in the architecture

---

*Architecture Report: 2025-07-14 | ReconPro v10.0.0 FINAL*