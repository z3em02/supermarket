// One-off helper: creates demo orders so the admin Orders, Dashboard and
// Accounting pages have something to show while developing or demoing.
//
// Usage (from backend/, after `npm run prisma:seed` so products exist):
//   node scripts/createFakeOrders.js          # 30 orders
//   node scripts/createFakeOrders.js 80       # 80 orders
//   node scripts/createFakeOrders.js --delete # remove every demo order again
//
// Every demo order carries DEMO_MARKER in its internal admin note, which is
// how --delete finds them; real orders are never touched. The orders are
// guest orders (not linked to a customer account) with Vienna names and
// addresses, encrypted like real ones, spread over the last 14 days and
// every status. Stock is not changed. Refuses to run with NODE_ENV=production
// unless --allow-production is passed.
require('dotenv').config();
const prisma = require('../lib/prisma');
const { encrypt } = require('../utils/piiCrypto');
const { roundMoney } = require('../utils/money');

const DEMO_MARKER = '[Demo-Bestellung]';

const FIRST = ['Ahmed', 'Maria', 'Leila', 'Josef', 'Samira', 'Franz', 'Omar', 'Anna', 'Karim', 'Elif', 'Lukas', 'Fatima', 'Stefan', 'Nour', 'Julia'];
const LAST = ['Yilmaz', 'Huber', 'Haddad', 'Gruber', 'Nasser', 'Wagner', 'Khalil', 'Bauer', 'Saleh', 'Demir', 'Pichler', 'Mansour', 'Steiner', 'Aziz', 'Moser'];
const STREETS = [
  ['Favoritenstraße', '1100'], ['Mariahilfer Straße', '1060'], ['Thaliastraße', '1160'],
  ['Ottakringer Straße', '1160'], ['Landstraßer Hauptstraße', '1030'], ['Simmeringer Hauptstraße', '1110'],
  ['Brünner Straße', '1210'], ['Wiedner Hauptstraße', '1040'], ['Quellenstraße', '1100'], ['Reumannplatz', '1100']
];
// Weighted so the list looks like a real day: mostly open and delivered.
const STATUSES = [
  'pending', 'pending', 'pending', 'accepted', 'accepted', 'preparing', 'preparing',
  'shipped', 'delivered', 'delivered', 'delivered', 'delivered', 'declined', 'pending_customer_approval'
];
const NOTES = [null, null, null, 'Bitte 2x klingeln', 'Bitte vorher anrufen', 'Hintereingang benutzen', 'Nicht vor 17 Uhr'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const isoDate = (d) => d.toISOString().slice(0, 10);

async function deleteDemoOrders() {
  // OrderItem and Accounting rows cascade with the order.
  const { count } = await prisma.order.deleteMany({ where: { adminNotes: { contains: DEMO_MARKER } } });
  console.log(`Deleted ${count} demo order(s).`);
}

async function createDemoOrders(count) {
  const products = await prisma.product.findMany({ select: { id: true, name: true, b2bPrice: true } });
  if (products.length === 0) {
    console.error('No products found. Run `npm run prisma:seed` first.');
    process.exit(1);
  }
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  const baseFee = Number(settings?.deliveryFee ?? 2);
  const freeFrom = Number(settings?.freeDeliveryThreshold || 0);
  const drivers = (await prisma.driver.findMany({ where: { active: true }, select: { name: true } })).map((d) => d.name);
  const windows = await prisma.deliveryWindow.findMany({ where: { isActive: true }, select: { startHour: true, endHour: true } });
  const slotWindows = windows.length ? windows : [{ startHour: 10, endHour: 12 }, { startHour: 16, endHour: 18 }];

  for (let i = 0; i < count; i++) {
    const status = pick(STATUSES);
    const createdAt = new Date(Date.now() - between(0, 14 * 24) * 60 * 60 * 1000 - between(0, 59) * 60 * 1000);
    const slotDate = new Date(createdAt.getTime() + between(0, 2) * 24 * 60 * 60 * 1000);
    const win = pick(slotWindows);

    const lines = [];
    const used = new Set();
    for (let n = between(1, 5); n > 0; n--) {
      const p = pick(products);
      if (used.has(p.id)) continue;
      used.add(p.id);
      const quantity = between(1, 4);
      const price = Number(p.b2bPrice);
      lines.push({ productId: p.id, quantity, price, subtotal: roundMoney(price * quantity) });
    }
    const itemsSubtotal = roundMoney(lines.reduce((s, l) => s + l.subtotal, 0));
    const free = freeFrom > 0 && itemsSubtotal >= freeFrom;
    const deliveryFee = free ? 0 : roundMoney(baseFee + between(0, 30) / 10);
    const [street, postal] = pick(STREETS);
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const note = pick(NOTES);
    const hasDriver = ['accepted', 'preparing', 'shipped', 'delivered'].includes(status) && drivers.length > 0;

    await prisma.order.create({
      data: {
        customerName: encrypt(name),
        customerPhone: encrypt(`+43 6${between(50, 99)} ${between(100, 999)} ${between(1000, 9999)}`),
        deliveryAddress: encrypt(`${street} ${between(1, 180)}/${between(1, 30)}, ${postal} Wien`),
        deliveryNotes: note ? encrypt(note) : null,
        deliverySlot: `${isoDate(slotDate)}_${win.startHour}_${win.endHour}`,
        status,
        itemsSubtotal,
        isFreeShipping: free,
        deliveryFee,
        totalAmount: roundMoney(itemsSubtotal + deliveryFee),
        assignedDriverName: hasDriver ? pick(drivers) : null,
        modificationReason: status === 'pending_customer_approval' ? 'Ein Artikel war leider ausverkauft.' : null,
        adminNotes: DEMO_MARKER,
        createdAt,
        orderItems: { create: lines }
      }
    });
  }
  console.log(`Created ${count} demo order(s). Remove them with: node scripts/createFakeOrders.js --delete`);
}

async function main() {
  const args = process.argv.slice(2);
  if (process.env.NODE_ENV === 'production' && !args.includes('--allow-production')) {
    console.error('Refusing to touch a production database (NODE_ENV=production). Pass --allow-production if you really mean it.');
    process.exit(1);
  }
  if (args.includes('--delete')) {
    await deleteDemoOrders();
    return;
  }
  const count = Math.min(500, Math.max(1, parseInt(args.find((a) => /^\d+$/.test(a)), 10) || 30));
  await createDemoOrders(count);
}

main()
  .catch((err) => {
    console.error('Failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
