# ReconPro Developer Guide

Comprehensive guide for developers working on ReconPro v0.2.0, covering development environment setup, coding standards, project structure, testing, and contribution workflow.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [TypeScript Configuration](#typescript-configuration)
5. [Component Development](#component-development)
6. [API Route Development](#api-route-development)
7. [Scanner Module Development](#scanner-module-development)
8. [Database Schema Changes](#database-schema-changes)
9. [Testing](#testing)
10. [Security Development Practices](#security-development-practices)
11. [Common Patterns](#common-patterns)
12. [Debugging](#debugging)
13. [Performance Considerations](#performance-considerations)

---

## Development Environment Setup

### Prerequisites

- **Node.js** 20.x or later
- **npm** 9.x or later (or pnpm, yarn, bun)
- **Git** for version control
- **VS Code** recommended (with TypeScript and Tailwind extensions)

### Clone and Install

```bash
git clone https://github.com/reconpro/reconpro.git
cd reconpro
npm install
```

### Environment Configuration

Create `.env` in the project root:

```env
DATABASE_URL=file:./db/reconpro.db
NODE_ENV=development
PORT=3000
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### Start Development Server

```bash
npm run dev
```

The dev server runs on port 3000 with:
- Hot module replacement for React components
- Prisma query logging in the console
- Source maps for TypeScript debugging

### Prisma Studio (Database Browser)

```bash
npx prisma studio
```

Opens a web-based database browser at `http://localhost:5555`.

---

## Project Structure

### Directory Layout

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group
│   │   ├── layout.tsx      # Auth-specific layout
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/        # Dashboard route group (protected)
│   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   ├── overview/
│   │   ├── scans/
│   │   ├── findings/
│   │   ├── monitoring/
│   │   ├── compliance/
│   │   ├── teams/
│   │   ├── integrations/
│   │   ├── settings/
│   │   ├── loading.tsx     # Loading skeleton
│   │   └── error.tsx       # Error boundary
│   ├── (marketing)/        # Public route group
│   │   ├── layout.tsx      # Marketing layout (Navbar, Footer)
│   │   ├── page.tsx        # Landing page
│   │   └── .../            # Public pages
│   ├── api/                # API route handlers
│   │   ├── health/route.ts
│   │   ├── auth/
│   │   ├── scan/
│   │   ├── scans/
│   │   ├── compliance/
│   │   ├── monitoring/
│   │   ├── nhi/
│   │   ├── genesis/
│   │   └── ...
│   ├── layout.tsx          # Root layout
│   ├── page.tsx             # Root page
│   ├── not-found.tsx        # 404 page
│   ├── loading.tsx          # Global loading
│   ├── error.tsx            # Global error boundary
│   ├── globals.css          # Global styles
│   └── sitemap.ts           # Dynamic sitemap
├── components/
│   ├── ui/                  # shadcn/ui primitives (do not modify)
│   ├── reconpro/            # Feature-specific components
│   ├── backgrounds/          # WebGL backgrounds
│   ├── seo/                 # SEO components (JSON-LD)
│   └── ...
├── hooks/                   # Custom React hooks
├── lib/                     # Shared libraries
│   ├── api-protection.ts    # API auth middleware
│   ├── api-security.ts      # Validation + SSRF guards
│   ├── db.ts                # Prisma singleton
│   ├── utils.ts             # Utilities
│   ├── recon/               # Scanner engine modules
│   └── ...
├── data/                    # Static data files
└── middleware.ts             # Next.js middleware
```

### Route Groups

Next.js route groups (parenthesized directories) organize routes without affecting URL structure:

- `(auth)`: Authentication pages — share auth layout
- `(dashboard)`: Protected pages — share dashboard layout with sidebar
- `(marketing)`: Public pages — share marketing layout with Navbar and Footer

### Adding a New Page

To add a new dashboard page:

1. Create `src/app/(dashboard)/my-page/page.tsx`
2. The dashboard layout automatically wraps it with the sidebar
3. The middleware automatically protects it (add the path to `PROTECTED_PREFIXES` if it starts a new path segment)

---

## Coding Standards

### TypeScript Rules

- **Strict mode enabled**: All TypeScript files must pass strict type checking
- **No `any`**: Use explicit types or `unknown` for uncertain data
- **Build errors are fatal**: `ignoreBuildErrors: false` in next.config.ts

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Files** | kebab-case | `scan-results.tsx`, `api-protection.ts` |
| **Components** | PascalCase | `ScanResults`, `RiskGauge` |
| **Functions** | camelCase | `validateScanTarget`, `extractClientIP` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RATE_LIMIT_ENTRIES`, `DOMAIN_REGEX` |
| **Types/Interfaces** | PascalCase | `Finding`, `ScanTargetResult` |
| **Enums** | UPPER_SNAKE_CASE | `ScanStatus`, `FindingSeverity` |
| **Database models** | PascalCase (Prisma convention) | `Organization`, `ScanTarget` |
| **API routes** | kebab-case | `/api/v1/auth/validate` |

### File Organization

- One component per file (with exceptions for closely related sub-components)
- Co-locate types with their usage (in the same file or a `types.ts` sibling)
- Keep barrel exports minimal — prefer direct imports

### Import Order

```typescript
// 1. Node.js / Built-in
import crypto from 'crypto';
import dns from 'dns/promises';

// 2. External packages
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

// 3. Internal lib
import { db } from '@/lib/db';
import { withProtection } from '@/lib/api-protection';

// 4. Types
import type { Finding } from '@/lib/recon/types';

// 5. Relative imports (rare — prefer @/ alias)
import { MyComponent } from './MyComponent';
```

### Comment Style

Use section dividers for major sections:

```typescript
// ── Section Name ──────────────────────────────────────────────

// Inline comments for non-obvious logic
```

---

## TypeScript Configuration

The project uses TypeScript 5 with strict mode. Key compiler options:

- `strict: true` — All strict checks enabled
- `paths: { "@/*": ["./src/*"] }` — Path alias for clean imports
- `target: "ES2022"` — Modern JavaScript target

### Type Definitions

Scanner engine types are defined in `src/lib/recon/types.ts`:

```typescript
export interface ReconFinding {
  title: string;
  severity: string;     // critical, high, medium, low, info
  category: string;     // dns, subdomain, port, technology, ssl, header, vulnerability
  description: string;
  evidence: string | null;
  asset: string;
  source: string;
  remediation?: string;
}
```

Use these types consistently across all scanner modules to ensure uniform finding output.

---

## Component Development

### UI Components

UI primitives in `src/components/ui/` are from shadcn/ui. These should not be modified directly. Instead, compose them in feature components.

### Feature Components

Feature components go in `src/components/reconpro/`:

```typescript
// src/components/reconpro/my-feature.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MyFeatureProps {
  title: string;
  data: Finding[];
}

export function MyFeature({ title, data }: MyFeatureProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.map((item) => (
          <Badge key={item.id} variant="outline">{item.title}</Badge>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Client vs Server Components

- Use `'use client'` only when the component needs interactivity (event handlers, hooks, browser APIs)
- Default to server components for better performance
- API route handlers are always server-side

### Styling

- Use Tailwind CSS utility classes
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging
- Follow the existing color scheme and spacing conventions

---

## API Route Development

### Route Handler Pattern

All API routes follow this consistent pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withProtection, safeError } from '@/lib/api-protection';

export async function POST(request: NextRequest) {
  // 1. Apply protection middleware
  const { error, clientIp, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  // 2. Business logic
  try {
    const body = await request.json();
    // ... process
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return safeError('Failed to process request', 500);
  }
}

export async function GET(request: NextRequest) {
  const { error, auth } = await withProtection(request, {
    requireAuth: true,
  });
  if (error) return error;

  try {
    const data = await db.someModel.findMany({
      where: { organizationId: auth!.organizationId },
    });
    return NextResponse.json(data);
  } catch (err) {
    return safeError('Failed to fetch data', 500);
  }
}
```

### Protection Options Reference

```typescript
// Public endpoint (no auth, rate limited)
await withProtection(request, {
  requireAuth: false,
  rateLimit: { maxRequests: 60, windowMs: 60_000 },
});

// Authenticated endpoint with domain validation
await withProtection(request, {
  requireAuth: true,
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
  validateDomainFromBody: true,
});

// Authenticated with body size limit
await withProtection(request, {
  requireAuth: true,
  maxBodySize: 5_000_000, // 5 MB
});
```

### Safe Error Responses

Never expose internal errors to clients:

```typescript
// CORRECT: Use safeError
return safeError('Failed to process scan', 500);

// WRONG: Exposing internal details
return NextResponse.json({ error: err.message }, { status: 500 });
```

### Response Headers

Apply defense-in-depth headers for additional protection:

```typescript
import { applySecurityHeaders } from '@/lib/api-security';

const response = NextResponse.json(data);
return applySecurityHeaders(response);
```

---

## Scanner Module Development

### Module Pattern

Each scanner module in `src/lib/recon/` follows this pattern:

```typescript
import type { ReconFinding } from './types';

/**
 * Module Name — Brief description
 *
 * What it does, what data sources it uses.
 */

export async function scanSomething(target: string): Promise<ReconFinding[]> {
  const findings: ReconFinding[] = [];

  try {
    // 1. Execute network operation
    // 2. Parse results
    // 3. Generate findings with severity ratings
  } catch (err) {
    // Log but don't crash — return partial results
    console.error('[module] Error:', err);
  }

  return findings;
}
```

### SSRF Guard Integration

All modules that accept domain targets must use the SSRF guard:

```typescript
import { validateScanTarget } from '@/lib/recon/ssrf-guard';

// In API route:
const result = await validateScanTarget(rawDomain);
if (!result.safe) {
  return NextResponse.json({ error: result.reason }, { status: 403 });
}
const domain = result.domain;
```

### Finding Severity Guidelines

| Severity | When to Use |
|----------|------------|
| **critical** | Active exploitation risk, data exposure, authentication bypass |
| **high** | Significant misconfiguration, outdated software with known CVEs |
| **medium** | Missing security headers, non-critical misconfiguration |
| **low** | Minor best practice violations, informational issues |
| **info** | Purely informational (technology detected, record found) |

### Adding a New Recon Module

1. Create `src/lib/recon/my-recon.ts`
2. Export an async function that accepts a validated domain string
3. Return an array of `ReconFinding` objects
4. Import and call from `src/app/api/scan/route.ts`
5. Add the finding category to the type definitions if new

---

## Database Schema Changes

### Schema Location

The Prisma schema is at `prisma/schema.prisma`.

### Making Schema Changes

1. Edit the schema file
2. Generate the Prisma client:

```bash
npx prisma generate
```

3. Push changes to the database:

```bash
# Development (no migration files)
npx prisma db push

# Production (with migration files)
npx prisma migrate dev --name describe-change
npx prisma migrate deploy  # Apply in production
```

### Schema Conventions

- Use `@id @default(cuid())` for primary keys
- Use `@updatedAt` for automatic timestamp updates
- Add `@@index` for frequently queried fields
- Use `onDelete: Cascade` for parent-child relationships where appropriate
- Store JSON data in `String` fields with JSON.parse/stringify
- Add descriptive comments for complex relationships

### Example Model Addition

```prisma
model MyNewModel {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  status         String   @default("active")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([status])
}
```

---

## Testing

### Test Framework

ReconPro uses **Vitest** with **Testing Library** for React component tests and **jsdom** for DOM simulation.

### Running Tests

```bash
# Run all tests
npx vitest

# Run with coverage
npx vitest --coverage

# Run specific test file
npx vitest src/__tests__/my-test.test.ts

# Watch mode
npx vitest --watch
```

### Test File Location

Tests are in `src/__tests__/`:

- `api-security.test.ts` — Input validation, SSRF guards
- `api-security-module.test.ts` — Rate limiting, domain validation
- `middleware-security.test.ts` — Middleware security headers
- `scan-engine.test.ts` — Scanner engine functionality
- `database-schema.test.ts` — Schema validation
- `adversarial-ssrf.test.ts` — SSRF protection edge cases
- `adversarial-auth-ratelimit.test.ts` — Auth rate limiting
- `adversarial-xss.test.ts` — XSS prevention
- `production-readiness.test.ts` — Production readiness checks

### Writing API Tests

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeDomain, isPrivateIP, isBlockedDomain } from '@/lib/api-security';

describe('sanitizeDomain', () => {
  it('strips protocol prefix', () => {
    expect(sanitizeDomain('https://example.com')).toBe('example.com');
  });

  it('rejects internal domains', () => {
    expect(sanitizeDomain('localhost')).toBeNull();
  });

  it('lowercases output', () => {
    expect(sanitizeDomain('EXAMPLE.COM')).toBe('example.com');
  });
});
```

### Writing Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/reconpro/my-feature';

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Test" data={[]} />);
    expect(screen.getByText('Test')).toBeDefined();
  });
});
```

---

## Security Development Practices

### Mandatory for All API Routes

1. **Use `withProtection()`**: Every API route must use the centralized protection middleware
2. **Validate inputs**: Use `sanitizeDomain()`, `sanitizeTarget()`, or `parseValidatedBody()`
3. **Use `safeError()`**: Never return raw error messages in production
4. **Apply SSRF guard**: All domain-targeting routes must use `validateScanTarget()`
5. **Apply security headers**: Use `applySecurityHeaders()` as defense-in-depth

### SSRF Prevention Checklist

Before accepting a domain/target from user input:

- Sanitize with `sanitizeDomain()` or `sanitizeTarget()`
- Check blocked domains with `isBlockedDomain()`
- Resolve DNS and check IPs with `validateScanTarget()`
- Never bypass DNS resolution for domain targets

### Rate Limiting Guidelines

| Endpoint Type | Rate Limit |
|---------------|-----------|
| Authentication | 5-10/min |
| Write operations | 10-30/min |
| Read operations | 30-60/min |
| Health check | 60/min |

---

## Common Patterns

### Database Singleton

```typescript
import { db } from '@/lib/db';

// Use the singleton — never create new PrismaClient instances
const members = await db.member.findMany({
  where: { organizationId: orgId },
});
```

### Org-Scoped Queries

All queries must be scoped to the requesting organization:

```typescript
const { auth } = await withProtection(request, { requireAuth: true });

const scans = await db.scan.findMany({
  where: { target: { organizationId: auth!.organizationId } },
});
```

### Parallel Async Operations

Use `Promise.all` for concurrent operations:

```typescript
const [dnsResults, httpResults, sslResults] = await Promise.all([
  enumerateDNS(domain),
  analyzeHTTP(domain),
  analyzeSSL(domain),
]);
```

### Error Handling in API Routes

```typescript
try {
  // Business logic
} catch (err) {
  console.error('[CONTEXT]', err);
  return safeError('Operation failed', 500);
}
```

---

## Debugging

### Development Logging

In development mode, Prisma logs all database queries. Check the console output for query details.

### Dev Server Logs

The dev script pipes output to a log file:

```bash
npm run dev  # Outputs to both console and dev.log
```

### Production Logs

The start script pipes output to a log file:

```bash
npm start  # Outputs to both console and server.log
```

### Debugging API Routes

Use browser DevTools Network tab or curl:

```bash
# With verbose output
curl -v -H "X-API-Key: rp_live_..." https://localhost:3000/api/scans
```

### Database Debugging

Use Prisma Studio for visual database inspection:

```bash
npx prisma studio
```

Or query directly with sqlite3:

```bash
sqlite3 ./db/reconpro.db "SELECT * FROM Scan ORDER BY startedAt DESC LIMIT 10;"
```

---

## Performance Considerations

### Database Query Optimization

- Always use indexed fields in `where` clauses
- Avoid `SELECT *` — select only needed fields with `select: { field: true }`
- Use `include` sparingly — it generates JOIN queries
- Use pagination for large result sets (`skip`, `take`)

### Server Component Rendering

- Default to server components (no `'use client'`)
- Keep client components small and focused
- Use `'use client'` boundary as low in the tree as possible

### Image Optimization

- Use Next.js `<Image>` component for automatic optimization
- Configure formats in `next.config.ts` (AVIF, WebP)
- Set appropriate `minimumCacheTTL`

### Static Asset Caching

Static assets in `/_next/static/` are served with immutable cache headers. The Nginx config caches these for 365 days.
