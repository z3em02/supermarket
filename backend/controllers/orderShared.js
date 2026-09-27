// Helpers shared by the order controllers (orderController,
// orderStatusController, orderModificationController).
const { decryptCustomerPII, decrypt } = require('../utils/piiCrypto');
const { sendPushToCustomer } = require('../utils/pushService');

// Orders carry their own encrypted customer* snapshot columns (a copy taken
// at creation time, kept separate from the Customer row so invoices stay
// readable even after the customer account is deleted — see
// README.md "Personal data & GDPR"), plus the joined `customer` relation which also
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

module.exports = {
  withDecryptedCustomer,
  withDecryptedCustomers,
  STATUS_PUSH_TEXT,
  pushOrderStatusUpdate,
  DECLINED_STATUSES,
  decrementStockOrThrow,
  couponError,
  concurrentUpdateError
};
