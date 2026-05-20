const CACHE_NAME = 'chainline-pos-v3';

// Only cache local app files — NOT versioned URLs (browser HTTP cache handles those)
const APP_SHELL = [
  '/',
  '/index.html',
  '/pos-styles.css',
  '/pos-styles-v2.css',
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

  // Skip SW for: CDN scripts, fonts, external services — let browser handle directly
  // (SW fetch() is blocked by CSP connect-src for these origins)
  if (
    url.hostname !== self.location.hostname ||
    url.pathname.startsWith('/api/')
  ) {
    return; // no respondWith — browser handles natively
  }

  // Cache-first for local app shell files (CSS, HTML, manifest)
  // JS files use versioned URLs (?v=N) — browser HTTP cache handles them (immutable 1yr)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache unversioned local files
        if (response.ok && !url.search && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
