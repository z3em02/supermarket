// One-off helper: creates (or updates) a single customer account with both
// email and phone already marked verified, for local testing of the
// verified-customer flows without going through OTP delivery.
//
// No credentials are hardcoded — set these in your .env (or environment)
// before running, otherwise a random password is generated and printed
// once (not stored anywhere, so save it):
//   TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PHONE, TEST_CUSTOMER_PASSWORD, TEST_CUSTOMER_NAME
//
// Usage (from backend/):
//   node scripts/createTestCustomer.js
//
// Refuses to run with NODE_ENV=production unless --allow-production is passed.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { encrypt, hashLookup } = require('../utils/piiCrypto');
const { isStrongPassword, STRONG_PASSWORD_HINT } = require('../utils/validation');

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
    console.error('Refusing to touch a production database (NODE_ENV=production). Pass --allow-production if you really mean it.');
    process.exit(1);
  }
  const email = process.env.TEST_CUSTOMER_EMAIL || 'testcustomer@hajar.local';
  const phone = process.env.TEST_CUSTOMER_PHONE || '+436601234567';
  const name = process.env.TEST_CUSTOMER_NAME || 'Test Customer';

  let plainPassword = process.env.TEST_CUSTOMER_PASSWORD;
  let generated = false;
  if (plainPassword) {
    if (!isStrongPassword(plainPassword)) {
      console.error(`FATAL: TEST_CUSTOMER_PASSWORD does not meet the password policy. ${STRONG_PASSWORD_HINT}`);
      process.exit(1);
    }
  } else {
    plainPassword = `Aa1!${crypto.randomBytes(9).toString('base64url')}`;
    generated = true;
  }

  const emailHash = hashLookup(email);
  const phoneHash = hashLookup(phone);
  const password = await bcrypt.hash(plainPassword, 10);

  const data = {
    name,
    email: encrypt(email),
    emailHash,
    emailVerified: true,
    emailOtp: null,
    emailOtpExpiry: null,
    phone: encrypt(phone),
    phoneHash,
    phoneVerified: true,
    phoneOtp: null,
    phoneOtpExpiry: null,
    password
  };

  const existing = await prisma.customer.findUnique({ where: { emailHash } });
  const customer = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data })
    : await prisma.customer.create({ data });

  console.log(`✓ Verified test customer ${existing ? 'updated' : 'created'} (id: ${customer.id})`);
  console.log(`  Email: ${email}`);
  console.log(`  Phone: ${phone}`);
  if (generated) {
    console.log(`  Generated password (shown once, not stored — save it): ${plainPassword}`);
  }
}

main()
  .catch((error) => {
    console.error('Failed to create test customer:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });