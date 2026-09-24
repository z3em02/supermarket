/**
 * Distance Calculation & Geocoding Service for Supermarket Delivery
 *
 * Implements address-dependent precision:
 * 1. Intelligent Address Normalization: Cleans building sub-units (Apt, Floor, Top, Tür, Stiege, 166/4 -> 166)
 *    so geocoders reliably match the physical building and exact house number.
 * 2. Exact Street-Level Geocoding:
 *    - Primary: Photon OSM geocoder biased around the supermarket GPS coordinates.
 *    - Secondary: OpenStreetMap Nominatim with Austria scope.
 *    - Tertiary / Offline: Local Vienna postal code centroid table (1010-1230 & suburbs).
 * 3. Real Road-Routing Distance (OSRM): Computes true driving distance along actual road networks
 *    rather than broad district-level averages.
 * 4. High-Resilience Fallbacks:
 *    - Haversine straight-line distance with 1.25x urban road factor if OSRM is slow or offline.
 *    - Checkout never blocks or crashes.
 * 5. In-Memory LRU Caching: 1-hour cache for both coordinates and driving routes for lightning-fast checkout.
 */

// Default store coordinates: Koppreitergasse 8, 1120 Wien
const DEFAULT_STORE_LAT = 48.1746605;
const DEFAULT_STORE_LNG = 16.3272662;

// Driving distance correction factor over great-circle line for urban street grids (fallback)
const ROAD_DISTANCE_FACTOR = 1.25;

// Comprehensive Vienna & surrounding Lower Austria postal code centroids (offline fallback)
const POSTAL_CODE_CENTROIDS = {
  // Vienna Districts 1-23
  '1010': { lat: 48.2085, lon: 16.3721, name: 'Innere Stadt' },
  '1020': { lat: 48.2173, lon: 16.3980, name: 'Leopoldstadt' },
  '1030': { lat: 48.1983, lon: 16.3965, name: 'Landstraße' },
  '1040': { lat: 48.1925, lon: 16.3670, name: 'Wieden' },
  '1050': { lat: 48.1878, lon: 16.3565, name: 'Margareten' },
  '1060': { lat: 48.1950, lon: 16.3490, name: 'Mariahilf' },
  '1070': { lat: 48.2025, lon: 16.3450, name: 'Neubau' },
  '1080': { lat: 48.2105, lon: 16.3465, name: 'Josefstadt' },
  '1090': { lat: 48.2250, lon: 16.3570, name: 'Alsergrund' },
  '1100': { lat: 48.1610, lon: 16.3750, name: 'Favoriten' },
  '1110': { lat: 48.1680, lon: 16.4270, name: 'Simmering' },
  '1120': { lat: 48.1750, lon: 16.3270, name: 'Meidling' },
  '1130': { lat: 48.1780, lon: 16.2750, name: 'Hietzing' },
  '1140': { lat: 48.2040, lon: 16.2690, name: 'Penzing' },
  '1150': { lat: 48.1960, lon: 16.3260, name: 'Rudolfsheim-Fünfhaus' },
  '1160': { lat: 48.2120, lon: 16.3070, name: 'Ottakring' },
  '1170': { lat: 48.2250, lon: 16.3080, name: 'Hernals' },
  '1180': { lat: 48.2320, lon: 16.3310, name: 'Währing' },
  '1190': { lat: 48.2480, lon: 16.3450, name: 'Döbling' },
  '1200': { lat: 48.2380, lon: 16.3720, name: 'Brigittenau' },
  '1210': { lat: 48.2700, lon: 16.4150, name: 'Floridsdorf' },
  '1220': { lat: 48.2350, lon: 16.4650, name: 'Donaustadt' },
  '1230': { lat: 48.1400, lon: 16.3150, name: 'Liesing' },

  // Surrounding Greater Vienna Area
  '2320': { lat: 48.1390, lon: 16.4720, name: 'Schwechat' },
  '2331': { lat: 48.1220, lon: 16.3390, name: 'Vösendorf' },
  '2340': { lat: 48.0860, lon: 16.2820, name: 'Mödling' },
  '2344': { lat: 48.0980, lon: 16.2650, name: 'Maria Enzersdorf' },
  '2345': { lat: 48.1060, lon: 16.2850, name: 'Brunn am Gebirge' },
  '2351': { lat: 48.0850, lon: 16.3150, name: 'Wiener Neudorf' },
  '2353': { lat: 48.0500, lon: 16.3160, name: 'Guntramsdorf' },
  '2380': { lat: 48.1180, lon: 16.2650, name: 'Perchtoldsdorf' },
  '3400': { lat: 48.3050, lon: 16.3250, name: 'Klosterneuburg' },
  '2103': { lat: 48.3450, lon: 16.4250, name: 'Langenzersdorf' },
  '2201': { lat: 48.3200, lon: 16.4600, name: 'Gerasdorf bei Wien' }
};

// In-memory caches with 1-hour TTL
const geocodeCache = new Map();
const routeCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

/**
 * Extracts a 4-digit Austrian postal code or 5-digit German postal code from text.
 */
function extractPostalCode(addressText) {
  if (!addressText) return null;
  const match = String(addressText).match(/\b(\d{4,5})\b/);
  return match ? match[1] : null;
}

/**
 * Normalizes customer address for street-level geocoding.
 * Strips internal building metadata (apartment numbers, floors, door/top/stiege)
 * and sub-unit slashes (e.g. "166/4" -> "166") so OpenStreetMap/Nominatim
 * accurately identifies the physical building rather than failing or returning 0 results.
 */
function normalizeAddressForGeocoding(addressText) {
  if (!addressText) return '';
  let s = String(addressText)
    .trim()
    .slice(0, 250)
    .replace(/[<>'"`;]/g, '');

  // Strip door / top / stiege / apt / floor patterns: e.g. "Top 4", "Tür 12", "Stiege 2", "Apt/Floor: 3", "Stock 1"
  s = s.replace(/,?\s*\b(?:Apt\/Floor|Apt|Apartment|Floor|Stock|Tür|Tuer|Stiege|Stg|Top|Whg|Wohnung)\b[^,]*/gi, '');

  // Replace house number sub-unit like "166/4" or "166 / 4" with "166"
  s = s.replace(/(\b\d+[a-zA-Z]?)\s*\/\s*\d+\b/g, '$1');

  // Clean redundant punctuation and spaces
  s = s.replace(/[,;:]\s*[,;:]/g, ',')
       .replace(/,\s*,/g, ',')
       .replace(/\s{2,}/g, ' ')
       .replace(/^[,;:\s]+|[,;:\s]+$/g, '')
       .trim();

  return s;
}

/**
 * Calculates great-circle distance (in km) between two coordinate pairs using the Haversine formula.
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Queries OSRM road routing service for exact driving distance along the road network.
 * Returns driving distance in km rounded to 1 decimal place, or null if unreachable.
 */
async function getOsrmRoadDistance(storeLat, storeLng, destLat, destLon) {
  const cacheKey = `${storeLat.toFixed(5)},${storeLng.toFixed(5)}->${destLat.toFixed(5)},${destLon.toFixed(5)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.km;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${destLon},${destLat}?overview=false`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HajarSupermarketDelivery/1.0 (info@hajar-supermarkt.de)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0] && typeof data.routes[0].distance === 'number') {
        const meters = data.routes[0].distance;
        const km = Math.round((meters / 1000) * 10) / 10;

        if (routeCache.size >= MAX_CACHE_SIZE) {
          const firstKey = routeCache.keys().next().value;
          routeCache.delete(firstKey);
        }
        routeCache.set(cacheKey, { km, timestamp: Date.now() });

        return km;
      }
    }
  } catch (err) {
    // Network timeout or error — fallback will be used
  }

  return null;
}

/**
 * Geocodes an address string to precise GPS coordinates.
 * Multi-layer architecture:
 * 1. Primary: Photon OSM Geocoder biased around store location (fast, no 429 rate limit, building-level).
 * 2. Secondary: OpenStreetMap Nominatim with Austria filter.
 * 3. Tertiary: Local postal code centroid table for offline guarantee.
 */
async function geocodeAddress(addressText, storeLat = DEFAULT_STORE_LAT, storeLng = DEFAULT_STORE_LNG) {
  const normalized = normalizeAddressForGeocoding(addressText);
  if (!normalized) return null;

  // Check in-memory cache
  const cached = geocodeCache.get(normalized.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.coords;
  }

  // 1. Primary Geocoder: Photon (Komoot OSM) with store coordinate bias
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const query = encodeURIComponent(normalized);
    const url = `https://photon.komoot.io/api/?q=${query}&lat=${storeLat}&lon=${storeLng}&limit=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HajarSupermarketDelivery/1.0 (info@hajar-supermarkt.de)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feat = data.features[0];
        const [lon, lat] = feat.geometry.coordinates;
        if (!isNaN(lat) && !isNaN(lon)) {
          const props = feat.properties || {};
          const isExact = Boolean(props.housenumber || props.street || props.osm_value === 'house' || props.type === 'house');
          const coords = {
            lat,
            lon,
            source: 'photon_osm',
            isExactAddress: isExact,
            street: props.street || '',
            houseNumber: props.housenumber || '',
            postalCode: props.postcode || extractPostalCode(normalized),
            city: props.city || 'Wien'
          };

          if (geocodeCache.size >= MAX_CACHE_SIZE) {
            const firstKey = geocodeCache.keys().next().value;
            geocodeCache.delete(firstKey);
          }
          geocodeCache.set(normalized.toLowerCase(), { coords, timestamp: Date.now() });

          return coords;
        }
      }
    }
  } catch (err) {
    // Photon network error or timeout — proceed to secondary Nominatim
  }

  // 2. Secondary Geocoder: OpenStreetMap Nominatim with Austria scope
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const query = encodeURIComponent(`${normalized}, Austria`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=0`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HajarSupermarketDelivery/1.0 (info@hajar-supermarkt.de)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          const coords = {
            lat,
            lon,
            source: 'nominatim_address',
            isExactAddress: true,
            displayName: data[0].display_name
          };

          if (geocodeCache.size >= MAX_CACHE_SIZE) {
            const firstKey = geocodeCache.keys().next().value;
            geocodeCache.delete(firstKey);
          }
          geocodeCache.set(normalized.toLowerCase(), { coords, timestamp: Date.now() });

          return coords;
        }
      }
    }
  } catch (err) {
    // Nominatim timeout or error — proceed to tertiary offline fallback
  }

  // 3. Tertiary Offline Fallback: Local postal code centroid table
  const postalCode = extractPostalCode(normalized);
  if (postalCode && POSTAL_CODE_CENTROIDS[postalCode]) {
    const centroid = POSTAL_CODE_CENTROIDS[postalCode];
    const coords = {
      lat: centroid.lat,
      lon: centroid.lon,
      source: 'postal_centroid',
      isExactAddress: false,
      displayName: `${postalCode} ${centroid.name}, Wien`
    };
    geocodeCache.set(normalized.toLowerCase(), { coords, timestamp: Date.now() });
    return coords;
  }

  return null;
}

/**
 * Calculates the delivery distance and fee breakdown from the supermarket origin.
 *
 * Prioritizes:
 * 1. Street-level address geocoding (house number & street name).
 * 2. Real OSRM driving distance along the road network.
 * 3. Smooth mathematical fallback if external services are unreachable.
 *
 * @param {string} destinationAddress - The delivery address or postal code.
 * @param {object} storeSettings - StoreSettings record from DB or default config.
 * @returns {Promise<object>} Distance and fee breakdown.
 */
async function calculateDeliveryDistance(destinationAddress, storeSettings = {}) {
  const storeLat = Number(storeSettings.storeLatitude) || DEFAULT_STORE_LAT;
  const storeLng = Number(storeSettings.storeLongitude) || DEFAULT_STORE_LNG;
  const baseFee = Math.max(0, Number(storeSettings.deliveryFee) || 0);
  const perKmRate = Math.max(0, Number(storeSettings.deliveryFeePerKm) || 0);
  const maxDistanceKm = Math.max(0, Number(storeSettings.maxDeliveryDistanceKm) || 0);

  // If no address provided, return base fee with 0 distance
  if (!destinationAddress || !String(destinationAddress).trim()) {
    return {
      distanceKm: 0,
      straightLineKm: 0,
      isExactAddress: false,
      isApproximate: false,
      routingEngine: 'none',
      destinationCoordinates: null,
      originCoordinates: { lat: storeLat, lon: storeLng },
      baseFee,
      perKmRate,
      distanceFee: 0,
      totalDeliveryFee: baseFee,
      isWithinMaxDistance: true,
      maxDeliveryDistanceKm: maxDistanceKm
    };
  }

  const coords = await geocodeAddress(destinationAddress, storeLat, storeLng);

  // #27 fix: If destination could not be resolved at all, only allow if maxDistanceKm <= 0 (no radius limit configured)
  if (!coords) {
    return {
      distanceKm: 0,
      straightLineKm: 0,
      isExactAddress: false,
      isApproximate: true,
      routingEngine: 'none',
      destinationCoordinates: null,
      originCoordinates: { lat: storeLat, lon: storeLng },
      baseFee,
      perKmRate,
      distanceFee: 0,
      totalDeliveryFee: baseFee,
      isWithinMaxDistance: maxDistanceKm <= 0,
      maxDeliveryDistanceKm: maxDistanceKm,
      fallbackUsed: true,
      unresolvableAddress: true
    };
  }

  const straightLineKm = haversineDistanceKm(storeLat, storeLng, coords.lat, coords.lon);
  let distanceKm = 0;
  let routingEngine = 'haversine_road_factor';

  if (coords.isExactAddress) {
    // Street-level address geocoded: compute real road driving distance via OSRM
    const osrmKm = await getOsrmRoadDistance(storeLat, storeLng, coords.lat, coords.lon);
    if (osrmKm != null && osrmKm > 0) {
      distanceKm = osrmKm;
      routingEngine = 'osrm_driving';
    } else {
      // Safe fallback: straight line * 1.25 urban street factor
      const rawDistanceKm = straightLineKm * ROAD_DISTANCE_FACTOR;
      distanceKm = Math.round(rawDistanceKm * 10) / 10;
      routingEngine = 'haversine_road_factor';
    }
  } else {
    // Postal centroid fallback
    const rawDistanceKm = straightLineKm * ROAD_DISTANCE_FACTOR;
    distanceKm = Math.round(rawDistanceKm * 10) / 10;
    routingEngine = 'postal_centroid_haversine';
  }

  const distanceFee = Math.round(distanceKm * perKmRate * 100) / 100;
  const totalDeliveryFee = Math.round((baseFee + distanceFee) * 100) / 100;
  const isWithinMaxDistance = maxDistanceKm <= 0 || distanceKm <= maxDistanceKm;

  return {
    distanceKm,
    straightLineKm: Math.round(straightLineKm * 10) / 10,
    isExactAddress: Boolean(coords.isExactAddress),
    isApproximate: !coords.isExactAddress,
    source: coords.source,
    routingEngine,
    destinationCoordinates: { lat: coords.lat, lon: coords.lon },
    originCoordinates: { lat: storeLat, lon: storeLng },
    baseFee,
    perKmRate,
    distanceFee,
    totalDeliveryFee,
    isWithinMaxDistance,
    maxDeliveryDistanceKm: maxDistanceKm
  };
}

module.exports = {
  DEFAULT_STORE_LAT,
  DEFAULT_STORE_LNG,
  POSTAL_CODE_CENTROIDS,
  extractPostalCode,
  normalizeAddressForGeocoding,
  haversineDistanceKm,
  getOsrmRoadDistance,
  geocodeAddress,
  calculateDeliveryDistance
};
