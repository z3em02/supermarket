// Shared configuration for the end-to-end smoke test: the same secrets and
// database URL are used both to seed the database (global-setup) and to run
// the backend under test (playwright.config webServer), so PII encryption and
// JWT signing line up. These are throwaway test values, never production.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:root@localhost:5432/supermarket_test';

// Backend environment for the server under test. NODE_ENV=development so the
// CORS allow-list accepts localhost and OTP codes are generated (and logged)
// instead of requiring real SMTP/WhatsApp credentials.
const BACKEND_ENV = {
  NODE_ENV: 'development',
  DATABASE_URL,
  DIRECT_URL: DATABASE_URL,
  JWT_SECRET: 'e2e-jwt-secret-value-at-least-32-chars-long-000',
  SECTION_UNLOCK_SECRET: 'e2e-section-unlock-secret-at-least-32-chars-1',
  // 64 hex chars (32 bytes) — required format for AES-256 PII encryption.
  ENCRYPTION_KEY: 'e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0',
  FRONTEND_URL: 'http://localhost:5173',
  PORT: '5000',
  HOST: '127.0.0.1'
};

// Fixtures the seed creates and the spec drives. A unique suffix per run
// keeps the registered customer's email/phone from colliding across reruns
// against a database that isn't wiped (the seed truncates, but be safe).
const RUN = Date.now().toString().slice(-7);
const FIXTURES = {
  admin: { email: 'e2e-admin@hajar.local', password: 'E2eAdmin!2026', name: 'E2E Admin' },
  product: { sku: 'E2E-MILK-1L', name: 'E2E Milch 1L', b2bPrice: 2.5, stock: 50 },
  customer: {
    name: 'E2E Kunde',
    email: `e2e-customer-${RUN}@hajar.local`,
    phone: `+4366012${RUN}`,
    password: 'E2eKunde!2026',
    street: 'Stephansplatz',
    houseNumber: '1',
    postalCode: '1010',
    city: 'Wien'
  },
  driverName: 'E2E Fahrer'
};

module.exports = { DATABASE_URL, BACKEND_ENV, FIXTURES };

