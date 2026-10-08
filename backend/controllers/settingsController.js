const prisma = require('../lib/prisma');
const { isPrivateOrLocalHost } = require('../utils/url');
const { downloadAndCacheLogo, deleteCachedLogo } = require('../utils/imageProxy');
const { logAudit } = require('../lib/auditLog');
const { PUBLIC_SETTINGS_SELECT, DEFAULT_SETTINGS, cleanString } = require('./settingsShared');
const errorTracking = require('../lib/errorTracking');

// Runtime facts the storefront needs next to the stored settings:
// errorTracking tells the privacy page (/datenschutz) to show its
// error-report paragraph only when reports are actually sent.
const withRuntimeFlags = (settings) => ({ ...settings, errorTracking: errorTracking.enabled });

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

    res.json(withRuntimeFlags(settings));
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
      businessPurposeAr,
      maintenanceMode,
      ordersPaused
    } = req.body;

    const data = {};

    if (showGoogleReviews !== undefined) {
      data.showGoogleReviews = Boolean(showGoogleReviews);
    }
    if (maintenanceMode !== undefined) {
      data.maintenanceMode = Boolean(maintenanceMode);
    }
    if (ordersPaused !== undefined) {
      data.ordersPaused = Boolean(ordersPaused);
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

    // Same fields as the public GET — never sectionPasscodeHash (a 4–8 digit
    // PIN's bcrypt hash is quick to brute-force offline) or the Google API
    // key, which the frontend would otherwise keep in its app-wide settings.
    const updated = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...DEFAULT_SETTINGS,
        ...data
      },
      update: data,
      select: PUBLIC_SETTINGS_SELECT
    });

    logAudit(req.admin?.email, 'UPDATE_SETTINGS', 'Geschäftseinstellungen aktualisiert (Name, Logo, Mindestbestellwert oder Lieferparameter)');

    // Own audit entry, separate from the generic one above — toggling this
    // takes the whole storefront offline, worth being easy to find in the
    // audit trail rather than lumped in with routine settings edits.
    if (maintenanceMode !== undefined) {
      logAudit(
        req.admin?.email,
        updated.maintenanceMode ? 'ENABLE_MAINTENANCE_MODE' : 'DISABLE_MAINTENANCE_MODE',
        updated.maintenanceMode ? 'Wartungsmodus aktiviert — Shop für Kunden gesperrt' : 'Wartungsmodus deaktiviert — Shop wieder erreichbar'
      );
    }

    // Own audit entry — pausing orders stops all customer checkouts, worth
    // finding quickly in the trail rather than lumped with routine edits.
    if (ordersPaused !== undefined) {
      logAudit(
        req.admin?.email,
        updated.ordersPaused ? 'PAUSE_ORDERS' : 'RESUME_ORDERS',
        updated.ordersPaused ? 'Bestellannahme pausiert — Kunden können nicht bestellen' : 'Bestellannahme wieder aktiv'
      );
    }

    res.json({
      message: 'Store settings updated successfully',
      settings: withRuntimeFlags(updated)
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update store settings' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
