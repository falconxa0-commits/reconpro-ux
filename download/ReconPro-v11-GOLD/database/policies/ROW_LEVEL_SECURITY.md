# Database Security Policies

## Access Control
- All queries use Prisma ORM with parameterized inputs
- No raw SQL without explicit type validation
- Row-level filtering via Prisma middleware

## Backup Policy
- SQLite: File-level backup via `sqlite3 .backup`
- PostgreSQL: `pg_dump` for logical backups
- Recommended: Daily automated backups

## Encryption
- At-rest: Full-disk encryption (OS level)
- In-transit: TLS for remote database connections
- SQLite: Consider SQLCipher for encrypted databases

## Retention
- Scan results: 90 days default
- Audit logs: 1 year
- Session data: 30 days
