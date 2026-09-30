// Shared setup for the database tests in tests/integration/ (README
// "Database tests"). A .cjs file so the tests/**/*.js glob doesn't run it as
// a test itself.
//
// - TEST_DATABASE_URL (environment or backend/.env) names the test database.
//   Its name must end in _test and it must not be the DATABASE_URL /
//   DIRECT_URL database: every test empties every table. Unset -> the
//   database tests are skipped.
// - The schema is pushed with `prisma db push`, run from a temp folder on a
//   copy of schema.prisma so Prisma can't pick up backend/.env; it also
//   creates the database if it doesn't exist yet.
// - The real server.js runs as a child process on that database, from a temp
//   folder with every backend/.env variable blanked (no real SMTP, WhatsApp,
//   Redis or secrets) and offline.cjs preloaded (no outbound fetch).
// - This process has its own Prisma client on the same database to create
//   test data and check the results.
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const BACKEND = path.join(__dirname, '..', '..');
const envFile = path.join(BACKEND, '.env');
const dotenvValues = fs.existsSync(envFile) ? require('dotenv').parse(fs.readFileSync(envFile)) : {};
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || dotenvValues.TEST_DATABASE_URL || '';

const databaseName = (url) => {
  try { return decodeURIComponent(new URL(url).pathname.slice(1)); } catch { return ''; }
};
const hostPortDb = (url) => {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}/${decodeURIComponent(u.pathname.slice(1))}`;
  } catch { return ''; }
};

// null when the tests can run, else why they're skipped. A misconfigured
// URL throws instead: silently skipping could hide that it points somewhere real.
const skipReason = (() => {
  if (!TEST_DATABASE_URL) return 'TEST_DATABASE_URL is not set (README "Database tests")';
  if (!databaseName(TEST_DATABASE_URL).endsWith('_test')) {
    throw new Error(`TEST_DATABASE_URL must name a database ending in _test (got "${databaseName(TEST_DATABASE_URL)}"); the tests empty every table.`);
  }
  for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
    const real = process.env[name] || dotenvValues[name];
    if (real && hostPortDb(real) === hostPortDb(TEST_DATABASE_URL)) {
      throw new Error(`TEST_DATABASE_URL is the same database as ${name}. Use a separate *_test database.`);
    }
  }
  return null;
})();

// Used by the test server and by this process (same database, key, secret).
const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'db-test-jwt-secret-'.padEnd(48, 'x'),
  SECTION_UNLOCK_SECRET: 'db-test-unlock-secret-'.padEnd(48, 'y'),
  ENCRYPTION_KEY: 'b'.repeat(64),
  FRONTEND_URL: 'https://shop.example',
  REDIS_URL: ''
};

let prisma = null;
if (!skipReason) {
  // Before lib/prisma and piiCrypto read them (dotenv never overrides).
  Object.assign(process.env, TEST_ENV);
  prisma = require('../../lib/prisma');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pushSchema = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-test-schema-'));
  try {
    const schema = path.join(dir, 'schema.prisma');
    fs.copyFileSync(path.join(BACKEND, 'prisma', 'schema.prisma'), schema);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !(key in dotenvValues)));
    const result = spawnSync(
      process.execPath,
      [require.resolve('prisma/build/index.js', { paths: [BACKEND] }), 'db', 'push', '--skip-generate', '--accept-data-loss', '--schema', schema],
      { cwd: dir, env: { ...env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL }, encoding: 'utf8' }
    );
    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status !== 0) throw new Error(`prisma db push failed:\n${output}`);
    if (!output.includes(`database "${databaseName(TEST_DATABASE_URL)}"`)) {
      throw new Error(`prisma db push didn't report the test database:\n${output}`);
    }
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* Windows file lock; temp folder */ }
  }
};

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  srv.on('error', reject);
});

const startServer = async () => {
  const port = await freePort();
  const env = { ...process.env };
  for (const key of Object.keys(dotenvValues)) env[key] = '';
  Object.assign(env, TEST_ENV, { PORT: String(port), HOST: '127.0.0.1' });
  const child = spawn(
    process.execPath,
    ['--require', path.join(__dirname, 'offline.cjs'), path.join(BACKEND, 'server.js')],
    { cwd: os.tmpdir(), env, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(`${base}/api/does-not-exist`);
      return { base, log: () => log, stop: () => { if (child.exitCode === null) child.kill(); } };
    } catch { /* not listening yet */ }
    if (child.exitCode !== null) break;
    await sleep(100);
  }
  throw new Error(`test server did not start:\n${log}`);
};

// Empties every table. Checks the connected database once more first.
const resetDatabase = async () => {
  const [{ db }] = await prisma.$queryRaw`SELECT current_database() AS db`;
  if (!db.endsWith('_test')) throw new Error(`refusing to empty "${db}": not a *_test database`);
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }
};

// --- Test data ---------------------------------------------------------

let seq = 0;

const seedStore = (overrides = {}) => {
  const { DEFAULT_SETTINGS } = require('../../controllers/settingsShared');
  return prisma.storeSettings.create({ data: { ...DEFAULT_SETTINGS, ...overrides, id: 'default' } });
};

const createProduct = ({ name, price, stock }) =>
  prisma.product.create({ data: { name, b2bPrice: price, stock, sku: `TEST-${++seq}` } });

const createCustomer = ({ verified = true, phoneVerified = verified, preferredLanguage = 'de' } = {}) => {
  const { encrypt, hashLookup } = require('../../utils/piiCrypto');
  const n = ++seq;
  const email = `kunde${n}@example.test`;
  const phone = `+43660${1000000 + n}`;
  return prisma.customer.create({
    data: {
      name: `Test Kunde ${n}`,
      email: encrypt(email),
      emailHash: hashLookup(email),
      phone: encrypt(phone),
      phoneHash: hashLookup(phone),
      password: 'not-used-by-these-tests',
      emailVerified: verified,
      phoneVerified,
      preferredLanguage,
      street: encrypt('Favoritenstraße'),
      houseNumber: encrypt('12'),
      postalCode: encrypt('1100'),
      city: encrypt('Wien')
    }
  });
};

const createAdmin = () =>
  prisma.admin.create({ data: { email: `admin${++seq}@example.test`, password: 'not-used-by-these-tests', name: 'Test Admin' } });

const createCoupon = (overrides = {}) =>
  prisma.coupon.create({ data: { code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10, ...overrides } });

// A driver account plus an approved session, as after an admin approval.
const createDriver = async (name) => {
  await prisma.driver.create({ data: { name, nameLower: name.toLowerCase(), pinHash: 'not-used-by-these-tests' } });
  const jti = crypto.randomBytes(16).toString('hex');
  await prisma.driverSession.create({ data: { driverName: name, jti, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return sign({ role: 'driver', name, id: 'driver-session', jti });
};

// --- Logins (the same JWTs the real login routes issue) ------------------

const sign = (payload) => require('jsonwebtoken').sign(payload, TEST_ENV.JWT_SECRET, { expiresIn: '1h' });
const customerToken = (customer) => sign({ customerId: customer.id, role: 'customer', tokenVersion: customer.tokenVersion });
const adminToken = (admin) => sign({ id: admin.id, email: admin.email, role: 'admin', tokenVersion: admin.tokenVersion });

// JSON request with a Bearer login (header auth needs no CSRF token).
const client = (base) => async (method, urlPath, { token, body } = {}) => {
  const res = await fetch(base + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body: data };
};

module.exports = {
  skipReason,
  prisma,
  pushSchema,
  startServer,
  resetDatabase,
  seedStore,
  createProduct,
  createCustomer,
  createAdmin,
  createCoupon,
  createDriver,
  customerToken,
  adminToken,
  client
};
