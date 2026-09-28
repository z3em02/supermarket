const prisma = require('../lib/prisma');
const { isPushConfigured, isPushServiceEndpoint } = require('../utils/pushService');

const getVapidPublicKey = (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ error: 'Push notifications are not configured' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// A customer's newest subscriptions (phone, laptop, ...) are kept, older
// ones dropped — bounds how many requests one status change fans out to.
const MAX_SUBSCRIPTIONS_PER_CUSTOMER = 10;
const isPushKey = (value) => typeof value === 'string' && value.length <= 256 && /^[A-Za-z0-9_-]+=*$/.test(value);

const subscribe = async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const { endpoint, keys } = req.body;

    if (!isPushServiceEndpoint(endpoint) || !isPushKey(keys?.p256dh) || !isPushKey(keys?.auth)) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      // createdAt doubles as "last subscribed", so a re-subscribed device
      // counts as new when trimming below.
      update: { customerId, p256dh: keys.p256dh, auth: keys.auth, createdAt: new Date() },
      create: { customerId, endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });

    const surplus = await prisma.pushSubscription.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_SUBSCRIPTIONS_PER_CUSTOMER,
      select: { id: true }
    });
    if (surplus.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: surplus.map((s) => s.id) } } });
    }

    res.status(201).json({ message: 'Subscribed' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, customerId: req.customer.customerId }
    });
    res.json({ message: 'Unsubscribed' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
};

module.exports = { getVapidPublicKey, subscribe, unsubscribe };
