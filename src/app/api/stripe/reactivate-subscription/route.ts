// POST /api/stripe/reactivate-subscription
//
// Undoes a "cancel at period end" without forcing the user through
// the customer portal. Called by the "Don't cancel my subscription"
// link on /account when the user has second thoughts.
//
// What "reactivate" means in Stripe terms: clear whichever flag the
// original cancel wrote. Stripe now uses the `cancel_at` timestamp
// for cancellations from the current customer portal; older cancels
// were written to the `cancel_at_period_end` boolean. Setting BOTH
// to false/null is the safe, idempotent answer — it works for
// either cancel style, and is a no-op for subscriptions that are
// already active.
//
// The webhook (customer.subscription.updated) will eventually
// mirror the change into the local DB, but we also write the
// `cancel_at_period_end: false` flag here so the next /account
// load is responsive even if the webhook is delayed.

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  // Auth: must be a logged-in user. The Stripe customer is looked
  // up via the user's subscription row, which is keyed by their
  // auth.uid(), so we don't need a request body.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Pull the user's subscription row. We need the Stripe
  // subscription ID to call Stripe, and we want to short-circuit
  // if the row says it's not cancelled (the link shouldn't even
  // be visible, but defense in depth).
  const service = createServiceClient();
  const { data: subscription, error: subError } = await service
    .from('subscriptions')
    .select('stripe_subscription_id, cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subError) {
    return NextResponse.json(
      { error: 'Failed to read subscription' },
      { status: 500 }
    );
  }

  if (!subscription?.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'No subscription on file' },
      { status: 400 }
    );
  }

  if (!subscription.cancel_at_period_end) {
    return NextResponse.json(
      { error: 'Subscription is not cancelled' },
      { status: 400 }
    );
  }

  // Call Stripe. We clear both cancel flags so the call works
  // regardless of which flag the original cancel wrote.
  const stripe = getStripe();
  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
      cancel_at: null,
    });
  } catch (err) {
    console.error('[stripe] reactivation failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reactivate' },
      { status: 500 }
    );
  }

  // Mirror the change into the local DB so the page is responsive
  // before the webhook lands. The webhook will overwrite this
  // anyway with whatever Stripe sends back, but the values should
  // agree by then.
  await service
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  console.log(
    `[stripe] subscription reactivated: user=${user.id} sub=${subscription.stripe_subscription_id}`
  );

  return NextResponse.json({ success: true });
}
