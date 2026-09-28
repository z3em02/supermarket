const { test } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-'.padEnd(48, 'x');
process.env.SECTION_UNLOCK_SECRET = process.env.SECTION_UNLOCK_SECRET || 'test-unlock-secret-'.padEnd(48, 'y');
const { clearCsrfCookieUnlessOtherSession, requireCsrfForCookieAuth } = require('../middleware/csrf');

const fakeRes = () => {
  const res = { cleared: [], statusCode: null, body: null };
  res.clearCookie = (name) => { res.cleared.push(name); };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

test('the CSRF cookie is cleared only when no other session remains', () => {
  let res = fakeRes();
  clearCsrfCookieUnlessOtherSession({ cookies: { token: 'a', csrf_token: 'c' } }, res, 'token');
  assert.deepStrictEqual(res.cleared, ['csrf_token']);

  for (const other of ['customer_token', 'driver_token']) {
    res = fakeRes();
    clearCsrfCookieUnlessOtherSession({ cookies: { token: 'a', [other]: 'b', csrf_token: 'c' } }, res, 'token');
    assert.deepStrictEqual(res.cleared, [], `keeps it while ${other} is set`);
  }

  res = fakeRes();
  clearCsrfCookieUnlessOtherSession({ cookies: { customer_token: 'a', token: 'admin' } }, res, 'customer_token');
  assert.deepStrictEqual(res.cleared, []);

  res = fakeRes();
  clearCsrfCookieUnlessOtherSession({}, res, 'driver_token');
  assert.deepStrictEqual(res.cleared, ['csrf_token']);
});

test('requireCsrfForCookieAuth only guards cookie-authenticated writes', () => {
  const call = (method, usedCookieAuth, cookies, headers = {}) => {
    const res = fakeRes();
    const ok = requireCsrfForCookieAuth({ method, cookies, headers }, res, usedCookieAuth);
    return { ok, status: res.statusCode };
  };
  // header (Bearer) auth and reads are never blocked
  assert.deepStrictEqual(call('POST', false, {}), { ok: true, status: null });
  assert.deepStrictEqual(call('GET', true, { csrf_token: 'c' }), { ok: true, status: null });
  // cookie auth + write: header must match the cookie
  assert.deepStrictEqual(call('POST', true, { csrf_token: 'c' }, { 'x-csrf-token': 'c' }), { ok: true, status: null });
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.deepStrictEqual(call(method, true, { csrf_token: 'c' }), { ok: false, status: 403 }, `${method} without header`);
  }
  assert.deepStrictEqual(call('PUT', true, { csrf_token: 'c' }, { 'x-csrf-token': 'x' }), { ok: false, status: 403 });
  assert.deepStrictEqual(call('PUT', true, {}, { 'x-csrf-token': 'c' }), { ok: false, status: 403 });
});
