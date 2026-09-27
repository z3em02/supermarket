const { test } = require('node:test');
const assert = require('node:assert');
const {
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  normalizeAustrianPhone,
  isStrongPassword,
  secureCompare,
  parseValidDate
} = require('../utils/validation');

test('normalizeAustrianPhone converts local and 0043 formats to E.164', () => {
  assert.strictEqual(normalizeAustrianPhone('0660 1234567'), '+436601234567');
  assert.strictEqual(normalizeAustrianPhone('0043 660 123-4567'), '+436601234567');
  assert.strictEqual(normalizeAustrianPhone('436601234567'), '+436601234567');
  assert.strictEqual(normalizeAustrianPhone('+43 (660) 1234567'), '+436601234567');
});

test('isValidPhone accepts Austrian numbers only', () => {
  assert.strictEqual(isValidPhone('0660 1234567'), true);
  assert.strictEqual(isValidPhone('+49 151 12345678'), false);
  assert.strictEqual(isValidPhone('+430123'), false);
  assert.strictEqual(isValidPhone(''), false);
});

test('isValidEmail', () => {
  assert.strictEqual(isValidEmail('kunde@example.at'), true);
  assert.strictEqual(isValidEmail(' kunde@example.at '), true);
  assert.strictEqual(isValidEmail('kunde@example'), false);
  assert.strictEqual(isValidEmail('kunde example.at'), false);
  assert.strictEqual(isValidEmail(null), false);
});

test('isValidPostalCode requires digits only', () => {
  assert.strictEqual(isValidPostalCode('1100'), true);
  assert.strictEqual(isValidPostalCode('A-1100'), false);
  assert.strictEqual(isValidPostalCode(''), false);
});

test('isStrongPassword requires all character classes and 8+ chars', () => {
  assert.strictEqual(isStrongPassword('Abcdef1!'), true);
  assert.strictEqual(isStrongPassword('Abcde1!'), false);
  assert.strictEqual(isStrongPassword('abcdef1!'), false);
  assert.strictEqual(isStrongPassword('ABCDEF1!'), false);
  assert.strictEqual(isStrongPassword('Abcdefg!'), false);
  assert.strictEqual(isStrongPassword('Abcdefg1'), false);
  assert.strictEqual(isStrongPassword(undefined), false);
});

test('secureCompare', () => {
  assert.strictEqual(secureCompare('123456', '123456'), true);
  assert.strictEqual(secureCompare('123456', '123457'), false);
  assert.strictEqual(secureCompare('123456', '12345'), false);
  assert.strictEqual(secureCompare(null, undefined), true);
});

test('parseValidDate returns null for invalid input', () => {
  assert.ok(parseValidDate('2026-09-25') instanceof Date);
  assert.strictEqual(parseValidDate('not a date'), null);
  assert.strictEqual(parseValidDate(''), null);
});
