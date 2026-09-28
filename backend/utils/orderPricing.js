/**
 * orderPricing.js
 * Pure (DB-free) order math shared by createOrder (orderController.js) and
 * editOrder (orderModificationController.js), so both paths price an order
 * the same way and the logic can be unit-tested without Prisma (see tests/).
 */
const { calculatePromotionForItem } = require('./pricingService');
const { roundMoney } = require('./money');

// A positive integer quantity, or null for anything that shouldn't become an
// order line ("0", "0.5", "abc", negative numbers, missing values).
const parseQuantity = (raw) => {
  const qty = parseInt(raw, 10);
  return Number.isInteger(qty) && qty > 0 ? qty : null;
};

// One entry per product, quantities summed, in first-seen order; lines that
// can't become an order line (no product, quantity 0/invalid) are dropped.
// Everything downstream assumes one line per product: the stock check, 2+1
// promotions (3 + 3 of a product is two free items, 3 + 3 lines priced
// separately would be too), and editOrder's per-product stock deltas.
const mergeOrderItems = (items) => {
  const merged = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const qty = parseQuantity(item?.quantity);
    if (!item?.productId || qty === null) continue;
    const productId = String(item.productId);
    merged.set(productId, (merged.get(productId) || 0) + qty);
  }
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
};

// Prices one order line from the authoritative DB product (never a
// client-supplied price) plus its active promotion, if any.
const buildOrderLine = (product, quantity, promotion) => {
  const result = calculatePromotionForItem(product, quantity, promotion);
  return {
    productId: product.id,
    productName: product.name,
    quantity,
    price: result.price,
    originalPrice: result.originalPrice,
    discountAmount: result.discountAmount,
    promotionType: result.promotionType,
    subtotal: result.subtotal,
    appliedSavings: result.appliedSavings
  };
};

const summarizeOrderLines = (lines) => ({
  itemsSubtotal: roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0)),
  promotionDiscount: roundMoney(lines.reduce((sum, line) => sum + line.appliedSavings, 0))
});

// StoreSettings.allowedPostalCodes is a free-text admin field ("1100, 1120;1230").
// Older rows may hold the literal string 'null'.
const parseAllowedPostalCodes = (raw) =>
  (raw && raw !== 'null' ? String(raw) : '')
    .split(/[,;\s]+/)
    .map((code) => code.trim())
    .filter((code) => code && code !== 'null');

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// An order is deliverable if either the customer's profile postal code or a
// standalone number in the delivery address is on the allow-list. An empty
// allow-list means "no postal code restriction".
const isPostalCodeAllowed = (allowedPostalCodes, customerPostalCode, deliveryAddress) => {
  if (allowedPostalCodes.length === 0) return true;
  const profilePostal = String(customerPostalCode || '').trim();
  if (profilePostal && allowedPostalCodes.includes(profilePostal)) return true;
  const address = String(deliveryAddress || '').trim();
  return allowedPostalCodes.some((code) =>
    new RegExp(`(^|[^0-9])${escapeRegExp(code)}([^0-9]|$)`).test(address)
  );
};

const isFreeDelivery = ({ isFreeShipping, freeDeliveryThreshold, itemsSubtotal }) =>
  Boolean(isFreeShipping) || (freeDeliveryThreshold > 0 && itemsSubtotal >= freeDeliveryThreshold);

// The coupon discount can never push the items below zero; the delivery fee
// is charged on top regardless.
const calculateOrderTotal = ({ itemsSubtotal, couponDiscount, deliveryFee }) => {
  const itemsAfterCoupon = Math.max(0, roundMoney(itemsSubtotal - couponDiscount));
  return roundMoney(itemsAfterCoupon + deliveryFee);
};

// Eligibility checks that can change when an admin edits an order (active
// flag, date range, minimum order value). Usage limits are deliberately not
// re-checked: this order's usage was already counted when it was placed.
const isCouponStillEligible = (coupon, itemsSubtotal, now = new Date()) => {
  if (!coupon || !coupon.isActive) return false;
  if (coupon.startDate && new Date(coupon.startDate) > now) return false;
  if (coupon.endDate && new Date(coupon.endDate) < now) return false;
  return itemsSubtotal >= (Number(coupon.minOrderValue) || 0);
};

module.exports = {
  parseQuantity,
  mergeOrderItems,
  buildOrderLine,
  summarizeOrderLines,
  parseAllowedPostalCodes,
  isPostalCodeAllowed,
  isFreeDelivery,
  calculateOrderTotal,
  isCouponStillEligible
};
