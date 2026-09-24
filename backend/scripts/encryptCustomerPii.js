// One-off migration: encrypts existing Customer PII (email, phone, address
// fields) at rest and backfills emailHash/phoneHash for lookups. Safe to
// re-run — encrypt()/hashLookup() are idempotent no-ops on already-encrypted
// values (piiCrypto.decrypt recognizes the enc:v1: prefix).
require('dotenv').config();
const prisma = require('../lib/prisma');
const { encrypt, decrypt, hashLookup, CUSTOMER_PII_FIELDS } = require('../utils/piiCrypto');

const isEncrypted = (value) => typeof value === 'string' && value.startsWith('enc:v1:');

async function main() {
  const customers = await prisma.customer.findMany();
  console.log(`Found ${customers.length} customer row(s).`);

  let updated = 0;
  for (const customer of customers) {
    const data = {};

    for (const field of CUSTOMER_PII_FIELDS) {
      const value = customer[field];
      if (value && !isEncrypted(value)) {
        data[field] = encrypt(value);
      }
    }

    if (!customer.emailHash) {
      data.emailHash = hashLookup(decrypt(customer.email));
    }
    if (!customer.phoneHash) {
      data.phoneHash = hashLookup(decrypt(customer.phone));
    }

    if (Object.keys(data).length > 0) {
      await prisma.customer.update({ where: { id: customer.id }, data });
      updated += 1;
      console.log(`  encrypted customer ${customer.id}`);
    }
  }

  console.log(`Done. Updated ${updated}/${customers.length} row(s).`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
