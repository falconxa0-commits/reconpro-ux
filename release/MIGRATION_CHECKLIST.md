# ReconPro v0.2.0 — Migration Checklist

## SQLite Migrations

- [ ] Verify current database state
- [ ] Backup database file: `cp db/reconpro.db db/reconpro.db.backup.$(date +%Y%m%d%H%M%S)`
- [ ] Review schema changes in prisma/schema.prisma
- [ ] Test migration locally: `npx prisma db push`
- [ ] Verify no data loss
- [ ] Run migration in production: `npx prisma db push`
- [ ] Verify application connects
- [ ] Test all API endpoints
- [ ] Verify reports work
- [ ] Confirm backup is stored securely

## PostgreSQL Migration (if applicable)

- [ ] Backup database: `pg_dump reconpro > backup.sql`
- [ ] Update DATABASE_URL in .env
- [ ] Run: `npx prisma migrate dev --name init`
- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Verify all relations intact
- [ ] Test application connectivity
- [ ] Run seed script (if fresh install)

## Seed Data

- [ ] Run seed script: `npx prisma db seed` (if configured)
- [ ] Verify sample data loaded
- [ ] Verify demo account works
- [ ] Clean up test data if needed
