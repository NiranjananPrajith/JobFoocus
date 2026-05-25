const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');

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
        fs.writeFileSync(scriptFilePath, scriptContent, 'utf-8');
        $(element).attr('src', `./${scriptFileName}`);
        $(element).html('');
      }
    });

    let outputHtml = $.html();

    // Fix Asset Paths
    outputHtml = outputHtml.replace(/href="\/_next\//g, 'href="./_next/');
    outputHtml = outputHtml.replace(/src="\/_next\//g, 'src="./_next/');
    outputHtml = outputHtml.replace(/href="\/_next/g, 'href="./_next');
    outputHtml = outputHtml.replace(/src="\/_next/g, 'src="./_next');

    // Fix Next.js routing paths
    outputHtml = outputHtml.replace(/href="\/"/g, 'href="./index.html"');
    outputHtml = outputHtml.replace(/href="\/([a-zA-Z0-9_-]+)(?!\.)(?!\/)"/g, 'href="./$1/index.html"');
    outputHtml = outputHtml.replace(/href="\/([a-zA-Z0-9_-]+)\/"/g, 'href="./$1/index.html"');

    await fs.writeFile(htmlFile, outputHtml, 'utf-8');
    console.log(`Processed: ${path.relative(distDir, htmlFile)}`);
  }

  if (await fs.pathExists(extensionSourceDir)) await fs.copy(extensionSourceDir, distDir);
  const scriptsDir = path.join(__dirname, '../extension/scripts');
  if (await fs.pathExists(scriptsDir)) await fs.copy(scriptsDir, path.join(distDir, 'scripts'));

  console.log('Build completed successfully.');
}

buildExtension().catch(console.error);