// sw.js - Service Worker para PWA Rservas Admin
const CACHE_NAME = 'rservas-admin-v1';

// Archivos a cachear
const urlsToCache = [
  '/Rservas.SuperAdmin/',
  '/Rservas.SuperAdmin/index.html',
  '/Rservas.SuperAdmin/login.html',
  '/Rservas.SuperAdmin/supabase-config.js',
  '/Rservas.SuperAdmin/super-admin.js'
];

// Instalación
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Error al cachear:', err))
  );
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Cache antiguo eliminado:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - IGNORAR chrome-extension://
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // IGNORAR extensiones de Chrome
  if (url.startsWith('chrome-extension://')) {
    return;
  }
  
  // No cachear peticiones a Supabase
  if (url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // No cachear peticiones a ntfy.sh
  if (url.includes('ntfy.sh')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // No cachear peticiones a Tailwind CDN
  if (url.includes('tailwindcss.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Para archivos locales
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
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