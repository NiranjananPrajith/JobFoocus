// POST /api/razorpay/reactivate-subscription
//
// Undoes a "cancel at cycle end" without forcing the user through
// a portal. Called by the "Don't cancel my subscription" link on
// /account when the user has second thoughts.
//
// Razorpay API: PATCH /subscriptions/{id} with cancel_at_cycle_end: 0
// The SDK's update() method maps to this endpoint. The TypeScript types
// don't include cancel_at_cycle_end, so we use `as any`.
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
    .select('razorpay_subscription_id, cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: 'Failed to read subscription' }, { status: 500 });
  }

  if (!subscription?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No subscription on file' }, { status: 400 });
  }

  if (!subscription.cancel_at_period_end) {
    return NextResponse.json({ error: 'Subscription is not cancelled' }, { status: 400 });
  }

  const razorpay = getRazorpay();

  try {
    const live = await razorpay.subscriptions.fetch(subscription.razorpay_subscription_id);
    const liveCancelAtCycleEnd = (live as any).cancel_at_cycle_end;

    if (!liveCancelAtCycleEnd) {
      // Already active — no-op.
      return NextResponse.json({ success: true });
    }

    // Clear the cancel_at_cycle_end flag. The SDK's update() method
    // accepts the Razorpay API's PATCH body, but the TypeScript types
    // are incomplete. We cast to `any` — the value is validated
    // server-side by Razorpay.
    await razorpay.subscriptions.update(subscription.razorpay_subscription_id, {
      cancel_at_cycle_end: 0,
    } as any);
  } catch (err) {
    console.error('[razorpay] reactivation failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reactivate' },
      { status: 500 }
    );
  }

  // Mirror the change into the local DB.
  await service
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  console.log(
    `[razorpay] subscription reactivated: user=${user.id} sub=${subscription.razorpay_subscription_id}`
  );

  return NextResponse.json({ success: true });
}
