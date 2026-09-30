// The order statuses and which changes between them are allowed: the one
// source of truth for the backend. The database enforces the same list
// (enum OrderStatus in schema.prisma), and the frontend keeps a copy of the
// transitions (frontend/src/utils/orderStatus.js); tests/orderStatus.test.js
// fails if either drifts from this file.

const ORDER_STATUSES = [
  'pending',
  'pending_customer_approval', // an admin changed the items; waiting for the customer's answer
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'declined' // declined by the store or by the customer; stock and coupon given back
];

// Forward jumps are allowed (an admin may skip steps); backwards only one
// step, to correct a mis-click. A delivered order can only go back to "out
// for delivery". A declined order can be reactivated (stock is taken again).
// Leaving pending_customer_approval other than by declining is the
// customer's answer (PUT /api/orders/:id/customer-response), not a status change.
const ORDER_STATUS_TRANSITIONS = {
  pending: ['accepted', 'declined'],
  pending_customer_approval: ['declined'],
  accepted: ['pending', 'preparing', 'out_for_delivery', 'delivered', 'declined'],
  preparing: ['accepted', 'out_for_delivery', 'delivered', 'declined'],
  out_for_delivery: ['preparing', 'delivered', 'declined'],
  delivered: ['out_for_delivery'],
  declined: ['pending', 'accepted']
};

const isOrderStatus = (value) => ORDER_STATUSES.includes(value);

// Keeping the same status (a notes-only or delivery-slot update) is always fine.
const canChangeOrderStatus = (from, to) =>
  from === to || Boolean(ORDER_STATUS_TRANSITIONS[from]?.includes(to));

module.exports = { ORDER_STATUSES, ORDER_STATUS_TRANSITIONS, isOrderStatus, canChangeOrderStatus };
