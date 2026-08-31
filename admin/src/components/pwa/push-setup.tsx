"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BatteryCharging, BellRing, Check, Download, Share } from "lucide-react";

/**
 * Push readiness gate.
 *
 * Race-day announcements are useless if they do not arrive, and there are three
 * separate ways that silently fails on a phone:
 *
 *   1. iOS refuses Web Push entirely until the app is on the home screen.
 *   2. Notification permission is never asked for, or was denied once.
 *   3. Android kills the browser's background process to reclaim RAM, so the
 *      push is never handled — battery optimisation must be turned off.
 *
 * Only (2) is observable from JavaScript. (1) is inferred from display-mode,
 * and (3) cannot be detected at all — there is no web API for the battery
 * whitelist — so it is an explicit acknowledged step rather than a check.
 *
 * The card stays until the flow is complete: it is not dismissible, because the
 * whole point is that everyone ends up actually reachable.
 */

type Step = "checking" | "unsupported" | "install" | "permission" | "blocked" | "battery" | "ready";

const BATTERY_ACK_KEY = "ctr-push-battery-ack";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);

function readAck() {
  try {
    return window.localStorage.getItem(BATTERY_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

export function PushSetup({ api = "/api/push" }: { api?: string } = {}) {
  const [step, setStep] = useState<Step>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Works out which step the device is currently stuck on. */
  const resolve = useCallback(async () => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      // Desktop Safari and some in-app browsers simply cannot do this.
      setStep("unsupported");
      return;
    }
    // iOS only exposes Web Push to an installed app, so installing comes first.
    if (isIos() && !isStandalone()) {
      setStep("install");
      return;
    }
    if (Notification.permission === "denied") {
      setStep("blocked");
      return;
    }
    if (Notification.permission !== "granted") {
      setStep("permission");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) {
      setStep("permission");
      return;
    }
    // Subscribed — the only thing left is the step we cannot verify.
    setStep(isAndroid() && !readAck() ? "battery" : "ready");
  }, []);

  useEffect(() => {
    resolve().catch(() => setStep("unsupported"));
  }, [resolve]);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStep(permission === "denied" ? "blocked" : "permission");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Notifications are not configured on the server.");

      // An existing subscription is reused; re-subscribing would rotate the
      // endpoint and orphan the row the server already holds.
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const res = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Could not register this device — try again.");

      setStep(isAndroid() && !readAck() ? "battery" : "ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  const ackBattery = () => {
    try {
      window.localStorage.setItem(BATTERY_ACK_KEY, "1");
    } catch {
      // storage blocked — the step simply reappears next load
    }
    setStep("ready");
  };

  // Nothing to show once set up, while checking, or where it cannot work.
  if (step === "checking" || step === "ready" || step === "unsupported") return null;

  const shell =
    "chamfer-tr border border-accent/40 bg-accent/5 p-4 text-fg";

  if (step === "install") {
    return (
      <div className={shell} role="status">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Download size={16} className="text-accent" /> Install to get announcements
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-fg-muted">
          On iPhone, notifications only work once the console is on your home screen. Tap
          <Share size={13} className="inline shrink-0" aria-label="Share" /> then
          <span className="font-bold text-fg">Add to Home Screen</span>, reopen it from the new
          icon, and come back here.
        </p>
      </div>
    );
  }

  if (step === "blocked") {
    return (
      <div className={shell} role="alert">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <AlertTriangle size={16} className="text-accent" /> Notifications are blocked
        </p>
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          This device previously refused notifications, so we cannot ask again from here. Open your
          browser&apos;s site settings for this site, set Notifications to <b>Allow</b>, then
          reload.
        </p>
        <p className="mt-1.5 text-xs text-fg-faint">
          Chrome: tap the ⋮ menu → Settings → Site settings → Notifications.
        </p>
      </div>
    );
  }

  if (step === "battery") {
    return (
      <div className={shell}>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <BatteryCharging size={16} className="text-accent" /> One more step — stop Android
          killing alerts
        </p>
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          Notifications are on. Android may still clear the browser from memory to save battery,
          which stops announcements arriving until you next open the app. Turn battery optimisation
          off for your browser so race-day alerts always get through.
        </p>
        <ol className="mt-3 space-y-1.5">
          {[
            "Open Android Settings → Apps, and pick your browser (Chrome).",
            "Go to Battery, then choose Unrestricted (or 'Don't optimise').",
            "On Samsung, Xiaomi, Oppo, Vivo or OnePlus also allow Autostart / Background activity.",
          ].map((t, i) => (
            <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-fg-muted">
              <span className="grid size-5 shrink-0 place-items-center bg-panel font-numeric text-[10px] font-bold text-fg">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={ackBattery}
          className="chamfer-tr mt-4 inline-flex min-h-11 items-center gap-2 bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
        >
          <Check size={16} /> Done
        </button>
      </div>
    );
  }

  // step === "permission"
  return (
    <div className={shell}>
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <BellRing size={16} className="text-accent" /> Turn on race-day notifications
      </p>
      <p className="mt-2 text-xs leading-relaxed text-fg-muted">
        Announcements from race control are delivered as notifications. Enable them on this device
        so you do not miss a schedule change at the circuit.
      </p>
      <button
        type="button"
        onClick={() => void enable()}
        disabled={busy}
        className="chamfer-tr mt-3 inline-flex min-h-11 items-center gap-2 bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        <BellRing size={16} /> {busy ? "Working…" : "Enable notifications"}
      </button>
      {error ? <p className="mt-2 text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  );
}
