'use client';

// Autorenew toggle on /account. A single iOS-style switch that flips
// the subscription between "will renew" and "scheduled to cancel at
// period end". Replaces the prior "Manage Subscription" + "Don't
// cancel my subscription" two-step flow for the binary on/off case
// (the Manage button still exists for payment method, invoice
// history, etc.).
//
// Flow:
//   - User clicks the toggle → optimistic flip in the UI.
//   - We POST to /api/stripe/cancel-subscription (going off) or
//     /api/stripe/reactivate-subscription (going on).
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
}: AccountAutoRenewToggleProps) {
  const router = useRouter();
  // The visible state. Starts at the server-supplied value and is
  // updated optimistically on click. We also keep a ref to the
  // "expected" state so the error path can snap back without
  // re-reading `enabled` (which is stale by the time the catch
  // runs).
  const [enabled, setEnabled] = useState(initialEnabled);
  const expectedRef = useRef(initialEnabled);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Tracks which side the user just flipped to, so the auto-dismiss
  // timer can clear it without needing to introspect the message.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clean up the dismiss timer if the component unmounts mid-flight.
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

    // Optimistic UI: flip immediately so the user sees the
    // transition even before the network round-trip completes.
    setEnabled(next);
    setPending(true);
    setFeedback(null);
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    const endpoint = goingOn
      ? '/api/stripe/reactivate-subscription'
      : '/api/stripe/cancel-subscription';

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data as { error?: string }).error) ||
            "Couldn't update auto-renew. Please try again."
        );
      }

      // Success: keep the optimistic state, build the message,
      // and revalidate the server component so the period-end
      // line updates to match the new state.
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
      // Soft refresh: re-runs the server component (which calls
      // refreshSubscriptionFromStripe) without a full page reload.
      // The reconcile will pull the new state from Stripe and the
      // page will flip between "Renews on" and "Expires on".
      router.refresh();

      // Auto-dismiss the success message after 4s. We don't need
      // to be precise — the user reading the message for 2s is
      // the same outcome as reading it for 4s.
      dismissTimer.current = setTimeout(() => {
        setFeedback(null);
        dismissTimer.current = null;
      }, 4000);
    } catch (err) {
      // Error: snap the toggle back to its pre-click state and
      // surface the error inline. We do NOT call router.refresh()
      // — the server component is still rendering the pre-click
      // state, so the page would briefly disagree with the toggle
      // for a refresh cycle. We keep them in sync by simply not
      // revalidating.
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
          // Track: 44×24, rounded-full. Knob: 20px circle. The
          // knob starts at left:2 and we translate it 20px to the
          // right when on. `transition-transform` on the knob
          // gives the slide, `transition-colors` on the track
          // gives the color swap.
          className={[
            'relative inline-flex shrink-0 items-center',
            'w-11 h-6 rounded-full',
            'transition-colors duration-200',
            enabled ? 'bg-primary' : 'bg-[#d4d4d4]',
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

      {/*
        Feedback slot. We always render the wrapper so the card
        height is stable — the message just appears/disappears
        inside it.
      */}
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

      {/*
        The fadeIn keyframes used by the success animation. We
        define them inline so we don't have to add a global
        animation for one call site. Tailwind's animate-* utility
        requires the keyframes to be in the config; the arbitrary
        `[fadeIn_150ms_ease-out]` syntax references this name.
      */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
