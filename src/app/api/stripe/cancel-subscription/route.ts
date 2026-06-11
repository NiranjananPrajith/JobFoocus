// POST /api/stripe/cancel-subscription
//
// Schedules the user's subscription to cancel at the end of the
// current billing period. Called by the Autorenew toggle on /account
// when the user flips auto-renew OFF.
//
// The Stripe API exposes two cancel signals: the legacy
// `cancel_at_period_end` boolean and the newer `cancel_at` timestamp.
// The reactivation endpoint (POST /api/stripe/reactivate-subscription)
// is written to clear whichever one Stripe actually set on the live
// subscription, so by symmetry we set the *legacy* boolean here —
// the simplest "cancel at end of current period" call. If we instead
// passed `cancel_at: <period_end_unix>` we'd have to read the period
// end from Stripe first, and the reactivation endpoint would also
// have to be aware of that mode. Keeping both endpoints on
// `cancel_at_period_end` means the on/off pair is symmetric: the
// toggle position is always backed by the same flag.
//
// The webhook (customer.subscription.updated) will eventually
// mirror the change into the local DB, but we also write
// `cancel_at_period_end: true` here so the page is responsive
// before the webhook lands.

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  // Auth: must be a logged-in user. The Stripe subscription is
  // looked up via the user's subscription row, which is keyed by
  // their auth.uid(), so we don't need a request body.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Pull the user's subscription row. We need the Stripe
  // subscription ID to call Stripe, and we want to short-circuit
  // if the row says it's already cancelled (the toggle shouldn't
  // be in the off position and going to off again is idempotent).
  const service = createServiceClient();
  const { data: subscription, error: subError } = await service
    .from('subscriptions')
    .select('stripe_subscription_id, cancel_at_period_end, current_period_end')
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

  if (subscription.cancel_at_period_end) {
    // Already cancelled. Mirror the no-op success behavior of the
    // reactivate endpoint so a double-click on the toggle (rare
    // race while pending was still true) is a no-op rather than a
    // 4xx. The /account page won't show the toggle in the off
    // position in this state, but defense in depth.
    return NextResponse.json({ success: true, alreadyCancelled: true });
  }

  // Retrieve the live subscription from Stripe so we can refresh
  // the period end in our local row (the cancel itself doesn't
  // move it, but the period may have rolled forward between the
  // last webhook and now). This is also where we'd detect a
  // portal-side cancel that the DB hasn't caught up to.
  const stripe = getStripe();
  let livePeriodEnd: string | null = subscription.current_period_end;
  try {
    const live = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );
    const item = live.items.data[0];
    const periodEndUnix =
      (item as unknown as { current_period_end?: number })?.current_period_end ??
      (live as unknown as { current_period_end?: number }).current_period_end;
    if (periodEndUnix) {
      livePeriodEnd = new Date(periodEndUnix * 1000).toISOString();
    }
  } catch (err) {
    // Non-fatal: the cancel itself can still proceed. We just
    // won't refresh the period end in the mirror write.
    console.error('[stripe-cancel] live retrieve failed (continuing):', err);
  }

  // Schedule the cancel. We use the legacy boolean so the
  // reactivation endpoint can clear it symmetrically.
  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    console.error('[stripe-cancel] cancel update failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel' },
      { status: 500 }
    );
  }

  // Mirror to the local DB so the page flips to "Expires on <date>"
  // before the webhook lands. The webhook will overwrite this
  // anyway with whatever Stripe sends back, but the values should
  // agree by then.
  await service
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      current_period_end: livePeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  console.log(
    `[stripe-cancel] subscription scheduled to cancel: user=${user.id} sub=${subscription.stripe_subscription_id} periodEnd=${livePeriodEnd}`
  );

  return NextResponse.json({ success: true });
}
