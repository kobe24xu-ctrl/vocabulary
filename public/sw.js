const CACHE = "lexiclass-shell-v11";
const SHELL = [
  "/",
  "/styles.css",
  "/app.js",
  "/speech.js",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never cache credentials, API responses, student records or submissions.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (SHELL.includes(url.pathname))
    event.respondWith(
      fetch(event.request).catch(() => caches.match(url.pathname)),
    );
});
