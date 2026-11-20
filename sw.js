/* Service worker: cache do app para funcionar offline */
const CACHE = 'crmpro-v1.0.0';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/icons.js', 'js/util.js', 'js/store.js', 'js/entities.js', 'js/records.js', 'js/reports.js', 'js/pages.js', 'js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Rede primeiro (pega atualizações); cache como reserva offline
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
