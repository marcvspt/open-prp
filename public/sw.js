const CACHE = "open-prp-v2";
const APP_PREFIX_ES = "/es/app/";
const APP_PREFIX_EN = "/en/app/";
const PRECACHE_URLS = ["/es/app/dashboard", "/es/app/login", "/es/app/transactions", "/es/app/cards", "/es/app/installments", "/es/app/recurring-payments", "/es/app/cashback", "/es/app/payment-methods", "/es/app/shopping", "/es/app/tasks", "/es/app/notes", "/es/app/events", "/es/app/pantry", "/es/app/categories"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS)
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isApp =
    url.pathname.startsWith(APP_PREFIX_ES) || url.pathname.startsWith(APP_PREFIX_EN);
  if (e.request.method !== "GET" || !isApp) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
