const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

// Normalizes an Austrian phone number to E.164 (+43...), accepting a leading
// +43, 0043, or a local 0-prefixed number (e.g. "0660 1234567" -> "+436601234567").
// Firebase Phone Auth requires E.164, and storing customers' numbers in this
// single canonical form lets us compare against the phone_number claim on the
// verified Firebase ID token with a plain string match.
const normalizeAustrianPhone = (phone) => {
  let trimmed = String(phone || '').trim().replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('0043')) trimmed = `+43${trimmed.slice(4)}`;
  else if (trimmed.startsWith('43') && !trimmed.startsWith('+')) trimmed = `+${trimmed}`;
  else if (trimmed.startsWith('0') && !trimmed.startsWith('+')) trimmed = `+43${trimmed.slice(1)}`;
  return trimmed;
};

// Austrian numbers only: +43 followed by 4-13 digits, first digit non-zero.
const isValidPhone = (phone) => /^\+43[1-9]\d{3,12}$/.test(normalizeAustrianPhone(phone));

const isValidPostalCode = (postalCode) => /^\d+$/.test(String(postalCode || '').trim());

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
  STRONG_PASSWORD_HINT
};
