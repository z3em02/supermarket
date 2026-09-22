const prisma = require('../lib/prisma');
const {
  sendCustomerOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderModificationEmail
} = require('../utils/emailService');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');

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
        accounting: true
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
        accounting: true
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

    // Accept either items or orderItems
    const rawItems = req.body.orderItems || req.body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    let itemsSubtotal = 0;
    const orderItemsWithDetails = [];

    for (const item of rawItems) {
      if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
        continue;
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(404).json({ error: `Product with id ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      const qty = parseInt(item.quantity, 10);
      const subtotal = product.b2bPrice * qty;
      itemsSubtotal += subtotal;

      orderItemsWithDetails.push({
        productId: item.productId,
        productName: product.name,
        quantity: qty,
        price: product.b2bPrice,
        subtotal
      });
    }

    if (orderItemsWithDetails.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one valid item' });
    }

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

    const deliveryFee = deliveryFeeSetting <= 0
      ? 0
      : (freeDeliveryThreshold > 0 && itemsSubtotal >= freeDeliveryThreshold ? 0 : deliveryFeeSetting);
    const totalAmount = itemsSubtotal + deliveryFee;

    const deliverySlot = ALLOWED_DELIVERY_SLOTS.includes(req.body.deliverySlot) ? req.body.deliverySlot : null;

    const addressParts = [
      customer.street && `${customer.street} ${customer.houseNumber || ''}`.trim(),
      customer.postalCode && customer.city && `${customer.postalCode} ${customer.city}`.trim(),
      customer.floorApartment && `Apt/Floor: ${customer.floorApartment}`
    ].filter(Boolean);

    const deliveryAddress = req.body.deliveryAddress || addressParts.join(', ') || 'Home Delivery Address';
    const deliveryNotes = req.body.deliveryNotes || customer.deliveryNotes || notes || null;

    const order = await prisma.$transaction(async (tx) => {
      // Deduct stock atomically per item before creating the order, so two
      // customers racing to buy the last unit can't both succeed.
      for (const item of orderItemsWithDetails) {
        await decrementStockOrThrow(tx, item.productId, item.quantity, item.productName);
      }

      return tx.order.create({
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
          totalAmount,
          notes: notes || null,
          orderItems: {
            create: orderItemsWithDetails.map(({ productId, quantity, price, subtotal }) => ({
              productId,
              quantity,
              price,
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
          }
        }
      });
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
    if (error.isStockError) {
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
        }
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