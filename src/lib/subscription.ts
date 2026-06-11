// lib/subscription.ts
//
// Server-side helpers for reading the current user's Stripe subscription
// and resolving their tier + limits. All calls use the service-role
// client because the webhook writes here and we want a single read
// surface; RLS would just add a network round-trip with no security
// benefit (we filter by user_id ourselves).

import { createServiceClient } from '@/lib/supabase-utils/service';
import { getStripe } from '@/lib/stripe';
import { tierFromSubscription, type Tier, type TierLimits, TIER_LIMITS } from '@/lib/limits';

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
}

/**
 * Returns the user's subscription row, or null if they've never had one.
 * NOTE: when the user is on Free (no Stripe history), there is no row at
 * all — this function returns null in that case, which is correct.
 */
export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[subscription] getSubscription failed:', error);
    return null;
  }
  return data as SubscriptionRow | null;
}

export interface EffectiveTier {
  tier: Tier;
  limits: TierLimits;
  /** The raw subscription row, or null for free users. */
  subscription: SubscriptionRow | null;
}

/**
 * One-shot helper used by every enforcement point: read the subscription
 * row, resolve the tier, and return the limits in a single object. If
 * anything goes wrong, fall back to free — never to "no limit". The
 * principle is fail-closed: if we can't determine the tier, treat the
 * user as free so the cap is enforced.
 */
export async function getEffectiveTier(userId: string): Promise<EffectiveTier> {
  const subscription = await getSubscription(userId);
  const tier = tierFromSubscription(subscription);
  return {
    tier,
    limits: TIER_LIMITS[tier],
    subscription,
  };
}

/**
 * Pull the latest subscription state for this user directly from
 * Stripe and mirror it into the local DB. Used by /account on every
 * page load to self-heal from missed or delayed webhooks.
 *
 * Why we need this: the /account UI surfaces `cancel_at_period_end`
 * so a user who just cancelled sees "Expires on <date>" instead of
 * "Renews on <date>". That field is written by the Stripe webhook on
 * `customer.subscription.updated`, but the webhook is a fire-and-
 * forget delivery — it can be delayed, retried, or missed entirely
 * (especially in dev where there's no Stripe CLI forwarding). The
 * DB then lags behind Stripe, and the page shows a wrong "Renews on"
 * to a user who has actually cancelled.
 *
 * This function closes that gap. On every /account load we ask
 * Stripe for the current state, upsert it, and render from the
 * reconciled row. The DB heals on the next visit, so the next page
 * load shows the truth even if the Stripe API is later unavailable.
 *
 * Returns the reconciled row, or `null` if:
 *   - the user has no `stripe_customer_id` (never subscribed — Free)
 *   - Stripe has no subscription for that customer (rare: dashboard
 *     cancel, customer deletion)
 *
 * Throws on Stripe API errors or DB upsert failures so the caller
 * can decide whether to fall back to the local `getSubscription()`
 * row. /account catches and falls back; other call sites (e.g.,
 * /api/usage/check) should keep using `getEffectiveTier` to avoid
 * adding Stripe API latency to enforcement paths.
 */
export async function refreshSubscriptionFromStripe(
  userId: string
): Promise<SubscriptionRow | null> {
  const supabase = createServiceClient();

  // Step 1: look up the user's Stripe customer ID. We could read the
  // full row, but we only need the customer ID to start the Stripe
  // call — keep this query narrow.
  const { data: existing, error: existingError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    // Surfacing this — if the DB is down, the caller should know.
    throw existingError;
  }

  const customerId = existing?.stripe_customer_id;
  if (!customerId) {
    // No Stripe customer — user is on Free, nothing to reconcile.
    return null;
  }

  // Step 2: ask Stripe. `status: 'all'` includes canceled
  // subscriptions, so we can detect a fully-canceled state and
  // surface it to the page. The default sort is `created desc`, so
  // `.data[0]` is the most recent subscription — the one we care
  // about even if the user has historical canceled subscriptions
  // from past billing cycles.
  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 1,
  });

  if (subs.data.length === 0) {
    // No subscription in Stripe. The customer was deleted or the
    // subscription never landed — return null and let the page
    // render the Free tier. We deliberately don't delete the local
    // row here; that's a destructive action and the next webhook
    // will tell us what's really going on.
    return null;
  }

  const sub = subs.data[0];

  // Step 3: mirror the Stripe state into the DB. The shape mirrors
  // `handleSubscriptionUpsert` in the webhook route — same fields,
  // same column names. If the two ever drift, the webhook is the
  // canonical writer and this function is a self-heal reader.
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const periodEndUnix =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  // Diagnostic: log the pre-upsert state so we can see what Stripe
  // thinks the subscription is. One entry per /account load — fine
  // to keep in production. Grep for `[subscription-reconcile]` in
  // the server logs.
  console.log(
    `[subscription-reconcile] user=${userId} customer=${customerId} ` +
      `subId=${sub.id} status=${sub.status} ` +
      `cancel_at_period_end=${sub.cancel_at_period_end} ` +
      `current_period_end=${currentPeriodEnd}`
  );

  const { data: updated, error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        status: sub.status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (upsertError) {
    throw upsertError;
  }

  return updated as SubscriptionRow;
}
