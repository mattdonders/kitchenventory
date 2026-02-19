const CACHE = 'kitchenventory-v1.6.0';
const PRECACHE = [
  '/',
  '/css/style.css',
  '/js/api.js',
  '/js/app.js',
  '/js/components/nav.js',
  '/js/components/toast.js',
  '/js/components/modal.js',
  '/js/views/inventory.js',
  '/js/views/itemForm.js',
  '/js/views/shopping.js',
  '/js/views/recipes.js',
  '/js/views/settings.js',
  '/js/views/importList.js',
  '/js/views/mealplan.js',
  '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always go network-first for API calls
  if (e.request.url.includes('/api/')) return;

  // For everything else: network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
