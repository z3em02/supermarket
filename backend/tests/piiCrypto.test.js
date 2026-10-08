const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

// piiCrypto reads the key at require time; each test file runs in its own process.
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const { encrypt, decrypt, canDecrypt, keyFingerprint, hashLookup, otpAtRest, decryptCustomerPII } = require('../utils/piiCrypto');

test('encrypt/decrypt round-trips and uses a fresh IV each time', () => {
  const a = encrypt('Hauptstraße 5, 1100 Wien');
  const b = encrypt('Hauptstraße 5, 1100 Wien');
  assert.ok(a.startsWith('enc:v1:'));
  assert.notStrictEqual(a, b);
  assert.strictEqual(decrypt(a), 'Hauptstraße 5, 1100 Wien');
});

test('empty values and legacy plaintext pass through unchanged', () => {
  for (const v of [null, undefined, '']) {
    assert.strictEqual(encrypt(v), v);
    assert.strictEqual(decrypt(v), v);
  }
  assert.strictEqual(decrypt('plain legacy value'), 'plain legacy value');
});

test('tampered ciphertext is not silently accepted', () => {
  const enc = encrypt('secret');
  const tampered = enc.slice(0, -2) + (enc.endsWith('00') ? '11' : '00');
  assert.strictEqual(decrypt(tampered), tampered);
});

test('hashLookup is deterministic and normalizes case/whitespace', () => {
  assert.strictEqual(hashLookup(' Kunde@Example.AT '), hashLookup('kunde@example.at'));
  assert.notStrictEqual(hashLookup('a@example.at'), hashLookup('b@example.at'));
});

test('canDecrypt is true only for values encrypted with this key', () => {
  assert.strictEqual(canDecrypt(encrypt('Favoritenstraße 12')), true);
  // Same format, different key: what a wrong key copy would face.
  const otherKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', otherKey, iv);
  const data = Buffer.concat([cipher.update('Favoritenstraße 12', 'utf8'), cipher.final()]);
  const foreign = `enc:v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${data.toString('hex')}`;
  assert.strictEqual(canDecrypt(foreign), false);
  for (const v of [null, undefined, '', 'plain legacy value', 'enc:v1:zz:zz:zz']) {
    assert.strictEqual(canDecrypt(v), false, String(v));
  }
});

test('keyFingerprint is the first 16 hex chars of SHA-256 over the key bytes', () => {
  const expected = crypto.createHash('sha256').update(Buffer.from(process.env.ENCRYPTION_KEY, 'hex')).digest('hex').slice(0, 16);
  assert.strictEqual(keyFingerprint(), expected);
  assert.match(keyFingerprint(), /^[0-9a-f]{16}$/);
  assert.ok(!process.env.ENCRYPTION_KEY.includes(keyFingerprint()));
});

test('decryptCustomerPII only touches PII fields that are present', () => {
  const row = { id: 'c1', name: 'Name', email: encrypt('kunde@example.at'), city: encrypt('Wien') };
  assert.deepStrictEqual(decryptCustomerPII(row), { id: 'c1', name: 'Name', email: 'kunde@example.at', city: 'Wien' });
  assert.strictEqual(decryptCustomerPII(null), null);
});

test('otpAtRest hashes codes (keyed) in production and matches symmetrically', () => {
  const orig = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const stored = otpAtRest('123456');
    assert.notStrictEqual(stored, '123456');          // plaintext never stored
    assert.match(stored, /^[0-9a-f]{64}$/);           // keyed HMAC digest
    assert.strictEqual(otpAtRest('123456'), stored);  // same code -> same hash (verify matches)
    assert.strictEqual(otpAtRest(' 123456 '), stored); // trimmed first
    assert.notStrictEqual(otpAtRest('654321'), stored); // wrong code -> different hash
  } finally {
    process.env.NODE_ENV = orig;
  }
});

test('otpAtRest stays plaintext outside production (dev tooling/e2e read it)', () => {
  const orig = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';
    assert.strictEqual(otpAtRest('123456'), '123456');
    assert.strictEqual(otpAtRest(' 123456 '), '123456');
  } finally {
    process.env.NODE_ENV = orig;
  }
});
