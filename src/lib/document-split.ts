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

// Normalize stored docs for consistent print output:
// 1. US Letter → A4
// 2. @page margin: 0 → margin: 15mm (per-page margins on every page)
// 3. Strip body padding (15mm/20mm/other) → padding: 0 (let @page handle margins)
//
// The on-screen editor overrides body padding via @media screen in
// the injected surface CSS, so stripping padding here only affects
// the print output (which is what we want).
export function normalizePageSizeToA4(fullHTML: string): string {
  let result = fullHTML;
  // 1. Letter → A4
  result = result.replace(/@page\s*\{\s*size\s*:\s*letter\s*;?/i, '@page { size: A4;');
  // 2. @page margin: 0 → margin: 15mm (handles legacy docs with zero page margins)
  result = result.replace(/(@page\s*\{[^}]*margin\s*:\s*)0(\s*;?)/i, '$115mm$2');
  // 3. Strip body padding — let @page handle the margins per page
  result = result.replace(/(body\s*\{[^}]*padding\s*:\s*)\d+(mm|pt|px)([^}]*\})/i, '$10$3');
  // 4. Strip page-break-inside: avoid — the export-pdf.ts print override
  //    handles this globally (auto on all elements, avoid only on
  //    .signature-space). Cleaning it from stored HTML prevents the
  //    browser from keeping whole entries together and creating gaps.
  result = result.replace(/page-break-inside\s*:\s*avoid\s*;?/gi, '');
  return result;
}
