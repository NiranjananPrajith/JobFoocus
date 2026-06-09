// POST /api/usage/check
//
// Pre-flight check used by the client before kicking off an expensive
// action (job add, document edit). Reads the user's current
// subscription + today's counter and returns whether the requested
// action is allowed, with the full limit picture so the client can
// render the upgrade prompt with up-to-date numbers.
//
// Auth required. Body: `{ action: 'add_job' | 'edit_doc' }`.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { getEffectiveTier } from '@/lib/subscription';
import { getTodayUsageReadOnly, type Action } from '@/lib/usage';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { action?: Action } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action;
  if (action !== 'add_job' && action !== 'edit_doc') {
    return NextResponse.json(
      { error: 'Body must include { action: "add_job" | "edit_doc" }' },
      { status: 400 }
    );
  }

  // Read-only: we do NOT create a row here. The check is a UX gate, not
  // a write. (The first time the user actually increments today, the
  // row will be created by the increment path.)
  const [{ tier, limits }, usage] = await Promise.all([
    getEffectiveTier(user.id),
    getTodayUsageReadOnly(user.id),
  ]);

  const jobsUsed = usage?.jobs_added ?? 0;
  const editsUsed = usage?.edits_made ?? 0;

  const allowed =
    action === 'add_job'
      ? jobsUsed < limits.jobs
      : editsUsed < limits.edits;

  return NextResponse.json({
    allowed,
    tier,
    jobsUsed,
    jobsLimit: limits.jobs,
    editsUsed,
    editsLimit: limits.edits,
  });
}
