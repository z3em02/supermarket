const { test, before, after } = require('node:test');
const assert = require('node:assert');

// Force the network (Nominatim/OSRM) to fail so geocoding deterministically
// falls back to the built-in postal code centroids.
const realFetch = global.fetch;
before(() => { global.fetch = async () => { throw new Error('network disabled in tests'); }; });
after(() => { global.fetch = realFetch; });

const {
  extractPostalCode,
  normalizeAddressForGeocoding,
  haversineDistanceKm,
  calculateDeliveryDistance,
  POSTAL_CODE_CENTROIDS
} = require('../utils/distanceService');

test('extractPostalCode', () => {
  assert.strictEqual(extractPostalCode('Hauptstraße 5, 1100 Wien'), '1100');
  assert.strictEqual(extractPostalCode('no code here'), null);
  assert.strictEqual(extractPostalCode(''), null);
});

test('normalizeAddressForGeocoding strips apartment details and sub-units', () => {
  assert.strictEqual(
    normalizeAddressForGeocoding('Favoritenstraße 166/4, Top 12, 1100 Wien'),
    'Favoritenstraße 166, 1100 Wien'
  );
});

test('haversineDistanceKm', () => {
  assert.strictEqual(haversineDistanceKm(48.2, 16.37, 48.2, 16.37), 0);
  // Vienna -> Graz is ~145 km as the crow flies
  const d = haversineDistanceKm(48.2082, 16.3738, 47.0707, 15.4395);
  assert.ok(d > 140 && d < 150, `got ${d}`);
});

test('no address: base fee only, always deliverable', async () => {
  const r = await calculateDeliveryDistance('', { deliveryFee: 2, deliveryFeePerKm: 0.5, maxDeliveryDistanceKm: 5 });
  assert.strictEqual(r.totalDeliveryFee, 2);
  assert.strictEqual(r.isWithinMaxDistance, true);
});

test('fee = base + km * rate, rounded to cents, using postal centroid fallback', async () => {
  const code = Object.keys(POSTAL_CODE_CENTROIDS)[0];
  const r = await calculateDeliveryDistance(`Irgendwo 1, ${code}`, { deliveryFee: 2, deliveryFeePerKm: 0.1, maxDeliveryDistanceKm: 0 });
  assert.strictEqual(r.routingEngine, 'postal_centroid_haversine');
  assert.strictEqual(r.distanceFee, Math.round(r.distanceKm * 0.1 * 100) / 100);
  assert.strictEqual(r.totalDeliveryFee, Math.round((2 + r.distanceFee) * 100) / 100);
  assert.strictEqual(r.isWithinMaxDistance, true);
});

test('max distance is enforced', async () => {
  const code = Object.keys(POSTAL_CODE_CENTROIDS)[0];
  const r = await calculateDeliveryDistance(`Irgendwo 1, ${code}`, { deliveryFee: 2, maxDeliveryDistanceKm: 0.001 });
  assert.strictEqual(r.isWithinMaxDistance, r.distanceKm <= 0.001);
});

test('unresolvable address is rejected only when a max distance is configured', async () => {
  const limited = await calculateDeliveryDistance('Nowhere Street', { deliveryFee: 2, maxDeliveryDistanceKm: 10 });
  assert.strictEqual(limited.unresolvableAddress, true);
  assert.strictEqual(limited.isWithinMaxDistance, false);
  const unlimited = await calculateDeliveryDistance('Nowhere Street', { deliveryFee: 2, maxDeliveryDistanceKm: 0 });
  assert.strictEqual(unlimited.isWithinMaxDistance, true);
});
