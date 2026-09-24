const crypto = require('crypto');

const KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : null;
const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:'; // lets decrypt() tell already-encrypted values from legacy plaintext

if (process.env.NODE_ENV === 'production' && (!KEY || KEY.length !== 32)) {
  throw new Error('FATAL: ENCRYPTION_KEY must be a 64-char hex string (32 bytes) in production.');
}

// AES-256-GCM with a random IV per call, so identical plaintext never
// produces identical ciphertext. Format: enc:v1:<iv>:<authTag>:<ciphertext>, all hex.
const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  if (!KEY) return plaintext; // no key configured (e.g. local dev) — store as-is
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
};

// Returns the value unchanged if it isn't in our encrypted format (covers
// legacy plaintext rows and the no-KEY dev fallback above).
const decrypt = (value) => {
  if (value === null || value === undefined || value === '') return value;
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  if (!KEY) return value; // can't decrypt without the key; return the stored value as-is
  try {
    const [ivHex, authTagHex, dataHex] = value.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (err) {
    console.error('PII decrypt failed:', err.message);
    return value;
  }
};

// Deterministic lookup hash for fields we need exact-match queries on
// (email, phone) — normalize first so lookups are consistent regardless of
// casing/whitespace at the call site.
// #40 fix: use HMAC-SHA-256 with KEY to prevent rainbow-table precomputation
const hashLookup = (value) => {
  if (value === null || value === undefined || value === '') return value;
  const normalized = String(value).trim().toLowerCase();
  if (KEY) {
    return crypto.createHmac('sha256', KEY).update(normalized).digest('hex');
  }
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const CUSTOMER_PII_FIELDS = ['email', 'phone', 'street', 'houseNumber', 'postalCode', 'city', 'floorApartment', 'deliveryNotes'];

// Returns a shallow copy of a customer record (or plain object with a subset
// of these fields) with all PII fields decrypted. Safe to call on partial
// selects — only touches fields that are present.
const decryptCustomerPII = (customer) => {
  if (!customer) return customer;
  const out = { ...customer };
  for (const field of CUSTOMER_PII_FIELDS) {
    if (field in out) out[field] = decrypt(out[field]);
  }
  return out;
};

module.exports = { encrypt, decrypt, hashLookup, decryptCustomerPII, CUSTOMER_PII_FIELDS };
