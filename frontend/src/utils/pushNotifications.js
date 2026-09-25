import axios from 'axios';
import customerAxios from './customerAxios';
import { getApiUrl } from './api';

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

// VAPID public key (base64url) -> Uint8Array, the format PushManager.subscribe expects.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

// Registers the service worker (idempotent), asks for notification
// permission, subscribes with the backend's VAPID public key, and saves the
// subscription. Returns 'granted' | 'denied' | 'unsupported' | 'error'.
// Relies on the customer's session cookie (via customerAxios) — no token
// needed as a parameter.
export const enablePushNotifications = async () => {
  if (!isPushSupported()) return 'unsupported';

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const apiUrl = getApiUrl();
    const { data } = await axios.get(`${apiUrl}/api/push/vapid-public-key`);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    });

    const json = subscription.toJSON();
    await customerAxios.post(`${apiUrl}/api/push/subscribe`, { endpoint: json.endpoint, keys: json.keys });

    return 'granted';
  } catch (err) {
    console.error('Failed to enable push notifications:', err);
    return 'error';
  }
};

export const getPushSubscriptionStatus = async () => {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return 'not-subscribed';
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'subscribed' : 'not-subscribed';
};
