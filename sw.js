const CACHE_NAME = 'jodhuay-v43'; // Updated version for cache refresh
const urlsToCache = [
    './',
    './index.html',
    './styles.css',  // Fixed: was ./css/styles.css
    './app.js',
    './manifest.json',
    './assets/icon.png'
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
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Check if valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                // Clone the response
                const responseClone = response.clone();
                
                // Cache the fetched response
                caches.open(CACHE_NAME)
                    .then(cache => {
                        if (event.request.method === 'GET') {
                            cache.put(event.request, responseClone);
                        }
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
