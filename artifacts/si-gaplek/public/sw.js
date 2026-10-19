// Service Worker for SIMONA PWA (Perumdam Tirta Ardhia Rinjani)
// - Offline Navigation Fallback Shell (/offline.html)
// - Static Assets Caching & Stale-While-Revalidate
// - Web Push Notifications for Stock & Shipment Alerts

const CACHE_NAME = "simona-pwa-v1";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/favicon.svg",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler with full offline navigation fallback & asset caching
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. Navigation requests (HTML pages): Network-first, fallback to cache, then /offline.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const matched = await cache.match(event.request);
          if (matched) return matched;

          const cachedOffline = await cache.match("/offline.html");
          if (cachedOffline) return cachedOffline;

          return new Response("Mode Offline Aplikasi Aksesoris - Koneksi terputus.", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
    return;
  }

  // 2. Vite Static Assets (/assets/*): Stale-While-Revalidate
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Static shell icon assets cache
  if (
    url.pathname === "/offline.html" ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/icon-192x192.png" ||
    url.pathname === "/icon-512x512.png" ||
    url.pathname === "/icon-maskable-512x512.png" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = {
    title: "Aplikasi Aksesoris",
    body: "Pemberitahuan operasional stok cabang",
    url: "/cabang/stok-material"
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/favicon.svg",
    vibrate: [100, 50, 100],
    data: { url: data.url }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/cabang/stok-material";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
