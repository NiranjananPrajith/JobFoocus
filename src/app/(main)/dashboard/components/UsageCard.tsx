'use client';

import Card from '@/components/design/Card';

interface UsageCardProps {
  tier: 'free' | 'pro' | 'max';
  usedJobs: number;
  usedEdits: number;
  limitJobs: number;
  limitEdits: number;
  resetAt: string;
}

const TIER_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', max: 'Max' };

function ProgressBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const warn = pct > 75;
  const danger = pct > 90;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-steel">{label}</span>
        <span className="text-[12px] font-medium text-ink">{used} / {limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: danger ? 'var(--danger-text)' : warn ? 'var(--primary)' : 'var(--primary)',
            opacity: danger ? 1 : warn ? 0.8 : 0.7,
          }}
        />
      </div>
    </div>
  );
}

function getTimeUntilReset(resetAt: string): string {
  const reset = new Date(resetAt);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  if (diffMs <= 0) return 'Resets soon';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `Resets in ${hours}h ${minutes}m`;
}

export default function UsageCard({ tier, usedJobs, usedEdits, limitJobs, limitEdits, resetAt }: UsageCardProps) {
  return (
    <Card variant="elevated" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel">
          Usage today
        </span>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{
            backgroundColor: tier === 'free' ? 'var(--surface)' : 'var(--primary)',
            color: tier === 'free' ? 'var(--ink)' : 'var(--on-primary)',
          }}
        >
          {TIER_LABEL[tier] || tier}
        </span>
      </div>
      <div className="space-y-3">
        {limitJobs > 0 && <ProgressBar used={usedJobs} limit={limitJobs} label="Jobs added" />}
        <ProgressBar used={usedEdits} limit={limitEdits} label="Document edits" />
      </div>
      <p className="text-[11px] text-muted mt-3">
        {getTimeUntilReset(resetAt)}
      </p>
    </Card>
  );
}
