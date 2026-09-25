const prisma = require('../lib/prisma');
const { logAudit } = require('../lib/auditLog');
const { parseValidDate } = require('../utils/validation');

// GET /api/promotions - Admin: list all promotions
const getPromotions = async (req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            nameDe: true,
            nameAr: true,
            sku: true,
            b2bPrice: true,
            stock: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(promotions);
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/promotions/active - Public: list currently active promotions for storefront
const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            nameDe: true,
            nameAr: true,
            b2bPrice: true,
            stock: true,
            imageUrl: true
          }
        }
      }
    });

    res.json(promotions);
  } catch (error) {
    console.error('Get active promotions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/promotions - Admin: create offer (single-product discount or 2+1)
const createPromotion = async (req, res) => {
  try {
    const {
      productId,
      titleDe,
      titleAr,
      type,
      discountPercent,
      promotionalPrice,
      buyQuantity,
      getYQuantity,
      badgeTextDe,
      badgeTextAr,
      startDate,
      endDate,
      isActive
    } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Produkt auswählen ist erforderlich / Product is required.' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!product) {
      return res.status(404).json({ error: 'Produkt nicht gefunden / Product not found.' });
    }

    const validTypes = ['PRODUCT_DISCOUNT', 'BUY_X_GET_Y'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Ungültiger Angebotstyp. Erlaubt: ${validTypes.join(', ')}` });
    }

    let parsedPercent = null;
    let parsedPromoPrice = null;
    let parsedBuyQty = null;
    let parsedGetYQty = null;

    if (type === 'PRODUCT_DISCOUNT') {
      if (promotionalPrice != null && promotionalPrice !== '') {
        const pPrice = Number(promotionalPrice);
        if (isNaN(pPrice) || pPrice < 0) {
          return res.status(400).json({ error: 'Aktionspreis muss eine positive Zahl sein.' });
        }
        if (pPrice >= product.b2bPrice) {
          return res.status(400).json({
            error: `Aktionspreis (€${pPrice.toFixed(2)}) muss niedriger als der Normalpreis (€${product.b2bPrice.toFixed(2)}) sein.`
          });
        }
        parsedPromoPrice = pPrice;
      } else if (discountPercent != null && discountPercent !== '') {
        const pct = Number(discountPercent);
        if (isNaN(pct) || pct <= 0 || pct >= 100) {
          return res.status(400).json({ error: 'Prozentualer Rabatt muss zwischen 1% und 99% liegen.' });
        }
        parsedPercent = pct;
      } else {
        return res.status(400).json({ error: 'Bitte geben Sie entweder einen Aktionspreis oder einen Rabatt in % an.' });
      }
    } else if (type === 'BUY_X_GET_Y') {
      parsedBuyQty = Math.max(1, parseInt(buyQuantity, 10) || 2);
      parsedGetYQty = Math.max(1, parseInt(getYQuantity, 10) || 1);
    }

    // Default badges if not supplied
    let defBadgeDe = badgeTextDe?.trim();
    let defBadgeAr = badgeTextAr?.trim();
    if (!defBadgeDe) {
      if (type === 'BUY_X_GET_Y') {
        defBadgeDe = `${parsedBuyQty}+${parsedGetYQty} Gratis`;
        defBadgeAr = defBadgeAr || `${parsedBuyQty}+${parsedGetYQty} مجاناً`;
      } else if (parsedPercent) {
        defBadgeDe = `-${parsedPercent}% Rabatt`;
        defBadgeAr = defBadgeAr || `خصم ${parsedPercent}%`;
      } else if (parsedPromoPrice != null) {
        defBadgeDe = 'Aktionspreis';
        defBadgeAr = defBadgeAr || 'عرض خاص';
      }
    }

    let parsedStartDate = null;
    if (startDate) {
      parsedStartDate = parseValidDate(startDate);
      if (!parsedStartDate) return res.status(400).json({ error: 'Invalid startDate format' });
    }
    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = parseValidDate(endDate);
      if (!parsedEndDate) return res.status(400).json({ error: 'Invalid endDate format' });
    }
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    const promotion = await prisma.promotion.create({
      data: {
        productId,
        titleDe: titleDe ? titleDe.trim() : (type === 'BUY_X_GET_Y' ? `${parsedBuyQty}+${parsedGetYQty} Gratis Aktion` : 'Sonderangebot'),
        titleAr: titleAr ? titleAr.trim() : null,
        type,
        discountPercent: parsedPercent,
        promotionalPrice: parsedPromoPrice,
        buyQuantity: parsedBuyQty,
        getYQuantity: parsedGetYQty,
        badgeTextDe: defBadgeDe || null,
        badgeTextAr: defBadgeAr || null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isActive: isActive !== false
      },
      include: {
        product: true
      }
    });

    logAudit(req.admin?.email, 'CREATE_PROMOTION', `Aktion erstellt für ${promotion.product?.nameDe || promotion.product?.name || promotion.productId}: ${promotion.titleDe}`);

    res.status(201).json(promotion);
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/promotions/:id - Admin: update offer
const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titleDe,
      titleAr,
      type,
      discountPercent,
      promotionalPrice,
      buyQuantity,
      getYQuantity,
      badgeTextDe,
      badgeTextAr,
      startDate,
      endDate,
      isActive
    } = req.body;

    const existing = await prisma.promotion.findUnique({
      where: { id },
      include: { product: true }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const updateData = {};
    if (titleDe !== undefined) updateData.titleDe = titleDe ? titleDe.trim() : existing.titleDe;
    if (titleAr !== undefined) updateData.titleAr = titleAr ? titleAr.trim() : null;
    if (badgeTextDe !== undefined) updateData.badgeTextDe = badgeTextDe ? badgeTextDe.trim() : null;
    if (badgeTextAr !== undefined) updateData.badgeTextAr = badgeTextAr ? badgeTextAr.trim() : null;

    let newStartDate = existing.startDate;
    let newEndDate = existing.endDate;
    if (startDate !== undefined) {
      if (startDate) {
        newStartDate = parseValidDate(startDate);
        if (!newStartDate) return res.status(400).json({ error: 'Invalid startDate format' });
      } else {
        newStartDate = null;
      }
      updateData.startDate = newStartDate;
    }
    if (endDate !== undefined) {
      if (endDate) {
        newEndDate = parseValidDate(endDate);
        if (!newEndDate) return res.status(400).json({ error: 'Invalid endDate format' });
      } else {
        newEndDate = null;
      }
      updateData.endDate = newEndDate;
    }
    if (newStartDate && newEndDate && newStartDate > newEndDate) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const currentType = type || existing.type;
    if (currentType === 'PRODUCT_DISCOUNT') {
      if (promotionalPrice !== undefined) {
        if (promotionalPrice !== null && promotionalPrice !== '') {
          const p = Number(promotionalPrice);
          if (isNaN(p) || p < 0 || p >= existing.product.b2bPrice) {
            return res.status(400).json({ error: 'Ungültiger Aktionspreis.' });
          }
          updateData.promotionalPrice = p;
          updateData.discountPercent = null;
        } else {
          updateData.promotionalPrice = null;
        }
      }
      if (discountPercent !== undefined && (promotionalPrice === undefined || promotionalPrice === null || promotionalPrice === '')) {
        const pct = Number(discountPercent);
        if (isNaN(pct) || pct <= 0 || pct >= 100) {
          return res.status(400).json({ error: 'Prozentualer Rabatt muss zwischen 1% und 99% liegen.' });
        }
        updateData.discountPercent = pct;
        updateData.promotionalPrice = null;
      }
    } else if (currentType === 'BUY_X_GET_Y') {
      if (buyQuantity !== undefined) updateData.buyQuantity = Math.max(1, parseInt(buyQuantity, 10) || 2);
      if (getYQuantity !== undefined) updateData.getYQuantity = Math.max(1, parseInt(getYQuantity, 10) || 1);
      updateData.discountPercent = null;
      updateData.promotionalPrice = null;
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: updateData,
      include: { product: true }
    });

    logAudit(req.admin?.email, 'UPDATE_PROMOTION', `Aktion aktualisiert: ${updated.titleDe} (Aktiv: ${updated.isActive})`);

    res.json(updated);
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/promotions/:id - Admin: delete offer
const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    await prisma.promotion.delete({ where: { id } });

    logAudit(req.admin?.email, 'DELETE_PROMOTION', `Aktion gelöscht: ${existing.titleDe}`);

    res.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPromotions,
  getActivePromotions,
  createPromotion,
  updatePromotion,
  deletePromotion
};
