const prisma = require('../lib/prisma');
const { calculatePromotionForItem, validateAndCalculateCoupon } = require('../utils/pricingService');
const { logAudit } = require('../lib/auditLog');

// Sanitize coupon code: trim, uppercase, alphanumeric with underscores/hyphens
const sanitizeCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
};

// GET /api/coupons - Admin: list all coupons
const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        _count: {
          select: { usages: true, orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/coupons - Admin: create coupon
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      freeShipping,
      requiredProductIds,
      minOrderValue,
      maxDiscountAmount,
      usageLimit,
      usageLimitPerCustomer,
      startDate,
      endDate,
      isActive
    } = req.body;

    const cleanCode = sanitizeCode(code);
    if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 30) {
      return res.status(400).json({
        error: 'Gutscheincode muss zwischen 2 und 30 Zeichen lang sein (Buchstaben, Zahlen, Bindestrich) / Coupon code must be between 2 and 30 characters.'
      });
    }

    const validTypes = ['PERCENTAGE', 'FIXED', 'COMBO'];
    if (!validTypes.includes(discountType)) {
      return res.status(400).json({
        error: `Ungültiger Rabatttyp. Erlaubt: ${validTypes.join(', ')}`
      });
    }

    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue < 0) {
      return res.status(400).json({ error: 'Rabattwert muss eine positive Zahl sein / Discount value must be positive.' });
    }

    if (discountType === 'PERCENTAGE' && numValue > 100) {
      return res.status(400).json({ error: 'Prozentualer Rabatt kann maximal 100% betragen / Percentage discount cannot exceed 100%.' });
    }

    // Check uniqueness
    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });
    if (existing) {
      return res.status(400).json({ error: `Gutscheincode "${cleanCode}" existiert bereits / Coupon code already exists.` });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        description: description ? description.trim() : null,
        discountType,
        discountValue: numValue,
        freeShipping: Boolean(freeShipping),
        requiredProductIds: requiredProductIds ? requiredProductIds.trim() : null,
        minOrderValue: minOrderValue ? Math.max(0, Number(minOrderValue)) : 0,
        maxDiscountAmount: maxDiscountAmount ? Math.max(0, Number(maxDiscountAmount)) : null,
        usageLimit: usageLimit ? Math.max(1, parseInt(usageLimit, 10)) : null,
        usageLimitPerCustomer: usageLimitPerCustomer ? Math.max(1, parseInt(usageLimitPerCustomer, 10)) : 1,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== false
      }
    });

    logAudit(req.admin?.email, 'CREATE_COUPON', `Gutscheincode erstellt: ${coupon.code} (${coupon.discountType} ${coupon.discountValue})`);

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/coupons/:id - Admin: update coupon
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountValue,
      freeShipping,
      requiredProductIds,
      minOrderValue,
      maxDiscountAmount,
      usageLimit,
      usageLimitPerCustomer,
      startDate,
      endDate,
      isActive
    } = req.body;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const dataToUpdate = {};

    if (code !== undefined) {
      const cleanCode = sanitizeCode(code);
      if (!cleanCode || cleanCode.length < 2) {
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
      if (cleanCode !== existing.code) {
        const duplicate = await prisma.coupon.findUnique({ where: { code: cleanCode } });
        if (duplicate) {
          return res.status(400).json({ error: `Gutscheincode "${cleanCode}" existiert bereits` });
        }
        dataToUpdate.code = cleanCode;
      }
    }

    if (discountType !== undefined) {
      const validTypes = ['PERCENTAGE', 'FIXED', 'COMBO'];
      if (!validTypes.includes(discountType)) {
        return res.status(400).json({ error: 'Invalid discount type' });
      }
      dataToUpdate.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const numValue = Number(discountValue);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({ error: 'Invalid discount value' });
      }
      dataToUpdate.discountValue = numValue;
    }

    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (freeShipping !== undefined) dataToUpdate.freeShipping = Boolean(freeShipping);
    if (requiredProductIds !== undefined) dataToUpdate.requiredProductIds = requiredProductIds ? requiredProductIds.trim() : null;
    if (minOrderValue !== undefined) dataToUpdate.minOrderValue = Math.max(0, Number(minOrderValue) || 0);
    if (maxDiscountAmount !== undefined) dataToUpdate.maxDiscountAmount = maxDiscountAmount ? Math.max(0, Number(maxDiscountAmount)) : null;
    if (usageLimit !== undefined) dataToUpdate.usageLimit = usageLimit ? Math.max(1, parseInt(usageLimit, 10)) : null;
    if (usageLimitPerCustomer !== undefined) dataToUpdate.usageLimitPerCustomer = usageLimitPerCustomer ? Math.max(1, parseInt(usageLimitPerCustomer, 10)) : 1;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.coupon.update({
      where: { id },
      data: dataToUpdate
    });

    logAudit(req.admin?.email, 'UPDATE_COUPON', `Gutscheincode aktualisiert: ${updated.code} (Aktiv: ${updated.isActive})`);

    res.json(updated);
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/coupons/:id - Admin: delete coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    await prisma.coupon.delete({ where: { id } });

    logAudit(req.admin?.email, 'DELETE_COUPON', `Gutscheincode gelöscht: ${existing.code}`);

    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/coupons/validate - Customer/Public: validate coupon code & calculate discount
const validateCoupon = async (req, res) => {
  try {
    const { code, items } = req.body;
    const cleanCode = sanitizeCode(code);

    if (!cleanCode) {
      return res.status(400).json({ valid: false, error: 'Bitte geben Sie einen Gutscheincode ein / Please enter a coupon code' });
    }

    const rawItems = Array.isArray(items) ? items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ valid: false, error: 'Warenkorb ist leer / Cart is empty' });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });

    if (!coupon) {
      return res.status(404).json({ valid: false, error: 'Ungültiger Gutscheincode / Invalid coupon code' });
    }

    // Customer usage check if customer is authenticated
    const customerId = req.customer?.customerId || null;
    let customerUsageCount = 0;
    if (customerId) {
      customerUsageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, customerId }
      });
    }

    // Fetch products and active promotions to recalculate actual subtotal
    const productIds = rawItems.map(i => i.productId).filter(Boolean);
    const [products, promotions] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds } } }),
      prisma.promotion.findMany({
        where: {
          productId: { in: productIds },
          isActive: true
        }
      })
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const promoMap = new Map(promotions.map(pr => [pr.productId, pr]));

    let calculatedSubtotal = 0;
    let totalPromoSavings = 0;

    for (const item of rawItems) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;
      const promo = promoMap.get(item.productId);
      const itemResult = calculatePromotionForItem(prod, item.quantity, promo);
      calculatedSubtotal += itemResult.subtotal;
      totalPromoSavings += itemResult.appliedSavings;
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    const result = validateAndCalculateCoupon(
      coupon,
      rawItems,
      calculatedSubtotal,
      customerId,
      customerUsageCount
    );

    if (!result.valid) {
      return res.status(400).json(result);
    }

    res.json({
      valid: true,
      coupon: result.coupon,
      discountAmount: result.discountAmount,
      isFreeShipping: result.isFreeShipping,
      itemsSubtotal: calculatedSubtotal,
      totalPromoSavings: Number(totalPromoSavings.toFixed(2)),
      finalItemsTotal: Number(Math.max(0, calculatedSubtotal - result.discountAmount).toFixed(2))
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
};
