import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.OPENCODE_ZEN_API_KEY || '';
const MODEL = 'deepseek-v4-flash-free';
const BASE_URL = 'https://opencode.ai/zen/v1/chat/completions';

export async function POST(req: NextRequest) {
  const { prompt, system } = await req.json();

  if (!API_KEY) {
    return NextResponse.json({ error: 'OPENCODE_ZEN_API_KEY not configured' }, { status: 500 });
  }

  if (!prompt) {
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
      max_tokens: 4096,
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
