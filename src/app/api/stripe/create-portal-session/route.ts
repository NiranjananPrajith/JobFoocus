// POST /api/stripe/create-portal-session
//
// Creates a Stripe Customer Portal session for the logged-in user. The
// portal is the hosted UI Stripe provides for self-service cancel,
// upgrade/downgrade, payment-method update, and invoice history.
//
// We look up the user's stored `stripe_customer_id` from the
// `subscriptions` row. If they don't have one (Free user who never
// started a checkout), we return 400 — there's nothing to manage in
// the portal yet.
//
// Auth required.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data: subRow } = await service
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subRow?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active subscription. Pick a plan to get started.' },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const origin = request.headers.get('origin') ?? '';
  const baseUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subRow.stripe_customer_id,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] create-portal-session failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
