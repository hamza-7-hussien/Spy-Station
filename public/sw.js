// Spy Station Progressive Web App Service Worker (PWA Offline Standalone)
const CACHE_NAME = 'spy-station-pwa-v2.6.0';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon.svg',
  './apple-touch-icon.png',
  './pwa-96x96.png',
  './pwa-144x144.png',
  './pwa-192x192.png',
  './pwa-384x384.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './screenshot-desktop.png',
  './screenshot-mobile.png',
  './screenshot-home.png',
  './screenshot-gameplay.png',
  './screenshot-voting.png',
  './screenshot-ejection.png'
];

// Install: precache critical assets & skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: offline-first navigation fallback to index.html (NO generic browser error or foreign site text)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore Firebase realtime websockets/polling, chrome extensions
  if (
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit')
  ) {
    return;
  }

  // 1. Navigation requests (HTML SPA pages):
  // When opened offline, always serve the cached index.html so the real app opens directly
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((networkResp) => {
              if (networkResp && networkResp.status === 200) {
                const clone = networkResp.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
              return networkResp;
            })
            .catch(async () => {
              // Network failed (offline): serve cached index.html so the full installed app UI launches seamlessly!
              const cachedApp =
                (await caches.match('./index.html')) ||
                (await caches.match('/index.html')) ||
                (await caches.match('./')) ||
                (await caches.match('/'));
              if (cachedApp) return cachedApp;
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Spy Station</title></head><body style="background:#030712;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;"><div style="text-align:center;"><p style="font-size:1.2rem;font-weight:bold;">🚀 Spy Station</p></div></body></html>',
                { status: 200, headers: { 'Content-Type': 'text/html' } }
              );
            });
        })
    );
    return;
  }

  // 2. Static Assets (Cache-First / Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, already handled by cachedResponse if available
        });
      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
