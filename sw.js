// AI YT Bot — Service Worker v2
// Caches app shell for offline use. API calls always go to network.

const CACHE_NAME = 'yt-bot-v2';
const SHELL = ['./index.html', './manifest.json'];
const API_ORIGINS = [
  'api.anthropic.com',
  'api.elevenlabs.io',
  'api.pexels.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── Install: cache app shell ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ──────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first for APIs, cache-first for shell ─
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch from network for API calls and external resources
  const isApi = API_ORIGINS.some(o => url.hostname.includes(o));
  if (isApi || e.request.method !== 'GET') {
    e.respondWith(fetch(e.request).catch(() =>
      new Response('Network error', { status: 503 })
    ));
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful shell responses
        if (response.ok && SHELL.some(s => url.pathname.endsWith(s.replace('./', '/')))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
