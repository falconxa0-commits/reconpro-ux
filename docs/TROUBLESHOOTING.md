# ReconPro Troubleshooting

Common issues and solutions for ReconPro v0.2.0 across installation, deployment, scanning, authentication, and database operations.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Build Issues](#build-issues)
3. [Database Issues](#database-issues)
4. [Authentication Issues](#authentication-issues)
5. [Scanning Issues](#scanning-issues)
6. [Performance Issues](#performance-issues)
7. [Deployment Issues](#deployment-issues)
8. [Docker Issues](#docker-issues)
9. [Network Issues](#network-issues)
10. [API Issues](#api-issues)
11. [Frontend Issues](#frontend-issues)
12. [Security Header Issues](#security-header-issues)

---

## Installation Issues

### `npm install` Fails with Module Errors

**Symptoms**: Installation fails with errors related to native modules like `bcryptjs` or `sharp`.

**Solution**:

```bash
# Clear node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If sharp fails specifically
npm install --build-from-source sharp
```

### Prisma Client Generation Fails

**Symptoms**: `npx prisma generate` exits with an error about engine binaries or schema parsing.

**Solution**:

```bash
# Ensure Prisma CLI matches the client version
npx prisma --version

# If versions mismatch, reinstall
npm install prisma @prisma/client@latest

# Regenerate
npx prisma generate
```

### `npx prisma db push` Fails

**Symptoms**: Schema push fails with migration errors or constraint violations.

**Solution**:

```bash
# Check the DATABASE_URL in .env
echo $DATABASE_URL

# Ensure the db directory exists
mkdir -p db

# If the database is corrupted, reset it
npx prisma migrate reset

# Then push the schema
npx prisma db push
```

### Dev Server Won't Start

**Symptoms**: `npm run dev` exits immediately or hangs.

**Solution**:

```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill the process using port 3000
kill -9 $(lsof -t -i:3000)

# Try starting again
npm run dev
```

---

## Build Issues

### TypeScript Build Errors

**Symptoms**: `npm run build` fails with TypeScript errors.

**Solution**:

```bash
# Run TypeScript compiler to see all errors
npx tsc --noEmit

# Fix type errors in the specific files
# Common fixes:
# - Add explicit types where inference fails
# - Import missing types
# - Fix null/undefined handling
```

### Build Produces Empty Standalone Output

**Symptoms**: The standalone directory is missing files or the production server fails to start.

**Solution**:

```bash
# Clean the build cache
rm -rf .next

# Rebuild
npm run build

# Verify the standalone directory was created
ls .next/standalone/
ls .next/standalone/.next/
ls .next/standalone/.next/static/
```

The build script copies static assets after the Next.js build:

```bash
next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
```

If the copy step fails, the standalone output will be missing static assets.

### Build Exceeds Memory

**Symptoms**: Build fails with an out-of-memory error during the webpack compilation phase.

**Solution**:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## Database Issues

### SQLite Database Locked

**Symptoms**: API requests fail with "database is locked" errors.

**Solution**:

SQLite uses file-level locking. This can happen when:

1. Multiple processes try to write simultaneously
2. A long-running query holds a write lock
3. The database file is on a network mount

```bash
# Check for stale lock files
ls -la db/reconpro.db*
# Remove WAL and SHM files if the process is not running
rm -f db/reconpro.db-wal db/reconpro.db-shm
```

For high-concurrency deployments, consider:

- Enabling WAL mode: `PRAGMA journal_mode=WAL;`
- Reducing concurrent writes
- Migrating to PostgreSQL

### Database File Not Found

**Symptoms**: Application starts but all database operations fail.

**Solution**:

```bash
# Verify DATABASE_URL is set correctly
cat .env | grep DATABASE_URL

# Ensure relative paths are from the prisma/ directory
# DATABASE_URL=file:./db/reconpro.db resolves to prisma/db/reconpro.db

# Create the directory if needed
mkdir -p prisma/db
npx prisma db push
```

### Schema Mismatch

**Symptoms**: Application errors about missing tables or columns after an update.

**Solution**:

```bash
# Regenerate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# If push fails, reset the database (destructive)
npx prisma migrate reset
```

### Database Corruption

**Symptoms**: Queries return unexpected results or integrity check fails.

**Solution**:

```bash
# Check integrity
sqlite3 db/reconpro.db "PRAGMA integrity_check;"

# If corrupted, restore from backup
cp db/reconpro.db.backup-YYYYMMDD db/reconpro.db

# If no backup, reset
npx prisma migrate reset
```

---

## Authentication Issues

### Login Returns "Invalid email or password"

**Symptoms**: Correct credentials are rejected at login.

**Possible causes**:

1. The email is stored with different casing (the system lowercases emails)
2. The password hash does not match (bcrypt rounds may differ)
3. The member record has `passwordHash: null` (API-key-only account)

**Solution**:

```bash
# Check the member record
sqlite3 db/reconpro.db "SELECT id, email, role, passwordHash IS NOT NULL as has_password FROM Member WHERE email = 'user@example.com';"
```

If `has_password` is 0, the account is API-key-only. Re-register or update the password hash directly.

### Session Cookie Not Being Set

**Symptoms**: Login succeeds but the user is immediately redirected back to `/login`.

**Possible causes**:

1. The `Secure` cookie flag is set but the connection is HTTP (not HTTPS)
2. The domain does not match (cookie scope)
3. Browser blocks third-party cookies

**Solution**:

- In production, ensure HTTPS is configured
- In development, the `Secure` flag is off (good)
- Check browser cookie settings
- Verify the `SameSite=Lax` policy is compatible

### API Key Authentication Fails

**Symptoms**: API requests with `X-API-Key` header return 401.

**Possible causes**:

1. The key prefix is being sent instead of the full key
2. The key was deactivated or expired
3. The SHA-256 hash lookup fails

**Solution**:

```bash
# Verify the key exists and is active
sqlite3 db/reconpro.db "SELECT id, keyPrefix, isActive, expiresAt FROM ApiKey WHERE keyPrefix LIKE 'rp_live_%';"

# Test the key manually
curl -H "X-API-Key: rp_live_full_key_here" https://localhost:3000/api/scans
```

Remember: Only the full key authenticates. The `keyPrefix` (first 12 characters) is for display only.

### Rate Limited on Login

**Symptoms**: Login returns 429 Too Many Requests.

**Solution**:

The login endpoint allows 10 attempts per minute per IP. Wait 60 seconds and try again. If you are behind a corporate proxy, all users sharing the proxy IP share the rate limit. Consider increasing the limit in the route handler.

---

## Scanning Issues

### Scan Returns "Internal domains cannot be scanned"

**Symptoms**: Attempting to scan a domain returns a 403 error.

**Cause**: The SSRF guard blocked the target because it matches an internal domain pattern.

**Solution**:

The blocked domain list includes `localhost`, `metadata`, `kubernetes`, `redis`, and other internal infrastructure names. Ensure you are scanning a public, external domain. If you believe a legitimate domain was incorrectly blocked, review the blocked list in `src/lib/api-security.ts`.

### Scan Returns "Domain does not resolve"

**Symptoms**: The scan fails because DNS resolution returned no records.

**Solution**:

- Verify the domain has valid DNS records: `dig example.com`
- Check for typos in the domain name
- Some domains may use CNAME-only setups (no A/AAAA records directly)

### Scan Results Are Empty

**Symptoms**: A scan completes with zero findings.

**Possible causes**:

1. The target has no identifiable security issues (unlikely for most domains)
2. Network connectivity issues prevented the scan from reaching the target
3. DNS resolution failed silently during the scan

**Solution**:

- Check the scan log for errors
- Try scanning a known domain like `example.com` to verify the engine works
- Check network connectivity from the server: `curl -I https://target.com`

### Scan Takes Too Long

**Symptoms**: Scans take several minutes or timeout.

**Solution**:

- Full scans run 15+ parallel checks. Timeout for individual operations is typically 5-10 seconds
- Network latency to the target increases total scan time
- Port scanning checks many ports sequentially with timeouts
- Use `quick` scan type for faster results (DNS + HTTP headers only)

### Scan Stream Not Receiving Updates

**Symptoms**: The streaming endpoint (`/api/scan/stream`) does not send events.

**Solution**:

- Ensure the client supports Server-Sent Events (EventSource)
- Check that the domain parameter is included in the query string
- Verify the scan is actually running (check scan status in the database)

---

## Performance Issues

### High Memory Usage

**Symptoms**: The Node.js process uses excessive memory (>1.5 GB).

**Solution**:

```bash
# Check memory usage
node -e "console.log(process.memoryUsage())"

# The rate limit store caps at 50,000 entries
# If exceeded, the cleanup should trigger automatically

# Restart the process to clear memory
sudo systemctl restart reconpro
```

### Slow API Response Times

**Symptoms**: API endpoints take >500ms to respond.

**Solution**:

- Check database query performance with Prisma logging (enabled in development)
- Add `@@index` to frequently queried fields in the schema
- Use pagination for large result sets
- Check if the server is resource-constrained (CPU, memory, disk I/O)

### Slow Dashboard Loading

**Symptoms**: The dashboard overview page takes several seconds to render.

**Solution**:

- The overview page fetches data from multiple API endpoints
- Each endpoint runs separate database queries
- Use server-side rendering to reduce client-side waterfall requests
- Consider adding summary/cached data for the overview

---

## Deployment Issues

### VPS Deployment: Service Won't Start

**Symptoms**: `systemctl start reconpro` fails.

**Solution**:

```bash
# Check service logs
journalctl -u reconpro -n 50

# Common issues:
# 1. Missing .env file
ls -la /opt/reconpro/.env

# 2. Missing standalone output
ls -la /opt/reconpro/.next/standalone/server.js

# 3. Permission issues
sudo chown -R reconpro:reconpro /opt/reconpro
```

### Railway Deployment: Database Lost on Redeploy

**Symptoms**: All data disappears after each deployment.

**Solution**: Railway's ephemeral filesystem does not persist between deployments. You must add a persistent volume mounted at `/app/db` and set `DATABASE_URL=file:/app/db/reconpro.db`.

### Render Deployment: Health Check Failing

**Symptoms**: Render shows the service as unhealthy.

**Solution**:

- Verify the health check path is `/api/health`
- Ensure the application is listening on the correct port (check `PORT` env var)
- Check Render logs for startup errors

### Fly.io: Volume Not Mounted

**Symptoms**: Application starts but database operations fail.

**Solution**:

```bash
# Verify volume exists
fly volumes list

# Create volume if missing
fly volumes create reconpro_data --size 5

# Verify mount in fly.toml
cat fly.toml | grep mounts
```

### Kubernetes: SQLite PVC Issues

**Symptoms**: Pods fail to start or database operations fail.

**Solution**:

- Verify the PVC exists: `kubectl get pvc`
- Check the PVC status: `kubectl describe pvc reconpro-db-pvc`
- PVC with `ReadWriteOnce` access mode requires all pods on the same node
- Consider reducing replicas to 1 for SQLite workloads

---

## Docker Issues

### Container Exits Immediately

**Symptoms**: Docker container starts and stops within seconds.

**Solution**:

```bash
# Check container logs
docker logs reconpro

# Common causes:
# 1. Missing DATABASE_URL environment variable
docker run -e DATABASE_URL=file:/app/db/reconpro.db ...

# 2. Port conflict
docker run -p 3001:3000 ...

# 3. Database directory not writable
docker run -v reconpro-db:/app/db ...
```

### Database Not Persisting

**Symptoms**: Data is lost when the container is recreated.

**Solution**: Ensure the volume is mounted correctly:

```bash
# Create a named volume
docker volume create reconpro-db

# Mount it
docker run -v reconpro-db:/app/db ...
```

---

## Network Issues

### Cannot Reach External Targets

**Symptoms**: Scans fail to resolve DNS or connect to targets.

**Solution**:

```bash
# Check DNS resolution from the server
dig example.com

# Check outbound connectivity
curl -I https://example.com

# Check firewall rules
sudo iptables -L -n

# Check if outbound HTTPS (443) and DNS (53) are allowed
```

### Reverse Proxy Returns 502 Bad Gateway

**Symptoms**: Nginx returns 502 when accessing the application.

**Solution**:

```bash
# Check if the application is running
curl http://127.0.0.1:3000/api/health

# Check Nginx configuration
sudo nginx -t

# Check upstream configuration matches the app port
# In reconpro.conf: upstream reconpro { server 127.0.0.1:3000; }
```

### WebSocket Connections Fail

**Symptoms**: Streaming scan results do not work through the reverse proxy.

**Solution**:

Verify Nginx is configured for WebSocket upgrade:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## API Issues

### 429 Rate Limit Exceeded

**Symptoms**: API returns 429 with `Retry-After` header.

**Solution**:

- Wait for the `Retry-After` duration (in seconds)
- The rate limit store has a hard cap of 50,000 entries. If you are making requests from many different IPs and the cap is reached, new requests are rejected
- Increase `MAX_RATE_LIMIT_ENTRIES` in `src/lib/api-security.ts` if needed (trades memory for capacity)

### 403 Forbidden on Scan Target

**Symptoms**: Scan request returns 403.

**Solution**: The SSRF guard rejected the target. Common reasons:

- Domain is in the blocked list (localhost, metadata, kubernetes, etc.)
- Domain resolves to a private IP address
- Domain is in a special-use TLD (.local, .internal, .onion)
- Input format is invalid (contains protocols, paths, special characters)

### 500 Internal Server Error

**Symptoms**: API returns 500 with a request ID.

**Solution**:

In production, error details are suppressed. Check the server logs:

```bash
# Systemd
journalctl -u reconpro -n 100 --no-pager

# Docker
docker logs reconpro --tail 100

# Dev server
cat dev.log
```

Search for the request ID in the logs to find the corresponding error.

---

## Frontend Issues

### Blank Page After Login

**Symptoms**: After successful login, the browser shows a blank page.

**Solution**:

- Check browser console for JavaScript errors
- Verify the redirect URL is correct
- Check if the middleware is blocking the dashboard route
- Clear browser cookies and try again

### Components Not Rendering

**Symptoms**: UI components appear broken or missing.

**Solution**:

- Check if Tailwind CSS is processing correctly
- Verify that `globals.css` is imported in the root layout
- Run `npm run build` to check for import errors

### CSP Blocking Resources

**Symptoms**: Browser console shows Content Security Policy violations.

**Solution**:

The CSP is strict (`default-src 'self'`). If adding external resources:

- Images: Add the domain to `img-src`
- Scripts: Must use the nonce provided via `X-Content-Security-Policy-Nonce` header
- Styles: `unsafe-inline` is allowed for Tailwind CSS
- Fonts: Add the domain to `font-src`

Update the CSP in `src/middleware.ts`.

---

## Security Header Issues

### Mixed Content Warnings

**Symptoms**: Browser blocks loading HTTP resources on an HTTPS page.

**Solution**:

- The CSP includes `upgrade-insecure-requests` which upgrades HTTP to HTTPS
- Ensure all resource URLs use `https://`
- Check for hardcoded `http://` URLs in components

### HSTS Preload Not Working

**Symptoms**: HSTS preload status is not active.

**Solution**:

- The HSTS header includes `preload` directive
- Submit the domain to the HSTS Preload List at https://hstspreload.org
- The domain must serve HSTS for at least 1 year before preloading
