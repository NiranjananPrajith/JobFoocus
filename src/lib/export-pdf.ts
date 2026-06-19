// Browser-based "Save as PDF" export.
//
// On Vercel Hobby we can't bundle a server-side Chromium (it's too large
// for the 50MB serverless function limit). Instead, we open a clean
// print window containing ONLY the document HTML (no app chrome) and let
// the user pick "Save as PDF" in the browser's print dialog.
//
// The function is structured as a single swappable call so that when we
// move to Vercel Pro (or a paid external rendering API), we can replace
// the body of this function with a fetch('/api/documents/export-pdf', …)
// call without changing any callers.

export interface ExportPdfArgs {
  html: string;
  filename: string;
}

export async function exportDocumentPdf({ html, filename }: ExportPdfArgs): Promise<void> {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    throw new Error('Pop-up blocked. Please allow pop-ups for this site to export PDFs.');
  }

  // Normalize legacy @page letter → A4 for consistent print output.
  const normalized = html.replace(/@page\s*\{\s*size\s*:\s*letter\s*;?/i, '@page { size: A4;');

  // Write the document HTML into the print window. We intentionally do
  // NOT inherit the parent document's styles — the print window is a
  // blank canvas so the PDF is clean (no app nav/footer/toolbar).
  printWindow.document.open();
  printWindow.document.write(normalized);
  printWindow.document.close();

  // Inject a style that forces per-page A4 margins via @page (applied by
  // the browser's print engine to EVERY page, not just the first/last) and
  // removes the body's own padding so it doesn't double the margin.
  // @page { margin: 15mm } is the single source of truth for print margins.
  // Headers and footers are disabled automatically (no @page margin area
  // for the browser to render them in).
  const fixStyle = printWindow.document.createElement('style');
  fixStyle.textContent =
    '@page { size: A4; margin: 15mm; } html, body { margin: 0 !important; padding: 0 !important; }';
  printWindow.document.head?.appendChild(fixStyle);

  // Set the document title so the browser pre-fills the "Save as PDF"
  // filename. Some browsers honor it; some don't — but it's the best we
  // can do without a custom filename prompt.
  printWindow.document.title = filename;

  // Wait for the document to fully load (images, web fonts) before opening
  // the print dialog. We poll for readyState and add a small buffer.
  await new Promise<void>((resolve) => {
    const checkReady = () => {
      if (printWindow.document.readyState === 'complete') {
        // Give the layout engine a tick to settle.
        setTimeout(resolve, 200);
      } else {
        setTimeout(checkReady, 50);
      }
    };
    checkReady();
  });

  printWindow.focus();
  printWindow.print();
}
