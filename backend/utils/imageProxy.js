const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isPrivateOrLocalHost } = require('./googleScraper');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_CONTENT_TYPES = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/gif', '.gif'],
  ['image/svg+xml', '.svg'],
  ['image/webp', '.webp'],
  ['image/x-icon', '.ico'],
  ['image/vnd.microsoft.icon', '.ico'],
]);

/**
 * Validates magic bytes / signatures and inspects SVGs for embedded scripts.
 */
function validateImageBuffer(buffer, contentType) {
  if (contentType === 'image/png') {
    if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      throw new Error('Corrupt or invalid PNG image');
    }
  } else if (contentType === 'image/jpeg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      throw new Error('Corrupt or invalid JPEG image');
    }
  } else if (contentType === 'image/gif') {
    const header = buffer.slice(0, 4).toString('ascii');
    if (header !== 'GIF8') {
      throw new Error('Corrupt or invalid GIF image');
    }
  } else if (contentType === 'image/webp') {
    if (buffer.length < 12 || buffer.slice(0, 4).toString('ascii') !== 'RIFF' || buffer.slice(8, 12).toString('ascii') !== 'WEBP') {
      throw new Error('Corrupt or invalid WebP image');
    }
  } else if (contentType === 'image/svg+xml') {
    const text = buffer.toString('utf8').toLowerCase();
    if (!text.includes('<svg')) {
      throw new Error('Corrupt or invalid SVG image');
    }
    // Block scripts and dangerous handlers in SVG to prevent stored XSS
    if (
      text.includes('<script') ||
      text.includes('javascript:') ||
      text.includes('vbscript:') ||
      text.includes('onload=') ||
      text.includes('onerror=') ||
      text.includes('onclick=') ||
      text.includes('onmouseover=') ||
      text.includes('<foreignobject')
    ) {
      throw new Error('SVG contains executable scripts or event handlers, which are forbidden for security');
    }
  }
}

/**
 * Downloads an external image URL, validates it (content-type, size, host, magic bytes),
 * saves it to backend/uploads/, and returns the local /api/uploads path that can be stored
 * in the DB and served via the /api/uploads static route.
 *
 * Returns the local URL string (e.g. "/api/uploads/logo-abc123.png") on success.
 * Throws on any validation or download failure.
 */
async function downloadAndCacheLogo(externalUrl) {
  // Re-validate the host — defense-in-depth (caller should have already checked)
  const parsed = new URL(externalUrl);
  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('Logo URL must not point to a private or internal host');
  }

  // Fetch with a short timeout and redirect limit
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(externalUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'SupermarketApp/1.0 LogoFetcher',
        'Accept': 'image/*',
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to download logo: HTTP ${response.status}`);
  }

  // Validate content-type
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = ALLOWED_CONTENT_TYPES.get(contentType);
  if (!ext) {
    throw new Error(`Invalid logo content type: ${contentType}. Must be a common image format (PNG, JPEG, GIF, SVG, WebP, ICO).`);
  }

  // Read the body with a size limit
  const buffer = Buffer.from(await response.arrayBuffer());
  const totalSize = buffer.length;

  if (totalSize > MAX_LOGO_SIZE) {
    throw new Error(`Logo image is too large (${(totalSize / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_LOGO_SIZE / 1024 / 1024} MB.`);
  }

  if (totalSize === 0) {
    throw new Error('Downloaded logo is empty (0 bytes)');
  }

  // Verify image integrity / structure
  validateImageBuffer(buffer, contentType);

  // Verify the final URL (after redirects) isn't internal
  const finalUrl = response.url;
  if (finalUrl && finalUrl !== externalUrl) {
    try {
      const finalParsed = new URL(finalUrl);
      if (isPrivateOrLocalHost(finalParsed.hostname)) {
        throw new Error('Logo URL redirected to a private or internal host');
      }
    } catch (e) {
      if (e.message.includes('private') || e.message.includes('internal')) throw e;
      throw new Error('Logo URL redirected to an unparseable destination');
    }
  }

  // Generate a stable filename based on a hash of the content
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const filename = `logo-${hash}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  const localUrl = `/api/uploads/${filename}`;

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Write atomically: write to temp then rename
  const tmpPath = filepath + '.tmp';
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, filepath);

  // Clean up old logo files (keep the new one + any non-logo files)
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const f of files) {
      if (f.startsWith('logo-') && f !== filename && f !== '.gitkeep') {
        fs.unlinkSync(path.join(UPLOADS_DIR, f));
      }
    }
  } catch {
    // Best-effort cleanup — don't fail the request over it
  }

  return localUrl;
}

/**
 * Removes cached logo file if a local /api/uploads/ or /uploads/ path is provided.
 */
function deleteCachedLogo(localUrl) {
  if (!localUrl || typeof localUrl !== 'string') return;
  const match = localUrl.match(/\/?(?:api\/)?uploads\/(logo-[\w-]+(?:\.[a-z0-9]+)?)$/i);
  if (!match) return;
  const filename = match[1];
  try {
    const filepath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch {
    // Best effort
  }
}

module.exports = { downloadAndCacheLogo, deleteCachedLogo, validateImageBuffer, UPLOADS_DIR };
