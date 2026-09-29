const crypto = require('crypto');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

// True only for a real string primitive. Handlers use this to reject object/
// array/number inputs up front (returning 400) that would otherwise reach a
// `.trim()` call or a Prisma `where` clause and throw an unhandled 500.
const isString = (value) => typeof value === 'string';

// Every optional field is either absent (undefined) or a string. Returns the
// name of the first offending field, or null if all are fine.
const firstNonStringField = (obj, fields) => {
  for (const f of fields) {
    if (obj[f] !== undefined && !isString(obj[f])) return f;
  }
  return null;
};

// Trims and hard-caps a free-text field so one request can't persist an
// unbounded string (the 100kb body limit is otherwise the only bound).
const clampText = (value, max) => String(value ?? '').trim().slice(0, max);

// Per-field maximum lengths for customer-entered text (mirrors the driver
// controller's .slice(0, 60) pattern). Generous enough for real addresses.
const FIELD_MAX = {
  name: 100,
  street: 120,
  houseNumber: 20,
  postalCode: 12,
  city: 80,
  floorApartment: 60,
  deliveryNotes: 500
};

// Constant-time string comparison for secrets (OTP codes, tokens) so a
// mismatch doesn't leak how many leading characters matched via timing.
// crypto.timingSafeEqual requires equal-length buffers, so a length
// mismatch is rejected outright (this alone is not timing-sensitive: an
// attacker already knows the fixed OTP/token length).
const secureCompare = (a, b) => {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// Normalizes an Austrian phone number to E.164 (+43...), accepting a leading
// +43, 0043, or a local 0-prefixed number (e.g. "0660 1234567" -> "+436601234567").
// Storing customers' numbers in this single canonical form makes lookups a
// plain hash match, and it's what the WhatsApp Cloud API expects as the
// recipient (minus the "+", see utils/whatsappService.js).
const normalizeAustrianPhone = (phone) => {
  let trimmed = String(phone || '').trim().replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('0043')) trimmed = `+43${trimmed.slice(4)}`;
  else if (/^43[1-9]\d{4,12}$/.test(trimmed)) trimmed = `+${trimmed}`;
  else if (trimmed.startsWith('0') && !trimmed.startsWith('+')) trimmed = `+43${trimmed.slice(1)}`;
  return trimmed;
};

// Austrian numbers only: +43 followed by 4-13 digits, first digit non-zero.
const isValidPhone = (phone) => /^\+43[1-9]\d{3,12}$/.test(normalizeAustrianPhone(phone));

const isValidPostalCode = (postalCode) => /^\d+$/.test(String(postalCode || '').trim());

// Parses a date string, returning null for anything that isn't a valid date
// (rather than letting an unparseable string reach Prisma as an Invalid
// Date, which throws a PrismaClientValidationError / 500 instead of a
// clean 400).
const parseValidDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// A calendar date picked in the admin UI ("2026-09-30") means that day in the
// store's timezone. new Date('2026-09-30') is UTC midnight instead — 01:00 or
// 02:00 in Vienna — which cut the last day off accounting ranges and ended
// coupons/offers early on the day the admin chose as their last one.
const STORE_TIMEZONE = 'Europe/Vienna';
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// How far `timeZone` is ahead of UTC at the instant `date`, in ms.
const timeZoneOffsetMs = (date, timeZone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const wallClockAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
};

// 00:00 store time on the calendar day given as UTC-midnight milliseconds.
const storeMidnight = (utcMidnightMs) => {
  let result = utcMidnightMs - timeZoneOffsetMs(new Date(utcMidnightMs), STORE_TIMEZONE);
  // Re-check with the offset in force at the result itself (DST edge).
  const offsetThere = timeZoneOffsetMs(new Date(result), STORE_TIMEZONE);
  result = utcMidnightMs - offsetThere;
  return new Date(result);
};

// Parses the start or end of a date range / validity period. A plain
// calendar date covers the whole day in store time: as a 'start' it is 00:00
// that day, as an 'end' 23:59:59.999. Full timestamps are taken as given.
// Returns null for anything invalid (including impossible days like 02-31).
const parseDateBoundary = (str, boundary) => {
  if (!str) return null;
  const value = String(str).trim();
  const m = DATE_ONLY.exec(value);
  if (!m) return parseValidDate(value);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utcMidnight = Date.UTC(y, mo - 1, d);
  const check = new Date(utcMidnight);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  if (boundary === 'start') return storeMidnight(utcMidnight);
  return new Date(storeMidnight(Date.UTC(y, mo - 1, d + 1)).getTime() - 1);
};

const parseStartDate = (str) => parseDateBoundary(str, 'start');
const parseEndDate = (str) => parseDateBoundary(str, 'end');

// Strong password: 8+ chars, at least one uppercase, one lowercase, one
// digit and one special character.
const STRONG_PASSWORD_HINT = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.';
const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  normalizeAustrianPhone,
  isStrongPassword,
  STRONG_PASSWORD_HINT,
  secureCompare,
  parseValidDate,
  parseStartDate,
  parseEndDate,
  isString,
  firstNonStringField,
  clampText,
  FIELD_MAX
};
