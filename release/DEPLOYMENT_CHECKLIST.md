# ReconPro v0.2.0 — Deployment Checklist

## Pre-Deployment

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] SSL/TLS certificates obtained
- [ ] Domain DNS configured
- [ ] Firewall rules reviewed

## Deployment

- [ ] Pull latest code / checkout tag
- [ ] Install dependencies (`npm ci`)
- [ ] Generate Prisma client (`npx prisma generate`)
- [ ] Run database migrations (`npx prisma db push` or `npx prisma migrate deploy`)
- [ ] Set environment variables
- [ ] Build application (`npm run build`)
- [ ] Start application
- [ ] Verify health endpoint (`/api/health`)
- [ ] Verify HTTPS redirect
- [ ] Verify security headers

## Post-Deployment

- [ ] Test login flow
- [ ] Test registration flow
- [ ] Test dashboard load
- [ ] Test scan execution
- [ ] Test report generation
- [ ] Verify all pages load
- [ ] Check error logs
- [ ] Monitor resource usage
- [ ] Verify backup job runs
- [ ] Confirm monitoring alerts active

## Rollback

- [ ] Stop current deployment
- [ ] Restore previous version
- [ ] Restore database backup
- [ ] Verify health endpoint
- [ ] Run smoke tests
- [ ] Notify team
