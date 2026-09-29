import { test } from 'node:test';
import assert from 'node:assert';
import { isCompleteDeliveryAddress } from '../src/utils/address.js';

test('checkout needs a street/place name and a postal code', () => {
  assert.strictEqual(isCompleteDeliveryAddress('Favoritenstraße 12, 1100 Wien'), true);
  assert.strictEqual(isCompleteDeliveryAddress('شارع فافوريتن 12، 1100 فيينا'), true);
  assert.strictEqual(isCompleteDeliveryAddress(''), false);
  assert.strictEqual(isCompleteDeliveryAddress('Favoritenstraße 12'), false);
  assert.strictEqual(isCompleteDeliveryAddress('1100'), false);
});
