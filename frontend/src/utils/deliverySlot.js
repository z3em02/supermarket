import { getApiUrl } from './api';

// Mirrors backend/utils/deliverySlot.js — delivery slots are stored as
// "YYYY-MM-DD_<startHour>_<endHour>" (e.g. "2026-09-25_16_18"): a
// customer-chosen date combined with one of the store's admin-configurable
// delivery time windows (see admin Settings -> Delivery Time Windows).
export const MAX_DELIVERY_DAYS_AHEAD = 14;

const SLOT_PATTERN = /^(\d{4}-\d{2}-\d{2})_(\d{1,2})_(\d{1,2})$/;

const toLocalIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayIso = () => toLocalIso(new Date());

export const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalIso(d);
};

export const maxDeliveryDateIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DELIVERY_DAYS_AHEAD);
  return toLocalIso(d);
};

export const windowValue = (startHour, endHour) => `${startHour}_${endHour}`;

export const windowLabel = (startHour, endHour, isAr) =>
  isAr ? `${startHour}–${endHour}` : `${startHour}–${endHour} Uhr`;

export const buildDeliverySlot = (dateIso, startHour, endHour) =>
  dateIso && startHour != null && endHour != null ? `${dateIso}_${startHour}_${endHour}` : null;

export const parseDeliverySlot = (slot) => {
  const match = SLOT_PATTERN.exec(String(slot || ''));
  if (!match) return null;
  const [, date, startHour, endHour] = match;
  return { date, startHour: parseInt(startHour, 10), endHour: parseInt(endHour, 10) };
};

// Purely derived from the encoded hours — works even for a slot whose window
// was since edited or removed from the admin-configured list.
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
  return `${dateLabel}${isAr ? '،' : ','} ${windowLabel(parsed.startHour, parsed.endHour, isAr)}`;
};

/**
 * Checks whether a given delivery window is open/selectable for the specified date.
 * For today, windows whose startHour has already arrived or passed are closed.
 */
export const isWindowAvailableForDate = (win, dateIso) => {
  if (!win || !dateIso) return false;
  const today = todayIso();
  if (dateIso < today) return false;
  if (dateIso > today) return true;

  // On today's date, the delivery window must start in the future
  const now = new Date();
  const currentHour = now.getHours();
  return Number(win.startHour) > currentHour;
};

/**
 * Returns only the available windows for a given date.
 */
export const getAvailableWindowsForDate = (windows, dateIso) => {
  if (!Array.isArray(windows)) return [];
  return windows.filter((w) => isWindowAvailableForDate(w, dateIso));
};

/**
 * Returns the earliest date (today or tomorrow) that has at least one open window.
 */
export const getEarliestAvailableDate = (windows) => {
  if (!Array.isArray(windows) || windows.length === 0) return todayIso();
  const hasToday = windows.some((w) => isWindowAvailableForDate(w, todayIso()));
  return hasToday ? todayIso() : tomorrowIso();
};

// Fetches the store's currently active delivery time windows (admin-managed
// in Settings). Used to render the selectable options at checkout.
export const fetchActiveDeliveryWindows = async () => {
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/api/delivery-windows/active`);
  if (!res.ok) return [];
  return res.json();
};
