import { test } from 'node:test';
import assert from 'node:assert';
import { parseOrderNotes } from '../src/pages/orders/orderNotes.js';

test('no notes -> nothing to show', () => {
  assert.deepStrictEqual(parseOrderNotes(null, 'de'), { customNotes: '', customerResponse: null });
  assert.deepStrictEqual(parseOrderNotes('', 'ar'), { customNotes: '', customerResponse: null });
});

test('the customer accept line is pulled out, other notes stay', () => {
  const notes = 'Bitte vorher anrufen\n[Kunde hat Änderung akzeptiert am 16.09.2026, 12:00]\nFahrer: alles ok';
  const r = parseOrderNotes(notes, 'de');
  assert.strictEqual(r.customNotes, 'Bitte vorher anrufen\nFahrer: alles ok');
  assert.strictEqual(r.customerResponse.type, 'accepted');
  assert.strictEqual(r.customerResponse.date, '16.09.2026, 12:00');
  assert.match(r.customerResponse.label, /^Kunde hat Änderung akzeptiert/);
});

test('decline lines written in Arabic are recognised and labelled in German', () => {
  const r = parseOrderNotes('[رفض العميل التعديل وتم إلغاء الطلب بتاريخ 17.09.2026]', 'de');
  assert.strictEqual(r.customerResponse.type, 'declined');
  assert.strictEqual(r.customerResponse.date, '17.09.2026');
  assert.match(r.customerResponse.label, /abgelehnt/);
  assert.strictEqual(r.customNotes, '');
});

test('labels follow the UI language', () => {
  const r = parseOrderNotes('[Kunde hat Änderung akzeptiert am 1.1.2026]', 'ar');
  assert.match(r.customerResponse.label, /وافق العميل/);
});
