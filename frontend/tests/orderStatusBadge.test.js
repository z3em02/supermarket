import { test } from 'node:test';
import assert from 'node:assert';
import { getOrderStatusMeta, normalizeOrderStatus, STATUS_TONES } from '../src/utils/orderStatusBadge.js';

test('aliases fold onto canonical statuses', () => {
  assert.strictEqual(normalizeOrderStatus('Confirmed'), 'accepted');
  assert.strictEqual(normalizeOrderStatus('shipped'), 'out_for_delivery');
  assert.strictEqual(normalizeOrderStatus('completed'), 'delivered');
  for (const s of ['rejected', 'decline', 'canceled', 'cancelled']) {
    assert.strictEqual(normalizeOrderStatus(s), 'declined');
  }
  assert.strictEqual(normalizeOrderStatus(null), '');
});

test('each status has one colour, the same for every audience', () => {
  for (const status of Object.keys(STATUS_TONES)) {
    const admin = getOrderStatusMeta(status, { audience: 'admin' });
    const customer = getOrderStatusMeta(status, { audience: 'customer' });
    const driver = getOrderStatusMeta(status, { audience: 'driver' });
    assert.strictEqual(admin.classes, customer.classes, status);
    assert.strictEqual(admin.classes, driver.classes, status);
  }
  assert.strictEqual(getOrderStatusMeta('shipped').classes, getOrderStatusMeta('out_for_delivery').classes);
  assert.strictEqual(getOrderStatusMeta('delivered').tone, 'success');
  assert.strictEqual(getOrderStatusMeta('cancelled').tone, 'danger');
  assert.match(getOrderStatusMeta('accepted').classes, /bg-primary-50/);
});

test('customers are asked to act, admins see who is waiting', () => {
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval', { audience: 'customer' }).label, 'Änderung prüfen & bestätigen');
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval', { audience: 'customer', language: 'ar' }).label, 'تعديل يتطلب موافقتك');
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval', { audience: 'admin' }).label, 'Wartet auf Kundenbestätigung');
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval').pulse, true);
});

test('admin labels come from translations, keyed by the raw status', () => {
  const t = (k) => ({ shipped: 'Versandt', delivered: 'Geliefert' }[k] || k);
  assert.strictEqual(getOrderStatusMeta('shipped', { t }).label, 'Versandt');
  assert.strictEqual(getOrderStatusMeta('out_for_delivery', { t }).label, 'In Zustellung');
  assert.strictEqual(getOrderStatusMeta('delivered', { t }).label, 'Geliefert');
});

test('unknown statuses fall back to a neutral badge with the raw text', () => {
  const m = getOrderStatusMeta('weird_status');
  assert.strictEqual(m.tone, 'neutral');
  assert.strictEqual(m.label, 'weird_status');
  assert.strictEqual(m.iconName, 'Clock');
});
