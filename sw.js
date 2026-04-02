// sw.js - Service Worker para PWA Rservas Admin
const CACHE_NAME = 'rservas-admin-v1';

// Archivos a cachear (solo los esenciales para que funcione)
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/supabase-config.js',
  '/super-admin.js'
];

// Instalación: cachear archivos esenciales
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Error al cachear:', err))
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
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

// Fetch: estrategia "Network First" (primero internet, si falla usa cache)
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // No cachear peticiones a Supabase (API)
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
  
  // Para archivos locales: primero intentar red, si falla usar cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, la clonamos y guardamos en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, buscar en cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Si es una navegación y no está en cache, mostrar index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Recurso no disponible', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});