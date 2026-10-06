// Reads OTP codes straight from the database. The app stores emailOtp,
// phoneOtp and the admin twoFactorOtp in plaintext on the row, so the test
// can read them instead of intercepting email/WhatsApp — no app test-seam
// needed. Uses the backend's own Prisma client (env already points it at the
// e2e database via global-setup / the webServer).
const path = require('node:path');
const { BACKEND_ENV } = require('../env.cjs');

Object.assign(process.env, BACKEND_ENV);
const prisma = require(path.join(__dirname, '..', '..', 'backend', 'lib', 'prisma'));
const { hashLookup } = require(path.join(__dirname, '..', '..', 'backend', 'utils', 'piiCrypto'));

// The row is looked up by the lookup-hash of the email/phone (emailHash /
// phoneHash), since the plaintext columns are encrypted.
const customerByEmail = (email) =>
  prisma.customer.findFirst({ where: { emailHash: hashLookup(email.trim().toLowerCase()) } });

async function emailOtp(email) {
  const c = await customerByEmail(email);
  return c?.emailOtp || null;
}

async function phoneOtp(email) {
  const c = await customerByEmail(email);
  return c?.phoneOtp || null;
}

async function adminTwoFactorOtp(adminEmail) {
  const a = await prisma.admin.findUnique({ where: { email: adminEmail } });
  return a?.twoFactorOtp || null;
}

module.exports = { emailOtp, phoneOtp, adminTwoFactorOtp, prisma };
