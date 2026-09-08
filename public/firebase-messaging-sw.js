// Penerima notifikasi push FinoCatat. WAJIB berada di akar situs supaya
// Firebase Messaging bisa menemukannya (/firebase-messaging-sw.js).
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDRFdFw1LTjydGLG8cN7PGaLJoIs-i9o0I",
  authDomain: "catat-keuangan-web.firebaseapp.com",
  projectId: "catat-keuangan-web",
  storageBucket: "catat-keuangan-web.firebasestorage.app",
  messagingSenderId: "697960795997",
  appId: "1:697960795997:web:ac6918a4d118a2c12022b4",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.notification || {};
  self.registration.showNotification(data.title || "FinoCatat", {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "finocatat-notif",
    data: { url: "/dashboard/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/dashboard") && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
