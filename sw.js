const CACHE_NAME = 'rservas-admin-v1';
const urlsToCache = [
  '/Rservas.SuperAdmin/',
  '/Rservas.SuperAdmin/index.html',
  '/Rservas.SuperAdmin/login.html',
  '/Rservas.SuperAdmin/supabase-config.js',
  '/Rservas.SuperAdmin/super-admin.js',
  '/Rservas.SuperAdmin/manifest.json',
  '/Rservas.SuperAdmin/icons/icon-72x72.png',
  '/Rservas.SuperAdmin/icons/icon-96x96.png',
  '/Rservas.SuperAdmin/icons/icon-128x128.png',
  '/Rservas.SuperAdmin/icons/icon-144x144.png',
  '/Rservas.SuperAdmin/icons/icon-152x152.png',
  '/Rservas.SuperAdmin/icons/icon-192x192.png',
  '/Rservas.SuperAdmin/icons/icon-384x384.png',
  '/Rservas.SuperAdmin/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('📦 Service Worker instalando...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cache creado');
      return cache.addAll(urlsToCache);
    }).catch(error => console.error('❌ Error:', error))
  );
});

self.addEventListener('activate', event => {
  console.log('🔄 Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('ntfy.sh')) return;
  if (event.request.url.includes('tailwindcss.com')) return;
  if (event.request.url.includes('cdn.')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});