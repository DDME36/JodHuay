const CACHE_NAME = 'jodhuay-v80';
const RUNTIME_CACHE = 'jodhuay-runtime-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',  // Fixed: was ./css/styles.css
    './css/tailwind-built.css',
    './css/fonts.css',
    './css/tokens.css',
    './css/workflow.css',
    './css/responsive.css',
    './css/sacred-theme.css',
    './css/motion.css',
    './css/export-sheet.css',
    './app.js',
    './assets/vendor/html2canvas.min.js',
    './assets/vendor/modern-screenshot.min.js',
    './assets/fonts/prompt-thai-300-normal.woff2',
    './assets/fonts/prompt-latin-300-normal.woff2',
    './assets/fonts/prompt-thai-400-normal.woff2',
    './assets/fonts/prompt-latin-400-normal.woff2',
    './assets/fonts/prompt-thai-500-normal.woff2',
    './assets/fonts/prompt-latin-500-normal.woff2',
    './assets/fonts/prompt-thai-600-normal.woff2',
    './assets/fonts/prompt-latin-600-normal.woff2',
    './assets/fonts/prompt-thai-700-normal.woff2',
    './assets/fonts/prompt-latin-700-normal.woff2',
    './assets/fonts/marcellus-latin-400-normal.woff2',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/apple-touch-icon.png'
];

// Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Cache install failed:', err);
            })
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first for the app, stale-while-revalidate for CDN resources
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    const isSameOrigin = requestUrl.origin === self.location.origin;

    if (!isSameOrigin) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(async cache => {
                const cached = await cache.match(event.request);
                const network = fetch(event.request)
                    .then(response => {
                        if (response.ok || response.type === 'opaque') {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => cached || new Response('Offline - External asset not cached', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    }));

                return cached || network;
            })
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Check if valid response
                if (!response || response.status !== 200) {
                    return response;
                }
                
                // Clone the response
                const responseClone = response.clone();
                
                // Cache the fetched response
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseClone);
                    });
                
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request)
                    .then(cached => {
                        if (cached) {
                            return cached;
                        }
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // Return 503 for other requests
                        return new Response('Offline - Asset not cached', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});
