const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { scrapeGoogleReviews } = require('../utils/googleScraper');

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
      data.logoUrl = cleanString(logoUrl);
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
      data.mapUrl = cleanString(mapUrl);
    }
    if (mapEmbedUrl !== undefined) {
      data.mapEmbedUrl = cleanString(mapEmbedUrl);
    }
    if (googleReviewsUrl !== undefined) {
      data.googleReviewsUrl = cleanString(googleReviewsUrl);
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
      updateData.googleRating = scraped.rating;
    }
    if (scraped.reviewCount !== null && scraped.reviewCount !== undefined) {
      updateData.googleReviewCount = scraped.reviewCount;
    }
    if (googleReviewsUrl) {
      updateData.googleReviewsUrl = googleReviewsUrl.trim();
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
    const { passcode } = req.body;

    if (passcode === null || passcode === '') {
      await prisma.storeSettings.upsert({
        where: { id: 'default' },
        update: { sectionPasscodeHash: null },
        create: { ...DEFAULT_SETTINGS, sectionPasscodeHash: null }
      });
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
    res.json({ message: 'Passcode set', isSet: true });
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
    res.json({ valid, isSet: true });
  } catch (error) {
    console.error('Verify passcode error:', error);
    res.status(500).json({ error: 'Failed to verify passcode' });
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
  verifyPasscode
};
