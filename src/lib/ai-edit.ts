// Server-only: AI document editing.
//
// This module is intentionally separate from ai-generation.ts so the
// edit prompt + ATS guide strings don't get bundled into the client.
// ai-generation.ts is imported client-side by AddJobModal and the
// application page; this module is imported only by the
// /api/ai/edit-document route (server).

import { zenChat } from '@/lib/ai-generation';
import { demaskPII, maskPIIInHTML, type PIIProfile } from '@/lib/pii-utils';
import { ATS_RESUME_GUIDE, COVER_LETTER_PRINT_GUIDE } from '@/lib/print-safe-css';

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
  const isResume = docType === 'resume';
  const guide = isResume ? ATS_RESUME_GUIDE : COVER_LETTER_PRINT_GUIDE;

  const system = isResume
    ? `You are an expert resume editor. You are editing an existing resume. The user's PII (name, phone, email, socials, portfolio) is wrapped in XML-style tags like <PII_NAME>…</PII_NAME> — you MUST preserve these tags exactly as they appear. Return the complete edited resume as a valid <!DOCTYPE html>…</html> document.

${ATS_RESUME_GUIDE}

STRICT CONSTRAINTS FOR RESUME EDITS:
- You may edit text content: rephrase, shorten, expand, reorganize sections,
  add/remove bullet points, fix typos, improve clarity.
- You may NOT introduce multi-column layouts, sidebars, tables for layout,
  graphics, icons, flex layouts, or any non-ATS-compliant structure.
- You may NOT use text-align: justify on the body (ATS parsers may break
  hyphenated words).
- Colors ARE allowed for visual appeal — colored text, colored backgrounds,
  colored borders, and accent colors are all fine. Text must remain readable
  (dark text on light backgrounds or vice versa). Avoid low-contrast
  combinations.
- Keep the document single-column, left-aligned, with standard semantic
  headings (h1, h2, p, ul/li). The DOM structure must remain ATS-parseable.
- The MASTER RESUME (below) is the source of truth for the candidate's
  background. You may draw new phrasing or reorder content from it, but
  do not invent facts (no fake employers, degrees, or metrics).`
    : `You are an expert cover letter editor. You are editing an existing cover letter. The user's PII (name, phone, email) is wrapped in XML-style tags like <PII_NAME>…</PII_NAME> — preserve these tags exactly. Return the complete edited cover letter as a valid <!DOCTYPE html>…</html> document.

${COVER_LETTER_PRINT_GUIDE}`;

  const { maskedCurrentHTML, maskedMasterResume, jdContext } = context;

  const prompt = `Edit the following ${isResume ? 'resume' : 'cover letter'} according to the user's request.

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
- Apply the ATS compliance rules from the system prompt.
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
