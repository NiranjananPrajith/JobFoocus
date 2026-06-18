-- Job Foocus: Add currency column to subscriptions table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor
--
-- Adds a nullable `currency` column to the existing `subscriptions` table.
-- Stores the currency the user is actually paying in ('USD', 'EUR', or 'INR').
-- Legacy rows (before this migration) have NULL — treat as USD for display.
--
-- The column is populated by the webhook when a subscription is created/updated:
--   Stripe: reads sub.items.data[0].price.currency from the Stripe event
--   Razorpay: hardcodes 'INR' (Razorpay is always INR)
--
-- ROLLBACK: ALTER TABLE subscriptions DROP COLUMN currency;

alter table subscriptions
  add column if not exists currency text;

-- ============================================================
-- ROLLBACK SECTION
-- ============================================================
--
-- alter table subscriptions drop column if exists currency;
