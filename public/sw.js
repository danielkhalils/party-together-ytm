const CACHE_NAME = 'party-together-shell-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/favicon.svg',
  '/icons/app-icon-192.png',
  '/icons/app-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith('/api/')) return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
        return response;
      } catch {
        return (await caches.match(request)) || (request.mode === 'navigate' ? await caches.match('/index.html') : Response.error());
      }
    })()
  );
});
