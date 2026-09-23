const fs = require('fs');
const path = require('path');
const puppeteer = require('../../backend/node_modules/puppeteer-core');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findBrowserExecutable() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Neither Chrome nor Edge was found at standard locations.');
}

async function generateOgBanner() {
  const executablePath = findBrowserExecutable();
  console.log(`Using browser: ${executablePath}`);

  const htmlPath = path.resolve(__dirname, '../_og-banner-gen.html');
  const outputPath = path.resolve(__dirname, '../public/og-image.png');

  console.log(`Loading: ${htmlPath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });

    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Wait for the custom draw completion flag
    await page.waitForFunction(() => window.__done === true, { timeout: 10000 });

    // Wait a brief moment to ensure font rasterization
    await new Promise((r) => setTimeout(r, 800));

    // Extract the exact 1200x630 canvas as PNG base64
    const dataUrl = await page.evaluate(() => {
      const canvas = document.getElementById('c');
      return canvas ? canvas.toDataURL('image/png') : null;
    });

    if (!dataUrl) {
      throw new Error('Canvas element #c not found or could not be exported.');
    }

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

    const stats = fs.statSync(outputPath);
    console.log(`✓ Successfully generated ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
}

generateOgBanner().catch((err) => {
  console.error('Failed to generate OG banner:', err);
  process.exit(1);
});
