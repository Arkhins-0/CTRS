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
