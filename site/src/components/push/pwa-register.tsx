"use client";

import { useEffect } from "react";

/** Registers the service worker site-wide so the app is installable and can
 *  receive push messages. Renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
