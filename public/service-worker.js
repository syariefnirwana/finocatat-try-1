const CACHE_NAME = "finocatat-v3";

// List semua file vital lu di sini biar di-download di awal
const URLS_TO_CACHE = [
  "/dashboard.html",
  "/dashboard/manifest.json",
  "/dashboard/css/fino.css",
  "/dashboard/js/firebase-config.js",
  "/dashboard/js/state.js",
  "/dashboard/js/ui.js",
  "/dashboard/js/auth.js",
  "/dashboard/js/transaksi.js",
  "/dashboard/js/admin.js",
  "/dashboard/js/pdf-generator.js",
  "/dashboard/js/pwa-setup.js"
];
// 1. Hapus self.skipWaiting() biar update-nya kaga maksa jalan di background
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Nyedot file ke cache lokal...');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// 2. Tambahin otak baru buat dengerin aba-aba tombol "Update" dari UI User
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Bersihin cache versi lama biar kaga menuhin memori HP
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener("fetch", (e) => {
  // Strategi: Stale-While-Revalidate
  // Kasih data dari cache lokal dulu biar cepet (bisa offline), 
  // sambil diam-diam nembak ke server buat update cache di background kalo dapet sinyal
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(() => {
         // Kalo beneran offline dan ga bisa fetch, biarin aja errornya, 
         // toh cachedResponse udah dibalikin ke user.
      });
      
      return cachedResponse || fetchPromise;
    })
  );
});