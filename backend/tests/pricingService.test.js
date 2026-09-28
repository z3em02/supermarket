const { test } = require('node:test');
const assert = require('node:assert');
const { validateAndCalculateCoupon } = require('../utils/pricingService');

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
