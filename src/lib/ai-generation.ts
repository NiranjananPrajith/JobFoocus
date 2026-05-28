import { saveApplication, saveDocumentHTML, getMasterResume, updateApplicationDocFlags } from '@/lib/storage-adapter';
import { maskPII, demaskPII } from '@/lib/pii-utils';
import type { CategoryKey, StatusKey } from '@/lib/storage-adapter';
import formattingGuides from './formatting-guides.json';

// PII warning from server — surface to caller so the modal can show the detailed dialog
export class PIIWarningError extends Error {
  detected: { email: boolean; phone: boolean };
  constructor(detected: { email: boolean; phone: boolean }) {
    super('PII was detected in your master resume. Please review and edit before continuing.');
    this.name = 'PIIWarningError';
    this.detected = detected;
  }
}

// ---------------------------------------------------------------------------
// Minimax API (Anthropic API compatibility via direct fetch)
// ---------------------------------------------------------------------------

const API_KEY = process.env.NEXT_PUBLIC_MINIMAX_API_KEY || process.env.MINIMAX_API_KEY || '';
const MODEL = 'MiniMax-M2.7';
// Server-side: call Minimax directly. Client-side: call our Next.js API route to avoid CORS.
const AI_API_URL = typeof window !== 'undefined' ? '/api/ai' : 'https://api.minimax.io/anthropic/v1/messages';

type AIFunction = 'analyzing' | 'resume' | 'cover_letter' | 'done';
type ProgressCallback = (step: AIFunction) => void;

async function minimaxChat(prompt: string, system: string): Promise<string> {
  if (!API_KEY) {
    console.error('[AI] MINIMAX_API_KEY is not configured.');
    throw new Error('MINIMAX_API_KEY is not configured.');
  }

  console.log('[AI] Sending request to Minimax...', { model: MODEL, promptLength: prompt.length });

  const isServer = typeof window === 'undefined';
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

  // Check if the server flagged PII — throw so callers can handle gracefully
  if (data.warning && data.detected) {
    throw new PIIWarningError(data.detected);
  }

  const content = data.content != null
    ? data.content
    : (() => {
        const blocks = data.content || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textBlocks = blocks.filter((b: any) => b.type === 'text');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return textBlocks.map((b: any) => b.text || '').join('');
      })();

  if (!content) {
    console.error('[AI] Empty response from Minimax.');
    throw new Error('Minimax returned empty response.');
  }

  console.log('[AI] Extracted content length:', content.length);
  return content;
}

// ---------------------------------------------------------------------------
// Category Definitions
// ---------------------------------------------------------------------------

const CATEGORY_DEFS: Record<string, { name: string; color: string; keywords: string[] }> = {
  '1_tech_support': {
    name: 'Tech Support',
    color: '#4a90e2',
    keywords: ['helpdesk', 'help desk', 'tech support', 'technical support', 'it support', 'desktop support', 'customer service', 'technical', 'software support', 'hardware support', 'tier 1', 'tier 2', 'service desk', 'it helpdesk'],
  },
  '2_general_basic': {
    name: 'General Basic',
    color: '#4caf50',
    keywords: ['cashier', 'stock associate', 'retail', 'fast food', 'mcdonalds', 'tim hortons', 'restaurant', 'server', 'host', 'busser', 'warehouse', 'general labour', 'labourer', 'customer service', 'sales associate', 'cash handling'],
  },
  '3_kitchen_cook': {
    name: 'Kitchen / Cook',
    color: '#f5a623',
    keywords: ['line cook', 'cook', 'kitchen', 'chef', 'food prep', 'food preparation', 'prep cook', 'busser', 'dishwasher', 'grill', 'fry', 'saute', 'broil', 'kitchen helper', 'sous chef', 'restaurant cook'],
  },
};

function classifyCategory(jobDescription: string): CategoryKey {
  const text = jobDescription.toLowerCase();
  let bestCategory: CategoryKey = '2_general_basic';
  let bestScore = 0;

  for (const [key, def] of Object.entries(CATEGORY_DEFS)) {
    let score = 0;
    for (const kw of def.keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = key as CategoryKey;
    }
  }

  return bestCategory;
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
// AI Step 2: Generate resume HTML (server-safe — receives masked text only)
// ---------------------------------------------------------------------------

async function generateResumeHTML(maskedMasterResume: string, jd: FormattedJD): Promise<string> {
  console.log('[AI] Step 2: Generating resume HTML');
  const guide = formattingGuides.resume;
  const system = 'You are an expert resume writer. Output ONLY valid HTML for the resume body — NO <html>, <head>, or <body> tags.\n\n' + guide.ai_instructions + '\n\n---\nRESUME FORMATTING GUIDE (reference only — do not output this):\n' + JSON.stringify(guide, null, 2);

  const prompt = 'Using this MASTER RESUME DATA (PII already masked as placeholders):\n' + maskedMasterResume + '\n\nCreate a tailored resume for:\nCompany: ' + jd.company + '\nTitle: ' + jd.job_title + '\nResponsibilities: ' + (jd.responsibilities || []).join(', ') + '\nRequirements: ' + (jd.requirements || []).join(', ') + '\n\nGenerate HTML with:\n1. An h2 "Professional Summary" section with a .summary div containing a <p> with 3-4 sentences tailored to the job\n2. An h2 "Skills" section with a ul.skills-list of 3-4 skills categories using <li><strong>Category</strong>: skills... format\n3. An h2 "Professional Experience" section with 1-2 most relevant job entries using .job-entry, .job-header, .job-title-row, .company-name, .job-title, .job-date-location, ul.achievements structure\n4. An h2 "Education" section with 1-2 most relevant entries using .edu-entry\n\nDo NOT include a header with name/contact info — that is added by the wrapper. Output ONLY the HTML body content.';

  return minimaxChat(prompt, system);
}

// ---------------------------------------------------------------------------
// AI Step 3: Generate cover letter HTML (server-safe — receives masked text only)
// ---------------------------------------------------------------------------

async function generateCoverLetterHTML(maskedMasterResume: string, jd: FormattedJD): Promise<string> {
  console.log('[AI] Step 3: Generating cover letter HTML');
  const guide = formattingGuides.cover_letter;
  const system = 'You are an expert cover letter writer. Return ONLY the HTML body content — NO <html>, <head>, or <body> tags.\n\n' + guide.ai_instructions + '\n\n---\nCOVER LETTER FORMATTING GUIDE (reference only — do not output this):\n' + JSON.stringify(guide, null, 2);

  const reqSlice = (jd.requirements || []).slice(0, 5).map(function(r: string) { return '- ' + r; }).join('\n');

  // NOTE: name, phone, email are NOT in the prompt — they remain as placeholders [CANDIDATE_NAME] etc.
  const prompt = 'Write a professional cover letter as HTML for:\nCANDIDATE (already masked in prompt):\n' + maskedMasterResume + '\n\nJOB TARGET:\nCompany: ' + jd.company + '\nPosition: ' + jd.job_title + '\nSummary: ' + (jd.summary || '') + '\n\nKEY REQUIREMENTS: ' + reqSlice + '\nSTRUCTURE REQUIRED — use EXACT class names:\n<div class="sender-block">name + meta</div>\n<div class="date-block">Month DD, YYYY</div>\n<div class="recipient-block">Hiring Team<br><strong>Company</strong></div>\n<div class="subject-block">RE: Job Title</div>\n<p>Para 1: interest + hook</p>\n<p>Para 2: achievements matching requirements</p>\n<p>Para 3: closing + availability + call to action</p>\n<div class="signature-space">Sincerely, Name</div>\n\nIMPORTANT: Do NOT include raw name, phone or email in the prompt. Use placeholder text [CANDIDATE_NAME], [CANDIDATE_PHONE], [CANDIDATE_EMAIL] in the sender-block and signature-space. Output ONLY the HTML body.';

  return minimaxChat(prompt, system);
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
// Masked entry point for AddJobModal
// ---------------------------------------------------------------------------

export async function generateMaskedJobEntryAndDocuments(
  jobDescription: string,
  onStep?: ProgressCallback
): Promise<GeneratedJob> {
  console.log('[AI] generateMaskedJobEntryAndDocuments called');
  const masterResume = await getMasterResume();
  if (!masterResume) throw new Error('Master resume not found.');

  onStep?.('analyzing');
  const formattedJD = await formatJobDescription(jobDescription);
  console.log('[AI] JD formatted:', formattedJD.company, formattedJD.job_title);

  const category = classifyCategory(jobDescription);
  const def = CATEGORY_DEFS[category];
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
    if (err instanceof PIIWarningError) {
      // Job entry was saved successfully — only document generation failed.
      // Re-throw so the modal can show the PII warning UI.
      throw err;
    }
    // For other errors, mark doc flags as false and re-throw
    await updateApplicationDocFlags(category, folder, { has_resume: false, has_cover_letter: false });
    throw err;
  }

  return {
    company: formattedJD.company,
    job_title: formattedJD.job_title,
    category,
    category_name: def.name,
    category_color: def.color,
    folder,
  };
}

// ---------------------------------------------------------------------------
// Main entry point (called from AddJobModal)
// NOTE: caller must mask resume before calling if PII is involved
// ---------------------------------------------------------------------------

export async function generateJobEntryAndDocuments(
  jobDescription: string,
  onStep?: ProgressCallback
): Promise<GeneratedJob> {
  console.log('[AI] generateJobEntryAndDocuments called');

  onStep?.('analyzing');
  const formattedJD = await formatJobDescription(jobDescription);
  console.log('[AI] JD formatted, company:', formattedJD.company, 'title:', formattedJD.job_title);

  const category = classifyCategory(jobDescription);
  const def = CATEGORY_DEFS[category];
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
      category,
      category_name: def.name,
      category_color: def.color,
      folder,
    };
  } catch (err) {
    console.error('[AI] generateJobEntryAndDocuments: ERROR:', err);
    await updateApplicationDocFlags(category, folder, { has_resume: false, has_cover_letter: false });
    throw err;
  }
}
