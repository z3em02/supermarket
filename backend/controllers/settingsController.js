const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../lib/config');
const { scrapeGoogleReviews, isPrivateOrLocalHost } = require('../utils/googleScraper');
const { downloadAndCacheLogo, deleteCachedLogo } = require('../utils/imageProxy');
const { issueSectionUnlockToken, invalidateSectionPasscodeCache } = require('../middleware/sectionUnlock');
const { logAudit } = require('../lib/auditLog');

// String(null) / String(undefined) produce the literal text "null"/"undefined",
// which then reads back as a truthy, non-empty value forever — treat any
// nullish or already-corrupted "null" string as empty instead of stringifying it.
const cleanString = (value) => (value == null || value === 'null' || value === 'undefined') ? '' : String(value).trim();

const DEFAULT_SETTINGS = {
  id: 'default',
  storeName: 'Hajar Supermarkt',
  storeNameDe: 'Hajar Supermarkt',
  storeNameAr: 'سوبرماركت هاجر',
  logoUrl: '',
  phone: '+49 123 4567890',
  email: 'info@hajar-supermarkt.de',
  address: 'Musterstraße 123, 10115 Berlin',
  mapUrl: 'https://maps.google.com',
  mapEmbedUrl: '',
  googleReviewsUrl: '',
  googleRating: 5.0,
  googleReviewCount: 0,
  googlePlaceId: '',
  googleApiKey: '',
  showGoogleReviews: true,
  minOrderValue: 0,
  deliveryFee: 2.0,
  deliveryFeePerKm: 0.10,
  freeDeliveryThreshold: 0,
  storeLatitude: 48.1746605,
  storeLongitude: 16.3272662,
  maxDeliveryDistanceKm: 0,
  allowedPostalCodes: '',
  legalOwnerName: '',
  gisaNumber: '',
  isKleinunternehmer: true,
  vatId: '',
  businessPurposeDe: 'Groß- und Einzelhandel mit Lebensmitteln und orientalischen Spezialitäten',
  businessPurposeAr: 'تجارة الجملة والتجزئة للمواد الغذائية والمنتجات الاستهلاكية'
};

// Fields safe to expose on the public settings endpoint.
// Excludes googleApiKey, googlePlaceId and trustindexWidgetCode.
const PUBLIC_SETTINGS_SELECT = {
  id: true,
  storeName: true,
  storeNameDe: true,
  storeNameAr: true,
  logoUrl: true,
  phone: true,
  email: true,
  address: true,
  mapUrl: true,
  mapEmbedUrl: true,
  googleReviewsUrl: true,
  googleRating: true,
  googleReviewCount: true,
  showGoogleReviews: true,
  minOrderValue: true,
  deliveryFee: true,
  deliveryFeePerKm: true,
  freeDeliveryThreshold: true,
  storeLatitude: true,
  storeLongitude: true,
  maxDeliveryDistanceKm: true,
  allowedPostalCodes: true,
  legalOwnerName: true,
  gisaNumber: true,
  isKleinunternehmer: true,
  vatId: true,
  businessPurposeDe: true,
  businessPurposeAr: true
};

// GET /api/settings - Public
const getSettings = async (req, res) => {
  try {
    let settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: PUBLIC_SETTINGS_SELECT
    });

    if (!settings) {
      const created = await prisma.storeSettings.create({
        data: DEFAULT_SETTINGS
      });
      settings = Object.fromEntries(Object.keys(PUBLIC_SETTINGS_SELECT).map((key) => [key, created[key]]));
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve store settings' });
  }
};

// PUT /api/settings - Protected (Admin only)
const updateSettings = async (req, res) => {
  try {
    const {
      storeName,
      storeNameDe,
      storeNameAr,
      logoUrl,
      phone,
      email,
      address,
      mapUrl,
      mapEmbedUrl,
      googleReviewsUrl,
      googlePlaceId,
      googleApiKey,
      showGoogleReviews,
      minOrderValue,
      deliveryFee,
      deliveryFeePerKm,
      freeDeliveryThreshold,
      storeLatitude,
      storeLongitude,
      maxDeliveryDistanceKm,
      allowedPostalCodes,
      legalOwnerName,
      gisaNumber,
      isKleinunternehmer,
      vatId,
      businessPurposeDe,
      businessPurposeAr
    } = req.body;

    const data = {};

    if (showGoogleReviews !== undefined) {
      data.showGoogleReviews = Boolean(showGoogleReviews);
    }

    if (storeName !== undefined) {
      data.storeName = String(storeName).trim() || 'Hajar Supermarkt';
    }
    if (storeNameDe !== undefined) {
      data.storeNameDe = String(storeNameDe).trim() || data.storeName || 'Hajar Supermarkt';
    } else if (storeName !== undefined) {
      data.storeNameDe = data.storeName;
    }
    if (storeNameAr !== undefined) {
      data.storeNameAr = String(storeNameAr).trim() || 'سوبرماركت هاجر';
    }
    if (logoUrl !== undefined) {
      const cleaned = cleanString(logoUrl);
      // #30 & #33 fix: validate logo URL scheme, block protocol-relative URLs
      if (cleaned) {
        const s = cleaned.toLowerCase();
        if (s.startsWith('javascript:') || s.startsWith('data:') || s.startsWith('vbscript:') || s.startsWith('//')) {
          return res.status(400).json({ error: 'Invalid logo URL scheme' });
        }
        if (!s.startsWith('https://') && !s.startsWith('http://') && !s.startsWith('/')) {
          return res.status(400).json({ error: 'Logo URL must be an HTTP(S) URL or local path' });
        }
        if (s.startsWith('https://') || s.startsWith('http://')) {
          try {
            const parsed = new URL(cleaned);
            if (isPrivateOrLocalHost(parsed.hostname)) {
              return res.status(400).json({ error: 'Logo URL must not point to a private or internal host' });
            }
          } catch { return res.status(400).json({ error: 'Invalid logo URL' }); }

          // Cache external logo locally to prevent visitor beaconing / tracking / remote tampering
          try {
            const localCachedUrl = await downloadAndCacheLogo(cleaned);
            data.logoUrl = localCachedUrl;
          } catch (downloadErr) {
            return res.status(400).json({
              error: `Fehler beim Herunterladen des Logos: ${downloadErr.message}`
            });
          }
        } else {
          data.logoUrl = cleaned;
        }
      } else {
        // Logo was removed — clean up cached file if present
        try {
          const currentSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
          if (currentSettings?.logoUrl) {
            deleteCachedLogo(currentSettings.logoUrl);
          }
        } catch {}
        data.logoUrl = '';
      }
    }
    if (phone !== undefined) {
      data.phone = cleanString(phone);
    }
    if (email !== undefined) {
      data.email = cleanString(email).toLowerCase();
    }
    if (address !== undefined) {
      data.address = cleanString(address);
    }
    if (mapUrl !== undefined) {
      const cleaned = cleanString(mapUrl);
      // Finding 3.1 fix: prevent stored XSS via javascript: or unvalidated URLs
      if (cleaned) {
        const s = cleaned.toLowerCase();
        if (s.startsWith('javascript:') || s.startsWith('data:') || s.startsWith('vbscript:') || s.startsWith('//') || !s.startsWith('https://')) {
          return res.status(400).json({ error: 'mapUrl must be a secure HTTPS URL (starting with https://)' });
        }
      }
      data.mapUrl = cleaned;
    }
    if (mapEmbedUrl !== undefined) {
      const cleaned = cleanString(mapEmbedUrl);
      // #31 fix: only allow legitimate Google Maps embed URLs
      if (cleaned && !cleaned.startsWith('https://www.google.com/maps/embed') && !cleaned.startsWith('https://maps.google.com/maps')) {
        return res.status(400).json({ error: 'Map embed URL must be a valid Google Maps embed URL (starting with https://www.google.com/maps/embed)' });
      }
      data.mapEmbedUrl = cleaned;
    }
    if (googleReviewsUrl !== undefined) {
      const cleaned = cleanString(googleReviewsUrl);
      // Finding 3.1 fix: prevent stored XSS via javascript: or unvalidated URLs
      if (cleaned) {
        const s = cleaned.toLowerCase();
        if (s.startsWith('javascript:') || s.startsWith('data:') || s.startsWith('vbscript:') || s.startsWith('//') || !s.startsWith('https://')) {
          return res.status(400).json({ error: 'googleReviewsUrl must be a secure HTTPS URL (starting with https://)' });
        }
        try {
          const parsed = new URL(cleaned);
          if (isPrivateOrLocalHost(parsed.hostname)) {
            return res.status(400).json({ error: 'googleReviewsUrl must not point to a private or internal host' });
          }
        } catch { return res.status(400).json({ error: 'Invalid googleReviewsUrl' }); }
      }
      data.googleReviewsUrl = cleaned;
    }
    if (googlePlaceId !== undefined) {
      data.googlePlaceId = cleanString(googlePlaceId);
    }
    if (googleApiKey !== undefined) {
      data.googleApiKey = cleanString(googleApiKey);
    }
    if (minOrderValue !== undefined) {
      data.minOrderValue = Math.max(0, Number(minOrderValue) || 0);
    }
    if (deliveryFee !== undefined) {
      data.deliveryFee = Math.max(0, Number(deliveryFee) || 0);
    }
    if (deliveryFeePerKm !== undefined) {
      data.deliveryFeePerKm = Math.max(0, Number(deliveryFeePerKm) || 0);
    }
    if (freeDeliveryThreshold !== undefined) {
      data.freeDeliveryThreshold = Math.max(0, Number(freeDeliveryThreshold) || 0);
    }
    if (storeLatitude !== undefined) {
      const lat = parseFloat(storeLatitude);
      data.storeLatitude = !isNaN(lat) ? lat : null;
    }
    if (storeLongitude !== undefined) {
      const lng = parseFloat(storeLongitude);
      data.storeLongitude = !isNaN(lng) ? lng : null;
    }
    if (maxDeliveryDistanceKm !== undefined) {
      data.maxDeliveryDistanceKm = Math.max(0, Number(maxDeliveryDistanceKm) || 0);
    }
    if (allowedPostalCodes !== undefined) {
      data.allowedPostalCodes = cleanString(allowedPostalCodes);
    }
    if (legalOwnerName !== undefined) {
      data.legalOwnerName = cleanString(legalOwnerName);
    }
    if (gisaNumber !== undefined) {
      data.gisaNumber = cleanString(gisaNumber);
    }
    if (isKleinunternehmer !== undefined) {
      data.isKleinunternehmer = Boolean(isKleinunternehmer);
    }
    if (vatId !== undefined) {
      data.vatId = cleanString(vatId);
    }
    if (businessPurposeDe !== undefined) {
      data.businessPurposeDe = cleanString(businessPurposeDe);
    }
    if (businessPurposeAr !== undefined) {
      data.businessPurposeAr = cleanString(businessPurposeAr);
    }

    const updated = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...DEFAULT_SETTINGS,
        ...data
      },
      update: data
    });

    logAudit(req.admin?.email, 'UPDATE_SETTINGS', 'Geschäftseinstellungen aktualisiert (Name, Logo, Mindestbestellwert oder Lieferparameter)');

    res.json({
      message: 'Store settings updated successfully',
      settings: updated
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update store settings' });
  }
};

// GET /api/settings/reviews - Public
const getGoogleReviews = async (req, res) => {
  try {
    const reviews = await prisma.googleReview.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get google reviews error:', error);
    res.status(500).json({ error: 'Failed to retrieve Google reviews' });
  }
};

// POST /api/settings/reviews - Protected (Admin only)
const createGoogleReview = async (req, res) => {
  return res.status(400).json({ 
    error: 'Manuelle Erstellung von Rezensionen ist deaktiviert. Bitte nutzen Sie den Google Scraper.' 
  });
};

// DELETE /api/settings/reviews/:id - Protected (Admin only)
const deleteGoogleReview = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.googleReview.delete({
      where: { id }
    });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete google review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// POST /api/settings/sync-google-reviews - Protected (Admin only)
// Scrapes Google reviews and stars ONLY when user explicitly triggers sync
const syncGoogleReviews = async (req, res) => {
  try {
    const { googleReviewsUrl } = req.body || {};

    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' }
    });

    // Determine target URL or search query
    const target =
      (googleReviewsUrl || '').trim() ||
      (settings?.googleReviewsUrl || '').trim() ||
      (settings?.storeName ? `${settings.storeName} ${settings.address || ''}`.trim() : '');

    if (!target) {
      return res.status(400).json({
        error: 'Bitte geben Sie einen Google Maps Link oder Firmennamen ein, um die Bewertungen abzurufen.'
      });
    }

    console.log(`[GoogleScraper] Starting scrape for target: "${target}"...`);
    const scraped = await scrapeGoogleReviews(target, { maxReviews: 12 });

    if (!scraped || !scraped.success) {
      throw new Error('Konnte keine Daten von Google extrahieren.');
    }

    // Update settings with scraped rating and review count
    const updateData = {};
    if (scraped.rating !== null && scraped.rating !== undefined) {
      const r = Number(scraped.rating);
      if (Number.isFinite(r) && r >= 0 && r <= 5) {
        updateData.googleRating = Math.round(r * 10) / 10; // one decimal place
      }
    }
    if (scraped.reviewCount !== null && scraped.reviewCount !== undefined) {
      const c = Number(scraped.reviewCount);
      if (Number.isInteger(c) && c >= 0) {
        updateData.googleReviewCount = c;
      }
    }
    if (googleReviewsUrl) {
      const cleaned = googleReviewsUrl.trim();
      const s = cleaned.toLowerCase();
      // Same validation as updateSettings — this endpoint writes googleReviewsUrl
      // to the DB independently and was missing the check, allowing a stored
      // javascript:/data: URL to slip in via sync instead of the settings form.
      if (s.startsWith('javascript:') || s.startsWith('data:') || s.startsWith('vbscript:') || s.startsWith('//') || !s.startsWith('https://')) {
        return res.status(400).json({ error: 'googleReviewsUrl must be a secure HTTPS URL (starting with https://)' });
      }
      updateData.googleReviewsUrl = cleaned;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.storeSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          ...DEFAULT_SETTINGS,
          ...updateData
        },
        update: updateData
      });
    }

    // Replace reviews in DB with newly scraped unique reviews
    if (Array.isArray(scraped.reviews) && scraped.reviews.length > 0) {
      await prisma.googleReview.deleteMany({});
      const seen = new Set();
      for (const rev of scraped.reviews) {
        const dedupeKey = `${(rev.authorName || '').trim().toLowerCase()}|${(rev.text || '').trim().toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        await prisma.googleReview.create({
          data: {
            authorName: rev.authorName,
            authorPhotoUrl: rev.authorPhotoUrl || null,
            rating: rev.rating,
            relativeTime: rev.relativeTime,
            text: rev.text,
            textDe: rev.text,
            textAr: rev.text,
            verified: true
          }
        });
      }
    }

    const allReviews = await prisma.googleReview.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      message: `Erfolgreich von Google synchronisiert: ${scraped.rating ? scraped.rating.toFixed(1) + ' ★' : ''} (${scraped.reviewCount || 0} Bewertungen, ${scraped.reviews.length} Rezensionen geladen).`,
      synced: true,
      rating: scraped.rating,
      user_ratings_total: scraped.reviewCount,
      reviews: allReviews
    });
  } catch (error) {
    console.error('Scrape Google reviews error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Abrufen der Google-Bewertungen: ' + error.message 
    });
  }
};

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
    res.json({ message: 'Passcode set', isSet: true, unlockToken: issueSectionUnlockToken(req.admin.id) });
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
      unlockToken: valid ? issueSectionUnlockToken(req.admin.id) : undefined
    });
  } catch (error) {
    console.error('Verify passcode error:', error);
    res.status(500).json({ error: 'Failed to verify passcode' });
  }
};

// GET /api/settings/driver-passcode-status - Admin only
const getDriverPasscodeStatus = async (req, res) => {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { driverPasscodeHash: true }
    });
    res.json({ isSet: Boolean(settings?.driverPasscodeHash) });
  } catch (error) {
    console.error('Get driver passcode status error:', error);
    res.status(500).json({ error: 'Failed to check driver passcode status' });
  }
};

// PUT /api/settings/driver-passcode - Admin only
const setDriverPasscode = async (req, res) => {
  try {
    const { passcode, currentPasscode } = req.body;

    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { driverPasscodeHash: true, sectionPasscodeHash: true }
    });

    if (settings?.driverPasscodeHash && settings?.sectionPasscodeHash) {
      if (!currentPasscode) {
        return res.status(400).json({ error: 'Aktueller Admin-PIN ist erforderlich / Current PIN is required' });
      }
      const matches = await bcrypt.compare(String(currentPasscode).trim(), settings.sectionPasscodeHash);
      if (!matches) {
        return res.status(403).json({ error: 'Aktueller Admin-PIN ist falsch / Current PIN is incorrect' });
      }
    }

    if (passcode === null || passcode === '') {
      await prisma.storeSettings.upsert({
        where: { id: 'default' },
        update: { driverPasscodeHash: null },
        create: { ...DEFAULT_SETTINGS, driverPasscodeHash: null }
      });
      logAudit(req.admin?.email, 'REMOVE_DRIVER_PASSCODE', 'Fahrer-Zugangs-PIN entfernt');
      return res.json({ message: 'Driver passcode removed', isSet: false });
    }

    const clean = String(passcode || '').trim();
    if (!/^\d{4,8}$/.test(clean)) {
      return res.status(400).json({ error: 'Passcode must be 4-8 digits' });
    }

    const hash = await bcrypt.hash(clean, 10);
    await prisma.storeSettings.upsert({
      where: { id: 'default' },
      update: { driverPasscodeHash: hash },
      create: { ...DEFAULT_SETTINGS, driverPasscodeHash: hash }
    });
    logAudit(req.admin?.email, 'SET_DRIVER_PASSCODE', 'Fahrer-Zugangs-PIN erfolgreich aktualisiert');
    res.json({ message: 'Driver passcode set', isSet: true });
  } catch (error) {
    console.error('Set driver passcode error:', error);
    res.status(500).json({ error: 'Failed to set driver passcode' });
  }
};

// A pending request older than this is treated as expired — otherwise a
// driver who never got approved/rejected would sit in the admin's list
// forever, and a stale pollToken would stay valid indefinitely.
const DRIVER_LOGIN_REQUEST_TTL_MS = 5 * 60 * 1000;

// POST /api/settings/driver/login - Driver auth endpoint (step 1: PIN check).
// Knowing the PIN is no longer enough to get a session on its own — this
// only creates a pending request; an admin must approve it from the
// dashboard (see approveDriverLoginRequest) before a JWT is ever issued.
const driverLogin = async (req, res) => {
  try {
    const { driverName, passcode } = req.body;
    if (!passcode) {
      return res.status(400).json({ error: 'Passcode is required' });
    }

    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { driverPasscodeHash: true }
    });

    if (!settings?.driverPasscodeHash) {
      return res.status(403).json({
        error: 'Kein Fahrer-PIN im Admin-Dashboard eingerichtet. Bitte Administrator kontaktieren.'
      });
    }

    const matches = await bcrypt.compare(String(passcode).trim(), settings.driverPasscodeHash);
    if (!matches) {
      return res.status(401).json({
        error: 'Ungültiger Fahrer-PIN / Invalid driver passcode'
      });
    }

    const cleanName = String(driverName || 'Fahrer').trim().slice(0, 60);
    const pollToken = crypto.randomBytes(32).toString('hex');

    const request = await prisma.driverLoginRequest.create({
      data: { driverName: cleanName, pollToken, status: 'pending', ipAddress: req.ip || null }
    });

    logAudit('DRIVER_AUTH', 'DRIVER_LOGIN_REQUESTED', `Fahrer "${cleanName}" hat einen Login angefragt (wartet auf Freigabe)`);

    res.json({
      pending: true,
      pollToken,
      requestId: request.id
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ error: 'Driver login failed' });
  }
};

// GET /api/settings/driver/login-poll/:pollToken - Driver polls this while
// waiting for admin approval. Public (no auth — the driver has no session
// yet), but pollToken is an unguessable 32-byte random value only ever
// returned to the original requester, so this isn't a meaningful IDOR surface.
const pollDriverLoginRequest = async (req, res) => {
  try {
    const { pollToken } = req.params;
    const request = await prisma.driverLoginRequest.findUnique({ where: { pollToken } });

    if (!request) {
      return res.status(404).json({ status: 'not_found' });
    }

    if (request.status === 'pending' && Date.now() - request.createdAt.getTime() > DRIVER_LOGIN_REQUEST_TTL_MS) {
      await prisma.driverLoginRequest.update({ where: { id: request.id }, data: { status: 'expired', respondedAt: new Date() } });
      return res.json({ status: 'expired' });
    }

    if (request.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    if (request.status === 'rejected') {
      return res.json({ status: 'rejected' });
    }

    if (request.status === 'approved') {
      // One-time delivery: issue the JWT now and immediately delete the row
      // so this pollToken can't be replayed to mint another session later.
      // jti ties this JWT to a DriverSession row — the JWT signature alone
      // can't be revoked once handed out, so driverOrAdminAuthMiddleware
      // checks that row on every request instead, which is what lets an
      // admin actually force this driver logged out before the 24h expiry.
      const jti = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const token = jwt.sign(
        { role: 'driver', name: request.driverName, id: 'driver-session', jti },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      await prisma.driverSession.create({
        data: { driverName: request.driverName, jti, expiresAt }
      });
      await prisma.driverLoginRequest.delete({ where: { id: request.id } }).catch(() => {});
      logAudit('DRIVER_AUTH', 'DRIVER_LOGIN', `Fahrer "${request.driverName}" wurde freigegeben und angemeldet`);
      return res.json({
        status: 'approved',
        token,
        driver: { role: 'driver', name: request.driverName }
      });
    }

    // 'expired' already persisted from a prior poll
    return res.json({ status: request.status });
  } catch (error) {
    console.error('Poll driver login request error:', error);
    res.status(500).json({ error: 'Failed to check login status' });
  }
};

// GET /api/settings/driver-login-requests - Admin only. Pending requests
// the dashboard shows for approve/reject; auto-expires stale ones first.
const listDriverLoginRequests = async (req, res) => {
  try {
    await prisma.driverLoginRequest.updateMany({
      where: { status: 'pending', createdAt: { lt: new Date(Date.now() - DRIVER_LOGIN_REQUEST_TTL_MS) } },
      data: { status: 'expired', respondedAt: new Date() }
    });
    // pollToken deliberately excluded — the admin never needs it, and it's
    // the one value that could let someone complete this specific driver's
    // login (defense in depth, not the primary protection: that's the fact
    // this endpoint requires an authenticated admin at all).
    const requests = await prisma.driverLoginRequest.findMany({
      where: { status: 'pending' },
      select: { id: true, driverName: true, ipAddress: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(requests);
  } catch (error) {
    console.error('List driver login requests error:', error);
    res.status(500).json({ error: 'Failed to load driver login requests' });
  }
};

// POST /api/settings/driver-login-requests/:id/approve - Admin only
const approveDriverLoginRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.driverLoginRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already resolved' });
    }
    await prisma.driverLoginRequest.update({
      where: { id },
      data: { status: 'approved', respondedAt: new Date(), respondedBy: req.admin?.email || null }
    });
    logAudit(req.admin?.email, 'APPROVE_DRIVER_LOGIN', `Login von Fahrer "${request.driverName}" genehmigt`);
    res.json({ message: 'Approved' });
  } catch (error) {
    console.error('Approve driver login request error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

// POST /api/settings/driver-login-requests/:id/reject - Admin only
const rejectDriverLoginRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.driverLoginRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already resolved' });
    }
    await prisma.driverLoginRequest.update({
      where: { id },
      data: { status: 'rejected', respondedAt: new Date(), respondedBy: req.admin?.email || null }
    });
    logAudit(req.admin?.email, 'REJECT_DRIVER_LOGIN', `Login von Fahrer "${request.driverName}" abgelehnt`);
    res.json({ message: 'Rejected' });
  } catch (error) {
    console.error('Reject driver login request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

// GET /api/settings/driver-sessions - Admin only. Currently logged-in
// drivers, for the Dashboard's "log this driver out" control.
const listActiveDriverSessions = async (req, res) => {
  try {
    const sessions = await prisma.driverSession.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('List active driver sessions error:', error);
    res.status(500).json({ error: 'Failed to load active driver sessions' });
  }
};

// POST /api/settings/driver-sessions/:id/logout - Admin only. Revokes the
// session row; driverOrAdminAuthMiddleware rejects that driver's very next
// request (their app already treats any 401/403 there as "logged out").
const logoutDriverSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.driverSession.findUnique({ where: { id } });
    if (!session || session.revokedAt) {
      return res.status(404).json({ error: 'Session not found or already ended' });
    }
    await prisma.driverSession.update({ where: { id }, data: { revokedAt: new Date() } });
    logAudit(req.admin?.email, 'LOGOUT_DRIVER_SESSION', `Fahrer "${session.driverName}" wurde vom Administrator abgemeldet`);
    res.json({ message: 'Driver logged out' });
  } catch (error) {
    console.error('Logout driver session error:', error);
    res.status(500).json({ error: 'Failed to log out driver' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getGoogleReviews,
  createGoogleReview,
  deleteGoogleReview,
  syncGoogleReviews,
  getPasscodeStatus,
  setPasscode,
  verifyPasscode,
  getDriverPasscodeStatus,
  setDriverPasscode,
  driverLogin,
  pollDriverLoginRequest,
  listDriverLoginRequests,
  approveDriverLoginRequest,
  rejectDriverLoginRequest,
  listActiveDriverSessions,
  logoutDriverSession
};
