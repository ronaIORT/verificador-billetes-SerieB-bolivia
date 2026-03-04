/**
 * Service Worker - Verificador de Billetes Bolivia
 * Implementa estrategia Cache First para funcionamiento offline
 */

const CACHE_NAME = 'verificador-billetes-v1';

// Archivos a cachear para funcionamiento offline
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/db.js',
    './js/scanner.js',
    './js/validator.js',
    './data/blacklist.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// CDN assets to cache
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

/**
 * Evento de instalación - Cachear assets estáticos
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando archivos estáticos...');
                
                // Cachear assets locales
                const localPromise = cache.addAll(STATIC_ASSETS);
                
                // Intentar cachear CDN assets (pueden fallar)
                const cdnPromise = Promise.all(
                    CDN_ASSETS.map(url => 
                        fetch(url)
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                            })
                            .catch(err => console.warn('[SW] No se pudo cachear CDN:', url, err))
                    )
                );
                
                return Promise.all([localPromise, cdnPromise]);
            })
            .then(() => {
                console.log('[SW] Instalación completada');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Error en instalación:', error);
            })
    );
});

/**
 * Evento de activación - Limpiar caches antiguos
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Eliminando cache antiguo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activado');
                return self.clients.claim();
            })
    );
});

/**
 * Evento fetch - Estrategia Cache First con fallback a Network
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Solo manejar requests GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorar requests de chrome-extension y otros protocolos
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Si está en cache, devolverlo
                if (cachedResponse) {
                    console.log('[SW] Sirviendo desde cache:', request.url);
                    return cachedResponse;
                }
                
                // Si no está en cache, buscar en la red
                console.log('[SW] Buscando en red:', request.url);
                return fetch(request)
                    .then((networkResponse) => {
                        // Verificar que la respuesta sea válida
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Clonar la respuesta para guardarla en cache
                        const responseToCache = networkResponse.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Error en fetch:', error);
                        
                        // Si es una navegación, devolver la página principal
                        if (request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // Para otros recursos, devolver error
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/**
 * Evento de mensaje - Para comunicación con la app
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

/**
 * Evento de sincronización en segundo plano (si está disponible)
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Evento de sincronización:', event.tag);
});

console.log('[SW] Service Worker cargado');