const prisma = require('../lib/prisma');

// Delivery slots are stored as "YYYY-MM-DD_<startHour>_<endHour>", e.g.
// "2026-09-25_16_18" — a customer-chosen delivery date combined with one of
// the store's admin-configurable delivery time windows (see DeliveryWindow
// model / deliveryWindowController). The window's hours are encoded directly
// in the slot rather than referencing a DeliveryWindow id, so a slot already
// on an order keeps a stable, readable time even if that window is later
// edited or deleted.
const MAX_DAYS_AHEAD = 14;
const TIMEZONE = 'Europe/Berlin';

const SLOT_PATTERN = /^(\d{4}-\d{2}-\d{2})_(\d{1,2})_(\d{1,2})$/;

// Get today's ISO date string ("YYYY-MM-DD") in Berlin timezone
const getBerlinTodayIso = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
};

// Get current hour (0-23) in Berlin timezone
const getBerlinCurrentHour = () => {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23'
  }).format(new Date());
  return parseInt(hourStr, 10);
};

// Compute max delivery date ISO string in Berlin timezone
const getBerlinMaxDateIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DAYS_AHEAD);
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
};

const parseDeliverySlot = (slot) => {
  const match = SLOT_PATTERN.exec(String(slot || ''));
  if (!match) return null;
  const [, date, startHourStr, endHourStr] = match;
  return { date, startHour: parseInt(startHourStr, 10), endHour: parseInt(endHourStr, 10) };
};

// Validates format, date range, and window existence.
// If allowPastHoursForToday is false (default, e.g. customer checkout),
// orders for today must have a startHour greater than the current Berlin hour.
// Admin order updates can pass allowPastHoursForToday: true.
const isValidDeliverySlot = async (slot, { allowPastHoursForToday = false } = {}) => {
  const parsed = parseDeliverySlot(slot);
  if (!parsed) return false;

  const { date, startHour, endHour } = parsed;
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < 0 ||
    startHour > 23 ||
    endHour < 1 ||
    endHour > 24 ||
    endHour <= startHour
  ) {
    return false;
  }

  // Validate date format YYYY-MM-DD
  const dateObj = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return false;

  const todayIso = getBerlinTodayIso();
  const maxDateIso = getBerlinMaxDateIso();

  if (date < todayIso || date > maxDateIso) return false;

  // For orders on today's date: check if the window has already started or passed
  if (!allowPastHoursForToday && date === todayIso) {
    const currentHour = getBerlinCurrentHour();
    if (startHour <= currentHour) {
      return false;
    }
  }

  // Check if the window is currently configured and active in the database
  const activeWindow = await prisma.deliveryWindow.findFirst({
    where: { startHour, endHour, isActive: true }
  });
  return Boolean(activeWindow);
};

// Purely derived from the encoded hours — no DB lookup — so formatting a slot
// already stored on an order never breaks even if the window was since removed.
const formatDeliverySlot = (slot, lang = 'de') => {
  const parsed = parseDeliverySlot(slot);
  if (!parsed) return null;

  const date = new Date(`${parsed.date}T00:00:00`);
  const isAr = lang === 'ar';
  const dateLabel = date.toLocaleDateString(isAr ? 'ar-EG' : 'de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const windowLabel = isAr
    ? `${parsed.startHour}–${parsed.endHour}`
    : `${parsed.startHour}–${parsed.endHour} Uhr`;

  return isAr ? `${dateLabel}، ${windowLabel}` : `${dateLabel}, ${windowLabel}`;
};

module.exports = {
  isValidDeliverySlot,
  parseDeliverySlot,
  formatDeliverySlot,
  getBerlinTodayIso,
  getBerlinCurrentHour,
  getBerlinMaxDateIso,
  MAX_DAYS_AHEAD
};
