// lib/region.ts
//
// Server-only helper for geo-based region detection. The middleware
// sets the `x-jf-region` header on every request, and we read it
// here. In local dev the header defaults to 'OTHER' unless
// NEXT_PUBLIC_DEV_REGION is set.
//
// Region is used to determine the default currency:
//   IN  → INR (Razorpay)
//   EEA → EUR (Stripe)
//   OTHER → USD (Stripe)

import { headers } from 'next/headers';

export type Region = 'IN' | 'EEA' | 'OTHER';
export type Currency = 'USD' | 'EUR' | 'INR';

// EEA = EU 27 + Iceland, Liechtenstein, Norway
const EEA_COUNTRIES = new Set([
  // EU 27
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  // EFTA
  'IS','LI','NO',
]);

export function isEEACountry(country: string | undefined): boolean {
  return !!country && EEA_COUNTRIES.has(country.toUpperCase());
}

/** Map a region to its default currency. */
export function defaultCurrencyForRegion(region: Region): Currency {
  if (region === 'IN') return 'INR';
  if (region === 'EEA') return 'EUR';
  return 'USD';
}

/**
 * Read the region header set by middleware. Falls back to
 * NEXT_PUBLIC_DEV_REGION for local dev where Vercel geo isn't
 * available.
 */
export async function getRegion(): Promise<Region> {
  const h = await headers();
  const raw = h.get('x-jf-region');
  if (raw === 'IN' || raw === 'EEA' || raw === 'OTHER') return raw;

  // Fallback for local dev / non-Vercel environments.
  const devRegion = process.env.NEXT_PUBLIC_DEV_REGION;
  if (devRegion === 'IN') return 'IN';
  if (devRegion === 'EEA') return 'EEA';
  return 'OTHER';
}

/** Convenience shorthand. */
export async function isIndia(): Promise<boolean> {
  return (await getRegion()) === 'IN';
}
