/* Service Worker dédié — Alertes Élevage AFR
 * Sert UNIQUEMENT à la page /AFR/surveillance/ (scope isolé).
 * N'interfère pas avec /AFR/firebase-messaging-sw.js du portail.
 * Reçoit des messages DATA-ONLY et affiche la notif lui-même
 * (obligatoire pour que le push web s'affiche sur iOS).
 */
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyCSw10bFLStcem4A_CO4IXmKeQbLH9NXsM",
  authDomain: "afr-nt2.firebaseapp.com",
  databaseURL: "https://afr-nt2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "afr-nt2",
  storageBucket: "afr-nt2.firebasestorage.app",
  messagingSenderId: "169851474976",
  appId: "1:169851474976:web:be14c24366b0af024f9845"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const d = (payload && payload.data) || {};
  const title = d.title || 'Alerte Élevage AFR';
  const options = {
    body: d.body || '',
    tag: d.tag || ('afr_' + (d.kind || 'alerte')),
    renotify: true,
    requireInteraction: true,
    data: d,
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes('/AFR/surveillance/') && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('/AFR/surveillance/');
    })
  );
});
