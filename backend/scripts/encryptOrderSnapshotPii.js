// One-off migration: encrypts the plaintext customerName/customerPhone/
// customerEmail snapshot columns on existing Order rows. Safe to re-run —
// encrypt() is skipped for values already in enc:v1: format.
require('dotenv').config();
const prisma = require('../lib/prisma');
const { encrypt } = require('../utils/piiCrypto');

const isEncrypted = (value) => typeof value === 'string' && value.startsWith('enc:v1:');

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, customerName: true, customerPhone: true, customerEmail: true }
  });
  console.log(`Found ${orders.length} order row(s).`);

  let updated = 0;
  for (const order of orders) {
    const data = {};
    if (order.customerName && !isEncrypted(order.customerName)) data.customerName = encrypt(order.customerName);
    if (order.customerPhone && !isEncrypted(order.customerPhone)) data.customerPhone = encrypt(order.customerPhone);
    if (order.customerEmail && !isEncrypted(order.customerEmail)) data.customerEmail = encrypt(order.customerEmail);

    if (Object.keys(data).length > 0) {
      await prisma.order.update({ where: { id: order.id }, data });
      updated += 1;
      console.log(`  encrypted order ${order.id}`);
    }
  }

  console.log(`Done. Updated ${updated}/${orders.length} row(s).`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
