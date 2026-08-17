# ReconPro Contribution Guide

Guidelines for contributing to ReconPro v0.2.0. This document covers the contribution workflow, code standards, pull request process, and community expectations.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Contribution Workflow](#contribution-workflow)
4. [Types of Contributions](#types-of-contributions)
5. [Code Standards](#code-standards)
6. [Commit Messages](#commit-messages)
7. [Pull Request Process](#pull-request-process)
8. [Testing Requirements](#testing-requirements)
9. [Security Vulnerability Reporting](#security-vulnerability-reporting)
10. [Project Structure Reference](#project-structure-reference)
11. [Adding New Scanner Modules](#adding-new-scanner-modules)
12. [Adding New API Endpoints](#adding-new-api-endpoints)
13. [Documentation Contributions](#documentation-contributions)
14. [Community Support](#community-support)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone, regardless of background, identity, or experience level. We expect all contributors to adhere to the following standards:

### Standards

- **Be respectful**: Treat all contributors, users, and maintainers with respect and courtesy
- **Be constructive**: Provide feedback that is specific, actionable, and focused on the code, not the person
- **Be inclusive**: Use inclusive language and welcome contributors from all backgrounds
- **Be professional**: Keep discussions focused on the project and avoid personal attacks or inflammatory language
- **Be collaborative**: Work together to find the best solutions for the project

### Enforcement

Unacceptable behavior will be addressed by the project maintainers. Report concerns to the project team through the appropriate channels.

---

## Getting Started

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/your-username/reconpro.git
cd reconpro
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/reconpro/reconpro.git
```

### Install Dependencies

```bash
npm install
```

### Set Up the Database

```bash
npx prisma generate
npx prisma db push
```

### Start Development Server

```bash
npm run dev
```

Verify the application runs at `http://localhost:3000`.

---

## Contribution Workflow

### Branch Naming

Use descriptive branch names that follow this pattern:

```
<type>/<short-description>
```

Types:
- `feat/` — New feature
- `fix/` — Bug fix
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test additions or modifications
- `security/` — Security improvements
- `perf/` — Performance optimizations

Examples:
- `feat/subdomain-enum-via-crt`
- `fix/ssrf-guard-ipv6-handling`
- `docs/api-reference-update`
- `security/rate-limit-bounded-store`

### Keeping Your Branch Updated

Before starting work and before submitting a PR:

```bash
git fetch upstream
git rebase upstream/main
```

### Making Changes

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Add tests for new functionality
4. Update documentation if applicable
5. Run the lint and test suite

```bash
npm run lint
npx vitest
```

### Committing

Stage your changes and commit with a descriptive message (see [Commit Messages](#commit-messages)):

```bash
git add -p
git commit -m "feat: add IPv6 private range checks to SSRF guard"
```

---

## Types of Contributions

### Bug Reports

Bug reports help improve the platform. When reporting a bug:

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** if available
3. **Include**:
   - ReconPro version
   - Operating system and runtime version
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant log output
   - Screenshots if applicable

### Feature Requests

Feature requests should include:

1. A clear description of the proposed feature
2. The problem it solves or the use case it enables
3. Any relevant examples from other tools
4. Potential implementation approach (optional)

### Code Contributions

Code contributions include:

- New scanner modules (recon modules)
- New API endpoints
- UI components and dashboard improvements
- Security hardening
- Performance optimizations
- Test coverage improvements
- Documentation updates

### Documentation Contributions

Documentation is critical for the project. Contributions include:

- Fixing inaccuracies in existing documentation
- Adding missing information to guides
- Writing new guides for uncovered topics
- Improving code comments
- Adding inline documentation to complex functions

---

## Code Standards

### TypeScript

- Strict mode is enforced — all code must pass `tsc --noEmit`
- No `any` types — use explicit types or `unknown`
- Use `interface` for object shapes, `type` for unions and utilities
- Prefer `const` over `let`, never use `var`
- Use async/await over `.then()` chains

### React Components

- Use function components with hooks (no class components)
- Add `'use client'` directive only when necessary (interactivity, hooks, browser APIs)
- Default to server components when no client interactivity is needed
- Keep components small and focused — split at 200-300 lines
- Use proper TypeScript prop types (not `React.FC`)

### File Naming

- Components: PascalCase (`ScanResults.tsx`)
- Utilities: kebab-case (`api-protection.ts`)
- Tests: kebab-case with `.test.ts` suffix (`ssrf-guard.test.ts`)
- Directories: kebab-case (`recon-modules/`)

### Imports

- Use `@/` path alias for all imports from `src/`
- Order: Node.js built-ins, external packages, internal lib, types, relative
- No circular imports

### Comments

- Use JSDoc for exported functions and types
- Use section dividers for major code sections: `// ── Section ──`
- Comment non-obvious logic but avoid redundant comments
- Write comments that explain "why", not "what"

### Error Handling

- All API routes must use `withProtection()` middleware
- All errors must be caught and handled with `safeError()`
- Never expose stack traces or internal details in production
- Log errors with context: `console.error('[CONTEXT]', err)`

---

## Commit Messages

### Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring, no feature/fix |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `security` | Security vulnerability fix or hardening |
| `chore` | Build process, dependencies, tooling |

### Scope (Optional)

Common scopes:
- `auth` — Authentication and sessions
- `scan` — Scanner engine
- `recon` — Reconnaissance modules
- `api` — API routes
- `ui` — UI components
- `db` — Database schema
- `security` — Security features
- `deploy` — Deployment configuration
- `docs` — Documentation

### Examples

```
feat(scan): add IPv6 subdomain enumeration
fix(auth): correct session cookie domain handling
security(recon): treat DNS resolution failure as unsafe in SSRF guard
docs(api): update endpoint documentation for compliance module
test(ssrf): add IPv6 private range test cases
refactor(api): extract domain validation into reusable function
```

### Body Format

If additional context is needed, separate the body from the description with a blank line:

```
feat(scan): add certificate transparency log querying

Queries crt.sh for certificates issued for the target domain
and extracts subdomains from Subject Alternative Names.

This enables passive subdomain discovery without direct
DNS enumeration, improving coverage for organizations
that do not publish all subdomains in DNS.
```

---

## Pull Request Process

### Before Submitting

1. **Rebase on main**: Ensure your branch is up to date with upstream/main
2. **Pass all checks**: Run lint and tests locally
3. **Self-review**: Review your own diff for:
   - Unnecessary changes
   - Debugging code left in
   - Missing tests
   - Documentation gaps
4. **Update documentation**: If your PR changes user-facing behavior

### PR Description Template

```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manually tested: [describe manual testing steps]

## Screenshots (if UI changes)
[Attach screenshots]

## Documentation
- [ ] Documentation updated
- [ ] CHANGELOG updated (for user-facing changes)

## Breaking Changes
[None / Description of breaking changes and migration path]
```

### Review Process

1. A maintainer will review your PR within a reasonable timeframe
2. Address review feedback by pushing additional commits
3. Do not force-push to PRs under review unless requested
4. Once approved, the maintainer will squash and merge

### Merge Strategy

PRs are squash-merged to `main` with a clean commit message that summarizes the changes.

---

## Testing Requirements

### Test Coverage Expectations

- **New API routes**: Must include tests for happy path, error handling, and edge cases
- **New scanner modules**: Must include tests with mock data or recorded responses
- **Security changes**: Must include adversarial test cases
- **Bug fixes**: Must include a test that reproduces the bug and verifies the fix

### Running Tests

```bash
# All tests
npx vitest

# Specific test file
npx vitest src/__tests__/my-feature.test.ts

# With coverage
npx vitest --coverage

# Watch mode during development
npx vitest --watch
```

### Test File Location

Tests go in `src/__tests__/`:

```
src/__tests__/
├── api-security.test.ts
├── api-security-module.test.ts
├── api-route-security.test.ts
├── scan-engine.test.ts
├── middleware-security.test.ts
├── adversarial-ssrf.test.ts
├── adversarial-auth-ratelimit.test.ts
├── adversarial-xss.test.ts
├── production-readiness.test.ts
└── ...
```

### Writing Good Tests

- Test behavior, not implementation
- Cover edge cases: empty input, malformed input, boundary values
- Use descriptive test names that explain the expected behavior
- Test both success and failure paths
- Mock external dependencies (DNS, HTTP) to keep tests deterministic
- Clean up test state between tests

### Security Testing

For security-related changes, include:

- Adversarial inputs (injection attempts, malformed data)
- Boundary cases (maximum lengths, special characters)
- Bypass attempts (alternative encodings, protocol smuggling)
- Race condition scenarios (concurrent requests)

---

## Security Vulnerability Reporting

### Responsible Disclosure

If you discover a security vulnerability in ReconPro, please report it responsibly:

1. Do not open a public issue
2. Report through the designated security contact
3. Include a clear description of the vulnerability
4. Provide steps to reproduce
5. Suggest a fix if possible

### What to Report

- Authentication bypasses
- Authorization gaps (RBAC bypass)
- Injection vulnerabilities (SSRF, XSS, SQL injection)
- Information disclosure
- Denial of service vectors
- Cryptographic weaknesses

### Response Timeline

- Acknowledgment within 48 hours
- Initial assessment within 5 business days
- Fix timeline communicated within 10 business days
- Credit in changelog (if desired)

---

## Project Structure Reference

When contributing, be aware of these structural conventions:

- **`src/app/api/`**: API route handlers — one file per endpoint
- **`src/app/(dashboard)/`**: Protected dashboard pages
- **`src/app/(marketing)/`**: Public pages
- **`src/components/ui/`**: shadcn/ui primitives (do not modify)
- **`src/components/reconpro/`**: Feature components
- **`src/lib/api-protection.ts`**: Centralized API protection
- **`src/lib/api-security.ts`**: Input validation and SSRF guards
- **`src/lib/recon/`**: Scanner engine modules
- **`src/lib/db.ts`**: Prisma client singleton
- **`prisma/schema.prisma`**: Database schema

---

## Adding New Scanner Modules

### Module File

Create a new file in `src/lib/recon/`:

```typescript
// src/lib/recon/my-new-recon.ts
import type { ReconFinding } from './types';

export async function scanMyNewThing(target: string): Promise<ReconFinding[]> {
  const findings: ReconFinding[] = [];

  try {
    // Your scanning logic here
    // Return findings with appropriate severity ratings
  } catch (err) {
    console.error('[my-new-recon] Error:', err);
  }

  return findings;
}
```

### Integration

Import and call from the scan route handler (`src/app/api/scan/route.ts`) within the parallel execution block.

---

## Adding New API Endpoints

### Route Handler

Create a new file in `src/app/api/`:

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withProtection, safeError } from '@/lib/api-protection';

export async function GET(request: NextRequest) {
  const { error, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // Business logic
    return NextResponse.json({ data: 'result' });
  } catch (err) {
    return safeError('Operation failed', 500);
  }
}
```

### Documentation

Update the API reference in README.md and the relevant documentation files.

---

## Documentation Contributions

### Documentation Files

Documentation lives in:

- `/README.md` — Project overview
- `/docs/INSTALL.md` — Installation guide
- `/docs/DEPLOYMENT.md` — Deployment guide
- `/docs/SECURITY.md` — Security architecture
- `/docs/ARCHITECTURE.md` — System architecture
- `/docs/ADMIN_GUIDE.md` — Admin guide
- `/docs/USER_GUIDE.md` — User guide
- `/docs/DEVELOPER_GUIDE.md` — Developer guide
- `/docs/TROUBLESHOOTING.md` — Troubleshooting
- `/docs/CONTRIBUTING.md` — This file
- `/docs/ROADMAP.md` — Product roadmap
- `/CHANGELOG.md` — Version history

### Writing Style

- Use clear, professional language
- Be specific and accurate — reference actual code, file paths, and configurations
- Use tables for structured information
- Include code examples that are complete and runnable
- Avoid jargon without explanation

---

## Community Support

### Questions and Discussion

- Check existing documentation and issues before asking
- Provide context: what you tried, what happened, what you expected
- Include relevant code snippets and error messages

### Issue Triage

Maintainers triage issues regularly:

- `bug` — Confirmed or suspected bug
- `enhancement` — Feature request
- `documentation` — Documentation issue
- `question` — Support question
- `security` — Security concern (restricted access)

### Recognition

Contributors are recognized in:
- The CHANGELOG for significant contributions
- GitHub contributors list
- Release notes for merged PRs

Thank you for contributing to ReconPro. Your contributions help make attack surface management more accessible and effective for organizations of all sizes.
