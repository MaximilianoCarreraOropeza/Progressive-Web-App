// Constantes para el caché
const CACHE_NAME = 'pwa-bitacora-v2';
const ASSETS_TO_CACHE = [
    './', // La ruta base (index.html)
    'index.html',
    'sw.js',
];

// Función para obtener la hora actual en el formato DD-MM-YYYY HH:MM:SS
function getFormattedTime() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    
    // DD-MM-YYYY
    const datePart = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    // HH:MM:SS
    const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    return `${datePart} ${timePart}`;
}

// 📌 1. ESTADO: Instalando (install)
// 'self' es una referencia al Service Worker en sí mismo.
self.addEventListener('install', (event) => {
    // Al iniciar, el estado es 'Instalando'.
    console.log(`[SW] ➡️ 1. Instalando... (install)`);

    // Esperamos que el proceso de instalación termine.
    // 'event.waitUntil' asegura que el SW no se instale hasta que el código dentro se complete.
    event.waitUntil(
        // Abrimos el caché que definimos.
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW] 📦 1.1. Cache abierto: ${CACHE_NAME}`);
                // Agregamos todos los recursos al caché.
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                 // 📌 2. ESTADO: Instalado (cached)
                const installedTime = getFormattedTime();
                console.log(`[SW] ✅ 2. Instalado (cached): ${installedTime}`);
                // Forzamos al nuevo SW a tomar el control inmediatamente.
                // Sin esta línea, el SW se quedaría 'waiting' hasta que se cerraran todas las pestañas.
                self.skipWaiting();
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ estado: 'instalado' });
                    });
                });
            })
            .catch((error) => {
                console.error('[SW] ❌ Error durante la instalación:', error);
            })
    );
});


// 📌 3. ESTADO: Activación (activate)
self.addEventListener('activate', (event) => {
    console.log(`[SW] ➡️ 3. Activación... (activate)`);
    // 'event.waitUntil' se usa aquí para limpiar cachés viejos si cambias el nombre del CACHE_NAME.
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Si el nombre del caché es diferente al actual, lo eliminamos.
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] 🗑️ 3.1. Eliminando caché viejo: ${cacheName}`);

                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log(`[SW] ✅ 3.2. Activado y listo para tomar control.`);
            // Aseguramos que el SW tome control de la página tan pronto como sea posible.
            // Esto es crucial para que las peticiones (fetch) empiecen a ser interceptadas.
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ estado: 'activado' });
                });
            });
            return self.clients.claim();
        })
    );
});


// 📌 4. ESTADO: Activo (fetch)
// Después de activarse, el SW entra en el estado activo.
// Este evento se dispara CADA VEZ que el navegador hace una petición de red.
self.addEventListener('fetch', (event) => {
    // Solo registramos el primer 'fetch' para no saturar la consola.
    // La presencia de esta función con lógica ya indica que el SW está 'Activo'.
    if (!self.hasLoggedInFetch) {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ estado: 'activo' });
            });
        });
        console.log(`[SW] 🚀 4. Activo - Interceptando petición (fetch) para: ${event.request.url}`);
        self.hasLoggedInFetch = true; // Variable de control simple
    }

    // Estrategia: Cache, luego red (Cache First)
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Si el recurso está en caché, lo devolvemos inmediatamente.
            if (response) {
                return response;
            }
            // Si no está, lo buscamos en la red.
            return fetch(event.request);
        })
    );
    // 📌 5. ESTADO: Ocioso (Idle)
    // El SW vuelve al estado 'Ocioso' después de procesar el evento 'fetch' o 'push',
    // y espera por el siguiente evento. Si no hay eventos, permanece Ocioso.
    // Este estado es el estado por defecto cuando no está ejecutando ninguna tarea.
});

// Nota: Si el navegador no lo elimina, el SW está siempre en el estado 'Activo' o 'Ocioso'.
// El estado 'Ocioso' es el estado de reposo cuando no hay eventos de 'fetch', 'push', etc.