const prisma = require('../lib/prisma');
const { isPushConfigured } = require('../utils/pushService');

const getVapidPublicKey = (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ error: 'Push notifications are not configured' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

const subscribe = async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { customerId, p256dh: keys.p256dh, auth: keys.auth },
      create: { customerId, endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });

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
