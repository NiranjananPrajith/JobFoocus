import { saveApplication, saveDocumentHTML, getMasterResume } from '@/lib/storage-adapter';
import type { CategoryKey, StatusKey } from '@/lib/storage-adapter';

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

  // Score each category by keyword matches
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
// Simple text extraction (stub for AI)
// ---------------------------------------------------------------------------

function extractCompanyFromJD(jd: string): string {
  // Try to find "Company:" or "Employer:" patterns
  const patterns = [
    /company[:\s]+([^\n\r]+)/i,
    /employer[:\s]+([^\n\r]+)/i,
    /about the company[:\s]+([^\n\r]+)/i,
    /who we are[:\s]+([^\n\r]+)/i,
  ];
  for (const p of patterns) {
    const m = jd.match(p);
    if (m && m[1]) return m[1].trim().substring(0, 80);
  }
  return 'Unknown Company';
}

function extractJobTitleFromJD(jd: string): string {
  const patterns = [
    /job title[:\s]+([^\n\r]+)/i,
    /position[:\s]+([^\n\r]+)/i,
    /title[:\s]+([^\n\r]+)/i,
  ];
  for (const p of patterns) {
    const m = jd.match(p);
    if (m && m[1]) return m[1].trim().substring(0, 80);
  }
  // Fall back to first non-empty non-url line
  const lines = jd.split(/\n|\r/).filter(l => l.trim().length > 3);
  return lines[0]?.trim().substring(0, 80) || 'Scraped Position';
}

// ---------------------------------------------------------------------------
// Check if master resume is blank
// ---------------------------------------------------------------------------

export async function isMasterResumeBlank(): Promise<boolean> {
  const data = await getMasterResume();
  if (!data) return true;
  // Blank = no name, no work experience, no education
  const hasName = !!(data.name?.trim());
  const hasWork = Array.isArray(data.workExperience) && data.workExperience.length > 0;
  const hasEdu = Array.isArray(data.education) && data.education.length > 0;
  return !hasName && !hasWork && !hasEdu;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface GeneratedJob {
  company: string;
  job_title: string;
  category: CategoryKey;
  category_name: string;
  category_color: string;
  folder: string;
}

export async function processJobDescription(
  jobDescription: string
): Promise<GeneratedJob> {
  const company = extractCompanyFromJD(jobDescription);
  const job_title = extractJobTitleFromJD(jobDescription);
  const category = classifyCategory(jobDescription);
  const def = CATEGORY_DEFS[category];
  const folder = `job-${Date.now()}`;

  // Save application metadata
  await saveApplication(category, folder, {
    company,
    job_title,
    date_applied: new Date().toISOString().split('T')[0],
    status: 'prospect' as StatusKey,
    response_date: null,
    notes: '',
    contact_name: null,
    contact_email: null,
    source: 'Manual JD Paste',
    documents: [],
    job_url: null,
  });

  // Save job description document
  await saveDocumentHTML(category, folder, 'job_description', `<div>${jobDescription}</div>`);

  console.warn('[ai-generation] AI resume + cover letter generation not yet wired — job entry created with stub data.');

  return {
    company,
    job_title,
    category,
    category_name: def.name,
    category_color: def.color,
    folder,
  };
}
