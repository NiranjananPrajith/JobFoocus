const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');

// Load environment variables from .env.public and .env.private if they exist
function loadEnv() {
  const baseDir = path.join(__dirname, '..');
  const envFiles = ['.env.public', '.env.private'];

  for (const envFile of envFiles) {
    const envPath = path.join(baseDir, envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            const value = trimmed.substring(eqIndex + 1).trim();
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  }
}

loadEnv();

async function buildExtension() {
  const nextOutDir = path.join(__dirname, '../out');
  const extensionSourceDir = path.join(__dirname, '../extension/public');
  const distDir = path.join(__dirname, '../dist_extension');

  console.log('Building JobHuntGuru extension...');
  await fs.emptyDir(distDir);

  if (await fs.pathExists(nextOutDir)) {
    await fs.copy(nextOutDir, distDir);
  } else {
    console.error('Next.js output folder not found. Run "npm run build" first.');
    process.exit(1);
  }

  // RECURSIVELY FIND ALL HTML FILES
  const htmlFiles = [];
  const findHtmlFiles = async (dir) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await findHtmlFiles(fullPath);
      } else if (item.isFile() && item.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  };
  await findHtmlFiles(distDir);

  for (const htmlFile of htmlFiles) {
    const fileDir = path.dirname(htmlFile);
    const fileBaseName = path.basename(htmlFile, '.html') || 'index';
    let fileContent = await fs.readFile(htmlFile, 'utf-8');

    const $ = cheerio.load(fileContent);

    // Extract inline scripts
  $('script:not([src])').each((index, element) => {
    const scriptContent = $(element).html();
    if (scriptContent && scriptContent.trim().length > 0) {
      const scriptFileName = `${fileBaseName}_inline_${index}.js`;
      const scriptFilePath = path.join(fileDir, scriptFileName);
      // Fix absolute paths in inline RSC payloads
      let fixedContent = scriptContent.replace(/\/_next\//g, './_next/');
      // For subdirectory pages, adjust relative paths
      const relPath = path.relative(distDir, fileDir);
      if (relPath !== '') {
        fixedContent = fixedContent.replace(/\.\/_next\//g, '../_next/');
      }
      fs.writeFileSync(scriptFilePath, fixedContent, 'utf-8');
      $(element).attr('src', `./${scriptFileName}`);
      $(element).html('');
    }
  });

    let outputHtml = $.html();

    // Fix Asset Paths - convert absolute /_next/ paths to relative ./ paths
    outputHtml = outputHtml.replace(/href="\/_next\//g, 'href="./_next/');
    outputHtml = outputHtml.replace(/src="\/_next\//g, 'src="./_next/');
    outputHtml = outputHtml.replace(/href="\/_next/g, 'href="./_next');
    outputHtml = outputHtml.replace(/src="\/_next/g, 'src="./_next');

    // For subdirectory pages (popup, sidepanel, etc.), paths like ./_next/ resolve relative to the page
    // We need to use ../_next/ so the browser looks up one directory to find _next at root
    const relPath = path.relative(distDir, fileDir);
    if (relPath !== '') {
      outputHtml = outputHtml.replace(/href="\.\/_next\//g, 'href="../_next/');
      outputHtml = outputHtml.replace(/src="\.\/_next\//g, 'src="../_next/');
    }

    // Fix Next.js routing paths
    outputHtml = outputHtml.replace(/href="\/"/g, 'href="./index.html"');
    outputHtml = outputHtml.replace(/href="\/([a-zA-Z0-9_-]+)(?!\.)(?!\/)"/g, 'href="./$1/index.html"');
    outputHtml = outputHtml.replace(/href="\/([a-zA-Z0-9_-]+)\/"/g, 'href="./$1/index.html"');

    await fs.writeFile(htmlFile, outputHtml, 'utf-8');
    console.log(`Processed: ${path.relative(distDir, htmlFile)}`);
  }

  // Substitute OAuth client IDs in compiled extension files
  const clientIdReplacements = [
    {
      pattern: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      envKey: 'GOOGLE_CLIENT_ID',
    },
    {
      pattern: 'YOUR_ONEDRIVE_CLIENT_ID',
      envKey: 'ONEDRIVE_CLIENT_ID',
    },
    {
      pattern: 'YOUR_DROPBOX_CLIENT_ID',
      envKey: 'DROPBOX_CLIENT_ID',
    },
  ];

  for (const { pattern, envKey } of clientIdReplacements) {
    const replacement = process.env[envKey] || pattern;
    // Replace in all JS files in dist_extension (compiled by Next.js)
    const replaceInDir = async (dir) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          await replaceInDir(fullPath);
        } else if (item.isFile() && item.name.endsWith('.js')) {
          let content = await fs.readFile(fullPath, 'utf-8');
          if (content.includes(pattern)) {
            content = content.replace(new RegExp(pattern, 'g'), replacement);
            await fs.writeFile(fullPath, content, 'utf-8');
          }
        }
      }
    };
    await replaceInDir(distDir);
  }

  // Also replace in extension source files (manifest.json, background.js) BEFORE copying to dist
  for (const { pattern, envKey } of clientIdReplacements) {
    const replacement = process.env[envKey] || pattern;
    const replaceInDir = async (dir) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          await replaceInDir(fullPath);
        } else if (item.isFile() && (item.name.endsWith('.js') || item.name === 'manifest.json')) {
          let content = await fs.readFile(fullPath, 'utf-8');
          if (content.includes(pattern)) {
            content = content.replace(new RegExp(pattern, 'g'), replacement);
            await fs.writeFile(fullPath, content, 'utf-8');
          }
        }
      }
    };
    await replaceInDir(path.join(__dirname, '../extension'));
  }

  if (await fs.pathExists(extensionSourceDir)) await fs.copy(extensionSourceDir, distDir);
  const scriptsDir = path.join(__dirname, '../extension/scripts');
  if (await fs.pathExists(scriptsDir)) await fs.copy(scriptsDir, path.join(distDir, 'scripts'));

  console.log('Build completed successfully.');
}

buildExtension().catch(console.error);