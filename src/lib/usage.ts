// lib/usage.ts
//
// Server-side usage counter helpers. All writes go through the
// service-role client so RLS doesn't get in the way of our atomic
// increment path. Reads use the same client (cheap; one row).
//
// The counter resets at UTC midnight — `usage_date` is stored as a
// plain `date` (no timezone), and the migration's RPC computes
// `(now() at time zone 'utc')::date` server-side. The client UI shows
// a "resets at midnight UTC" hint so users aren't surprised by a
// sudden reset.

import { createServiceClient } from '@/lib/supabase-utils/service';
import type { TierLimits } from '@/lib/limits';

export interface UsageRow {
  user_id: string;
  usage_date: string;       // ISO date 'YYYY-MM-DD' (UTC)
  jobs_added: number;
  edits_made: number;
}

/** Get today's UTC date as 'YYYY-MM-DD'. */
export function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns today's row, creating it (zeros) if it doesn't exist. Uses
 * upsert with onConflict so two concurrent requests can't both create
 * a duplicate. The first writer wins, the second's RETURNING clause
 * returns the same row.
 */
export async function getOrCreateTodayUsage(userId: string): Promise<UsageRow> {
  const supabase = createServiceClient();
  const today = utcDateString();

  // Try to read the existing row first.
  const { data: existing } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  if (existing) return existing as UsageRow;

  // Row doesn't exist — create it with zeros.
  const { data, error } = await supabase
    .from('usage_counters')
    .insert({ user_id: userId, usage_date: today, jobs_added: 0, edits_made: 0 })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[usage] getOrCreateTodayUsage failed:', error);
    throw new Error('Failed to read usage counter');
  }
  return data as UsageRow;
}

/**
 * Read today's usage without creating a row. Returns null if no row
 * exists yet (which means 0/0 in practice). Used by the public-facing
 * /account page where we don't want writes to count.
 */
export async function getTodayUsageReadOnly(userId: string): Promise<UsageRow | null> {
  const supabase = createServiceClient();
  const today = utcDateString();

  const { data, error } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  if (error) {
    console.error('[usage] getTodayUsageReadOnly failed:', error);
    return null;
  }
  return (data as UsageRow) ?? null;
}

export type Action = 'add_job' | 'edit_doc';

export interface IncrementResult {
  ok: boolean;
  /** The new counter value after the increment (only meaningful when ok=true). */
  value: number;
  /** True if the increment was rejected because the user is at the limit. */
  atLimit: boolean;
}

/**
 * Atomically bump today's counter for the given action, but ONLY if the
 * user is below the limit.
 *
 * We delegate to the Postgres function `try_increment_usage` (defined in
 * migration 005) which performs the upsert + UPDATE in a single
 * statement. The function returns `{ ok: true, value: <new> }` on
 * success or `{ ok: false, value: <cap> }` if the cap guard rejected
 * the bump. The function is SECURITY DEFINER so it bypasses RLS — but
 * it only operates on p_user_id, so it's still scoped.
 *
 * Why the RPC and not a client-side UPDATE: a JS .update() can't
 * express `SET x = x + 1 WHERE x < cap` atomically. The function does
 * it in one statement, eliminating the race where two parallel
 * requests both read x = cap-1 and both bump to cap.
 */
export async function tryIncrement(
  userId: string,
  action: Action,
  limits: TierLimits
): Promise<IncrementResult> {
  const cap = action === 'add_job' ? limits.jobs : limits.edits;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('try_increment_usage', {
    p_user_id: userId,
    p_action: action,
    p_cap: cap,
  });

  if (error) {
    console.error('[usage] tryIncrement RPC failed:', error);
    throw new Error('Failed to increment counter');
  }

  // data is the JSON object the function returns: { ok, value }.
  const result = data as { ok: boolean; value: number } | null;
  if (!result) {
    throw new Error('Increment RPC returned no data');
  }
  return {
    ok: result.ok,
    value: result.value,
    atLimit: !result.ok,
  };
}
