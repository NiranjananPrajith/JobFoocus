import { saveApplication, saveDocumentHTML, getMasterResume, updateApplicationDocFlags, getUserCategories, assignJobToCategory, type UserCategory } from '@/lib/storage-adapter';
import { maskPII, demaskPII, type PIIProfile } from '@/lib/pii-utils';
import type { CategoryKey, StatusKey } from '@/lib/storage-adapter';
import formattingGuides from './formatting-guides.json';
// Note: PRINT_SAFE_CSS_GUIDE and maskPIIInHTML are imported in
// src/lib/ai-edit.ts (server-only) instead, to keep the edit prompt and
// guide string out of the client bundle.

// ---------------------------------------------------------------------------
// JobFoocus AI (internal model)
// ---------------------------------------------------------------------------

const API_KEY = process.env.OPENCODE_ZEN_API_KEY || '';
const MODEL = 'deepseek-v4-flash-free';
// Server-side: call JobFoocus AI directly. Client-side: call our Next.js API route to avoid CORS.
const AI_API_URL = typeof window !== 'undefined' ? '/api/ai' : 'https://opencode.ai/zen/v1/chat/completions';

type AIFunction = 'analyzing' | 'resume' | 'cover_letter' | 'done';
type ProgressCallback = (step: AIFunction) => void;

// Server-side LLM call. Exported so the server-only edit module
// (src/lib/ai-edit.ts) can reuse it without duplicating the key/URL
// logic. Safe to import from server contexts only — it reads
// OPENCODE_ZEN_API_KEY.
export async function zenChat(prompt: string, system: string): Promise<string> {
  const isServer = typeof window === 'undefined';

  if (isServer && !API_KEY) {
    console.error('[AI] AI API key is not configured.');
    throw new Error('[AI] AI API key is not configured.');
  }

  console.log('[AI] Sending request to JobFoocus AI...', { model: MODEL, promptLength: prompt.length });

  const fetchOptions = isServer
    ? {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16384,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, system }),
      };

  const res = await fetch(AI_API_URL, fetchOptions as RequestInit);

  console.log('[AI] JobFoocus AI response status:', res.status, res.statusText);

  if (!res.ok) {
    const errText = await res.text();
    console.error('[AI] AI API error:', res.status, errText);
    throw new Error(`AI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || data.content || '';

  if (!content) {
    console.error('[AI] Empty response from JobFoocus AI. Full data:', JSON.stringify(data));
    throw new Error('JobFoocus AI returned empty response.');
  }

  console.log('[AI] Extracted content length:', content.length);
  return content;
}

// ---------------------------------------------------------------------------
// AI Step 1: Format raw job description
// ---------------------------------------------------------------------------

export interface FormattedJD {
  company: string;
  job_title: string;
  location: string;
  employment_type: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
}

export async function formatJobDescription(rawJD: string): Promise<FormattedJD> {
  console.log('[AI] Step 1: Formatting job description, input length:', rawJD.length);
  const system = 'You are an expert job posting analyst. Parse the provided job posting and return a JSON object with exactly these fields:\n- company: string (the hiring company name, or "Unknown Company" if not found)\n- job_title: string (the exact job title)\n- location: string (city/region or "Not specified")\n- employment_type: string (full-time, part-time, contract, etc.)\n- summary: string (2-3 sentence overview of the role)\n- responsibilities: string[] (array of 4-8 key responsibilities as concise bullet points)\n- requirements: string[] (array of 4-8 minimum requirements as bullet points)\n- preferred: string[] (array of 2-4 nice-to-have qualifications, or empty array if none)\n\nReturn ONLY the JSON object. No markdown, no code blocks, no explanation. The JSON must be parseable with JSON.parse().';

  const result = await zenChat(
    'Parse this job posting:\n\n' + rawJD,
    system
  );

  console.log('[AI] Step 1: Raw format result:', result.substring(0, 200));

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[AI] Step 1: No JSON found in format response:', result.substring(0, 300));
    throw new Error('Failed to parse job description: AI response did not contain a JSON object');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as FormattedJD;
    parsed.company = parsed.company || 'Unknown Company';
    parsed.job_title = parsed.job_title || 'Scraped Position';
    parsed.location = parsed.location || 'Not specified';
    parsed.employment_type = parsed.employment_type || 'Full-time';
    parsed.summary = parsed.summary || '';
    parsed.responsibilities = Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [];
    parsed.requirements = Array.isArray(parsed.requirements) ? parsed.requirements : [];
    parsed.preferred = Array.isArray(parsed.preferred) ? parsed.preferred : [];
    console.log('[AI] Step 1: Parsed JD successfully:', { company: parsed.company, job_title: parsed.job_title });
    return parsed;
  } catch {
    console.error('[AI] Step 1: JSON parse failed. Response was:', result.substring(0, 300));
    throw new Error('Failed to parse job description: JSON was malformed');
  }
}

// ---------------------------------------------------------------------------
// Conversational JD parse: iteratively ask the user for missing details
// ---------------------------------------------------------------------------

export type ClarifyResult =
  | { kind: 'success'; formattedJD: FormattedJD }
  | { kind: 'question'; question: string }
  | { kind: 'failed'; message: string };

interface Clarification {
  question: string;
  answer: string;
}

const CLARIFY_SYSTEM = `You are parsing a job posting from text the user pasted. The user has also answered some follow-up questions.

TASK: Given the original text and any clarifications, decide which case applies:

CASE 1 — You can now extract the full job posting (company name, job title, location, employment type, summary, responsibilities, requirements, preferred qualifications):
Return a flat JSON object with EXACTLY these fields:
{"kind":"success","company":"XYZ Corp","job_title":"Software Engineer","location":"Remote","employment_type":"Full-time","summary":"2-3 sentence overview","responsibilities":["...","..."],"requirements":["...","..."],"preferred":["...","..."]}
- Use the original text FIRST, then supplement with clarification answers
- Only use "Unknown Company" or "Not specified" as last resort
- Be thorough — include all details you can extract

CASE 2 — You are still missing required information (especially company or job title):
Return: {"kind":"question","question":"a short, conversational question asking for the ONE most critical missing piece"}
- Keep the question under 100 characters
- Ask about only ONE thing at a time
- Do NOT ask about something the user has already clarified
- Examples: "What company is this job for?" or "What position are you applying for?"

CASE 3 — The text clearly is not a job posting and clarifications have not helped:
Return: {"kind":"failed","message":"A brief, user-friendly explanation of why parsing failed"}

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;

export async function conversationalParseJD(
  jdText: string,
  clarifications: Clarification[]
): Promise<ClarifyResult> {
  const historyBlock = clarifications.length > 0
    ? '\n\nUSER CLARIFICATIONS:\n' + clarifications
      .map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer}`)
      .join('\n')
    : '';

  const prompt = `ORIGINAL TEXT:\n${jdText}${historyBlock}`;

  const raw = await zenChat(prompt, CLARIFY_SYSTEM);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { kind: 'failed', message: 'Could not understand the job description. Try pasting the full posting.' };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.kind === 'success') {
      const jd: FormattedJD = {
        company: parsed.company || 'Unknown Company',
        job_title: parsed.job_title || 'Not specified',
        location: parsed.location || 'Not specified',
        employment_type: parsed.employment_type || 'Full-time',
        summary: parsed.summary || '',
        responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
        preferred: Array.isArray(parsed.preferred) ? parsed.preferred : [],
      };
      return { kind: 'success', formattedJD: jd };
    }

    if (parsed.kind === 'question' && typeof parsed.question === 'string') {
      return { kind: 'question', question: parsed.question };
    }

    if (parsed.kind === 'failed' && typeof parsed.message === 'string') {
      return { kind: 'failed', message: parsed.message };
    }

    return { kind: 'failed', message: 'Unexpected response from AI. Try pasting the full job description.' };
  } catch {
    return { kind: 'failed', message: 'Could not parse the AI response. Try again.' };
  }
}

// ---------------------------------------------------------------------------
// AI Classification: Assign job to category
// ---------------------------------------------------------------------------

export async function classifyJobToCategory(
  jd: FormattedJD,
  categories: UserCategory[]
): Promise<string> {
  if (categories.length === 0) return 'Uncategorized';

  const categoryList = categories
    .map(c => `- ${c.name}: ${c.description || 'No description'}`)
    .join('\n');

  const system = 'You are an expert job classification assistant. Given a job posting and a list of categories, determine which single category best fits the job. Be permissive - return the best match even if the fit is partial. If no category clearly fits, respond with "Uncategorized".';

  const prompt = `Job Title: ${jd.job_title}
Company: ${jd.company}
Role Summary: ${jd.summary}
Key Requirements: ${(jd.requirements || []).slice(0, 5).join(', ')}

Available Categories:
${categoryList}

Based on the job title, company, and description, which single category best fits this job?
Respond with ONLY the category name, or "Uncategorized" if none clearly fit.`;

  try {
    const result = await zenChat(prompt, system);
    const trimmed = result.trim();

    // Check if the result matches one of our category names
    const matched = categories.find(
      c => c.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (matched) {
      console.log('[AI] classifyJobToCategory: matched to:', matched.name);
      return matched.name;
    }

    console.log('[AI] classifyJobToCategory: no match, defaulting to Uncategorized. Response was:', trimmed);
    return 'Uncategorized';
  } catch (err) {
    console.error('[AI] classifyJobToCategory error:', err);
    return 'Uncategorized';
  }
}

// ---------------------------------------------------------------------------
// AI Step 2: Generate resume HTML (server-safe — receives masked text only)
// ---------------------------------------------------------------------------

export async function generateResumeHTML(maskedMasterResume: string, jd: FormattedJD): Promise<string> {
  console.log('[AI] Step 2: Generating resume HTML');
  const guide = formattingGuides.resume;
  const system = 'You are an expert resume writer. Output ONLY valid HTML for the resume body — NO <html>, <head>, or <body> tags.\n\n' + guide.ai_instructions + '\n\n---\nRESUME FORMATTING GUIDE (reference only — do not output this):\n' + JSON.stringify(guide, null, 2);

  const prompt = `You are generating ONLY the top portion of a resume — no work experience, no education, no certifications.

OUTPUT FORMAT (strict — generate exactly this, nothing else):
<h2>Professional Summary</h2>
<div class="summary"><p>Your 3-4 sentence tailored professional summary here.</p></div>

<h2>Skills</h2>
<ul class="skills-list">
<li><strong>Category Name</strong>: skill 1, skill 2, skill 3</li>
<li><strong>Category Name</strong>: skill 1, skill 2</li>
<li><strong>Category Name</strong>: skill 1, skill 2, skill 3, skill 4</li>
</ul>

RULES:
- ONLY output the two sections above — no h2 for work/education/certs, no .job-entry, no .edu-entry, no .cert-entry
- Skills must come ONLY from the master resume data provided below
- Match skills to keywords in the target job description: ${jd.job_title}
- Do NOT fabricate skills not present in the master data
- Output NO other content

MASTER RESUME DATA:
${maskedMasterResume}

TARGET JOB:
Company: ${jd.company}
Title: ${jd.job_title}
Key Requirements: ${(jd.requirements || []).join(', ')}`;

  return zenChat(prompt, system);
}

// ---------------------------------------------------------------------------
// AI Step 3: Generate cover letter HTML (server-safe — receives masked text only)
// ---------------------------------------------------------------------------

export async function generateCoverLetterHTML(maskedMasterResume: string, jd: FormattedJD): Promise<string> {
  console.log('[AI] Step 3: Generating cover letter HTML');
  const guide = formattingGuides.cover_letter;
  const system = 'You are an expert cover letter writer. Output plain text paragraphs only — no HTML tags, no structural elements. The cover letter WRAPPER handles all formatting.\n\n' + guide.ai_instructions;

  const reqSlice = (jd.requirements || []).slice(0, 5).join(', ');

  const prompt = `Write a professional cover letter for the position of ${jd.job_title} at ${jd.company}.

STRUCTURE — output EXACTLY this, nothing else:
[PARA1]
Write a strong opening paragraph. Express interest in the ${jd.job_title} role at ${jd.company}. Mention 1-2 specific qualifications or achievements from the candidate data below that make you a strong fit. Keep it to 3-4 sentences.

[PARA2]
Write a body paragraph. Draw from the candidate's work history below and connect it directly to the job requirements: ${reqSlice}. Use a concrete metric or specific accomplishment where available. Keep it to 3-4 sentences.

[PARA3]
Write a closing paragraph. State availability (days, nights, weekends), express enthusiasm for the role, and include a call to action (available for interview at your convenience). Do NOT mention raw name, phone, or email here. Keep it to 2-3 sentences.

RULES:
- Output ONLY the three paragraphs in plain text — no HTML, no <p> tags, no structural markup of any kind
- Do NOT invent achievements — derive content ONLY from the candidate data below
- Do NOT output: sender-block, date-block, recipient-block, subject-block, signature-space, or any HTML elements
- The WRAPPER handles all letter structure — you write only the paragraph content

CANDIDATE DATA:
${maskedMasterResume}`;

  const raw = await zenChat(prompt, system);

  // Parse out the three labeled paragraphs from plain text response
  const para1Match = raw.match(/\[PARA1\]\s*\n([\s\S]*?)(?=\[PARA2\]|$)/i);
  const para2Match = raw.match(/\[PARA2\]\s*\n([\s\S]*?)(?=\[PARA3\]|$)/i);
  const para3Match = raw.match(/\[PARA3\]\s*\n([\s\S]*?)(?=$)/i);

  const p1 = para1Match?.[1]?.trim() || '';
  const p2 = para2Match?.[1]?.trim() || '';
  const p3 = para3Match?.[1]?.trim() || '';

  // If the model ignored the format and returned raw paragraphs, fall back to splitting by double newlines
  const paragraphs = [p1, p2, p3].filter(Boolean);
  let html: string;
  if (paragraphs.length >= 3) {
    html = paragraphs.map(p => `<p style="text-align: justify">${p}</p>`).join('\n');
  } else {
    // Fallback: split by blank line, wrap each non-empty block
    const blocks = raw.split(/\n\n+/).filter(b => b.trim());
    html = blocks.map(b => `<p style="text-align: justify">${b.replace(/\n/g, ' ').trim()}</p>`).join('\n');
  }

  return html;
}

// ---------------------------------------------------------------------------
// Resume HTML wrapper (client-side only — injects real PII)
// ---------------------------------------------------------------------------

export function wrapResumeHTML(name: string, phone: string, email: string, socials: any[], portfolio: any[], bodyHTML: string): string {
  const socialsHTML = socials.length > 0
    ? '<span>' + socials.map(function(s: any) { return s.name + ': ' + s.url; }).join(' · ') + '</span>'
    : '';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Resume - ' + name + '</title>\n    <style>\n        @page { size: A4; margin: 15mm; }\n        @media print {\n            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        }\n        *, *::before, *::after { box-sizing: border-box; }\n        body { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; color: #222222; line-height: 1.4; font-size: 11pt; margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        h1 { font-size: 18pt; text-align: left; margin: 0 0 4px 0; font-weight: 700; color: #000000; }\n        .contact-info { text-align: left; font-size: 10pt; color: #333333; margin-bottom: 16px; line-height: 1.4; }\n        h2 { font-size: 13pt; margin: 16px 0 8px 0; font-weight: 700; color: #000000; text-transform: none; }\n        .summary { margin-bottom: 16px; }\n        .summary p { margin: 0; text-align: left; font-size: 10.5pt; line-height: 1.5; color: #222222; }\n        ul.achievements { margin: 0; padding-left: 18px; }\n        ul.achievements li { margin-bottom: 4px; text-align: left; font-size: 10.5pt; line-height: 1.5; color: #222222; }\n        .job-entry { margin-bottom: 16px; }\n        .job-company { font-weight: 700; font-size: 11pt; color: #000000; margin: 0 0 2px 0; page-break-after: avoid; }\n        .job-title-text { font-style: italic; font-size: 11pt; color: #333333; margin: 0 0 4px 0; }\n        .job-date-location { font-size: 9.5pt; color: #666666; margin: 0 0 4px 0; }\n        ul.skills-list { margin: 0 0 16px 0; padding: 0 0 0 18px; list-style: disc; }\n        ul.skills-list li { margin-bottom: 4px; font-size: 10.5pt; color: #222222; }\n        ul.skills-list li strong { color: #000000; font-weight: 600; }\n        .edu-entry { margin-bottom: 12px; font-size: 10.5pt; }\n        .edu-course { font-weight: 600; font-size: 11pt; color: #000000; margin: 0 0 2px 0; page-break-after: avoid; }\n        .edu-institution { font-size: 10.5pt; color: #333333; margin: 0 0 2px 0; }\n        .edu-dates { font-size: 9.5pt; color: #666666; margin: 0; }\n    </style>\n</head>\n<body>\n    <h1>' + name + '</h1>\n    <div class="contact-info">\n        ' + phone + ' | ' + email + (socialsHTML ? ' | ' + socialsHTML : '') + '\n    </div>\n    ' + bodyHTML + '\n</body>\n</html>';
}

// ---------------------------------------------------------------------------
// Cover Letter HTML wrapper (client-side only — injects real PII)
// ---------------------------------------------------------------------------

export function wrapCoverLetterHTML(name: string, phone: string, email: string, jd: FormattedJD, bodyHTML: string): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Cover Letter - ' + name + '</title>\n    <style>\n        @page { size: A4; margin: 15mm; }\n        @media print {\n            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        }\n        *, *::before, *::after { box-sizing: border-box; }\n        body { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; color: #222222; line-height: 1.5; font-size: 11pt; margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        .sender-block { margin-bottom: 28px; }\n        .sender-name { font-size: 16pt; font-weight: 700; margin-bottom: 6px; color: #000000; }\n        .sender-meta { color: #333333; font-size: 10pt; line-height: 1.5; }\n        .date-block { margin-bottom: 22px; font-size: 10.5pt; }\n        .recipient-block { margin-bottom: 28px; }\n        .recipient-block strong { font-size: 11pt; color: #000000; }\n        .subject-block { font-weight: 700; margin-bottom: 24px; font-size: 10.5pt; color: #000000; }\n        p { margin: 0 0 16px 0; text-align: justify; font-size: 11pt; line-height: 1.6; }\n        .signature-space { margin-top: 40px; page-break-inside: avoid; }\n        .signature-space strong { font-weight: 600; }\n    </style>\n</head>\n<body>\n    <div class="sender-block">\n        <div class="sender-name">' + name + '</div>\n        <div class="sender-meta">' + phone + ' | ' + email + '</div>\n    </div>\n    <div class="date-block">' + today + '</div>\n    <div class="recipient-block">\n        Hiring Selection Team<br>\n        <strong>' + jd.company + '</strong><br>\n    </div>\n    <div class="subject-block">RE: Application for the position of ' + jd.job_title + '</div>\n    ' + bodyHTML + '\n    <div class="signature-space">\n        Sincerely,<br><br><br>\n        <strong>' + name + '</strong>\n    </div>\n</body>\n</html>';
}

// ---------------------------------------------------------------------------
// Check if master resume is blank
// ---------------------------------------------------------------------------

export async function isMasterResumeBlank(): Promise<boolean> {
  const data = await getMasterResume();
  if (!data) return true;
  const hasName = !!(data.name && data.name.trim());
  const hasWork = Array.isArray(data.workExperience) && data.workExperience.length > 0;
  const hasEdu = Array.isArray(data.education) && data.education.length > 0;
  return !hasName && !hasWork && !hasEdu;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedJob {
  company: string;
  job_title: string;
  category: CategoryKey;
  category_name: string;
  category_color: string;
  folder: string;
}

export interface ProcessedJobData {
  formattedJD: FormattedJD;
  resumeFullHTML: string;
  coverLetterFullHTML: string;
}

// ---------------------------------------------------------------------------
// Full pipeline: process JD + generate documents (with progress callbacks)
// NOTE: caller must mask resume before calling if PII is involved
// ---------------------------------------------------------------------------

export async function processJobDescription(
  formattedJD: FormattedJD,
  jobDescription: string,
  onStep?: ProgressCallback
): Promise<ProcessedJobData> {
  console.log('[AI] processJobDescription called, JD:', formattedJD.job_title);
  const masterResume = await getMasterResume();
  if (!masterResume) {
    throw new Error('Master resume not found. Please fill in your Master Resume first.');
  }

  onStep?.('resume');
  // masterResume is already masked when passed in — caller handles masking
  const resumeBodyHTML = await generateResumeHTML(masterResume as unknown as string, formattedJD);
  const resumeFullHTML = buildResumeFullHTML(masterResume, resumeBodyHTML, formattedJD);

  onStep?.('cover_letter');
  const coverLetterBodyHTML = await generateCoverLetterHTML(masterResume as unknown as string, formattedJD);
  const coverLetterFullHTML = wrapCoverLetterHTML(
    masterResume.name || 'Unknown',
    masterResume.phone || '',
    masterResume.email || '',
    formattedJD,
    coverLetterBodyHTML
  );

  onStep?.('done');
  return { formattedJD, resumeFullHTML, coverLetterFullHTML };
}

// ---------------------------------------------------------------------------
// Job Description HTML wrapper
// ---------------------------------------------------------------------------

export function buildJobDescriptionHTML(jd: FormattedJD, rawJD: string): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const responsibilitiesHTML = Array.isArray(jd.responsibilities) && jd.responsibilities.length > 0
    ? '<h2>Key Responsibilities</h2>\n<ul>' + jd.responsibilities.map(r => '<li>' + r + '</li>').join('\n') + '</ul>'
    : '';

  const requirementsHTML = Array.isArray(jd.requirements) && jd.requirements.length > 0
    ? '<h2>Requirements</h2>\n<ul>' + jd.requirements.map(r => '<li>' + r + '</li>').join('\n') + '</ul>'
    : '';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Job Description - ' + jd.job_title + '</title>\n    <style>\n        @page { size: A4; margin: 15mm; }\n        @media print {\n            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        }\n        body { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 0; }\n        h1 { font-size: 24px; margin-bottom: 5px; }\n        .meta { color: #666; margin-bottom: 20px; }\n\th2 { font-size: 18px; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }\n        ul { padding-left: 20px; }\n        li { margin-bottom: 8px; }\n        .section { margin-bottom: 20px; }\n    </style>\n</head>\n<body>\n    <h1>' + jd.job_title + '</h1>\n    <div class="meta">\n        <p>' + jd.company + ' &bull; ' + (jd.location || 'Location not specified') + ' &bull; ' + (jd.employment_type || 'Full-time') + '</p>\n    </div>\n\n    <h2>About the Role</h2>\n    <div class="section">\n        <p>' + (jd.summary || 'No summary available.') + '</p>\n    </div>\n\n    ' + responsibilitiesHTML + '\n    ' + requirementsHTML + '\n\n    <h2>Application Details</h2>\n    <p><em>Job Description saved on ' + today + '</em></p>\n</body>\n</html>';
}

export function buildResumeFullHTML(masterResume: any, tailoredBodyHTML: string, jd?: FormattedJD): string {
  const name = masterResume.name || '';
  const phone = masterResume.phone || '';
  const email = masterResume.email || '';
  const socials = Array.isArray(masterResume.socials) ? masterResume.socials : [];
  const portfolio = Array.isArray(masterResume.portfolio) ? masterResume.portfolio : [];

  let workEntries = '';
  if (Array.isArray(masterResume.workExperience) && masterResume.workExperience.length > 0) {
    const jobs = masterResume.workExperience.slice(0, 3);
    for (const w of jobs) {
      const dutiesList = (w.duties || '').split('\n').filter((d: string) => d.trim()).map((d: string) => '<li>' + d.trim() + '</li>').join('\n');
      const dateRange = (w.startDate || '') + (w.endDate ? ' – ' + w.endDate : ' – Present');
      workEntries += '<div class="job-entry">\n' +
        '<p class="job-company">' + (w.employer || '') + ' — ' + dateRange + '</p>\n' +
        '<p class="job-title-text">' + (w.jobTitle || '') + '</p>\n' +
        (dutiesList ? '<ul class="achievements">\n' + dutiesList + '\n</ul>\n' : '') +
      '</div>\n';
    }
    tailoredBodyHTML = tailoredBodyHTML + '\n<h2>Professional Experience</h2>\n' + workEntries;
  }

  let eduEntries = '';
  if (Array.isArray(masterResume.education) && masterResume.education.length > 0) {
    for (const e of masterResume.education.slice(0, 2)) {
      const eduDates = (e.startDate || '') + (e.endDate ? ' – ' + e.endDate : '');
      eduEntries += '<div class="edu-entry">\n' +
        '<p class="edu-course">' + (e.course || '') + '</p>\n' +
        '<p class="edu-institution">' + (e.institution || '') + '</p>\n' +
        (eduDates ? '<p class="edu-dates">' + eduDates + '</p>\n' : '') +
      '</div>\n';
    }
    tailoredBodyHTML = tailoredBodyHTML + '\n<h2>Education</h2>\n' + eduEntries;
  }

  return wrapResumeHTML(name, phone, email, socials, portfolio, tailoredBodyHTML);
}

// ---------------------------------------------------------------------------
// Generate documents for an existing job
// NOTE: caller must mask resume before calling if PII is involved
// ---------------------------------------------------------------------------

export async function generateDocumentsForExistingJob(
  category: CategoryKey,
  folder: string,
  jobDescription: string,
  onStep?: ProgressCallback
): Promise<void> {
  console.log('[AI] generateDocumentsForExistingJob called');
  const masterResume = await getMasterResume();
  if (!masterResume) {
    throw new Error('Master resume not found. Please fill in your Master Resume first.');
  }

  onStep?.('analyzing');
  const formattedJD = await formatJobDescription(jobDescription);

  onStep?.('resume');
  // masterResume is already masked when passed in — caller handles masking
  const resumeBodyHTML = await generateResumeHTML(masterResume as unknown as string, formattedJD);
  const resumeFullHTML = buildResumeFullHTML(masterResume, resumeBodyHTML, formattedJD);

  onStep?.('cover_letter');
  const coverLetterBodyHTML = await generateCoverLetterHTML(masterResume as unknown as string, formattedJD);
  const coverLetterFullHTML = wrapCoverLetterHTML(
    masterResume.name || 'Unknown',
    masterResume.phone || '',
    masterResume.email || '',
    formattedJD,
    coverLetterBodyHTML
  );

  console.log('[AI] generateDocumentsForExistingJob: saving docs for', category, folder);
  await saveDocumentHTML(category, folder, 'resume', resumeFullHTML);
  await saveDocumentHTML(category, folder, 'cover_letter', coverLetterFullHTML);
  await updateApplicationDocFlags(category, folder, { has_resume: true, has_cover_letter: true });
  console.log('[AI] generateDocumentsForExistingJob: done');
  onStep?.('done');
}

// ---------------------------------------------------------------------------
// Zero-PII pipeline: client-side mask → server → demask → save
// ---------------------------------------------------------------------------

export async function generateMaskedDocumentsForExistingJob(
  category: CategoryKey,
  folder: string,
  jobDescription: string,
  onStep?: ProgressCallback
): Promise<void> {
  const masterResume = await getMasterResume();
  if (!masterResume) throw new Error('Master resume not found.');

  onStep?.('analyzing');
  const formattedJD = await formatJobDescription(jobDescription);

  // Convert resume to JSON string and mask PII before sending to server
  const resumeJson = JSON.stringify(masterResume);
  const maskedResume = maskPII(resumeJson, masterResume);

  onStep?.('resume');
  const resumeBodyHTML = await generateResumeHTML(maskedResume, formattedJD);
  const demaskedResumeBody = demaskPII(resumeBodyHTML, masterResume);
  const resumeFullHTML = buildResumeFullHTML(masterResume, demaskedResumeBody, formattedJD);

  onStep?.('cover_letter');
  const coverLetterBodyHTML = await generateCoverLetterHTML(maskedResume, formattedJD);
  const demaskedCoverBody = demaskPII(coverLetterBodyHTML, masterResume);
  const coverLetterFullHTML = wrapCoverLetterHTML(
    masterResume.name || 'Unknown',
    masterResume.phone || '',
    masterResume.email || '',
    formattedJD,
    demaskedCoverBody
  );

  await saveDocumentHTML(category, folder, 'resume', resumeFullHTML);
  await saveDocumentHTML(category, folder, 'cover_letter', coverLetterFullHTML);
  await updateApplicationDocFlags(category, folder, { has_resume: true, has_cover_letter: true });
  onStep?.('done');
}

// ---------------------------------------------------------------------------
// AI document editing lives in src/lib/ai-edit.ts (server-only, kept out
// of the client bundle). The /api/ai/edit-document route imports it from
// there. This file no longer references maskPIIInHTML or the
// PRINT_SAFE_CSS_GUIDE for edits.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Masked entry point for AddJobModal
// ---------------------------------------------------------------------------

export async function generateMaskedJobEntryAndDocuments(
  jobDescription: string,
  category: string,
  onStep?: ProgressCallback,
  preFormattedJD?: FormattedJD
): Promise<GeneratedJob> {
  console.log('[AI] generateMaskedJobEntryAndDocuments called');
  const masterResume = await getMasterResume();
  if (!masterResume) throw new Error('Master resume not found.');

  onStep?.('analyzing');
  const formattedJD = preFormattedJD || await formatJobDescription(jobDescription);
  console.log('[AI] JD formatted:', formattedJD.company, formattedJD.job_title);

  const folder = 'job-' + Date.now();

  await saveApplication(category, folder, {
    company: formattedJD.company,
    job_title: formattedJD.job_title,
    date_applied: '', // set only when user marks job as applied
    status: 'prospect' as StatusKey,
    response_date: null,
    notes: '',
    contact_name: null,
    contact_email: null,
    source: 'Added Manually',
    documents: [],
    job_url: null,
  });

  const jdHTML = buildJobDescriptionHTML(formattedJD, jobDescription);
  await saveDocumentHTML(category, folder, 'job_description', jdHTML);

  // Auto-classify the job to a category using AI
  const userCategories = await getUserCategories();
  let assignedCategory = 'Uncategorized';
  if (userCategories.length > 0) {
    assignedCategory = await classifyJobToCategory(formattedJD, userCategories);
  }
  // Update the application with the AI-assigned category
  await assignJobToCategory(category, folder, assignedCategory);

  // Mask resume before sending to LLM
  const resumeJson = JSON.stringify(masterResume);
  const maskedResume = maskPII(resumeJson, masterResume);

  try {
    onStep?.('resume');
    const resumeBodyHTML = await generateResumeHTML(maskedResume, formattedJD);
    const demaskedResumeBody = demaskPII(resumeBodyHTML, masterResume);
    const resumeFullHTML = buildResumeFullHTML(masterResume, demaskedResumeBody, formattedJD);

    onStep?.('cover_letter');
    const coverLetterBodyHTML = await generateCoverLetterHTML(maskedResume, formattedJD);
    const demaskedCoverBody = demaskPII(coverLetterBodyHTML, masterResume);
    const coverLetterFullHTML = wrapCoverLetterHTML(
      masterResume.name || 'Unknown',
      masterResume.phone || '',
      masterResume.email || '',
      formattedJD,
      demaskedCoverBody
    );

    await saveDocumentHTML(category, folder, 'resume', resumeFullHTML);
    await saveDocumentHTML(category, folder, 'cover_letter', coverLetterFullHTML);
    await updateApplicationDocFlags(category, folder, { has_resume: true, has_cover_letter: true });
    console.log('[AI] generateMaskedJobEntryAndDocuments: SUCCESS');
    onStep?.('done');
  } catch (err) {
    console.error('[AI] generateMaskedJobEntryAndDocuments: document generation error:', err);
    await updateApplicationDocFlags(category, folder, { has_resume: false, has_cover_letter: false });
    throw err;
  }

  return {
    company: formattedJD.company,
    job_title: formattedJD.job_title,
    category: assignedCategory,
    category_name: assignedCategory,
    category_color: userCategories.find(c => c.name === assignedCategory)?.color || '#888888',
    folder,
  };
}

// ---------------------------------------------------------------------------
// Main entry point (called from AddJobModal)
// NOTE: caller must mask resume before calling if PII is involved
// ---------------------------------------------------------------------------

export async function generateJobEntryAndDocuments(
  jobDescription: string,
  category: string,
  onStep?: ProgressCallback
): Promise<GeneratedJob> {
  console.log('[AI] generateJobEntryAndDocuments called');

  onStep?.('analyzing');
  const formattedJD = await formatJobDescription(jobDescription);
  console.log('[AI] JD formatted, company:', formattedJD.company, 'title:', formattedJD.job_title);

  const folder = 'job-' + Date.now();

  await saveApplication(category, folder, {
    company: formattedJD.company,
    job_title: formattedJD.job_title,
    date_applied: '', // set only when user marks job as applied
    status: 'prospect' as StatusKey,
    response_date: null,
    notes: '',
    contact_name: null,
    contact_email: null,
    source: 'Added Manually',
    documents: [],
    job_url: null,
  });

  const jdHTML = buildJobDescriptionHTML(formattedJD, jobDescription);
  await saveDocumentHTML(category, folder, 'job_description', jdHTML);

  // Auto-classify the job to a category using AI
  const userCategories = await getUserCategories();
  let assignedCategory = 'Uncategorized';
  if (userCategories.length > 0) {
    assignedCategory = await classifyJobToCategory(formattedJD, userCategories);
  }
  // Update the application with the AI-assigned category
  await assignJobToCategory(category, folder, assignedCategory);

  try {
    console.log('[AI] Running document generation...');
    const { resumeFullHTML, coverLetterFullHTML } = await processJobDescription(formattedJD, jobDescription, onStep);
    console.log('[AI] Pipeline complete, saving documents...');

    await saveDocumentHTML(category, folder, 'resume', resumeFullHTML);
    await saveDocumentHTML(category, folder, 'cover_letter', coverLetterFullHTML);

    await updateApplicationDocFlags(category, folder, { has_resume: true, has_cover_letter: true });
    console.log('[AI] generateJobEntryAndDocuments: SUCCESS');
    onStep?.('done');

    return {
      company: formattedJD.company,
      job_title: formattedJD.job_title,
      category: assignedCategory,
      category_name: assignedCategory,
      category_color: userCategories.find(c => c.name === assignedCategory)?.color || '#888888',
      folder,
    };
  } catch (err) {
    console.error('[AI] generateJobEntryAndDocuments: ERROR:', err);
    await updateApplicationDocFlags(category, folder, { has_resume: false, has_cover_letter: false });
    throw err;
  }
}
