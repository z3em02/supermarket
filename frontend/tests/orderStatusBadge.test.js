import { test } from 'node:test';
import assert from 'node:assert';
import { getOrderStatusMeta, normalizeOrderStatus, STATUS_TONES } from '../src/utils/orderStatusBadge.js';

test('statuses are used as stored (the old synonyms were merged by a migration)', () => {
  assert.strictEqual(normalizeOrderStatus(' Out_For_Delivery '), 'out_for_delivery');
  assert.strictEqual(normalizeOrderStatus(null), '');
  // A synonym from before the migration is just an unknown status now.
  assert.strictEqual(getOrderStatusMeta('shipped').tone, 'neutral');
});

test('each status has one colour, the same for every audience', () => {
  for (const status of Object.keys(STATUS_TONES)) {
    const admin = getOrderStatusMeta(status, { audience: 'admin' });
    const customer = getOrderStatusMeta(status, { audience: 'customer' });
    const driver = getOrderStatusMeta(status, { audience: 'driver' });
    assert.strictEqual(admin.classes, customer.classes, status);
    assert.strictEqual(admin.classes, driver.classes, status);
  }
  assert.strictEqual(getOrderStatusMeta('delivered').tone, 'success');
  assert.strictEqual(getOrderStatusMeta('declined').tone, 'danger');
  assert.match(getOrderStatusMeta('accepted').classes, /bg-primary-50/);
});

test('customers are asked to act, admins see who is waiting', () => {
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval', { audience: 'customer' }).label, 'Änderung prüfen & bestätigen');
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval', { audience: 'customer', language: 'ar' }).label, 'تعديل يتطلب موافقتك');
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval', { audience: 'admin' }).label, 'Wartet auf Kundenbestätigung');
  assert.strictEqual(getOrderStatusMeta('pending_customer_approval').pulse, true);
});

test('admin labels come from translations where the admin UI has them', () => {
  const t = (k) => ({ delivered: 'Geliefert' }[k] || k);
  assert.strictEqual(getOrderStatusMeta('out_for_delivery', { t }).label, 'In Zustellung');
  assert.strictEqual(getOrderStatusMeta('delivered', { t }).label, 'Geliefert');
});

test('unknown statuses fall back to a neutral badge with the raw text', () => {
  const m = getOrderStatusMeta('weird_status');
  assert.strictEqual(m.tone, 'neutral');
  assert.strictEqual(m.label, 'weird_status');
  assert.strictEqual(m.iconName, 'Clock');
});
