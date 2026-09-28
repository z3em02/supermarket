import { test } from 'node:test';
import assert from 'node:assert';
import { maskPhone, maskAddress } from '../src/pages/customers/masking.js';
import { generateSku } from '../src/pages/products/generateSku.js';
import { toDateInputValue } from '../src/utils/dates.js';

test('phone numbers are masked except the last three digits', () => {
  assert.strictEqual(maskPhone('+43 660 1234567'), '••••••••••567');
  assert.strictEqual(maskPhone('123'), '••••123'); // always at least 4 dots
  assert.strictEqual(maskPhone(''), '—');
  assert.strictEqual(maskPhone(null), '—');
});

test('addresses are fully masked, with a bounded length', () => {
  assert.strictEqual(maskAddress(''), '');
  assert.strictEqual(maskAddress('Weg 1'), '•'.repeat(10));
  assert.strictEqual(maskAddress('x'.repeat(100)), '•'.repeat(28));
  assert.ok(!/[a-z0-9]/i.test(maskAddress('Koppreitergasse 8, 1120 Wien')));
});

test('generated SKUs look like PRD-123456', () => {
  for (let i = 0; i < 50; i++) assert.match(generateSku(), /^PRD-[1-9]\d{5}$/);
});

test('date inputs show the calendar day in the store timezone, not the UTC day', () => {
  const tz = process.env.TZ;
  process.env.TZ = 'Europe/Vienna';
  try {
    // midnight 1 April in Vienna (CEST) is still 31 March in UTC
    assert.strictEqual(toDateInputValue('2026-03-31T22:00:00.000Z'), '2026-04-01');
    // midnight 1 January in Vienna (CET)
    assert.strictEqual(toDateInputValue('2025-12-31T23:00:00.000Z'), '2026-01-01');
    assert.strictEqual(toDateInputValue(null), '');
    assert.strictEqual(toDateInputValue('not a date'), '');
  } finally {
    if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz;
  }
});
