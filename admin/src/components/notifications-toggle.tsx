"use client";

import { useEffect, useState } from "react";

type PushState = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Enable announcement push notifications on this device.
 *
 * `api` selects which subscription store the device is registered against —
 * /api/push for CMS staff, /api/member-push for the member area. Both accept
 * the same body; only the session they authenticate differs.
 */
export function NotificationsToggle({ api = "/api/push" }: { api?: string } = {}) {
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
      if (!publicKey) throw new Error("VAPID keys are not configured.");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch(api, {
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
        await fetch(api, {
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

  const btn =
    "chamfer-tr min-h-11 border border-line bg-surface px-3 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint disabled:cursor-not-allowed disabled:opacity-50";

  if (state === "loading") return null;
  if (state === "unsupported") {
    return <p className="text-xs text-fg-muted">This browser doesn&apos;t support push notifications.</p>;
  }
  if (state === "denied") {
    return (
      <p className="text-xs text-fg-muted">
        Notifications are blocked for this site — allow them in the browser&apos;s site settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Enabled on this device
          </span>
          <button type="button" onClick={() => void disable()} className={btn}>
            Turn off
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={state === "busy"}
          className="chamfer-tr inline-flex min-h-11 items-center justify-center bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "busy" ? "Working…" : "Enable on this device"}
        </button>
      )}
      {error ? <p className="text-xs font-bold text-f1-red">{error}</p> : null}
    </div>
  );
}
