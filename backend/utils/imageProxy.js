const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns');
const http = require('http');
const https = require('https');
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

// Custom `lookup` for http(s).request: resolves the hostname ourselves and
// rejects the connection outright if any candidate address is private/
// internal/loopback/link-local. A plain hostname-string check (like the one
// above) only guards the *label* — the actual TCP connection still does its
// own independent DNS lookup at connect time, so a hostname whose DNS record
// changes between the check and the connection (DNS rebinding) sails
// straight through a string-only guard. Passing this as `lookup` means our
// validation happens inside the exact function that decides which IP gets
// connected to, closing that gap rather than racing it.
const pinnedLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses || addresses.length === 0) {
      return callback(new Error(`DNS resolution for "${hostname}" returned no addresses`));
    }
    for (const { address } of addresses) {
      if (isPrivateOrLocalHost(address)) {
        return callback(new Error(`Resolved address ${address} for "${hostname}" is a private/internal host`));
      }
    }
    // Node's net module can call a custom `lookup` in two different shapes
    // depending on internal Happy-Eyeballs behavior: `options.all` requests
    // the full address array back, otherwise it wants a single
    // (address, family) pair. Match whichever shape was actually requested —
    // returning the wrong shape corrupts net's internal connect logic.
    if (options && options.all) {
      return callback(null, addresses);
    }
    const chosen = addresses[0];
    callback(null, chosen.address, chosen.family);
  });
};

// Fetches a single URL with the DNS-pinned lookup above. Does not follow
// redirects itself — the caller loops so every hop gets its own hostname
// check and its own pinned DNS resolution (a redirect target must not be
// trusted just because the original URL passed validation).
function requestOnce(urlString, { timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlString);
    } catch {
      return reject(new Error('Invalid URL'));
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Only http/https URLs are allowed'));
    }
    if (isPrivateOrLocalHost(parsed.hostname)) {
      return reject(new Error('Logo URL must not point to a private or internal host'));
    }

    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(parsed, {
      method: 'GET',
      lookup: pinnedLookup,
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'SupermarketApp/1.0 LogoFetcher',
        'Accept': 'image/*',
      },
    }, (res) => {
      const chunks = [];
      let total = 0;
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy(new Error(`Logo image is too large. Maximum is ${maxBytes / 1024 / 1024} MB.`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) });
      });
      res.on('error', reject);
    });

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function fetchWithPinnedDns(urlString, { timeoutMs = 10000, maxRedirects = 5, maxBytes = MAX_LOGO_SIZE } = {}) {
  let currentUrl = urlString;
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await requestOnce(currentUrl, { timeoutMs, maxBytes });
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      currentUrl = new URL(res.headers.location, currentUrl).toString();
      continue;
    }
    return { ...res, finalUrl: currentUrl };
  }
  throw new Error('Too many redirects');
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

  const response = await fetchWithPinnedDns(externalUrl, { timeoutMs: 10000, maxBytes: MAX_LOGO_SIZE });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Failed to download logo: HTTP ${response.statusCode}`);
  }

  // Validate content-type
  const contentType = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const ext = ALLOWED_CONTENT_TYPES.get(contentType);
  if (!ext) {
    throw new Error(`Invalid logo content type: ${contentType}. Must be a common image format (PNG, JPEG, GIF, SVG, WebP, ICO).`);
  }

  const buffer = response.buffer;
  const totalSize = buffer.length;

  if (totalSize > MAX_LOGO_SIZE) {
    throw new Error(`Logo image is too large (${(totalSize / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_LOGO_SIZE / 1024 / 1024} MB.`);
  }

  if (totalSize === 0) {
    throw new Error('Downloaded logo is empty (0 bytes)');
  }

  // Verify image integrity / structure
  validateImageBuffer(buffer, contentType);

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
