// POST /api/razorpay/create-subscription
//
// Creates a Razorpay subscription for one of our two plan IDs. The user
// clicks "Upgrade to Pro" on /pricing, the client POSTs `{ tier }`, and
// we return a short_url that the client should redirect to for payment.
//
// Razorpay Subscriptions API flow:
//   1. Find or create the Razorpay customer for this user.
//   2. Create a subscription with the plan_id and customer_id.
//   3. Return the subscription's short_url (hosted payment page).
//
// Auth required.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';
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
  const service = createServiceClient();

  // Look up existing Razorpay customer ID.
  const { data: subRow } = await service
    .from('subscriptions')
    .select('razorpay_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const razorpay = getRazorpay();
  let razorpayCustomerId: string | undefined;

  // If we have a stored customer ID, verify it still exists in Razorpay.
  // A stale ID (e.g. from a previous test-mode session, or a wiped Razorpay
  // account) would cause "The id provided does not exist" downstream when
  // we try to subscribe. Clearing it here lets the create-new-customer
  // block below handle the recovery transparently.
  if (subRow?.razorpay_customer_id) {
    try {
      await razorpay.customers.fetch(subRow.razorpay_customer_id);
      razorpayCustomerId = subRow.razorpay_customer_id;
    } catch {
      await service
        .from('subscriptions')
        .update({ razorpay_customer_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
  }

  // Create a Razorpay customer if one doesn't exist yet.
  if (!razorpayCustomerId) {
    try {
      const customer = await razorpay.customers.create({
        name: user.email ?? undefined,
        email: user.email ?? undefined,
        notes: { user_id: user.id },
      });
      razorpayCustomerId = customer.id;

      // Seed the subscriptions row with the new Razorpay customer.
      await service.from('subscriptions').upsert(
        {
          user_id: user.id,
          razorpay_customer_id: razorpayCustomerId,
          status: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } catch (err) {
      console.error('[razorpay] customer create failed:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to create Razorpay customer' },
        { status: 500 }
      );
    }
  }

  const origin = request.headers.get('origin') ?? '';
  const baseUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    // Create the subscription. total_count of 120 months (~10 years)
    // ensures the subscription recurs for a very long time.
    //
    // The TypeScript types for the Razorpay SDK don't include customer_id
    // in the create body, but the actual Razorpay API supports it. We use
    // a typed `as any` cast here — the value is validated server-side by
    // Razorpay and will fail with a clear error if invalid.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      notes: { user_id: user.id },
      customer_id: razorpayCustomerId,
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
