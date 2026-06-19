// PII Tagging Utilities
// All PII processing happens client-side. The server NEVER sees raw identity data.
// Instead of opaque placeholders, PII fields are wrapped in descriptive XML-style tags
// so the AI receives structured, clearly-labeled data it can understand and reference.

export interface PIIProfile {
  name: string;
  phone: string;
  email: string;
  emailUser?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  otherLinks: string[];
}

// XML-style tags used to mark PII fields in structured data sent to the AI
export const PII_TAGS = {
  NAME: 'PII_NAME',
  PHONE: 'PII_PHONE',
  EMAIL: 'PII_EMAIL',
  EMAIL_USER: 'PII_EMAIL_USER',
  LINKEDIN: 'PII_LINKEDIN',
  GITHUB: 'PII_GITHUB',
  PORTFOLIO: 'PII_PORTFOLIO',
  OTHER_LINK: 'PII_LINK',
} as const;

function wrapTag(tag: string, value: string): string {
  return `<${tag}>${value}</${tag}>`;
}

function stripTag(tag: string, value: string, replacement: string): string {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  return value.replace(new RegExp(`${open}(.*?)${close}`, 'g'), replacement);
}

export function extractPIIProfile(data: {
  name?: string;
  phone?: string;
  email?: string;
  socials?: Array<{ name: string; url: string }>;
  // portfolio can be a string (legacy), an array of link objects, or absent.
  portfolio?: string | Array<{ name?: string; url: string }>;
}): PIIProfile {
  const socials = data.socials || [];
  const linkedIn = socials.find(s => /linkedin/i.test(s.name))?.url || '';
  const github = socials.find(s => /github/i.test(s.name))?.url || '';
  const emailUser = data.email ? data.email.split('@')[0] : '';

  // Normalize portfolio to a string. The master resume stores it as an
  // array of {name, url} objects; legacy data may have it as a plain
  // string. Either way we extract the URL(s) so PII masking can
  // search for them in the HTML.
  let portfolioStr = '';
  if (Array.isArray(data.portfolio)) {
    portfolioStr = data.portfolio
      .map((p) => (typeof p === 'object' && p?.url ? p.url : ''))
      .filter(Boolean)
      .join(' ');
  } else if (typeof data.portfolio === 'string') {
    portfolioStr = data.portfolio;
  }

  return {
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    emailUser,
    linkedIn,
    github,
    portfolio: portfolioStr,
    otherLinks: [],
  };
}

// Wrap a value in its PII tag
function tagValue(tag: string, value: string): string {
  return `<${tag}>${value}</${tag}>`;
}

// Mask PII in a JSON string by wrapping each field's value in its PII tag.
// Uses JSON.parse with a reviver so nested structures are handled correctly.
export function maskPII(text: string, profile: PIIProfile): string {
  try {
    const parsed = JSON.parse(text);
    const result = JSON.parse(text, (key, value) => {
      if (typeof value === 'string') {
        switch (key) {
          case 'name':
            return value ? tagValue(PII_TAGS.NAME, value) : value;
          case 'phone':
            return value ? tagValue(PII_TAGS.PHONE, value) : value;
          case 'email':
            return value ? tagValue(PII_TAGS.EMAIL, value) : value;
          case 'emailUser':
            return value ? tagValue(PII_TAGS.EMAIL_USER, value) : value;
          default:
            return value;
        }
      }
      return value;
    });

    // Tag top-level socials/portfolio if present
    if (parsed.socials && Array.isArray(parsed.socials)) {
      result.socials = parsed.socials.map((s: { name: string; url: string }) => {
        if (/linkedin/i.test(s.name)) {
          return { name: s.name, url: s.url ? tagValue(PII_TAGS.LINKEDIN, s.url) : s.url };
        }
        if (/github/i.test(s.name)) {
          return { name: s.name, url: s.url ? tagValue(PII_TAGS.GITHUB, s.url) : s.url };
        }
        return s;
      });
    }
    if (parsed.portfolio && typeof parsed.portfolio === 'string') {
      result.portfolio = tagValue(PII_TAGS.PORTFOLIO, parsed.portfolio);
    }

    return JSON.stringify(result);
  } catch {
    // If JSON parsing fails, return text as-is (not valid JSON, no PII to mask)
    return text;
  }
}

// Strip PII tags from AI-generated content and replace with actual values.
// Also handles the placeholder tokens [CANDIDATE_NAME] etc. for backward compatibility.
export function demaskPII(text: string, profile: PIIProfile): string {
  let result = text;

  // Strip XML-style PII tags and replace with the actual values
  result = stripTag(PII_TAGS.NAME, result, profile.name || '');
  result = stripTag(PII_TAGS.PHONE, result, profile.phone || '');
  result = stripTag(PII_TAGS.EMAIL, result, profile.email || '');
  result = stripTag(PII_TAGS.EMAIL_USER, result, profile.emailUser || profile.email || '');
  result = stripTag(PII_TAGS.LINKEDIN, result, profile.linkedIn || '');
  result = stripTag(PII_TAGS.GITHUB, result, profile.github || '');
  result = stripTag(PII_TAGS.PORTFOLIO, result, profile.portfolio || '');

  // Backward compatibility: also handle the old placeholder tokens
  result = result.replaceAll('[CANDIDATE_NAME]', profile.name || '');
  result = result.replaceAll('[CANDIDATE_PHONE]', profile.phone || '');
  result = result.replaceAll('[CANDIDATE_EMAIL]', profile.email || '');
  result = result.replaceAll('[CANDIDATE_EMAIL_USER]', profile.emailUser || profile.email || '');
  result = result.replaceAll('[CANDIDATE_LINKEDIN]', profile.linkedIn || '');
  result = result.replaceAll('[CANDIDATE_GITHUB]', profile.github || '');
  result = result.replaceAll('[CANDIDATE_PORTFOLIO]', profile.portfolio || '');

  return result;
}

// ---------------------------------------------------------------------------
// HTML PII masking (for document edits — masks real PII in stored HTML)
// ---------------------------------------------------------------------------
//
// Stored documents (resumes, cover letters) already contain the candidate's
// real name, phone, email, and links injected by the wrappers. We need to
// mask these before sending the HTML to the LLM, then demask after.
//
// We walk text nodes and attribute values via a regex pass on the full HTML,
// matching the exact PII strings from the profile. A DOM parser is overkill
// here — the values are concrete (a specific phone number, a specific email)
// and unlikely to collide with HTML structure. We deliberately skip <script>,
// <style>, and the entire <head> so we don't disturb page metadata.

const HEAD_SPLIT_RE = /(<head[^>]*>[\s\S]*?<\/head>)/i;

function maskString(html: string, value: string, tag: string): string {
  if (!value || typeof value !== 'string') return html;
  // Escape regex special chars in the value (e.g. + in phone numbers, . in email)
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match the value as a whole word/identifier, case-sensitive.
  // Use lookarounds to avoid matching inside other identifiers.
  const re = new RegExp(`(?<![A-Za-z0-9_@./-])${escaped}(?![A-Za-z0-9_@./-])`, 'g');
  return html.replace(re, `<${tag}>${value}</${tag}>`);
}

function maskAttributeHrefs(html: string, profile: PIIProfile): string {
  let result = html;
  // Mask email inside mailto: and tel: hrefs
  if (profile.email) {
    const escaped = profile.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`(mailto:${escaped})`, 'gi'),
      `mailto:<${PII_TAGS.EMAIL}>${profile.email}</${PII_TAGS.EMAIL}>`
    );
  }
  if (profile.phone) {
    const escaped = profile.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`(tel:${escaped})`, 'gi'),
      `tel:<${PII_TAGS.PHONE}>${profile.phone}</${PII_TAGS.PHONE}>`
    );
  }
  return result;
}

// Mask PII in an HTML document string. Walks <body> text and attribute values.
// Leaves <head> untouched (no user PII lives there). Leaves <script> and <style>
// content untouched.
export function maskPIIInHTML(html: string, profile: PIIProfile): string {
  if (!html) return html;

  // Split into [pre-head, head, post-head] so we can mask only the body portion.
  const headMatch = html.match(HEAD_SPLIT_RE);
  if (!headMatch) {
    // No <head> — mask the whole thing (very old stored docs).
    return maskPIIInBody(html, profile);
  }
  const before = html.slice(0, headMatch.index!);
  const head = headMatch[0];
  const after = html.slice(headMatch.index! + head.length);
  return before + head + maskPIIInBody(after, profile);
}

function maskPIIInBody(html: string, profile: PIIProfile): string {
  let result = html;
  // Order matters: mask longer / more specific values first so we don't double-mask.
  result = maskString(result, profile.email, PII_TAGS.EMAIL);
  result = maskString(result, profile.phone, PII_TAGS.PHONE);
  result = maskString(result, profile.name, PII_TAGS.NAME);
  result = maskString(result, profile.linkedIn || '', PII_TAGS.LINKEDIN);
  result = maskString(result, profile.github || '', PII_TAGS.GITHUB);
  result = maskString(result, profile.portfolio || '', PII_TAGS.PORTFOLIO);
  // Mask email/phone inside mailto:/tel: hrefs.
  result = maskAttributeHrefs(result, profile);
  return result;
}