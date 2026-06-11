'use client';

// "Manage Subscription" button on /account. POSTs to
// /api/stripe/create-portal-session and opens the returned
// Stripe-hosted URL in a new tab.

import { useState } from 'react';
import Button from '@/components/design/Button';

export default function AccountManageButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    // Pre-open a blank tab synchronously inside the click handler so
    // the browser's popup-blocker doesn't reject us — `window.open`
    // after an `await` is not guaranteed to keep its user-activation.
    // We navigate the new tab to the Stripe URL once the API call
    // returns. If the request fails we close the blank tab so we
    // don't leave an empty window behind.
    const newTab = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to open billing portal');
      }
      if (newTab) {
        newTab.location.href = data.url;
      } else {
        // Popup was blocked — fall back to in-tab navigation so the
        // user can still reach the portal.
        window.location.href = data.url;
      }
    } catch (err) {
      if (newTab) newTab.close();
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="shrink-0">
      <Button
        variant="outline"
        onClick={onClick}
        disabled={loading}
      >
        {loading ? 'Opening…' : 'Manage Subscription'}
      </Button>
      {error && (
        <p className="mt-2 text-[12px] text-red-600 text-right max-w-[180px]">
          {error}
        </p>
      )}
    </div>
  );
}
