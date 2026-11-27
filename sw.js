/* הצבא הקטן - service worker (נוצר אוטומטית בזמן הבנייה) */
const VERSION = '1.0.5';
const CACHE = 'hk-' + VERSION;
const ASSETS = ["./","./assets/index-O8QpUleN.css","./assets/index-_2O5K2Fp.js","./fonts/rubik-hebrew-500-normal.woff2","./fonts/rubik-hebrew-700-normal.woff2","./fonts/rubik-hebrew-900-normal.woff2","./fonts/rubik-latin-500-normal.woff2","./fonts/rubik-latin-700-normal.woff2","./fonts/rubik-latin-900-normal.woff2","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./index.html","./manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hk-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (req.mode === 'navigate') {
          const index = await cache.match('./index.html');
          if (index) return index;
        }
        throw err;
      }
    }),
  );
});
