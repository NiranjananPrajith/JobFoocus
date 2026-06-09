// POST /api/ai/edit-document
//
// AI-powered document edit endpoint. Called by the document editor's
// floating yellow panel. Returns the full new HTML; the client saves
// it via the storage adapter.
//
// Server-side usage gate. The client (document/page.tsx) also checks
// the counter before submitting, but we re-check here so a determined
// user with curl can't bypass the daily cap. On cap hit we return
// 402 with the same payload the client uses to open the upgrade
// modal — the client doesn't need to re-call /api/usage/check, it
// already has the numbers.
//
// We deliberately do NOT also gate /api/db/documents here. The
// storage adapter's saveDocumentHTML is a generic write endpoint
// used by many code paths (the AI pipeline, restore from trash,
// bulk import). Gating it would block legitimate "save the same
// document" writes. The cap is on AI-driven edits, not on every
// document write — so we enforce at the edit endpoint only.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { editDocumentHTML } from '@/lib/ai-generation';
import { getEffectiveTier } from '@/lib/subscription';
import { getOrCreateTodayUsage } from '@/lib/usage';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentHTML, docType, userMessage } = await req.json().catch(() => ({}));

  if (!currentHTML || !docType || !userMessage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (docType !== 'resume' && docType !== 'cover_letter') {
    return NextResponse.json({ error: 'docType must be resume or cover_letter' }, { status: 400 });
  }

  // ---- Server-side usage gate (defense in depth) ----
  // Resolve tier + limits fresh from the DB. The client may have
  // checked a moment ago, but the user could have upgraded (or had
  // their subscription cancel) between the pre-check and this call.
  const { tier, limits } = await getEffectiveTier(user.id);
  const usage = await getOrCreateTodayUsage(user.id);

  if (usage.edits_made >= limits.edits) {
    // 402 Payment Required. The client treats this as "at cap" and
    // opens the upgrade modal. The full limits payload is included
    // so the client doesn't need a follow-up read.
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

  // ---- Run the AI edit ----
  let newFullHTML: string;
  try {
    newFullHTML = await editDocumentHTML(currentHTML, docType, userMessage);
  } catch (err) {
    console.error('[API] edit-document error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to edit document' },
      { status: 500 }
    );
  }

  return NextResponse.json({ newFullHTML });
}
