# Supabase Setup Guide - Gondar Fuel Management System

## Prerequisites
- Supabase account (free tier at supabase.com)
- PostgreSQL 15+ client (psql)

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: gondar-fuel-dev (or production)
   - **Database Password**: Use a strong password (save it!)
   - **Region**: Choose closest to Ethiopia (EU-West recommended)
4. Wait for project to provision (~2 minutes)

## 2. Get Connection Details

From Project Settings > Connection Pooling:
```
Host: db.<project-ref>.supabase.co
Port: 6543
Database: postgres
User: postgres
Password: <your-password>
```

Or use direct connection:
```
Host: <project-ref>.db.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: <your-password>
```

## 3. Enable PostGIS Extension

In Supabase SQL Editor, run:
```sql
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
```

## 4. Run Migration

Option A: Via Supabase SQL Editor
1. Copy contents of `sql/migrations/001_phase1_auth_and_quotas.sql`
2. Paste into SQL Editor
3. Click "Run"

Option B: Via psql CLI
```bash
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" -f sql/migrations/001_phase1_auth_and_quotas.sql
```

## 5. Configure Row Level Security (RLS)

Run this in SQL Editor:

```sql
-- Enable RLS on tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Vehicles: Users can only access their own
CREATE POLICY "Users can manage own vehicles" ON vehicles
    FOR ALL USING (auth.uid() = user_id);

-- Daily quotas: Users can read their own
CREATE POLICY "Users can read own quota" ON daily_quotas
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all quotas" ON daily_quotas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );
```

## 6. Storage Bucket Setup

1. Go to Storage in Supabase dashboard
2. Create bucket: `verification-docs`
3. Set as "Public" bucket (for document access)
4. Or create "Private" bucket with signed URLs

```sql
-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## 7. Environment Variables

Create `.env` file:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-key>
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your-password>
```

## 8. pg_cron for Automatic Quota Reset

In Supabase SQL Editor:
```sql
SELECT cron.schedule('reset-quotas', '0 21 * * *', 'SELECT reset_daily_quotas()');
```

This runs at 21:00 UTC = 00:00 Ethiopia Time (EAT).

## Troubleshooting

### Connection Refused
- Check if your IP is whitelisted in Supabase settings
- Use Connection Pooling port (6543) for better compatibility

### Migration Fails
- Ensure you're using PostgreSQL 15+
- Check for duplicate column errors (IF NOT EXISTS handles this)

### RLS Issues
- Temporarily disable: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`
- Check auth.uid() returns correct user
