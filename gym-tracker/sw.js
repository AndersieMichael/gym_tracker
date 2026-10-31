// Offline support: keeps the app and your guide pictures on the phone.
// Bump VERSION when you change any file so phones pick up the new version (bug fixes: 11.1, 11.2…).
// Keep the number the same as APP_VERSION.n in index.html.
const VERSION = 'gym-v15.2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  // guide pictures still in use (the others were replaced by the -3d.webp versions below)
  ...[
    'lateral-raise-machine', 'dumbbell-lateral-raise', 'seated-front-raise', 'ab-crunch-machine',
    'deadlift', 'triceps-pushdown',
    'barbell-squat', 'leg-extension', 'lying-leg-curl', 'leg-press',
    'bodyweight-squat', 'bulgarian-split-squat', 'single-leg-rdl', 'glute-bridge', 'calf-raise',
  ].map(n => `images/${n}.jpg`),
  'images/outdoor-run.svg',
  ...['arm-circles', 'cross-body-stretch', 'wall-slides', 'arm-swings', 'doorway-stretch', 'incline-push-up', 'cat-cow', 'thoracic-rotation', 'hip-hinge', 'leg-swings', 'hip-circles', 'march-in-place', 'high-knees', 'ankle-circles', 'overhead-triceps-stretch', 'childs-pose', 'lying-twist', 'quad-stretch', 'hamstring-stretch', 'calf-stretch', 'figure-four', 'hip-flexor-stretch'].map(n => `images/moves/${n}.svg`),
  ...['pec-deck-fly', 'chest-press-machine', 'hammer-curl', 'face-pull', 'seated-cable-row', 'lat-pulldown', 'treadmill'].map(n => `images/${n}-3d.webp`),
  'images/lat-pulldown/lat-pulldown.mp4', 'images/treadmill/treadmill.mp4',
  'images/chest-press-machine/chest-press-machine.mp4', 'images/seated-cable-row/seated-cable-row.mp4',
  ...['seated-dumbbell-press', 'dumbbell-reverse-fly', 'push-up', 'dumbbell-floor-fly', 'floor-crunch', 'dumbbell-pullover', 'one-arm-dumbbell-row', 'dumbbell-rdl', 'chair-dips'].map(n => `images/home/${n}.svg`),
  'images/shoulder-press-machine-3d.webp',
  'images/shoulder-press-machine/shoulder-press-machine.mp4',
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
  // videos: iPhone asks for them in pieces (Range requests), so answer with just that piece of the saved copy
  if (new URL(e.request.url).pathname.endsWith('.mp4')) { e.respondWith(videoPiece(e.request)); return; }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});

async function videoPiece(req) {
  const cache = await caches.open(VERSION);
  const url = req.url.split('#')[0];
  let full = await cache.match(url, { ignoreSearch: true });
  if (!full) {
    try {
      const res = await fetch(url); // the whole file, no Range, so it can be saved
      if (!res.ok) return res;
      await cache.put(url, res.clone());
      full = res;
    } catch (err) { return new Response('', { status: 504, statusText: 'Offline' }); }
  }
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const type = full.headers.get('Content-Type') || 'video/mp4';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('Range') || '');
  if (!m) return new Response(buf, { headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  let start = m[1] ? Number(m[1]) : size - Number(m[2]);
  let end = m[1] && m[2] ? Number(m[2]) : size - 1;
  start = Math.max(0, start); end = Math.min(end, size - 1);
  if (start > end) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
