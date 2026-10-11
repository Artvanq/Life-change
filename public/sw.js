// Офлайн-режим: оболонка застосунку і бібліотеки для читання Word/Excel.
const CACHE = 'kontrol-v3';
const SHELL = ['/', '/styles.css?v=3', '/importer.js?v=3', '/app.js?v=3', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return; // дані завжди з мережі

  if (req.mode === 'navigate') { // сторінка: мережа, без мережі — кеш
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('/', c)); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (url.origin === location.origin) { // свої файли: віддати з кешу й оновити у фоні
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (CDN.includes(url.host)) { // бібліотеки й шрифти: кеш, потім мережа
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; })));
  }
});

// Push-сповіщення: нагадування і ранкове зведення
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Контроль задач', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Контроль задач', {
    body: d.body || '', tag: d.tag || undefined, icon: '/icon-192.png', badge: '/icon-192.png', data: { id: d.id || null }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if ('focus' in c) { if (id) c.postMessage({ type: 'open', id }); return c.focus(); }
    }
    return self.clients.openWindow(id ? '/#task-' + id : '/');
  }));
});
