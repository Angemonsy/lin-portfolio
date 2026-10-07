const CACHE_NAME = 'alpha-cloud-v20-9-image-speed';
const APP_ASSETS = ['./manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('alpha-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Local heartbeat must reach the network, never an opaque cached response or HTML fallback.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const networkFirst = request.mode === 'navigate' || ['document', 'script', 'style'].includes(request.destination) || /\.(?:js|css)$/.test(url.pathname);
  if (networkFirst) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html', {ignoreSearch:true})))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then((response) => {
      if (!response.ok) return response;
          const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      return response;
    }))
  );
});
