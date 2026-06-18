// lib/stripe.ts
//
// Server-side Stripe SDK singleton. We use the latest API version
// (2026-05-27.dahlia) explicitly so we don't drift with the SDK's
// default. Server-only — never import from a 'use client' file.

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env (server-side only).'
    );
  }

  // The apiVersion type is a narrow union that the SDK doesn't
  // re-export from its root entry. The cast to `any` here is
  // isolated to the constructor config — it's a one-line tax for
  // pinning the version. The version string itself is documented
  // in the SDK's `apiVersion.d.ts`.
  cached = new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,
    typescript: true,
    appInfo: {
      name: 'JobFoocus',
      version: '1.0.0',
    },
  });
  return cached;
}

/** Resolve the configured Stripe price ID for a given tier (USD). */
export function priceIdForTier(tier: 'pro' | 'max'): string {
  const id =
    tier === 'pro'
      ? process.env.STRIPE_PRICE_ID_PRO
      : process.env.STRIPE_PRICE_ID_MAX;
  if (!id) {
    throw new Error(`STRIPE_PRICE_ID_${tier.toUpperCase()} is not set in .env`);
  }
  return id;
}

/**
 * Resolve the configured Stripe price ID for a given tier + currency.
 * Stripe requires separate products for each currency, so USD and EUR
 * have distinct env vars.
 */
export function stripePriceIdForTier(
  tier: 'pro' | 'max',
  currency: 'USD' | 'EUR',
): string {
  if (currency === 'EUR') {
    const id =
      tier === 'pro'
        ? process.env.STRIPE_PRICE_ID_PRO_EUR
        : process.env.STRIPE_PRICE_ID_MAX_EUR;
    if (!id) {
      throw new Error(
        `STRIPE_PRICE_ID_${tier.toUpperCase()}_EUR is not set in .env`
      );
    }
    return id;
  }
  return priceIdForTier(tier);
}
