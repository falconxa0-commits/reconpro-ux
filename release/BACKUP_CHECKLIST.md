# ReconPro v0.2.0 — Backup Checklist

## Database Backups

- [ ] Backup location configured (S3, local, etc.)
- [ ] Backup schedule set (daily minimum)
- [ ] SQLite backup: `cp db/reconpro.db /backups/reconpro.db.$(date +%Y%m%d%H%M%S)`
- [ ] Backup encryption enabled (if applicable)
- [ ] Backup retention policy set (30 days minimum)
- [ ] Backup restoration tested
- [ ] Off-site backup copy verified

## Application Backups

- [ ] Git tag created for release version
- [ ] Source code archived
- [ ] Configuration files backed up
- [ ] Environment variables documented (not the secrets)
- [ ] Docker images tagged and pushed

## Disaster Recovery

- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined
- [ ] Recovery procedure documented
- [ ] Recovery tested at least once
- [ ] Team trained on recovery process
