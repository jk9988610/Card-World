/**
 * Offline-first shell: serve cached same-origin assets when the network is down.
 */
const CACHE = "cardworld-shell-v2";

const PRECACHE = [
  "./",
  "./index.html",
  "./css/main.css",
  "./js/app.js",
  "./js/app-logger.js",
  "./js/app-version.js",
  "./js/net-policy.js",
  "./js/supabase-client.js",
  "./js/storage.js",
  "./js/cloud-config.js",
  "./js/art-storage.js",
  "./dist/seed-bundle.json",
  "./locales/en.json",
  "./locales/zh-Hans.json",
  "./version.json",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("./index.html")))
  );
});
