importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js");

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
  const title = payload?.notification?.title || "Nouveau message";
  const body = payload?.notification?.body || "";
  const link = payload?.fcmOptions?.link || "https://blp-47.github.io/AFR/messagerie.html";

  self.registration.showNotification(title, {
    body,
    icon: "/AFR/icon-192.png",
    badge: "/AFR/badge-72.png",
    data: { link }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || "https://blp-47.github.io/AFR/messagerie.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/AFR/messagerie.html") && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});