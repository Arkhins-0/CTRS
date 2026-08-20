import type { Metadata } from "next";
import { exo2, jetbrainsMono } from "@ctr/ui/fonts";
import { ThemeStyle } from "@/components/theme-style";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CTR Sports CMS",
    template: "%s | CTR Sports CMS",
  },
  description: "Admin dashboard for the CTR Sports site.",
  robots: { index: false, follow: false },
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
