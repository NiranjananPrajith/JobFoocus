-- Job Foocus: Razorpay subscription columns
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor
--
-- Adds three nullable columns to the existing `subscriptions` table for
-- Razorpay payment provider support. Existing Stripe rows are unaffected
-- (all new columns default to NULL).
--
-- The "provider" for a row is inferred at read time:
--   razorpay_subscription_id IS NOT NULL  →  Razorpay
--   otherwise                              →  Stripe (legacy default)
--
-- ROLLBACK: ALTER TABLE subscriptions DROP COLUMN razorpay_customer_id,
--           DROP COLUMN razorpay_subscription_id, DROP COLUMN razorpay_plan_id;

alter table subscriptions
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text,
  add column if not exists razorpay_plan_id text;

create index if not exists subscriptions_razorpay_subscription_id_idx
  on subscriptions(razorpay_subscription_id);

-- ============================================================
-- ROLLBACK SECTION
-- ============================================================
--
-- drop index if exists subscriptions_razorpay_subscription_id_idx;
-- alter table subscriptions drop column if exists razorpay_plan_id;
-- alter table subscriptions drop column if exists razorpay_subscription_id;
-- alter table subscriptions drop column if exists razorpay_customer_id;
