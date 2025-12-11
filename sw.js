/* sw.js - Sigma Web Systems
   Politica: NETWORK-FIRST para HTML (navegação)
            CACHE-FIRST para assets (imagens/css/js)
   Offline only as fallback. Nunca cachear HTML inválido.
*/

var CACHE_NAME = "ki-pastel-v1.2.0";
var OFFLINE_PAGE = "Cardapio.html";

// Lista mínima de assets a colocar no cache durante a instalação
var urlsToCache = [
  OFFLINE_PAGE,
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

// Install -> pré-cache do mínimo necessário (fallback)
self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate -> limpar caches antigos
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

// Helper: testa se a response é segura para cache
function isValidResponseForCache(response) {
  // quer somente responses ok (status 200) e tipo basic (mesma origem)
  return response && response.status === 200 && response.type === "basic";
}

// Fetch handler
self.addEventListener("fetch", function (event) {
  var request = event.request;

  // Somente interceptar requisições GET (evita POST/PUT etc)
  if (request.method !== "GET") {
    return;
  }

  // Tratamento especial: navegação (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      // Tenta pela rede primeiro
      fetch(request)
        .then(function (networkResponse) {
          // Se a resposta for válida, atualiza o cache do OFFLINE_PAGE
          if (isValidResponseForCache(networkResponse)) {
            caches.open(CACHE_NAME).then(function (cache) {
              // Salva a versão válida do HTML para fallback futuro
              cache.put(OFFLINE_PAGE, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(function () {
          // Falha de rede -> serve a última versão válida do cache (fallback)
          return caches.match(OFFLINE_PAGE);
        })
    );
    return;
  }

  // Para requests de assets (css, js, imagens, fontes) usar cache-first com atualização em background
  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      var fetchPromise = fetch(request)
        .then(function (networkResponse) {
          // Só atualizar cache se a resposta for válida e for mesma origem
          try {
            if (isValidResponseForCache(networkResponse)) {
              // Opcional: ignore cross-origin opaque responses (fonts CDN, analytics)
              // Só armazena respostas basic (mesma origem) e status 200
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(request, networkResponse.clone());
              });
            }
          } catch (e) {
            // segurar falhas silenciosamente
            console.error("SW: erro ao atualizar cache", e);
          }
          return networkResponse;
        })
        .catch(function () {
          // Se a rede falhar, retorna o cache (se existir)
          return cachedResponse;
        });

      // Se tem cache, devolve imediatamente, senão espera o fetch
      return cachedResponse || fetchPromise;
    })
  );
});

// Permite que o cliente peça ao SW para pular waiting
self.addEventListener("message", function (event) {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
