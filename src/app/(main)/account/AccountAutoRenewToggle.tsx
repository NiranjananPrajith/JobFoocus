'use client';

// Autorenew toggle on /account. A single iOS-style switch that flips
// the subscription between "will renew" and "scheduled to cancel at
// period end". Branches on provider to call the correct API endpoint.
//
// Flow:
//   - User clicks the toggle → optimistic flip in the UI.
//   - We POST to /api/{provider}/cancel-subscription (going off) or
//     /api/{provider}/reactivate-subscription (going on).
//   - On success: keep the optimistic state, show a green
//     checkmark + confirmation message that auto-dismisses after
//     ~4s, and call router.refresh() so the server component re-runs
//     its reconcile and updates the "Renews on / Expires on" line.
//   - On error: snap the toggle back, show a red error message
//     that stays until the next click.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AccountAutoRenewToggleProps {
  /** Initial toggle state. Server passes `!cancelAtPeriodEnd`. */
  initialEnabled: boolean;
  /** Current period end (ISO string) for the confirmation copy. */
  initialPeriodEnd: string | null;
  /** Payment provider — determines which API endpoints to call. */
  provider?: 'stripe' | 'razorpay' | null;
}

type Feedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AccountAutoRenewToggle({
  initialEnabled,
  initialPeriodEnd,
  provider = null,
}: AccountAutoRenewToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const expectedRef = useRef(initialEnabled);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const onClick = async () => {
    if (pending) return;

    const next = !enabled;
    const goingOn = next === true;
    const expectedBefore = enabled;
    expectedRef.current = next;

    setEnabled(next);
    setPending(true);
    setFeedback(null);
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    // Route to the correct provider endpoints.
    const prefix = provider === 'razorpay' ? 'razorpay' : 'stripe';
    const endpoint = goingOn
      ? `/api/${prefix}/reactivate-subscription`
      : `/api/${prefix}/cancel-subscription`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data as { error?: string }).error) ||
            "Couldn't update auto-renew. Please try again."
        );
      }

      const formatted = formatPeriodEnd(initialPeriodEnd);
      let message: string;
      if (goingOn) {
        message = formatted
          ? `Auto-renew is on — subscription will renew on ${formatted}.`
          : 'Auto-renew is on.';
      } else {
        message = formatted
          ? `Auto-renew is off — subscription will end on ${formatted}.`
          : 'Auto-renew is off.';
      }
      setFeedback({ type: 'success', message });
      router.refresh();

      dismissTimer.current = setTimeout(() => {
        setFeedback(null);
        dismissTimer.current = null;
      }, 4000);
    } catch (err) {
      setEnabled(expectedBefore);
      expectedRef.current = expectedBefore;
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] font-medium text-ink">Auto-renew</p>
          <p className="text-[12px] text-steel mt-0.5">
            {enabled
              ? 'Your subscription will renew automatically.'
              : 'Your subscription will end at the close of the current period.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle auto-renew"
          onClick={onClick}
          disabled={pending}
          className={[
            'relative inline-flex shrink-0 items-center',
            'w-11 h-6 rounded-full',
            'transition-colors duration-200',
            enabled ? 'bg-primary' : 'bg-toggle-off',
            pending ? 'opacity-60 cursor-wait' : 'cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            'disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'inline-block w-5 h-5 rounded-full bg-white shadow-sm',
              'transform transition-transform duration-200',
              enabled ? 'translate-x-[22px]' : 'translate-x-[2px]',
            ].join(' ')}
          />
        </button>
      </div>

      <div className="min-h-[20px] mt-2 flex items-start gap-1.5">
        {feedback && feedback.type === 'success' && (
          <p className="flex items-start gap-1.5 text-[13px] text-green-700 animate-[fadeIn_150ms_ease-out]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{feedback.message}</span>
          </p>
        )}
        {feedback && feedback.type === 'error' && (
          <p className="flex items-start gap-1.5 text-[13px] text-red-600">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{feedback.message}</span>
          </p>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
