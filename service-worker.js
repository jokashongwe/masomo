// public/service-worker.js
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // Force the waiting service worker to become active.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  // Claim clients immediately to take control of existing pages.
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pour les requêtes API, on essaie uniquement le réseau.
  // Pas de mise en cache des réponses GET de l'API pour éviter les données obsolètes.
  // La logique de file d'attente gère déjà les mutations (POST, PUT, DELETE) hors ligne.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Pour les autres requêtes (pages, assets), on applique la stratégie "Network falling back to cache".
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});