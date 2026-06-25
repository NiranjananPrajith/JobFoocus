# Payments System Implementation Guide

A standalone reference for implementing a multi-currency, multi-provider subscription payments system in a Next.js 14 App Router application. Covers **Stripe** (USD + EUR) and **Razorpay** (INR) with automatic geo-routing, webhook-driven state mirroring, self-healing reconciliation, cancel/reactivate flows, and tier-based usage enforcement.

---

## 1. Architecture Overview

```
                        ┌──────────────────────────┐
 User visits /pricing → │  CurrencyToggle (USD/EUR) │
 User clicks "Upgrade" → │  PricingCTAButtons       │
                        └───────────┬──────────────┘
                                    │ POST
                                    ▼
    ┌───────────────────────────────────────────────────┐
    │  /api/stripe/create-checkout-session              │  (USD / EUR)
    │  /api/razorpay/create-subscription                │  (INR)
    │                                                   │
    │  1. Auth (Supabase)                               │
    │  2. Find / create customer in PSP                 │
    │  3. Build Checkout Session or Subscription        │
    │  4. Return { url } → client full-page redirect    │
    └───────────────────────┬───────────────────────────┘
                            │
                    User pays on PSP-hosted page
                            │
                            ▼
    ┌───────────────────────────────────────────────────┐
    │  /api/stripe/webhook   /api/razorpay/webhook      │
    │                                                   │
    │  1. Read raw body (no JSON parse)                 │
    │  2. Verify signature / HMAC                       │
    │  3. Upsert `subscriptions` row by user_id         │
    │  4. Return 200 (never 5xx on unknown events)      │
    └───────────────────────┬───────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────┐
    │  subscriptions table (Supabase Postgres)          │
    │  PK: user_id                                      │
    │  Columns: stripe_subscription_id, status,         │
    │           stripe_price_id, razorpay_plan_id,      │
    │           currency, current_period_end,           │
    │           cancel_at_period_end, ...               │
    └───────────────────────┬───────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────┐
    │  /account page loads                              │
    │                                                   │
    │  1. GetSubscription()                             │
    │  2. Refresh from PSP (self-healing)               │
    │  3. tierFromSubscription() → limits               │
    │  4. getTodayUsageReadOnly() → usage bars          │
    └───────────────────────────────────────────────────┘
```

**Key principles:**
- The PSP (Stripe / Razorpay) is the **canonical** source of truth for subscription state. The DB is a **mirror**.
- Webhooks are fire-and-forget — the `/account` page self-heals on every load by pulling live state from the PSP.
- There is **no** stored `provider` column — provider is inferred at read time (if `razorpay_subscription_id IS NOT NULL`, it's Razorpay; otherwise Stripe).
- Fail-closed: if anything goes wrong resolving tier, the user is treated as **free** (never "no limit").

---

## 2. Database Schema

### 2.1 The `subscriptions` table

One row per user (`user_id` is the primary key). Users with no row are on the Free tier.

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id        text,
  stripe_subscription_id    text,
  stripe_price_id           text,
  razorpay_customer_id      text,
  razorpay_subscription_id  text,
  razorpay_plan_id          text,
  status                    text,       -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null
  current_period_end        timestamptz,
  cancel_at_period_end      boolean DEFAULT false,
  currency                  text,       -- 'USD' | 'EUR' | 'INR' | null
  meta_purchase_event_id    text,       -- Meta CAPI Purchase dedup event_id
  updated_at                timestamptz DEFAULT now()
);
```

**Column notes:**

| Column | Purpose |
|---|---|
| `stripe_customer_id` | Set on first checkout. Used by Portal + cancel/reactivate + reconciliation. |
| `stripe_subscription_id` | Set by the webhook. Primary key for Stripe lookups. |
| `stripe_price_id` | From Stripe. Resolved to tier via `tierFromPriceId()`. |
| `razorpay_customer_id` | From Razorpay. Set by webhooks. |
| `razorpay_subscription_id` | Primary key for Razorpay lookups. Provider inference uses this column. |
| `razorpay_plan_id` | From Razorpay. Resolved to tier via `tierFromRazorpayPlanId()`. |
| `status` | `active`/`trialing` → paid tier. `past_due` → still paid (dunning). `canceled`/`null`/anything else → free. |
| `cancel_at_period_end` | True if the subscription is scheduled to cancel at period end. User retains access until then. |
| `currency` | From the price object's currency field. Normalized to uppercase ('USD', 'EUR', 'INR'). |

**Provider inference (no stored column):**
```ts
export function subscriptionProvider(row: SubscriptionRow | null): 'stripe' | 'razorpay' | null {
  if (!row) return null;
  if (row.razorpay_subscription_id) return 'razorpay';
  if (row.stripe_subscription_id) return 'stripe';
  return null;
}
```

### 2.2 Usage counters

```sql
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date  date DEFAULT CURRENT_DATE,
  jobs_added  integer DEFAULT 0,
  edits_made  integer DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
```

Incremented atomically via RPC (see §12).

### 2.3 Migrations

**005:** Creates `subscriptions` + `usage_counters` tables + `try_increment_usage` RPC.  
**007:** Adds `razorpay_customer_id`, `razorpay_subscription_id`, `razorpay_plan_id` columns.  
**008:** Adds `currency` column.  
**011:** Adds `meta_purchase_event_id` column.

---

## 3. Environment Variables

All 18 variables required for the complete system:

```bash
# Supabase (for auth + DB writes)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID_TIER_2=price_...            # USD Tier 2
STRIPE_PRICE_ID_TIER_3=price_...            # USD Tier 3
STRIPE_PRICE_ID_TIER_2_EUR=price_...        # EUR Tier 2
STRIPE_PRICE_ID_TIER_3_EUR=price_...        # EUR Tier 3

# Razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_ID_TIER_2=plan_...
RAZORPAY_PLAN_ID_TIER_3=plan_...

# Region (dev fallback)
NEXT_PUBLIC_DEV_REGION=IN          # optional, for local dev without Vercel geo
```

---

## 4. Region Detection & Currency Routing

### 4.1 Middleware (`src/middleware.ts`)

On every request, the middleware:
1. Checks `request.geo.country` (Vercel Edge Network, present in production)
2. Falls back to `NEXT_PUBLIC_DEV_REGION` in local dev
3. Classifies as `IN` (India), `EEA` (European Economic Area), or `OTHER`
4. Sets `x-jf-region` header for server components and API routes
5. Sets `jf-region` cookie for client components

**EEA counties:** EU 27 + Iceland, Liechtenstein, Norway.

### 4.2 Currency resolution

| Region | Currency | Provider | Stripe product |
|---|---|---|---|
| `IN` | INR | Razorpay | N/A |
| `EEA` | EUR | Stripe | EUR price IDs |
| `OTHER` | USD | Stripe | USD price IDs |

### 4.3 Server-side region helper (`src/lib/region.ts`)

```ts
export async function getRegion(): Promise<Region> {
  const h = await headers();
  const raw = h.get('x-jf-region');
  if (raw === 'IN' || raw === 'EEA' || raw === 'OTHER') return raw;
  // Fallback for local dev
  const devRegion = process.env.NEXT_PUBLIC_DEV_REGION;
  if (devRegion === 'IN') return 'IN';
  if (devRegion === 'EEA') return 'EEA';
  return 'OTHER';
}
```

### 4.4 Client-side currency cookie

The pricing page's `CurrencyToggle` sets a `jf-currency` cookie on change. The NavBar's BillingPopdown and the PricingCTAButtons read this cookie to decide which currency to display/charge.

```ts
function getCurrencyFromCookie(): Currency {
  const match = document.cookie.match(/(?:^|;\s*)jf-currency=([^;]*)/);
  const v = match?.[1];
  if (v === 'USD' || v === 'EUR' || v === 'INR') return v;
  // Fall back to region cookie
  const regionMatch = document.cookie.match(/(?:^|;\s*)jf-region=([^;]*)/);
  if (regionMatch?.[1] === 'IN') return 'INR';
  return 'USD';
}
```

---

## 5. Tier System (`src/lib/limits.ts`)

### 5.1 Tier definition

```ts
export type Tier = 'free' | 'tier_2' | 'tier_3';
```

### 5.2 Limits

```ts
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:    { jobs: 5,   edits: 25 },
  tier_2:  { jobs: 25,  edits: 100 },
  tier_3:  { jobs: 250, edits: 1000 },
};
```

### 5.3 Tier → Price (all three currencies)

```ts
TIER_PRICE_USD = { free: 0, tier_2: 5,  tier_3: 12 }
TIER_PRICE_EUR = { free: 0, tier_2: 4.5, tier_3: 11 }
TIER_PRICE_INR = { free: 0, tier_2: 500, tier_3: 1250 }
```

### 5.4 Resolving tier from subscription

```ts
export function tierFromSubscription(sub: {
  status: string | null;
  stripe_price_id: string | null;
  razorpay_plan_id: string | null;
  insider?: boolean | null;
} | null | undefined): Tier {
  if (!sub) return 'free';
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  if (sub.insider) return 'insider';
  if (sub.razorpay_plan_id) return tierFromRazorpayPlanId(sub.razorpay_plan_id);
  return tierFromPriceId(sub.stripe_price_id);
}
```

**Key behaviors:**
- `status` must be `'active'` or `'trialing'` — anything else (`'past_due'`, `'canceled'`, `null`, etc.) resolves to `'free'`
- `cancel_at_period_end` does **not** demote to free — user keeps paid access until `current_period_end`
- `insider` (optional boolean column) can override price/plan ID resolution for internal tiers
- Razorpay plan ID is checked first, then Stripe price ID
- If no row exists (new user, no subscription history), returns `'free'`

---

## 6. Stripe Implementation

### 6.1 SDK singleton (`src/lib/stripe.ts`)

```ts
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,  // pinned version, cast needed
    typescript: true,
    appInfo: { name: 'YourApp', version: '1.0.0' },
  });
  return cached;
}
```

### 6.2 Checkout Session (`POST /api/stripe/create-checkout-session`)

Full flow:

1. **Auth:** `supabase.auth.getUser()` → 401 if missing
2. **Parse body:** `{ tier: 'tier_2' | 'tier_3', currency: 'USD' | 'EUR' }` or `{ priceId: string }`
3. **Resolve price ID:** `stripePriceIdForTier(tier, currency)` reads the correct env var
4. **Find or create customer:**
   - Check `subscriptions` table for existing `stripe_customer_id`
   - Verify the stored ID is still valid in Stripe (`customers.retrieve()`)
   - If missing or deleted, create a new customer with `metadata: { user_id }`
   - Upsert the subscriptions row with the new customer ID
5. **Create session:**
   ```ts
   const session = await stripe.checkout.sessions.create({
     mode: 'subscription',
     customer: customerId,
     line_items: [{ price: priceId, quantity: 1 }],
     success_url: `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
     cancel_url: `${baseUrl}/pricing`,
     metadata: { user_id: user.id },
     allow_promotion_codes: true,
   });
   ```
6. **Return** `{ url: session.url }`

**Critical: do NOT pass `payment_method_types`.** Stripe dynamically selects eligible payment methods from the Dashboard configuration. The Stripe best-practices document forbids hardcoding this parameter except for Terminal (in-person) integrations.

### 6.3 Customer Portal (`POST /api/stripe/create-portal-session`)

- Auth required
- Looks up `stripe_customer_id` from the subscriptions row
- Creates a `billingPortal.sessions.create()` with `return_url: /account`
- Returns `{ url: session.url }` — client does `window.location.href`

### 6.4 Webhook (`POST /api/stripe/webhook`)

**Critical: reads raw body with `request.text()`, not `request.json()`.** The Stripe SDK's signature verifier needs the exact bytes that were signed. If the body is parsed first, verification fails.

```ts
export const dynamic = 'force-dynamic';  // No caching, no body parsing

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const rawBody = await request.text();  // RAW body

  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed':    → handleCheckoutCompleted()
    case 'customer.subscription.created': → handleSubscriptionUpsert()
    case 'customer.subscription.updated': → handleSubscriptionUpsert()
    case 'customer.subscription.deleted': → handleSubscriptionDeleted()
    case 'invoice.payment_failed':        → handlePaymentFailed()
  }

  return Response.json({ received: true });  // Always 200 on processed events
}
```

#### handleCheckoutCompleted

The `checkout.session.completed` event fires once, on initial payment. It contains the session metadata (`user_id`) and subscription ID. We:

1. Get `user_id` from `session.metadata`
2. Retrieve the full subscription from Stripe (`subscriptions.retrieve()`)
3. Call `handleSubscriptionUpsert()` with the explicit `user_id`

#### handleSubscriptionUpsert

The canonical mirror function. Writes the Stripe subscription state to the `subscriptions` table:

```ts
await service.from('subscriptions').upsert({
  user_id:                userId,
  stripe_customer_id:     customerId,
  stripe_subscription_id: sub.id,
  stripe_price_id:        priceId,
  status:                 sub.status,
  current_period_end:     periodEndISO,
  cancel_at_period_end:   isScheduledToCancel,
  currency:               'USD' | 'EUR' | null,
  updated_at:             now,
}, { onConflict: 'user_id' });
```

**Important: dual cancel-flag handling.** Stripe stores the cancel signal in two places:
- `cancel_at_period_end` (legacy boolean — set by older cancel calls)
- `cancel_at` (timestamp — set by the current Customer Portal cancel flow)

Read **both** and persist the OR:
```ts
const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;
const cancelAtUnix = (sub as unknown as { cancel_at?: number | null }).cancel_at;
const isScheduledToCancel = cancelAtPeriodEnd || cancelAtUnix != null;
```

The `cancel_at` field is not in the SDK's types — use an `as unknown as { cancel_at?: number | null }` cast. **Without this, cancels from the Customer Portal will not be detected**, and the /account page will show "Renews on" when the subscription is actually scheduled to cancel.

#### handleSubscriptionDeleted

Marks the row as `status: 'canceled'` and sets `cancel_at_period_end: false`. The row is kept — never delete the row, because the webhook may fire again, and we want idempotent upserts.

#### handlePaymentFailed

Marks the row as `status: 'past_due'`. User retains access (dunning runs in Stripe) but is on the verge of being downgraded.

### 6.5 Cancel Subscription (`POST /api/stripe/cancel-subscription`)

1. Auth required
2. Reads `stripe_subscription_id` from DB
3. Short-circuits if already cancelled
4. Optionally refreshes `current_period_end` from Stripe (live retrieve)
5. Calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })`
6. Mirrors the cancel flag to DB (so the UI updates before the webhook lands)

### 6.6 Reactivate Subscription (`POST /api/stripe/reactivate-subscription`)

Undoes a "cancel at period end". Because Stripe now uses **two different fields** for the cancel signal (`cancel_at_period_end` and `cancel_at`), we must:

1. Fetch the live subscription from Stripe
2. Check which flag(s) are set
3. Clear them — **one at a time** (Stripe rejects a single update with both params)
4. If both are set (race condition): send two sequential updates
5. Mirror `cancel_at_period_end: false` to DB

```ts
// Check the live subscription
const live = await stripe.subscriptions.retrieve(stripeSubscriptionId);

// Two-pass clearance for robustness
const firstPass: any = {};
if (live.cancel_at_period_end) firstPass.cancel_at_period_end = false;
if ((live as any).cancel_at) firstPass.cancel_at = null;
await stripe.subscriptions.update(stripeSubscriptionId, firstPass);

const after = await stripe.subscriptions.retrieve(stripeSubscriptionId);
if (after.cancel_at_period_end || (after as any).cancel_at) {
  const secondPass: any = {};
  if (after.cancel_at_period_end) secondPass.cancel_at_period_end = false;
  if ((after as any).cancel_at) secondPass.cancel_at = null;
  await stripe.subscriptions.update(stripeSubscriptionId, secondPass);
}
```

---

## 7. Razorpay Implementation

### 7.1 SDK singleton (`src/lib/razorpay.ts`)

```ts
import Razorpay from 'razorpay';

let cached: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (cached) return cached;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  cached = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cached;
}
```

### 7.2 Create Subscription (`POST /api/razorpay/create-subscription`)

1. **Auth:** `supabase.auth.getUser()` → 401 if missing
2. **Parse body:** `{ tier: 'tier_2' | 'tier_3' }`
3. **Resolve plan ID:** `razorpayPlanIdForTier(tier)`
4. **Create subscription:**
   ```ts
   const razorpay = getRazorpay();
   const sub = await razorpay.subscriptions.create({
     plan_id: razorpayPlanIdForTier(tier),
     customer_notify: 1,
     total_count: 12 * 100,  // 100 years (basically indefinite)
     notes: { user_id: user.id },
   });
   ```
5. **Return** `{ url: sub.short_url }`

Razorpay auto-creates a customer on first payment. The `notes.user_id` is our handle — the webhook reads it to correlate the subscription back to the user.

### 7.3 Webhook (`POST /api/razorpay/webhook`)

**Critical: reads raw body with `request.text()`, not `request.json()`.** HMAC verification needs the exact bytes.

```ts
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sig = request.headers.get('x-razorpay-signature');
  const rawBody = await request.text();

  // Verify HMAC SHA-256
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  switch (event.event) {
    case 'subscription.authenticated': → handleSubscriptionUpsert()
    case 'subscription.activated':     → handleSubscriptionUpsert()
    case 'subscription.charged':       → handleSubscriptionUpsert()
    case 'subscription.cancelled':     → handleSubscriptionCancelled()
    case 'subscription.completed':     → handleSubscriptionCompleted()
    case 'subscription.halted':        → handleSubscriptionHalted()
    case 'subscription.resumed':       → handleSubscriptionUpsert()
  }

  return Response.json({ received: true });
}
```

#### handleSubscriptionUpsert

```ts
const userId = sub.notes?.user_id;  // Our handle from subscription creation

// Status mapping
const statusMap: Record<string, string> = {
  active: 'active', authenticated: 'trialing', created: 'incomplete',
  completed: 'canceled', cancelled: 'canceled',
  halted: 'past_due', paused: 'past_due',
};

await service.from('subscriptions').upsert({
  user_id:                  userId,
  razorpay_customer_id:     sub.customer_id,
  razorpay_subscription_id: sub.id,
  razorpay_plan_id:         sub.plan_id,
  status:                   statusMap[sub.status] ?? sub.status,
  current_period_end:       periodEndISO,
  cancel_at_period_end:     sub.cancel_at_cycle_end === 1,
  currency:                 'INR',  // Razorpay is always INR
  updated_at:               now,
}, { onConflict: 'user_id' });
```

### 7.4 Cancel Subscription (`POST /api/razorpay/cancel-subscription`)

```ts
await razorpay.subscriptions.cancel(subscriptionId, 1); // 1 = cancel at cycle end
```

Mirrors `cancel_at_period_end: true` to DB.

### 7.5 Reactivate Subscription (`POST /api/razorpay/reactivate-subscription`)

```ts
await razorpay.subscriptions.update(subscriptionId, {
  cancel_at_cycle_end: 0,  // NOTE: missing from SDK types, needs `as any` cast
});
```

### 7.6 Update Card Link (`POST /api/razorpay/get-update-card-link`)

Returns a `short_url` for the user to update their payment method:
```ts
const response = await razorpay.subscriptions.edit(subscriptionId, 'update_card');
return Response.json({ url: response.short_url });
```

---

## 8. Subscription Reconciliation (Self-Healing)

### 8.1 Why reconciliation is needed

Webhooks are fire-and-forget — they can be delayed, retried, or missed. The DB can lag behind Stripe/Razorpay. A user who just cancelled in the Customer Portal should see "Expires on" immediately, not "Renews on" until the webhook arrives.

### 8.2 How it works

On every `/account` page load:

```ts
const row = await getSubscription(user.id);
const provider = subscriptionProvider(row);

if (provider === 'razorpay') {
  subscription = await refreshSubscriptionFromRazorpay(user.id);
} else if (provider === 'stripe') {
  subscription = await refreshSubscriptionFromStripe(user.id);
} else {
  subscription = row;  // Free user, no PSP to reconcile
}
```

### 8.3 refreshSubscriptionFromStripe

1. Read `stripe_customer_id` from DB
2. `stripe.subscriptions.list({ customer: customerId })` — get latest subscription
3. Extract `price_id`, `status`, `cancel_at_period_end`, `cancel_at`, `current_period_end`, `currency`
4. Upsert to DB with same shape as the webhook
5. Return the reconciled row

### 8.4 refreshSubscriptionFromRazorpay

1. Read `razorpay_subscription_id` from DB
2. `razorpay.subscriptions.fetch(id)` — get live subscription
3. Map Razorpay status to our vocabulary
4. Extract `cancel_at_cycle_end`, `current_end`, `plan_id`
5. Upsert to DB, hardcoding `currency: 'INR'`
6. Return the reconciled row

### 8.5 Error handling

If reconciliation fails (network error, PSP down), the page falls back to the local DB row:
```ts
try {
  subscription = await refreshSubscriptionFromStripe(user.id);
} catch (err) {
  console.error('[account] reconcile failed, falling back to DB:', err);
  subscription = await getSubscription(user.id);
}
```

---

## 9. Checkout Flow (Client-Side)

### 9.1 PricingCTAButtons (`src/app/(main)/pricing/PricingCTAButtons.tsx`)

The "Upgrade" buttons on the pricing page:

```tsx
const handleClick = async () => {
  // Route to Razorpay for INR, Stripe for USD and EUR
  if (currency === 'INR') {
    endpoint = '/api/razorpay/create-subscription';
    body = { tier };
  } else {
    endpoint = '/api/stripe/create-checkout-session';
    body = { tier, currency };
  }

  const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();

  if (res.status === 401) {
    // Not logged in → send through signup first
    router.push(`/signup?next=/pricing`);
    return;
  }

  // Full page navigation to PSP-hosted checkout
  window.location.href = data.url;
};
```

**Three modes:**
| Mode | Behavior |
|---|---|
| `'signup'` (Free card) | `router.push('/signup')` — no PSP call |
| `'checkout'` (Tier 2 / Tier 3 cards) | POST to checkout API → PSP redirect |
| `'manage'` (Account page) | POST to portal API → Portal redirect |

---

## 10. Account Page (`src/app/(main)/account/page.tsx`)

### 10.1 Server component data fetching

```ts
const subscription = await getSubscription(user.id);              // DB row
const tier = tierFromSubscription(subscription);                  // Free / Tier 2 / Tier 3
const limits = TIER_LIMITS[tier];                                 // { jobs, edits }
const usage = await getTodayUsageReadOnly(user.id);               // Today's counters
const provider = subscriptionProvider(subscription);              // stripe | razorpay | null
```

### 10.2 UI components

| Component | Purpose | Props |
|---|---|---|
| Plan card | Shows tier name, price, period end / renew date | `tier`, `isPaid`, `periodEnd`, `currency` |
| AccountManageButton | Opens PSP portal (Stripe) or card update (Razorpay) | `provider`, `currentPeriodEnd` |
| AccountUpgradeButton | Links to `/pricing` (free users) | — |
| AccountAutoRenewToggle | Toggle to cancel / reactivate subscription | `initialEnabled`, `provider` |
| UsageBar | Shows jobs/edits used today vs limit | `label`, `used`, `limit` |
| ExportDataButton | Downloads all data as JSON | — |
| DeleteAccountButton | Deletes user account + all data | — |

### 10.3 Cancel/Renew toggle behavior

| Current state | Toggle flip | API call | Result |
|---|---|---|---|
| Auto-renew ON | Flip OFF | `POST /api/stripe/cancel-subscription` or `/api/razorpay/cancel-subscription` | Status shows "Expires on [date]" |
| Auto-renew OFF | Flip ON | `POST /api/stripe/reactivate-subscription` or `/api/razorpay/reactivate-subscription` | Status shows "Renews on [date]" |

---

## 11. NavBar BillingPopdown

A compact popdown attached to a credit-card icon in the NavBar. Shows the user's current plan, today's usage, and a link to the full Account page.

**Data fetch:** `POST /api/usage/check` with a placeholder `action: 'add_job'` — the route returns tier + limits + usage regardless of the action name, so it's reused here.

**Currency display:** Reads `jf-currency` cookie (set by pricing page toggle), falls back to `jf-region` cookie.

**Key behavior:**
- On open: fetches fresh data, shows LoadingScreen (compact), hides stale data
- On close: clears nothing (data persists for next open, but is refetched)
- Error: shows error message + Retry button

---

## 12. Usage Tracking & Tier Enforcement

### 12.1 Enrollment flow

The gate is **server-side and atomic**. The client also does a read-only pre-flight for UX (shows upgrade modal before the user wastes time), but the actual enforcement is server-only.

### 12.2 `try_increment_usage` RPC (Postgres)

```sql
CREATE OR REPLACE FUNCTION try_increment_usage(
  p_user_id uuid,
  p_action text,        -- 'add_job' | 'edit_doc'
  p_cap integer         -- tier's limit for this action
) RETURNS boolean AS $$
DECLARE
  v_column text;
  v_current integer;
BEGIN
  v_column := CASE p_action
    WHEN 'add_job' THEN 'jobs_added'
    WHEN 'edit_doc' THEN 'edits_made'
  END;

  INSERT INTO usage_counters (user_id, usage_date, jobs_added, edits_made)
  VALUES (p_user_id, CURRENT_DATE, 0, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  EXECUTE format('
    UPDATE usage_counters
    SET %I = %I + 1
    WHERE user_id = $1
      AND usage_date = CURRENT_DATE
      AND %I < $2
    RETURNING %I
  ', v_column, v_column, v_column, v_column)
  INTO v_current
  USING p_user_id, p_cap;

  RETURN v_current IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 12.3 Server-side gate (`src/lib/usage.ts`)

```ts
export async function tryIncrement(userId: string, action: 'add_job' | 'edit_doc'): Promise<boolean> {
  const { tier, limits } = await getEffectiveTier(userId);
  const cap = action === 'add_job' ? limits.jobs : limits.edits;

  const supabase = createServiceClient();
  const { data } = await supabase.rpc('try_increment_usage', {
    p_user_id: userId,
    p_action: action,
    p_cap: cap,
  });

  return data === true;
}
```

### 12.4 Enforcement points

| Endpoint | Action | Gate |
|---|---|---|
| `POST /api/jobs/add` | `add_job` | `tryIncrement(userId, 'add_job')` before generating documents |
| `POST /api/ai/edit-document` | `edit_doc` | `tryIncrement(userId, 'edit_doc')` after AI call succeeds |
| `GET /api/usage/check` | any | Read-only pre-flight for UX hints |

### 12.5 Fail-closed principle

```ts
export async function getEffectiveTier(userId: string): Promise<EffectiveTier> {
  const subscription = await getSubscription(userId);
  const tier = tierFromSubscription(subscription);
  return { tier, limits: TIER_LIMITS[tier], subscription };
}
```

If `getSubscription` throws or the DB is unreachable, the caller handles the error and defaults to `tier: 'free'`. Never default to the highest tier.

---

## 13. Stripe Setup Checklist (for a new project)

### 13.1 Dashboard setup

1. Create a **Stripe account** (live + test mode)
2. Create **products** for each tier × currency:
   - Tier 2 (USD), Tier 2 (EUR)
   - Tier 3 (USD), Tier 3 (EUR)
3. Create **recurring prices** for each product (monthly, USD/EUR amounts)
4. Copy each **price ID** (starts with `price_`)
5. Configure **Customer Portal** in Stripe Dashboard settings
6. Create a **webhook endpoint** pointing to `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the **signing secret** (starts with `whsec_`)

### 13.2 Env vars

```bash
STRIPE_SECRET_KEY=sk_live_...    # or sk_test_... for test mode
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # or pk_test_...
STRIPE_PRICE_ID_TIER_2=price_...
STRIPE_PRICE_ID_TIER_3=price_...
STRIPE_PRICE_ID_TIER_2_EUR=price_...
STRIPE_PRICE_ID_TIER_3_EUR=price_...
```

### 13.3 Test checks

- [ ] Click "Upgrade to Tier 2" → redirected to Stripe-hosted checkout
- [ ] Complete payment → redirected to `/account?session_id=cs_xxx`
- [ ] `/account` page shows "Tier 2" tier, correct price, correct period end
- [ ] `subscriptions` table has row with correct status + price ID
- [ ] Stripe CLI forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Cancel in Customer Portal → `/account` shows "Expires on" after page refresh
- [ ] `cancel_at_period_end` is true in DB
- [ ] Reactivate → `/account` shows "Renews on"

---

## 14. Razorpay Setup Checklist (for a new project)

### 14.1 Dashboard setup

1. Create a **Razorpay account** (live + test mode)
2. Create **plans** for each tier (Tier 2, Tier 3) — monthly, INR amounts
3. Copy each **plan ID** (starts with `plan_`)
4. Create a **webhook endpoint** pointing to `https://yourdomain.com/api/razorpay/webhook`
   - Events: `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.resumed`
   - Copy the **webhook secret**

### 14.2 Env vars

```bash
RAZORPAY_KEY_ID=rzp_live_...    # or rzp_test_... for test mode
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_ID_TIER_2=plan_...
RAZORPAY_PLAN_ID_TIER_3=plan_...
```

### 14.3 Test checks

- [ ] Set `NEXT_PUBLIC_DEV_REGION=IN` in `.env` for local testing
- [ ] Pricing page shows ₹500 / ₹1250 in INR
- [ ] Click "Upgrade to Tier 2" → redirected to Razorpay-hosted checkout
- [ ] Complete payment → redirected back to site
- [ ] `/account` page shows "Tier 2" tier, INR price
- [ ] `subscriptions` table has row with `razorpay_subscription_id` + `currency: 'INR'`
- [ ] Cancel → DB shows `cancel_at_period_end: true`
- [ ] Reactivate → DB shows `cancel_at_period_end: false`

---

## 15. Adding a New Tier

1. Add the tier to the `Tier` union type in `src/lib/limits.ts`
2. Add entries to `TIER_LIMITS`, `TIER_LABEL`, `TIER_PRICE_USD`, `TIER_PRICE_EUR`, `TIER_PRICE_INR`
3. Add `STRIPE_PRICE_ID_<NAME>` env var (USD)
4. Add `STRIPE_PRICE_ID_<NAME>_EUR` env var (EUR)
5. Add `RAZORPAY_PLAN_ID_<NAME>` env var (INR)
6. Add cases to `tierFromPriceId`, `tierFromRazorpayPlanId`, and `stripePriceIdForTier`
7. Update the pricing page cards with new features/limits
8. Create the corresponding products + prices in Stripe and plans in Razorpay

---

## 16. Common Pitfalls

### 16.1 Stripe mode skew

A **test-mode** secret key with a **live-mode** price ID (or vice versa) returns 500 with `No such price` from `create-checkout-session`. Verify all Stripe env vars are from the **same mode** (all live or all test).

### 16.2 Webhook raw body

**Never** use `request.json()` in webhook routes. Use `request.text()` and `export const dynamic = 'force-dynamic'`. If a body-parsing middleware runs before the webhook handler, signature verification fails.

### 16.3 Service-role key in client bundle

`SUPABASE_SERVICE_ROLE_KEY` must never appear in `.next/static/`. If it does, you imported `createServiceClient()` from a `'use client'` file. Verify: `grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/static`.

### 16.4 cancel_at vs cancel_at_period_end

Stripe's cancel signal lives in **two places**: `cancel_at_period_end` (legacy boolean) and `cancel_at` (timestamp). Read **both** and persist the OR. The `cancel_at` field is not in the SDK's TypeScript types — use `(sub as unknown as { cancel_at?: number | null }).cancel_at`.

### 16.5 Fresh user has no subscription row

A new signup has no `subscriptions` row at all. This is **normal** — `getSubscription()` returns `null`, `tierFromSubscription(null)` returns `'free'`. Do not return 500; `null` is a valid state.

### 16.6 `cancel_at_period_end` does not demote

A user who's cancelled but still within the current period **keeps paid limits**. Only when the webhook fires `customer.subscription.deleted` and the row updates to `status: 'canceled'` does tier resolution drop to `'free'`.

### 16.7 Counter resets at UTC midnight

Usage counters reset at midnight UTC. This is documented on the `/account` page as "Resets in Xh Ym (midnight UTC)". Users in different timezones may find this jarring, but it's consistent across the fleet.

### 16.8 Razorpay SDK type gaps

The npm `razorpay` package's TypeScript types are incomplete. `cancel_at_cycle_end` is missing from the update body. Use an `as any` cast with a comment explaining why. The values are validated server-side by Razorpay anyway.

### 16.9 Stripe's `apiVersion` type

The Stripe SDK's `apiVersion` type is a narrow union that isn't re-exported from the root entry. Pinning a specific version requires an `as any` cast:
```ts
new Stripe(key, { apiVersion: '2026-05-27.dahlia' as any })
```

### 16.10 Upsert returning 0 rows

If you use upsert with `ignoreDuplicates: true` (PostgREST) and the row already exists, the response returns 0 rows. Use `onConflict: 'user_id'` without `ignoreDuplicates` for upserts on the subscriptions table.

### 16.11 Stripe rejects both cancel params together

Passing both `cancel_at_period_end` and `cancel_at` in a single update call returns 400: "Received both ... parameters. Please pass in only one." The reactivation endpoint handles this by checking which flag is set on the live subscription and clearing them in separate passes.

### 16.12 pricing page currency persistence

The `CurrencyToggle` sets a `jf-currency` cookie. The NavBar's BillingPopdown and PricingCTAButtons read this cookie. Without the cookie, the default is the geo-detected currency (jf-region cookie).

---

## 17. File Reference

| File | Purpose |
|---|---|
| `src/lib/stripe.ts` | Stripe SDK singleton, `stripePriceIdForTier()` |
| `src/lib/razorpay.ts` | Razorpay SDK singleton, `razorpayPlanIdForTier()` |
| `src/lib/subscription.ts` | `getSubscription()`, `getEffectiveTier()`, `subscriptionProvider()`, reconciliation functions |
| `src/lib/limits.ts` | `Tier`, `TIER_LIMITS`, `tierFromPriceId()`, `tierFromRazorpayPlanId()`, `tierFromSubscription()`, price maps per currency |
| `src/lib/region.ts` | `getRegion()`, `Region`, `Currency` types |
| `src/lib/usage.ts` | `tryIncrement()`, `getOrCreateTodayUsage()`, `getTodayUsageReadOnly()` |
| `src/middleware.ts` | Region detection via Vercel geo headers |
| `src/app/api/stripe/create-checkout-session/route.ts` | Create Stripe Checkout Session |
| `src/app/api/stripe/create-portal-session/route.ts` | Create Stripe Customer Portal session |
| `src/app/api/stripe/webhook/route.ts` | Stripe webhook handler + subscription mirroring |
| `src/app/api/stripe/cancel-subscription/route.ts` | Schedule cancel at period end |
| `src/app/api/stripe/reactivate-subscription/route.ts` | Undo cancel at period end |
| `src/app/api/razorpay/create-subscription/route.ts` | Create Razorpay subscription |
| `src/app/api/razorpay/cancel-subscription/route.ts` | Cancel Razorpay subscription at cycle end |
| `src/app/api/razorpay/reactivate-subscription/route.ts` | Undo cancel at cycle end |
| `src/app/api/razorpay/get-update-card-link/route.ts` | Return URL for payment method update |
| `src/app/api/razorpay/webhook/route.ts` | Razorpay webhook handler + subscription mirroring |
| `src/app/api/usage/check/route.ts` | Read-only pre-flight usage check |
| `src/app/api/jobs/add/route.ts` | Server-side job pipeline with atomic usage enforcement |
| `src/app/api/ai/edit-document/route.ts` | AI edit with server-side usage enforcement |
| `src/app/(main)/pricing/PricingClient.tsx` | Pricing page with currency toggle + plan cards |
| `src/app/(main)/pricing/PricingCTAButtons.tsx` | "Upgrade" buttons → PSP redirect |
| `src/app/(main)/pricing/CurrencyToggle.tsx` | USD/EUR/INR currency switcher |
| `src/app/(main)/account/page.tsx` | Account page: plan + usage + manage/cancel/renew |
| `src/components/NavBar.tsx` | BillingPopdown: compact plan + usage in header |
| `supabase/migrations/005_*.sql` | Subscriptions + usage tables + RPC |
| `supabase/migrations/007_*.sql` | Razorpay columns |
| `supabase/migrations/008_*.sql` | Currency column |
| `supabase/migrations/011_*.sql` | Meta CAPI event_id column |
