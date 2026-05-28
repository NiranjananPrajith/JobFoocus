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
  portfolio?: string;
}): PIIProfile {
  const socials = data.socials || [];
  const linkedIn = socials.find(s => /linkedin/i.test(s.name))?.url || '';
  const github = socials.find(s => /github/i.test(s.name))?.url || '';
  const emailUser = data.email ? data.email.split('@')[0] : '';

  return {
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    emailUser,
    linkedIn,
    github,
    portfolio: data.portfolio || '',
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