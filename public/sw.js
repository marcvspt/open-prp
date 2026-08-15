const CACHE = "open-prp-v3";
const APP_PREFIX_ES = "/es/app/";
const APP_PREFIX_EN = "/en/app/";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Navegaciones (full load o view transitions): siempre a red. El HTML es SSR + auth,
  // nunca debe servirse desde cache (evita UI obsoleta/datos ajenos).
  if (e.request.mode === "navigate" || e.request.headers.get("accept")?.includes("text/html")) return;

  const isApp =
    url.pathname.startsWith(APP_PREFIX_ES) || url.pathname.startsWith(APP_PREFIX_EN);

  // Assets estáticos de la app (bundles de Astro bajo /_astro/): stale-while-revalidate.
  if (isApp || url.pathname.startsWith("/_astro/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(e.request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});