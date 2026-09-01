import type { CSSProperties } from "react";

/* ── Colour helpers for team/category identity on the dark theme ─────────── */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "");
  const v = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw.padEnd(6, "0");
  const n = Number.parseInt(v.slice(0, 6), 16);
  if (Number.isNaN(n)) return { r: 103, g: 103, b: 109 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Mix a hex colour toward black (amount < 0) or white (amount > 0), -1..1. */
export function shadeHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const f = Math.min(1, Math.abs(amount));
  const mix = (c: number) =>
    Math.round(c + (target - c) * f)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

/** Black or white — whichever reads better on the given colour. */
export function readableOn(hex: string): "#0a0a0a" | "#ffffff" {
  const { r, g, b } = hexToRgb(hex);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150 ? "#0a0a0a" : "#ffffff";
}

/** Diagonal team-coloured gradient, darkened enough for white text on top
 *  (driver cards, driver/team heroes). */
export function teamGradient(color: string): CSSProperties {
  return {
    background: `linear-gradient(145deg, ${shadeHex(color, -0.15)} 0%, ${shadeHex(color, -0.55)} 58%, #0c0e11 100%)`,
  };
}

/**
 * True when a WHITE dot screen will not register on this colour.
 *
 * The screen normally takes white ink on a dark ground and black on a light
 * one, which is right almost everywhere. It fails on a colour that is both
 * very dark and almost fully saturated — a pure red like #E10600, whose red
 * channel is already at 88% — because there a white overlay has almost no
 * room to lift brightness and lands in the chroma channels instead. The dot
 * comes out a slightly pinker red of much the same lightness, and the eye
 * resolves chroma detail far more poorly than lightness detail at the size
 * of a single dot, so the texture disappears.
 *
 * (CIE76 hides this — it rates that red dot as a bigger difference than the
 * blue one that is plainly visible. CIEDE2000, which down-weights chroma
 * differences at high chroma, scores it 5.0 against blue's 7.8 and matches
 * what the eye reports. Black ink at the same opacity scores 7.5.)
 *
 * Kept deliberately narrow: only near-black, near-pure hues qualify.
 */
export function whiteScreenFails(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return luma < 80 && saturation > 0.9;
}
