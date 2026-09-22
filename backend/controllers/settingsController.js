const prisma = require('../lib/prisma');
const { scrapeGoogleReviews } = require('../utils/googleScraper');

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
  showGoogleReviews: true
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
  showGoogleReviews: true
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
      showGoogleReviews
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
      data.logoUrl = String(logoUrl).trim();
    }
    if (phone !== undefined) {
      data.phone = String(phone).trim();
    }
    if (email !== undefined) {
      data.email = String(email).trim().toLowerCase();
    }
    if (address !== undefined) {
      data.address = String(address).trim();
    }
    if (mapUrl !== undefined) {
      data.mapUrl = String(mapUrl).trim();
    }
    if (mapEmbedUrl !== undefined) {
      data.mapEmbedUrl = String(mapEmbedUrl).trim();
    }
    if (googleReviewsUrl !== undefined) {
      data.googleReviewsUrl = String(googleReviewsUrl).trim();
    }
    if (googlePlaceId !== undefined) {
      data.googlePlaceId = String(googlePlaceId).trim();
    }
    if (googleApiKey !== undefined) {
      data.googleApiKey = String(googleApiKey).trim();
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

module.exports = {
  getSettings,
  updateSettings,
  getGoogleReviews,
  createGoogleReview,
  deleteGoogleReview,
  syncGoogleReviews
};
