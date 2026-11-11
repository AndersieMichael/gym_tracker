// Offline support: keeps the app and your guide pictures on the phone.
// Bump VERSION when you change any file so phones pick up the new version (bug fixes: 11.1, 11.2…).
// Keep the number the same as APP_VERSION.n in index.html.
const VERSION = 'gym-v20.1';
// Folders in images/: 3d (cut-outs), photos (jpg), videos (tutorials), moves (warm-up / cool-down),
// grip (drawn pictures), avatars.
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  ...['shoulder-press-machine', 'chest-press-machine', 'pec-deck-fly', 'hammer-curl', 'face-pull', 'lat-pulldown', 'seated-cable-row', 'treadmill',
    'ab-crunch-machine', 'triceps-pushdown', 'deadlift', 'dumbbell-rdl', 'one-arm-dumbbell-row', 'dumbbell-pullover', 'chair-dips', 'farmers-hold', 'dead-hang',
    'leg-press', 'leg-extension', 'lying-leg-curl', 'barbell-squat', 'calf-raise', 'bodyweight-squat',
    'plank', 'side-plank', 'dead-bug', 'outdoor-run',
    'bulgarian-split-squat', 'dumbbell-lateral-raise', 'dumbbell-floor-fly', 'floor-crunch', 'push-up',
    'dumbbell-reverse-fly', 'seated-dumbbell-press', 'march-in-place',
    'single-leg-rdl', 'leg-swings', 'hip-circles', 'wall-slides', 'arm-circles', 'cross-body-stretch-left', 'cross-body-stretch-right',
    'arm-swings', 'lateral-raise-machine', 'doorway-stretch-left', 'doorway-stretch-right', 'incline-push-up',
    'overhead-triceps-stretch-left', 'overhead-triceps-stretch-right', 'childs-pose', 'glute-bridge',
  ].map(n => `images/3d/${n}-3d.webp`),
  ...['seated-front-raise'].map(n => `images/photos/${n}.jpg`),
  ...['shoulder-press-machine', 'chest-press-machine', 'lat-pulldown', 'seated-cable-row', 'treadmill', 'triceps-pushdown', 'pec-deck-fly'].map(n => `images/videos/${n}.mp4`),
  ...['cat-cow', 'thoracic-rotation', 'hip-hinge', 'high-knees', 'ankle-circles', 'lying-twist', 'quad-stretch', 'hamstring-stretch', 'calf-stretch', 'figure-four', 'hip-flexor-stretch'].map(n => `images/moves/${n}.svg`),
  ...['wrist-curl', 'reverse-wrist-curl'].map(n => `images/grip/${n}.svg`),
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
