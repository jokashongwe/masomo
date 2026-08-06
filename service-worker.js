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
  // This is a very basic fetch handler. For a full PWA, you'd implement caching strategies here.
  event.respondWith(fetch(event.request));
});