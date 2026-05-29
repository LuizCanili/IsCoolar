// Service Worker básico para PWA do IsCoolar
const CACHE_NAME = 'iscoolar-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css', // Substitua pelos seus arquivos reais
  '/script.js',  // Substitua pelos seus arquivos reais
  '/icon-master.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});