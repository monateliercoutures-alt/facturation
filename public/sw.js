/* Service worker FactureCI.
 * - Cache de l'interface : fichiers statiques /_next/static et icônes (cache d'abord).
 * - Page hors ligne : précachée, affichée quand le réseau manque.
 * - Formulaire « Nouveau document » : dernière version vue, pour créer un brouillon hors connexion.
 * - JAMAIS en cache : lien public /d/, PDF, export, API, authentification, autres pages de données.
 *   La page du formulaire est vidée à la déconnexion (message « clear »).
 */
const VERSION = "v1";
const STATIC = `factureci-static-${VERSION}`;
const PAGES = `factureci-pages-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear") event.waitUntil(caches.delete(PAGES));
});

const isNewDocument = (url) => url.pathname === "/app/documents/nouveau";
const neverCache = (url) => /^\/(api|d)\//.test(url.pathname) || /\/pdf$/.test(url.pathname) || url.pathname === "/app/export";

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || neverCache(url)) return;

  // Fichiers statiques versionnés : cache d'abord.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Seul le formulaire de nouveau document est gardé, pour le mode hors connexion.
          if (response.ok && !response.redirected && isNewDocument(url)) {
            const cache = await caches.open(PAGES);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          if (isNewDocument(url)) {
            const cached = await (await caches.open(PAGES)).match(request, { ignoreSearch: true });
            if (cached) return cached;
          }
          return (await caches.match(OFFLINE_URL)) ?? new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })(),
    );
  }
});
