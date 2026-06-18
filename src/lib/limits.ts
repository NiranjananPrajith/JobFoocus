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

import type { Currency } from '@/lib/region';

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

/** Monthly price in Euro, for UI badges. */
export const TIER_PRICE_EUR: Record<Tier, number> = {
  free: 0,
  pro:  4.5,
  max:  11,
};

/** Monthly price in Indian Rupees, for UI badges. */
export const TIER_PRICE_INR: Record<Tier, number> = {
  free: 0,
  pro:  500,
  max:  1250,
};

/**
 * Format a tier price for display by currency. Returns "$5", "€4.5",
 * or "₹500".
 */
export function formatTierPriceCurrency(tier: Tier, currency: Currency): string {
  if (tier === 'free') {
    return currency === 'INR' ? '₹0' : `${currency === 'USD' ? '$' : '€'}0`;
  }
  const price =
    currency === 'INR' ? TIER_PRICE_INR[tier]
    : currency === 'EUR' ? TIER_PRICE_EUR[tier]
    : TIER_PRICE_USD[tier];
  return currency === 'INR' ? `₹${price}` : `${currency === 'USD' ? '$' : '€'}${price}`;
}

/**
 * Legacy wrapper — used by NavBar and account page for backward compat.
 * Delegates to formatTierPriceCurrency.
 */
export function formatTierPrice(tier: Tier, region: 'IN' | 'OTHER' | 'EEA'): string {
  const currency: Currency = region === 'IN' ? 'INR' : region === 'EEA' ? 'EUR' : 'USD';
  return formatTierPriceCurrency(tier, currency);
}

/**
 * Resolve a tier from a Stripe price ID. The webhook stores the price ID
 * on the subscriptions row, so this is the inverse — given a price ID,
 * what tier is the user on?
 *
 * Checks both USD and EUR price IDs. Reads the env at call time so the
 * function works in dev (no env = always free) and in prod.
 */
export function tierFromPriceId(priceId: string | null | undefined): Tier {
  if (!priceId) return 'free';
  // USD price IDs
  const proUsd = process.env.STRIPE_PRICE_ID_PRO;
  const maxUsd = process.env.STRIPE_PRICE_ID_MAX;
  if (proUsd && priceId === proUsd) return 'pro';
  if (maxUsd && priceId === maxUsd) return 'max';
  // EUR price IDs
  const proEur = process.env.STRIPE_PRICE_ID_PRO_EUR;
  const maxEur = process.env.STRIPE_PRICE_ID_MAX_EUR;
  if (proEur && priceId === proEur) return 'pro';
  if (maxEur && priceId === maxEur) return 'max';
  return 'free';
}

/**
 * Resolve a tier from a Razorpay plan ID. Same logic as tierFromPriceId
 * but reads the Razorpay env vars.
 */
export function tierFromRazorpayPlanId(planId: string | null | undefined): Tier {
  if (!planId) return 'free';
  const pro = process.env.RAZORPAY_PLAN_ID_PRO;
  const max = process.env.RAZORPAY_PLAN_ID_MAX;
  if (pro && planId === pro) return 'pro';
  if (max && planId === max) return 'max';
  return 'free';
}

export function isPaidTier(tier: Tier): boolean {
  return tier !== 'free';
}

/**
 * Map a subscription row to the effective tier. A user is on a paid
 * tier only if their subscription status is 'active' or 'trialing'.
 * Other statuses (past_due, canceled, incomplete, null) all resolve
 * to 'free' so the cap is enforced as soon as the PSP stops taking
 * money.
 *
 * 'cancel_at_period_end' is intentionally NOT demoted to free — they
 * keep access until current_period_end, at which point the webhook
 * fires customer.subscription.deleted and the row updates to
 * status='canceled'.
 *
 * Supports both Stripe (price_id) and Razorpay (plan_id) — whichever
 * is set is used to resolve the tier.
 */
export function tierFromSubscription(sub: {
  status: string | null;
  stripe_price_id: string | null;
  razorpay_plan_id: string | null;
} | null | undefined): Tier {
  if (!sub) return 'free';
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  // Try Razorpay first (newer provider), fall back to Stripe.
  if (sub.razorpay_plan_id) return tierFromRazorpayPlanId(sub.razorpay_plan_id);
  return tierFromPriceId(sub.stripe_price_id);
}
