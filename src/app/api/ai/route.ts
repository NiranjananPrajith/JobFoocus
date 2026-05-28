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
  // After stripping, no false positives from masked tokens remain
  const stripped = prompt.replace(/\[[\w_]+\]/g, 'X');
  const rawEmail = /[\w.+-]+@[\w.-]+\.\w+/.test(stripped);
  const rawPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(stripped);
  const rawName = /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(stripped);

  if (rawEmail || rawPhone || rawName) {
    console.warn('[AI] PII Guard: blocked', { rawEmail, rawPhone, rawName });
    return NextResponse.json(
      { error: 'Security Exception: Raw unmasked PII intercepted at server boundary.' },
      { status: 400 }
    );
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
