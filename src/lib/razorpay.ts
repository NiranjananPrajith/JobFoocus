// lib/razorpay.ts
//
// Server-side Razorpay SDK singleton. Mirrors the Stripe singleton in
// lib/stripe.ts. Server-only — never import from a 'use client' file.

import Razorpay from 'razorpay';

let cached: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (cached) return cached;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env (server-side only).'
    );
  }

  cached = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  return cached;
}

/** Resolve the configured Razorpay plan ID for a given tier. */
export function razorpayPlanIdForTier(tier: 'pro' | 'max'): string {
  const id =
    tier === 'pro'
      ? process.env.RAZORPAY_PLAN_ID_PRO
      : process.env.RAZORPAY_PLAN_ID_MAX;
  if (!id) {
    throw new Error(
      `RAZORPAY_PLAN_ID_${tier.toUpperCase()} is not set in .env`
    );
  }
  return id;
}
