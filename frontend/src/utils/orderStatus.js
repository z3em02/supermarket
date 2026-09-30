// The seven order statuses and which changes between them the server
// allows: a copy of backend/utils/orderStatus.js (the source of truth). The
// backend test tests/orderStatus.test.js fails if the two differ, so change
// both together. Used to offer only allowed statuses in the admin UI.
export const ORDER_STATUSES = [
  'pending',
  'pending_customer_approval',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'declined'
];

export const ORDER_STATUS_TRANSITIONS = {
  pending: ['accepted', 'declined'],
  pending_customer_approval: ['declined'],
  accepted: ['pending', 'preparing', 'out_for_delivery', 'delivered', 'declined'],
  preparing: ['accepted', 'out_for_delivery', 'delivered', 'declined'],
  out_for_delivery: ['preparing', 'delivered', 'declined'],
  delivered: ['out_for_delivery'],
  declined: ['pending', 'accepted']
};

// Statuses an order can be changed to from `status` (not counting itself).
export const allowedNextStatuses = (status) => ORDER_STATUS_TRANSITIONS[status] || [];

const STATUS_LABELS = {
  pending: { de: 'Ausstehend', ar: 'قيد الانتظار' },
  pending_customer_approval: { de: 'Wartet auf Kunde', ar: 'بانتظار موافقة العميل' },
  accepted: { de: 'Angenommen', ar: 'مقبول' },
  preparing: { de: 'Wird vorbereitet', ar: 'جارٍ التجهيز' },
  out_for_delivery: { de: 'In Zustellung', ar: 'جاري التوصيل للمنزل' },
  delivered: { de: 'Geliefert', ar: 'تم التوصيل' },
  declined: { de: 'Abgelehnt', ar: 'مرفوض' }
};

export const getOrderStatusLabel = (status, language) => {
  const key = (status || '').toLowerCase();
  const entry = STATUS_LABELS[key];
  if (!entry) return status || '';
  return language === 'ar' ? entry.ar : entry.de;
};

// The customer-facing happy-path progression, used to render a live tracking
// timeline. Statuses not in this list (declined/pending_customer_approval)
// are handled separately by the caller rather than mapped to a step index.
export const ORDER_PROGRESS_STEPS = ['accepted', 'preparing', 'out_for_delivery', 'delivered'];

export const getOrderProgressIndex = (status) => {
  const key = (status || '').toLowerCase();
  const index = ORDER_PROGRESS_STEPS.indexOf(key);
  // 'pending' (not yet accepted) sits before the first step, still "in progress" visually.
  if (index === -1 && key === 'pending') return -1;
  return index;
};

export const isOrderStopped = (status) => (status || '').toLowerCase() === 'declined';
