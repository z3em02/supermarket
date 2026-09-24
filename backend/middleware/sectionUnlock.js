const jwt = require('jsonwebtoken');
const { SECTION_UNLOCK_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');

const SECTION_UNLOCK_SCOPE = 'section-unlock';
const SECTION_UNLOCK_TTL = '8h';

let cachedPasscodeHash = undefined;
let cacheExpiry = 0;

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
  cacheExpiry = now + 60 * 1000;
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
    // #50 fix: use 60s cached passcode status instead of hitting DB on every single request
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
    if (decoded.scope !== SECTION_UNLOCK_SCOPE || decoded.adminId !== req.admin?.id) {
      throw new Error('Invalid section-unlock token');
    }

    next();
  } catch (err) {
    res.status(403).json({ error: 'Section unlock required', code: 'SECTION_LOCKED' });
  }
};

const issueSectionUnlockToken = (adminId) =>
  jwt.sign({ adminId, scope: SECTION_UNLOCK_SCOPE }, SECTION_UNLOCK_SECRET, { expiresIn: SECTION_UNLOCK_TTL });

module.exports = { sectionUnlockMiddleware, issueSectionUnlockToken, invalidateSectionPasscodeCache };
