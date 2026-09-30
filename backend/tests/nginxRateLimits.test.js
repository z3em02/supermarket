// Every backend route that guards against password / code / PIN guessing
// must also be rate-limited by nginx (deployment/nginx.conf): nginx's
// limit_req is the per-IP limit in front of all PM2 workers (README 4.3);
// the backend's own limiter counts per worker unless Redis is set. The mounts
// are read from server.js and the routes from the real Express routers, so a
// new route or prefix without an nginx rule fails here.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// The route modules load lib/config (exits without secrets) and the rate
// limiter (would connect to Redis). Nothing here touches a database.
process.env.JWT_SECRET ||= 'test-jwt-secret-'.padEnd(48, 'x');
process.env.SECTION_UNLOCK_SECRET ||= 'test-unlock-secret-'.padEnd(48, 'y');
process.env.ENCRYPTION_KEY ||= 'a'.repeat(64);
process.env.REDIS_URL = '';

const BACKEND = path.join(__dirname, '..');

// Limiters that stop someone guessing a password, a one-time code or the
// admin 2FA code (prefixes from middleware/rateLimiter.js and the routes).
const GUESSING_LIMITERS = new Set(['rl:auth', 'rl:admin-2fa', 'rl:driver-login']);
// The section-PIN check shares its limiter (rl:pin-manage) with admin-only
// driver-PIN management, which isn't guessing, so it's listed by path.
const EXTRA_GUESSING_ROUTES = [['POST', '/api/settings/passcode/verify']];

const serverSource = fs.readFileSync(path.join(BACKEND, 'server.js'), 'utf8');
const routeFiles = Object.fromEntries(
  [...serverSource.matchAll(/const (\w+) = require\('\.\/routes\/(\w+)'\);/g)].map((m) => [m[1], m[2]])
);
const mounts = [...serverSource.matchAll(/app\.use\('(\/api\/[^']*)', (\w+)\);/g)]
  .filter((m) => routeFiles[m[2]])
  .map((m) => ({ prefix: m[1], file: routeFiles[m[2]] }));

// Every route as METHOD + a concrete path (":id" -> "x1"), with the rate
// limiters in its handler chain.
const routes = mounts.flatMap(({ prefix, file }) => {
  const router = require(path.join(BACKEND, 'routes', file));
  return router.stack.filter((layer) => layer.route).flatMap((layer) => {
    const fullPath = `${prefix}${layer.route.path === '/' ? '' : layer.route.path}`.replace(/:\w+/g, 'x1');
    const limiters = layer.route.stack.map((l) => l.handle.rateLimitPrefix).filter(Boolean);
    return Object.keys(layer.route.methods).map((method) => ({ method: method.toUpperCase(), path: fullPath, limiters }));
  });
});

const guessingRoutes = [
  ...routes.filter((r) => r.limiters.some((p) => GUESSING_LIMITERS.has(p))).map((r) => [r.method, r.path]),
  ...EXTRA_GUESSING_ROUTES
];

// `location ~* <regex> { ... limit_req ... }` blocks (case-insensitive, like Express).
const nginx = fs.readFileSync(path.join(BACKEND, '..', 'deployment', 'nginx.conf'), 'utf8');
const nginxLimited = [...nginx.matchAll(/location ~\* (\S+) \{([^}]*)\}/g)]
  .filter((m) => /\blimit_req\s/.test(m[2]))
  .map((m) => ({ source: m[1], regex: new RegExp(m[1], 'i') }));

test('the route list is read correctly (so the check below is not vacuous)', () => {
  assert.ok(mounts.length >= 10, `mounts found: ${mounts.length}`);
  assert.ok(nginxLimited.length >= 3, `nginx limit_req locations found: ${nginxLimited.length}`);
  const found = new Set(guessingRoutes.map(([m, p]) => `${m} ${p}`));
  for (const expected of [
    'POST /api/customer/login', 'POST /api/customer/register', 'POST /api/customer/resend-otp',
    'POST /api/customer/reset-password', 'POST /api/auth/login', 'POST /api/auth/verify-2fa',
    'POST /api/settings/driver/login'
  ]) {
    assert.ok(found.has(expected), `${expected} not detected as a guessing-protected route`);
  }
});

test('every guessing-protected route has an nginx limit_req rule', () => {
  const missing = guessingRoutes
    .filter(([, p]) => !nginxLimited.some(({ regex }) => regex.test(p)))
    .map(([m, p]) => `${m} ${p}`);
  assert.deepStrictEqual(missing, [], `add these to a limit_req location in deployment/nginx.conf:\n${missing.join('\n')}`);
});

test('every nginx limit_req rule matches a real route (no rules left for removed URLs)', () => {
  const dead = nginxLimited.filter(({ regex }) => !routes.some((r) => regex.test(r.path))).map((l) => l.source);
  assert.deepStrictEqual(dead, []);
});

test('a customer route is only reachable under /api/customer', () => {
  const customerRouterMounts = mounts.filter((m) => m.file === 'customerAuth').map((m) => m.prefix);
  assert.deepStrictEqual(customerRouterMounts, ['/api/customer']);
});
