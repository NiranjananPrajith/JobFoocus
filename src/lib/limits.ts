// lib/limits.ts
//
// Single source of truth for tier → daily-limit mapping. Imported by:
//   - the client (AddJobModal, document editor, /account page) for UX
//     hints, the upgrade prompt, and the live usage bars.
//   - the server (/api/usage/* and the edit-document gate) for the actual
//     enforcement check.
//
// Pure constants — no I/O, no environment lookups. The Stripe price-id →
// tier mapping lives here too so the server can resolve tier from a
// subscription row without re-reading the env every time.

export type Tier = 'free' | 'pro' | 'max';

export interface TierLimits {
  /** Max jobs the user can add per UTC day. */
  jobs: number;
  /** Max document edits the user can make per UTC day. */
  edits: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { jobs: 5,   edits: 25 },
  pro:  { jobs: 25,  edits: 150 },
  max:  { jobs: 250, edits: 500 },
};

/** Display label for the tier in UI. "Max" is the marketing name. */
export const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  pro:  'Pro',
  max:  'Max',
};

/** Monthly price in whole US dollars, for UI badges. */
export const TIER_PRICE_USD: Record<Tier, number> = {
  free: 0,
  pro:  5,
  max:  12,
};

/**
 * Resolve a tier from a Stripe price ID. The webhook stores the price ID
 * on the subscriptions row, so this is the inverse — given a price ID,
 * what tier is the user on?
 *
 * Reads the env at call time so the function works in dev (no env =
 * always free) and in prod. We import this from server-only code, so
 * reading process.env here is fine.
 */
export function tierFromPriceId(priceId: string | null | undefined): Tier {
  if (!priceId) return 'free';
  const pro = process.env.STRIPE_PRICE_ID_PRO;
  const max = process.env.STRIPE_PRICE_ID_MAX;
  if (pro && priceId === pro) return 'pro';
  if (max && priceId === max) return 'max';
  return 'free';
}

export function isPaidTier(tier: Tier): boolean {
  return tier !== 'free';
}

/**
 * Map a subscription row to the effective tier. A user is on a paid
 * tier only if their subscription status is 'active' or 'trialing'.
 * Other statuses (past_due, canceled, incomplete, null) all resolve
 * to 'free' so the cap is enforced as soon as Stripe stops taking
 * money.
 *
 * 'cancel_at_period_end' is intentionally NOT demoted to free — they
 * keep access until current_period_end, at which point the webhook
 * fires customer.subscription.deleted and the row updates to
 * status='canceled'.
 */
export function tierFromSubscription(sub: {
  status: string | null;
  stripe_price_id: string | null;
} | null | undefined): Tier {
  if (!sub) return 'free';
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  return tierFromPriceId(sub.stripe_price_id);
}
