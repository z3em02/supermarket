const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ORDER_STATUSES, ORDER_STATUS_TRANSITIONS, isOrderStatus, canChangeOrderStatus } = require('../utils/orderStatus');

test('the normal path works step by step and with forward jumps', () => {
  for (const [from, to] of [
    ['pending', 'accepted'], ['accepted', 'preparing'], ['preparing', 'out_for_delivery'],
    ['out_for_delivery', 'delivered'], ['accepted', 'delivered'], ['accepted', 'out_for_delivery']
  ]) {
    assert.strictEqual(canChangeOrderStatus(from, to), true, `${from} -> ${to}`);
  }
});

test('any open order can be declined, and a declined one reactivated', () => {
  for (const from of ['pending', 'pending_customer_approval', 'accepted', 'preparing', 'out_for_delivery']) {
    assert.strictEqual(canChangeOrderStatus(from, 'declined'), true, from);
  }
  assert.strictEqual(canChangeOrderStatus('declined', 'pending'), true);
  assert.strictEqual(canChangeOrderStatus('declined', 'accepted'), true);
});

test('going back is limited to one step; a delivered order stays delivered', () => {
  assert.strictEqual(canChangeOrderStatus('preparing', 'accepted'), true);
  assert.strictEqual(canChangeOrderStatus('delivered', 'out_for_delivery'), true, 'correcting a mis-click');
  for (const [from, to] of [
    ['delivered', 'pending'], ['delivered', 'accepted'], ['delivered', 'declined'],
    ['out_for_delivery', 'pending'], ['preparing', 'pending'], ['declined', 'delivered'],
    ['pending', 'delivered'], ['pending', 'preparing'], ['pending_customer_approval', 'accepted'],
    ['declined', 'out_for_delivery']
  ]) {
    assert.strictEqual(canChangeOrderStatus(from, to), false, `${from} -> ${to}`);
  }
});

test('keeping the status is always allowed; unknown statuses never are', () => {
  for (const s of ORDER_STATUSES) assert.strictEqual(canChangeOrderStatus(s, s), true, s);
  for (const s of ['shipped', 'rejected', 'cancelled', 'canceled', 'Accepted', '', undefined]) {
    assert.strictEqual(isOrderStatus(s), false, String(s));
    assert.strictEqual(canChangeOrderStatus('pending', s), false, String(s));
  }
});

test('every transition names only real statuses, for every status', () => {
  assert.deepStrictEqual(Object.keys(ORDER_STATUS_TRANSITIONS).sort(), [...ORDER_STATUSES].sort());
  for (const [from, targets] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
    for (const to of targets) assert.ok(isOrderStatus(to), `${from} -> ${to}`);
    assert.ok(!targets.includes(from), `${from} lists itself`);
  }
});

test('the database enum (schema.prisma) has exactly these statuses', () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
  const body = /enum OrderStatus \{([^}]*)\}/.exec(schema);
  assert.ok(body, 'enum OrderStatus not found in schema.prisma');
  const values = body[1].split('\n').map((l) => l.replace(/\/\/.*/, '').trim()).filter(Boolean);
  assert.deepStrictEqual(values, ORDER_STATUSES);
});

test("the frontend's copy of the transitions matches (frontend/src/utils/orderStatus.js)", () => {
  // The frontend is an ES module; Node 22 can require() it.
  const frontend = require('../../frontend/src/utils/orderStatus.js');
  assert.deepStrictEqual(frontend.ORDER_STATUSES, ORDER_STATUSES);
  assert.deepStrictEqual(frontend.ORDER_STATUS_TRANSITIONS, ORDER_STATUS_TRANSITIONS);
});
