# Database Setup - Gondar Fuel Management System

## Local PostgreSQL Setup

### 1. Install PostgreSQL 15+

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-postgis
```

### 2. Create Database

```bash
createdb gondar_fuel_dev
psql gondar_fuel_dev -c "CREATE EXTENSION postgis;"
psql gondar_fuel_dev -c "CREATE EXTENSION \"uuid-ossp\";"
```

### 3. Run Migrations

```bash
psql gondar_fuel_dev -f sql/migrations/001_phase1_auth_and_quotas.sql
```

### 4. Verify Tables Created

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Expected tables:
- users (updated)
- vehicles
- document_uploads
- daily_quotas
- fuel_transactions
- otp_attempts
- sessions
- audit_log
- quota_defaults

## Connecting to Supabase

```bash
# Using direct connection
psql "postgresql://postgres:<password>@<project-ref>.db.supabase.co:5432/postgres"

# Using connection pooling (recommended)
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:6543/postgres"
```

## Troubleshooting Common Issues

### "psql: command not found"
Install PostgreSQL client: `brew install postgresql@15` (macOS) or `sudo apt install postgresql-client` (Ubuntu)

### "Connection refused"
- Ensure PostgreSQL is running: `brew services start postgresql@15`
- Check port (default 5432)
- Check pg_hba.conf allows connections

### "Database does not exist"
Create it: `createdb gondar_fuel_dev`

### "Extension not found"
Run: `CREATE EXTENSION uuid-ossp;` and `CREATE EXTENSION postgis;`

### "Permission denied"
Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE gondar_fuel_dev TO your_user;`

## Development Workflow

1. Make changes to migration SQL file
2. Test locally: `psql gondar_fuel_dev -f sql/migrations/001_*.sql`
3. Deploy to Supabase via SQL Editor or CLI
4. For production, create new migration files (002_*, 003_*, etc.)
