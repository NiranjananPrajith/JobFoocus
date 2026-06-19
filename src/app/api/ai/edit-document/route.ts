// POST /api/ai/edit-document
//
// AI-powered document edit endpoint. Called by the document editor's
// SmartEditPanel. Returns the full new HTML; the client saves it via
// the storage adapter.
//
// Server-side usage gate. The client (DocumentEditor) also checks the
// counter before submitting, but we re-check here so a determined user
// with curl can't bypass the daily cap. On cap hit we return 402 with
// the same payload the client uses to open the upgrade modal — the
// client doesn't need to re-call /api/usage/check, it already has the
// numbers.
//
// PII safety. We fetch the master resume and the job description
// server-side, build a PII profile, and pass masked versions of the
// current HTML + master resume into the AI. The AI is allowed to
// make any change (including full redesigns) but must preserve the
// <PII_*>…</PII_*> tags verbatim; we demask the response before
// returning it. Real PII never leaves the server.
//
// We deliberately do NOT also gate /api/db/documents here. The
// storage adapter's saveDocumentHTML is a generic write endpoint
// used by many code paths (the AI pipeline, restore from trash,
// bulk import, and the new manual editor autosave). Gating it
// would block legitimate "save the same document" writes. The cap
// is on AI-driven edits, not on every document write — so we
// enforce at the edit endpoint only.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { editDocumentHTML } from '@/lib/ai-generation';
import { extractPIIProfile, maskPII, type PIIProfile } from '@/lib/pii-utils';
import { getEffectiveTier } from '@/lib/subscription';
import { getOrCreateTodayUsage } from '@/lib/usage';

export const dynamic = 'force-dynamic';

interface RequestBody {
  currentHTML?: string;
  docType?: 'resume' | 'cover_letter';
  userMessage?: string;
  category?: string;
  folder?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { currentHTML, docType, userMessage, category, folder } = body;

  if (!currentHTML || !docType || !userMessage) {
    return NextResponse.json({ error: 'Missing required fields (currentHTML, docType, userMessage)' }, { status: 400 });
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

  // ---- Fetch master resume + job description for full context ----
  //
  // The master resume gives us (a) the PII profile for masking and
  // (b) the candidate's full background so the AI can make grounded
  // edits without inventing facts.
  //
  // The JD gives the AI the target role + requirements for tailoring.
  //
  // We tolerate either being missing — the AI will still work with
  // just the current HTML, just with less context.
  let profile: PIIProfile = { name: '', phone: '', email: '', otherLinks: [] };
  let maskedMasterResume = '';
  let jdHtml: string | null = null;

  try {
    const { data: resumeRow } = await supabase
      .from('master_resumes')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (resumeRow?.data) {
      const masterResume = resumeRow.data as any;
      profile = extractPIIProfile({
        name: masterResume.name,
        phone: masterResume.phone,
        email: masterResume.email,
        socials: Array.isArray(masterResume.socials) ? masterResume.socials : [],
        portfolio: masterResume.portfolio,
      });
      maskedMasterResume = maskPII(JSON.stringify(masterResume), profile);
    } else {
      console.warn('[edit-document] No master resume found for user; AI will edit with limited context');
    }
  } catch (err) {
    console.error('[edit-document] Failed to fetch master resume:', err);
  }

  if (category && folder) {
    try {
      const { data: jdRow } = await supabase
        .from('documents')
        .select('html')
        .eq('user_id', user.id)
        .eq('folder', folder)
        .eq('doc_type', 'job_description')
        .maybeSingle();
      jdHtml = jdRow?.html ?? null;
    } catch (err) {
      console.error('[edit-document] Failed to fetch JD:', err);
    }
  }

  // ---- Run the AI edit (with full context) ----
  let newFullHTML: string;
  try {
    newFullHTML = await editDocumentHTML(
      {
        fullHTML: currentHTML,
        maskedMasterResume,
        profile,
        jdHtml,
      },
      docType,
      userMessage
    );
  } catch (err) {
    console.error('[API] edit-document error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to edit document' },
      { status: 500 }
    );
  }

  return NextResponse.json({ newFullHTML });
}
