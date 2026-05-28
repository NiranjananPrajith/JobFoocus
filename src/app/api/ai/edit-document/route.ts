import { NextRequest, NextResponse } from 'next/server';
import { editDocumentHTML } from '@/lib/ai-generation';

export async function POST(req: NextRequest) {
  try {
    const { currentHTML, docType, userMessage } = await req.json();

    if (!currentHTML || !docType || !userMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (docType !== 'resume' && docType !== 'cover_letter') {
      return NextResponse.json({ error: 'docType must be resume or cover_letter' }, { status: 400 });
    }

    const newFullHTML = await editDocumentHTML(currentHTML, docType, userMessage);

    return NextResponse.json({ newFullHTML });
  } catch (err) {
    console.error('[API] edit-document error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to edit document' },
      { status: 500 }
    );
  }
}
