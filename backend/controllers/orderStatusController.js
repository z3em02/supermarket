const prisma = require('../lib/prisma');
const { sendOrderStatusEmail } = require('../utils/emailService');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const { logAudit } = require('../lib/auditLog');
const { isValidDeliverySlot } = require('../utils/deliverySlot');
const {
  withDecryptedCustomer,
  pushOrderStatusUpdate,
  DECLINED_STATUSES,
  decrementStockOrThrow,
  concurrentUpdateError
} = require('./orderShared');

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

    if (!req.driver && deliverySlot !== undefined && deliverySlot !== null && !(await isValidDeliverySlot(deliverySlot, { allowPastHoursForToday: true }))) {
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
    // to earlier stages, which stays admin-only. The order also has to be in
    // delivery already: a driver must not skip a pending customer approval,
    // or turn a declined order back into an active one (which would deduct
    // its stock again and reopen its accounting record).
    const DRIVER_ALLOWED_STATUSES = ['out_for_delivery', 'shipped', 'delivered'];
    const DRIVER_SOURCE_STATUSES = ['accepted', 'preparing', 'shipped', 'out_for_delivery'];
    if (req.driver) {
      if (status === undefined || !DRIVER_ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(403).json({ error: 'Drivers can only mark orders as out for delivery or delivered' });
      }
      if (!DRIVER_SOURCE_STATUSES.includes(order.status)) {
        return res.status(409).json({ error: `Diese Bestellung kann im aktuellen Status nicht vom Fahrer geändert werden / This order can't be updated by a driver in its current status (${order.status}).` });
      }
    }

    // Drivers only report progress — the customer-facing note, the admin's
    // internal notes and the delivery slot stay admin-only. The delivery
    // view's remark (timestamp, cash collected, free text — sent by a driver,
    // or an admin using that view) is appended to the notes read just above,
    // so it can't overwrite anything written in the meantime.
    const finalNotes = !req.driver && notes !== undefined ? notes : order.notes;
    let finalAdminNotes = !req.driver && adminNotes !== undefined ? adminNotes : order.adminNotes;
    const driverNote = typeof req.body.driverNote === 'string' ? req.body.driverNote.trim().slice(0, 500) : '';
    if (driverNote) {
      finalAdminNotes = finalAdminNotes ? `${finalAdminNotes}\n${driverNote}` : driverNote;
    }
    // Admin can directly overwrite the customer's requested delivery slot
    // (e.g. after a phone call) — no separate customer approval needed, unlike
    // item modifications.
    const finalDeliverySlot = !req.driver && deliverySlot !== undefined ? deliverySlot : order.deliverySlot;

    const statusChanged = normalizedStatus !== order.status;
    const wasStockDeducted = !DECLINED_STATUSES.includes(order.status);
    const shouldStockBeDeducted = !DECLINED_STATUSES.includes(normalizedStatus);

    // Every write below only applies to the exact version of the order read
    // above: the stock/coupon handling depends on the status this request
    // observed, and a driver's remark is appended to the notes it read. If a
    // concurrent request changed the order in between (double-click, an admin
    // declining while the driver marks it delivered, ...) this one aborts
    // with a 409 instead of silently overwriting that change.
    const unchangedSinceRead = { id, status: order.status, updatedAt: order.updatedAt };

    if (!wasStockDeducted && shouldStockBeDeducted) {
      // Transitioning out of a declined/cancelled state back into an active one
      // (e.g. an admin un-declining an order): re-deduct stock atomically.
      try {
        await prisma.$transaction(async (tx) => {
          // #9 fix: guard the transition on the status this request actually
          // observed — if a concurrent request already moved the order off
          // that status, abort before touching stock at all (double-submit guard).
          const guarded = await tx.order.updateMany({
            where: unchangedSinceRead,
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
            where: unchangedSinceRead,
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
      // Stock state does not change (e.g. accepted -> preparing, declined -> rejected, or notes update only).
      // Guarded like the branches above — a plain update here could e.g.
      // overwrite a decline that landed a moment earlier (leaving an active
      // order whose stock was already given back).
      const guarded = await prisma.order.updateMany({
        where: unchangedSinceRead,
        data: {
          status: normalizedStatus,
          notes: finalNotes,
          adminNotes: finalAdminNotes,
          deliverySlot: finalDeliverySlot
        }
      });
      if (guarded.count === 0) {
        return res.status(409).json({ error: concurrentUpdateError().message });
      }
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

      // Only notify on an actual status change — this route also saves admin
      // notes, delivery-slot changes and driver remarks with the status left
      // as it is, and none of those should re-send "order accepted".
      if (statusChanged) {
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
      }
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

module.exports = {
  updateOrderStatus,
  assignOrderDriver
};
