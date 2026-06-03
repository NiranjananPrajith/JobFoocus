import { saveApplication, saveDocumentHTML, getMasterResume, updateApplicationDocFlags, getUserCategories, assignJobToCategory, type UserCategory } from '@/lib/storage-adapter';
import { maskPII, demaskPII, type PIIProfile } from '@/lib/pii-utils';
import type { CategoryKey, StatusKey } from '@/lib/storage-adapter';
import formattingGuides from './formatting-guides.json';

// ---------------------------------------------------------------------------
// Minimax API (Anthropic API compatibility via direct fetch)
// ---------------------------------------------------------------------------

const API_KEY = process.env.MINIMAX_API_KEY || '';
const MODEL = 'MiniMax-M2.7';
// Server-side: call Minimax directly. Client-side: call our Next.js API route to avoid CORS.
const AI_API_URL = typeof window !== 'undefined' ? '/api/ai' : 'https://api.minimax.io/anthropic/v1/messages';

type AIFunction = 'analyzing' | 'resume' | 'cover_letter' | 'done';
type ProgressCallback = (step: AIFunction) => void;

async function minimaxChat(prompt: string, system: string): Promise<string> {
  const isServer = typeof window === 'undefined';

  if (isServer && !API_KEY) {
    console.error('[AI] MINIMAX_API_KEY is not configured.');
    throw new Error('MINIMAX_API_KEY is not configured.');
  }

  console.log('[AI] Sending request to Minimax...', { model: MODEL, promptLength: prompt.length });

  const fetchOptions = isServer
    ? {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
          temperature: 0.3,
        }),
      }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, system }),
      };

  const res = await fetch(AI_API_URL, fetchOptions as RequestInit);

  console.log('[AI] Minimax response status:', res.status, res.statusText);

  if (!res.ok) {
    const errText = await res.text();
    console.error('[AI] Minimax API error:', res.status, errText);
    throw new Error(`Minimax API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  let content: string;

  if (typeof data.content === 'string') {
    // Direct string response
    content = data.content;
  } else if (Array.isArray(data.content)) {
    // Array of content blocks [{type: "text", text: "..."}]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlocks = data.content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b && b.type === 'text')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => b.text || '');
    content = textBlocks.join('');
  } else if (data.content != null && typeof data.content === 'object') {
    // Single content object {type: "text", text: "..."}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content = (data.content as any).text || '';
  } else {
    console.error('[AI] Unexpected Minimax response structure:', typeof data.content, JSON.stringify(data.content).slice(0, 200));
    throw new Error('Minimax returned an unexpected response format.');
  }

  if (!content) {
    console.error('[AI] Empty response from Minimax.');
    throw new Error('Minimax returned empty response.');
  }

  console.log('[AI] Extracted content length:', content.length);
  return content;
}

// ---------------------------------------------------------------------------
// AI Step 1: Format raw job description
// ---------------------------------------------------------------------------

interface FormattedJD {
  company: string;
  job_title: string;
  location: string;
  employment_type: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
}

async function formatJobDescription(rawJD: string): Promise<FormattedJD> {
  console.log('[AI] Step 1: Formatting job description, input length:', rawJD.length);
  const system = 'You are an expert job posting analyst. Parse the provided job posting and return a JSON object with exactly these fields:\n- company: string (the hiring company name, or "Unknown Company" if not found)\n- job_title: string (the exact job title)\n- location: string (city/region or "Not specified")\n- employment_type: string (full-time, part-time, contract, etc.)\n- summary: string (2-3 sentence overview of the role)\n- responsibilities: string[] (array of 4-8 key responsibilities as concise bullet points)\n- requirements: string[] (array of 4-8 minimum requirements as bullet points)\n- preferred: string[] (array of 2-4 nice-to-have qualifications, or empty array if none)\n\nReturn ONLY the JSON object. No markdown, no code blocks, no explanation. The JSON must be parseable with JSON.parse().';

  const result = await minimaxChat(
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
// AI Classification: Assign job to category
// ---------------------------------------------------------------------------

async function classifyJobToCategory(
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
    const result = await minimaxChat(prompt, system);
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

async function generateResumeHTML(maskedMasterResume: string, jd: FormattedJD): Promise<string> {
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

  return minimaxChat(prompt, system);
}

// ---------------------------------------------------------------------------
// AI Step 3: Generate cover letter HTML (server-safe — receives masked text only)
// ---------------------------------------------------------------------------

async function generateCoverLetterHTML(maskedMasterResume: string, jd: FormattedJD): Promise<string> {
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

  const raw = await minimaxChat(prompt, system);

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

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Resume - ' + name + '</title>\n    <style>\n        @page { size: letter; margin: 0.6in; }\n        @media print {\n            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        }\n        body { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; color: #222222; line-height: 1.5; font-size: 11pt; margin: 0; padding: 0; }\n        h1 { font-size: 22pt; text-align: center; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }\n        .contact-info { text-align: center; font-size: 10pt; color: #555555; margin-bottom: 24px; line-height: 1.6; }\n        h2 { font-size: 11pt; border-bottom: 1.5px solid #222222; margin: 24px 0 12px 0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }\n        .summary { margin-bottom: 20px; }\n        .summary p { margin: 0; text-align: justify; font-size: 10.5pt; line-height: 1.6; color: #333333; }\n        ul.achievements { margin: 0; padding-left: 18px; }\n        ul.achievements li { margin-bottom: 5px; text-align: justify; font-size: 10.5pt; line-height: 1.5; }\n        .job-entry { margin-bottom: 18px; page-break-inside: avoid; }\n        .job-header { margin-bottom: 8px; display: block; position: relative; }\n        .job-title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }\n        .company-name { font-weight: 700; font-size: 11pt; color: #111111; }\n        .job-date-location { display: block; font-weight: normal; font-style: normal; color: #666666; font-size: 9.5pt; margin-top: 2px; }\n        .job-title { font-style: italic; font-weight: 500; color: #333333; text-align: right; flex-shrink: 0; }\n        ul.skills-list { margin: 0 0 20px 0; padding: 0; list-style: none; }\n        ul.skills-list li { margin-bottom: 6px; font-size: 10.5pt; }\n        ul.skills-list li strong { color: #111111; font-weight: 600; }\n        .edu-entry { margin-bottom: 10px; page-break-inside: avoid; font-size: 10.5pt; }\n        .edu-entry .job-date-location { float: none; display: block; margin-bottom: 2px; }\n        .edu-entry .company-name { font-weight: 600; }\n        .edu-entry .job-title { font-style: normal; color: #444444; }\n    </style>\n</head>\n<body>\n    <h1>' + name + '</h1>\n    <div class="contact-info">\n        ' + phone + ' &bull; ' + email + (socialsHTML ? ' &bull; ' + socialsHTML : '') + '\n    </div>\n    ' + bodyHTML + '\n</body>\n</html>';
}

// ---------------------------------------------------------------------------
// Cover Letter HTML wrapper (client-side only — injects real PII)
// ---------------------------------------------------------------------------

export function wrapCoverLetterHTML(name: string, phone: string, email: string, jd: FormattedJD, bodyHTML: string): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Cover Letter - ' + name + '</title>\n    <style>\n        @page { size: letter; margin: 1.0in; }\n        @media print {\n            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        }\n        body { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; color: #222222; line-height: 1.5; font-size: 11pt; margin: 0; padding: 0; }\n        .sender-block { margin-bottom: 28px; }\n        .sender-name { font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; color: #111111; }\n        .sender-meta { color: #555555; font-size: 10pt; line-height: 1.5; }\n        .date-block { margin-bottom: 22px; font-size: 10.5pt; }\n        .recipient-block { margin-bottom: 28px; }\n        .recipient-block strong { font-size: 11pt; color: #111111; }\n        .subject-block { font-weight: 700; margin-bottom: 24px; text-transform: uppercase; font-size: 10.5pt; letter-spacing: 0.5px; color: #111111; }\n        p { margin: 0 0 16px 0; text-align: justify; font-size: 11pt; line-height: 1.6; }\n        .signature-space { margin-top: 40px; page-break-inside: avoid; }\n        .signature-space strong { font-weight: 600; }\n    </style>\n</head>\n<body>\n    <div class="sender-block">\n        <div class="sender-name">' + name + '</div>\n        <div class="sender-meta">' + phone + ' | ' + email + '</div>\n    </div>\n    <div class="date-block">' + today + '</div>\n    <div class="recipient-block">\n        Hiring Selection Team<br>\n        <strong>' + jd.company + '</strong><br>\n    </div>\n    <div class="subject-block">RE: Application for the position of ' + jd.job_title + '</div>\n    ' + bodyHTML + '\n    <div class="signature-space">\n        Sincerely,<br><br><br>\n        <strong>' + name + '</strong>\n    </div>\n</body>\n</html>';
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

function buildJobDescriptionHTML(jd: FormattedJD, rawJD: string): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const responsibilitiesHTML = Array.isArray(jd.responsibilities) && jd.responsibilities.length > 0
    ? '<h2>Key Responsibilities</h2>\n<ul>' + jd.responsibilities.map(r => '<li>' + r + '</li>').join('\n') + '</ul>'
    : '';

  const requirementsHTML = Array.isArray(jd.requirements) && jd.requirements.length > 0
    ? '<h2>Requirements</h2>\n<ul>' + jd.requirements.map(r => '<li>' + r + '</li>').join('\n') + '</ul>'
    : '';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Job Description - ' + jd.job_title + '</title>\n    <style>\n        @page { size: letter; margin: 0.6in; }\n        @media print {\n            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n        }\n        body { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }\n        h1 { font-size: 24px; margin-bottom: 5px; }\n        .meta { color: #666; margin-bottom: 20px; }\n\th2 { font-size: 18px; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }\n        ul { padding-left: 20px; }\n        li { margin-bottom: 8px; }\n        .section { margin-bottom: 20px; }\n    </style>\n</head>\n<body>\n    <h1>' + jd.job_title + '</h1>\n    <div class="meta">\n        <p>' + jd.company + ' &bull; ' + (jd.location || 'Location not specified') + ' &bull; ' + (jd.employment_type || 'Full-time') + '</p>\n    </div>\n\n    <h2>About the Role</h2>\n    <div class="section">\n        <p>' + (jd.summary || 'No summary available.') + '</p>\n    </div>\n\n    ' + responsibilitiesHTML + '\n    ' + requirementsHTML + '\n\n    <h2>Application Details</h2>\n    <p><em>Job Description saved on ' + today + '</em></p>\n</body>\n</html>';
}

function buildResumeFullHTML(masterResume: any, tailoredBodyHTML: string, jd?: FormattedJD): string {
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
      workEntries += '<div class="job-entry">\n' +
        '<div class="job-header">\n' +
          '<div class="job-title-row">\n' +
            '<span class="company-name">' + (w.employer || '') + '</span>\n' +
            '<span class="job-title">' + (w.jobTitle || '') + '</span>\n' +
          '</div>\n' +
          '<span class="job-date-location">' + (w.startDate || '') + (w.endDate ? ' – ' + w.endDate : ' – Present') + '</span>\n' +
        '</div>\n' +
        '<ul class="achievements">\n' + dutiesList + '\n</ul>\n' +
      '</div>\n';
    }
    tailoredBodyHTML = tailoredBodyHTML + '\n<h2>Professional Experience</h2>\n' + workEntries;
  }

  let eduEntries = '';
  if (Array.isArray(masterResume.education) && masterResume.education.length > 0) {
    for (const e of masterResume.education.slice(0, 2)) {
      eduEntries += '<div class="edu-entry">\n' +
        '<span class="job-date-location">' + (e.startDate || '') + (e.endDate ? ' – ' + e.endDate : '') + '</span>\n' +
        '<span class="company-name">' + (e.course || '') + '</span> &ndash; <span class="job-title">' + (e.institution || '') + '</span>\n' +
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
// Edit existing document with user change request
// ---------------------------------------------------------------------------

async function editDocumentFullHTML(
  currentHTML: string,
  docType: 'resume' | 'cover_letter',
  userMessage: string
): Promise<string> {
  const system = docType === 'resume'
    ? 'You are an expert resume writer. You are editing an existing resume. Apply the requested change to the document. Return the complete edited resume HTML document including all original content (summary, skills, work experience, education, certifications — unchanged unless the user explicitly asked to modify them). Preserve all existing CSS classes, structure, and formatting.'
    : 'You are an expert cover letter writer. You are editing an existing cover letter. Apply the requested change to the document. Return the complete edited cover letter HTML document including all original content (all paragraphs, sender info, signature — unchanged unless the user explicitly asked to modify them). Preserve all existing CSS classes, structure, and formatting.';

  const prompt = `Edit the following ${docType === 'resume' ? 'resume' : 'cover letter'} HTML document according to the user's request.

CURRENT DOCUMENT:
${currentHTML}

USER'S REQUEST:
"${userMessage}"

INSTRUCTIONS:
- Apply the requested change to the document
- Keep ALL other content exactly as it is — do not remove, reorder, or rewrite anything unless the user explicitly asked
- Return the COMPLETE edited HTML document including the full <!DOCTYPE html>... structure
- Do not add any commentary, explanation, or text outside the HTML
- Preserve all existing CSS classes, HTML structure, and inline styles
- For resumes: keep Professional Summary, Skills, Work Experience, Education, and Certifications sections intact unless specifically asked to change them
- For cover letters: keep all paragraphs and all structural elements (sender block, date, recipient, subject, signature) intact unless specifically asked to change them`;

  const raw = await minimaxChat(prompt, system);
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

  return cleaned;
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

export async function editDocumentHTML(
  fullHTML: string,
  docType: 'resume' | 'cover_letter',
  userMessage: string
): Promise<string> {
  return editDocumentFullHTML(fullHTML, docType, userMessage);
}

// ---------------------------------------------------------------------------
// Masked entry point for AddJobModal
// ---------------------------------------------------------------------------

export async function generateMaskedJobEntryAndDocuments(
  jobDescription: string,
  category: string,
  onStep?: ProgressCallback
): Promise<GeneratedJob> {
  console.log('[AI] generateMaskedJobEntryAndDocuments called');
  const masterResume = await getMasterResume();
  if (!masterResume) throw new Error('Master resume not found.');

  onStep?.('analyzing');
  const formattedJD = await formatJobDescription(jobDescription);
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
