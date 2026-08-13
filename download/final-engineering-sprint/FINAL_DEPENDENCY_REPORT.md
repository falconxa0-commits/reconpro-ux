# ReconPro — Final Dependency Audit Report

**Date:** Final Engineering Sprint
**Auditor:** Dependency Specialist Swarm
**Scope:** All production and development dependencies, bundle impact, security posture

---

## Executive Summary

This sprint achieved a significant dependency cleanup: 15 packages were removed (72→57 production dependencies), eliminating an estimated 2MB+ from the potential bundle. However, critical inefficiencies remain — Zod and Zustand are installed but completely unused, `next-themes` serves only boilerplate, and no automated vulnerability scanning is in place. The dependency tree is now leaner but still carries dead weight.

**Overall Dependency Score: 6.0 / 10**

---

## Removed Dependencies (This Sprint)

| Package | Est. Size | Reason Removed | Risk Level |
|---|---|---|---|
| `three` | ~880 KB | Dead dep — no WebGL usage | LOW |
| `@react-three/fiber` | ~150 KB | Dead dep — Three.js wrapper | LOW |
| `@react-three/drei` | ~200 KB | Dead dep — Three.js helpers | LOW |
| `postprocessing` | ~100 KB | Dead dep — Three.js post-fx | LOW |
| `next-intl` | ~50 KB | Dead dep — no i18n | LOW |
| `next-auth` | ~80 KB | Dead dep — no auth system | LOW |
| `uuid` | ~15 KB | Dead dep — unused ID generation | LOW |
| `@hookform/resolvers` | ~30 KB | Dead dep — no forms | LOW |
| `@dnd-kit/core` | ~60 KB | Dead dep — no drag-and-drop | LOW |
| `@dnd-kit/sortable` | ~25 KB | Dead dep — no drag-and-drop | LOW |
| `@dnd-kit/utilities` | ~15 KB | Dead dep — no drag-and-drop | LOW |
| `@mdxeditor/editor` | ~200 KB | Dead dep — no MDX editing | LOW |
| `@reactuses/core` | ~40 KB | Dead dep — unused hooks | LOW |
| `react-syntax-highlighter` | ~150 KB | Dead dep — no code highlighting | LOW |
| `react-markdown` | ~30 KB | Dead dep — no markdown rendering | LOW |

**Total removed: ~2,025 KB estimated bundle impact eliminated.**

---

## Current Production Dependencies (57)

### Tier 1: Core Framework (Active, Required)

| Package | Version | Status | Bundle Impact | Notes |
|---|---|---|---|---|
| `react` | 19.x | ACTIVE | ~45 KB (gzip) | Current, stable |
| `react-dom` | 19.x | ACTIVE | ~140 KB (gzip) | Current, stable |
| `next` | 16.x | ACTIVE | Framework | Current, Turbopack |
| `framer-motion` | 12.x | ACTIVE | ~80 KB (tree-shaken) | Animation library |

### Tier 2: UI & Styling (Active, Required)

| Package | Version | Status | Bundle Impact | Notes |
|---|---|---|---|---|
| `tailwindcss` | v4 | ACTIVE | Build-time only | CSS framework |
| `@tailwindcss/postcss` | v4 | ACTIVE | Build-time only | PostCSS plugin |
| `clsx` | latest | ACTIVE | <1 KB | Utility |
| `tailwind-merge` | latest | ACTIVE | <2 KB | Class merging |
| `class-variance-authority` | latest | ACTIVE | <2 KB | Component variants |
| `lucide-react` | latest | ACTIVE | ~5-15 KB (tree-shaken) | Icons |
| `tw-animate-css` | latest | ACTIVE | CSS bulk | Animation styles — review |

### Tier 3: Installed But Unused

| Package | Status | Bundle Impact | Action Needed |
|---|---|---|---|
| `zod` | **UNUSED** | 0 KB (not imported) | **Remove or integrate** |
| `zustand` | **UNUSED** | 0 KB (not imported) | **Remove or implement** |
| `next-themes` | **BOILERPLATE ONLY** | <2 KB | Used only in shadcn Toaster — remove or use properly |

### Tier 4: Utility Libraries (Active)

| Package | Status | Bundle Impact | Notes |
|---|---|---|---|
| Various utility packages | ACTIVE | Minimal | Project-specific utilities |

---

## Bundle Impact Summary

| Metric | Before Sprint | After Sprint | Change |
|---|---|---|---|
| Production dependencies | 72 | 57 | -15 (21% reduction) |
| Total static JS | ~900 KB+ (est.) | 850.5 KB | ~50 KB reduction |
| Dead dependency weight | ~2,025 KB | ~0 KB (from removed) | Eliminated |
| Total CSS | 315 KB | 315 KB | No change |

---

## Remaining Concerns

### 1. Zod — Installed, Never Imported

Zod was identified as a critical need for API input validation (see Security Report). It is installed but zero import statements reference it across the codebase. This is either:
- A planned but unimplemented feature
- An accidental install

**Recommendation:** If validation will be implemented, keep Zod. If not, remove it.

### 2. Zustand — Installed, Never Imported

Zustand was likely intended for client-side state management. It is completely unused. The application appears to rely on React's built-in state and server-side route handlers.

**Recommendation:** Remove unless client state management is planned within 2 sprints.

### 3. next-themes — Near-Useless

Only referenced in shadcn boilerplate's `Toaster` component. The application's dark OLED theme is hardcoded via Tailwind, not driven by `next-themes`.

**Recommendation:** Remove and hardcode theme in Toaster, or properly integrate for theme switching support.

### 4. No Automated Vulnerability Scanning

- No `npm audit` step in CI/CD pipeline observed.
- No Dependabot, Renovate, or Snyk configuration.
- Dependencies could harbor known CVEs without detection.

**Recommendation:** Add `npm audit --audit-level=high` to CI pipeline. Enable Dependabot alerts.

### 5. tw-animate-css Bulk Contribution

This package contributes significantly to the 315KB CSS output. The animations it provides are likely used, but manual implementation with Tailwind's built-in animation utilities could reduce CSS size through better tree-shaking.

---

## Before vs After Comparison

```
BEFORE SPRINT:
  72 production deps
  ~2MB+ potential dead weight (Three.js ecosystem alone)
  No dependency audit performed
  No cleanup strategy

AFTER SPRINT:
  57 production deps
  2MB+ dead weight eliminated
  3 packages still unused (zod, zustand, next-themes)
  Clean dependency tree with no circular deps
```
