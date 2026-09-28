const prisma = require('../lib/prisma');
const { sendOrderStatusEmail, sendOrderModificationEmail } = require('../utils/emailService');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const { sendPushToCustomer } = require('../utils/pushService');
const { logAudit } = require('../lib/auditLog');
const { calculateCouponDiscountAmount, selectApplicablePromotions } = require('../utils/pricingService');
const { calculateDeliveryDistance } = require('../utils/distanceService');
const { decrypt } = require('../utils/piiCrypto');
const { roundMoney } = require('../utils/money');
const {
  mergeOrderItems,
  buildOrderLine,
  summarizeOrderLines,
  isFreeDelivery: qualifiesForFreeDelivery,
  calculateOrderTotal,
  isCouponStillEligible
} = require('../utils/orderPricing');
const {
  withDecryptedCustomer,
  pushOrderStatusUpdate,
  DECLINED_STATUSES,
  decrementStockOrThrow,
  concurrentUpdateError
} = require('./orderShared');

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

    // A declined/cancelled order has already had its stock and coupon usage
    // given back. Editing it would put it back into the active flow (status
    // pending_customer_approval) without taking either again — reactivate it
    // through the status route first, which does re-deduct stock.
    if (DECLINED_STATUSES.includes(order.status)) {
      return res.status(400).json({
        error: 'Stornierte oder abgelehnte Bestellungen können nicht bearbeitet werden. / Declined or cancelled orders cannot be edited.'
      });
    }

    // Current quantity per product — summed, since orders placed before
    // duplicate lines were merged can hold one product on several lines.
    const oldQuantities = new Map();
    const oldNames = new Map();
    for (const it of order.orderItems) {
      oldQuantities.set(it.productId, (oldQuantities.get(it.productId) || 0) + it.quantity);
      oldNames.set(it.productId, it.product?.name);
    }

    const editedItems = mergeOrderItems(items);

    // Fetch active promotions for the edited product set, same as createOrder,
    // so line-item pricing/discounts are recalculated fresh rather than
    // reusing stale values computed for the pre-edit item list.
    const editedProductIds = editedItems.map((it) => it.productId);
    const [editedProducts, activePromotions] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: editedProductIds } } }),
      prisma.promotion.findMany({
        where: { productId: { in: editedProductIds }, isActive: true }
      })
    ]);
    const productMap = new Map(editedProducts.map((p) => [p.id, p]));
    const promoMap = selectApplicablePromotions(activePromotions);

    // Validate incoming items against the latest product details
    const newItemsToCreate = [];
    const stockAdjustments = []; // { productId, delta, productName }

    for (const { productId, quantity: qty } of editedItems) {
      const product = productMap.get(productId);

      if (!product) {
        return res.status(404).json({ error: `Product ${productId} not found` });
      }

      // #6 fix: strictly use authoritative database catalog price (product.b2bPrice)
      // via calculatePromotionForItem, which itself only ever reads product.b2bPrice —
      // client-supplied price is never trusted, preventing price tampering.
      if (!product.b2bPrice || product.b2bPrice <= 0) {
        return res.status(400).json({ error: `Product "${product.name}" has an invalid catalog price (${product.b2bPrice})` });
      }

      newItemsToCreate.push(buildOrderLine(product, qty, promoMap.get(productId)));

      // Stock for the current items is already deducted (declined orders were
      // rejected above), so only the difference is applied.
      const delta = qty - (oldQuantities.get(productId) || 0); // e.g. 1 - 2 = -1 (return 1)
      stockAdjustments.push({ productId, delta, productName: product.name });
    }

    if (newItemsToCreate.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one valid item' });
    }

    const {
      itemsSubtotal: newItemsSubtotal,
      promotionDiscount: newTotalPromoSavings
    } = summarizeOrderLines(newItemsToCreate);

    // Items removed entirely by the edit go back to stock
    const newProductIds = new Set(newItemsToCreate.map(it => it.productId));
    for (const [prodId, oldQty] of oldQuantities.entries()) {
      if (!newProductIds.has(prodId)) {
        stockAdjustments.push({ productId: prodId, delta: -oldQty, productName: oldNames.get(prodId) });
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
      if (isCouponStillEligible(order.coupon, newItemsSubtotal)) {
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
    // the delivery address is unchanged by this edit. order.isFreeShipping
    // is the coupon's free-shipping perk only; the threshold result is never
    // stored in it, so a later edit re-checks the threshold from scratch.
    const freeDeliveryThreshold = Number(storeSettingsForEdit?.freeDeliveryThreshold) || 0;
    const isFreeDelivery = qualifiesForFreeDelivery({
      isFreeShipping: order.isFreeShipping,
      freeDeliveryThreshold,
      itemsSubtotal: newItemsSubtotal
    });
    let baseDeliveryFee = Number(order.baseDeliveryFee) || 0;
    let distanceDeliveryFee = Number(order.distanceDeliveryFee) || 0;
    // Orders created before the fee components were always stored have them
    // zeroed if delivery was free at the time — when this edit makes delivery
    // chargeable, work the fee out again from the (unchanged) address.
    if (!isFreeDelivery && baseDeliveryFee + distanceDeliveryFee === 0) {
      const recalculated = await calculateDeliveryDistance(decrypt(order.deliveryAddress), storeSettingsForEdit || {});
      baseDeliveryFee = recalculated.baseFee;
      distanceDeliveryFee = recalculated.distanceFee;
    }
    const deliveryFee = isFreeDelivery ? 0 : roundMoney(baseDeliveryFee + distanceDeliveryFee);

    const finalPromotionDiscount = newTotalPromoSavings;
    const finalTotalAmount = calculateOrderTotal({
      itemsSubtotal: newItemsSubtotal,
      couponDiscount: finalCouponDiscount,
      deliveryFee
    });

    // Perform database transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Written first and guarded on the exact version of the order read
        // above: the stock deltas are relative to those items, so if anything
        // changed the order in the meantime (the customer declining a previous
        // modification, a status change, another edit from a stale page) this
        // edit aborts instead of silently overwriting it.
        const guarded = await tx.order.updateMany({
          where: { id, status: order.status, updatedAt: order.updatedAt },
          data: {
            itemsSubtotal: newItemsSubtotal,
            couponDiscount: finalCouponDiscount,
            promotionDiscount: finalPromotionDiscount,
            deliveryFee,
            baseDeliveryFee,
            distanceDeliveryFee,
            totalAmount: finalTotalAmount,
            originalTotalAmount: originalTotal,
            modificationReason: reason,
            status: 'pending_customer_approval',
            adminNotes: adminNotes !== undefined ? adminNotes : order.adminNotes
          }
        });
        if (guarded.count === 0) throw concurrentUpdateError();

        // #25 fix: Apply stock adjustments inside transaction atomically
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
      if (error.isConcurrentUpdateError) {
        return res.status(409).json({ error: error.message });
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
      try {
        await prisma.$transaction(async (tx) => {
          const dateStr = new Date().toLocaleString(customerLang === 'ar' ? 'ar-EG' : 'de-DE');
          const noteText = customerLang === 'ar'
            ? `[وافق العميل على التعديل بتاريخ ${dateStr}]`
            : `[Kunde hat Änderung akzeptiert am ${dateStr}]`;
          const updatedAdminNotes = order.adminNotes
            ? `${order.adminNotes}\n${noteText}`
            : noteText;

          // Same guard as the decline path below: if the admin cancelled or
          // re-edited the order in the meantime, accepting must not bring
          // back a version of it the customer never saw.
          const guarded = await tx.order.updateMany({
            where: { id, status: 'pending_customer_approval', updatedAt: order.updatedAt },
            data: {
              status: 'accepted',
              adminNotes: updatedAdminNotes
            }
          });
          if (guarded.count === 0) throw concurrentUpdateError();

          if (order.accounting) {
            await tx.accounting.update({
              where: { orderId: id },
              data: { status: 'completed' }
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
          // usage a second time. updatedAt also catches an admin re-editing
          // the items meanwhile: the stock given back below is for the items
          // read above.
          const guarded = await tx.order.updateMany({
            where: { id, status: 'pending_customer_approval', updatedAt: order.updatedAt },
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
  editOrder,
  customerRespondToModification
};
