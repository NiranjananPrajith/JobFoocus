// Utilities for splitting a stored full HTML document into its <head>
// and <body> inner HTML, and recombining them. The editor loads the
// original HTML into an iframe, hands the body to TipTap, and on every
// update we recombine the original head with the new body inner HTML.

export interface SplitDocument {
  prefix: string;   // everything up to and including <body...> opening tag (or up to body content if no <head>)
  suffix: string;   // </body></html> (or empty if no closing tags)
  headHTML: string; // the inner HTML of <head> (the <style>, <title>, <meta>, etc.)
  bodyHTML: string; // the inner HTML of <body>
}

const HEAD_RE = /<head[^>]*>([\s\S]*?)<\/head>/i;
const BODY_OPEN_RE = /<body[^>]*>/i;
const BODY_CLOSE_RE = /<\/body>/i;
const HTML_CLOSE_RE = /<\/html>/i;

export function splitDocument(fullHTML: string): SplitDocument {
  const headMatch = fullHTML.match(HEAD_RE);
  const headHTML = headMatch ? headMatch[1] : '';

  const bodyOpenMatch = fullHTML.match(BODY_OPEN_RE);
  const bodyCloseMatch = fullHTML.match(BODY_CLOSE_RE);
  const htmlCloseMatch = fullHTML.match(HTML_CLOSE_RE);

  if (!bodyOpenMatch || !bodyCloseMatch) {
    // No proper body tags — treat the whole string as body content.
    return {
      prefix: '<!DOCTYPE html><html><head></head><body>',
      suffix: '</body></html>',
      headHTML: '',
      bodyHTML: fullHTML,
    };
  }

  const bodyOpenIndex = bodyOpenMatch.index! + bodyOpenMatch[0].length;
  const bodyCloseIndex = bodyCloseMatch.index!;

  const prefix = fullHTML.slice(0, bodyOpenIndex);
  const bodyHTML = fullHTML.slice(bodyOpenIndex, bodyCloseIndex);

  let suffix = fullHTML.slice(bodyCloseIndex);
  // Ensure suffix ends with </html>; if not, append.
  if (!htmlCloseMatch) suffix += '</html>';

  return { prefix, suffix, headHTML, bodyHTML };
}

export function recombineDocument(prefix: string, newBodyHTML: string, suffix: string): string {
  return prefix + newBodyHTML + suffix;
}

// Normalize old stored docs that targeted US Letter to A4 so the
// on-screen A4 page sheets match the printed page size. Only rewrites
// the @page size; doesn't touch other styles.
export function normalizePageSizeToA4(fullHTML: string): string {
  return fullHTML.replace(/@page\s*\{\s*size\s*:\s*letter\s*;?/i, '@page { size: A4;');
}
