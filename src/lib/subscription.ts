// lib/subscription.ts
//
// Server-side helpers for reading the current user's Stripe subscription
// and resolving their tier + limits. All calls use the service-role
// client because the webhook writes here and we want a single read
// surface; RLS would just add a network round-trip with no security
// benefit (we filter by user_id ourselves).

import { createServiceClient } from '@/lib/supabase-utils/service';
import { getStripe } from '@/lib/stripe';
import { getRazorpay } from '@/lib/razorpay';
import { tierFromSubscription, type Tier, type TierLimits, TIER_LIMITS } from '@/lib/limits';
import type { Currency } from '@/lib/region';

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  razorpay_plan_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  currency: Currency | null;
  updated_at: string;
}

/**
 * Infer which payment provider owns this subscription row. Razorpay
 * is identified by the presence of razorpay_subscription_id; Stripe
 * is the legacy default.
 */
export function subscriptionProvider(
  row: SubscriptionRow | null
): 'stripe' | 'razorpay' | null {
  if (!row) return null;
  if (row.razorpay_subscription_id) return 'razorpay';
  if (row.stripe_subscription_id) return 'stripe';
  return null;
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
  // First-line diagnostic: if this line never appears in the Vercel
  // logs, the function itself isn't being called (Vercel cached an
  // old build of the lib even after a page-side deploy). If it does
  // appear but the pre-upsert log below doesn't, the function is
  // returning null or throwing before reaching the Stripe call.
  console.log(`[subscription-reconcile] entering user=${userId}`);

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
  const rawCurrency = (item?.price as any)?.currency as string | undefined;
  const currency: 'USD' | 'EUR' | null =
    rawCurrency === 'usd' ? 'USD'
    : rawCurrency === 'eur' ? 'EUR'
    : null;
  const periodEndUnix =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  // Stripe's cancel signal lives in TWO places depending on API
  // version and how the cancel was issued. The legacy
  // `cancel_at_period_end` boolean is what older integrations read;
  // newer Stripe code paths (and the customer portal's
  // "cancel at period end" button in current API versions) write
  // the actual cancel time into the `cancel_at` timestamp field and
  // leave `cancel_at_period_end` as `false`. We need to read BOTH
  // and treat either as "the subscription is scheduled to cancel".
  //
  // Confirmed live bug: a user cancelled in the dashboard, the
  // dashboard showed "Scheduled to cancel on Jul 11, 6:44 PM", but
  // our reconcile was reading `cancel_at_period_end: false` and the
  // page rendered "Renews on Jul 11" — wrong. The actual cancel was
  // in `cancel_at`.
  //
  // The date we display on /account is `current_period_end`, which
  // is the right answer for the "cancel at period end" case (the
  // common one). For a "cancel at a specific future date" use, the
  // user would want to see `cancel_at` instead — but we don't model
  // that today and the dashboard already shows it under
  // "Cancellation details".
  const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;
  const cancelAtUnix = (sub as unknown as { cancel_at?: number | null })
    .cancel_at;
  const isScheduledToCancel = cancelAtPeriodEnd || cancelAtUnix != null;

  // Diagnostic: log the pre-upsert state so we can see what Stripe
  // thinks the subscription is. One entry per /account load — fine
  // to keep in production. Grep for `[subscription-reconcile]` in
  // the server logs.
  console.log(
    `[subscription-reconcile] user=${userId} customer=${customerId} ` +
      `subId=${sub.id} status=${sub.status} ` +
      `cancel_at_period_end=${cancelAtPeriodEnd} ` +
      `cancel_at=${cancelAtUnix} ` +
      `isScheduledToCancel=${isScheduledToCancel} ` +
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
        cancel_at_period_end: isScheduledToCancel,
        currency,
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

/**
 * Pull the latest subscription state from Razorpay and mirror it
 * into the local DB. Mirror of refreshSubscriptionFromStripe but for
 * Razorpay subscriptions. Only runs if the user has a razorpay_customer_id.
 */
export async function refreshSubscriptionFromRazorpay(
  userId: string
): Promise<SubscriptionRow | null> {
  console.log(`[subscription-reconcile-razorpay] entering user=${userId}`);

  const supabase = createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from('subscriptions')
    .select('razorpay_customer_id, razorpay_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) throw existingError;

  const razorpaySubId = existing?.razorpay_subscription_id;
  if (!razorpaySubId) return null;

  const razorpay = getRazorpay();
  let sub: any;
  try {
    sub = await razorpay.subscriptions.fetch(razorpaySubId);
  } catch (err) {
    console.error('[subscription-reconcile-razorpay] fetch failed:', err);
    return null;
  }

  // Map Razorpay status to our status vocabulary.
  const statusMap: Record<string, string> = {
    active: 'active',
    authenticated: 'trialing',
    created: 'incomplete',
    completed: 'canceled',
    cancelled: 'canceled',
    halted: 'past_due',
    paused: 'past_due',
  };
  const status = statusMap[sub.status as string] ?? sub.status ?? 'active';

  const periodEndUnix = sub.current_end;
  const currentPeriodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  const isScheduledToCancel = sub.cancel_at_cycle_end === 1;

  console.log(
    `[subscription-reconcile-razorpay] user=${userId} ` +
      `subId=${razorpaySubId} status=${sub.status} ` +
      `cancel_at_cycle_end=${sub.cancel_at_cycle_end} ` +
      `current_period_end=${currentPeriodEnd}`
  );

  const { data: updated, error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        razorpay_customer_id: existing?.razorpay_customer_id ?? null,
        razorpay_subscription_id: razorpaySubId,
        razorpay_plan_id: sub.plan_id ?? null,
        status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: isScheduledToCancel,
        currency: 'INR',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (upsertError) throw upsertError;

  return updated as SubscriptionRow;
}
