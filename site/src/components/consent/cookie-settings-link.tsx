"use client";

import { OPEN_COOKIE_SETTINGS } from "./cookie-consent";

/** Footer entry point back into the preferences dialog, so a choice made
 *  once is never final. Required by the banner copy, which promises it. */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
    >
      Cookie settings
    </button>
  );
}
