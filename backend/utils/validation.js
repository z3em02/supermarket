const crypto = require('crypto');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

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
// Firebase Phone Auth requires E.164, and storing customers' numbers in this
// single canonical form lets us compare against the phone_number claim on the
// verified Firebase ID token with a plain string match.
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
  parseValidDate
};
