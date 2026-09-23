// Delivery slots are stored as "YYYY-MM-DD_<window>", e.g. "2026-09-25_16_18" —
// a customer-chosen delivery date combined with one of the store's fixed
// delivery time windows for that day.
const WINDOWS = {
  '10_12': { de: '10–12 Uhr', ar: '10–12' },
  '16_18': { de: '16–18 Uhr', ar: '16–18' }
};

const MAX_DAYS_AHEAD = 14;

const SLOT_PATTERN = /^(\d{4}-\d{2}-\d{2})_(10_12|16_18)$/;

const todayAtMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Validates format, that the window is one of the known ones, and that the
// date falls within [today, today + MAX_DAYS_AHEAD] — rejects past dates and
// unreasonably far-future ones.
const isValidDeliverySlot = (slot) => {
  const match = SLOT_PATTERN.exec(String(slot || ''));
  if (!match) return false;

  const [, dateStr] = match;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const today = todayAtMidnight();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

  return date >= today && date <= maxDate;
};

const formatDeliverySlot = (slot, lang = 'de') => {
  const match = SLOT_PATTERN.exec(String(slot || ''));
  if (!match) return null;

  const [, dateStr, window] = match;
  const date = new Date(`${dateStr}T00:00:00`);
  const isAr = lang === 'ar';
  const dateLabel = date.toLocaleDateString(isAr ? 'ar-EG' : 'de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const windowLabel = WINDOWS[window][isAr ? 'ar' : 'de'];

  return isAr ? `${dateLabel}، ${windowLabel}` : `${dateLabel}, ${windowLabel}`;
};

module.exports = { isValidDeliverySlot, formatDeliverySlot, MAX_DAYS_AHEAD };
