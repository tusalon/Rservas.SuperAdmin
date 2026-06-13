const CACHE_NAME = 'rservas-admin-v8';
const urlsToCache = [
  'index.html',
  'login.html',
  'supabase-config.js',
  'super-admin.js',
  'manifest.json',
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('📦 Service Worker instalando...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cache creado');
      return cache.addAll(urlsToCache);
    }).catch(error => console.error('❌ Error al cachear:', error))
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
  const url = event.request.url;
  
  // Ignorar extensiones de Chrome
  if (url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Ignorar APIs externas
  if (url.includes('supabase.co')) return;
  if (url.includes('ntfy.sh')) return;
  if (url.includes('tailwindcss.com')) return;
  if (url.includes('cdn.')) return;

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
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
