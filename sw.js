var CACHE_NAME = "ki-pastel-v1.0.7";

var urlsToCache = [
  "Cardapio.html",
  "manifest.json"
];

// ✅ Instala e já assume controle imediatamente
self.addEventListener("install", function (event) {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// ✅ Apaga todos os caches antigos automaticamente
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

// ✅ Estratégia: primeiro tenta rede, depois cache
self.addEventListener("fetch", function (event) {
  var requestUrl = event.request.url;

  // ✅ Ignora cache quando houver ?v= no arquivo
  if (requestUrl.includes("Cardapio.html?v=")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
self.addEventListener("message", function (event) {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});











