import { Caveat, Exo_2, JetBrains_Mono, Rajdhani, Titillium_Web } from "next/font/google";

/*
 * Every face here is SIL Open Font License and self-hosted by next/font at
 * build time (no runtime request to Google, so no third-party font CDN in
 * the page either).
 *
 * The site used to load Formula1, Formula1Wide and KH Interference F1 from
 * /public/fonts. Those are Formula One Licensing BV's corporate typefaces —
 * not licensed for third-party use, and committing them to the repo
 * redistributed them on top of that. Northwell is a commercial retail font
 * from Set Sail Studios, which needs a purchased webfont licence. All four
 * are gone; the replacements below fill the same roles.
 */

/** Body face. Open Font License, unchanged. */
export const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-titillium",
  display: "swap",
});

export const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-exo2",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains",
  display: "swap",
});

/**
 * Display face, replacing Formula1. Squarish and technical in the same way,
 * built for the short uppercase headings this site is full of, and drawn by
 * the Indian Type Foundry — which suits an Indian national championship far
 * better than borrowing another series' corporate type ever did.
 */
export const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

/** Script accent for driver first names, replacing Northwell. */
export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});
