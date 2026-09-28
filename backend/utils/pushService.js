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

// web-push POSTs to whatever endpoint a subscription holds, from this server.
// Real subscriptions only ever point at the browsers' push services, so
// anything else (an internal address, a victim URL, ...) is refused — an
// allow-list, because a hostname block-list can be dodged with DNS tricks.
const PUSH_SERVICE_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'updates.push.services.mozilla.com'];
const PUSH_SERVICE_HOST_SUFFIXES = ['.notify.windows.com', '.push.apple.com'];

const isPushServiceEndpoint = (endpoint) => {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.includes(host) || PUSH_SERVICE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
};

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
      // Rows saved before endpoints were validated at subscribe time
      if (!isPushServiceEndpoint(sub.endpoint)) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        return;
      }
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

module.exports = { sendPushToCustomer, isPushConfigured, isPushServiceEndpoint };
