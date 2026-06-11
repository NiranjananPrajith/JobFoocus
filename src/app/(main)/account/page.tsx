// /account — subscription + usage dashboard.
//
// Server component: reads the user's subscription row and today's
// usage, then renders a static page. The only interactive bit
// (the "Manage Subscription" button) is in a small client subcomponent.
//
// We use the service-role client here on purpose — the user has
// their own RLS policy that lets them read these rows, but the
// service client skips a network round-trip and avoids a 401 if
// the cookie store is mid-refresh.

import { createClient } from '@/lib/supabase-utils/server';
import { getEffectiveTier } from '@/lib/subscription';
import { getTodayUsageReadOnly } from '@/lib/usage';
import { TIER_LABEL, TIER_PRICE_USD } from '@/lib/limits';
import { timeUntilReset } from '@/lib/usage-utils';
import Card from '@/components/design/Card';
import AccountManageButton from './AccountManageButton';
import AccountUpgradeButton from './AccountUpgradeButton';

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

  const [{ tier, limits, subscription }, usage] = await Promise.all([
    getEffectiveTier(user.id),
    getTodayUsageReadOnly(user.id),
  ]);

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
              <p className="text-[13px] text-steel mt-2">
                {isTrialing
                  ? 'Trial ends on'
                  : cancelAtPeriodEnd
                  ? 'Expires on'
                  : 'Renews on'}{' '}
                <span className="text-ink font-medium">{formatDate(periodEnd)}</span>
              </p>
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
