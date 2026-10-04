const CACHE = 'ecurie-v2';
const FICHIERS = ['./', 'index.html', 'styles.css', 'app.js', 'prevision.js', 'soins.js', 'firebase-config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // Modules Firebase : en cache d'abord, pour démarrer sans réseau
  if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); return r;
    })));
    return;
  }
  if (u.origin !== location.origin) return;
  // Application : réseau d'abord, copie en cache si hors réseau
  e.respondWith(fetch(e.request).then(r => {
    const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
