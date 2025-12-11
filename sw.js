var CACHE_NAME = "ki-pastel-v1.2.1";

var urlsToCache = [
  "Cardapio.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

// ----------------------
// INSTALL
// ----------------------
self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// ----------------------
// ACTIVATE – remove caches antigos
// ----------------------
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ----------------------
// FETCH HANDLER SEGURO
// ----------------------
self.addEventListener("fetch", function (event) {
  const req = event.request;

  // HTML NAVIGATION → network first + fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .catch(() => caches.match("Cardapio.html"))
    );
    return;
  }

  // ASSETS → cache-first com atualização silenciosa
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(resp => {
          if (!resp || resp.status !== 200) return resp;
          // só cacheia ASSETS, nunca navegação
          if (req.url.endsWith(".png") || req.url.endsWith(".jpg") ||
              req.url.endsWith(".css") || req.url.endsWith(".js") ||
              req.url.includes("icon")) {

            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, resp.clone());
            });
          }
          return resp;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Mensagem para ativar SW
self.addEventListener("message", e => {
  if (e.data && e.data.action === "skipWaiting") self.skipWaiting();
});
