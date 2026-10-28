-- Apply before deploying registration consent where TypeORM synchronize=false.
-- Existing accounts retain NULL: no retroactive acceptance is fabricated.
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_consent jsonb;
