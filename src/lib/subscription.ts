// lib/subscription.ts
//
// Server-side helpers for reading the current user's Stripe subscription
// and resolving their tier + limits. All calls use the service-role
// client because the webhook writes here and we want a single read
// surface; RLS would just add a network round-trip with no security
// benefit (we filter by user_id ourselves).

import { createServiceClient } from '@/lib/supabase-utils/service';
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
