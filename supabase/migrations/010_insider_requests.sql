-- 010_insider_requests.sql
--
-- Add `insider` boolean to subscriptions table and create the
-- insider_requests table for the insider testing account request form.
--
-- Rollback:
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS insider;
--   DROP TABLE IF EXISTS insider_requests;

-- 1. Add insider flag to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS insider boolean DEFAULT false;

-- 2. Create insider_requests table
CREATE TABLE IF NOT EXISTS insider_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  name          text NOT NULL,
  email         text NOT NULL,
  referrer_name text NOT NULL,
  referral_code text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE insider_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS: users can read their own requests
CREATE POLICY "Users can read own insider requests"
  ON insider_requests FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_insider_requests_user_id
  ON insider_requests(user_id);
