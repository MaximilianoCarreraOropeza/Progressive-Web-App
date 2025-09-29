// Constantes para el caché
const CACHE_NAME = 'pwa-bitacora-v9';
const ASSETS_TO_CACHE = [
    './', // La ruta base (index.html)
    'sw.js',
];

// Función para obtener la hora actual en el formato DD-MM-YYYY HH:MM:SS
function getFormattedTime() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const datePart = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return `${datePart} ${timePart}`;
}

// Función para enviar mensajes a los clientes
function sendMessageToClients(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}

// Función para manejar la instalación
function handleInstall(event) {
    console.log(`[SW] ➡️ 1. Instalando... (install)`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW] 📦 1.1. Cache abierto: ${CACHE_NAME}`);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                const installedTime = getFormattedTime();
                console.log(`[SW] ✅ 2. Instalado (cached): ${installedTime}`);
                self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] ❌ Error durante la instalación:', error);
            })
    );
}

// Función para manejar la activación
function handleActivate(event) {
    console.log(`[SW] ➡️ 3. Activación... (activate)`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] 🗑️ 3.1. Eliminando caché viejo: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log(`[SW] ✅ 3.2. Activado y listo para tomar control.`);
            sendMessageToClients({ estado: 'activado' });
            return self.clients.claim();
        })
    );
}

// Función para manejar las peticiones (fetch)
function handleFetch(event) {
    if (!self.hasLoggedInFetch) {
        sendMessageToClients({ estado: 'activo' });
        console.log(`[SW] 🚀 4. Activo - Interceptando petición (fetch) para: ${event.request.url}`);
        self.hasLoggedInFetch = true;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
}

// 📌 1. ESTADO: Instalando (install)
self.addEventListener('install', handleInstall);

// 📌 3. ESTADO: Activación (activate)
self.addEventListener('activate', handleActivate);

// 📌 4. ESTADO: Activo (fetch)
self.addEventListener('fetch', handleFetch);