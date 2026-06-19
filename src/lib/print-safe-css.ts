// ATS-compliant resume guide and print-safe cover letter guide for the AI.
//
// Resumes MUST be ATS-compliant: single-column, standard semantic HTML,
// no sidebars, no flex layout. Applicant Tracking Systems parse resumes
// top-to-bottom; non-standard layouts scramble the text order and lose
// content. Colors and decorative styling are fine — ATS parsers read
// the DOM structure, not CSS.
//
// Cover letters are read by humans, not ATS, but must still print cleanly:
// single-column, no sidebars.

export const ATS_RESUME_GUIDE = `
ATS-COMPLIANT RESUME RULES (REQUIRED — your output is parsed by Applicant
Tracking Systems AND printed to PDF via the browser's print engine):

LAYOUT
- Single-column ONLY. NO sidebars, NO two-column layouts, NO flexbox for
  layout, NO CSS multi-column, NO tables for layout.
- Content flows top-to-bottom in natural reading order.
- Use normal document flow (block elements stacking vertically).

STYLING
- Colors are allowed for visual appeal — colored text, colored backgrounds,
  colored borders, and accent colors are all fine.
- Text must remain readable: use dark text on light backgrounds (or vice
  versa). Avoid low-contrast combinations (e.g., light gray on white).
- Accent colors work well on: section headers (h2), the candidate name (h1),
  horizontal rules, or subtle background highlights on job entries.
- Standard web-safe fonts only: Helvetica, Arial, Georgia, or Times New Roman.
- Bold/italic for emphasis on job titles and company names only.
- Left-aligned text. NO text-align: justify. NO center alignment (except
  the candidate name at the top if desired).

SEMANTIC HTML (critical for ATS parsing)
- <h1> for the candidate name (top of document)
- <h2> for section headers (Professional Summary, Skills, Experience,
  Education, Certifications)
- <p> for paragraphs, summary, company lines, job titles
- <ul><li> for bullet lists (skills, achievements)
- Do NOT use <div> for text that should be a paragraph or heading.

PAGE SETUP
- @page { size: A4; margin: 15mm; } — margin on @page, NOT body padding.
- body { margin: 0; padding: 0; } — let @page handle per-page margins.
- page-break-inside: avoid on job entries and education entries.

ALLOWED CSS
- Single <style> block in <head>. No <link rel="stylesheet">.
- Standard typography: font-family, font-size (in pt or px), font-weight,
  font-style, color, text-align, line-height, margin, padding.
- page-break-inside: avoid on blocks that must not split.

FORBIDDEN (will break ATS parsing or browser print)
- <script> tags. No JavaScript.
- position: fixed/sticky/absolute for layout.
- flexbox for layout (flex reorders DOM, confusing ATS parsers).
- CSS multi-column: column-count, column-gap, columns.
- Viewport units: vh, vw, vmin, vmax.
- @font-face, external resources, @import.
- CSS transforms for layout.
- display: none, visibility: hidden (hides content from ATS).
- Tables for layout (only for actual tabular data).
- CSS animations, transitions (print is a static snapshot).
- Background images.

SIZING
- Body text: 10-11pt. Name (h1): 16-18pt. Section headers (h2): 12-13pt.
- Line-height: 1.4-1.5.
- Content width: 210mm minus 30mm @page margin = 180mm.

OUTPUT
- Return a complete <!DOCTYPE html><html><head>…</head><body>…</body></html>
  document. Do not omit the structure.
`;

export const COVER_LETTER_PRINT_GUIDE = `
PRINT-SAFE COVER LETTER RULES (REQUIRED — your output is printed to PDF
via the browser's print engine):

LAYOUT
- Single-column flow. NO sidebars, NO two-column layouts.
- Content flows top-to-bottom.

STYLING
- Colors are allowed for visual appeal — colored text, colored backgrounds,
  and colored borders are all fine.
- Text must remain readable: use dark text on light backgrounds (or vice
  versa). Avoid low-contrast combinations.
- Standard web-safe fonts: Helvetica, Arial, Georgia, or Times New Roman.
- Bold for emphasis on sender name and subject line only.

PAGE SETUP
- @page { size: A4; margin: 15mm; } — margin on @page, NOT body padding.
- body { margin: 0; padding: 0; } — let @page handle per-page margins.
- page-break-inside: avoid on the signature block.

ALLOWED CSS
- Single <style> block in <head>. No <link rel="stylesheet">.
- Standard typography: font-family, font-size, font-weight, text-align,
  line-height, margin, padding.
- text-align: justify is allowed for paragraph body text.

FORBIDDEN
- <script> tags. No JavaScript.
- position: fixed/sticky/absolute for layout.
- flexbox or CSS multi-column for layout.
- Viewport units (vh, vw).
- @font-face, external resources.
- Tables for layout.

OUTPUT
- Return a complete <!DOCTYPE html><html><head>…</head><body>…</body></html>
  document.
`;
