import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.MINIMAX_API_KEY || '';
const MODEL = 'MiniMax-M2.7';
const BASE_URL = 'https://api.minimax.io/anthropic/v1/messages';

export async function POST(req: NextRequest) {
  const { prompt, system } = await req.json();

  if (!API_KEY) {
    return NextResponse.json({ error: 'MINIMAX_API_KEY not configured' }, { status: 500 });
  }

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // ── PII Guard: strip [CANDIDATE_*] placeholders, then test for real PII ──
  // Focus on email/phone only — these are the truly sensitive PII fields.
  // Name detection is skipped because:
  //  1. [CANDIDATE_NAME] placeholders are stripped before this check
  //  2. Names in work history (supervisors, references) are not direct contact PII
  //  3. Job titles like "Customer Service Associate" match name patterns too easily
  const stripped = prompt.replace(/\[[\w_]+\]/g, 'X');
  const rawEmail = /[\w.+-]+@[\w.-]+\.\w+/.test(stripped);
  const rawPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(stripped);
  // rawName check intentionally omitted — see comment above

  if (rawEmail || rawPhone) {
    console.warn('[AI] PII Guard: flagged', { rawEmail, rawPhone });
    // Return 200 with a warning flag so the client can decide how to handle it.
    // The pipeline continues so we don't lose the user's job entry mid-flow.
    return NextResponse.json({
      warning: true,
      reason: 'Security Exception: Raw unmasked PII intercepted at server boundary.',
      detected: { email: rawEmail, phone: rawPhone },
      content: null,
    });
  }

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: system || '',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json({ error: `API error ${response.status}: ${errText}` }, { status: response.status });
  }

  const data = await response.json();
  const contentBlocks = data.content || [];
  const textBlocks = contentBlocks.filter((block: { type: string }) => block.type === 'text');
  const content = textBlocks.map((block: { text?: string }) => block.text || '').join('');

  if (!content) {
    return NextResponse.json({ error: 'Empty response from AI', content: data.content }, { status: 502 });
  }

  return NextResponse.json({ content });
}
