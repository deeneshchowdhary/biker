// Offline support: cache the game the first time it loads.
// Bump CACHE (bonk-v2, bonk-v3, ...) on every release so iPads pick up the new version.
const CACHE = 'bonk-v1';
const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/main.js', 'js/scene.js', 'js/road.js', 'js/player.js', 'js/rivals.js', 'js/obstacles.js',
  'js/input.js', 'js/hud.js', 'js/audio.js', 'js/worlds.js', 'js/save.js', 'js/menus.js',
  'js/race.js', 'js/models.js', 'js/rewards.js', 'js/util.js',
  'assets/icons/icon-180.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    })),
  );
});
