import { NextRequest, NextResponse } from 'next/server';
import { maskPII } from '@/lib/pii-utils';
import { editDocumentHTML } from '@/lib/ai-generation';
import type { PIIProfile } from '@/lib/pii-utils';

export async function POST(req: NextRequest) {
  try {
    const { currentHTML, jobDescription, docType, userMessage, masterResume } = await req.json();

    if (!currentHTML || !jobDescription || !docType || !userMessage || !masterResume) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (docType !== 'resume' && docType !== 'cover_letter') {
      return NextResponse.json({ error: 'docType must be resume or cover_letter' }, { status: 400 });
    }

    const resumeJson = JSON.stringify(masterResume);
    const maskedMasterResume = maskPII(resumeJson, masterResume);

    const newFullHTML = await editDocumentHTML(
      currentHTML,
      maskedMasterResume,
      masterResume as unknown as PIIProfile,
      jobDescription,
      docType,
      userMessage
    );

    return NextResponse.json({ newFullHTML });
  } catch (err) {
    console.error('[API] edit-document error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to edit document' },
      { status: 500 }
    );
  }
}
