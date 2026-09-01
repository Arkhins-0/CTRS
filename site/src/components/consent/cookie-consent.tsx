"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ALLOW_ALL,
  CATEGORIES,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  DENY_ALL,
  serializeConsent,
  type Consent,
  type ConsentCategory,
} from "@/lib/consent";

/** Lets the footer reopen the dialog after a choice has been made. */
export const OPEN_COOKIE_SETTINGS = "ctr:open-cookie-settings";

/** Writes the choice as a first-party cookie. Client-only (touches document). */
export function writeConsent(consent: Consent) {
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(consent)}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax${
    window.location.protocol === "https:" ? "; secure" : ""
  }`;
}

/**
 * Consent banner + preferences dialog.
 *
 * The banner shows only when the server found no valid choice, so it never
 * flashes for someone who has already answered — `initial` comes from the
 * cookie read during server render. Saving writes the cookie and reloads:
 * the embed gating happens on the server, so the new answer has to reach it
 * to take effect, and a reload is honest about that rather than leaving the
 * page half-consented.
 */
export function CookieConsent({ initial }: { initial: Consent | null }) {
  const [managing, setManaging] = useState(false);
  // Not state: it only changes via save(), which reloads the page anyway.
  const showBanner = initial === null;
  const [choices, setChoices] = useState<Record<ConsentCategory, boolean>>({
    media: initial?.media ?? false,
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const open = () => setManaging(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open);
  }, []);

  const save = (consent: Consent) => {
    writeConsent(consent);
    window.location.reload();
  };

  // Escape closes the dialog; focus moves into it when it opens.
  useEffect(() => {
    if (!managing) return;
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setManaging(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [managing]);

  if (managing) {
    return (
      <div
        className="fixed inset-0 z-100 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) setManaging(false);
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-manage-title"
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-md bg-surface-1 p-6 sm:rounded-md md:p-8"
        >
          <h2 id="cookie-manage-title" className="display-l font-black uppercase text-text-5">
            Cookie settings
          </h2>
          <p className="body-xs mt-2 text-text-3">
            Choose what this site may load. You can change this any time from the footer.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {/* Always-on row — shown so the list is the whole truth, not just
                the parts that happen to be optional. */}
            <div className="rounded-md bg-surface-3 p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="body-s font-bold text-text-5">Strictly necessary</p>
                <span className="body-2xs shrink-0 rounded-xs bg-surface-4 px-2 py-1 font-bold uppercase text-text-3">
                  Always on
                </span>
              </div>
              <p className="body-xs mt-1.5 text-text-3">
                Keeps you signed in to the fan zone and remembers this cookie choice. The site
                cannot work without these, so they cannot be turned off.
              </p>
            </div>

            {CATEGORIES.map((c, i) => (
              <label
                key={c.key}
                htmlFor={`consent-${c.key}`}
                className="cursor-pointer rounded-md bg-surface-3 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="body-s font-bold text-text-5">{c.title}</p>
                  <input
                    id={`consent-${c.key}`}
                    ref={i === 0 ? firstFieldRef : undefined}
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-brand"
                    checked={choices[c.key]}
                    onChange={(e) =>
                      setChoices((prev) => ({ ...prev, [c.key]: e.target.checked }))
                    }
                  />
                </div>
                <p className="body-xs mt-1.5 text-text-3">{c.description}</p>
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-md btn-brand"
              onClick={() => save({ v: CONSENT_VERSION, ...choices })}
            >
              Save choices
            </button>
            <button
              type="button"
              className="btn btn-md btn-stroke"
              onClick={() => save(ALLOW_ALL)}
            >
              Accept all
            </button>
            <button
              type="button"
              className="btn btn-md btn-stroke"
              onClick={() => setManaging(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already answered: nothing on screen, just the listener for the footer link.
  if (!showBanner) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-100 border-t border-surface-4 bg-surface-1 p-4 md:p-6"
    >
      <div className="f1-inner flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="body-s font-bold text-text-5">We use cookies</p>
          <p className="body-xs mt-1 max-w-2xl text-text-3">
            Some are needed to keep you signed in. Beyond those, we only ask about embedded
            YouTube videos — there is no advertising or tracking on this site. See our{" "}
            <Link href="/privacy-policy" className="font-bold text-text-5 underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
          <button
            type="button"
            className="btn btn-md btn-brand"
            onClick={() => save(ALLOW_ALL)}
          >
            Accept cookies
          </button>
          <button
            type="button"
            className="btn btn-md btn-stroke"
            onClick={() => setManaging(true)}
          >
            Manage cookies
          </button>
          <button
            type="button"
            className="btn btn-md btn-stroke"
            onClick={() => save(DENY_ALL)}
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
