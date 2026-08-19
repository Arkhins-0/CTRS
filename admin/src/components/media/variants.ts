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
