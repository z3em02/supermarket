const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { issueSectionUnlockToken, invalidateSectionPasscodeCache } = require('../middleware/sectionUnlock');
const { logAudit } = require('../lib/auditLog');
const { DEFAULT_SETTINGS } = require('./settingsShared');

// GET /api/settings/passcode-status - Admin only
// Reports whether a section passcode is currently configured, without ever
// exposing the hash itself.
const getPasscodeStatus = async (req, res) => {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { sectionPasscodeHash: true }
    });
    res.json({ isSet: Boolean(settings?.sectionPasscodeHash) });
  } catch (error) {
    console.error('Get passcode status error:', error);
    res.status(500).json({ error: 'Failed to check passcode status' });
  }
};

// PUT /api/settings/passcode - Admin only
// Sets or changes the section passcode. Pass { passcode: null } to remove
// protection entirely.
const setPasscode = async (req, res) => {
  try {
    const { passcode, currentPasscode } = req.body;

    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { sectionPasscodeHash: true }
    });

    // Always require the current passcode to change or remove it, even from
    // an already-unlocked session — a section-unlock token only proves "you
    // could read gated data recently", not "you know the PIN right now", and
    // it lives for hours in sessionStorage where an XSS could read it. Making
    // this step-up auth (re-prove the PIN itself, not just the unlock state)
    // means a stolen unlock token alone can no longer take over the gate.
    if (settings?.sectionPasscodeHash) {
      if (!currentPasscode) {
        return res.status(400).json({ error: 'Aktueller PIN ist erforderlich / Current passcode is required' });
      }
      const matches = await bcrypt.compare(String(currentPasscode).trim(), settings.sectionPasscodeHash);
      if (!matches) {
        return res.status(403).json({ error: 'Aktueller PIN ist falsch / Current passcode is incorrect' });
      }
    }

    if (passcode === null || passcode === '') {
      await prisma.storeSettings.upsert({
        where: { id: 'default' },
        update: { sectionPasscodeHash: null },
        create: { ...DEFAULT_SETTINGS, sectionPasscodeHash: null }
      });
      invalidateSectionPasscodeCache();
      logAudit(req.admin?.email, 'REMOVE_SECTION_PASSCODE', 'Section passcode removed');
      return res.json({ message: 'Passcode removed', isSet: false });
    }

    const clean = String(passcode || '').trim();
    if (!/^\d{4,8}$/.test(clean)) {
      return res.status(400).json({ error: 'Passcode must be 4-8 digits' });
    }

    const hash = await bcrypt.hash(clean, 10);
    await prisma.storeSettings.upsert({
      where: { id: 'default' },
      update: { sectionPasscodeHash: hash },
      create: { ...DEFAULT_SETTINGS, sectionPasscodeHash: hash }
    });
    invalidateSectionPasscodeCache();
    logAudit(req.admin?.email, 'SET_SECTION_PASSCODE', 'Section passcode updated');
    res.json({ message: 'Passcode set', isSet: true, unlockToken: issueSectionUnlockToken(req.admin.id, hash) });
  } catch (error) {
    console.error('Set passcode error:', error);
    res.status(500).json({ error: 'Failed to set passcode' });
  }
};

// POST /api/settings/passcode/verify - Admin only, rate-limited at the route
const verifyPasscode = async (req, res) => {
  try {
    const { passcode } = req.body;
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { sectionPasscodeHash: true }
    });

    if (!settings?.sectionPasscodeHash) {
      return res.json({ valid: true, isSet: false });
    }

    const valid = await bcrypt.compare(String(passcode || ''), settings.sectionPasscodeHash);
    res.json({
      valid,
      isSet: true,
      unlockToken: valid ? issueSectionUnlockToken(req.admin.id, settings.sectionPasscodeHash) : undefined
    });
  } catch (error) {
    console.error('Verify passcode error:', error);
    res.status(500).json({ error: 'Failed to verify passcode' });
  }
};

module.exports = {
  getPasscodeStatus,
  setPasscode,
  verifyPasscode
};
