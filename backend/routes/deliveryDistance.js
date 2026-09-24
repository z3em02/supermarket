const express = require('express');
const prisma = require('../lib/prisma');
const { calculateDeliveryDistance, geocodeAddress } = require('../utils/distanceService');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// This fans out to 2-3 external geocoding/routing services per uncached
// address, so it needs a tighter cap than the general API limiter — both to
// stop abuse and to avoid tripping Nominatim's usage-policy rate limit and
// getting the server's IP blocked by them.
const distanceLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many delivery distance requests. Please slow down.'
});

/**
 * POST /api/delivery-distance/calculate
 *
 * Public endpoint used by the customer checkout drawer to calculate the delivery distance
 * and estimated fee breakdown in real time.
 *
 * Body: { address: string, postalCode?: string }
 */
router.post('/calculate', distanceLimiter, async (req, res) => {
  try {
    const { address, postalCode } = req.body;
    const storeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });

    // Combine postal code with address if provided and not already included
    let fullAddress = String(address || '').trim();
    if (postalCode && !fullAddress.includes(postalCode)) {
      fullAddress = `${fullAddress} ${postalCode}`.trim();
    }

    const result = await calculateDeliveryDistance(fullAddress, storeSettings || {});
    res.json(result);
  } catch (error) {
    console.error('Error calculating delivery distance:', error);
    // Even on error, return safe fallback so customer checkout never crashes
    res.status(200).json({
      distanceKm: 0,
      isApproximate: true,
      baseFee: 2.0,
      perKmRate: 0.10,
      distanceFee: 0,
      totalDeliveryFee: 2.0,
      isWithinMaxDistance: true,
      error: 'Calculation error, using fallback base fee'
    });
  }
});

/**
 * POST /api/delivery-distance/geocode-store
 *
 * Admin endpoint to re-geocode the store's physical address and update storeLatitude / storeLongitude.
 */
router.post('/geocode-store', authMiddleware, sectionUnlockMiddleware, async (req, res) => {
  try {
    const storeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!storeSettings || !storeSettings.address) {
      return res.status(400).json({ error: 'Store address is not configured' });
    }

    const coords = await geocodeAddress(storeSettings.address);
    if (!coords) {
      return res.status(404).json({ error: 'Could not geocode store address' });
    }

    const updated = await prisma.storeSettings.update({
      where: { id: 'default' },
      data: {
        storeLatitude: coords.lat,
        storeLongitude: coords.lon
      }
    });

    res.json({
      success: true,
      address: storeSettings.address,
      latitude: updated.storeLatitude,
      longitude: updated.storeLongitude
    });
  } catch (error) {
    console.error('Error geocoding store address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
