const { test } = require('node:test');
const assert = require('node:assert');
const { parseDeliverySlot, formatDeliverySlot, getBerlinTodayIso, getBerlinMaxDateIso } = require('../utils/deliverySlot');

test('parseDeliverySlot', () => {
  assert.deepStrictEqual(parseDeliverySlot('2026-09-25_16_18'), { date: '2026-09-25', startHour: 16, endHour: 18 });
  assert.strictEqual(parseDeliverySlot('2026-09-25_16'), null);
  assert.strictEqual(parseDeliverySlot('garbage'), null);
  assert.strictEqual(parseDeliverySlot(null), null);
});

test('formatDeliverySlot renders German and Arabic labels', () => {
  assert.match(formatDeliverySlot('2026-09-25_16_18', 'de'), /25\.09\.2026, 16–18 Uhr$/);
  assert.match(formatDeliverySlot('2026-09-25_16_18', 'ar'), /16–18$/);
  assert.strictEqual(formatDeliverySlot('bad'), null);
});

test('booking window is today .. today + 14 days (Berlin time)', () => {
  const today = getBerlinTodayIso();
  const max = getBerlinMaxDateIso();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const days = (new Date(max) - new Date(today)) / 86400000;
  assert.ok(days >= 13 && days <= 15, `got ${days}`);
});
