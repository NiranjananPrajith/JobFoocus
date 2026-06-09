'use client';

// "Upgrade" button on /account for Free users. Just routes to the
// pricing page; the pricing page CTAs handle the actual Stripe
// Checkout flow.

import { useRouter } from 'next/navigation';
import Button from '@/components/design/Button';

export default function AccountUpgradeButton() {
  const router = useRouter();
  return (
    <Button
      variant="primary"
      onClick={() => router.push('/pricing')}
      className="shrink-0"
    >
      Upgrade
    </Button>
  );
}
