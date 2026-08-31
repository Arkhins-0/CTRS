"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ctr-admin-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates the display-mode media query for installed apps.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Invites the admin to install the console to their home screen.
 *
 * Chromium fires `beforeinstallprompt`, which we defer and replay on click.
 * iOS Safari never fires it and has no programmatic install, so there we show
 * the manual Share -> Add to Home Screen instruction instead.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we read storage

  useEffect(() => {
    if (isStandalone()) return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(DISMISS_KEY);
    } catch {
      // private mode / blocked storage — treat as "not dismissed"
    }
    if (stored === "1") return;

    setDismissed(false);
    if (isIos()) setShowIosHint(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setDeferred(null);
      setShowIosHint(false);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // nothing to persist to — the banner simply returns next load
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") dismiss();
  };

  if (dismissed || (!deferred && !showIosHint)) return null;

  return (
    <div className="chamfer-tr relative border border-line bg-panel p-4 pr-11 text-fg">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-2 top-2 grid size-9 place-items-center text-fg-faint transition-colors hover:text-fg"
      >
        <X size={16} />
      </button>

      <p className="text-sm font-bold uppercase tracking-wide">Install the console</p>

      {deferred ? (
        <>
          <p className="mt-1 text-xs text-fg-muted">
            Add CTR Admin to your home screen for full-screen access and instant announcements.
          </p>
          <button
            type="button"
            onClick={() => void install()}
            className="chamfer-tr mt-3 inline-flex min-h-11 items-center gap-2 bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
          >
            <Download size={16} /> Install
          </button>
        </>
      ) : (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-fg-muted">
          Tap <Share size={14} className="inline shrink-0" aria-label="the Share button" /> then
          <span className="font-bold text-fg">Add to Home Screen</span> to install this console.
        </p>
      )}
    </div>
  );
}
