const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SECTION_UNLOCK_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');

const SECTION_UNLOCK_SCOPE = 'section-unlock';
const SECTION_UNLOCK_TTL = '8h';
// Short, because invalidateSectionPasscodeCache() only reaches the PM2 worker
// that handled the PIN change — every other worker picks it up on expiry.
const PASSCODE_CACHE_MS = 5 * 1000;

let cachedPasscodeHash = undefined;
let cacheExpiry = 0;

// Ties an unlock token to the PIN it was issued for: changing the PIN changes
// the stored hash, so every token issued for the old one stops working. (A
// SHA-256 prefix of the bcrypt hash — no use for guessing the PIN.)
const passcodeVersion = (passcodeHash) =>
  crypto.createHash('sha256').update(String(passcodeHash)).digest('hex').slice(0, 16);

const getSectionPasscodeHash = async () => {
  const now = Date.now();
  if (cachedPasscodeHash !== undefined && now < cacheExpiry) {
    return cachedPasscodeHash;
  }
  const settings = await prisma.storeSettings.findUnique({
    where: { id: 'default' },
    select: { sectionPasscodeHash: true }
  });
  cachedPasscodeHash = settings?.sectionPasscodeHash || null;
  cacheExpiry = now + PASSCODE_CACHE_MS;
  return cachedPasscodeHash;
};

const invalidateSectionPasscodeCache = () => {
  cachedPasscodeHash = undefined;
  cacheExpiry = 0;
};

// Real API-level enforcement of the Settings/Buchhaltung/Kunden/Aktionen PIN
// gate (see SectionPasscodeGate.jsx) — previously the PIN only gated whether
// the admin *page* rendered, while the underlying APIs were reachable with
// just the regular admin JWT. Must run after authMiddleware (needs req.admin).
const sectionUnlockMiddleware = async (req, res, next) => {
  try {
    // #50 fix: use the 5 s cached passcode status (PASSCODE_CACHE_MS) instead of hitting DB on every single request
    const passcodeHash = await getSectionPasscodeHash();

    // No PIN configured at all — nothing to enforce, matches the gate's own
    // behavior of skipping straight to content when isSet is false.
    if (!passcodeHash) return next();

    const token = req.headers['x-section-unlock'];
    if (!token) {
      return res.status(403).json({ error: 'Section unlock required', code: 'SECTION_LOCKED' });
    }

    // Uses SECTION_UNLOCK_SECRET — a dedicated secret separate from JWT_SECRET
    // so section-unlock tokens cannot be crafted from a leaked admin JWT and
    // admin JWTs cannot be confused for section-unlock tokens.
    const decoded = jwt.verify(token, SECTION_UNLOCK_SECRET);
    if (
      decoded.scope !== SECTION_UNLOCK_SCOPE ||
      decoded.adminId !== req.admin?.id ||
      decoded.pv !== passcodeVersion(passcodeHash)
    ) {
      throw new Error('Invalid section-unlock token');
    }

    next();
  } catch (err) {
    res.status(403).json({ error: 'Section unlock required', code: 'SECTION_LOCKED' });
  }
};

const issueSectionUnlockToken = (adminId, passcodeHash) =>
  jwt.sign(
    { adminId, scope: SECTION_UNLOCK_SCOPE, pv: passcodeVersion(passcodeHash) },
    SECTION_UNLOCK_SECRET,
    { expiresIn: SECTION_UNLOCK_TTL }
  );

module.exports = { sectionUnlockMiddleware, issueSectionUnlockToken, invalidateSectionPasscodeCache };
