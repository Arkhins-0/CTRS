import type { Metadata } from "next";
import { exo2, jetbrainsMono } from "@ctr/ui/fonts";
import { ThemeStyle } from "@/components/theme-style";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "CTR Sports — Formula Racing",
    template: "%s | CTR Sports",
  },
  description:
    "The home of Formula Racing — latest news, race schedule, results, standings, drivers and teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${exo2.variable} ${jetbrainsMono.variable}`}>
      <head>
        <ThemeStyle />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
