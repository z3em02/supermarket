const prisma = require('../lib/prisma');
const {
  sendCustomerOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderModificationEmail
} = require('../utils/emailService');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const {
  calculatePromotionForItem,
  validateAndCalculateCoupon
} = require('../utils/pricingService');

// Stock is deducted for every order from creation onward and only ever restored
// once an order reaches one of these terminal decline states.
const DECLINED_STATUSES = ['declined', 'rejected', 'canceled', 'cancelled'];

// Machine values for the delivery time-slot picker in the cart.
const ALLOWED_DELIVERY_SLOTS = ['today_16_18', 'tomorrow_10_12', 'tomorrow_16_18'];

// Atomically decrements stock only if enough is available (guards against two
// concurrent orders overselling the same product); throws if not. Must run
// inside a prisma.$transaction so a mid-loop failure rolls back prior decrements.
const decrementStockOrThrow = async (tx, productId, quantity, productName) => {
  const result = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } }
  });
  if (result.count === 0) {
    const err = new Error(`Insufficient stock for "${productName || productId}"`);
    err.isStockError = true;
    throw err;
  }
};

// Throws an Error flagged so the outer catch block reports it as a 400 with
// the actual message, instead of falling through to a generic 500 — these are
// expected business-rule rejections (coupon inactive/expired/limit reached),
// not server failures.
const couponError = (message) => {
  const err = new Error(message);
  err.isCouponError = true;
  return err;
};

const getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: {
            product: true
          }
        },
        accounting: true,
        coupon: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: {
            product: true
          }
        },
        accounting: true,
        coupon: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { notes } = req.body;
    const customerId = req.customer?.customerId || req.body.customerId;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer authentication is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer account not found' });
    }

    if (!customer.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before submitting an order.',
        needsVerification: true,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified
      });
    }

    if (!customer.phoneVerified) {
      return res.status(403).json({
        error: 'Please verify your phone number before submitting an order.',
        needsVerification: true,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified
      });
    }

    // Accept either items or orderItems
    const rawItems = req.body.orderItems || req.body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const cleanCouponCode = req.body.couponCode
      ? String(req.body.couponCode).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
      : null;

    // Fetch product details and active promotions
    const productIds = rawItems.map(i => i.productId).filter(Boolean);
    const [dbProducts, activePromotions] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds } } }),
      prisma.promotion.findMany({
        where: {
          productId: { in: productIds },
          isActive: true
        }
      })
    ]);

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    const promoMap = new Map(activePromotions.map(pr => [pr.productId, pr]));

    let itemsSubtotal = 0;
    let totalPromoSavings = 0;
    const orderItemsWithDetails = [];

    for (const item of rawItems) {
      if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
        continue;
      }

      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product with id ${item.productId} not found` });
      }

      const qty = parseInt(item.quantity, 10);
      if (product.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`
        });
      }

      const promo = promoMap.get(item.productId);
      const promoResult = calculatePromotionForItem(product, qty, promo);

      itemsSubtotal += promoResult.subtotal;
      totalPromoSavings += promoResult.appliedSavings;

      orderItemsWithDetails.push({
        productId: item.productId,
        productName: product.name,
        quantity: qty,
        price: promoResult.price,
        originalPrice: promoResult.originalPrice,
        discountAmount: promoResult.discountAmount,
        promotionType: promoResult.promotionType,
        subtotal: promoResult.subtotal
      });
    }

    if (orderItemsWithDetails.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one valid item' });
    }

    itemsSubtotal = Number(itemsSubtotal.toFixed(2));
    totalPromoSavings = Number(totalPromoSavings.toFixed(2));

    // Delivery rules: minimum order value, service area and delivery fee
    const storeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const minOrderValue = storeSettings?.minOrderValue || 0;
    const deliveryFeeSetting = storeSettings?.deliveryFee || 0;
    const freeDeliveryThreshold = storeSettings?.freeDeliveryThreshold || 0;
    const allowedPostalCodes = (storeSettings?.allowedPostalCodes || '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean);

    if (minOrderValue > 0 && itemsSubtotal < minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value is €${minOrderValue.toFixed(2)}. Your cart total is €${itemsSubtotal.toFixed(2)}.`
      });
    }

    if (allowedPostalCodes.length > 0 && !allowedPostalCodes.includes((customer.postalCode || '').trim())) {
      return res.status(400).json({
        error: 'Sorry, we do not currently deliver to your postal code.'
      });
    }

    // Coupon evaluation
    let appliedCoupon = null;
    let couponDiscount = 0;
    let isFreeShipping = false;

    if (cleanCouponCode) {
      const couponRecord = await prisma.coupon.findUnique({
        where: { code: cleanCouponCode }
      });

      if (!couponRecord) {
        return res.status(400).json({ error: `Ungültiger Gutscheincode "${cleanCouponCode}" / Invalid coupon code.` });
      }

      const userUsageCount = await prisma.couponUsage.count({
        where: { couponId: couponRecord.id, customerId: customer.id }
      });

      const couponEval = validateAndCalculateCoupon(
        couponRecord,
        rawItems,
        itemsSubtotal,
        customer.id,
        userUsageCount
      );

      if (!couponEval.valid) {
        return res.status(400).json({ error: couponEval.error });
      }

      appliedCoupon = couponRecord;
      couponDiscount = couponEval.discountAmount;
      isFreeShipping = couponEval.isFreeShipping;
    }

    const deliveryFee = isFreeShipping
      ? 0
      : (deliveryFeeSetting <= 0
        ? 0
        : (freeDeliveryThreshold > 0 && itemsSubtotal >= freeDeliveryThreshold ? 0 : deliveryFeeSetting));

    const finalItemsTotal = Math.max(0, Number((itemsSubtotal - couponDiscount).toFixed(2)));
    const totalAmount = Number((finalItemsTotal + deliveryFee).toFixed(2));

    const deliverySlot = ALLOWED_DELIVERY_SLOTS.includes(req.body.deliverySlot) ? req.body.deliverySlot : null;

    const addressParts = [
      customer.street && `${customer.street} ${customer.houseNumber || ''}`.trim(),
      customer.postalCode && customer.city && `${customer.postalCode} ${customer.city}`.trim(),
      customer.floorApartment && `Apt/Floor: ${customer.floorApartment}`
    ].filter(Boolean);

    const deliveryAddress = req.body.deliveryAddress || addressParts.join(', ') || 'Home Delivery Address';
    const deliveryNotes = req.body.deliveryNotes || customer.deliveryNotes || notes || null;

    let freshCoupon = null;

    const order = await prisma.$transaction(async (tx) => {
      // Re-verify coupon atomically inside transaction to eliminate race conditions.
      if (appliedCoupon) {
        freshCoupon = await tx.coupon.findUnique({
          where: { id: appliedCoupon.id }
        });

        if (!freshCoupon) {
          throw couponError('Gutschein ist nicht mehr aktiv / Coupon is no longer active.');
        }

        if (freshCoupon.usageLimitPerCustomer) {
          const freshCustCount = await tx.couponUsage.count({
            where: { couponId: freshCoupon.id, customerId: customer.id }
          });
          if (freshCustCount >= freshCoupon.usageLimitPerCustomer) {
            throw couponError('Sie haben diesen Gutschein bereits maximal eingelöst / Coupon already redeemed.');
          }
        }

        // Atomically re-check isActive + the global usage limit and increment usedCount
        // in a single guarded UPDATE, the same way decrementStockOrThrow prevents
        // overselling — a plain read-then-write here would let two concurrent orders
        // both read "under limit" and both squeeze through past the cap.
        const guardWhere = { id: freshCoupon.id, isActive: true };
        if (freshCoupon.usageLimit != null) {
          guardWhere.usedCount = { lt: freshCoupon.usageLimit };
        }
        const couponGuard = await tx.coupon.updateMany({
          where: guardWhere,
          data: { usedCount: { increment: 1 } }
        });
        if (couponGuard.count === 0) {
          throw couponError('Gutschein ist nicht mehr aktiv oder das Limit wurde soeben erreicht / Coupon is no longer active or its usage limit was just reached.');
        }
      }

      // Deduct stock atomically per item before creating the order
      for (const item of orderItemsWithDetails) {
        await decrementStockOrThrow(tx, item.productId, item.quantity, item.productName);
      }

      const createdOrder = await tx.order.create({
        data: {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          deliveryAddress,
          deliveryNotes,
          deliverySlot,
          paymentMethod: 'cash_on_delivery',
          status: 'pending',
          itemsSubtotal,
          couponId: appliedCoupon ? appliedCoupon.id : null,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          couponDiscount,
          promotionDiscount: totalPromoSavings,
          isFreeShipping,
          totalAmount,
          notes: notes || null,
          orderItems: {
            create: orderItemsWithDetails.map(({ productId, quantity, price, originalPrice, discountAmount, promotionType, subtotal }) => ({
              productId,
              quantity,
              price,
              originalPrice,
              discountAmount,
              promotionType,
              subtotal
            }))
          }
        },
        include: {
          customer: { select: CUSTOMER_PUBLIC_SELECT },
          orderItems: {
            include: {
              product: true
            }
          },
          coupon: true
        }
      });

      // Log coupon usage
      if (appliedCoupon) {
        await tx.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            customerId: customer.id,
            orderId: createdOrder.id
          }
        });

        // Narrow the per-customer-limit race (e.g. a double-submitted checkout):
        // recount including the row just inserted and abort the whole transaction
        // if it pushed this customer over their limit. Under concurrent requests
        // from the very same customer this can't be made fully atomic without
        // raw SQL locking, but this closes the window down to a rare edge case.
        if (freshCoupon && freshCoupon.usageLimitPerCustomer) {
          const customerUsageCount = await tx.couponUsage.count({
            where: { couponId: appliedCoupon.id, customerId: customer.id }
          });
          if (customerUsageCount > freshCoupon.usageLimitPerCustomer) {
            throw couponError('Sie haben diesen Gutschein bereits maximal eingelöst / Coupon already redeemed.');
          }
        }
      }

      return createdOrder;
    });

    // Send confirmation email to customer
    if (customer.email) {
      try {
        await sendCustomerOrderConfirmationEmail(
          customer.email,
          customer.name,
          order,
          customer.preferredLanguage || 'de'
        );
      } catch (err) {
        console.error('Customer confirmation email failed:', err.message);
      }
    }

    res.status(201).json(order);
  } catch (error) {
    if (error.isStockError || error.isCouponError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, adminNotes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: {
            product: true
          }
        },
        accounting: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let normalizedStatus = status ? status.toLowerCase().trim() : order.status;
    if (normalizedStatus === 'decline') normalizedStatus = 'declined';

    const finalNotes = notes !== undefined ? notes : order.notes;
    const finalAdminNotes = adminNotes !== undefined ? adminNotes : order.adminNotes;

    const wasStockDeducted = !DECLINED_STATUSES.includes(order.status);
    const shouldStockBeDeducted = !DECLINED_STATUSES.includes(normalizedStatus);

    if (!wasStockDeducted && shouldStockBeDeducted) {
      // Transitioning out of a declined/cancelled state back into an active one
      // (e.g. an admin un-declining an order): re-deduct stock atomically.
      try {
        await prisma.$transaction(async (tx) => {
          for (const item of order.orderItems) {
            await decrementStockOrThrow(tx, item.productId, item.quantity, item.product?.name);
          }

          await tx.order.update({
            where: { id },
            data: {
              status: normalizedStatus,
              notes: finalNotes,
              adminNotes: finalAdminNotes
            }
          });

          if (!order.accounting) {
            await tx.accounting.create({
              data: {
                orderId: id,
                type: 'sale',
                amount: order.totalAmount,
                status: 'completed'
              }
            });
          } else if (order.accounting.status === 'cancelled') {
            await tx.accounting.update({
              where: { orderId: id },
              data: { status: 'completed' }
            });
          }
        });
      } catch (error) {
        if (error.isStockError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
    } else if (wasStockDeducted && !shouldStockBeDeducted) {
      // Transitioning into a declined/cancelled state: restore stock!
      await prisma.$transaction(async (tx) => {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
        }

        await tx.order.update({
          where: { id },
          data: { 
            status: normalizedStatus,
            notes: finalNotes,
            adminNotes: finalAdminNotes
          }
        });

        if (order.accounting) {
          await tx.accounting.update({
            where: { orderId: id },
            data: { status: 'cancelled' }
          });
        }
      });
    } else {
      // Stock state does not change (e.g. accepted -> preparing, declined -> rejected, or notes update only)
      await prisma.order.update({
        where: { id },
        data: { 
          status: normalizedStatus,
          notes: finalNotes,
          adminNotes: finalAdminNotes
        }
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: {
            product: true
          }
        },
        accounting: true
      }
    });

    // Safely attempt email notification without blocking if email service fails
    try {
      const customerEmail = updatedOrder?.customerEmail || updatedOrder?.customer?.email;
      const customerName = updatedOrder?.customerName || updatedOrder?.customer?.name || 'Customer';
      const customerLang = updatedOrder?.customer?.preferredLanguage || 'de';

      if (customerEmail && status) {
        await sendOrderStatusEmail(
          customerEmail,
          customerName,
          updatedOrder,
          normalizedStatus,
          finalNotes,
          customerLang
        );
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError.message || emailError);
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await prisma.$transaction(async (tx) => {
      // If the order wasn't already declined/cancelled, its stock is still deducted — restore it
      if (!DECLINED_STATUSES.includes(order.status)) {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      await tx.accounting.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get orders placed by the currently logged-in customer
 */
const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.customer?.customerId;
    if (!customerId) {
      return res.status(401).json({ error: 'Customer authentication required' });
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        coupon: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Failed to retrieve customer orders' });
  }
};

/**
 * Admin: Edit an existing order when products are unavailable
 * Adjusts items, recalculates totals, manages stock deltas,
 * sets status to 'pending_customer_approval', and emails the customer.
 */
const editOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, modificationReason, adminNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: { product: true }
        },
        accounting: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot edit an order that is already delivered' });
    }

    const wasStockDeducted = !DECLINED_STATUSES.includes(order.status);

    // Map existing items by productId
    const oldItemsMap = new Map();
    for (const it of order.orderItems) {
      oldItemsMap.set(it.productId, it);
    }

    // Validate incoming items and fetch latest product details
    let newTotalAmount = 0;
    const newItemsToCreate = [];
    const stockAdjustments = []; // { productId, delta } positive means consume more stock, negative means return stock

    for (const it of items) {
      const qty = parseInt(it.quantity, 10);
      if (!it.productId || isNaN(qty) || qty <= 0) {
        continue;
      }

      const product = await prisma.product.findUnique({
        where: { id: it.productId }
      });

      if (!product) {
        return res.status(404).json({ error: `Product ${it.productId} not found` });
      }

      const unitPrice = typeof it.price === 'number' ? it.price : product.b2bPrice;
      const subtotal = unitPrice * qty;
      newTotalAmount += subtotal;

      newItemsToCreate.push({
        productId: it.productId,
        quantity: qty,
        price: unitPrice,
        subtotal
      });

      if (wasStockDeducted) {
        const oldItem = oldItemsMap.get(it.productId);
        const oldQty = oldItem ? oldItem.quantity : 0;
        const delta = qty - oldQty; // e.g. 1 - 2 = -1 (return 1)
        if (delta > 0 && product.stock < delta) {
          return res.status(400).json({
            error: `Insufficient stock for product "${product.name}". Available: ${product.stock}, Needed additional: ${delta}`
          });
        }
        stockAdjustments.push({ productId: it.productId, delta });
      }
    }

    if (newItemsToCreate.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one valid item' });
    }

    // Check for removed items if stock was deducted (return all oldQty to stock)
    if (wasStockDeducted) {
      const newProductIds = new Set(newItemsToCreate.map(it => it.productId));
      for (const [prodId, oldItem] of oldItemsMap.entries()) {
        if (!newProductIds.has(prodId)) {
          stockAdjustments.push({ productId: prodId, delta: -oldItem.quantity });
        }
      }
    }

    const reason = modificationReason || 'Einige Produkte waren leider nicht verfügbar.';
    const originalTotal = order.originalTotalAmount || order.totalAmount;

    // Perform database transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Apply stock adjustments if order was active
        if (wasStockDeducted) {
          for (const adj of stockAdjustments) {
            if (adj.delta > 0) {
              await decrementStockOrThrow(tx, adj.productId, adj.delta);
            } else if (adj.delta < 0) {
              await tx.product.update({
                where: { id: adj.productId },
                data: { stock: { increment: Math.abs(adj.delta) } }
              });
            }
          }
        }

        // Delete existing order items and create replacement items
        await tx.orderItem.deleteMany({
          where: { orderId: id }
        });

        await tx.orderItem.createMany({
          data: newItemsToCreate.map(item => ({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
          }))
        });

        // Update Order
        await tx.order.update({
          where: { id },
          data: {
            totalAmount: newTotalAmount,
            originalTotalAmount: originalTotal,
            modificationReason: reason,
            status: 'pending_customer_approval',
            adminNotes: adminNotes !== undefined ? adminNotes : order.adminNotes
          }
        });

        // Update Accounting record
        if (order.accounting) {
          await tx.accounting.update({
            where: { orderId: id },
            data: {
              amount: newTotalAmount,
              status: 'completed'
            }
          });
        }
      });
    } catch (error) {
      if (error.isStockError) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: { product: true }
        },
        accounting: true
      }
    });

    // Send modification email to customer
    try {
      const customerEmail = updatedOrder?.customerEmail || updatedOrder?.customer?.email;
      const customerName = updatedOrder?.customerName || updatedOrder?.customer?.name || 'Customer';
      const customerLang = updatedOrder?.customer?.preferredLanguage || 'de';

      if (customerEmail) {
        await sendOrderModificationEmail(
          customerEmail,
          customerName,
          updatedOrder,
          reason,
          customerLang
        );
      }
    } catch (emailErr) {
      console.error('Error sending order modification email:', emailErr.message || emailErr);
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Edit order error:', error);
    res.status(500).json({ error: 'Failed to edit order' });
  }
};

/**
 * Customer: Accept or decline order modification
 */
const customerRespondToModification = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' | 'decline'
    const customerId = req.customer?.customerId;

    if (!customerId) {
      return res.status(401).json({ error: 'Customer authentication required' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: { product: true }
        },
        accounting: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.customerId !== customerId) {
      return res.status(403).json({ error: 'Not authorized to respond to this order' });
    }

    if (order.status !== 'pending_customer_approval') {
      return res.status(400).json({ error: `Order is not in pending approval state (current: ${order.status})` });
    }

    const customerEmail = order.customerEmail || order.customer?.email;
    const customerName = order.customerName || order.customer?.name || 'Customer';
    const customerLang = order.customer?.preferredLanguage || 'de';

    if (action === 'accept') {
      // Customer accepted the modification. Stock for the (already-modified) order
      // items was deducted at order creation and adjusted by editOrder's deltas,
      // so accepting only needs to flip the status — no further stock change.
      await prisma.$transaction(async (tx) => {
        const dateStr = new Date().toLocaleString(customerLang === 'ar' ? 'ar-EG' : 'de-DE');
        const noteText = customerLang === 'ar'
          ? `[وافق العميل على التعديل بتاريخ ${dateStr}]`
          : `[Kunde hat Änderung akzeptiert am ${dateStr}]`;
        const updatedAdminNotes = order.adminNotes
          ? `${order.adminNotes}\n${noteText}`
          : noteText;

        await tx.order.update({
          where: { id },
          data: {
            status: 'accepted',
            adminNotes: updatedAdminNotes
          }
        });

        if (order.accounting) {
          await tx.accounting.update({
            where: { orderId: id },
            data: { status: 'completed' }
          });
        }
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: CUSTOMER_PUBLIC_SELECT },
          orderItems: { include: { product: true } },
          accounting: true
        }
      });

      // Send confirmation email
      if (customerEmail) {
        try {
          await sendOrderStatusEmail(
            customerEmail,
            customerName,
            updatedOrder,
            'accepted',
            customerLang === 'ar' ? 'شكراً لك، تم تأكيد موافقتك على تعديل الطلب وجارٍ تحضيره.' : 'Vielen Dank, Sie haben die Bestelländerung bestätigt. Ihre Lieferung wird nun vorbereitet.',
            customerLang
          );
        } catch (mailErr) {
          console.error('Email error on customer accept:', mailErr.message);
        }
      }

      return res.json({ success: true, message: 'Bestelländerung erfolgreich akzeptiert', order: updatedOrder });
    } else if (action === 'decline' || action === 'cancel') {
      // Customer declined and cancels the order -> restore any stock!
      await prisma.$transaction(async (tx) => {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }

        const dateStr = new Date().toLocaleString(customerLang === 'ar' ? 'ar-EG' : 'de-DE');
        const noteText = customerLang === 'ar'
          ? `[رفض العميل التعديل وتم إلغاء الطلب بتاريخ ${dateStr}]`
          : `[Kunde hat Änderung abgelehnt und Bestellung storniert am ${dateStr}]`;
        const updatedAdminNotes = order.adminNotes
          ? `${order.adminNotes}\n${noteText}`
          : noteText;

        await tx.order.update({
          where: { id },
          data: {
            status: 'declined',
            adminNotes: updatedAdminNotes
          }
        });

        if (order.accounting) {
          await tx.accounting.update({
            where: { orderId: id },
            data: { status: 'cancelled' }
          });
        }
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: CUSTOMER_PUBLIC_SELECT },
          orderItems: { include: { product: true } },
          accounting: true
        }
      });

      // Send cancellation email
      if (customerEmail) {
        try {
          await sendOrderStatusEmail(
            customerEmail,
            customerName,
            updatedOrder,
            'declined',
            customerLang === 'ar' ? 'تم إلغاء الطلب بناءً على رغبتك بعد رفض التعديل.' : 'Ihre Bestellung wurde wie gewünscht nach Ablehnung der Änderung storniert.',
            customerLang
          );
        } catch (mailErr) {
          console.error('Email error on customer decline:', mailErr.message);
        }
      }

      return res.json({ success: true, message: 'Bestellung erfolgreich storniert', order: updatedOrder });
    } else {
      return res.status(400).json({ error: "Invalid action. Expected 'accept' or 'decline'" });
    }
  } catch (error) {
    console.error('Customer respond to modification error:', error);
    res.status(500).json({ error: 'Failed to process customer response' });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  getCustomerOrders,
  updateOrderStatus,
  deleteOrder,
  editOrder,
  customerRespondToModification
};