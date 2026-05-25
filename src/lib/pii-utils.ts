// PII Masking Utilities for Zero-PII Architecture
// These functions mask personal information before sending to LLM
// and demask it after receiving the response

export interface PIIProfile {
  name?: string;
  phone?: string;
  email?: string;
  links?: string[];
}

/**
 * Mask PII in text by replacing personal information with placeholders
 * Only masks: name, phone, email, and social/professional links
 * Does NOT mask company names, job titles, universities - the LLM needs these
 */
export function maskPII(text: string, profile: PIIProfile): string {
  let masked = text;

  // Mask name
  if (profile.name) {
    const nameParts = profile.name.split(/\s+/);
    nameParts.forEach(part => {
      masked = masked.replace(new RegExp(part, 'gi'), '[CANDIDATE_NAME]');
    });
    // Also replace the full name
    masked = masked.replace(new RegExp(profile.name, 'gi'), '[CANDIDATE_NAME]');
  }

  // Mask phone (normalize to digits only for matching)
  if (profile.phone) {
    const digitsOnly = profile.phone.replace(/[^\d]/g, '');
    if (digitsOnly.length >= 10) {
      masked = masked.replace(new RegExp(digitsOnly, 'g'), '[CANDIDATE_PHONE]');
      // Also try original format
      masked = masked.replace(new RegExp(profile.phone.replace(/[^\d]/g, ''), 'g'), '[CANDIDATE_PHONE]');
    }
  }

  // Mask email
  if (profile.email) {
    masked = masked.replace(new RegExp(profile.email, 'gi'), '[CANDIDATE_EMAIL]');
    // Also mask partial email (username part)
    const emailParts = profile.email.split('@');
    if (emailParts.length === 2) {
      masked = masked.replace(new RegExp(emailParts[0], 'gi'), '[CANDIDATE_EMAIL_USER]');
    }
  }

  // Mask social/professional links
  if (profile.links && profile.links.length > 0) {
    profile.links.forEach(link => {
      // Escape special regex characters in URL
      const escapedLink = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      masked = masked.replace(new RegExp(escapedLink, 'gi'), '[CANDIDATE_LINK]');
    });
  }

  return masked;
}

/**
 * Demask PII by replacing placeholders with original personal information
 */
export function demaskPII(text: string, profile: PIIProfile): string {
  let demasked = text;

  // Demask email (do this first to avoid partial replacements)
  if (profile.email) {
    demasked = demasked.replace(/\[CANDIDATE_EMAIL_USER\]/g, profile.email.split('@')[0]);
    demasked = demasked.replace(/\[CANDIDATE_EMAIL\]/g, profile.email);
  }

  // Demask links
  if (profile.links && profile.links.length > 0) {
    profile.links.forEach(link => {
      demasked = demasked.replace(/\[CANDIDATE_LINK\]/g, link);
    });
  }

  // Demask phone
  if (profile.phone) {
    demasked = demasked.replace(/\[CANDIDATE_PHONE\]/g, profile.phone);
  }

  // Demask name (do this last, after other replacements)
  if (profile.name) {
    demasked = demasked.replace(/\[CANDIDATE_NAME\]/g, profile.name);
  }

  return demasked;
}

/**
 * Create a PII profile from the master resume HTML content
 * Extracts name, contact info, and links
 */
export function extractPIIProfile(masterResumeHtml: string): PIIProfile {
  // Simple extraction - in production this would parse the HTML more carefully
  const emailMatch = masterResumeHtml.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = masterResumeHtml.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/);
  const linkMatches = masterResumeHtml.match(/https?:\/\/[^\s<>"']+/g) || [];

  // Name is typically in an <h1> at the top
  const nameMatch = masterResumeHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);

  return {
    name: nameMatch ? nameMatch[1].trim() : undefined,
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined,
    links: linkMatches.length > 0 ? linkMatches : undefined,
  };
}