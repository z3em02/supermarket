const STATUS_LABELS = {
  pending: { de: 'Ausstehend', ar: 'قيد الانتظار' },
  pending_customer_approval: { de: 'Wartet auf Kunde', ar: 'بانتظار موافقة العميل' },
  accepted: { de: 'Angenommen', ar: 'مقبول' },
  confirmed: { de: 'Angenommen', ar: 'مقبول' },
  preparing: { de: 'Wird vorbereitet', ar: 'جارٍ التجهيز' },
  shipped: { de: 'Versandt', ar: 'تم الشحن' },
  out_for_delivery: { de: 'In Zustellung', ar: 'جاري التوصيل للمنزل' },
  delivered: { de: 'Geliefert', ar: 'تم التوصيل' },
  declined: { de: 'Abgelehnt', ar: 'مرفوض' },
  rejected: { de: 'Abgelehnt', ar: 'مرفوض' },
  decline: { de: 'Abgelehnt', ar: 'مرفوض' },
  canceled: { de: 'Storniert', ar: 'ملغي' },
  cancelled: { de: 'Storniert', ar: 'ملغي' },
  completed: { de: 'Abgeschlossen', ar: 'مكتمل' }
};

export const getOrderStatusLabel = (status, language) => {
  const key = (status || '').toLowerCase();
  const entry = STATUS_LABELS[key];
  if (!entry) return status || '';
  return language === 'ar' ? entry.ar : entry.de;
};

// The customer-facing happy-path progression, used to render a live tracking
// timeline. Statuses not in this list (declined/cancelled/pending_customer_approval)
// are handled separately by the caller rather than mapped to a step index.
export const ORDER_PROGRESS_STEPS = ['accepted', 'preparing', 'out_for_delivery', 'delivered'];

// Some statuses are synonyms of a step above (e.g. 'shipped'/'confirmed' from
// older data or admin-facing wording) — normalize them onto the same step.
const STEP_ALIASES = { confirmed: 'accepted', shipped: 'out_for_delivery' };

export const getOrderProgressIndex = (status) => {
  const key = STEP_ALIASES[(status || '').toLowerCase()] || (status || '').toLowerCase();
  const index = ORDER_PROGRESS_STEPS.indexOf(key);
  // 'pending' (not yet accepted) sits before the first step, still "in progress" visually.
  if (index === -1 && key === 'pending') return -1;
  return index;
};

export const isOrderStopped = (status) =>
  ['declined', 'rejected', 'decline', 'canceled', 'cancelled'].includes((status || '').toLowerCase());
