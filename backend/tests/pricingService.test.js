const { test } = require('node:test');
const assert = require('node:assert');
const { validateAndCalculateCoupon, selectApplicablePromotions } = require('../utils/pricingService');

const comboCoupon = {
  code: 'BUNDLE',
  isActive: true,
  discountType: 'FIXED',
  discountValue: 10,
  freeShipping: true,
  requiredProductIds: 'p-required',
  minOrderValue: 0,
  usageLimit: null,
  usageLimitPerCustomer: 1,
  usedCount: 0
};

test('combo coupon requires its bundle products to actually be ordered', () => {
  const withRequired = [{ productId: 'p-other', quantity: 2 }, { productId: 'p-required', quantity: 1 }];
  assert.strictEqual(validateAndCalculateCoupon(comboCoupon, withRequired, 50, 'c1', 0).valid, true);

  for (const quantity of [0, '0', -1, 'abc', undefined]) {
    const result = validateAndCalculateCoupon(
      comboCoupon,
      [{ productId: 'p-other', quantity: 2 }, { productId: 'p-required', quantity }],
      50,
      'c1',
      0
    );
    assert.strictEqual(result.valid, false, `quantity ${JSON.stringify(quantity)} must not satisfy the bundle`);
  }
});

test('selectApplicablePromotions picks the in-window promotion, newest first, regardless of input order', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const promo = (id, productId, extra = {}) => ({
    id, productId, isActive: true, startDate: null, endDate: null, createdAt: '2026-06-01T00:00:00Z', ...extra
  });
  const promotions = [
    promo('current', 'p1'),
    // created later but not started yet — must not shadow the running offer
    promo('scheduled', 'p1', { createdAt: '2026-06-10T00:00:00Z', startDate: '2026-06-20T00:00:00Z' }),
    promo('expired', 'p2', { endDate: '2026-06-01T00:00:00Z' }),
    promo('inactive', 'p3', { isActive: false }),
    promo('older', 'p4', { createdAt: '2026-05-01T00:00:00Z' }),
    promo('newer', 'p4', { createdAt: '2026-06-02T00:00:00Z' })
  ];

  for (const list of [promotions, [...promotions].reverse()]) {
    const picked = selectApplicablePromotions(list, now);
    assert.strictEqual(picked.get('p1').id, 'current');
    assert.strictEqual(picked.has('p2'), false);
    assert.strictEqual(picked.has('p3'), false);
    assert.strictEqual(picked.get('p4').id, 'newer');
  }
});
