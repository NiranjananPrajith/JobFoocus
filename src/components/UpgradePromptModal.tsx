'use client';

// UpgradePromptModal — shown when the user is at their daily limit
// (job-add or document-edit) and the client-side /api/usage/check or
// server-side gate returns allowed:false.
//
// This is a friendly, opt-in modal. It explains the cap, suggests an
// upgrade, and lets the user either jump to /pricing or dismiss. It
// does NOT force an upgrade — the user can still keep using the app
// for other things; they just can't perform THIS action today.
//
// We share this single component between the three call sites:
//   - AddJobModal.handleSubmitJD
//   - application/page.tsx runExtensionPipelineCore
//   - document/page.tsx handleEditSubmit
//
// The `blockedAction` prop is just used in the headline copy.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Button from '@/components/design/Button';

type BlockedAction = 'add_job' | 'edit_doc';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedAction: BlockedAction;
  /** Current tier — used to suggest the right upgrade. */
  tier: 'free' | 'pro' | 'max';
  /** Today's used / limit for the blocked action. */
  used: number;
  limit: number;
  /** The other metric, for context in the body. */
  otherUsed?: number;
  otherLimit?: number;
  otherLabel?: string;
}

const ACTION_HEADLINES: Record<BlockedAction, string> = {
  add_job: "You've hit your daily job limit",
  edit_doc: "You've hit your daily edit limit",
};

const ACTION_BODY: Record<BlockedAction, (used: number, limit: number) => string> = {
  add_job: (used, limit) =>
    `Free plan allows ${limit} jobs per day — you've used ${used}. Upgrade for more headroom.`,
  edit_doc: (used, limit) =>
    `Free plan allows ${limit} document edits per day — you've used ${used}. Upgrade for more headroom.`,
};

const ACTION_NOUN: Record<BlockedAction, string> = {
  add_job: 'jobs',
  edit_doc: 'edits',
};

export default function UpgradePromptModal({
  isOpen,
  onClose,
  blockedAction,
  tier,
  used,
  limit,
  otherUsed,
  otherLimit,
  otherLabel,
}: UpgradePromptModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Close on Escape.
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  // Pick the suggested upgrade. Free → Pro is the obvious next step.
  // Pro → Max is the next tier up. Max → "you're on the top tier, but
  // here's a friendly reminder that limits reset at midnight UTC".
  const suggestedTier = tier === 'free' ? 'pro' : tier === 'pro' ? 'max' : null;
  const suggestedLabel =
    suggestedTier === 'pro' ? 'Pro — 25 jobs / 150 edits / day'
    : suggestedTier === 'max' ? 'Max — 250 jobs / 500 edits / day'
    : 'Back to dashboard';

  const handleSeePlans = () => {
    onClose();
    router.push('/pricing');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        className="w-full max-w-[440px] bg-canvas rounded-xl border border-hairline-soft shadow-[rgba(0,0,0,0.12)_0px_8px_24px] p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2
              id="upgrade-modal-title"
              className="text-[18px] font-semibold text-ink leading-snug"
            >
              {ACTION_HEADLINES[blockedAction]}
            </h2>
            <p className="text-[14px] text-steel mt-1.5 leading-relaxed">
              {ACTION_BODY[blockedAction](used, limit)}
            </p>
          </div>
        </div>

        {/* Tier snapshot — shows the user where they are and the next rung. */}
        <div className="rounded-lg bg-cream border border-beige-deep p-4 mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-steel">
              Current plan
            </span>
            <span className="text-[12px] font-semibold text-primary capitalize">
              {tier}
            </span>
          </div>
          <div className="space-y-1.5">
            <UsageRow
              label="Jobs today"
              used={used}
              limit={limit}
              highlight={blockedAction === 'add_job'}
            />
            {typeof otherUsed === 'number' && typeof otherLimit === 'number' && (
              <UsageRow
                label={otherLabel || 'Edits today'}
                used={otherUsed}
                limit={otherLimit}
                highlight={blockedAction === 'edit_doc'}
              />
            )}
          </div>
        </div>

        <p className="text-[13px] text-steel mb-5">
          Daily limits reset at midnight UTC. {suggestedTier
            ? <>Upgrading to <span className="font-semibold text-ink">{suggestedLabel}</span> raises both your job and edit caps.</>
            : <>You're on the top tier — the cap is to prevent abuse.</>
          }
        </p>

        <div className="flex items-center gap-3">
          {suggestedTier ? (
            <Button
              variant="primary"
              onClick={handleSeePlans}
              className="flex-1 justify-center"
            >
              See plans
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onClose}
              className="flex-1 justify-center"
            >
              Got it
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 justify-center"
          >
            {suggestedTier ? 'Maybe later' : 'Close'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UsageRow({
  label,
  used,
  limit,
  highlight,
}: {
  label: string;
  used: number;
  limit: number;
  highlight: boolean;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1">
        <span className={highlight ? 'font-semibold text-ink' : 'text-steel'}>
          {label}
        </span>
        <span className={highlight ? 'font-semibold text-primary' : 'text-steel'}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-canvas border border-hairline-soft overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: highlight ? 'var(--primary)' : 'var(--steel)',
          }}
        />
      </div>
    </div>
  );
}
