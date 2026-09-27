const { test } = require('node:test');
const assert = require('node:assert');
const {
  roundMoney,
  parseQuantity,
  buildOrderLine,
  summarizeOrderLines,
  parseAllowedPostalCodes,
  isPostalCodeAllowed,
  isFreeDelivery,
  calculateOrderTotal,
  isCouponStillEligible
} = require('../utils/orderPricing');

const product = (id, price, extra = {}) => ({ id, name: `Product ${id}`, b2bPrice: price, stock: 100, ...extra });

test('roundMoney rounds to cents', () => {
  assert.strictEqual(roundMoney(0.1 + 0.2), 0.3);
  assert.strictEqual(roundMoney(19.999), 20);
});

test('parseQuantity accepts only positive integers', () => {
  assert.strictEqual(parseQuantity(3), 3);
  assert.strictEqual(parseQuantity('2'), 2);
  for (const bad of [0, '0', '0.5', -1, 'abc', null, undefined, '']) {
    assert.strictEqual(parseQuantity(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test('buildOrderLine uses the DB price without a promotion', () => {
  const line = buildOrderLine(product('a', 2.49), 4, undefined);
  assert.strictEqual(line.productId, 'a');
  assert.strictEqual(line.price, 2.49);
  assert.strictEqual(line.subtotal, 9.96);
  assert.strictEqual(line.appliedSavings, 0);
  assert.strictEqual(line.promotionType, null);
});

test('buildOrderLine applies an active percentage promotion', () => {
  const promo = { type: 'PRODUCT_DISCOUNT', discountPercent: 25, isActive: true };
  const line = buildOrderLine(product('a', 4), 2, promo);
  assert.strictEqual(line.price, 3);
  assert.strictEqual(line.subtotal, 6);
  assert.strictEqual(line.appliedSavings, 2);
});

test('summarizeOrderLines sums and rounds subtotals and savings', () => {
  const lines = [
    buildOrderLine(product('a', 0.1), 1),
    buildOrderLine(product('b', 0.2), 1),
    buildOrderLine(product('c', 4), 2, { type: 'PRODUCT_DISCOUNT', discountPercent: 25, isActive: true })
  ];
  assert.deepStrictEqual(summarizeOrderLines(lines), { itemsSubtotal: 6.3, promotionDiscount: 2 });
});

test('parseAllowedPostalCodes handles mixed separators and legacy "null"', () => {
  assert.deepStrictEqual(parseAllowedPostalCodes('1100, 1120;1230  1210'), ['1100', '1120', '1230', '1210']);
  assert.deepStrictEqual(parseAllowedPostalCodes('null'), []);
  assert.deepStrictEqual(parseAllowedPostalCodes(null), []);
  assert.deepStrictEqual(parseAllowedPostalCodes(''), []);
});

test('isPostalCodeAllowed matches profile postal code or a standalone code in the address', () => {
  const allowed = ['1100', '1120'];
  assert.strictEqual(isPostalCodeAllowed([], '9999', 'anywhere'), true);
  assert.strictEqual(isPostalCodeAllowed(allowed, '1100', 'Somewhere 1'), true);
  assert.strictEqual(isPostalCodeAllowed(allowed, '', 'Hauptstraße 5, 1120 Wien'), true);
  assert.strictEqual(isPostalCodeAllowed(allowed, '1230', 'Hauptstraße 5, 1230 Wien'), false);
  // 11200 must not match 1120, and a house number 1100a-style prefix must not either
  assert.strictEqual(isPostalCodeAllowed(allowed, '', 'Weg 11200, 5020 Salzburg'), false);
});

test('isPostalCodeAllowed treats allow-list entries literally, not as regex', () => {
  assert.strictEqual(isPostalCodeAllowed(['1.00'], '', 'Straße 1, 1100 Wien'), false);
});

test('isFreeDelivery via coupon or threshold', () => {
  assert.strictEqual(isFreeDelivery({ isFreeShipping: true, freeDeliveryThreshold: 0, itemsSubtotal: 1 }), true);
  assert.strictEqual(isFreeDelivery({ isFreeShipping: false, freeDeliveryThreshold: 50, itemsSubtotal: 50 }), true);
  assert.strictEqual(isFreeDelivery({ isFreeShipping: false, freeDeliveryThreshold: 50, itemsSubtotal: 49.99 }), false);
  assert.strictEqual(isFreeDelivery({ isFreeShipping: false, freeDeliveryThreshold: 0, itemsSubtotal: 1000 }), false);
});

test('calculateOrderTotal subtracts coupon from items only, then adds delivery', () => {
  assert.strictEqual(calculateOrderTotal({ itemsSubtotal: 30, couponDiscount: 5, deliveryFee: 2.5 }), 27.5);
  assert.strictEqual(calculateOrderTotal({ itemsSubtotal: 0.1, couponDiscount: 0, deliveryFee: 0.2 }), 0.3);
  // a coupon larger than the items can't eat into the delivery fee
  assert.strictEqual(calculateOrderTotal({ itemsSubtotal: 10, couponDiscount: 15, deliveryFee: 3 }), 3);
});

test('isCouponStillEligible checks active flag, dates and minimum order value', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const base = { isActive: true, minOrderValue: 20, startDate: null, endDate: null };
  assert.strictEqual(isCouponStillEligible(base, 25, now), true);
  assert.strictEqual(isCouponStillEligible(base, 19.99, now), false);
  assert.strictEqual(isCouponStillEligible({ ...base, isActive: false }, 25, now), false);
  assert.strictEqual(isCouponStillEligible({ ...base, startDate: '2026-07-01' }, 25, now), false);
  assert.strictEqual(isCouponStillEligible({ ...base, endDate: '2026-06-01' }, 25, now), false);
  assert.strictEqual(isCouponStillEligible(null, 25, now), false);
});
