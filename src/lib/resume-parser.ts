// Resume File Parser
// Parses PDF, DOCX, and TXT files to extract structured resume data.

export interface ParsedResume {
  name: string;
  phone: string;
  email: string;
  summary: string;
  workExperience: Array<{
    employer: string;
    jobTitle: string;
    startDate: string;
    endDate: string;
    duties: string;
  }>;
  education: Array<{
    institution: string;
    course: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
}

// ---------------------------------------------------------------------------
// PDF Parsing — uses pdfjs-dist legacy build (no worker needed)
// ---------------------------------------------------------------------------

async function parsePDF(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
}

// ---------------------------------------------------------------------------
// DOCX Parsing (mammoth — pure JS)
// ---------------------------------------------------------------------------

async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ---------------------------------------------------------------------------
// Plain Text (TXT) — direct read
// ---------------------------------------------------------------------------

async function parseTXT(file: File): Promise<string> {
  return file.text();
}

// ---------------------------------------------------------------------------
// AI-powered extraction from raw text
// ---------------------------------------------------------------------------

async function extractWithAI(rawText: string): Promise<ParsedResume> {
  const system = `You are an expert resume parser. Analyze the provided resume text and return a JSON object with exactly these fields:
- name: string (full name, or "" if not found)
- phone: string (phone number, or "" if not found)
- email: string (email address, or "" if not found)
- summary: string (2-3 sentence professional summary, or "" if not found)
- workExperience: array of { employer, jobTitle, startDate, endDate, duties }
  - dates in YYYY-MM format or "" if unknown
  - duties: combine all bullet points and responsibilities into one string
- education: array of { institution, course, startDate, endDate, description }
  - dates in YYYY-MM format or "" if unknown

Return ONLY the valid JSON object. No markdown, no explanation.`;

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: rawText, system }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resume parsing failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const content = data.content || '';

  if (!content) throw new Error('Empty response from AI parser');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    name: parsed.name || '',
    phone: parsed.phone || '',
    email: parsed.email || '',
    summary: parsed.summary || '',
    workExperience: Array.isArray(parsed.workExperience) ? parsed.workExperience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type FileFormat = 'pdf' | 'docx' | 'txt';

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const name = file.name.toLowerCase();

  let rawText: string;
  if (name.endsWith('.pdf')) {
    rawText = await parsePDF(file);
  } else if (name.endsWith('.docx')) {
    rawText = await parseDOCX(file);
  } else if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.odt')) {
    rawText = await parseTXT(file);
  } else {
    throw new Error(`Unsupported format. Use PDF, DOCX, or TXT.`);
  }

  return extractWithAI(rawText);
}

export function getAcceptedFileTypes(): string {
  return '.pdf,.docx,.txt,.md,.odt';
}

export function getAcceptedMimeTypes(): string {
  return 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/vnd.oasis.opendocument.text';
}