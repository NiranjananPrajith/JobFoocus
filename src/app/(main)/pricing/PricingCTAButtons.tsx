'use client';

// PricingCTAButtons — client component that handles the three CTA
// modes on the pricing page:
//   - 'signup'   → just routes to /signup
//   - 'checkout' → POSTs to /api/stripe/create-checkout-session (USD/EUR)
//                  or /api/razorpay/create-subscription (INR), then
//                  window.location's to the returned URL
//   - 'manage'   → routes to /account (used elsewhere, not on /pricing)
//
// We split this out from the (server) page so the click handler is
// in a 'use client' boundary. The page itself can stay a server
// component and the static copy is SSG'd.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/design/Button';
import type { Currency } from '@/lib/region';

interface PricingCTAButtonsProps {
  cta: string;
  ctaVariant: 'primary' | 'outline' | 'dark';
  mode: 'signup' | 'checkout';
  tier?: 'pro' | 'max';
  currency?: Currency;
}

export default function PricingCTAButtons({
  cta,
  ctaVariant,
  mode,
  tier,
  currency = 'USD',
}: PricingCTAButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (mode === 'signup') {
      router.push('/signup');
      return;
    }
    if (!tier) {
      console.error('[pricing] checkout mode requires tier');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Route to Razorpay for INR, Stripe for USD and EUR.
      let endpoint: string;
      let body: Record<string, string>;

      if (currency === 'INR') {
        endpoint = '/api/razorpay/create-subscription';
        body = { tier };
      } else {
        endpoint = '/api/stripe/create-checkout-session';
        body = { tier, currency };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        // If the user is not logged in, the API returns 401. Send them
        // through signup first, then back here.
        if (res.status === 401) {
          router.push(`/signup?next=${encodeURIComponent('/pricing')}`);
          return;
        }
        throw new Error(data?.error || 'Failed to start checkout');
      }
      // Full page navigation so the PSP-hosted page can take over.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="mt-auto">
      <Button
        variant={ctaVariant}
        className="w-full justify-center"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Loading…' : cta}
      </Button>
      {error && (
        <p className="mt-2 text-[12px] text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
