import { getOrderStatusLabel } from './orderStatus.js';

// Single source of truth for how an order status looks, on every page
// (admin Orders, Customers, driver view, customer account). Pure — no React —
// so it's unit-tested in tests/orderStatusBadge.test.js; the React side is
// pages/orders/useStatusBadge.js and components/OrderStatusBadge.jsx.

// Status key as stored (the database only holds the seven statuses in
// utils/orderStatus.js; the old synonyms were merged by a migration).
export const normalizeOrderStatus = (status) => (status || '').toString().toLowerCase().trim();

// Status -> semantic tone (the design-token colour roles, README "Design system").
export const STATUS_TONES = {
  pending: 'warning',
  pending_customer_approval: 'warning',
  accepted: 'primary',
  preparing: 'promo',
  out_for_delivery: 'info',
  delivered: 'success',
  declined: 'danger'
};

// Full literal class strings (Tailwind only generates classes it can see).
const TONE_BADGE_CLASSES = {
  warning: 'bg-warning-50 text-warning-800 border-warning-200 dark:bg-warning-950/70 dark:text-warning-300 dark:border-warning-900/60',
  primary: 'bg-primary-50 text-primary-800 border-primary-200 dark:bg-primary-950/70 dark:text-primary-300 dark:border-primary-900/60',
  promo: 'bg-promo-50 text-promo-800 border-promo-200 dark:bg-promo-950/70 dark:text-promo-300 dark:border-promo-900/60',
  info: 'bg-info-50 text-info-800 border-info-200 dark:bg-info-950/70 dark:text-info-300 dark:border-info-900/60',
  success: 'bg-success-50 text-success-800 border-success-200 dark:bg-success-950/70 dark:text-success-300 dark:border-success-900/60',
  danger: 'bg-danger-50 text-danger-800 border-danger-200 dark:bg-danger-950/70 dark:text-danger-300 dark:border-danger-900/60',
  neutral: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700'
};
// Needs the customer's action — stronger border so it stands out from plain pending.
const APPROVAL_CLASSES = 'bg-warning-100 text-warning-900 border-warning-400 dark:bg-warning-950/80 dark:text-warning-200 dark:border-warning-700';

// Filter-tile styling for the status summary bar (Orders page).
export const TONE_TILE_CLASSES = {
  neutral: { active: 'bg-primary-50 dark:bg-primary-950/50 border-primary-400 dark:border-primary-700/80', label: 'text-slate-500 dark:text-slate-400' },
  warning: { active: 'bg-warning-50 dark:bg-warning-950/50 border-warning-400 dark:border-warning-700/80', label: 'text-warning-700 dark:text-warning-400' },
  primary: { active: 'bg-primary-50 dark:bg-primary-950/50 border-primary-400 dark:border-primary-700/80', label: 'text-primary-700 dark:text-primary-400' },
  promo: { active: 'bg-promo-50 dark:bg-promo-950/50 border-promo-400 dark:border-promo-700/80', label: 'text-promo-700 dark:text-promo-400' },
  info: { active: 'bg-info-50 dark:bg-info-950/50 border-info-400 dark:border-info-700/80', label: 'text-info-700 dark:text-info-400' },
  success: { active: 'bg-success-50 dark:bg-success-950/50 border-success-400 dark:border-success-700/80', label: 'text-success-700 dark:text-success-400' },
  danger: { active: 'bg-danger-50 dark:bg-danger-950/50 border-danger-400 dark:border-danger-700/80', label: 'text-danger-700 dark:text-danger-400' }
};

const ICONS = {
  pending: 'Clock',
  pending_customer_approval: 'AlertTriangle',
  accepted: 'CheckCircle2',
  preparing: 'Layers',
  out_for_delivery: 'Truck',
  delivered: 'CheckCircle2',
  declined: 'XCircle'
};

// In-motion / waiting-on-someone states pulse (disabled under prefers-reduced-motion).
const PULSING = new Set(['pending_customer_approval', 'out_for_delivery']);

// Wording differs by audience: the customer is told what *they* need to do
// ("review & confirm the change"), not the admin's view ("waiting for customer").
const AUDIENCE_LABELS = {
  customer: {
    pending: { de: 'In Bearbeitung', ar: 'قيد المراجعة والتحضير' },
    pending_customer_approval: { de: 'Änderung prüfen & bestätigen', ar: 'تعديل يتطلب موافقتك' },
    accepted: { de: 'Bestätigt', ar: 'تم تأكيد الطلب' },
    preparing: { de: 'Wird vorbereitet', ar: 'جارٍ التجهيز' },
    out_for_delivery: { de: 'In Zustellung', ar: 'جاري التوصيل للمنزل' },
    delivered: { de: 'Zugestellt', ar: 'تم التوصيل بنجاح' },
    declined: { de: 'Storniert', ar: 'ملغي / مرفوض' }
  },
  driver: {
    accepted: { de: 'Bestätigt', ar: 'طلب جديد مؤكد' },
    preparing: { de: 'Wird vorbereitet', ar: 'قيد التجهيز بالمحل' },
    out_for_delivery: { de: 'Auf dem Weg', ar: 'في الطريق إليك' },
    delivered: { de: 'Zugestellt', ar: 'تم التسليم' }
  },
  admin: {
    pending_customer_approval: { de: 'Wartet auf Kundenbestätigung', ar: 'بانتظار موافقة العميل' },
    out_for_delivery: { de: 'In Zustellung', ar: 'جاري التوصيل للمنزل' }
  }
};

// Admin labels that come from the translation files (so they match the rest
// of the admin UI).
const ADMIN_TRANSLATION_KEYS = new Set(['pending', 'accepted', 'preparing', 'delivered', 'declined']);

/**
 * @param {string} status raw order status
 * @param {{ language?: 'de'|'ar', audience?: 'admin'|'customer'|'driver', t?: (key: string) => string }} [options]
 */
export const getOrderStatusMeta = (status, options = {}) => {
  const rawStatus = (status || '').toString();
  const raw = rawStatus.toLowerCase().trim();
  const key = normalizeOrderStatus(rawStatus);
  const language = options.language === 'ar' ? 'ar' : 'de';
  const audience = AUDIENCE_LABELS[options.audience] ? options.audience : 'admin';
  const t = typeof options.t === 'function' ? options.t : null;

  let label = '';
  const audienceEntry = AUDIENCE_LABELS[audience][key];
  if (audience === 'admin' && t && ADMIN_TRANSLATION_KEYS.has(raw)) {
    const translated = t(raw);
    if (translated && translated !== raw) label = translated;
  }
  if (!label && audienceEntry) {
    label = audienceEntry[language];
  }
  if (!label) label = getOrderStatusLabel(rawStatus, language) || rawStatus;

  const tone = STATUS_TONES[key] || 'neutral';
  return {
    status: key,
    rawStatus,
    tone,
    label,
    classes: key === 'pending_customer_approval' ? APPROVAL_CLASSES : TONE_BADGE_CLASSES[tone],
    iconName: ICONS[key] || 'Clock',
    pulse: PULSING.has(key)
  };
};
