# Database Security Policies
## Access Control
- All queries use Prisma ORM with parameterized inputs
- No raw SQL without explicit type validation
## Backup Policy
- SQLite: File-level backup via sqlite3 .backup
- PostgreSQL: pg_dump for logical backups
## Encryption
- At-rest: Full-disk encryption (OS level)
- In-transit: TLS for remote database connections
## Retention
- Scan results: 90 days, Audit logs: 1 year, Session data: 30 days
