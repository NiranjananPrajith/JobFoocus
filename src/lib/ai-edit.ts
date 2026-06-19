// Server-only: AI document editing.
//
// This module is intentionally separate from ai-generation.ts so the
// edit prompt + PRINT_SAFE_CSS_GUIDE string don't get bundled into the
// client. ai-generation.ts is imported client-side by AddJobModal and
// the application page; this module is imported only by the
// /api/ai/edit-document route (server).

import { zenChat } from '@/lib/ai-generation';
import { demaskPII, maskPIIInHTML, type PIIProfile } from '@/lib/pii-utils';
import { PRINT_SAFE_CSS_GUIDE } from '@/lib/print-safe-css';

export interface EditContext {
  maskedCurrentHTML: string;
  maskedMasterResume: string;
  jdContext: { company: string; job_title: string; requirements: string[] };
  profile: PIIProfile;
}

async function editDocumentFullHTML(
  context: EditContext,
  docType: 'resume' | 'cover_letter',
  userMessage: string
): Promise<string> {
  const system = docType === 'resume'
    ? `You are an expert resume designer and writer. You are editing an existing resume that the user wants to change. The user's PII (name, phone, email, socials, portfolio) is wrapped in XML-style tags like <PII_NAME>…</PII_NAME> — you MUST preserve these tags exactly as they appear. Treat <PII_NAME>John Smith</PII_NAME> as if it were literally the candidate's name; do not invent different values. Return the complete edited resume as a valid <!DOCTYPE html>…</html> document.

${PRINT_SAFE_CSS_GUIDE}`
    : `You are an expert cover letter designer and writer. You are editing an existing cover letter. The user's PII (name, phone, email) is wrapped in XML-style tags like <PII_NAME>…</PII_NAME> — preserve these tags exactly. Return the complete edited cover letter as a valid <!DOCTYPE html>…</html> document.

${PRINT_SAFE_CSS_GUIDE}`;

  const { maskedCurrentHTML, maskedMasterResume, jdContext } = context;

  const prompt = `Edit the following ${docType === 'resume' ? 'resume' : 'cover letter'} according to the user's request.

You have full creative freedom:
- You may make small text edits (rewording, fixing typos, shortening).
- You may restructure sections, reorder content, or add new sections.
- You may completely REDESIGN the document with new layouts, colors, fonts,
  sidebars, two-column layouts, dividers, icon accents, or any other visual
  change — as long as you follow the print-safe CSS guide.
- You may NOT remove or change any <PII_NAME>, <PII_PHONE>, <PII_EMAIL>,
  <PII_LINKEDIN>, <PII_GITHUB>, <PII_PORTFOLIO> tag content. Treat each tag
  as opaque and pass it through unchanged.
- The MASTER RESUME (below) is the source of truth for the candidate's
  background. You may draw new phrasing or reorder content from it, but
  do not invent facts (no fake employers, degrees, or metrics).

USER'S REQUEST:
"${userMessage}"

CURRENT DOCUMENT (PII is masked):
${maskedCurrentHTML}

MASTER RESUME (PII is masked — for context on the candidate's background):
${maskedMasterResume}

TARGET JOB (for tailoring context):
Company: ${jdContext.company}
Title: ${jdContext.job_title}
Key requirements: ${jdContext.requirements.join(', ') || '(not extracted)'}

OUTPUT:
- Return ONLY the complete edited <!DOCTYPE html>…</html> document.
- Do not add commentary, explanation, or text outside the HTML.
- Apply the print-safe CSS guide from the system prompt.
- Preserve every <PII_*>…</PII_*> tag exactly as it appears in the current document.`;

  const raw = await zenChat(prompt, system);
  if (!raw || raw.length < 50) {
    throw new Error('AI returned an invalid or empty response. Please try again.');
  }

  // Strip markdown code fences if the model wrapped the response
  let cleaned = raw.trim();
  if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  if (!cleaned.includes('<html') && !cleaned.includes('<!DOCTYPE')) {
    throw new Error('AI did not return a valid HTML document. Please try again.');
  }

  // Demask the PII tags → real values restored.
  return demaskPII(cleaned, context.profile);
}

function extractJDFromHTML(jdHtml: string): { company: string; job_title: string; requirements: string[] } {
  const titleMatch = jdHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const job_title = titleMatch?.[1]?.trim() || '';

  const metaMatch = jdHtml.match(/<p>([^<]+)/);
  const company = metaMatch?.[1]?.split(' · ')[0]?.trim() || '';

  const reqs: string[] = [];
  const reqMatch = jdHtml.match(/<h2>Requirements<\/h2>\s*<ul>([\s\S]*?)<\/ul>/i);
  if (reqMatch) {
    const liMatches = reqMatch[1].match(/<li>([^<]+)<\/li>/g);
    if (liMatches) {
      for (const li of liMatches) {
        const contentMatch = li.match(/^<li>([^<]+)<\/li>$/);
        if (contentMatch) reqs.push(contentMatch[1].trim());
      }
    }
  }

  return { company, job_title, requirements: reqs };
}

// Public entry point used by the API route. The caller (the route) does
// the master-resume + JD fetch, profile extraction, and HTML masking, then
// passes everything here. The result is a complete HTML document with the
// real PII values restored.
export async function editDocumentHTML(
  args: {
    fullHTML: string;
    maskedMasterResume: string;
    profile: PIIProfile;
    jdHtml: string | null;
  },
  docType: 'resume' | 'cover_letter',
  userMessage: string
): Promise<string> {
  const jdContext = extractJDFromHTML(args.jdHtml || '');
  const maskedCurrentHTML = maskPIIInHTML(args.fullHTML, args.profile);
  return editDocumentFullHTML(
    {
      maskedCurrentHTML,
      maskedMasterResume: args.maskedMasterResume,
      jdContext,
      profile: args.profile,
    },
    docType,
    userMessage
  );
}
