# ReconPro-UX Dashboard Reconstruction Brief

## Objective
Reconstruct the entire authenticated web application from first principles to feel like a $500M enterprise cybersecurity platform (CrowdStrike, Wiz, Datadog, SentinelOne level).

## Constraints
- DO NOT patch UI or make cosmetic tweaks
- Rebuild presentation, organization, workflows, responsiveness, usability from scratch
- Preserve ALL APIs, backend, authentication, business logic
- Landing page is already improved — leave it alone for now
- No icon library — uses unicode text symbols (◉, ◎, ◈, ◇, ▣, ⚙) — consider adding lucide-react or similar

## Tech Stack
- Next.js 14+ App Router, TypeScript, Tailwind CSS v4 (`@import "tailwindcss"`)
- Framer Motion for animations
- Turso database via Prisma adapter (`src/lib/db.ts`)
- Cookie-based session auth (scrypt hashing)
- shadcn/ui components in `src/components/ui/`

## Design System (OLED)
- `--color-bg: #0a0a0a`, `--color-surface: #111111`
- `--color-green: #00ff88`, `--color-red: #ff3355`
- `--color-border: rgba(255,255,255,0.06)`
- 12px grid system, glass effects, accessibility

## Reconstruction Tasks (Priority Order)

### 1. SIDEBAR REBUILD (`src/components/sidebar.tsx`)
Current: 303 lines, overflows, not responsive, weak hierarchy, template feel.
Target: Floating desktop mode, drawer on mobile, collapsible with persisted state, search, favorites, recent pages, organization switcher, user profile, notifications, command palette shortcut (Cmd+K), premium animations, OLED optimized. "Better than Linear and Vercel."

### 2. DASHBOARD RECONSTRUCTION (`src/app/dashboard/overview/`)
Current: Feels empty, basic cards.
Target: Executive Overview with Security Score, Risk Score, Assets Protected, Active Scans, Critical Findings, Compliance status, Threat Feed, Recent Activity, System Health, Scan Queue, Global Map visualization, Attack Timeline, AI Recommendations, Charts, Trend analysis, Interactive cards.

### 3. REBUILD ALL EXISTING PAGES
- **Scan pages** (`/dashboard/scan/new/`, `/dashboard/scan/[id]/`, `/dashboard/scan/history/`)
- **Chat** (`/dashboard/chat/`) — Upgrade to AI Advisor with conversation UI, streaming, memory, history, markdown rendering
- **Search** (`/dashboard/search/`)
- **Reports** (`/dashboard/reports/`)
- **Settings** (`/dashboard/settings/`) — 38 hardcoded settings-data files, no real persistence

### 4. BUILD MISSING PAGES
- **AI Advisor** — Conversation UI, streaming responses, memory, history, markdown support
- **Threat Intelligence** — Feed, actors, campaigns, CVEs, MITRE ATT&CK mapping, IOC explorer
- **Trends** — Analytics, graphs, heatmaps, forecasts

### 5. DESIGN SYSTEM UNIFICATION
- 12px grid, consistent spacing, OLED optimized, glass effects
- Component audit across all UI components
- Accessibility (ARIA, keyboard nav, focus management)

### 6. FULL RESPONSIVENESS AUDIT
- Desktop, laptop, tablet, mobile, ultrawide breakpoints

### 7. UX IMPROVEMENTS
- Breadcrumbs, skeleton loading states, optimistic UI, quick actions
- Keyboard shortcuts, empty states with helpful CTAs
- Command palette enhancement

### 8. REPORT EXPERIENCE
- Markdown/tables/checklists in chat — NOT PDF by default

### 9. QUALITY GATE
- Zero TypeScript errors, zero ESLint errors, zero build errors, zero hydration errors

## Key File Map

### Auth & Layout
- `src/middleware.ts` — Auth redirects + CSP headers
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/dashboard/layout.tsx` — Server component, session check, Sidebar + CommandPalette

### API Routes (PRESERVE THESE — DO NOT MODIFY)
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts` (note: missing POST handler)
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/scan/route.ts`
- `src/app/api/scan/history/route.ts`
- `src/app/api/vuln-scan/route.ts`
- `src/app/api/search/route.ts`
- `src/app/api/settings/route.ts` (note: uses cookie value directly as userId — security concern)

### Lib
- `src/lib/db.ts` — Turso/Prisma client
- `src/lib/auth.ts` — Auth utilities
- `src/lib/utils.ts` — cn() helper

### Components
- `src/components/sidebar.tsx` — **REBUILD**
- `src/components/command-palette.tsx` — Enhance
- `src/components/ui/*` — shadcn components (button, card, input, label, etc.)

### Settings Data Files (38 files, all hardcoded static exports)
- `src/app/dashboard/settings/settings-data*.tsx`

### CSS
- `src/app/globals.css` — 1180 lines, BLOATED — needs audit/cleanup

## Known Issues to Fix
1. Settings API uses session cookie value directly as userId (no DB lookup)
2. Logout API missing POST handler
3. CSS globals.css is 1180 lines — needs cleanup
4. No icon library (unicode symbols only)
5. 38 hardcoded settings files with no real persistence
6. Command palette needs enhancement
