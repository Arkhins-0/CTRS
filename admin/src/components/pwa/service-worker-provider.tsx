"use client";

import { useEffect } from "react";

/**
 * Registers the admin service worker once per load.
 *
 * The worker itself no-ops its caching strategies on localhost (see sw.js), so
 * this registers in every environment — push can be exercised in dev without
 * serving stale build chunks. Registration is idempotent: calling register()
 * with the same URL returns the existing registration.
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[sw] registration failed", err);
      });
    };

    // Wait for load so the worker never competes with the first paint.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
