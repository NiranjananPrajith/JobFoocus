'use client';

// "Manage in Stripe" button on /account. POSTs to
// /api/stripe/create-portal-session and redirects to the returned
// Stripe-hosted URL.

import { useState } from 'react';
import Button from '@/components/design/Button';

export default function AccountManageButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to open billing portal');
      }
      window.location.href = data.url;
    } catch (err) {
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
        {loading ? 'Opening…' : 'Manage in Stripe'}
      </Button>
      {error && (
        <p className="mt-2 text-[12px] text-red-600 text-right max-w-[180px]">
          {error}
        </p>
      )}
    </div>
  );
}
