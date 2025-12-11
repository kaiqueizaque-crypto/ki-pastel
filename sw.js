var CACHE_NAME = "ki-pastel-v1.1.1";

var urlsToCache = [
  "Cardapio.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

// Instala e assume controle imediatamente
self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// Remove caches antigos
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cache) {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Network-first com fallback seguro
self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // HTML principal → nunca cachear resposta inválida
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          // só salva o HTML se estiver 200 OK
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put("Cardapio.html", response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match("Cardapio.html"))
    );
    return;
  }

  // Assets normais → network first com cache update
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(response => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});