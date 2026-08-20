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
    <main className="flex min-h-screen flex-col items-center justify-center bg-carbon-fibre px-4 py-16 text-center text-white">
      <Link href="/" className="flex items-center gap-2">
        <span className="chamfer-tr bg-accent px-2.5 py-1 text-lg font-black uppercase italic leading-none text-accent-fg">
          CTR
        </span>
        <span className="text-lg font-black uppercase tracking-wider text-white">Sports</span>
      </Link>

      <h1 className="mt-6 text-[8rem] font-black italic leading-none tracking-tight text-accent sm:text-[12rem]">
        404
      </h1>

      <p className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
        The chequered flag came out early
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
        The page you&apos;re looking for has retired from the race — it may have been moved,
        deleted, or never made it to the grid.
      </p>

      <Link
        href="/"
        className="chamfer-tr mt-8 bg-accent px-6 py-3 text-sm font-black uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
      >
        Back to the home straight
      </Link>
    </main>
  );
}
