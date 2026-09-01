/**
 * Cookie consent — public site only. The admin console and the member area
 * live in the other app and never show this: both are behind a sign-in, use
 * one strictly-necessary session cookie, and embed nothing third-party.
 *
 * The choice is stored in a first-party cookie rather than localStorage so
 * the SERVER can read it while rendering. That matters: the only
 * consentable thing on this site is third-party embedded media (YouTube),
 * and a server that knows the answer can withhold the embed entirely
 * instead of painting a placeholder over a request the browser already
 * made. A localStorage-only banner would be decoration.
 *
 * Categories are deliberately limited to what the site actually does. There
 * is no analytics, advertising or tracking here today (verified: no gtag,
 * no Vercel Analytics, no pixel, no third-party script of any kind), so no
 * toggle claims otherwise. Adding one later means adding it to CATEGORIES
 * and gating the code that needs it.
 */

export const CONSENT_COOKIE = "ctr_cookie_consent";
export const CONSENT_VERSION = 1;
/** Consent is a decision, not a session — a year is the usual ceiling. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

/** Optional categories. "essential" is not listed: it is never a choice. */
export type ConsentCategory = "media";

export type Consent = {
  v: number;
  /** Third-party embedded media — YouTube players and their thumbnails. */
  media: boolean;
};

export const CATEGORIES: {
  key: ConsentCategory;
  title: string;
  description: string;
}[] = [
  {
    key: "media",
    title: "Embedded media",
    description:
      "Lets YouTube load video players and their preview images. YouTube can then see your IP address and set its own storage on your device. With this off, videos are replaced by a button that loads the player only when you ask for it.",
  },
];

export const DENY_ALL: Consent = { v: CONSENT_VERSION, media: false };
export const ALLOW_ALL: Consent = { v: CONSENT_VERSION, media: true };

/** Parses a cookie value; null when absent, unreadable, or from an older
 *  version (a new category means the old answer no longer covers it). */
export function parseConsent(raw: string | undefined | null): Consent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Consent>;
    if (parsed?.v !== CONSENT_VERSION) return null;
    return { v: CONSENT_VERSION, media: parsed.media === true };
  } catch {
    return null;
  }
}

export function serializeConsent(consent: Consent): string {
  return encodeURIComponent(JSON.stringify(consent));
}
