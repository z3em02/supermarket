// SSRF guard: decide whether a hostname refers to a private, loopback,
// link-local, or cloud-metadata address. Extracted from googleScraper.js so
// the settings/logo/image-proxy code can validate admin-supplied URLs without
// pulling in the Puppeteer scraper module. googleScraper re-exports these.

// Given the four octets of an IPv4 address as numbers, is it private/reserved?
// Reusable both for a plain IPv4 host and for an IPv4 address embedded in an
// IPv4-mapped/compatible IPv6 literal.
function isPrivateIPv4Parts(parts) {
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true; // malformed -> treat as unsafe
  if (parts[0] === 127) return true; // 127.0.0.0/8
  if (parts[0] === 10) return true;  // 10.0.0.0/8
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
  if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
  if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (incl. cloud metadata 169.254.169.254)
  if (parts[0] === 0) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
}

// Expands a (possibly "::"-compressed, possibly IPv4-tailed) IPv6 literal
// into 8 16-bit groups, or null if it doesn't parse as valid IPv6. Used to
// do real CIDR-range math instead of literal string-prefix matching, which
// misses most of a range (e.g. "fc00:" alone misses fc01::–fdff::).
function expandIPv6(address) {
  try {
    let addr = address;
    const v4Tail = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (v4Tail) {
      const v4parts = v4Tail[1].split('.').map(Number);
      if (v4parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
      const hex1 = ((v4parts[0] << 8) | v4parts[1]).toString(16);
      const hex2 = ((v4parts[2] << 8) | v4parts[3]).toString(16);
      addr = addr.slice(0, addr.length - v4Tail[1].length) + hex1 + ':' + hex2;
    }

    const halves = addr.split('::');
    if (halves.length > 2) return null;

    const head = halves[0] ? halves[0].split(':').filter(Boolean) : [];
    const tail = halves.length === 2 && halves[1] ? halves[1].split(':').filter(Boolean) : [];
    let groups;
    if (halves.length === 2) {
      const missing = 8 - head.length - tail.length;
      if (missing < 0) return null;
      groups = [...head, ...Array(missing).fill('0'), ...tail];
    } else {
      groups = head;
    }
    if (groups.length !== 8) return null;

    const parsed = groups.map((g) => parseInt(g, 16));
    if (parsed.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Finding 3.2 (+ IPv6 CIDR fix): Check if a hostname resolves or refers to
 * private, loopback, link-local, or cloud-metadata addresses.
 */
function isPrivateOrLocalHost(hostname) {
  const host = (hostname || '').toLowerCase().trim().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1'
  ) {
    return true;
  }

  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return isPrivateIPv4Parts(host.split('.').map(Number));
  }

  // IPv6 (also covers IPv4-mapped/compatible literals like ::ffff:169.254.169.254
  // or ::ffff:a9fe:a9fe, and the full fc00::/7 and fe80::/10 CIDR ranges rather
  // than just their literal string prefixes)
  if (host.includes(':')) {
    const dottedTail = host.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (dottedTail && isPrivateIPv4Parts(dottedTail[1].split('.').map(Number))) return true;

    const groups = expandIPv6(host);
    if (!groups) return true; // couldn't confidently parse — fail closed, block it

    const first = groups[0];
    if (first === 0 && groups.slice(0, 7).every((g) => g === 0)) return true; // :: or ::1 or ::x (loopback/unspecified range)
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 (unique local)
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 (link-local)

    // IPv4-mapped ::ffff:0:0/96 in hex-group form
    if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0xffff) {
      const v4 = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff];
      if (isPrivateIPv4Parts(v4)) return true;
    }
  }
  return false;
}

module.exports = { isPrivateOrLocalHost, isPrivateIPv4Parts, expandIPv6 };
