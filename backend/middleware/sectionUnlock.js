const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');

const SECTION_UNLOCK_SCOPE = 'section-unlock';
const SECTION_UNLOCK_TTL = '8h';

// Real API-level enforcement of the Settings/Buchhaltung/Kunden/Aktionen PIN
// gate (see SectionPasscodeGate.jsx) — previously the PIN only gated whether
// the admin *page* rendered, while the underlying APIs were reachable with
// just the regular admin JWT. Must run after authMiddleware (needs req.admin).
const sectionUnlockMiddleware = async (req, res, next) => {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { sectionPasscodeHash: true }
    });

    // No PIN configured at all — nothing to enforce, matches the gate's own
    // behavior of skipping straight to content when isSet is false.
    if (!settings?.sectionPasscodeHash) return next();

    const token = req.headers['x-section-unlock'];
    if (!token) {
      return res.status(403).json({ error: 'Section unlock required', code: 'SECTION_LOCKED' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.scope !== SECTION_UNLOCK_SCOPE || decoded.adminId !== req.admin?.id) {
      throw new Error('Invalid section-unlock token');
    }

    next();
  } catch (err) {
    res.status(403).json({ error: 'Section unlock required', code: 'SECTION_LOCKED' });
  }
};

const issueSectionUnlockToken = (adminId) =>
  jwt.sign({ adminId, scope: SECTION_UNLOCK_SCOPE }, JWT_SECRET, { expiresIn: SECTION_UNLOCK_TTL });

module.exports = { sectionUnlockMiddleware, issueSectionUnlockToken };
