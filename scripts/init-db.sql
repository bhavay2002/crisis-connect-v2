-- ─────────────────────────────────────────────────────────────────────────────
-- CrisisConnect — PostgreSQL initialization script
-- Runs once when the postgres container is first created (docker compose up).
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Performance settings for the crisis workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost = '1.1';

-- Allow ORM migrations to run
GRANT ALL PRIVILEGES ON DATABASE crisisconnect TO crisis;

-- Read-only reporting role (for analytics, Grafana data source)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crisisconnect_reader') THEN
    CREATE ROLE crisisconnect_reader LOGIN PASSWORD 'reader_password_change_me';
  END IF;
END $$;

GRANT CONNECT ON DATABASE crisisconnect TO crisisconnect_reader;
GRANT USAGE ON SCHEMA public TO crisisconnect_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO crisisconnect_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO crisisconnect_reader;
