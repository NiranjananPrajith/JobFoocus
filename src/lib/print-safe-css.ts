// Print-safe CSS compatibility guide for the AI.
//
// The user can save documents to PDF via the browser's "Save as PDF" print
// dialog (we don't have a server-side renderer on Vercel Hobby). The AI
// therefore must produce HTML/CSS that Chrome/Edge print engines handle well.
//
// This string is appended to every resume/cover-letter generation prompt
// and to every NL edit prompt so the AI never produces layouts that break
// in browser print.

export const PRINT_SAFE_CSS_GUIDE = `
PRINT-SAFE CSS COMPATIBILITY GUIDE (REQUIRED — your output is rendered to PDF
via the browser's print engine, so follow these rules exactly):

PAGE SETUP
- @page { size: A4; margin: 0; } — do NOT set a margin on @page; instead bake
  print margins into the body padding (so the dialog's margin setting matters
  less). A safe body padding is 15mm on all sides.
- Wrap the entire body in a single <div> (e.g. <div class="page">) so the
  page layout is self-contained.

ALLOWED CSS
- Single <style> block in <head>, or inline styles. No <link rel="stylesheet">.
- Flexbox and simple CSS grid for multi-column layouts (e.g. sidebar + main).
- Standard typography: font-family (web-safe: Helvetica, Arial, Georgia, Times,
  "Inter"), font-size (in pt or px), font-weight, color, background-color,
  text-align, line-height, margin, padding, border, border-radius,
  box-shadow, opacity.
- All elements that have a background color MUST also have
  style="print-color-adjust: exact; -webkit-print-color-adjust: exact;"
  so colored backgrounds render in the browser's "Save as PDF" output even
  when the user's "Background graphics" toggle is off.
- Use page-break-inside: avoid on blocks that must not split (job entries,
  signature block, sidebar sections).
- @media print may be used to refine styles for print.

FORBIDDEN (will break in browser print)
- <script> tags. No JavaScript of any kind.
- position: fixed or position: sticky. These repeat on every printed page.
- CSS multi-column layout: do NOT use column-count, column-gap, column-fill,
  columns. Use flex/grid instead.
- Viewport units: vh, vw, vmin, vmax, svh, dvh. Use mm, pt, px, or %.
- CSS transforms used for layout (transform: translate/rotate to position
  content). Decorative transforms on a single element are fine.
- @import, url() in CSS, external resources.
- @font-face that loads a file (data: URIs are fine for one-off icons).
- position: absolute for major layout sections (use flex/grid).
- CSS animations, transitions (print is a static snapshot).

SIZING
- Content width is 210mm minus body padding (so 180mm at 15mm padding).
- A4 page height is 297mm. Plan for ~267mm of vertical content per page
  (297mm - 30mm body padding). Add page-break-inside: avoid to large blocks.

TABLES
- For data tables, use <table> with width: 100%, table-layout: fixed.
- For two-column resumes (e.g. left sidebar, right main), use a flex
  container: <div style="display: flex; gap: 16px;">
    <div style="width: 70mm; flex-shrink: 0;">…sidebar…</div>
    <div style="flex: 1; min-width: 0;">…main…</div>
  </div>

OUTPUT
- Return a complete <!DOCTYPE html><html><head>…</head><body>…</body></html>
  document. Do not omit the structure.
`;
