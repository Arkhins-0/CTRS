/*
 * CTR Sports admin service worker — Web Push display, click-through, and a
 * deliberately narrow offline shell.
 *
 * PRIVACY BOUNDARY: every route in this app sits behind an admin session, so
 * navigation responses are NEVER written to the cache. A shared or lost device
 * must not be able to page through yesterday's entry lists offline. We cache
 * only content-hashed build assets and the icons, and fall back to a static
 * offline page when a navigation cannot reach the network.
 *
 * Bump CACHE_VERSION whenever the precache list or a strategy below changes;
 * activate() deletes every cache that does not match the current namespace.
 */

const CACHE_VERSION = "v1";
const CACHE_STATIC = `ctr-admin-static-${CACHE_VERSION}`;
const CACHE_ASSETS = `ctr-admin-assets-${CACHE_VERSION}`;
const OWNED = new Set([CACHE_STATIC, CACHE_ASSETS]);

const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("ctr-admin-") && !OWNED.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Content-hashed build output — safe to serve from cache indefinitely. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/** Icons and the manifest — refresh in the background, serve instantly. */
function isRevalidatableAsset(url) {
  return (
    url.pathname === "/manifest.webmanifest" ||
    /^\/(icon-|apple-touch-icon)[\w-]*\.png$/.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit || network;
}

/*
 * On localhost we register the worker (so push can be tested end to end) but
 * skip every caching strategy: cache-first on /_next/static/ serves stale
 * chunks after a Turbopack rebuild, which surfaces as "module factory is not
 * available" until the caches are cleared by hand.
 */
const IS_DEV =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("fetch", (event) => {
  if (IS_DEV) return;

  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch the API — these carry session-scoped data and mutations.
  if (url.pathname.startsWith("/api/")) return;

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_ASSETS));
    return;
  }

  if (isRevalidatableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_ASSETS));
    return;
  }

  // Navigations: network only, with a static offline page as the fallback.
  // The response itself is never cached (see PRIVACY BOUNDARY above).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_STATIC);
        return (
          (await cache.match(OFFLINE_URL)) ||
          new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } })
        );
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "CTR Sports", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  // reuse an open window only for same-origin targets; cross-origin (e.g. the
  // public site opened from an admin-subscribed device) gets a new window
  const sameOrigin = url.startsWith("/") || url.startsWith(self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      if (sameOrigin) {
        for (const client of windows) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
