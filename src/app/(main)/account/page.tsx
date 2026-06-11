// /account — subscription + usage dashboard.
//
// Server component: reads the user's subscription row and today's
// usage, then renders a static page. The interactive bits (the
// "Manage Subscription" button and the Autorenew toggle) live in
// small client subcomponents — the page itself only orchestrates
// the data fetch + the layout.
//
// We use the service-role client here on purpose — the user has
// their own RLS policy that lets them read these rows, but the
// service client skips a network round-trip and avoids a 401 if
// the cookie store is mid-refresh.

import { createClient } from '@/lib/supabase-utils/server';
import { getSubscription, refreshSubscriptionFromStripe, type SubscriptionRow } from '@/lib/subscription';
import { getTodayUsageReadOnly } from '@/lib/usage';
import { tierFromSubscription, TIER_LIMITS, TIER_LABEL, TIER_PRICE_USD } from '@/lib/limits';
import { timeUntilReset } from '@/lib/usage-utils';
import Card from '@/components/design/Card';
import AccountManageButton from './AccountManageButton';
import AccountUpgradeButton from './AccountUpgradeButton';
import AccountAutoRenewToggle from './AccountAutoRenewToggle';

export const dynamic = 'force-dynamic'; // always show fresh data

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // The middleware should have already redirected — but if we land
    // here, hand the user to login.
    return (
      <div className="max-w-[680px] mx-auto text-center py-20">
        <p className="text-[16px] text-steel">
          Please <a href="/login" className="text-primary hover:underline">sign in</a> to view your account.
        </p>
      </div>
    );
  }

  // Reconcile the subscription with Stripe on every /account load.
  // The webhook that writes `cancel_at_period_end` is fire-and-forget
  // — it can be delayed or missed, which leaves the DB showing
  // "Renews on" for a user who has actually cancelled. Pulling from
  // Stripe here closes that gap: the page always reflects the truth
  // and the DB heals itself as a side effect. If the Stripe call
  // throws (network blip, API down), we fall back to the local row
  // so the page still renders. We don't use `getEffectiveTier` here
  // because that function is the enforcement path for the API
  // routes — adding a Stripe round-trip to it would slow every
  // /api/usage/* call, not just /account.
  let subscription: SubscriptionRow | null = null;
  try {
    subscription = await refreshSubscriptionFromStripe(user.id);
  } catch (err) {
    console.error('[account] subscription reconcile failed, falling back to DB:', err);
    subscription = await getSubscription(user.id);
  }
  const tier = tierFromSubscription(subscription);
  const limits = TIER_LIMITS[tier];
  const usage = await getTodayUsageReadOnly(user.id);

  // Diagnostic: log the post-reconcile state we actually render from.
  // Combined with the [subscription-reconcile] line above, this lets
  // us see the full pipeline: what Stripe returned → what got
  // upserted → what the page is rendering.
  console.log(
    `[account] user=${user.id} tier=${tier} ` +
      `subStatus=${subscription?.status ?? 'null'} ` +
      `cancelAtPeriodEnd=${subscription?.cancel_at_period_end ?? 'null'} ` +
      `periodEnd=${subscription?.current_period_end ?? 'null'}`
  );

  const jobsUsed = usage?.jobs_added ?? 0;
  const editsUsed = usage?.edits_made ?? 0;

  const isPaid = tier !== 'free';
  const tierName = TIER_LABEL[tier];
  const tierPrice = TIER_PRICE_USD[tier];

  // Status pill text. We don't surface 'past_due' / 'incomplete'
  // details here — the user already gets those via the Stripe
  // customer portal. We just show the active period.
  const periodEnd = subscription?.current_period_end ?? null;
  const isTrialing = subscription?.status === 'trialing';
  const cancelAtPeriodEnd = subscription?.cancel_at_period_end;

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="mb-10">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
          Account
        </p>
        <h1 className="text-[32px] font-semibold text-ink leading-tight">
          Plan &amp; usage
        </h1>
        <p className="text-[15px] text-steel mt-2">
          Signed in as <span className="text-ink font-medium">{user.email}</span>
        </p>
      </div>

      {/* Plan card */}
      <Card variant={isPaid ? 'elevated' : 'cream'} className="mb-6">
        <div className="flex items-start justify-between gap-6 mb-5">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-steel mb-1.5">
              Current plan
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-semibold text-ink leading-none">
                {tierName}
              </span>
              {isPaid && (
                <span className="text-[15px] text-steel">
                  ${tierPrice}/mo
                </span>
              )}
            </div>
            {isPaid && (
              <>
                <p className="text-[13px] text-steel mt-2">
                  {isTrialing
                    ? 'Trial ends on'
                    : cancelAtPeriodEnd
                    ? 'Expires on'
                    : 'Renews on'}{' '}
                  <span className="text-ink font-medium">{formatDate(periodEnd)}</span>
                </p>
              </>
            )}
            {!isPaid && (
              <p className="text-[13px] text-steel mt-2">
                Free tier — upgrade to raise your daily limits.
              </p>
            )}
          </div>
          {isPaid ? (
            <AccountManageButton />
          ) : (
            <AccountUpgradeButton />
          )}
        </div>

        {/*
          Autorenew toggle — paid users only. The single control
          that replaces the prior "Manage in Stripe → cancel" +
          "Don't cancel my subscription" two-step flow. The
          `initialEnabled` mirrors `!cancelAtPeriodEnd` so the
          toggle position is consistent with the date line above
          on first render; the component then drives its own
          optimistic state from there.
        */}
        {isPaid && (
          <>
            {/*
              Divider line that spans the full width of the card.
              The Card has p-6 padding, so we negate the left/right
              margin to make the border reach both edges of the
              card.
            */}
            <div className="border-t border-beige-deep -mx-6" />
            <div className="pt-4">
              <AccountAutoRenewToggle
                initialEnabled={!cancelAtPeriodEnd}
                initialPeriodEnd={periodEnd}
              />
            </div>
          </>
        )}
      </Card>

      {/* Usage card */}
      <Card variant="default" className="mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[15px] font-semibold text-ink">Today&apos;s usage</p>
          <p className="text-[12px] text-steel">
            Resets in {timeUntilReset()} (midnight UTC)
          </p>
        </div>

        <UsageBar
          label="Jobs added"
          used={jobsUsed}
          limit={limits.jobs}
        />
        <div className="h-5" />
        <UsageBar
          label="Document edits"
          used={editsUsed}
          limit={limits.edits}
        />
      </Card>

      {/* Plan comparison hint */}
      <div className="text-center mt-10">
        <p className="text-[14px] text-steel">
          Want different limits?{' '}
          <a href="/pricing" className="text-primary hover:underline font-medium">
            See all plans
          </a>
        </p>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const atCap = used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span
          className={`text-[13px] font-semibold ${
            atCap ? 'text-primary' : 'text-steel'
          }`}
        >
          {used} / {limit}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{
          backgroundColor: '#f3efe7',
          border: '1px solid #e6d5a8',
        }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: atCap ? '#dc2626' : '#fa520f',
          }}
        />
      </div>
    </div>
  );
}
