const prisma = require('../lib/prisma');
const { getSettings, updateSettings } = require('../controllers/settingsController');

async function run() {
  let out;
  const res = {
    json: (d) => { out = d; },
    status: (s) => ({ json: (d) => { out = { status: s, ...d }; } })
  };

  await getSettings({}, res);
  console.log('GET settings result:', out);

  await updateSettings({
    body: {
      storeName: 'Hajar Supermarket',
      storeNameDe: 'Hajar Supermarkt',
      storeNameAr: 'سوبرماركت هاجر',
      phone: '+49 30 12345678',
      email: 'info@hajar-supermarket.de',
      address: 'Sonnenallee 100, 12045 Berlin',
      mapUrl: 'https://maps.google.com/?q=Berlin',
      googleReviewsUrl: 'https://g.page/r/example/review',
      googleRating: 4.9,
      googleReviewCount: 156
    }
  }, res);

  console.log('PUT settings result:', out.settings);
  await prisma.$disconnect();
}

run().catch(console.error);
