// POST /api/razorpay/cancel-subscription
//
// Schedules the user's Razorpay subscription to cancel at the end of
// the current billing period. Called by the Autorenew toggle on /account
// when the user flips auto-renew OFF.
//
// Razorpay SDK: subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
//
// Auth required.

import { NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: subscription, error: subError } = await service
    .from('subscriptions')
    .select('razorpay_subscription_id, cancel_at_period_end, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: 'Failed to read subscription' }, { status: 500 });
  }

  if (!subscription?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No subscription on file' }, { status: 400 });
  }

  if (subscription.cancel_at_period_end) {
    return NextResponse.json({ success: true, alreadyCancelled: true });
  }

  const razorpay = getRazorpay();

  // Retrieve the live subscription to refresh the period end.
  let livePeriodEnd: string | null = subscription.current_period_end;
  try {
    const live = await razorpay.subscriptions.fetch(subscription.razorpay_subscription_id);
    const periodEndUnix = (live as any).current_end;
    if (periodEndUnix) {
      livePeriodEnd = new Date(periodEndUnix * 1000).toISOString();
    }
  } catch (err) {
    console.error('[razorpay-cancel] live fetch failed (continuing):', err);
  }

  // Schedule the cancel. The SDK's cancel method takes cancelAtCycleEnd
  // as a second parameter: 1 = cancel at cycle end, 0 = cancel immediately.
  try {
    await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id, 1);
  } catch (err) {
    console.error('[razorpay-cancel] cancel update failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel' },
      { status: 500 }
    );
  }

  // Mirror to the local DB so the page flips to "Expires on <date>"
  // before the webhook lands.
  await service
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      current_period_end: livePeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  console.log(
    `[razorpay-cancel] subscription scheduled to cancel: user=${user.id} sub=${subscription.razorpay_subscription_id} periodEnd=${livePeriodEnd}`
  );

  return NextResponse.json({ success: true });
}
