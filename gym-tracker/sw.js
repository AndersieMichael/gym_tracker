// Offline support: keeps the app and your guide pictures on the phone.
// Bump VERSION when you change any file so phones pick up the new version.
// Keep the number the same as APP_VERSION.n in index.html.
const VERSION = 'gym-v8';
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
  'images/treadmill-photo.jpg',
  ...['hamster', 'cat', 'mike', 'squidward', 'gigachad', 'dumbbelldore'].map(n => `images/avatars/${n}.jpg`),
];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser cache so a new version really gets the new files
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Serve from the phone first (works with no signal), refresh from the internet in the background.
self.addEventListener('fetch', e => {
  const { origin } = new URL(e.request.url);
  // also keep the Google Fonts files, so the app looks the same with no signal
  const font = origin === 'https://fonts.googleapis.com' || origin === 'https://fonts.gstatic.com';
  if (e.request.method !== 'GET' || (origin !== location.origin && !font)) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
