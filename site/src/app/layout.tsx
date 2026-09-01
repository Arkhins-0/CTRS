import type { Metadata } from "next";
import { bungee, caveat, exo2, jetbrainsMono, rajdhani, titillium } from "@ctr/ui/fonts";
import { PwaRegister } from "@/components/push/pwa-register";
import { ThemeStyle } from "@/components/theme-style";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3001"),
  /*
   * The championship's full name is the site's identity, so it carries the
   * homepage title outright. It does NOT go in the template: at 58
   * characters it would push every page's actual name past the ~60 Google
   * truncates at and out of a browser tab's visible width, so inner pages
   * get the short mark instead. Same reasoning for appleWebApp.title and
   * the manifest's short_name — those label a home-screen icon, where
   * anything past ~12 characters is cut.
   */
  title: {
    default: "CTR–JK Tyre FMSCI Indian National Car Racing Championship",
    template: "%s | CTR",
  },
  description:
    "The home of the CTR–JK Tyre FMSCI Indian National Car Racing Championship — latest news, race schedule, results, standings, drivers and teams.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CTR" },
};

/* Browser/OS chrome colour — matches the site's black header bar (the pages
   themselves are white, but the strip this paints sits against the header). */
/*
 * viewportFit "cover" lets the page paint into the notch / status-bar area,
 * which is what makes env(safe-area-inset-*) report real values. Without it
 * those are always 0, and on a device that draws system bars over the app
 * (iOS with a translucent status bar, Android 15's edge-to-edge) the header
 * ends up underneath them with no way to detect it. globals.css then insets
 * the page and the sticky header by those values.
 */
export const viewport = { themeColor: "#080808", viewportFit: "cover" as const };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${titillium.variable} ${rajdhani.variable} ${jetbrainsMono.variable} ${caveat.variable} ${exo2.variable} ${bungee.variable}`}
    >
      <head>
        <ThemeStyle />
      </head>
      <body className="min-h-screen antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
