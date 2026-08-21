import { Exo_2, JetBrains_Mono, Titillium_Web } from "next/font/google";

/** F1.com's secondary/body face — pairs with the self-hosted Formula1 display
 *  family declared in the site's globals.css (@font-face → /fonts/formula1). */
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
