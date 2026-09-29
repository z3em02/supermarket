const test = require('node:test');
const assert = require('node:assert');
const { orderMatchesSearch, isStaleOrderVersion } = require('../utils/orderSearch');

const order = {
  id: '3f2a9c10-aaaa-bbbb-cccc-1234567890ab',
  assignedDriverName: 'Karim',
  customerName: 'Ahmed Yilmaz',
  customer: { name: 'Ahmed Y.' },
  customerPhone: '+43 660 123 4567',
  deliveryAddress: 'Favoritenstraße 12, 1100 Wien'
};

test('empty search matches everything', () => {
  assert.strictEqual(orderMatchesSearch(order, ''), true);
  assert.strictEqual(orderMatchesSearch(order, '   '), true);
});

test('matches order number, driver, customer name, address (case-insensitive)', () => {
  assert.strictEqual(orderMatchesSearch(order, '3F2A9C'), true);
  assert.strictEqual(orderMatchesSearch(order, 'karim'), true);
  assert.strictEqual(orderMatchesSearch(order, 'ahmed'), true);
  assert.strictEqual(orderMatchesSearch(order, 'yilmaz'), true);
  assert.strictEqual(orderMatchesSearch(order, 'favoriten'), true);
  assert.strictEqual(orderMatchesSearch(order, 'Maria'), false);
});

test('matches the account name when the snapshot is missing (older orders)', () => {
  assert.strictEqual(orderMatchesSearch({ id: 'x', customer: { name: 'Leila' } }, 'lei'), true);
});

test('phone search ignores spaces and dashes', () => {
  assert.strictEqual(orderMatchesSearch(order, '0660 123'), false); // leading 0 vs +43 is a different number string
  assert.strictEqual(orderMatchesSearch(order, '660-123-45'), true);
  assert.strictEqual(orderMatchesSearch(order, '6601234567'), true);
  assert.strictEqual(orderMatchesSearch(order, '99-9'), false); // digits not in the number
});

test('stale check only fires when a valid expected version differs', () => {
  const at = new Date('2026-09-29T10:00:00.000Z');
  assert.strictEqual(isStaleOrderVersion(at, undefined), false);
  assert.strictEqual(isStaleOrderVersion(at, ''), false);
  assert.strictEqual(isStaleOrderVersion(at, 'not a date'), false);
  assert.strictEqual(isStaleOrderVersion(at, '2026-09-29T10:00:00.000Z'), false);
  assert.strictEqual(isStaleOrderVersion(at, '2026-09-29T09:59:59.000Z'), true);
});
