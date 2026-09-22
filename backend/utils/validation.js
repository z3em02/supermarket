const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const isValidPhone = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!/^\+?[0-9\s\-()]{6,20}$/.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, '').length;
  return digitCount >= 6 && digitCount <= 15;
};

const isValidPostalCode = (postalCode) => /^\d+$/.test(String(postalCode || '').trim());

module.exports = { isValidEmail, isValidPhone, isValidPostalCode };
