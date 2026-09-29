const { test } = require('node:test');
const assert = require('node:assert');
const {
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  normalizeAustrianPhone,
  isStrongPassword,
  secureCompare,
  parseValidDate,
  parseStartDate,
  parseEndDate,
  isString,
  firstNonStringField,
  clampText,
  FIELD_MAX
} = require('../utils/validation');

test('isString only accepts string primitives', () => {
  for (const v of ['', 'x', '  ']) assert.strictEqual(isString(v), true);
  for (const v of [1, null, undefined, {}, [], true]) assert.strictEqual(isString(v), false);
});

test('firstNonStringField finds the first non-string provided field', () => {
  assert.strictEqual(firstNonStringField({ name: 'ok', email: 'ok' }, ['name', 'email']), null);
  assert.strictEqual(firstNonStringField({ name: 'ok', email: { a: 1 } }, ['name', 'email']), 'email');
  // undefined (absent) fields are allowed
  assert.strictEqual(firstNonStringField({ name: 'ok' }, ['name', 'email']), null);
  assert.strictEqual(firstNonStringField({ name: 42 }, ['name']), 'name');
});

test('clampText trims and hard-caps length', () => {
  assert.strictEqual(clampText('  hi  ', 10), 'hi');
  assert.strictEqual(clampText('a'.repeat(50), 10), 'a'.repeat(10));
  assert.strictEqual(clampText(null, 10), '');
  assert.strictEqual(clampText(undefined, 10), '');
  assert.strictEqual(clampText(123, 10), '123');
});

test('FIELD_MAX exposes sensible caps', () => {
  assert.strictEqual(FIELD_MAX.name, 100);
  assert.ok(FIELD_MAX.deliveryNotes >= FIELD_MAX.name);
  for (const k of ['name', 'street', 'houseNumber', 'postalCode', 'city', 'floorApartment', 'deliveryNotes']) {
    assert.strictEqual(typeof FIELD_MAX[k], 'number');
  }
});

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

test('parseStartDate / parseEndDate cover the whole calendar day in store time (Europe/Vienna)', () => {
  const iso = (d) => d && d.toISOString();
  // summer (UTC+2) and winter (UTC+1)
  assert.strictEqual(iso(parseStartDate('2026-09-30')), '2026-09-29T22:00:00.000Z');
  assert.strictEqual(iso(parseEndDate('2026-09-30')), '2026-09-30T21:59:59.999Z');
  assert.strictEqual(iso(parseStartDate('2026-12-01')), '2026-11-30T23:00:00.000Z');
  assert.strictEqual(iso(parseEndDate('2026-12-01')), '2026-12-01T22:59:59.999Z');
  // DST switch days: 23 and 25 hours long
  assert.strictEqual(iso(parseStartDate('2026-03-29')), '2026-03-28T23:00:00.000Z');
  assert.strictEqual(iso(parseEndDate('2026-03-29')), '2026-03-29T21:59:59.999Z');
  assert.strictEqual(iso(parseStartDate('2026-10-25')), '2026-10-24T22:00:00.000Z');
  assert.strictEqual(iso(parseEndDate('2026-10-25')), '2026-10-25T22:59:59.999Z');
  // full timestamps pass through; invalid input is rejected
  assert.strictEqual(iso(parseEndDate('2026-09-30T12:00:00.000Z')), '2026-09-30T12:00:00.000Z');
  for (const bad of ['2026-02-31', 'not-a-date', '', null, undefined]) {
    assert.strictEqual(parseStartDate(bad), null, `start ${JSON.stringify(bad)}`);
    assert.strictEqual(parseEndDate(bad), null, `end ${JSON.stringify(bad)}`);
  }
});
