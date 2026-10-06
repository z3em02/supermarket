// Runs once before the smoke test: brings the e2e database up to the current
// schema (migrate deploy — idempotent, non-destructive), empties it, and
// seeds exactly what the test needs (admin, one product, store settings that
// allow a Vienna delivery). The backend under test (playwright webServer)
// uses the same DATABASE_URL and ENCRYPTION_KEY, so seeded PII decrypts.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const { BACKEND_ENV, FIXTURES } = require('./env.cjs');

const BACKEND = path.join(__dirname, '..', 'backend');

module.exports = async () => {
  // Set the env before requiring backend/lib/prisma: dotenv.config() there
  // never overrides already-set vars, so this points it at the e2e database.
  Object.assign(process.env, BACKEND_ENV);

  // Rebuild the e2e database from migrations: drop everything, reapply every
  // migration, leave empty tables (then seed below). `migrate reset` handles
  // any prior state of the (shared) test database. Prisma 6.19+ refuses this
  // under an AI coding agent unless PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION
  // is set — not an issue in CI, and set locally when running through an agent.
  const reset = spawnSync(
    process.execPath,
    [require.resolve('prisma/build/index.js', { paths: [BACKEND] }), 'migrate', 'reset',
     '--force', '--skip-generate', '--skip-seed',
     '--schema', path.join(BACKEND, 'prisma', 'schema.prisma')],
    { env: { ...process.env, DATABASE_URL: BACKEND_ENV.DATABASE_URL, DIRECT_URL: BACKEND_ENV.DATABASE_URL }, encoding: 'utf8' }
  );
  if (reset.status !== 0) throw new Error(`prisma migrate reset failed:\n${reset.stdout}\n${reset.stderr}`);

  const prisma = require(path.join(BACKEND, 'lib', 'prisma'));

  await prisma.admin.create({
    data: {
      email: FIXTURES.admin.email,
      password: await bcrypt.hash(FIXTURES.admin.password, 10),
      name: FIXTURES.admin.name
    }
  });

  const category = await prisma.category.create({ data: { nameDe: 'E2E', nameAr: 'E2E' } });
  await prisma.product.create({
    data: {
      name: FIXTURES.product.name,
      nameDe: FIXTURES.product.name,
      sku: FIXTURES.product.sku,
      b2bPrice: FIXTURES.product.b2bPrice,
      stock: FIXTURES.product.stock,
      categoryId: category.id
    }
  });

  // A driver account so the admin can assign one when accepting the order
  // (the accept modal requires picking a known driver).
  await prisma.driver.create({
    data: {
      name: FIXTURES.driverName,
      nameLower: FIXTURES.driverName.toLowerCase(),
      pinHash: await bcrypt.hash('123456', 10),
      active: true
    }
  });

  // Store settings that let a Vienna (1010) order through: within the service
  // area and distance, no minimum. Default store coordinates are in Vienna.
  await prisma.storeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      allowedPostalCodes: '1010',
      minOrderValue: 0,
      deliveryFee: 2.0,
      freeDeliveryThreshold: 0,
      maxDeliveryDistanceKm: 100,
      maintenanceMode: false
    }
  });

  await prisma.$disconnect();
};
