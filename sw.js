const CACHE_NAME = 'chainline-pos-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/pos-styles.css',
  '/pos-styles-v2.css',
  '/pos-design.js',
  '/pos-auth.js',
  '/pos-print.js',
  '/pos-offline.js',
  '/pos-performance.js',
  '/pos-payments.js',
  '/pos-inventory-advanced.js',
  '/pos-inventory.js',
  '/pos-customers.js',
  '/pos-reports-v2.js',
  '/pos-eod.js',
  '/pos-purchase-orders-v2.js',
  '/pos-app.js',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for API calls and CDN scripts (React, fonts)
  if (
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
