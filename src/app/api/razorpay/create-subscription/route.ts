// POST /api/razorpay/create-subscription
//
// Creates a Razorpay subscription for one of our two plan IDs. The user
// clicks "Upgrade to Pro" on /pricing, the client POSTs `{ tier }`, and
// we return a short_url that the client should redirect to for payment.
//
// Razorpay Subscriptions API flow:
//   1. Create a subscription with the plan_id and notes.user_id.
//   2. Return the subscription's short_url (hosted payment page).
//   3. Razorpay auto-creates the customer when the user pays.
//   4. The webhook (/api/razorpay/webhook) mirrors the subscription
//      and customer IDs into our `subscriptions` table.
//
// Auth required.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { getRazorpay, razorpayPlanIdForTier } from '@/lib/razorpay';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { tier?: 'pro' | 'max' } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.tier !== 'pro' && body.tier !== 'max') {
    return NextResponse.json(
      { error: 'Body must include { tier: "pro" | "max" }' },
      { status: 400 }
    );
  }

  const planId = razorpayPlanIdForTier(body.tier);
  const razorpay = getRazorpay();

  try {
    // Create the subscription. total_count of 120 months (~10 years)
    // ensures the subscription recurs for a very long time.
    //
    // The TypeScript types for the Razorpay SDK are slightly narrower
    // than the actual API (e.g. they don't include `notes`). We use a
    // typed `as any` cast here — the values are validated server-side
    // by Razorpay and will fail with a clear error if invalid.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      notes: { user_id: user.id },
    } as any);

    // short_url is the hosted payment page where the user enters their
    // card/UPI details and authorises recurring payments.
    const shortUrl = (subscription as any).short_url;
    if (!shortUrl) {
      return NextResponse.json(
        { error: 'Subscription created but no payment URL returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: shortUrl });
  } catch (err) {
    console.error('[razorpay] create-subscription failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
