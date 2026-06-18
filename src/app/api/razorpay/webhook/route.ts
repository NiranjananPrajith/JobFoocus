// POST /api/razorpay/webhook
//
// Receives Razorpay subscription events and mirrors them into the
// `subscriptions` table.
//
// IMPORTANT: this route reads the RAW body via request.text() (NOT
// request.json()) because Razorpay's HMAC signature verification
// needs the exact bytes that were signed.
//
// Razorpay webhook events we handle:
//   - subscription.authenticated — first payment method verified
//   - subscription.activated     — subscription is live
//   - subscription.charged       — recurring payment succeeded
//   - subscription.cancelled     — subscription cancelled (after period end)
//   - subscription.completed     — subscription ended naturally
//   - subscription.halted        — payment failed (dunning)
//   - subscription.resumed       — subscription resumed after halt
//
// We always return 200 on processed events and 400 on signature
// failures, matching the Stripe webhook contract.

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRazorpay } from '@/lib/razorpay';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { tierFromRazorpayPlanId } from '@/lib/limits';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sig = request.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!sig) {
    return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
  }
  if (!webhookSecret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();

  // Verify HMAC SHA-256 signature.
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    console.error('[razorpay-webhook] signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    switch (event.event) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged': {
        const sub = event.payload?.subscription?.entity;
        if (sub) await handleSubscriptionUpsert(service, sub);
        break;
      }
      case 'subscription.cancelled': {
        const sub = event.payload?.subscription?.entity;
        if (sub) await handleSubscriptionCancelled(service, sub);
        break;
      }
      case 'subscription.completed': {
        const sub = event.payload?.subscription?.entity;
        if (sub) await handleSubscriptionCompleted(service, sub);
        break;
      }
      case 'subscription.halted': {
        const sub = event.payload?.subscription?.entity;
        if (sub) await handleSubscriptionHalted(service, sub);
        break;
      }
      case 'subscription.resumed': {
        const sub = event.payload?.subscription?.entity;
        if (sub) await handleSubscriptionUpsert(service, sub);
        break;
      }
      default:
        console.log(`[razorpay-webhook] unhandled event type: ${event.event}`);
    }
  } catch (err) {
    console.error(`[razorpay-webhook] handler error for ${event.event}:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleSubscriptionUpsert(
  service: ReturnType<typeof createServiceClient>,
  sub: any
) {
  const userId = sub.notes?.user_id;
  if (!userId) {
    console.warn('[razorpay-webhook] subscription event missing user_id in notes');
    return;
  }

  const statusMap: Record<string, string> = {
    active: 'active',
    authenticated: 'trialing',
    created: 'incomplete',
    completed: 'canceled',
    cancelled: 'canceled',
    halted: 'past_due',
    paused: 'past_due',
  };
  const status = statusMap[sub.status as string] ?? sub.status ?? 'active';

  const periodEndUnix = sub.current_end;
  const currentPeriodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  const isScheduledToCancel = sub.cancel_at_cycle_end === 1;

  const { error } = await service.from('subscriptions').upsert(
    {
      user_id: userId,
      razorpay_customer_id: sub.customer_id ?? null,
      razorpay_subscription_id: sub.id,
      razorpay_plan_id: sub.plan_id ?? null,
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: isScheduledToCancel,
      currency: 'INR',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[razorpay-webhook] subscription upsert failed:', error);
    throw error;
  }

  console.log(
    `[razorpay-webhook] subscription upsert: user=${userId} status=${sub.status} tier=${tierFromRazorpayPlanId(sub.plan_id)}`
  );
}

async function handleSubscriptionCancelled(
  service: ReturnType<typeof createServiceClient>,
  sub: any
) {
  const userId = sub.notes?.user_id;
  if (!userId) return;

  const { error } = await service
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  if (error) {
    console.error('[razorpay-webhook] subscription cancel failed:', error);
    throw error;
  }
}

async function handleSubscriptionCompleted(
  service: ReturnType<typeof createServiceClient>,
  sub: any
) {
  const userId = sub.notes?.user_id;
  if (!userId) return;

  const { error } = await service
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  if (error) {
    console.error('[razorpay-webhook] subscription completed failed:', error);
    throw error;
  }
}

async function handleSubscriptionHalted(
  service: ReturnType<typeof createServiceClient>,
  sub: any
) {
  const userId = sub.notes?.user_id;
  if (!userId) return;

  const { error } = await service
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  if (error) {
    console.error('[razorpay-webhook] subscription halted failed:', error);
    throw error;
  }
}
