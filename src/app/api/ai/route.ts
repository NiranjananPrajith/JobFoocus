import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';

const API_KEY = process.env.OPENCODE_ZEN_API_KEY || '';
const MODEL = 'deepseek-v4-flash-free';
const BASE_URL = 'https://opencode.ai/zen/v1/chat/completions';

export async function POST(req: NextRequest) {
  // Auth gate — must be logged in to send AI prompts.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { prompt?: string; system?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, system } = body;

  if (!API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // No PII guard here — all PII is handled client-side via tag-wrapping in pii-utils.ts.
  // The client wraps name/phone/email/socials/portfolio in XML-style tags before
  // sending anything to the server, so the server only ever sees structured tags
  // like <PII_NAME>John Doe</PII_NAME>, never raw PII.

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16384,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json({ error: `API error ${response.status}: ${errText}` }, { status: response.status });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content) {
    return NextResponse.json({ error: 'Empty response from AI', response: data }, { status: 502 });
  }

  return NextResponse.json({ content });
}
