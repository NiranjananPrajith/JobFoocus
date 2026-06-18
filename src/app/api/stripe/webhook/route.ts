// POST /api/stripe/webhook
//
// Receives Stripe events (subscription lifecycle, checkout completion,
// invoice failures) and mirrors them into the `subscriptions` table.
//
// IMPORTANT: this route reads the RAW body via request.text() (NOT
// request.json()) because the Stripe SDK's signature verifier needs
// the exact bytes that were signed. Next.js App Router exposes the
// raw text via req.text() — we use that.
//
// We always return 200 on processed events (even if no DB row was
// affected — e.g., an event for a different customer) and 400 on
// signature failures. Returning 5xx on unknown events causes Stripe
// to retry indefinitely.

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { tierFromPriceId } from '@/lib/limits';

// Stripe needs the raw body for signature verification. We disable
// Next.js's automatic body parsing for this route.
//
// `export const dynamic = 'force-dynamic'` is the App Router equivalent
// of `export const config = { api: { bodyParser: false } }` in
// pages/api: it tells Next.js not to cache and not to parse the body
// before our handler runs.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid signature' },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(service, session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(service, sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(service, sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(service, invoice);
        break;
      }
      default:
        // Unhandled event type — Stripe expects a 2xx so it doesn't
        // retry. We just log and move on.
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Persisting failed. Return 500 so Stripe retries. We've already
    // logged — operator can investigate via the Stripe dashboard.
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

interface ServiceClient {
  from: ReturnType<typeof createServiceClient>['from'];
}

async function handleCheckoutCompleted(
  service: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  // Two ways to find the user:
  //   1. session.metadata.user_id (we set this when creating the session)
  //   2. look up the customer → user_id
  // We prefer (1) because it's set by us and reliable.
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.warn('[stripe-webhook] checkout.session.completed missing user_id metadata');
    return;
  }

  // Pull the full subscription object — the session only has
  // subscription id. We need the price + status.
  const stripe = getStripe();
  if (!session.subscription) {
    console.warn('[stripe-webhook] checkout.session.completed has no subscription');
    return;
  }

  const sub = await stripe.subscriptions.retrieve(
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id
  );
  await handleSubscriptionUpsert(service, sub, userId);
}

async function handleSubscriptionUpsert(
  service: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription,
  // If we already know the user_id (e.g., from checkout.session metadata),
  // pass it in to avoid a metadata lookup.
  explicitUserId?: string
) {
  const userId =
    explicitUserId ??
    (await resolveUserIdFromCustomer(
      service,
      // `sub.customer` is `string | Customer | DeletedCustomer` in the
      // SDK's types — narrow to just the ID (a string) before passing
      // to the resolver, which handles deleted customers by checking
      // `c.deleted`.
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    ));
  if (!userId) {
    console.warn('[stripe-webhook] could not resolve user_id for subscription', sub.id);
    return;
  }

  // Stripe API: the first item is the subscription line (subscriptions
  // can have multiple lines in theory, but for our use it's always one).
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;

  // current_period_end lives on the subscription item in the new API
  // shape. Read it from the item, with a fallback to the deprecated
  // top-level field for older payloads.
  const periodEndUnix = (item as any)?.current_period_end ?? (sub as any).current_period_end;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  // Stripe's cancel signal lives in two places depending on the API
  // version: `cancel_at_period_end` (legacy boolean) and `cancel_at`
  // (timestamp, set by the current customer-portal cancel flow).
  // We need to read BOTH and persist the OR of them so the page
  // renders "Expires on" regardless of which flag Stripe wrote the
  // cancel to. See the same logic in refreshSubscriptionFromStripe
  // for the matching diagnose.
  const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;
  const cancelAtUnix = (sub as unknown as { cancel_at?: number | null })
    .cancel_at;
  const isScheduledToCancel = cancelAtPeriodEnd || cancelAtUnix != null;

  // Read the currency from the Stripe price object and normalize to
  // uppercase. Store it so the /account page can display the price
  // in the right currency.
  const rawCurrency = (item?.price as any)?.currency as string | undefined;
  const currency: 'USD' | 'EUR' | null =
    rawCurrency === 'usd' ? 'USD'
    : rawCurrency === 'eur' ? 'EUR'
    : null;

  const { error } = await service.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: isScheduledToCancel,
      currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[stripe-webhook] subscription upsert failed:', error);
    throw error;
  }

  // Log the resolved tier for operator visibility.
  console.log(
    `[stripe-webhook] subscription upsert: user=${userId} status=${sub.status} tier=${tierFromPriceId(priceId)}`
  );
}

async function handleSubscriptionDeleted(
  service: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription
) {
  // Mark the row as canceled but keep it. The cap is enforced
  // based on status, so a 'canceled' row automatically drops the user
  // to Free (tierFromSubscription returns 'free' for anything other
  // than 'active' | 'trialing').
  const { error } = await service
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);
  if (error) {
    console.error('[stripe-webhook] subscription delete failed:', error);
    throw error;
  }
}

async function handlePaymentFailed(
  service: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  // The invoice has a `subscription` field — look up the row by
  // subscription_id and mark it past_due. The user keeps access
  // (dunning runs in the Stripe-hosted UI) but is on the verge of
  // being downgraded.
  const subId = (invoice as any).subscription;
  if (!subId) return;

  const { error } = await service
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', typeof subId === 'string' ? subId : subId.id);
  if (error) {
    console.error('[stripe-webhook] payment_failed update failed:', error);
    throw error;
  }
}

/**
 * Look up the user_id for a Stripe customer. Uses the
 * `customer.metadata.user_id` we set at customer creation time.
 */
async function resolveUserIdFromCustomer(
  service: ReturnType<typeof createServiceClient>,
  customer: string | Stripe.Customer
): Promise<string | null> {
  const customerId = typeof customer === 'string' ? customer : customer.id;
  const stripe = getStripe();
  const c = await stripe.customers.retrieve(customerId);
  if (c.deleted) return null;
  const userId = (c as Stripe.Customer).metadata?.user_id;
  return userId ?? null;
}
