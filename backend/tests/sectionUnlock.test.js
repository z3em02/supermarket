const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-jwt-secret-'.padEnd(48, 'x');
process.env.SECTION_UNLOCK_SECRET = 'test-unlock-secret-'.padEnd(48, 'y');

// Stand-in for lib/prisma: the middleware only reads the stored PIN hash.
let storedHash = null;
const prismaPath = require.resolve('../lib/prisma');
const fake = new Module(prismaPath);
fake.filename = prismaPath;
fake.loaded = true;
fake.exports = { storeSettings: { findUnique: async () => ({ sectionPasscodeHash: storedHash }) } };
require.cache[prismaPath] = fake;

const { sectionUnlockMiddleware, issueSectionUnlockToken, invalidateSectionPasscodeCache } = require(path.join('..', 'middleware', 'sectionUnlock'));

const run = async ({ adminId = 'admin-1', token } = {}) => {
  const req = { admin: { id: adminId }, headers: token ? { 'x-section-unlock': token } : {} };
  let status = null; let body = null; let nextCalled = false;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  await sectionUnlockMiddleware(req, res, () => { nextCalled = true; });
  return { nextCalled, status, body };
};
const setPin = (hash) => { storedHash = hash; invalidateSectionPasscodeCache(); };

beforeEach(() => setPin('$2a$10$hash-of-pin-one'));

test('without a PIN configured every admin passes', async () => {
  setPin(null);
  assert.strictEqual((await run()).nextCalled, true);
});

test('with a PIN configured, a request without an unlock token is refused', async () => {
  const r = await run();
  assert.strictEqual(r.nextCalled, false);
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.code, 'SECTION_LOCKED');
});

test('a token issued for the current PIN unlocks for the same admin only', async () => {
  const token = issueSectionUnlockToken('admin-1', storedHash);
  assert.strictEqual((await run({ token })).nextCalled, true);
  assert.strictEqual((await run({ token, adminId: 'admin-2' })).status, 403);
});

test('changing the PIN invalidates tokens issued for the old one', async () => {
  const oldToken = issueSectionUnlockToken('admin-1', storedHash);
  setPin('$2a$10$hash-of-pin-two');
  assert.strictEqual((await run({ token: oldToken })).status, 403);
  const newToken = issueSectionUnlockToken('admin-1', storedHash);
  assert.strictEqual((await run({ token: newToken })).nextCalled, true);
});

test('admin session JWTs and forged tokens do not unlock sections', async () => {
  const adminJwt = jwt.sign({ id: 'admin-1', role: 'admin' }, process.env.JWT_SECRET);
  assert.strictEqual((await run({ token: adminJwt })).status, 403);
  const wrongScope = jwt.sign({ adminId: 'admin-1', scope: 'something-else' }, process.env.SECTION_UNLOCK_SECRET);
  assert.strictEqual((await run({ token: wrongScope })).status, 403);
  assert.strictEqual((await run({ token: 'garbage' })).status, 403);
});
