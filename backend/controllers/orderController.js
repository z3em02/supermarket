const prisma = require('../lib/prisma');
const { sendCustomerOrderConfirmationEmail } = require('../utils/emailService');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const { decryptCustomerPII, encrypt, decrypt } = require('../utils/piiCrypto');
const { sendPushToCustomer } = require('../utils/pushService');
const { logAudit } = require('../lib/auditLog');
const { validateAndCalculateCoupon, selectApplicablePromotions } = require('../utils/pricingService');
const {
  mergeOrderItems,
  buildOrderLine,
  summarizeOrderLines,
  parseAllowedPostalCodes,
  isPostalCodeAllowed,
  isFreeDelivery: qualifiesForFreeDelivery,
  calculateOrderTotal
} = require('../utils/orderPricing');
const { isValidDeliverySlot } = require('../utils/deliverySlot');
const { calculateDeliveryDistance } = require('../utils/distanceService');
const { parseValidDate, isCompleteDeliveryAddress } = require('../utils/validation');
const { orderMatchesSearch } = require('../utils/orderSearch');
const { isOrderStatus } = require('../utils/orderStatus');
const {
  withDecryptedCustomer,
  withDecryptedCustomers,
  DECLINED_STATUSES,
  decrementStockOrThrow,
  couponError
} = require('./orderShared');

// How far back a driver's "delivered" tab reaches — enough for the current
// week's deliveries, without every past customer's address accumulating in
// a list the driver app re-downloads every few seconds.
const DRIVER_DELIVERED_HISTORY_DAYS = 7;

// Default/maximum orders returned per page for the admin browse view.
const ORDERS_PAGE_SIZE = 50;
const ORDERS_PAGE_MAX = 100;

const ORDER_INCLUDE = {
  customer: { select: CUSTOMER_PUBLIC_SELECT },
  orderItems: { include: { product: true } }
};

// What the delivery view (DriverDeliveryView) lists: nothing declined, and
// delivered orders only for the last DRIVER_DELIVERED_HISTORY_DAYS. Pass a
// driver name for a driver's own orders; without one (an admin using the
// view) it covers every driver — still bounded, since the view re-fetches
// every few seconds and the order book only grows.
const deliveryViewWhere = (driverName) => ({
  ...(driverName ? { assignedDriverName: driverName } : {}),
  status: { notIn: DECLINED_STATUSES },
  OR: [
    { status: { not: 'delivered' } },
    { updatedAt: { gte: new Date(Date.now() - DRIVER_DELIVERED_HISTORY_DAYS * 24 * 60 * 60 * 1000) } }
  ]
});

// Where-clause for the admin browse view's status filter. The free-text
// search is applied separately (see searchOrderIds): customer name, phone and
// address are encrypted at rest, so SQL can't match them.
// null for a status that doesn't exist (the caller answers 400; passed on,
// the enum column would make Prisma throw).
const buildStatusWhere = (status) => {
  if (!status || status === 'all') return {};
  return isOrderStatus(status) ? { status } : null;
};

// Ids (newest first) of the orders matching `search` within `where`. Loads
// only the searchable columns, decrypts them in memory and matches with
// orderMatchesSearch — so a customer-name/phone/address search covers the
// whole order history, not just one page.
const searchOrderIds = async (where, search) => {
  const rows = await prisma.order.findMany({
    where,
    select: {
      id: true,
      assignedDriverName: true,
      customerName: true,
      customerPhone: true,
      deliveryAddress: true,
      customer: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return rows
    .filter((row) => orderMatchesSearch({
      ...row,
      customerName: decrypt(row.customerName),
      customerPhone: decrypt(row.customerPhone),
      deliveryAddress: decrypt(row.deliveryAddress)
    }, search))
    .map((row) => row.id);
};

const getOrders = async (req, res) => {
  try {
    // The client's next updatedSince cursor comes from this server clock,
    // taken before the query, rather than from the newest updatedAt it
    // received — one stray future timestamp (clock skew, a manual DB edit)
    // would otherwise push the cursor ahead and hide real updates.
    res.set('X-Server-Time', new Date().toISOString());

    // --- Driver view: scoped list, not paginated (a driver's book is small) ---
    if (req.driver) {
      const orders = await prisma.order.findMany({
        where: deliveryViewWhere(req.driver.name),
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' }
      });
      return res.json(withDecryptedCustomers(orders));
    }

    // --- Incremental poll: only orders changed since the cursor (kept as a
    // flat array so the frontend can merge them into whatever page is shown) ---
    if (req.query.updatedSince) {
      const since = parseValidDate(req.query.updatedSince);
      if (!since) return res.status(400).json({ error: 'Invalid updatedSince' });
      const orders = await prisma.order.findMany({
        where: { updatedAt: { gte: since } },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' }
      });
      return res.json(withDecryptedCustomers(orders));
    }

    // --- Admin without paging = an admin using the delivery view: the same
    // scope a driver gets, across all drivers, as a flat array. The whole
    // history stays on the paginated Orders page below. ---
    if (req.query.page === undefined) {
      const orders = await prisma.order.findMany({
        where: deliveryViewWhere(),
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' }
      });
      return res.json(withDecryptedCustomers(orders));
    }

    // --- Admin browse, paginated: status filter + search over the whole history ---
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(ORDERS_PAGE_MAX, Math.max(1, parseInt(req.query.limit, 10) || ORDERS_PAGE_SIZE));
    const where = buildStatusWhere(req.query.status);
    if (!where) return res.status(400).json({ error: 'Invalid status filter' });
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    let total;
    let orders;
    if (search) {
      const ids = await searchOrderIds(where, search);
      total = ids.length;
      const pageIds = ids.slice((page - 1) * limit, page * limit);
      const rows = pageIds.length
        ? await prisma.order.findMany({ where: { id: { in: pageIds } }, include: ORDER_INCLUDE })
        : [];
      const byId = new Map(rows.map((o) => [o.id, o]));
      orders = pageIds.map((id) => byId.get(id)).filter(Boolean);
    } else {
      [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          include: ORDER_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        })
      ]);
    }

    res.json({
      data: withDecryptedCustomers(orders),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/orders/summary - Admin: order counts for the Dashboard, without
// downloading every order to count them.
const getOrderSummary = async (req, res) => {
  try {
    const groups = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
    const total = groups.reduce((sum, g) => sum + g._count._all, 0);
    res.json({ total, byStatus });
  } catch (error) {
    console.error('Get order summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Audit actions that describe a single order; their detail text carries the
// order's short number ("#3F2A9C10"). ADMIN_CREATE_ORDER is logged per
// customer, not per order, so the drawer uses the order's createdAt for that.
const ORDER_HISTORY_ACTIONS = ['UPDATE_ORDER_STATUS', 'EDIT_ORDER', 'ASSIGN_ORDER_DRIVER'];

// GET /api/orders/:id/history — the order's own audit entries for the admin
// order drawer's "Verlauf" tab. Only order actions, so it doesn't need the
// passcode that guards the full audit log (logins, settings, ...).
const getOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id }, select: { id: true, createdAt: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const entries = await prisma.auditLog.findMany({
      where: {
        action: { in: ORDER_HISTORY_ACTIONS },
        detail: { contains: `#${id.slice(0, 8).toUpperCase()}` }
      },
      select: { id: true, action: true, adminEmail: true, detail: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ createdAt: order.createdAt, entries });
  } catch (error) {
    console.error('Get order history error:', error);
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

    // Maintenance mode blocks new customer-initiated orders server-side, not
    // just via the frontend UI — a direct API call must be rejected too.
    // Admin-placed orders (e.g. a phone order taken manually) still go
    // through, matching "admin stays fully functional during maintenance".
    if (!req.admin) {
      const storeSettings = await prisma.storeSettings.findUnique({
        where: { id: 'default' },
        select: { maintenanceMode: true }
      });
      if (storeSettings?.maintenanceMode) {
        return res.status(503).json({
          error: 'Der Shop ist aktuell wegen Wartungsarbeiten nicht erreichbar. Bitte versuchen Sie es später erneut. / The store is temporarily down for maintenance. Please try again later.',
          maintenanceMode: true
        });
      }
    }

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

    // One line per product (quantities of repeated lines summed)
    const items = mergeOrderItems(rawItems);

    // Fetch product details and active promotions
    const productIds = items.map(i => i.productId);
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
    const promoMap = selectApplicablePromotions(activePromotions);

    const orderItemsWithDetails = [];

    for (const { productId, quantity: qty } of items) {
      const product = productMap.get(productId);
      if (!product) {
        return res.status(404).json({ error: `Product with id ${productId} not found` });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`
        });
      }

      orderItemsWithDetails.push(buildOrderLine(product, qty, promoMap.get(productId)));
    }

    if (orderItemsWithDetails.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one valid item' });
    }

    const { itemsSubtotal, promotionDiscount: totalPromoSavings } = summarizeOrderLines(orderItemsWithDetails);

    // Resolve delivery address and notes early for postal code and distance checks
    const addressParts = [
      customer.street && `${customer.street} ${customer.houseNumber || ''}`.trim(),
      customer.postalCode && customer.city && `${customer.postalCode} ${customer.city}`.trim(),
      customer.floorApartment && `Apt/Floor: ${customer.floorApartment}`
    ].filter(Boolean);

    const deliveryAddress = String(req.body.deliveryAddress || addressParts.join(', ')).trim();
    const deliveryNotes = req.body.deliveryNotes || customer.deliveryNotes || notes || null;

    // No placeholder address: an order must say where it goes.
    if (!isCompleteDeliveryAddress(deliveryAddress)) {
      return res.status(400).json({
        code: 'ADDRESS_REQUIRED',
        error: 'Bitte geben Sie eine vollständige Lieferadresse mit Straße, Hausnummer und Postleitzahl an. / Please enter a complete delivery address with street, house number and postal code.'
      });
    }

    // Delivery rules: minimum order value, service area and distance-based delivery fee
    const storeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const minOrderValue = storeSettings?.minOrderValue || 0;
    const freeDeliveryThreshold = storeSettings?.freeDeliveryThreshold || 0;
    const allowedPostalCodes = parseAllowedPostalCodes(storeSettings?.allowedPostalCodes);

    if (minOrderValue > 0 && itemsSubtotal < minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value is €${minOrderValue.toFixed(2)}. Your cart total is €${itemsSubtotal.toFixed(2)}.`
      });
    }

    if (!isPostalCodeAllowed(allowedPostalCodes, customer.postalCode, deliveryAddress)) {
      return res.status(400).json({
        error: `Wir liefern derzeit nur an folgende Postleitzahlen: ${allowedPostalCodes.join(', ')} / We currently only deliver to: ${allowedPostalCodes.join(', ')}`
      });
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

      // Validated lines, not rawItems: a line skipped above (e.g. quantity 0)
      // isn't part of the order and must not satisfy a combo coupon's
      // required-products condition.
      const couponEval = validateAndCalculateCoupon(
        couponRecord,
        orderItemsWithDetails,
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

    const isFreeDelivery = qualifiesForFreeDelivery({ isFreeShipping, freeDeliveryThreshold, itemsSubtotal });
    const chargedDeliveryFee = isFreeDelivery ? 0 : distanceResult.totalDeliveryFee;
    const deliveryDistanceKm = distanceResult.distanceKm;
    // Stored even when delivery ends up free: if an admin edit later drops
    // the order below the free-delivery threshold, editOrder needs the real
    // components to charge the fee. `deliveryFee` above is what's charged.
    const baseDeliveryFee = distanceResult.baseFee;
    const distanceDeliveryFee = distanceResult.distanceFee;

    const totalAmount = calculateOrderTotal({ itemsSubtotal, couponDiscount, deliveryFee: chargedDeliveryFee });

    const activeWindowsCount = await prisma.deliveryWindow.count({ where: { isActive: true } });
    // An admin taking a phone order may leave the window empty and set it
    // later from the order's details (the status route), and — like that
    // route — may pick a window that has already started today.
    const slotOptions = { allowPastHoursForToday: Boolean(req.admin) };
    let deliverySlot = null;
    if (activeWindowsCount > 0) {
      if (!req.body.deliverySlot) {
        if (!req.admin) {
          return res.status(400).json({ error: 'Please select a delivery time window' });
        }
      } else {
        const valid = await isValidDeliverySlot(req.body.deliverySlot, slotOptions);
        if (!valid) {
          return res.status(400).json({ error: 'Selected delivery time window is invalid or already closed' });
        }
        deliverySlot = req.body.deliverySlot;
      }
    } else if (req.body.deliverySlot) {
      const valid = await isValidDeliverySlot(req.body.deliverySlot, slotOptions);
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

    // Confirmation email in the background: the order is already committed,
    // and a slow SMTP server must not hold the response — a client that
    // times out and retries would otherwise place the same order twice.
    if (customer.email) {
      sendCustomerOrderConfirmationEmail(
        customer.email,
        customer.name,
        decryptedOrder,
        customer.preferredLanguage || 'de'
      ).catch((err) => console.error('Customer confirmation email failed:', err.message));
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

module.exports = {
  getOrders,
  getOrderSummary,
  getOrderHistory,
  getOrderById,
  createOrder,
  deleteOrder,
  getCustomerOrders
};
