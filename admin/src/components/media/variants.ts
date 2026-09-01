/**
 * Derived-variant key convention for the media library.
 *
 * The media row stores only the ORIGINAL object key, e.g.
 *   media/2026/08/9f1c….webp
 * Every upload also writes three derived renditions whose keys are computed
 * by inserting `_hero` / `_card` / `_thumb` before the extension:
 *   media/2026/08/9f1c…_hero.webp   (1600w)
 *   media/2026/08/9f1c…_card.webp   (800w)
 *   media/2026/08/9f1c…_thumb.webp  (320w)
 *
 * Pure string function — safe to import from both server and client code.
 */

export type MediaVariant = "hero" | "card" | "thumb";

export const MEDIA_VARIANTS: readonly MediaVariant[] = ["hero", "card", "thumb"] as const;

export function variantKey(path: string, variant: MediaVariant): string {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return `${path}_${variant}`;
  return `${path.slice(0, dot)}_${variant}${path.slice(dot)}`;
}

/**
 * A fourth rendition, PNG rather than webp, for exactly one consumer: email.
 * Several mail providers' image proxies (Gmail's chief among them) have a
 * real history of mangling WebP when they re-encode a remote image before
 * display — a sponsor logo showed up visibly corrupted in a real inbox,
 * the same failure class as the CTR mark showing up in a solid black box.
 * PNG support in that pipeline is universal, so this is the one rendition
 * every email template should reference instead of "card". Always a
 * different extension (never just `_email` before the original's own
 * extension), because the source may be .jpg/.webp/etc. and the output is
 * always PNG regardless.
 */
export function emailVariantKey(path: string): string {
  const dot = path.lastIndexOf(".");
  const base = dot === -1 ? path : path.slice(0, dot);
  return `${base}_email.png`;
}
