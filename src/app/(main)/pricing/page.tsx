import { cookies } from 'next/headers';
import { getRegion, defaultCurrencyForRegion, type Currency } from '@/lib/region';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic'; // geo-aware, can't be SSG'd

export const metadata = {
  title: 'Pricing — Job Foocus',
};

/**
 * Read the jf-currency cookie set by the client-side toggle. Returns
 * null if not set or invalid.
 */
async function getCurrencyFromCookie(): Promise<Currency | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('jf-currency')?.value;
  if (raw === 'USD' || raw === 'EUR' || raw === 'INR') return raw;
  return null;
}

export default async function PricingPage() {
  // The currency is resolved from (in priority order):
  //   1. The jf-currency cookie (set by the toggle on prior visit)
  //   2. The user's geo region (default for first visit)
  const cookieCurrency = await getCurrencyFromCookie();
  const region = await getRegion();
  const defaultCurrency = cookieCurrency ?? defaultCurrencyForRegion(region);

  return (
    <div className="max-w-[1024px] mx-auto">
      <PricingClient defaultCurrency={defaultCurrency} />
    </div>
  );
}
