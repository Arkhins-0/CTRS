import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Global 404 — renders inside the root layout only (no site header/footer),
 * so it carries its own standalone full-screen design.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-3 px-6 py-16 text-center">
      <Link href="/" aria-label="CTR Sports home" className="flex items-center gap-1.5">
        <span className="rounded-sm bg-brand px-1.5 py-0.5 font-display text-base font-black italic leading-5 text-brand-fg">
          CTR
        </span>
        <span className="font-display text-base font-medium uppercase leading-5 tracking-wide text-text-5">
          Sports
        </span>
      </Link>

      <h1 className="display-4xl lg:display-5xl mt-8 font-black text-brand">404</h1>

      <p className="display-l lg:display-xl mt-2 font-black uppercase text-text-5">
        The chequered flag came out early
      </p>
      <p className="body-m mt-3 max-w-[680px] text-text-3">
        The page you&apos;re looking for has retired from the race — it may have been moved,
        deleted, or never made it to the grid.
      </p>

      <Link href="/" className="btn btn-md btn-brand mt-8">
        Back to the home straight
      </Link>
    </main>
  );
}
