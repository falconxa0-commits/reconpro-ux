# ReconPro Security Architecture

Comprehensive documentation of ReconPro v0.2.0's security mechanisms, authentication systems, input validation, rate limiting, SSRF protection, and security recommendations.

---

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Authentication System](#authentication-system)
3. [Session Management](#session-management)
4. [API Key Authentication](#api-key-authentication)
5. [API Route Protection](#api-route-protection)
6. [Rate Limiting](#rate-limiting)
7. [Content Security Policy](#content-security-policy)
8. [Security Headers](#security-headers)
9. [SSRF Protection](#ssrf-protection)
10. [Input Validation](#input-validation)
11. [Password Security](#password-security)
12. [Cryptographic Attestations](#cryptographic-attestations)
13. [Error Handling and Information Leakage](#error-handling-and-information-leakage)
14. [Audit Logging](#audit-logging)
15. [Infrastructure Security](#infrastructure-security)
16. [Security Recommendations](#security-recommendations)

---

## Security Architecture Overview

ReconPro implements a defense-in-depth strategy with multiple independent security layers. No single mechanism is relied upon exclusively; each layer provides independent protection that supplements the others.

### Security Layers

```
┌───────────────────────────────────────────────┐
│  Layer 1: Nginx Reverse Proxy (TLS, WAF)    │
├───────────────────────────────────────────────┤
│  Layer 2: Next.js Middleware (Auth Guard)     │
│  Security Headers + CSP + HSTS              │
├───────────────────────────────────────────────┤
│  Layer 3: API Protection Middleware           │
│  Auth + Rate Limiting + Input Validation     │
├───────────────────────────────────────────────┤
│  Layer 4: SSRF Guard (DNS + IP Validation)  │
├───────────────────────────────────────────────┤
│  Layer 5: Application Logic (RBAC, Audit)    │
└───────────────────────────────────────────────┘
```

### Design Principles

- **Zero Trust**: Every API request is validated independently
- **Fail Closed**: Validation failures result in rejection, not passthrough
- **Minimal Exposure**: Production error messages are generic with request IDs
- **Explicit over Implicit**: Security mechanisms are opt-in per route via `withProtection()`

---

## Authentication System

### Dual Authentication Model

ReconPro supports two authentication methods:

1. **Session-based (Web Dashboard)**: Cookie-based sessions for browser access
2. **API Key-based (API Access)**: `X-API-Key` header for programmatic access

### Session Authentication Flow

1. User submits credentials to `POST /api/auth/login`
2. Server validates email/password against bcrypt hash in database
3. On success, generates session token: `sess_` + 32 random bytes (hex)
4. Creates a `Session` record in the database with expiry (24 hours)
5. Sets `reconpro_session` cookie: `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`

### Middleware Auth Guard

The Next.js middleware (`src/middleware.ts`) intercepts all dashboard routes and enforces session presence:

```typescript
const PROTECTED_PREFIXES = ["/overview", "/scans", "/findings", "/monitoring",
  "/compliance", "/teams", "/integrations", "/settings"];
```

For each protected route:
- Checks for `reconpro_session` cookie
- Validates token format (must start with `sess_` and be at least 20 characters)
- Full database validation happens in API route handlers via `api-protection.ts`
- Invalid sessions trigger redirect to `/login` with original path as redirect parameter
- Legacy `reconpro_auth` cookie is actively cleaned up on every request

---

## Session Management

### Session Properties

| Property | Value |
|----------|-------|
| **Token format** | `sess_` + 64 hex characters (32 random bytes) |
| **Max age** | 24 hours (86,400 seconds) |
| **Cookie flags** | `HttpOnly`, `Secure` (production), `SameSite=Lax` |
| **Storage** | Database (Session model) |
| **Validation** | Format check in middleware, DB lookup in API routes |

### Session Database Model

```prisma
model Session {
  id             String   @id @default(cuid())
  token          String   @unique
  memberId       String
  organizationId String
  expiresAt      DateTime
  createdAt      DateTime @default(now())
}
```

Sessions are scoped to both a member and their organization, supporting future multi-organization membership.

### Security Characteristics

- Tokens are generated with `crypto.randomBytes(32)` for 256 bits of entropy
- Sessions have a cascade-delete relationship with members
- Expired sessions should be periodically cleaned up (cron job recommended)
- Session tokens are never logged or exposed in API responses

---

## API Key Authentication

### Key Format

API keys follow the format: `rp_live_` + 32 hex characters (16 random bytes)

Example: `rp_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`

### Storage Model

```prisma
model ApiKey {
  id             String   @id @default(cuid())
  keyHash        String   @unique   // SHA-256 hash
  keyPrefix      String              // First 12 chars for display
  name           String              // Human-readable label
  scopes         String              // JSON array of permissions
  lastUsedAt     DateTime?
  requestCount   Int      @default(0)
  isActive       Boolean  @default(true)
  expiresAt      DateTime?
}
```

### Authentication Process

1. Client sends `X-API-Key: rp_live_...` header
2. Server hashes the provided key with SHA-256
3. Looks up the `keyHash` in the database (`@unique` indexed lookup)
4. Validates: active, not expired
5. Updates `lastUsedAt` and increments `requestCount`
6. Returns `auth` context (id, organizationId, scopes) for downstream RBAC

### Security Characteristics

- Raw keys are never stored — only SHA-256 hashes
- `keyPrefix` (first 12 characters) is used ONLY for display and identification, never for authentication
- Bearer token authentication is explicitly NOT supported
- Each API key is scoped to a specific organization
- Keys support expiration dates
- Usage tracking enables anomaly detection

### Scopes

Default scopes granted to new API keys:

```json
["scan:read", "scan:write", "telemetry:write"]
```

Scope enforcement is the responsibility of individual API route handlers using the `auth.scopes` field from the protection middleware.

---

## API Route Protection

### Centralized Protection Middleware

All API routes use the `withProtection()` function from `src/lib/api-protection.ts`:

```typescript
const { error, clientIp, domain, auth } = await withProtection(request, {
  requireAuth: true,
  rateLimit: { maxRequests: 30, windowMs: 60_000 },
  validateDomainFromBody: true,
  maxBodySize: 1_000_000,
});
if (error) return error;
```

### Protection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireAuth` | boolean | `false` | Require valid API key via `X-API-Key` header |
| `rateLimit.maxRequests` | number | `30` | Max requests per window |
| `rateLimit.windowMs` | number | `60000` | Rate limit window in milliseconds |
| `rateLimit.keyByIP` | boolean | `true` | Rate limit by IP (true) or globally (false) |
| `validateDomainFromBody` | boolean | `false` | Validate domain from request body |
| `maxBodySize` | number | none | Maximum request body size in bytes |

### Client IP Extraction

The `extractClientIP()` function handles proxy headers with spoofing resistance:

1. **CF-Connecting-IP** — Cloudflare direct connection IP
2. **True-Client-IP** — Akamai and enterprise proxy header
3. **X-Real-IP** — Standard single-hop proxy header
4. **X-Forwarded-For** — Walks right-to-left, skips private IPs, returns first non-private IP

This prevents IP spoofing via injected `X-Forwarded-For` headers.

---

## Rate Limiting

### Implementation

In-memory rate limiting with bounded storage (`src/lib/api-security.ts`):

```typescript
const MAX_RATE_LIMIT_ENTRIES = 50_000;
const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Hardening Measures

- **Hard cap**: Maximum 50,000 tracked entries to prevent memory exhaustion attacks
- **Amortized cleanup**: Expired entries pruned when store exceeds 50% capacity
- **Overflow protection**: If store is full and key is new, request is rejected outright
- **Periodic full cleanup**: Background interval cleans up expired entries every 5 minutes

### Rate Limits by Endpoint

| Endpoint | Max Requests | Window |
|----------|-------------|--------|
| `/api/health` | 60 | 60 seconds |
| `/api/auth/login` | 10 | 60 seconds |
| `/api/auth/register` | 5 | 60 seconds |
| `/api/scan` | 10 | 60 seconds |
| General API routes | 30 | 60 seconds |

### Rate Limit Response

When rate limited, the API returns:

```json
HTTP 429
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

Headers: `Retry-After: 45`, `X-RateLimit-Remaining: 0`

---

## Content Security Policy

### CSP Configuration

CSP is applied by middleware to all non-API, non-static routes:

```
default-src 'self';
script-src 'self' 'nonce-{random}';
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
img-src 'self' data: blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
connect-src 'self';
object-src 'none';
upgrade-insecure-requests;
```

### CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Fallback for all resource types |
| `script-src` | `'self' 'nonce-{random}'` | Only same-origin scripts with cryptographic nonce |
| `style-src` | `'self' 'unsafe-inline'` | Allows Tailwind CSS inline styles (required) |
| `font-src` | `'self' data:` | Self-hosted fonts and data URI fonts |
| `img-src` | `'self' data: blob:` | Images from self, data URIs, and blob URLs |
| `frame-ancestors` | `'none'` | Prevents framing (clickjacking protection) |
| `base-uri` | `'self'` | Prevents base tag injection |
| `form-action` | `'self'` | Forms can only submit to same origin |
| `connect-src` | `'self'` | Fetch/XHR/WebSocket to same origin only |
| `object-src` | `'none'` | Blocks plugin content (Flash, Java) |
| `upgrade-insecure-requests` | — | Upgrades HTTP to HTTPS |

### Nonce Distribution

The nonce is generated per-request using `crypto.randomUUID()` and base64-encoded. It is communicated to the page via the `X-Content-Security-Policy-Nonce` response header for use by Next.js script tags.

---

## Security Headers

### Headers Applied by Middleware

Every response (including API routes) receives the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Blocks browser features and FLoC |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Powered-By` | (removed) | Hides Next.js version |

### Additional Hardening Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Permitted-Cross-Domain-Policies` | `none` | Prevents cross-domain policy files |
| `X-Download-Options` | `noopen` | Prevents direct file execution on IE |
| `X-XSS-Protection` | `0` | Disabled (CSP is the primary XSS defense) |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin resource loading |
| `Cross-Origin-Embedder-Policy` | `credentialless` | Prevents cross-origin embedding |

### Defense-in-Depth Headers in API Routes

The `applySecurityHeaders()` function provides backup headers directly in API route handlers, supplementing the middleware layer in case of middleware bypass.

---

## SSRF Protection

### Three-Step Validation Pipeline

The `validateScanTarget()` function in `src/lib/recon/ssrf-guard.ts` implements a three-step validation:

#### Step 1: Domain Sanitization

```typescript
const domain = sanitizeDomain(target);
```

- Strips `http://` and `https://` prefixes
- Strips trailing paths and query strings
- Strips trailing DNS dots (prevents resolver inconsistency)
- Validates against strict regex: `/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/`
- Lowercases the result

#### Step 2: Blocked Domain Check

```typescript
if (isBlockedDomain(domain)) { ... }
```

Blocked domains include:
- `localhost`, `localhost.localdomain`
- Cloud metadata endpoints: `metadata`, `metadata.google.internal`
- Container orchestration: `kube-system`, `kubernetes`, `kubernetes.default.svc`, `etcd`, `consul`, `vault`
- Internal services: `grafana`, `prometheus`, `jaeger`, `elastic`, `kibana`
- Caches: `redis`, `rabbitmq`, `memcached`
- GCP internal: `container.googleapis.com`
- Special-use TLDs: `.local`, `.internal`, `.localhost`, `.onion`
- Numeric-only domains (potential IP obfuscation)

Subdomains of blocked domains are also blocked (e.g., `redis.internal`).

#### Step 3: DNS Resolution and IP Validation

For domain targets, both A (IPv4) and AAAA (IPv6) records are resolved in parallel:

```typescript
const [v4Addresses, v6Addresses] = await Promise.all([
  dns.resolve4(domain).catch(() => []),
  dns.resolve6(domain).catch(() => []),
]);
```

DNS resolution failure is treated as **unsafe** — this prevents TOCTOU (time-of-check-time-of-use) attacks where an attacker causes SERVFAIL on the validation query but resolves to a private IP on the actual connection.

### Private IP Ranges (IPv4)

The `isPrivateIP()` function blocks:

| Range | CIDR | Purpose |
|-------|------|---------|
| 10.0.0.0/8 | Private | RFC 1918 |
| 172.16.0.0/12 | Private | RFC 1918 |
| 192.168.0.0/16 | Private | RFC 1918 |
| 127.0.0.0/8 | Loopback | Localhost |
| 169.254.0.0/16 | Link-local | Cloud metadata (169.254.169.254) |
| 100.64.0.0/10 | CGNAT | Carrier-grade NAT |
| 192.0.2.0/24 | Documentation | Test range |
| 198.51.100.0/24 | Documentation | Test range |
| 203.0.113.0/24 | Documentation | Test range |
| 224.0.0.0/16 | Multicast | Multicast traffic |
| 240.0.0.0/4 | Reserved | Future use |
| 0.0.0.0/8 | Default | Unreachable |

### Private IP Ranges (IPv6)

The `isPrivateIPv6()` function blocks:

| Range | Prefix | Purpose |
|-------|--------|---------|
| `::1` | Loopback | Localhost |
| `::ffff:0:0/96` | IPv4-mapped | Maps to IPv4 private ranges |
| `fe80::/10` | Link-local | Local network |
| `fc00::/7` | ULA | Unique Local Addresses |
| `ff00::/8` | Multicast | Multicast traffic |
| `2001:db8::/32` | Documentation | Test range |
| `2001:0::/32` | Teredo | Exposes internal NAT |
| `::` | Unspecified | All-zeros |

---

## Input Validation

### Domain Validation

Strict regex validation prevents injection through query parameters and request bodies:

```typescript
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
```

This regex requires:
- At least one alphanumeric character at the start
- Only alphanumeric characters and hyphens between dots
- At least a 2-character TLD
- No special characters, spaces, or protocol prefixes

### Request Body Validation

```typescript
const { body, error } = await parseValidatedBody<ScanRequest>(request, 1_000_000);
```

- Validates `Content-Length` header against maximum (1 MB default)
- Parses JSON and returns type-safe body
- Returns 413 for oversized bodies, 400 for invalid JSON

### Safe Fetch

The `safeFetch()` utility provides a hardened HTTP client for outbound requests during scans, with timeout enforcement and response size limits.

---

## Password Security

### Hashing Algorithm

Passwords are hashed using bcryptjs with 12 salt rounds:

```typescript
const BCRYPT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### Password Requirements

- Minimum 8 characters
- Stored as null for API-key-only accounts
- Verified with `bcrypt.compare()` during login

### Registration Rate Limiting

Registration is limited to 5 requests per minute per IP address, preventing brute-force account creation.

---

## Cryptographic Attestations

### Genesis Stamp System

The Genesis Stamp uses Ed25519 digital signatures via the `tweetnacl` library:

1. **Key Generation**: Ed25519 keypair generated on first use (cached in memory)
2. **Payload Hashing**: SHA-256 via `@noble/hashes` with canonical JSON serialization (sorted keys)
3. **Signing**: `nacl.sign.detached()` produces a 64-byte signature
4. **Verification**: `nacl.sign.detached.verify()` validates signature against public key

### Attestation Components

- `stampId`: Human-readable format `GS-XXXX-XXXX-XXXX` (48 bits of entropy)
- `signature`: Base64-encoded Ed25519 signature
- `publicKey`: Hex-encoded Ed25519 public key
- `payloadHash`: SHA-256 of canonical JSON payload

### Trust Model

In production, the master keypair should be loaded from environment variables or a KMS (Key Management Service) rather than generated at runtime. The current implementation generates and caches the keypair in memory, which is suitable for single-instance deployments but not for distributed systems.

---

## Error Handling and Information Leakage

### Production vs Development Behavior

| Aspect | Development | Production |
|--------|-------------|------------|
| Error messages | Full stack traces and error details | Generic message with request ID |
| Database errors | Detailed query information | "An internal error occurred" |
| `safeError()` | Returns actual error message | Returns generic message + `requestId` |
| Console output | All logs including Prisma queries | All `console.*` stripped at build time |

### Safe Error Function

```typescript
export function safeError(message: string, status = 500): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production';
  return NextResponse.json({
    error: isDev ? message : 'An internal error occurred',
    ...(isDev ? {} : { requestId: crypto.randomUUID() }),
  }, { status });
}
```

---

## Audit Logging

### AuditLog Model

Every significant action is recorded:

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  organizationId String?
  memberId       String?
  apiKeyId       String?
  action         String   // scan_launched, finding_acknowledged, etc.
  resource       String   // scan, finding, member, team, policy
  resourceId     String?
  details        String?  // JSON
  ipAddress      String?
  createdAt      DateTime @default(now())
}
```

### Logged Actions

- Scan launched, completed, or failed
- Finding acknowledged, mitigated, or marked as false positive
- Member invited or role changed
- API key created, rotated, or revoked
- NHI identity revoked or rolled back
- Genesis stamp issued, verified, or revoked
- Monitoring policy created or modified
- Integration configured or disabled

---

## Infrastructure Security

### Systemd Hardening

The production systemd service includes:

```ini
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/reconpro/db
PrivateTmp=true
```

This prevents privilege escalation, filesystem access beyond the database directory, and isolates temporary files.

### Resource Limits

```ini
MemoryMax=2G
CPUQuota=200%
```

Prevents resource exhaustion attacks by capping memory and CPU usage.

---

## Security Recommendations

### For Production Deployments

1. **Always use HTTPS**: Deploy behind a reverse proxy with valid TLS certificates. The HSTS header with `includeSubDomains; preload` enforces HTTPS.

2. **Rotate API keys regularly**: Implement a key rotation policy. The `keyPrefix` display helps identify which key is in use without exposing the full key.

3. **Restrict CORS**: The CSP `connect-src 'self'` prevents the frontend from making requests to external domains. For API integrations, whitelist specific origins.

4. **Load master signing key from KMS**: For Genesis Stamp attestations in production, load the Ed25519 keypair from environment variables or a cloud KMS rather than generating at runtime.

5. **Set up session cleanup**: Implement a scheduled task to delete expired sessions from the database.

6. **Enable database backups**: Schedule regular SQLite backups using the backup API.

7. **Monitor rate limit store**: In high-traffic deployments, the 50,000-entry cap may need adjustment or migration to Redis.

8. **Review audit logs**: Regularly review the audit trail for suspicious activity patterns.

### For Development

1. **Never commit `.env` files**: The `.env` file contains database paths and configuration.
2. **Use test domains only**: The SSRF guard blocks internal domains. Use `example.com` or similar for testing.
3. **Review middleware matcher**: Ensure the middleware matcher excludes static assets and health endpoints appropriately.

### For Multi-Instance Deployments

1. **Migrate rate limiting to Redis**: The in-memory rate limit store is per-process. Use Redis for shared state across instances.
2. **Use external session storage**: Consider Redis for session storage in multi-instance deployments.
3. **Review SQLite concurrency**: SQLite supports single-writer access. Use WAL mode or migrate to PostgreSQL for high concurrency.
4. **Consistent Genesis keypair**: Load the Ed25519 keypair from a shared secret store rather than generating per-instance.
