"use client";

import { useEffect, useState } from "react";

type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "off"
  | "on"
  | "busy";

/** Web Push requires the VAPID public key as a Uint8Array over a plain ArrayBuffer. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Enable/disable push notifications for this browser. Works signed-in or not;
 * a signed-in fan's device is linked to their account by /api/push. On iPhone
 * this only appears after the site is installed to the home screen (iOS
 * limitation for web push).
 */
export function NotificationsToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (!cancelled) setState(existing ? "on" : "off");
    })().catch(() => {
      if (!cancelled) setState("unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setState("busy");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push is not configured on this site yet.");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Could not save the subscription — try again.");
      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable notifications.");
      setState("off");
    }
  };

  const disable = async () => {
    setState("busy");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Could not disable notifications — try again.");
      setState("on");
    }
  };

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="body-xs text-text-3">
        This browser doesn&apos;t support push notifications. On iPhone, install the site first:
        Share → Add to Home Screen, then enable notifications from the installed app.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="body-xs text-text-3">
        Notifications are blocked for this site — allow them in your browser&apos;s site settings
        to receive race announcements.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state === "on" ? (
        <button type="button" onClick={() => void disable()} className="btn btn-md btn-stroke">
          Turn off notifications
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={state === "busy"}
          className="btn btn-md btn-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "busy" ? "Working…" : "Enable notifications"}
        </button>
      )}
      {error ? (
        <p role="alert" className="body-xs font-semibold text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
