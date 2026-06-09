// POST /api/stripe/create-checkout-session
//
// Creates a Stripe Checkout Session in subscription mode for one of our
// two price IDs. The user clicks "Upgrade to Pro" on /pricing, the
// client POSTs `{ priceId }` (or, by tier name), and we return a URL
// that the client should redirect to.
//
// Auth required: the session's `customer` is keyed to the logged-in
// user via `stripe_customer_id` on the `subscriptions` row (created
// lazily on first checkout).
//
// We intentionally do NOT pass `payment_method_types` — Stripe selects
// the eligible methods dynamically from the Dashboard configuration,
// which is what the platform best-practices doc requires.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { getStripe, priceIdForTier } from '@/lib/stripe';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { priceId?: string; tier?: 'pro' | 'max' } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Resolve the price ID. Accept either an explicit `priceId` (advanced
  // path — useful for A/B testing or future A/B pricing) or a `tier`
  // name (the simple path the UI uses).
  let priceId: string;
  try {
    if (body.priceId) {
      priceId = body.priceId;
    } else if (body.tier === 'pro' || body.tier === 'max') {
      priceId = priceIdForTier(body.tier);
    } else {
      return NextResponse.json(
        { error: 'Body must include { tier: "pro" | "max" } or { priceId }' },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }

  // Find or create the Stripe customer for this user. We store the
  // customer ID on the subscriptions row so the webhook can correlate
  // events back to the user.
  //
  // The stored ID is treated as untrusted. If the server's Stripe
  // account has changed since the row was written (e.g., the env was
  // swapped from live → test, or vice versa), the old ID points at a
  // customer in a different account and Stripe will return
  // `resource_missing` when we try to use it. Verify with a cheap
  // `retrieve` and create a fresh customer if it's gone.
  const service = createServiceClient();
  const { data: subRow } = await service
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const stripe = getStripe();
  let customerId: string | null = null;

  if (subRow?.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(subRow.stripe_customer_id);
      // `customers.retrieve` returns a `DeletedCustomer` if the customer
      // was deleted in Stripe; that shape has `deleted: true` and no id.
      if (existing && !(existing as any).deleted) {
        customerId = existing.id;
      }
    } catch (err) {
      // resource_missing = customer doesn't exist in the current
      // Stripe account. Any other error (network, 5xx) we let bubble —
      // it's not a "stale ID" problem and the caller wants to know.
      const code = (err as any)?.raw?.code;
      if (code !== 'resource_missing') throw err;
      // Fall through: customerId stays null → we'll create a new one.
      console.warn(
        `[stripe] stored customer ${subRow.stripe_customer_id} not found in current account, recreating`
      );
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { user_id: user.id },
      email: user.email ?? undefined,
    });
    customerId = customer.id;

    // Seed (or refresh) the subscriptions row with the new customer.
    // The webhook will fill in subscription_id/price_id/status on
    // checkout.session.completed.
    await service.from('subscriptions').upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        status: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  const origin = request.headers.get('origin') ?? '';
  // Fall back to a known dev host if the request came from somewhere
  // we don't recognize (e.g., curl, server-to-server test).
  const baseUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Dynamic payment methods — never set payment_method_types here.
      // Stripe picks the right set from the Dashboard config.
      success_url: `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      // Store the user_id on the session too, as a belt-and-suspenders
      // backstop in case the customer.metadata is ever lost.
      metadata: { user_id: user.id },
      // Allow promo codes entered at checkout (no code required).
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] create-checkout-session failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
