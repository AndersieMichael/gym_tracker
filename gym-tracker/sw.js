// Offline support: keeps the app and your guide pictures on the phone.
// Bump VERSION when you change any file so phones pick up the new version.
const VERSION = 'gym-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  ...[
    'shoulder-press-machine', 'lateral-raise-machine', 'dumbbell-lateral-raise', 'seated-front-raise', 'face-pull', 'hammer-curl',
    'chest-press-machine', 'pec-deck-fly', 'hammer-curl-2', 'ab-crunch-machine',
    'lat-pulldown', 'seated-cable-row', 'deadlift', 'triceps-pushdown',
    'barbell-squat', 'leg-extension', 'lying-leg-curl', 'leg-press',
    'bodyweight-squat', 'bulgarian-split-squat', 'single-leg-rdl', 'glute-bridge', 'calf-raise',
  ].map(n => `images/${n}.jpg`),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Serve from the phone first (works with no signal), refresh from the internet in the background.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
