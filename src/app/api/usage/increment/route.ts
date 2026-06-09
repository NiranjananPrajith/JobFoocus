// POST /api/usage/increment
//
// Atomically bumps today's counter for one action. The client calls
// this after a successful save. Returns the new counter value so the
// client can update its local state without a follow-up read.
//
// If the increment is rejected (the cap guard in the SQL function
// fires), we return 402 Payment Required with the full limits payload
// — the client turns that into the upgrade modal.
//
// Auth required. Body: `{ action: 'add_job' | 'edit_doc' }`.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { getEffectiveTier } from '@/lib/subscription';
import { tryIncrement, type Action } from '@/lib/usage';

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

  // Resolve tier + limits fresh — never trust the client's idea of
  // the cap. If the user upgraded between the pre-check and this
  // increment, the new (higher) cap is what we enforce.
  const { tier, limits } = await getEffectiveTier(user.id);

  const result = await tryIncrement(user.id, action, limits);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        tier,
        jobsLimit: limits.jobs,
        editsLimit: limits.edits,
      },
      { status: 402 }
    );
  }

  return NextResponse.json({
    ok: true,
    tier,
    value: result.value,
    jobsLimit: limits.jobs,
    editsLimit: limits.edits,
  });
}
