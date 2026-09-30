// HTTP-level checks of the real server (server.js) for everything that is
// decided before the database is touched: routing, body parsing, auth and
// CSRF checks, input validation, logout cookies, CORS and security headers,
// the health check's "database down" answer, request ids and shutdown.
//
// The server runs as a child process on a free local port with dummy
// secrets and an unreachable DATABASE_URL, from a temp directory so no .env
// is picked up; every variable named in backend/.env is blanked too (the
// generated Prisma client would otherwise read it). Nothing here can reach a
// real database or send email.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const BACKEND = path.join(__dirname, '..');
let server;
let base;
let serverLog = '';

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  srv.on('error', reject);
});

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env };
  const dotenv = path.join(BACKEND, '.env');
  if (fs.existsSync(dotenv)) {
    for (const line of fs.readFileSync(dotenv, 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=/.exec(line);
      if (m) env[m[1]] = '';
    }
  }
  Object.assign(env, {
    NODE_ENV: 'test',
    PORT: String(port),
    HOST: '127.0.0.1',
    JWT_SECRET: 'test-jwt-secret-'.padEnd(48, 'x'),
    SECTION_UNLOCK_SECRET: 'test-unlock-secret-'.padEnd(48, 'y'),
    ENCRYPTION_KEY: 'a'.repeat(64),
    DATABASE_URL: 'postgresql://nobody:nothing@127.0.0.1:1/none',
    DIRECT_URL: 'postgresql://nobody:nothing@127.0.0.1:1/none',
    FRONTEND_URL: 'https://shop.example',
    REDIS_URL: ''
  });
  server = spawn(process.execPath, [path.join(BACKEND, 'server.js')], { cwd: os.tmpdir(), env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });

  for (let i = 0; i < 100; i++) {
    // Any answer means it's listening. Not /health: it waits for the
    // (unreachable) database, up to 2 s on Windows.
    try { await fetch(`${base}/api/does-not-exist`); return; } catch { /* not up yet */ }
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not start:\n${serverLog}`);
});

after(() => { if (server && server.exitCode === null) server.kill(); });

const request = (method, urlPath, { body, headers = {} } = {}) =>
  fetch(base + urlPath, { method, body, headers: { 'Content-Type': 'application/json', ...headers } });
const json = async (res) => res.json();

test('health check reports the unreachable database as 503, on /health and /api/health', async () => {
  for (const urlPath of ['/health', '/api/health']) {
    const res = await request('GET', urlPath);
    assert.strictEqual(res.status, 503, urlPath);
    assert.strictEqual(res.headers.get('cache-control'), 'no-store');
    const body = await json(res);
    assert.strictEqual(body.status, 'error');
    assert.strictEqual(body.database, 'down');
  }
});

test('unknown API routes get a JSON 404', async () => {
  const res = await request('GET', '/api/does-not-exist');
  assert.strictEqual(res.status, 404);
  assert.strictEqual((await json(res)).error, 'Endpoint not found');
});

// Customer auth lives only under /api/customer and the admin's customer
// management only under /api/customers; the old aliases (/api/customer-auth,
// the customer router under /api/customers) are gone, so nginx's rate limits
// only have one prefix to cover.
test('the old customer route prefixes are gone (404)', async () => {
  for (const [method, urlPath] of [
    ['POST', '/api/customer-auth/login'],
    ['POST', '/api/customer-auth/register'],
    ['POST', '/api/customers/login'],
    ['POST', '/api/customers/resend-otp'],
    ['GET', '/api/customer-auth/customers'],
    ['GET', '/api/customer/customers'],
    ['GET', '/api/customers/customers']
  ]) {
    const res = await request(method, urlPath, { body: method === 'GET' ? undefined : '{}' });
    assert.strictEqual(res.status, 404, `${method} ${urlPath}`);
  }
});

test('every response carries its own X-Request-Id', async () => {
  const ids = [];
  for (const urlPath of ['/api/does-not-exist', '/api/does-not-exist', '/uploads/none.png']) {
    const id = (await request('GET', urlPath)).headers.get('x-request-id');
    assert.match(id || '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    ids.push(id);
  }
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('malformed JSON is a 400, not a server error', async () => {
  const res = await request('POST', '/api/does-not-exist', { body: '{"broken": ' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await json(res)).error, 'Invalid request body');
});

test('bodies over 100kb are rejected with 413', async () => {
  const res = await request('POST', '/api/does-not-exist', { body: JSON.stringify({ pad: 'x'.repeat(150 * 1024) }) });
  assert.strictEqual(res.status, 413);
  assert.strictEqual((await json(res)).error, 'Request body too large');
});

test('admin endpoints require an admin login', async () => {
  const endpoints = [
    ['GET', '/api/orders'],
    ['GET', '/api/orders/summary'],
    ['GET', '/api/orders/some-id/history'],
    ['GET', '/api/audit-log'],
    ['GET', '/api/accounting/summary'],
    ['PUT', '/api/settings'],
    ['GET', '/api/settings/passcode-status'],
    ['PUT', '/api/settings/passcode'],
    ['GET', '/api/settings/drivers'],
    ['GET', '/api/settings/drivers/names'],
    ['GET', '/api/settings/driver-login-requests'],
    ['GET', '/api/settings/driver-sessions'],
    ['DELETE', '/api/settings/reviews/some-id'],
    ['POST', '/api/settings/sync-google-reviews'],
    ['GET', '/api/customers'],
    ['GET', '/api/customers/count'],
    ['DELETE', '/api/customers/some-id'],
    ['POST', '/api/categories'],
    ['POST', '/api/delivery-windows']
  ];
  for (const [method, urlPath] of endpoints) {
    const res = await request(method, urlPath, { body: method === 'GET' ? undefined : '{}' });
    assert.strictEqual(res.status, 401, `${method} ${urlPath}`);
  }
});

test('customer endpoints require a customer login', async () => {
  for (const [method, urlPath] of [['GET', '/api/customer/profile'], ['PUT', '/api/customer/profile'], ['GET', '/api/orders/my-orders']]) {
    const res = await request(method, urlPath, { body: method === 'GET' ? undefined : '{}' });
    assert.strictEqual(res.status, 401, `${method} ${urlPath}`);
  }
});

test('an admin JWT signed with the wrong secret is rejected', async () => {
  const jwt = require('jsonwebtoken');
  const forged = jwt.sign({ id: 'x', role: 'admin', tokenVersion: 0 }, 'not-the-server-secret-'.padEnd(48, 'z'));
  const res = await request('GET', '/api/orders', { headers: { Authorization: `Bearer ${forged}` } });
  assert.strictEqual(res.status, 401);
});

test('cookie-authenticated writes need a matching CSRF header', async () => {
  // rejected before the token is even checked
  let res = await request('PUT', '/api/settings', { body: '{}', headers: { Cookie: 'token=abc; csrf_token=t1' } });
  assert.strictEqual(res.status, 403);
  res = await request('PUT', '/api/settings', { body: '{}', headers: { Cookie: 'token=abc; csrf_token=t1', 'X-CSRF-Token': 'other' } });
  assert.strictEqual(res.status, 403);
  // matching header: gets past CSRF to the (invalid) token check
  res = await request('PUT', '/api/settings', { body: '{}', headers: { Cookie: 'token=abc; csrf_token=t1', 'X-CSRF-Token': 't1' } });
  assert.strictEqual(res.status, 401);
});

test('public endpoints validate input before touching the database', async () => {
  let res = await request('POST', '/api/customer/reset-password', { body: '{}' });
  assert.strictEqual(res.status, 400);
  res = await request('POST', '/api/settings/driver/login', { body: '{}' });
  assert.strictEqual(res.status, 400);
});

const clearedCookies = (res) => res.headers.getSetCookie()
  .filter((c) => /Expires=Thu, 01 Jan 1970/i.test(c))
  .map((c) => c.split('=')[0]);

test('logging out of one session keeps the shared CSRF cookie for the others', async () => {
  // admin logs out while the same browser is also logged into the shop
  let res = await request('POST', '/api/auth/logout', { headers: { Cookie: 'token=old; customer_token=shop; csrf_token=t1', 'X-CSRF-Token': 't1' } });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(clearedCookies(res), ['token']);

  // the only session: the CSRF cookie goes too
  res = await request('POST', '/api/auth/logout', { headers: { Cookie: 'token=old; csrf_token=t1', 'X-CSRF-Token': 't1' } });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(clearedCookies(res).sort(), ['csrf_token', 'token']);

  // shop logout while a driver session is active in the same browser
  res = await request('POST', '/api/customer/logout', { headers: { Cookie: 'customer_token=old; driver_token=d; csrf_token=t1', 'X-CSRF-Token': 't1' } });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(clearedCookies(res), ['customer_token']);
});

test('logout with a session cookie but no CSRF header is refused', async () => {
  const res = await request('POST', '/api/auth/logout', { headers: { Cookie: 'token=old; csrf_token=t1' } });
  assert.strictEqual(res.status, 403);
});

test('CORS allows the configured frontend and exposes X-Server-Time and X-Request-Id', async () => {
  let res = await request('GET', '/api/does-not-exist', { headers: { Origin: 'https://shop.example' } });
  assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://shop.example');
  assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  assert.match(res.headers.get('access-control-expose-headers') || '', /X-Server-Time/i);
  assert.match(res.headers.get('access-control-expose-headers') || '', /X-Request-Id/i);
  res = await request('GET', '/api/does-not-exist', { headers: { Origin: 'https://evil.example' } });
  assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
});

test('security headers are set', async () => {
  const res = await request('GET', '/api/does-not-exist');
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('x-frame-options'));
  assert.strictEqual(res.headers.get('x-powered-by'), null);
});

// Must stay the last test: it stops the shared server. Windows can't deliver
// SIGTERM to a child process (kill() there just terminates it), so it runs on
// Linux/macOS only (CI).
test('SIGTERM closes the server cleanly (exit code 0)', { skip: process.platform === 'win32' && 'no POSIX signals on Windows' }, async () => {
  const exited = new Promise((resolve) => server.once('exit', (code) => resolve(code)));
  server.kill('SIGTERM');
  const code = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000))]);
  assert.strictEqual(code, 0, serverLog);
  assert.match(serverLog, /HTTP server closed/);
});
