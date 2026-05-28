// PII Masking Utilities
// All PII processing happens client-side. The server NEVER sees raw identity data.

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

export interface PIIMaskMap {
  name: string;
  phone: string;
  email: string;
  emailUser: string;
  linkedIn: string;
  github: string;
  portfolio: string;
  otherLinks: string;
}

// Mask tokens used in server communication
export const MASK = {
  NAME: '[CANDIDATE_NAME]',
  PHONE: '[CANDIDATE_PHONE]',
  EMAIL: '[CANDIDATE_EMAIL]',
  EMAIL_USER: '[CANDIDATE_EMAIL_USER]',
  LINKEDIN: '[CANDIDATE_LINKEDIN]',
  GITHUB: '[CANDIDATE_GITHUB]',
  PORTFOLIO: '[CANDIDATE_PORTFOLIO]',
  OTHER_LINK: '[CANDIDATE_LINK]',
} as const;

const EMAIL_REGEX = /[\w.+-]+@[\w.-]+\.\w+/g;
const PHONE_REGEX = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const LINKEDIN_REGEX = /(?:linkedin\.com\/in\/[\w-]+|linkedin(?:\s+profile)?)/gi;
const GITHUB_REGEX = /(?:github\.com\/[\w-]+|github(?:\s+profile)?)/gi;

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

function buildMaskMap(_profile: PIIProfile): PIIMaskMap {
  return {
    name: MASK.NAME,
    phone: MASK.PHONE,
    email: MASK.EMAIL,
    emailUser: MASK.EMAIL_USER,
    linkedIn: MASK.LINKEDIN,
    github: MASK.GITHUB,
    portfolio: MASK.PORTFOLIO,
    otherLinks: MASK.OTHER_LINK,
  };
}

export function maskPII(text: string, profile: PIIProfile): string {
  const map = buildMaskMap(profile);
  let result = text;

  if (profile.email) result = result.replaceAll(profile.email, map.email);
  if (profile.emailUser) result = result.replaceAll(profile.emailUser, map.emailUser);
  if (profile.phone) {
    const escaped = profile.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), map.phone);
  }
  if (profile.name) {
    const escaped = profile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), map.name);
  }
  if (profile.linkedIn) result = result.replaceAll(profile.linkedIn, map.linkedIn);
  if (profile.github) result = result.replaceAll(profile.github, map.github);
  if (profile.portfolio) result = result.replaceAll(profile.portfolio, map.portfolio);

  result = result.replace(EMAIL_REGEX, map.email);
  result = result.replace(PHONE_REGEX, map.phone);
  result = result.replace(LINKEDIN_REGEX, map.linkedIn);
  result = result.replace(GITHUB_REGEX, map.github);

  return result;
}

export function demaskPII(text: string, profile: PIIProfile): string {
  const map = buildMaskMap(profile);
  let result = text;

  result = result.replaceAll(map.emailUser, profile.emailUser || profile.email);
  result = result.replaceAll(map.email, profile.email);
  result = result.replaceAll(map.phone, profile.phone);
  result = result.replaceAll(map.name, profile.name);
  result = result.replaceAll(map.linkedIn, profile.linkedIn || '');
  result = result.replaceAll(map.github, profile.github || '');
  result = result.replaceAll(map.portfolio, profile.portfolio || '');

  return result;
}

export function getServerPayloadSample(profile: PIIProfile): string {
  const sample = `CANDIDATE_NAME
CANDIDATE_PHONE
CANDIDATE_EMAIL
CANDIDATE_LINKEDIN
CANDIDATE_GITHUB`;
  return maskPII(sample, profile);
}
