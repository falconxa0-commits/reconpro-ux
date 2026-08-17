# ReconPro v0.2.0 — Rollback Checklist

## Automated Rollback

- [ ] Identify last known-good version (git tag / commit)
- [ ] Stop current deployment
- [ ] Checkout known-good version
- [ ] Rebuild application
- [ ] Restore database backup
- [ ] Restart application
- [ ] Verify health endpoint
- [ ] Run smoke tests

## Manual Rollback

- [ ] Notify all users of maintenance
- [ ] Put application in maintenance mode
- [ ] Stop application process
- [ ] Restore code from backup
- [ ] Restore database from backup
- [ ] Verify data integrity
- [ ] Start application
- [ ] Test critical flows
- [ ] Remove maintenance mode

## Database Rollback

- [ ] Stop application first
- [ ] Restore SQLite file from backup
- [ ] Or run: `npx prisma migrate resolve --rolled-back <migration_name>`
- [ ] Verify schema matches application version
- [ ] Test API endpoints
- [ ] Restart application

## Post-Rollback

- [ ] Investigate root cause
- [ ] Document the incident
- [ ] Notify stakeholders
- [ ] Schedule fix for next release
- [ ] Update monitoring/alerts
