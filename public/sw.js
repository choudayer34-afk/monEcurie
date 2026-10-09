const CACHE = 'ecurie-v5';
const FICHIERS = ['./', 'index.html', 'styles.css', 'app.js', 'prevision.js', 'soins.js', 'stocks.js', 'firebase-config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
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

// Notifications envoyées par le serveur (rappels de soins et de stocks)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { corps: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'Écurie', { body: d.corps || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || 'ecurie', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) if ('focus' in c) { if (c.navigate) c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
