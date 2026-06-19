'use client';

// "Manage Subscription" button on /account. Branches on provider:
//   - Stripe → opens Stripe Customer Portal in a new tab
//   - Razorpay → opens the AccountRazorpayManageModal (inline)

import { useState } from 'react';
import Button from '@/components/design/Button';
import Spinner from '@/components/Spinner';
import AccountRazorpayManageModal from './AccountRazorpayManageModal';

interface AccountManageButtonProps {
  provider?: 'stripe' | 'razorpay' | null;
  currentPeriodEnd?: string | null;
}

export default function AccountManageButton({
  provider = null,
  currentPeriodEnd = null,
}: AccountManageButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Razorpay users get the inline modal.
  if (provider === 'razorpay') {
    return (
      <>
        <div className="shrink-0">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Manage Subscription
          </Button>
        </div>
        <AccountRazorpayManageModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          currentPeriodEnd={currentPeriodEnd}
        />
      </>
    );
  }

  // Stripe users open the hosted Customer Portal in a new tab.
  const onClick = async () => {
    setLoading(true);
    setError(null);
    // Pre-open a blank tab synchronously inside the click handler so
    // the browser's popup-blocker doesn't reject us.
    const newTab = window.open('', '_blank');
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
        {loading ? <><Spinner size={14} className="mr-2" /> Opening…</> : 'Manage Subscription'}
      </Button>
      {error && (
        <p className="mt-2 text-[12px] text-red-600 text-right max-w-[180px]">
          {error}
        </p>
      )}
    </div>
  );
}
