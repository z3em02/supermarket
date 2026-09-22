const assert = require('assert');
const { calculatePromotionForItem, validateAndCalculateCoupon } = require('../utils/pricingService');

console.log('--- Starting Promotions & Coupons Unit Tests ---');

// 1. Single product discount percentage
{
  const product = { id: 'p1', b2bPrice: 10.0, stock: 50 };
  const promo = {
    type: 'PRODUCT_DISCOUNT',
    discountPercent: 20,
    isActive: true
  };
  const res = calculatePromotionForItem(product, 3, promo);
  assert.strictEqual(res.price, 8.0, 'Unit price should be 8.00 after 20% discount');
  assert.strictEqual(res.subtotal, 24.0, 'Subtotal for 3 units should be 24.00');
  assert.strictEqual(res.discountAmount, 6.0, 'Discount amount should be 6.00');
  console.log('✔ Single product percentage discount test passed');
}

// 2. Single product promotional price
{
  const product = { id: 'p2', b2bPrice: 3.99, stock: 50 };
  const promo = {
    type: 'PRODUCT_DISCOUNT',
    promotionalPrice: 2.99,
    isActive: true
  };
  const res = calculatePromotionForItem(product, 4, promo);
  assert.strictEqual(res.price, 2.99, 'Unit price should be 2.99 promo price');
  assert.strictEqual(res.subtotal, 11.96, 'Subtotal for 4 units should be 11.96');
  assert.strictEqual(res.discountAmount, 4.0, 'Discount amount should be 4.00');
  console.log('✔ Single product promotional price test passed');
}

// 3. 2+1 Deal (BUY_X_GET_Y)
{
  const product = { id: 'p3', b2bPrice: 5.0, stock: 100 };
  const promo = {
    type: 'BUY_X_GET_Y',
    buyQuantity: 2,
    getYQuantity: 1,
    isActive: true
  };

  // Test quantities 1 through 7
  const expectations = [
    { qty: 1, free: 0, subtotal: 5.0, savings: 0.0 },
    { qty: 2, free: 0, subtotal: 10.0, savings: 0.0 },
    { qty: 3, free: 1, subtotal: 10.0, savings: 5.0 }, // 3 units: pay 2, 1 free
    { qty: 4, free: 1, subtotal: 15.0, savings: 5.0 }, // 4 units: pay 3, 1 free
    { qty: 5, free: 1, subtotal: 20.0, savings: 5.0 }, // 5 units: pay 4, 1 free
    { qty: 6, free: 2, subtotal: 20.0, savings: 10.0 }, // 6 units: pay 4, 2 free
    { qty: 7, free: 2, subtotal: 25.0, savings: 10.0 }  // 7 units: pay 5, 2 free
  ];

  for (const exp of expectations) {
    const res = calculatePromotionForItem(product, exp.qty, promo);
    assert.strictEqual(res.freeItems, exp.free, `Qty ${exp.qty} should have ${exp.free} free items`);
    assert.strictEqual(res.subtotal, exp.subtotal, `Qty ${exp.qty} subtotal mismatch`);
    assert.strictEqual(res.discountAmount, exp.savings, `Qty ${exp.qty} savings mismatch`);
  }
  console.log('✔ 2+1 multi-buy mathematical progression test passed (quantities 1 to 7)');
}

// 4. Coupon validation - Percentage with cap
{
  const coupon = {
    id: 'c1',
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10, // 10%
    maxDiscountAmount: 5.0, // Cap at 5.00
    minOrderValue: 20.0,
    isActive: true
  };

  // Cart below min order
  const belowMin = validateAndCalculateCoupon(coupon, [], 15.0);
  assert.strictEqual(belowMin.valid, false, 'Should reject when cart < minOrderValue');

  // Cart above min order, under cap: 10% of 30 = 3.00
  const validUnderCap = validateAndCalculateCoupon(coupon, [], 30.0);
  assert.strictEqual(validUnderCap.valid, true);
  assert.strictEqual(validUnderCap.discountAmount, 3.0);

  // Cart above min order, capped: 10% of 100 = 10 -> capped at 5.00
  const validCapped = validateAndCalculateCoupon(coupon, [], 100.0);
  assert.strictEqual(validCapped.valid, true);
  assert.strictEqual(validCapped.discountAmount, 5.0);
  console.log('✔ Percentage coupon with cap & min order test passed');
}

// 5. Combo Coupon - Discount + Free delivery
{
  const comboCoupon = {
    id: 'c2',
    code: 'COMBOFREE',
    discountType: 'COMBO',
    discountValue: 3.0, // €3 off
    freeShipping: true,
    minOrderValue: 10.0,
    isActive: true
  };

  const res = validateAndCalculateCoupon(comboCoupon, [{ productId: 'p1', quantity: 2 }], 25.0);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.discountAmount, 3.0);
  assert.strictEqual(res.isFreeShipping, true, 'Combo coupon should grant free shipping');
  console.log('✔ Combo coupon with discount + free delivery test passed');
}

// 6. Combo Coupon - Product Bundle Requirement
{
  const bundleCoupon = {
    id: 'c3',
    code: 'BUNDLEDEAL',
    discountType: 'FIXED',
    discountValue: 5.0,
    requiredProductIds: 'prod-a,prod-b',
    isActive: true
  };

  // Missing prod-b
  const invalidCart = validateAndCalculateCoupon(
    bundleCoupon,
    [{ productId: 'prod-a', quantity: 1 }, { productId: 'prod-c', quantity: 1 }],
    30.0
  );
  assert.strictEqual(invalidCart.valid, false, 'Should reject when required bundle item is missing');

  // Has both prod-a and prod-b
  const validCart = validateAndCalculateCoupon(
    bundleCoupon,
    [{ productId: 'prod-a', quantity: 1 }, { productId: 'prod-b', quantity: 2 }],
    30.0
  );
  assert.strictEqual(validCart.valid, true, 'Should accept when all bundle items present');
  assert.strictEqual(validCart.discountAmount, 5.0);
  console.log('✔ Combo coupon with required bundle products test passed');
}

// 7. Customer usage limit check
{
  const limitedCoupon = {
    id: 'c4',
    code: 'ONCE',
    discountType: 'FIXED',
    discountValue: 2.0,
    usageLimitPerCustomer: 1,
    isActive: true
  };

  const firstTry = validateAndCalculateCoupon(limitedCoupon, [], 20.0, 'cust-1', 0);
  assert.strictEqual(firstTry.valid, true);

  const secondTry = validateAndCalculateCoupon(limitedCoupon, [], 20.0, 'cust-1', 1);
  assert.strictEqual(secondTry.valid, false, 'Should reject when customer already used it 1 time');
  console.log('✔ Per-customer usage limit test passed');
}

console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
