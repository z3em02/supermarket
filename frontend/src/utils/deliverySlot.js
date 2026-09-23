// Mirrors backend/utils/deliverySlot.js — delivery slots are stored as
// "YYYY-MM-DD_<window>" (e.g. "2026-09-25_16_18"): a customer-chosen date
// combined with one of the store's fixed delivery time windows.
export const DELIVERY_WINDOWS = [
  { value: '10_12', labelDe: '10–12 Uhr', labelAr: '10–12' },
  { value: '16_18', labelDe: '16–18 Uhr', labelAr: '16–18' }
];

export const MAX_DELIVERY_DAYS_AHEAD = 14;

const SLOT_PATTERN = /^(\d{4}-\d{2}-\d{2})_(10_12|16_18)$/;

const toLocalIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayIso = () => toLocalIso(new Date());

export const maxDeliveryDateIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DELIVERY_DAYS_AHEAD);
  return toLocalIso(d);
};

export const buildDeliverySlot = (dateIso, window) => (dateIso && window ? `${dateIso}_${window}` : null);

export const parseDeliverySlot = (slot) => {
  const match = SLOT_PATTERN.exec(String(slot || ''));
  if (!match) return null;
  const [, date, window] = match;
  return { date, window };
};

export const formatDeliverySlot = (slot, isAr) => {
  const parsed = parseDeliverySlot(slot);
  if (!parsed) return null;
  const date = new Date(`${parsed.date}T00:00:00`);
  const dateLabel = date.toLocaleDateString(isAr ? 'ar-EG' : 'de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const windowDef = DELIVERY_WINDOWS.find((w) => w.value === parsed.window);
  const windowLabel = isAr ? windowDef?.labelAr : windowDef?.labelDe;
  return isAr ? `${dateLabel}، ${windowLabel}` : `${dateLabel}, ${windowLabel}`;
};
