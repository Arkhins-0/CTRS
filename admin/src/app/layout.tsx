import type { Metadata, Viewport } from "next";
import { jetbrainsMono, rajdhani, titillium } from "@ctr/ui/fonts";
import { ThemeStyle } from "@/components/theme-style";
import { ServiceWorkerProvider } from "@/components/pwa/service-worker-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CTR Sports Admin",
    template: "%s | CTR Sports Admin",
  },
  description: "Race operations and content management for CTR Sports.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CTR Admin",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
  // viewport-fit=cover lets the shell paint into the iOS safe areas, which the
  // .safe-* utilities in globals.css then pad back out.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titillium.variable} ${rajdhani.variable} ${jetbrainsMono.variable}`}>
      <head>
        <ThemeStyle />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerProvider />
      </body>
    </html>
  );
}
