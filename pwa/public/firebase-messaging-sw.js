/* FamilyBubble FCM service worker — system tray push when the app is backgrounded or closed. */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDOQK3z7XNdJ2P2JW10hbSBv0GLiO2oJkE',
  authDomain: 'familybubble-ecfa6.firebaseapp.com',
  projectId: 'familybubble-ecfa6',
  storageBucket: 'familybubble-ecfa6.appspot.com',
  messagingSenderId: '804761460768',
  appId: '1:804761460768:web:1010dccfd9d48b1e695c45',
});

const messaging = firebase.messaging();

const notificationOptionsFromData = (data = {}) => ({
  body: data.body || '',
  icon: '/logo192.png',
  badge: '/logo192.png',
  tag: data.tag || 'familybubble',
  data,
  requireInteraction: data.type === 'sos',
  vibrate: data.type === 'sos' ? [400, 150, 400, 150, 400] : [200, 100, 200],
  silent: false,
});

messaging.onBackgroundMessage((payload) => {
  const data = (payload && payload.data) || {};
  const title = data.title || (payload.notification && payload.notification.title) || 'FamilyBubble';
  const body = data.body || (payload.notification && payload.notification.body) || '';
  return self.registration.showNotification(title, notificationOptionsFromData({ ...data, body }));
});

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url
    || (data.sosId && data.bubbleId
      ? `/?sos=${encodeURIComponent(data.sosId)}&bubble=${encodeURIComponent(data.bubbleId)}`
      : '/');

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      await client.focus();
      client.postMessage({ type: 'NOTIFICATION_CLICK', url, data });
      return;
    }
    if (clients.openWindow) {
      await clients.openWindow(url);
    }
  })());
});
