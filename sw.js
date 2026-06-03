/**
 * Offline-first shell: serve cached same-origin assets when the network is down.
 */
const CACHE = "cardworld-shell-v8";

const HF_BASE = "./embedded/harmonyforge/";

/** HarmonyForge scripts/CSS (no samples — those load on demand). */
const HF_PRECACHE = [
  "index.html",
  "css/styles.css",
  "css/card-world-embed.css",
  "css/layout.css",
  "css/layout-spacing.css",
  "locales/en.json",
  "locales/zh-Hans.json",
  "js/hf-boot.js",
  "js/i18n.js",
  "js/app-logger.js",
  "js/version.js",
  "js/tone.min.js",
  "js/instrument-registry.js",
  "js/instrument-engine.js",
  "js/instrument-store.js",
  "js/instruments.js",
  "js/audio-engine.js",
  "js/track-timing.js",
  "js/sequencer.js",
  "js/arranger.js",
  "js/track-playback.js",
  "js/layout.js",
  "js/file-save.js",
  "js/project-io.js",
  "js/help-guide.js",
  "js/history.js",
  "js/lame.min.js",
  "js/audio-export.js",
  "js/draft-station.js",
  "js/track-pool.js",
  "js/tone-lab.js",
  "js/cloud-publish.js",
  "js/app.js",
].map((p) => HF_BASE + p);

const PRECACHE = [
  "./",
  "./index.html",
  "./css/main.css",
  "./js/app.js",
  "./js/app-logger.js",
  "./js/app-version.js",
  "./js/net-policy.js",
  "./js/music-config.js",
  "./js/supabase-client.js",
  "./js/storage.js",
  "./js/cloud-config.js",
  "./js/art-storage.js",
  "./dist/seed-bundle.json",
  "./locales/en.json",
  "./locales/zh-Hans.json",
  "./version.json",
  "./manifest.webmanifest",
  ...HF_PRECACHE,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))).then(() => cache)
      )
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
      .catch(() => {
        const path = url.pathname;
        const isDoc =
          event.request.mode === "navigate" ||
          path.endsWith("/") ||
          path.endsWith(".html");
        return caches.match(event.request).then((r) => {
          if (r) return r;
          if (isDoc) return caches.match("./index.html");
          return Response.error();
        });
      })
  );
});
