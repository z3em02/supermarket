// Small pure helpers from the settings and email modules.
const { test } = require('node:test');
const assert = require('node:assert');
const { cleanString, DEFAULT_SETTINGS, PUBLIC_SETTINGS_SELECT } = require('../controllers/settingsShared');
const { escapeHtml, computeDeliveryFeeCharged } = require('../utils/emailService');

test('cleanString treats missing values and the strings "null"/"undefined" as empty', () => {
  for (const v of [null, undefined, 'null', 'undefined']) assert.strictEqual(cleanString(v), '');
  assert.strictEqual(cleanString('  Hajar Supermarkt  '), 'Hajar Supermarkt');
  assert.strictEqual(cleanString(0), '0');
});

test('the public settings never include secrets', () => {
  for (const secret of ['sectionPasscodeHash', 'googleApiKey']) {
    assert.ok(!(secret in PUBLIC_SETTINGS_SELECT), `${secret} must not be public`);
  }
  // a fresh store starts without a section PIN
  assert.ok(!DEFAULT_SETTINGS.sectionPasscodeHash);
});

test('escapeHtml neutralises markup in customer-supplied text', () => {
  assert.strictEqual(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.strictEqual(escapeHtml("Tom & Jerry's"), 'Tom &amp; Jerry&#039;s');
  assert.strictEqual(escapeHtml(null), null);
  assert.strictEqual(escapeHtml(42), '42');
});

test('computeDeliveryFeeCharged prefers the stored fee and otherwise derives it', () => {
  assert.strictEqual(computeDeliveryFeeCharged({ deliveryFee: 2.9, totalAmount: 99 }), 2.9);
  assert.strictEqual(computeDeliveryFeeCharged({ deliveryFee: 0, totalAmount: 20 }), 0);
  // legacy orders without deliveryFee: total minus items
  const legacy = { totalAmount: 15.5, orderItems: [{ subtotal: 10 }, { price: 2.5, quantity: 1 }] };
  assert.ok(Math.abs(computeDeliveryFeeCharged(legacy) - 3) < 1e-9);
  assert.strictEqual(computeDeliveryFeeCharged({ totalAmount: 10, orderItems: [{ subtotal: 10 }] }), 0);
  assert.strictEqual(computeDeliveryFeeCharged(undefined), 0);
});
