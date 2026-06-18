'use client';

// AccountRazorpayManageModal — small modal for IN users to manage
// their Razorpay subscription. Shows the next charge date and
// provides an "Update card" button that opens Razorpay's hosted
// payment update page in a new tab.

import { useState } from 'react';

interface AccountRazorpayManageModalProps {
  open: boolean;
  onClose: () => void;
  currentPeriodEnd: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AccountRazorpayManageModal({
  open,
  onClose,
  currentPeriodEnd,
}: AccountRazorpayManageModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpdateCard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/razorpay/get-update-card-link', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to get update link');
      }
      window.open(data.url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-[420px] w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-steel hover:text-ink transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 className="text-[18px] font-semibold text-ink mb-4">
          Manage Subscription
        </h3>

        <div className="space-y-4 mb-6">
          <div className="bg-cream rounded-lg p-4">
            <p className="text-[13px] text-steel mb-1">Next charge</p>
            <p className="text-[15px] font-medium text-ink">
              {formatDate(currentPeriodEnd)}
            </p>
          </div>

          <button
            onClick={handleUpdateCard}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg border border-hairline-soft text-[14px] font-medium text-ink hover:bg-cream transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Update payment method'}
          </button>
        </div>

        {error && (
          <p className="text-[12px] text-red-600 text-center">{error}</p>
        )}

        <p className="text-[12px] text-steel mt-3 text-center">
          Invoices and payment history are available in the{' '}
          <a
            href="https://dashboard.razorpay.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Razorpay dashboard
          </a>.
        </p>
      </div>
    </div>
  );
}
