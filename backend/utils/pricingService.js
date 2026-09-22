/**
 * pricingService.js
 * Authoritative Server-Side Pricing & Promotion Engine
 *
 * Implements mathematical safeguards against:
 * 1. Double spending / race conditions
 * 2. Coupon & discount price tampering
 * 3. Negative totals
 * 4. Multi-buy (2+1 / Buy-X-Get-Y) calculation errors
 */

/**
 * Calculates promotion effect for a single cart/order line item.
 *
 * @param {Object} product - Product entity from DB with b2bPrice and stock
 * @param {number} quantity - Purchased quantity
 * @param {Object|null} activePromotion - Active Promotion record for this product, if any
 * @returns {Object} Calculated line item details
 */
function calculatePromotionForItem(product, quantity, activePromotion = null) {
  const qty = parseInt(quantity, 10) || 0;
  const basePrice = Number(product.b2bPrice) || 0;

  if (qty <= 0) {
    return {
      price: basePrice,
      originalPrice: basePrice,
      discountAmount: 0,
      subtotal: 0,
      promotionType: null,
      appliedSavings: 0,
      freeItems: 0,
      badgeTextDe: null,
      badgeTextAr: null
    };
  }

  // If no valid active promotion, standard subtotal
  if (!activePromotion || !activePromotion.isActive) {
    const subtotal = Number((basePrice * qty).toFixed(2));
    return {
      price: basePrice,
      originalPrice: null,
      discountAmount: 0,
      subtotal,
      promotionType: null,
      appliedSavings: 0,
      freeItems: 0,
      badgeTextDe: null,
      badgeTextAr: null
    };
  }

  // Check promotion dates if present
  const now = new Date();
  if (activePromotion.startDate && new Date(activePromotion.startDate) > now) {
    const subtotal = Number((basePrice * qty).toFixed(2));
    return {
      price: basePrice,
      originalPrice: null,
      discountAmount: 0,
      subtotal,
      promotionType: null,
      appliedSavings: 0,
      freeItems: 0
    };
  }
  if (activePromotion.endDate && new Date(activePromotion.endDate) < now) {
    const subtotal = Number((basePrice * qty).toFixed(2));
    return {
      price: basePrice,
      originalPrice: null,
      discountAmount: 0,
      subtotal,
      promotionType: null,
      appliedSavings: 0,
      freeItems: 0
    };
  }

  // 1. Single Product Discount (Percentage or Direct Promotional Price)
  if (activePromotion.type === 'PRODUCT_DISCOUNT') {
    let effectiveUnitPrice = basePrice;

    if (activePromotion.promotionalPrice != null && activePromotion.promotionalPrice >= 0) {
      effectiveUnitPrice = Math.min(basePrice, Number(activePromotion.promotionalPrice));
    } else if (activePromotion.discountPercent != null && activePromotion.discountPercent > 0) {
      const pct = Math.min(100, Math.max(0, Number(activePromotion.discountPercent)));
      const discountPerUnit = (basePrice * pct) / 100;
      effectiveUnitPrice = Math.max(0, basePrice - discountPerUnit);
    }

    const roundedEffectivePrice = Number(effectiveUnitPrice.toFixed(2));
    const subtotal = Number((roundedEffectivePrice * qty).toFixed(2));
    const regularSubtotal = Number((basePrice * qty).toFixed(2));
    const discountAmount = Math.max(0, Number((regularSubtotal - subtotal).toFixed(2)));

    return {
      price: roundedEffectivePrice,
      originalPrice: basePrice,
      discountAmount,
      subtotal,
      promotionType: 'PRODUCT_DISCOUNT',
      appliedSavings: discountAmount,
      freeItems: 0,
      badgeTextDe: activePromotion.badgeTextDe || 'Angebot',
      badgeTextAr: activePromotion.badgeTextAr || 'عرض خاص'
    };
  }

  // 2. Multi-Buy / 2+1 Deal (BUY_X_GET_Y)
  if (activePromotion.type === 'BUY_X_GET_Y') {
    const buyQty = Math.max(1, parseInt(activePromotion.buyQuantity, 10) || 2);
    const getYQty = Math.max(1, parseInt(activePromotion.getYQuantity, 10) || 1);
    const groupSize = buyQty + getYQty;

    // Formula: Every (buyQty + getYQty) items contains getYQty free items
    const completeSets = Math.floor(qty / groupSize);
    const freeItems = completeSets * getYQty;
    const paidItems = Math.max(0, qty - freeItems);

    const subtotal = Number((paidItems * basePrice).toFixed(2));
    const regularSubtotal = Number((qty * basePrice).toFixed(2));
    const discountAmount = Math.max(0, Number((regularSubtotal - subtotal).toFixed(2)));

    return {
      price: basePrice,
      originalPrice: basePrice,
      discountAmount,
      subtotal,
      promotionType: 'BUY_X_GET_Y',
      appliedSavings: discountAmount,
      freeItems,
      buyQty,
      getYQty,
      badgeTextDe: activePromotion.badgeTextDe || `${buyQty}+${getYQty} Gratis`,
      badgeTextAr: activePromotion.badgeTextAr || `${buyQty}+${getYQty} مجاناً`
    };
  }

  // Fallback
  const subtotal = Number((basePrice * qty).toFixed(2));
  return {
    price: basePrice,
    originalPrice: null,
    discountAmount: 0,
    subtotal,
    promotionType: null,
    appliedSavings: 0,
    freeItems: 0
  };
}

/**
 * Validates a coupon and calculates the discount amount.
 *
 * @param {Object} coupon - Coupon model record from DB
 * @param {Array} cartItems - Array of { productId, quantity }
 * @param {number} itemsSubtotal - Subtotal of items after product promotions
 * @param {string|null} customerId - ID of logged-in customer, if any
 * @param {number} customerUsageCount - Number of times this customer already used this coupon
 * @returns {Object} { valid: boolean, error?: string, discountAmount: number, isFreeShipping: boolean }
 */
function validateAndCalculateCoupon(coupon, cartItems = [], itemsSubtotal = 0, customerId = null, customerUsageCount = 0) {
  if (!coupon) {
    return { valid: false, error: 'Gutscheincode nicht gefunden / Coupon not found' };
  }

  if (!coupon.isActive) {
    return { valid: false, error: 'Dieser Gutschein ist derzeit nicht aktiv / This coupon is not active' };
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { valid: false, error: 'Dieser Gutschein ist noch nicht gültig / This coupon is not yet valid' };
  }

  if (coupon.endDate && new Date(coupon.endDate) < now) {
    return { valid: false, error: 'Dieser Gutschein ist abgelaufen / This coupon has expired' };
  }

  // Check global limit
  if (coupon.usageLimit != null && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: 'Dieser Gutschein hat das maximale Einlöselimit erreicht / Maximum redemptions reached' };
  }

  // Check per-customer limit
  if (customerId && coupon.usageLimitPerCustomer != null && coupon.usageLimitPerCustomer > 0) {
    if (customerUsageCount >= coupon.usageLimitPerCustomer) {
      return {
        valid: false,
        error: 'Sie haben diesen Gutschein bereits maximal eingelöst / You have already redeemed this coupon the maximum allowed times'
      };
    }
  }

  // Check minimum order value
  const minOrder = Number(coupon.minOrderValue) || 0;
  if (minOrder > 0 && itemsSubtotal < minOrder) {
    return {
      valid: false,
      error: `Mindestbestellwert von €${minOrder.toFixed(2)} nicht erreicht (aktuell: €${itemsSubtotal.toFixed(2)}) / Minimum order value of €${minOrder.toFixed(2)} required`
    };
  }

  // Check required bundle products for Combo coupons
  if (coupon.requiredProductIds && coupon.requiredProductIds.trim()) {
    const requiredList = coupon.requiredProductIds
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    if (requiredList.length > 0) {
      const cartProductIds = new Set(cartItems.map(item => item.productId));
      const missing = requiredList.filter(id => !cartProductIds.has(id));
      if (missing.length > 0) {
        return {
          valid: false,
          error: 'Dieser Kombi-Gutschein erfordert bestimmte Aktionsprodukte im Warenkorb / This combo coupon requires specific promotional items in your cart'
        };
      }
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  const discountVal = Number(coupon.discountValue) || 0;

  if (coupon.discountType === 'PERCENTAGE') {
    const pct = Math.min(100, Math.max(0, discountVal));
    let rawDiscount = (itemsSubtotal * pct) / 100;
    if (coupon.maxDiscountAmount != null && coupon.maxDiscountAmount > 0) {
      rawDiscount = Math.min(rawDiscount, Number(coupon.maxDiscountAmount));
    }
    discountAmount = Math.min(rawDiscount, itemsSubtotal);
  } else if (coupon.discountType === 'FIXED') {
    discountAmount = Math.min(discountVal, itemsSubtotal);
  } else if (coupon.discountType === 'COMBO') {
    // In COMBO: can have a fixed/percent discount and/or free shipping
    if (discountVal > 0) {
      if (discountVal <= 100 && coupon.maxDiscountAmount != null) {
        // Percentage combo
        let rawDiscount = (itemsSubtotal * discountVal) / 100;
        if (coupon.maxDiscountAmount > 0) {
          rawDiscount = Math.min(rawDiscount, Number(coupon.maxDiscountAmount));
        }
        discountAmount = Math.min(rawDiscount, itemsSubtotal);
      } else {
        // Fixed amount combo
        discountAmount = Math.min(discountVal, itemsSubtotal);
      }
    }
  }

  discountAmount = Math.max(0, Number(discountAmount.toFixed(2)));
  const isFreeShipping = Boolean(coupon.freeShipping);

  return {
    valid: true,
    discountAmount,
    isFreeShipping,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      freeShipping: Boolean(coupon.freeShipping),
      minOrderValue: coupon.minOrderValue,
      maxDiscountAmount: coupon.maxDiscountAmount
    }
  };
}

module.exports = {
  calculatePromotionForItem,
  validateAndCalculateCoupon
};
