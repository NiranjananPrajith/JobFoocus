'use client';

// "Don't cancel my subscription" link on /account. POSTs to
// /api/stripe/reactivate-subscription, which clears the cancel
// flags in Stripe and mirrors the change into our DB. On success
// we router.refresh() so the page re-runs the server-side
// reconcile and shows "Renews on <date>" in place of "Expires on".

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountReactivateLink() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to reactivate');
      }
      // Soft refresh: re-runs the server component (which calls
      // refreshSubscriptionFromStripe) without a full page reload.
      // The reconcile will pull the now-active state from Stripe
      // and the page will flip to "Renews on <date>".
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="text-[13px] text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Reactivating…' : "Don't cancel my subscription"}
      </button>
      {error && (
        <span className="text-[12px] text-red-600">{error}</span>
      )}
    </span>
  );
}
