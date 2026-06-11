// lib/usage-utils.ts
//
// Client-safe usage display helpers. Pure functions, no I/O, no
// server-only imports — safe to import from both server components
// (the /account page) and 'use client' components (the NavBar
// billing popdown).
//
// Kept separate from `lib/usage.ts`, which is server-only because it
// imports the service-role Supabase client. The split is deliberate:
// anything that touches the DB lives in `usage.ts`; anything that
// just formats numbers / dates for the UI lives here.

/**
 * "resets in 5h 12m" — hours and minutes until the next UTC midnight.
 * Mirrors the server-side reset logic: the `usage_date` is stored as
 * a plain `date` in UTC, so the counter rolls over at 00:00 UTC
 * regardless of the user's timezone. The /account page surfaces
 * "(midnight UTC)" alongside this string to make that explicit.
 */
export function timeUntilReset(now: Date = new Date()): string {
  const nextMidnightUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );
  const diffMs = nextMidnightUtc.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
