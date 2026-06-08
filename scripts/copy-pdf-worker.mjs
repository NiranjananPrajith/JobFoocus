// scripts/copy-pdf-worker.mjs
//
// Copies pdfjs-dist's worker file into public/ so it can be served as a
// stable static asset at /pdf-worker/pdf.worker.mjs.
//
// Why not use Next.js's `?url` import suffix?
//   In Next.js 14 the `?url` suffix can return the worker URL wrapped in
//   an object (`{ default: string }`) in some bundler configurations,
//   which pdfjs-dist v5+ rejects with `Invalid 'workerSrc' type`.
//   A plain static file under public/ sidesteps that entire class of
//   issue — the path is a known, stable string that pdfjs accepts.
//
// Run as a prebuild / predev hook so the file is always present.
//   npm run copy-pdf-worker   (manual)
//   prebuild + predev         (automatic, wired in package.json)

import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(__filename));

const SOURCE = join(
  ROOT,
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.mjs'
);
const DEST_DIR = join(ROOT, 'public', 'pdf-worker');
const DEST = join(DEST_DIR, 'pdf.worker.mjs');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SOURCE))) {
    throw new Error(
      `pdfjs-dist worker not found at ${SOURCE}.\n` +
        `Make sure pdfjs-dist is installed (npm install).`
    );
  }

  await mkdir(DEST_DIR, { recursive: true });
  await copyFile(SOURCE, DEST);

  // Make a .min.mjs copy too, in case pdfjs auto-resolves that variant
  const SOURCE_MIN = join(
    ROOT,
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.min.mjs'
  );
  if (await exists(SOURCE_MIN)) {
    await copyFile(SOURCE_MIN, join(DEST_DIR, 'pdf.worker.min.mjs'));
  }

  console.log(`✓ Copied pdfjs worker → public/pdf-worker/`);
}

main().catch((err) => {
  console.error('✗ copy-pdf-worker failed:', err.message);
  process.exit(1);
});
