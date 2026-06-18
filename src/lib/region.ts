// lib/region.ts
//
// Server-only helper for geo-based region detection. The middleware
// sets the `x-jf-region` header on every request, and we read it
// here. In local dev the header defaults to 'OTHER' unless
// NEXT_PUBLIC_DEV_REGION is set.

import { headers } from 'next/headers';

export type Region = 'IN' | 'OTHER';

/**
 * Read the region header set by middleware. Falls back to
 * NEXT_PUBLIC_DEV_REGION for local dev where Vercel geo isn't
 * available.
 */
export async function getRegion(): Promise<Region> {
  const h = await headers();
  const raw = h.get('x-jf-region');
  if (raw === 'IN' || raw === 'OTHER') return raw;

  // Fallback for local dev / non-Vercel environments.
  const devRegion = process.env.NEXT_PUBLIC_DEV_REGION;
  if (devRegion === 'IN') return 'IN';
  return 'OTHER';
}

/** Convenience shorthand. */
export async function isIndia(): Promise<boolean> {
  return (await getRegion()) === 'IN';
}
