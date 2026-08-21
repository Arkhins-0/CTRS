import Link from "next/link";
import { ChevronRight } from "lucide-react";

/* ── Shared homepage band furniture ────────────────────────────────────────
   Every homepage section is a full-width colour band with an `.f1-inner`
   gutter. Headings are uppercase Formula1-Black (24/28 → 32/38 at lg) with an
   optional ghost "View all" link on the right. ───────────────────────────── */

export function BandHeading({
  children,
  viewAllHref,
  viewAllLabel = "View all",
  id,
}: {
  children: React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="display-xl lg:display-2xl font-black uppercase">
        {children}
      </h2>
      {viewAllHref ? (
        <Link href={viewAllHref} className="btn btn-sm btn-ghost shrink-0">
          {viewAllLabel}
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Decorative brand racing-line motif used above the season heading. */
export function RacingLine({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 16"
      preserveAspectRatio="none"
      className={`h-4 w-full text-brand lg:h-6 ${className}`}
    >
      <path
        d="M0 13 C 120 13, 170 3, 300 3 S 480 13, 620 13 S 830 2, 950 3 S 1130 12, 1200 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
