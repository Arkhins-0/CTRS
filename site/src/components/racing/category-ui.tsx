import Link from "next/link";
import { readableOn } from "./colors";

/* ── Category identity + chips shared across the racing pages ────────────── */

export type CategoryRef = {
  slug: string;
  name: string;
  shortName: string;
  color: string;
};

/** Small outlined badge in the category's colour (shortName). */
export function CategoryBadge({
  category,
  className = "",
}: {
  category: Pick<CategoryRef, "shortName" | "color">;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${className}`}
      style={{ borderColor: category.color, color: category.color }}
    >
      {category.shortName}
    </span>
  );
}

/** Tiny colour dot used beside session labels in timetables. */
export function CategoryDot({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * F1.com-style category tab bar: uppercase tabs on a hairline, the active tab
 * gets white text + accent underline. Server component — hrefFor never
 * crosses a client boundary.
 */
export function CategoryTabBar({
  categories,
  activeSlug,
  hrefFor,
  ariaLabel = "Category",
}: {
  categories: CategoryRef[];
  activeSlug: string | null;
  hrefFor: (slug: string) => string;
  ariaLabel?: string;
}) {
  if (!categories.length) return null;
  return (
    <nav aria-label={ariaLabel} className="flex overflow-x-auto border-b border-line">
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={hrefFor(c.slug)}
            aria-current={active ? "page" : undefined}
            title={c.name}
            className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors sm:px-4 ${
              active
                ? "border-accent text-white"
                : "border-transparent text-fg-faint hover:text-fg-muted"
            }`}
          >
            <CategoryDot color={c.color} className="h-2 w-2" />
            {c.shortName}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Pill row (All + category shortNames in their colours). Active pill is
 * filled with the category colour; "All" fills with the accent.
 */
export function CategoryPills({
  categories,
  activeSlug,
  hrefFor,
  allHref,
  allLabel = "All",
  ariaLabel = "Category filter",
}: {
  categories: CategoryRef[];
  activeSlug: string | null;
  hrefFor: (slug: string) => string;
  allHref?: string;
  allLabel?: string;
  ariaLabel?: string;
}) {
  if (!categories.length) return null;
  const pill =
    "chamfer-tr shrink-0 px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors";
  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1.5"
      style={{ ["--chamfer" as string]: "8px" }}
    >
      {allHref ? (
        <Link
          href={allHref}
          aria-current={activeSlug === null ? "page" : undefined}
          className={`${pill} ${
            activeSlug === null
              ? "bg-accent text-accent-fg"
              : "border border-line bg-surface text-fg-muted hover:border-accent hover:text-white"
          }`}
        >
          {allLabel}
        </Link>
      ) : null}
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={hrefFor(c.slug)}
            aria-current={active ? "page" : undefined}
            title={c.name}
            className={`${pill} border`}
            style={
              active
                ? { backgroundColor: c.color, borderColor: c.color, color: readableOn(c.color) }
                : { borderColor: c.color, color: c.color }
            }
          >
            {c.shortName}
          </Link>
        );
      })}
    </nav>
  );
}

/** Round/GP status chip on the dark theme. */
export function StatusChip({
  status,
  className = "",
}: {
  status: "scheduled" | "live" | "completed" | "cancelled";
  className?: string;
}) {
  const styles: Record<typeof status, string> = {
    scheduled: "border border-line text-fg-muted",
    live: "bg-emerald-600 text-white",
    completed: "bg-accent text-accent-fg",
    cancelled: "border border-line text-fg-faint line-through",
  };
  const labels: Record<typeof status, string> = {
    scheduled: "Scheduled",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={`chamfer-tr inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${styles[status]} ${className}`}
      style={{ ["--chamfer" as string]: "6px" }}
    >
      {labels[status]}
    </span>
  );
}
