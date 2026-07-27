const CACHE = "open-prp-v1";
const APP_PREFIX = "/app/";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/app/dashboard", "/app/login", "/app/transactions", "/app/cards", "/app/installments", "/app/recurring-payments", "/app/cashback", "/app/payment-methods", "/app/shopping", "/app/tasks", "/app/notes", "/app/events", "/app/pantry", "/app/categories"])
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
  if (!url.pathname.startsWith(APP_PREFIX)) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
