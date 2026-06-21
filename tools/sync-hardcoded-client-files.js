const fs = require('fs');
const path = require('path');

const HARD_CODED_FILES = [
  'admin.html',
  'index.html',
  'manifest.json',
  'sw.js',
  path.join('utils', 'config-negocio.js'),
];
const ASSET_VERSION = '20260513';
const ADMIN_APP_VERSION = '20260514-admin-reprogram2';
const MULTI_SLOTS_VERSION = '20260514-multi-slots10';

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function match(text, regex, fallback = '') {
  const found = text.match(regex);
  return found ? found[1] : fallback;
}

function matchJsSingle(text, regex, fallback = '') {
  const found = text.match(regex);
  return found ? found[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : fallback;
}

function jsString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceQuotedToken(text, from, to) {
  const escapedFrom = escapeRegExp(from);
  const escapedTo = jsString(to);
  return text
    .replace(new RegExp(`'${escapedFrom}'`, 'g'), `'${escapedTo}'`)
    .replace(new RegExp(`"${escapedFrom}"`, 'g'), `"${String(to || '').replace(/"/g, '&quot;')}"`);
}

function extractClient(targetDir) {
  const manifestPath = path.join(targetDir, 'manifest.json');
  const configPath = path.join(targetDir, 'utils', 'config-negocio.js');
  const swPath = path.join(targetDir, 'sw.js');
  const indexPath = path.join(targetDir, 'index.html');

  const manifest = JSON.parse(read(manifestPath));
  const config = read(configPath);
  const sw = read(swPath);
  const index = read(indexPath);

  const slug =
    String(manifest.scope || manifest.start_url || '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '') ||
    path.basename(targetDir);

  const negocioId = match(config, /NEGOCIO_ID_POR_DEFECTO\s*=\s*'([^']+)'/);
  if (!negocioId) {
    throw new Error(`No pude detectar NEGOCIO_ID_POR_DEFECTO en ${configPath}`);
  }

  return {
    slug,
    negocioId,
    name: manifest.name || match(config, /CLIENTE:\s*(.+)/, path.basename(targetDir)),
    shortName: manifest.short_name || (manifest.name || slug).slice(0, 12),
    description: manifest.description || match(index, /<meta name="description" content="([^"]*)"/, 'Reserva de turnos online'),
    themeColor: manifest.theme_color || manifest.background_color || match(index, /<meta name="theme-color" content="([^"]*)"/, '#ec4899'),
    backgroundColor: manifest.background_color || manifest.theme_color || '#ec4899',
    phone: match(config, /getTelefonoDuenno[\s\S]*?return config\?\.telefono \|\| '([^']*)'/, ''),
    email: match(config, /getEmailNegocio[\s\S]*?return config\?\.email \|\| '([^']*)'/, ''),
    instagram: match(config, /getInstagram[\s\S]*?return config\?\.instagram \|\| '([^']*)'/, ''),
    facebook: match(config, /getFacebook[\s\S]*?return config\?\.facebook \|\| '([^']*)'/, ''),
    horario: match(config, /getHorarioAtencion[\s\S]*?return config\?\.horario_atencion \|\| '([^']*)'/, ''),
    welcome: matchJsSingle(config, /getMensajeBienvenida[\s\S]*?return config\?\.mensaje_bienvenida \|\| '((?:\\'|[^'])*)'/, ''),
    confirm: matchJsSingle(config, /getMensajeConfirmacion[\s\S]*?return config\?\.mensaje_confirmacion \|\| '((?:\\'|[^'])*)'/, ''),
    ntfyTopic: match(config, /getNtfyTopic[\s\S]*?return config\?\.ntfy_topic \|\| '([^']*)'/, `${slug}-notifications`),
    cacheName: match(sw, /CACHE_NAME\s*=\s*'([^']+)'/, `${slug}-v1`),
  };
}

function replaceBusinessTokens(text, baseInfo, targetInfo) {
  const replacements = [
    [baseInfo.slug, targetInfo.slug],
    [baseInfo.name, targetInfo.name],
    [baseInfo.shortName, targetInfo.shortName],
    [baseInfo.negocioId, targetInfo.negocioId],
    [baseInfo.themeColor, targetInfo.themeColor],
    [baseInfo.backgroundColor, targetInfo.backgroundColor],
    [baseInfo.phone, targetInfo.phone],
    [baseInfo.email, targetInfo.email],
    [baseInfo.instagram, targetInfo.instagram],
    [baseInfo.facebook, targetInfo.facebook],
    [baseInfo.ntfyTopic, targetInfo.ntfyTopic],
  ].filter(([from]) => from);

  let result = text;
  for (const [from, to] of replacements) {
    result = replaceQuotedToken(result, from, to || '');
    result = result.split(from).join(to || '');
  }
  return result;
}

function escapeJsGeneratedContent(file, text, info) {
  if (!file.endsWith('.js')) return text;

  let result = text;
  const values = [
    info.name,
    info.shortName,
    info.welcome,
    info.confirm,
  ].filter(value => String(value || '').includes("'"));

  for (const value of values) {
    result = result.split(value).join(jsString(value));
  }

  return result;
}

function buildManifest(info) {
  return `${JSON.stringify({
    name: info.name,
    short_name: info.shortName,
    description: info.description,
    start_url: `/${info.slug}/`,
    scope: `/${info.slug}/`,
    display: 'standalone',
    background_color: info.backgroundColor,
    theme_color: info.themeColor,
    icons: [
      {
        src: `/${info.slug}/icons/icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `/${info.slug}/icons/icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }, null, 2)}\n`;
}

function buildAdminHtml(info) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administracion - ${info.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js"></script>
    <link href="https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div id="root"></div>

    <script src="utils/supabase-config.js"></script>
    <script src="utils/config-negocio.js"></script>
    <script src="utils/storage.js"></script>
    <script src="utils/api.js"></script>
    <script src="utils/timeLogic.js"></script>
    <script src="utils/auth-clients.js"></script>
    <script src="utils/auth-profesionales.js"></script>
    <script src="utils/servicios.js"></script>
    <script src="utils/profesionales.js"></script>
    <script src="utils/config.js"></script>
    <script src="utils/whatsapp-helper.js"></script>

    <script src="components/admin/ConfigPanel.js?v=${ADMIN_APP_VERSION}" type="text/babel"></script>
    <script src="components/admin/ServiciosPanel.js" type="text/babel"></script>
    <script src="components/admin/ServiciosPanelPro.js" type="text/babel"></script>
    <script src="components/admin/ServiciosPanelCategorias.js?v=${ASSET_VERSION}" type="text/babel"></script>
    <script src="components/admin/ProfesionalesPanel.js" type="text/babel"></script>
    <script src="components/admin/HorariosPorDiaPanel.js?v=${ADMIN_APP_VERSION}" type="text/babel"></script>
    <script src="admin-app.js?v=${ADMIN_APP_VERSION}" type="text/babel"></script>

    <script>
        (function() {
            const negocioId = localStorage.getItem('negocioId');
            if (!negocioId) {
                console.log('No hay sesion, redirigiendo a login');
                window.location.href = 'admin-login.html';
                return;
            }

            const loginTime = localStorage.getItem('adminLoginTime');
            const isValidSession = loginTime && (Date.now() - parseInt(loginTime)) < 8 * 60 * 60 * 1000;
            if (!isValidSession) {
                localStorage.clear();
                window.location.href = 'admin-login.html';
            }
        })();
    </script>
</body>
</html>
`;
}

function buildIndexHtml(info) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cargando...</title>
    <meta name="description" content="${info.description || 'Reserva de turnos online'}">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="${info.themeColor}">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="${info.shortName}">
    <link rel="apple-touch-icon" href="icons/icon-192x192.png">
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192x192.png">

    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const pathSegments = window.location.pathname.split('/');
                const basePath = pathSegments.length > 2 ? '/' + pathSegments[1] : '';
                const swPath = basePath ? \`\${basePath}/sw.js\` : '/sw.js';
                console.log('Registrando Service Worker en:', swPath);
                navigator.serviceWorker.register(swPath)
                    .then(registration => console.log('Service Worker registrado:', registration.scope))
                    .catch(error => console.log('Error registrando Service Worker:', error));
            });
        }
    </script>

    <script src="https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link href="https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.css" rel="stylesheet">

    <style type="text/tailwindcss">
        @layer utilities {
            .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script src="utils/supabase-config.js"></script>
    <script src="utils/config-negocio.js"></script>
    <script src="utils/storage.js"></script>
    <script src="utils/api.js"></script>
    <script src="utils/timeLogic.js"></script>
    <script src="utils/auth-clients.js"></script>
    <script src="utils/auth-profesionales.js"></script>
    <script src="utils/config.js"></script>
    <script src="utils/servicios.js"></script>
    <script src="utils/profesionales.js"></script>
    <script src="utils/whatsapp-helper.js"></script>
    <script src="utils/dias-cerrados.js"></script>

    <script src="components/Header.js" type="text/babel"></script>
    <script src="components/ServiceSelection.js" type="text/babel"></script>
    <script src="components/ServiceSelectionTabs.js" type="text/babel"></script>
    <script src="components/ServiceSelectionCategorias.js?v=${ASSET_VERSION}" type="text/babel"></script>
    <script src="components/ProfesionalSelector.js" type="text/babel"></script>
    <script src="components/MultiProfesionalSelector.js" type="text/babel"></script>
    <script src="components/Calendar.js?v=${MULTI_SLOTS_VERSION}" type="text/babel"></script>
    <script src="components/TimeSlots.js?v=${MULTI_SLOTS_VERSION}" type="text/babel"></script>
    <script src="components/MultiTimeSlots.js?v=${MULTI_SLOTS_VERSION}" type="text/babel"></script>
    <script src="components/BookingForm.js?v=${MULTI_SLOTS_VERSION}" type="text/babel"></script>
    <script src="components/Confirmation.js" type="text/babel"></script>
    <script src="components/WelcomeScreen.js" type="text/babel"></script>
    <script src="components/WhatsAppButton.js" type="text/babel"></script>
    <script src="components/ClientAuthScreen.js" type="text/babel"></script>
    <script src="components/MyBookings.js" type="text/babel"></script>
    <script src="components/InstallButton.js" type="text/babel"></script>
    <script src="client-app.js?v=${MULTI_SLOTS_VERSION}" type="text/babel"></script>

    <script>
        (async function() {
            try {
                const nombre = await window.getNombreNegocio();
                if (nombre) {
                    document.title = \`\${nombre} - Reserva de Turnos\`;
                    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', nombre.split(' ')[0] || '${info.shortName}');
                }
            } catch (error) {
                console.error('Error cargando titulo:', error);
            }
        })();
    </script>

    <script>
        window.addEventListener('load', () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                console.log('App ya instalada');
                return;
            }

            let deferredPrompt;
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                console.log('beforeinstallprompt listo');

                const btn = document.createElement('button');
                btn.innerText = 'INSTALAR APP';
                btn.style.position = 'fixed';
                btn.style.bottom = '20px';
                btn.style.right = '20px';
                btn.style.zIndex = '9999';
                btn.style.background = '${info.themeColor}';
                btn.style.color = 'white';
                btn.style.padding = '15px 30px';
                btn.style.borderRadius = '50px';
                btn.style.border = 'none';
                btn.style.fontWeight = 'bold';
                btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                btn.style.cursor = 'pointer';
                btn.onclick = async () => {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(\`Usuario: \${outcome}\`);
                    deferredPrompt = null;
                    btn.remove();
                };
                document.body.appendChild(btn);
            });

            setTimeout(() => {
                if (!deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
                    const msg = document.createElement('div');
                    msg.innerHTML = 'Para instalar: menu 3 puntos -> Instalar aplicacion';
                    msg.style.position = 'fixed';
                    msg.style.bottom = '20px';
                    msg.style.left = '20px';
                    msg.style.background = '#333';
                    msg.style.color = 'white';
                    msg.style.padding = '10px 20px';
                    msg.style.borderRadius = '10px';
                    msg.style.fontSize = '14px';
                    msg.style.zIndex = '9999';
                    document.body.appendChild(msg);
                    setTimeout(() => msg.remove(), 8000);
                }
            }, 5000);
        });
    </script>
</body>
</html>
`;
}

function buildConfig(info) {
  return `// utils/config-negocio.js - Multi-tenant
// CLIENTE: ${info.name}

console.log('config-negocio.js cargado');

const NEGOCIO_ID_POR_DEFECTO = '${info.negocioId}';
window.NEGOCIO_ID_POR_DEFECTO = NEGOCIO_ID_POR_DEFECTO;

window.getNegocioId = function() {
    return NEGOCIO_ID_POR_DEFECTO;
};

window.getNegocioIdFromConfig = function() {
    return NEGOCIO_ID_POR_DEFECTO;
};

let configCache = null;
let ultimaActualizacion = 0;
const CACHE_DURATION = 2 * 60 * 1000;

function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId) {
        console.log('Usando negocioId de localStorage:', localId);
        return localId;
    }
    console.log('Usando negocioId por defecto:', NEGOCIO_ID_POR_DEFECTO);
    return NEGOCIO_ID_POR_DEFECTO;
}

window.cargarConfiguracionNegocio = async function(forceRefresh = false) {
    const negocioId = getNegocioId();
    if (!negocioId) {
        console.error('No hay negocioId disponible');
        return null;
    }

    if (!forceRefresh && configCache && (Date.now() - ultimaActualizacion) < CACHE_DURATION) {
        console.log('Usando cache de configuracion');
        return configCache;
    }

    try {
        console.log('Cargando configuracion del negocio desde Supabase...');
        console.log('ID del negocio:', negocioId);
        const url = \`\${window.SUPABASE_URL}/rest/v1/negocios?id=eq.\${negocioId}&select=*\`;
        const response = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': \`Bearer \${window.SUPABASE_ANON_KEY}\`,
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('Error response:', await response.text());
            return null;
        }

        const data = await response.json();
        configCache = data[0] || null;
        ultimaActualizacion = Date.now();

        if (configCache) {
            console.log('Configuracion cargada:', configCache.nombre);
            if (!localStorage.getItem('negocioId')) {
                localStorage.setItem('negocioId', negocioId);
            }
        } else {
            console.log('No se encontro configuracion para el negocio');
        }

        return configCache;
    } catch (error) {
        console.error('Error cargando configuracion:', error);
        return null;
    }
};

window.getNombreNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.nombre || '${jsString(info.name)}';
};

window.getTelefonoDuenno = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.telefono || '${jsString(info.phone)}';
};

window.getEmailNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.email || '${jsString(info.email)}';
};

window.getInstagram = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.instagram || '${jsString(info.instagram)}';
};

window.getFacebook = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.facebook || '${jsString(info.facebook)}';
};

window.getHorarioAtencion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.horario_atencion || '${jsString(info.horario)}';
};

window.getMensajeBienvenida = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_bienvenida || '${jsString(info.welcome || `Bienvenida a ${info.name}`)}';
};

window.getMensajeConfirmacion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_confirmacion || '${jsString(info.confirm || 'Reserva confirmada')}';
};

window.getNtfyTopic = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.ntfy_topic || '${jsString(info.ntfyTopic)}';
};

window.getRequiereAnticipo = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.requiere_anticipo || false;
};

window.negocioConfigurado = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.configurado || false;
};

setTimeout(async () => {
    console.log('Precargando configuracion automatica...');
    await window.cargarConfiguracionNegocio();
}, 500);

console.log('config-negocio.js listo para ${jsString(info.name)}');
console.log('ID configurado:', NEGOCIO_ID_POR_DEFECTO);
`;
}

function buildServiceWorker(info) {
  const nextCache = info.cacheName.replace(/-v(\d+)$/, (_, n) => `-v${Number(n) + 1}`);
  const cacheName = nextCache === info.cacheName ? `${info.slug}-v2` : nextCache;
  return `// sw.js - Service Worker para ${info.name}

const CACHE_NAME = '${cacheName}';
const urlsToCache = [
  '/${info.slug}/',
  '/${info.slug}/index.html',
  '/${info.slug}/admin.html',
  '/${info.slug}/admin-login.html',
  '/${info.slug}/calendar.html',
  '/${info.slug}/setup-wizard.html',
  '/${info.slug}/editar-negocio.html',
  '/${info.slug}/manifest.json',
  '/${info.slug}/icons/icon-72x72.png',
  '/${info.slug}/icons/icon-96x96.png',
  '/${info.slug}/icons/icon-128x128.png',
  '/${info.slug}/icons/icon-144x144.png',
  '/${info.slug}/icons/icon-152x152.png',
  '/${info.slug}/icons/icon-192x192.png',
  '/${info.slug}/icons/icon-384x384.png',
  '/${info.slug}/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache creado, guardando archivos...');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Error al cachear archivos:', error))
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activado, limpiando caches antiguos...');
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) {
          console.log('Eliminando cache antiguo:', cacheName);
          return caches.delete(cacheName);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  if (
    event.request.url.includes('wa.me') ||
    event.request.url.includes('api.whatsapp.com') ||
    event.request.url.includes('whatsapp.com')
  ) return;
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('ntfy.sh')) return;
  if (event.request.url.includes('unsplash.com')) return;
  if (
    event.request.url.includes('cdn.') ||
    event.request.url.includes('unpkg.com') ||
    event.request.url.includes('trickle.so')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        if (event.request.url.match(/\\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          return caches.match('/${info.slug}/icons/icon-192x192.png');
        }
        return new Response('Error de red', { status: 408 });
      }))
  );
});

self.addEventListener('message', event => {
  console.log('Mensaje recibido:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => cacheNames.forEach(cacheName => caches.delete(cacheName)));
  }
});

console.log('Service Worker configurado para ${info.name}');
console.log('Cache:', CACHE_NAME);
console.log('Archivos a cachear:', urlsToCache.length);
`;
}

function sync({ baseDir, targetDir, outDir, apply }) {
  const baseInfo = extractClient(baseDir);
  const targetInfo = extractClient(targetDir);
  const generated = new Map();

  generated.set('manifest.json', buildManifest(targetInfo));
  generated.set('admin.html', replaceBusinessTokens(read(path.join(baseDir, 'admin.html')), baseInfo, targetInfo));
  generated.set('index.html', replaceBusinessTokens(read(path.join(baseDir, 'index.html')), baseInfo, targetInfo));
  generated.set(path.join('utils', 'config-negocio.js'), escapeJsGeneratedContent(path.join('utils', 'config-negocio.js'), replaceBusinessTokens(read(path.join(baseDir, 'utils', 'config-negocio.js')), baseInfo, targetInfo), targetInfo));
  generated.set('sw.js', escapeJsGeneratedContent('sw.js', replaceBusinessTokens(read(path.join(baseDir, 'sw.js')), baseInfo, targetInfo), targetInfo));

  console.log('Cliente detectado:');
  console.log(JSON.stringify(targetInfo, null, 2));

  for (const file of HARD_CODED_FILES) {
    const targetFile = path.join(targetDir, file);
    const next = generated.get(file);
    const current = read(targetFile);
    const changed = current !== next;
    console.log(`${changed ? 'CAMBIA' : 'OK   '} ${file}`);

    if (outDir) {
      const outFile = path.join(outDir, file);
      write(outFile, next);
      console.log(`  generado: ${outFile}`);
      continue;
    }

    if (apply && changed) {
      const backup = `${targetFile}.backup-sync-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
      fs.copyFileSync(targetFile, backup);
      write(targetFile, next);
      console.log(`  backup: ${backup}`);
    }
  }
}

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
};

const baseDir = getArg('--base', 'C:/Users/RODO/Documents/ClientesRservas/exoticnailsbyyuli');
const targetDir = getArg('--target');
const outDir = getArg('--out');
const apply = args.includes('--apply');

if (!targetDir) {
  console.error('Uso: node sync-hardcoded-client-files.js --target C:/ruta/cliente [--base C:/ruta/base] [--out C:/ruta/salida] [--apply]');
  process.exit(1);
}

sync({ baseDir, targetDir, outDir, apply });
