/* CTR Sports service worker — Web Push display + click-through. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
