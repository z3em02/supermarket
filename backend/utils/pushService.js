const webpush = require('web-push');
const prisma = require('../lib/prisma');

const isPushConfigured = () =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

if (isPushConfigured()) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Sends a push notification to every browser subscription a customer has
// granted (they can have more than one — phone + laptop, etc). Silently
// drops subscriptions the push service reports as gone (410/404) so the
// table doesn't accumulate dead endpoints forever.
const sendPushToCustomer = async (customerId, payload) => {
  if (!isPushConfigured() || !customerId) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { customerId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Push notification failed:', err.message || err);
        }
      }
    })
  );
};

module.exports = { sendPushToCustomer, isPushConfigured };
