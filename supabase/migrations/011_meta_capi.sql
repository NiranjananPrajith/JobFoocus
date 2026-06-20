-- Migration 011: Meta Conversions API — add meta_purchase_event_id column
-- for storing the dedup event_id set by webhooks, read by the client.

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS meta_purchase_event_id text;

COMMENT ON COLUMN subscriptions.meta_purchase_event_id IS 'Meta CAPI Purchase event_id for browser↔server deduplication. Set by Stripe/Razorpay webhook, read and cleared by the /account page client.';
