// scripts/build-extension.mjs
//
// Packages the browser extension in `extension/` into a distributable zip
// for both GitHub-release-style distribution and the dashboard's
// /extension-install page download button.
//
// Outputs (under public/extensions/build/ so Next.js serves them at /extensions/build/*):
//   - jobfoocus-extension-v{version}.zip  (versioned, immutable)
//   - jobfoocus-extension.zip             (always points at the latest build)
//
// Run with: `npm run build:extension`

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(__filename));
const EXT_DIR = join(ROOT, 'extension');
const OUT_DIR = join(ROOT, 'public', 'extensions', 'build');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(p) {
  return p.split(sep).join(posix.sep);
}

async function readManifest() {
  const raw = await readFile(join(EXT_DIR, 'manifest.json'), 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.version) {
    throw new Error('extension/manifest.json is missing a "version" field');
  }
  return parsed;
}

async function main() {
  if (!(await exists(EXT_DIR))) {
    throw new Error(`Extension directory not found at ${EXT_DIR}`);
  }

  const manifest = await readManifest();
  const files = (await walk(EXT_DIR)).sort();

  // Skip the build output if someone runs the script inside the extension dir itself
  const sources = files.filter((f) => !f.includes(`${sep}build${sep}`));

  const zip = new JSZip();
  for (const abs of sources) {
    const rel = toPosix(relative(EXT_DIR, abs));
    const data = await readFile(abs);
    zip.file(rel, data);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const versionedName = `jobfoocus-extension-v${manifest.version}.zip`;
  const latestName = 'jobfoocus-extension.zip';

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const versionedPath = join(OUT_DIR, versionedName);
  const latestPath = join(OUT_DIR, latestName);

  await writeFile(versionedPath, buffer);
  await writeFile(latestPath, buffer);

  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.log(`✓ Built extension v${manifest.version}`);
  console.log(`  - public/extensions/build/${versionedName}  (${sizeKb} KB)`);
  console.log(`  - public/extensions/build/${latestName}  (${sizeKb} KB)`);
  console.log(`  Files included: ${sources.length}`);
  for (const f of sources) {
    console.log(`    - ${toPosix(relative(EXT_DIR, f))}`);
  }
}

main().catch((err) => {
  console.error('✗ build:extension failed:', err.message);
  process.exit(1);
});
