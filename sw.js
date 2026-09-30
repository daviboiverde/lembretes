// Service worker: network-first. Online sempre pega a versão nova; cache só como fallback offline.
const CACHE = 'lembretes-v2';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.ico'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(async u => {
      try { await c.put(u, await fetch(u, { mode: 'no-cors' })); } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await caches.match('index.html')) || (await caches.match('./'));
      throw err;
    }
  })());
});
