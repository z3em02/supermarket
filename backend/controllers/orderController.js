const prisma = require('../lib/prisma');
const {
  sendCustomerOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderModificationEmail
} = require('../utils/emailService');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const { decryptCustomerPII, encrypt, decrypt } = require('../utils/piiCrypto');
const { sendPushToCustomer } = require('../utils/pushService');
const { logAudit } = require('../lib/auditLog');

// Orders carry their own encrypted customer* snapshot columns (a copy taken
// at creation time, kept separate from the Customer row so invoices stay
// readable even after the customer account is deleted — see
// GDPR_DATA_POLICY.md), plus the joined `customer` relation which also
// holds encrypted fields. Decrypt both before any response or email send
// touches them.
const withDecryptedCustomer = (order) => {
  if (!order) return order;
  return {
    ...order,
    customerName: 'customerName' in order ? decrypt(order.customerName) : order.customerName,
    customerPhone: 'customerPhone' in order ? decrypt(order.customerPhone) : order.customerPhone,
    customerEmail: 'customerEmail' in order ? decrypt(order.customerEmail) : order.customerEmail,
    deliveryAddress: 'deliveryAddress' in order ? decrypt(order.deliveryAddress) : order.deliveryAddress,
    deliveryNotes: 'deliveryNotes' in order ? decrypt(order.deliveryNotes) : order.deliveryNotes,
    customer: order.customer ? decryptCustomerPII(order.customer) : order.customer
  };
};
const withDecryptedCustomers = (orders) => orders.map(withDecryptedCustomer);

const STATUS_PUSH_TEXT = {
  accepted: { de: 'Ihre Bestellung wurde angenommen', ar: 'تم قبول طلبك' },
  preparing: { de: 'Ihre Bestellung wird vorbereitet', ar: 'جارٍ تجهيز طلبك' },
  out_for_delivery: { de: 'Ihre Bestellung ist unterwegs', ar: 'طلبك في الطريق إليك' },
  shipped: { de: 'Ihre Bestellung ist unterwegs', ar: 'طلبك في الطريق إليك' },
  delivered: { de: 'Ihre Bestellung wurde zugestellt', ar: 'تم توصيل طلبك' },
  declined: { de: 'Ihre Bestellung wurde storniert', ar: 'تم إلغاء طلبك' },
  rejected: { de: 'Ihre Bestellung wurde storniert', ar: 'تم إلغاء طلبك' }
};

// Fire-and-forget push alongside the email sends above — never blocks or
// fails the request it's called from (sendPushToCustomer already swallows
// its own per-subscription errors).
const pushOrderStatusUpdate = (order, status, lang) => {
  if (!order?.customerId) return;
  const isAr = lang === 'ar';
  const text = STATUS_PUSH_TEXT[(status || '').toLowerCase()];
  if (!text) return;
  sendPushToCustomer(order.customerId, {
    title: isAr ? text.ar : text.de,
    body: `#${order.id.slice(0, 8).toUpperCase()}`,
    url: '/customer/account'
  }).catch((err) => console.error('Order status push failed:', err.message));
};
const {
  calculatePromotionForItem,
  validateAndCalculateCoupon,
  calculateCouponDiscountAmount
} = require('../utils/pricingService');
const { isValidDeliverySlot } = require('../utils/deliverySlot');
const { calculateDeliveryDistance } = require('../utils/distanceService');

// Stock is deducted for every order from creation onward and only ever restored
// once an order reaches one of these terminal decline states.
const DECLINED_STATUSES = ['declined', 'rejected', 'canceled', 'cancelled'];

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

// Thrown when a status transition's guarded updateMany affects 0 rows,
// meaning a concurrent request already moved the order out of the status
// this one was about to act on (double-click, retry, two admins at once).
// Reported as a 409 so stock/coupon rollback logic downstream never runs
// twice for the same transition.
const concurrentUpdateError = () => {
  const err = new Error('This order was just updated by another request. Please refresh and try again.');
  err.isConcurrentUpdateError = true;
  return err;
};

const getOrders = async (req, res) => {
  try {
    // A driver only sees orders an admin has actually assigned to them —
    // not the whole book (financial detail, other drivers' customers, etc).
    const where = req.driver ? { assignedDriverName: req.driver.name } : {};

    const orders = await prisma.order.findMany({
      where,
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

    res.json(withDecryptedCustomers(orders));
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

    // Same rule as getOrders: a driver requesting a single order they
    // aren't assigned to gets a 404, not a peek at someone else's delivery.
    if (req.driver && order.assignedDriverName !== req.driver.name) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(withDecryptedCustomer(order));
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { notes } = req.body;
    let customerId;
    // #4 & #16 fix: regular customers strictly use their own JWT customerId (IDOR prevention).
    // Admins can place orders for existing customers, but customerId must be valid and existence is verified.
    if (req.customer?.customerId) {
      customerId = req.customer.customerId;
    } else if (req.admin?.id) {
      customerId = req.body.customerId;
      if (!customerId) {
        return res.status(400).json({ error: 'customerId is required when placing an order as admin' });
      }
    } else {
      return res.status(401).json({ error: 'Customer authentication is required' });
    }

    const customerRow = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customerRow) {
      return res.status(404).json({ error: 'Customer account not found' });
    }

    const customer = decryptCustomerPII(customerRow);

    // Customer-placed orders require verified email and phone
    if (!req.admin) {
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
    } else {
      // Audit log when admin places order on behalf of customer
      logAudit(req.admin.email, 'ADMIN_CREATE_ORDER', `Admin placed order on behalf of customer ${customer.id}`);
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

    // Resolve delivery address and notes early for postal code and distance checks
    const addressParts = [
      customer.street && `${customer.street} ${customer.houseNumber || ''}`.trim(),
      customer.postalCode && customer.city && `${customer.postalCode} ${customer.city}`.trim(),
      customer.floorApartment && `Apt/Floor: ${customer.floorApartment}`
    ].filter(Boolean);

    const deliveryAddress = req.body.deliveryAddress || addressParts.join(', ') || 'Home Delivery Address';
    const deliveryNotes = req.body.deliveryNotes || customer.deliveryNotes || notes || null;

    // Delivery rules: minimum order value, service area and distance-based delivery fee
    const storeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const minOrderValue = storeSettings?.minOrderValue || 0;
    const freeDeliveryThreshold = storeSettings?.freeDeliveryThreshold || 0;
    const rawAllowed = storeSettings?.allowedPostalCodes;
    const allowedPostalCodes = (rawAllowed && rawAllowed !== 'null' ? rawAllowed : '')
      .split(/[,;\s]+/)
      .map((code) => code.trim())
      .filter((code) => code && code !== 'null');

    if (minOrderValue > 0 && itemsSubtotal < minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value is €${minOrderValue.toFixed(2)}. Your cart total is €${itemsSubtotal.toFixed(2)}.`
      });
    }

    if (allowedPostalCodes.length > 0) {
      const custPostal = (customer.postalCode || '').trim();
      const addr = String(deliveryAddress).trim();

      const matchesProfile = custPostal && allowedPostalCodes.includes(custPostal);
      const matchesAddress = allowedPostalCodes.some((code) => {
        const regex = new RegExp(`(^|[^0-9])${code}([^0-9]|$)`);
        return regex.test(addr);
      });

      if (!matchesProfile && !matchesAddress) {
        return res.status(400).json({
          error: `Wir liefern derzeit nur an folgende Postleitzahlen: ${allowedPostalCodes.join(', ')} / We currently only deliver to: ${allowedPostalCodes.join(', ')}`
        });
      }
    }

    // Distance and delivery fee calculation
    const distanceResult = await calculateDeliveryDistance(deliveryAddress, storeSettings || {});

    if (!distanceResult.isWithinMaxDistance) {
      if (distanceResult.unresolvableAddress) {
        return res.status(400).json({
          error: 'Die Lieferadresse konnte nicht geortet werden. Bitte überprüfen Sie Straße und Postleitzahl. / The delivery address could not be located. Please check the street and postal code.'
        });
      }
      return res.status(400).json({
        error: `Die Lieferadresse ist ${distanceResult.distanceKm} km entfernt. Unsere maximale Lieferdistanz beträgt ${distanceResult.maxDeliveryDistanceKm} km.`
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

    const isFreeDelivery = isFreeShipping || (freeDeliveryThreshold > 0 && itemsSubtotal >= freeDeliveryThreshold);
    const chargedDeliveryFee = isFreeDelivery ? 0 : distanceResult.totalDeliveryFee;
    const deliveryDistanceKm = distanceResult.distanceKm;
    const baseDeliveryFee = isFreeDelivery ? 0 : distanceResult.baseFee;
    const distanceDeliveryFee = isFreeDelivery ? 0 : distanceResult.distanceFee;

    const finalItemsTotal = Math.max(0, Number((itemsSubtotal - couponDiscount).toFixed(2)));
    const totalAmount = Number((finalItemsTotal + chargedDeliveryFee).toFixed(2));

    const activeWindowsCount = await prisma.deliveryWindow.count({ where: { isActive: true } });
    let deliverySlot = null;
    if (activeWindowsCount > 0) {
      if (!req.body.deliverySlot) {
        return res.status(400).json({ error: 'Please select a delivery time window' });
      }
      const valid = await isValidDeliverySlot(req.body.deliverySlot);
      if (!valid) {
        return res.status(400).json({ error: 'Selected delivery time window is invalid or already closed' });
      }
      deliverySlot = req.body.deliverySlot;
    } else if (req.body.deliverySlot) {
      const valid = await isValidDeliverySlot(req.body.deliverySlot);
      deliverySlot = valid ? req.body.deliverySlot : null;
    }

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
          customerName: encrypt(customer.name),
          customerPhone: encrypt(customer.phone),
          customerEmail: encrypt(customer.email),
          deliveryAddress: encrypt(deliveryAddress),
          deliveryNotes: deliveryNotes ? encrypt(deliveryNotes) : null,
          deliverySlot,
          paymentMethod: 'cash_on_delivery',
          status: 'pending',
          itemsSubtotal,
          couponId: appliedCoupon ? appliedCoupon.id : null,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          couponDiscount,
          promotionDiscount: totalPromoSavings,
          isFreeShipping,
          deliveryFee: chargedDeliveryFee,
          deliveryDistanceKm,
          baseDeliveryFee,
          distanceDeliveryFee,
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

    const decryptedOrder = withDecryptedCustomer(order);

    // Send confirmation email to customer
    if (customer.email) {
      try {
        await sendCustomerOrderConfirmationEmail(
          customer.email,
          customer.name,
          decryptedOrder,
          customer.preferredLanguage || 'de'
        );
      } catch (err) {
        console.error('Customer confirmation email failed:', err.message);
      }
    }

    const isAr = customer.preferredLanguage === 'ar';
    sendPushToCustomer(customer.id, {
      title: isAr ? 'تم استلام طلبك' : 'Bestellung eingegangen',
      body: isAr ? `طلبك #${decryptedOrder.id.slice(0, 8).toUpperCase()} قيد المراجعة` : `Ihre Bestellung #${decryptedOrder.id.slice(0, 8).toUpperCase()} wird bearbeitet`,
      url: '/customer/account'
    }).catch((err) => console.error('Order confirmation push failed:', err.message));

    res.status(201).json(decryptedOrder);
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
    const { status, notes, adminNotes, deliverySlot } = req.body;

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

    // A driver can only touch an order actually assigned to them — knowing
    // the ID (e.g. from an old link) isn't enough.
    if (req.driver && order.assignedDriverName !== req.driver.name) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (deliverySlot !== undefined && deliverySlot !== null && !(await isValidDeliverySlot(deliverySlot, { allowPastHoursForToday: true }))) {
      return res.status(400).json({ error: 'Invalid delivery slot' });
    }

    // #34 fix: whitelist every allowed status — reject arbitrary strings that
    // could corrupt stock-management logic or the accounting state machine.
    const VALID_STATUSES = [
      'pending', 'accepted', 'preparing', 'shipped', 'out_for_delivery',
      'delivered', 'declined', 'rejected', 'canceled', 'cancelled',
      'pending_customer_approval'
    ];
    let normalizedStatus = status ? status.toLowerCase().trim() : order.status;
    if (normalizedStatus === 'decline') normalizedStatus = 'declined';

    if (status !== undefined && !VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: `Invalid status "${normalizedStatus}". Allowed: ${VALID_STATUSES.join(', ')}` });
    }

    // Drivers reach this route via driverOrAdminAuthMiddleware to update
    // delivery progress — not to decline/cancel orders or revert them back
    // to earlier stages, which stays admin-only.
    const DRIVER_ALLOWED_STATUSES = ['out_for_delivery', 'shipped', 'delivered'];
    if (req.driver && status !== undefined && !DRIVER_ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(403).json({ error: 'Drivers can only mark orders as out for delivery or delivered' });
    }

    const finalNotes = notes !== undefined ? notes : order.notes;
    const finalAdminNotes = adminNotes !== undefined ? adminNotes : order.adminNotes;
    // Admin can directly overwrite the customer's requested delivery slot
    // (e.g. after a phone call) — no separate customer approval needed, unlike
    // item modifications.
    const finalDeliverySlot = deliverySlot !== undefined ? deliverySlot : order.deliverySlot;

    const wasStockDeducted = !DECLINED_STATUSES.includes(order.status);
    const shouldStockBeDeducted = !DECLINED_STATUSES.includes(normalizedStatus);

    if (!wasStockDeducted && shouldStockBeDeducted) {
      // Transitioning out of a declined/cancelled state back into an active one
      // (e.g. an admin un-declining an order): re-deduct stock atomically.
      try {
        await prisma.$transaction(async (tx) => {
          // #9 fix: guard the transition on the status this request actually
          // observed — if a concurrent request already moved the order off
          // that status, abort before touching stock at all (double-submit guard).
          const guarded = await tx.order.updateMany({
            where: { id, status: order.status },
            data: {
              status: normalizedStatus,
              notes: finalNotes,
              adminNotes: finalAdminNotes,
              deliverySlot: finalDeliverySlot
            }
          });
          if (guarded.count === 0) throw concurrentUpdateError();

          for (const item of order.orderItems) {
            await decrementStockOrThrow(tx, item.productId, item.quantity, item.product?.name);
          }

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
        if (error.isConcurrentUpdateError) {
          return res.status(409).json({ error: error.message });
        }
        throw error;
      }
    } else if (wasStockDeducted && !shouldStockBeDeducted) {
      // Transitioning into a declined/cancelled state: restore stock!
      // #17 fix: also roll back any coupon usage so the customer isn't
      // permanently penalized for an order that was never fulfilled.
      try {
        await prisma.$transaction(async (tx) => {
          // #9 fix: same double-submit guard as the branch above — abort
          // before restoring any stock/coupon usage if another request
          // already transitioned this order off the status we observed.
          const guarded = await tx.order.updateMany({
            where: { id, status: order.status },
            data: {
              status: normalizedStatus,
              notes: finalNotes,
              adminNotes: finalAdminNotes,
              deliverySlot: finalDeliverySlot
            }
          });
          if (guarded.count === 0) throw concurrentUpdateError();

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

          // Roll back coupon usage if one was applied to this order
          if (order.couponId) {
            // Decrement the global usedCount (floor at 0 to prevent going negative)
            await tx.coupon.updateMany({
              where: { id: order.couponId, usedCount: { gt: 0 } },
              data: { usedCount: { decrement: 1 } }
            });
            // Remove the per-customer usage record so they can use it again
            await tx.couponUsage.deleteMany({
              where: { orderId: id }
            });
          }

          if (order.accounting) {
            await tx.accounting.update({
              where: { orderId: id },
              data: { status: 'cancelled' }
            });
          }
        });
      } catch (error) {
        if (error.isConcurrentUpdateError) {
          return res.status(409).json({ error: error.message });
        }
        throw error;
      }
    } else {
      // Stock state does not change (e.g. accepted -> preparing, declined -> rejected, or notes update only)
      await prisma.order.update({
        where: { id },
        data: {
          status: normalizedStatus,
          notes: finalNotes,
          adminNotes: finalAdminNotes,
          deliverySlot: finalDeliverySlot
        }
      });
    }

    const updatedOrder = withDecryptedCustomer(await prisma.order.findUnique({
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
    }));

    // Safely attempt email notification without blocking if email service fails
    try {
      const customerEmail = updatedOrder?.customerEmail || updatedOrder?.customer?.email;
      const customerName = updatedOrder?.customerName || updatedOrder?.customer?.name || 'Customer';
      const customerLang = updatedOrder?.customer?.preferredLanguage || 'de';

      // Only email on the "accepted" transition — other status changes
      // (preparing, out_for_delivery, delivered, ...) are surfaced via the
      // in-app tracking timeline and push notification instead, to avoid
      // flooding the customer's inbox with one email per status click.
      if (customerEmail && normalizedStatus === 'accepted') {
        await sendOrderStatusEmail(
          customerEmail,
          customerName,
          updatedOrder,
          normalizedStatus,
          finalNotes,
          customerLang
        );
      }
      pushOrderStatusUpdate(updatedOrder, normalizedStatus, customerLang);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError.message || emailError);
    }

    const actorEmail = req.admin?.email || (req.driver ? `Fahrer (${req.driver.name})` : 'System');
    logAudit(actorEmail, 'UPDATE_ORDER_STATUS', `Bestellstatus geändert für #${id.slice(0, 8).toUpperCase()} -> ${normalizedStatus}`);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/orders/:id/assign-driver - Admin only. Picks which driver
// delivers this order (or clears it with assignedDriverName: null). Not
// driver-reachable — that's an admin decision, not something a driver
// grants themselves.
const assignOrderDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedDriverName } = req.body;

    const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const clean = assignedDriverName ? String(assignedDriverName).trim().slice(0, 60) : null;
    const updated = await prisma.order.update({
      where: { id },
      data: { assignedDriverName: clean || null },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: { include: { product: true } },
        accounting: true,
        coupon: true
      }
    });

    logAudit(
      req.admin?.email,
      'ASSIGN_ORDER_DRIVER',
      clean
        ? `Bestellung #${id.slice(0, 8).toUpperCase()} Fahrer "${clean}" zugewiesen`
        : `Fahrer-Zuweisung für Bestellung #${id.slice(0, 8).toUpperCase()} entfernt`
    );

    res.json(withDecryptedCustomer(updated));
  } catch (error) {
    console.error('Assign order driver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;
  logAudit(req.admin?.email, 'DELETE_ORDER_REJECTED', `Attempted deletion of order ${id} blocked per retention policy`);
  return res.status(403).json({
    error: 'Order history cannot be deleted due to legal and accounting retention requirements (§ 132 BAO). Orders can only be cancelled or declined.'
  });
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

    res.json(withDecryptedCustomers(orders));
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
        accounting: true,
        coupon: true
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

    // Fetch active promotions for the edited product set, same as createOrder,
    // so line-item pricing/discounts are recalculated fresh rather than
    // reusing stale values computed for the pre-edit item list.
    const editedProductIds = items.map((it) => it.productId).filter(Boolean);
    const activePromotions = await prisma.promotion.findMany({
      where: { productId: { in: editedProductIds }, isActive: true }
    });
    const promoMap = new Map(activePromotions.map((pr) => [pr.productId, pr]));

    // Validate incoming items and fetch latest product details
    let newItemsSubtotal = 0;
    let newTotalPromoSavings = 0;
    const newItemsToCreate = [];
    const stockAdjustments = []; // { productId, delta, productName }

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

      // #6 fix: strictly use authoritative database catalog price (product.b2bPrice)
      // via calculatePromotionForItem, which itself only ever reads product.b2bPrice —
      // client-supplied price is never trusted, preventing price tampering.
      if (!product.b2bPrice || product.b2bPrice <= 0) {
        return res.status(400).json({ error: `Product "${product.name}" has an invalid catalog price (${product.b2bPrice})` });
      }

      const promo = promoMap.get(it.productId);
      const promoResult = calculatePromotionForItem(product, qty, promo);

      newItemsSubtotal += promoResult.subtotal;
      newTotalPromoSavings += promoResult.appliedSavings;

      newItemsToCreate.push({
        productId: it.productId,
        quantity: qty,
        price: promoResult.price,
        originalPrice: promoResult.originalPrice,
        discountAmount: promoResult.discountAmount,
        promotionType: promoResult.promotionType,
        subtotal: promoResult.subtotal
      });

      if (wasStockDeducted) {
        const oldItem = oldItemsMap.get(it.productId);
        const oldQty = oldItem ? oldItem.quantity : 0;
        const delta = qty - oldQty; // e.g. 1 - 2 = -1 (return 1)
        stockAdjustments.push({ productId: it.productId, delta, productName: product.name });
      }
    }

    if (newItemsToCreate.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one valid item' });
    }

    newItemsSubtotal = Number(newItemsSubtotal.toFixed(2));
    newTotalPromoSavings = Number(newTotalPromoSavings.toFixed(2));

    // Check for removed items if stock was deducted (return all oldQty to stock)
    if (wasStockDeducted) {
      const newProductIds = new Set(newItemsToCreate.map(it => it.productId));
      for (const [prodId, oldItem] of oldItemsMap.entries()) {
        if (!newProductIds.has(prodId)) {
          stockAdjustments.push({ productId: prodId, delta: -oldItem.quantity, productName: oldItem.product?.name });
        }
      }
    }

    const reason = modificationReason || 'Einige Produkte waren leider nicht verfügbar.';
    const originalTotal = order.originalTotalAmount || order.totalAmount;

    const storeSettingsForEdit = await prisma.storeSettings.findUnique({ where: { id: 'default' } });

    // #8 fix: the store's minimum order value applies on edit the same as on
    // creation — an edit (e.g. removing unavailable items) can't silently
    // slip the order below it.
    const storeMinOrderValue = Number(storeSettingsForEdit?.minOrderValue) || 0;
    if (storeMinOrderValue > 0 && newItemsSubtotal < storeMinOrderValue) {
      return res.status(400).json({
        error: `Der bearbeitete Warenkorb (€${newItemsSubtotal.toFixed(2)}) liegt unter dem Mindestbestellwert von €${storeMinOrderValue.toFixed(2)}. Bitte Bestellung stornieren statt anpassen.`
      });
    }

    // #6 fix: re-validate the coupon (if any) against the recalculated
    // subtotal instead of clamping the old, possibly stale, discount amount.
    // Only re-checks eligibility that can change on edit (active/date range,
    // minOrderValue) — usage-limit checks are skipped since this order's
    // usage was already counted when the coupon was first applied.
    let finalCouponDiscount = 0;
    if (order.coupon && Number(order.couponDiscount) > 0) {
      const now = new Date();
      const couponMinOrder = Number(order.coupon.minOrderValue) || 0;
      const stillEligible = order.coupon.isActive
        && !(order.coupon.startDate && new Date(order.coupon.startDate) > now)
        && !(order.coupon.endDate && new Date(order.coupon.endDate) < now)
        && newItemsSubtotal >= couponMinOrder;
      if (stillEligible) {
        finalCouponDiscount = calculateCouponDiscountAmount(order.coupon, newItemsSubtotal);
      }
      // else: coupon no longer applies to the edited cart (e.g. below its
      // minimum order value) — the discount is dropped, not just capped.
    }

    // #7 fix: recalculate delivery fee against the new subtotal instead of
    // carrying over the original charge — a free-shipping coupon or the
    // original distance-based fee are preserved, but the free-delivery
    // *threshold* comparison is redone since the subtotal changed. The
    // distance-based components themselves don't need re-geocoding since
    // the delivery address is unchanged by this edit.
    const freeDeliveryThreshold = Number(storeSettingsForEdit?.freeDeliveryThreshold) || 0;
    const isFreeDelivery = order.isFreeShipping || (freeDeliveryThreshold > 0 && newItemsSubtotal >= freeDeliveryThreshold);
    const baseDeliveryFee = Number(order.baseDeliveryFee) || 0;
    const distanceDeliveryFee = Number(order.distanceDeliveryFee) || 0;
    const deliveryFee = isFreeDelivery ? 0 : Number((baseDeliveryFee + distanceDeliveryFee).toFixed(2));

    const finalPromotionDiscount = newTotalPromoSavings;
    const finalTotalAmount = Math.max(0, Number((newItemsSubtotal - finalCouponDiscount + deliveryFee).toFixed(2)));

    // Perform database transaction
    try {
      await prisma.$transaction(async (tx) => {
        // #25 fix: Apply stock adjustments inside transaction atomically
        if (wasStockDeducted) {
          for (const adj of stockAdjustments) {
            if (adj.delta > 0) {
              await decrementStockOrThrow(tx, adj.productId, adj.delta, adj.productName);
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
            originalPrice: item.originalPrice,
            discountAmount: item.discountAmount,
            promotionType: item.promotionType,
            subtotal: item.subtotal
          }))
        });

        // Update Order with recalculated subtotal, discounts and delivery fee
        await tx.order.update({
          where: { id },
          data: {
            itemsSubtotal: newItemsSubtotal,
            couponDiscount: finalCouponDiscount,
            promotionDiscount: finalPromotionDiscount,
            deliveryFee,
            isFreeShipping: isFreeDelivery,
            totalAmount: finalTotalAmount,
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
              amount: finalTotalAmount,
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

    const updatedOrder = withDecryptedCustomer(await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: { product: true }
        },
        accounting: true
      }
    }));

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
      if (updatedOrder?.customerId) {
        const isAr = customerLang === 'ar';
        sendPushToCustomer(updatedOrder.customerId, {
          title: isAr ? 'تم تعديل طلبك' : 'Ihre Bestellung wurde angepasst',
          body: `#${updatedOrder.id.slice(0, 8).toUpperCase()}`,
          url: '/customer/account'
        }).catch((err) => console.error('Order modification push failed:', err.message));
      }
    } catch (emailErr) {
      console.error('Error sending order modification email:', emailErr.message || emailErr);
    }

    logAudit(req.admin?.email, 'EDIT_ORDER', `Bestellung angepasst #${id.slice(0, 8).toUpperCase()}: Grund "${reason || 'Kein Grund angegeben'}", Neuer Betrag €${updatedOrder.totalAmount}`);

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

    const order = withDecryptedCustomer(await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT },
        orderItems: {
          include: { product: true }
        },
        accounting: true
      }
    }));

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

      const updatedOrder = withDecryptedCustomer(await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: CUSTOMER_PUBLIC_SELECT },
          orderItems: { include: { product: true } },
          accounting: true
        }
      }));

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
        pushOrderStatusUpdate(updatedOrder, 'accepted', customerLang);
      }

      return res.json({ success: true, message: 'Bestelländerung erfolgreich akzeptiert', order: updatedOrder });
    } else if (action === 'decline' || action === 'cancel') {
      // Customer declined and cancels the order -> restore any stock!
      const declineDateStr = new Date().toLocaleString(customerLang === 'ar' ? 'ar-EG' : 'de-DE');
      const declineNoteText = customerLang === 'ar'
        ? `[رفض العميل التعديل وتم إلغاء الطلب بتاريخ ${declineDateStr}]`
        : `[Kunde hat Änderung abgelehnt und Bestellung storniert am ${declineDateStr}]`;
      const declineAdminNotes = order.adminNotes ? `${order.adminNotes}\n${declineNoteText}` : declineNoteText;

      try {
        await prisma.$transaction(async (tx) => {
          // #9 fix: guard on the pending_customer_approval status this
          // request observed — a double-click/retry that lands after a first
          // request already declined the order must not restore stock/coupon
          // usage a second time.
          const guarded = await tx.order.updateMany({
            where: { id, status: 'pending_customer_approval' },
            data: {
              status: 'declined',
              adminNotes: declineAdminNotes
            }
          });
          if (guarded.count === 0) throw concurrentUpdateError();

          for (const item of order.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });
          }

          // Roll back coupon usage if one was applied so customer doesn't lose coupon
          if (order.couponId) {
            await tx.coupon.updateMany({
              where: { id: order.couponId, usedCount: { gt: 0 } },
              data: { usedCount: { decrement: 1 } }
            });
            await tx.couponUsage.deleteMany({
              where: { orderId: id }
            });
          }

          if (order.accounting) {
            await tx.accounting.update({
              where: { orderId: id },
              data: { status: 'cancelled' }
            });
          }
        });
      } catch (error) {
        if (error.isConcurrentUpdateError) {
          return res.status(409).json({ error: error.message });
        }
        throw error;
      }

      const updatedOrder = withDecryptedCustomer(await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: CUSTOMER_PUBLIC_SELECT },
          orderItems: { include: { product: true } },
          accounting: true
        }
      }));

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
        pushOrderStatusUpdate(updatedOrder, 'declined', customerLang);
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
  assignOrderDriver,
  deleteOrder,
  editOrder,
  customerRespondToModification
};