// Ambient declaration for Next.js `?url` import suffix.
// See: https://nextjs.org/docs/app/api-reference/next/import-suffixes
//
// Usage:
//   import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
//   // workerUrl: string — a stable URL to the bundled asset

declare module '*?url' {
  const url: string;
  export default url;
}
