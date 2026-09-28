const prisma = require('../lib/prisma');
const { scrapeGoogleReviews } = require('../utils/googleScraper');
const { logAudit } = require('../lib/auditLog');
const { DEFAULT_SETTINGS } = require('./settingsShared');

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
    const deleted = await prisma.googleReview.delete({
      where: { id }
    });
    logAudit(req.admin?.email, 'DELETE_GOOGLE_REVIEW', `Google-Bewertung von "${deleted.authorName}" (${deleted.rating}★) gelöscht`);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }
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

    logAudit(
      req.admin?.email,
      'SYNC_GOOGLE_REVIEWS',
      `Google-Bewertungen synchronisiert (${allReviews.length} Rezensionen gespeichert)`
    );
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
  getGoogleReviews,
  createGoogleReview,
  deleteGoogleReview,
  syncGoogleReviews
};
