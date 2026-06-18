// POST /api/razorpay/get-update-card-link
//
// Returns a URL the user can visit to update their payment method
// for a Razorpay subscription. Razorpay's Subscriptions API provides
// a short_url for this purpose — fetching the subscription and
// returning its short_url lets the user re-authenticate with a new
// card or UPI mandate.
//
// Auth required.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { getRazorpay } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: subscription } = await service
    .from('subscriptions')
    .select('razorpay_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No Razorpay subscription on file' }, { status: 400 });
  }

  try {
    const razorpay = getRazorpay();
    const sub = await razorpay.subscriptions.fetch(subscription.razorpay_subscription_id);

    // short_url is the hosted page where the user can update their
    // payment method. It's the same URL they used to make the first
    // payment — Razorpay reuses it for card/mandate updates.
    const url = (sub as any).short_url;
    if (!url) {
      return NextResponse.json(
        { error: 'No payment URL available for this subscription' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[razorpay] get-update-card-link failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get update link' },
      { status: 500 }
    );
  }
}
