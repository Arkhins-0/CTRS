import Link from "next/link";
import { readableOn } from "./colors";

/* ── Category identity + chips shared across the racing pages ────────────── */

export type CategoryRef = {
  slug: string;
  name: string;
  shortName: string;
  color: string;
};

/** Small tag in the category's colour (shortName). */
export function CategoryBadge({
  category,
  className = "",
}: {
  category: Pick<CategoryRef, "shortName" | "color">;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-xs border px-1.5 py-0.5 text-[11px] font-bold uppercase leading-4 ${className}`}
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
 * F1-style underline tab bar: Titillium tabs sitting on a hairline, the
 * active tab gets strong text + a 2px brand underline. Server component —
 * hrefFor never crosses a client boundary.
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
    <nav aria-label={ariaLabel} className="flex overflow-x-auto">
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={hrefFor(c.slug)}
            aria-current={active ? "page" : undefined}
            title={c.name}
            className={`body-m-compact flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 py-2 text-center transition-colors duration-500 md:px-6 ${
              active
                ? "border-b-2 border-brand font-bold text-text-5"
                : "border-b border-surface-4 font-semibold text-text-3 hover:border-surface-6 hover:text-text-5"
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
 * Pill row (All + category shortNames in their colours). Pills are fully
 * round per the design system; the active pill fills with its colour.
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
    "body-xs shrink-0 rounded-full px-4 py-2 font-bold transition-colors";
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      {allHref ? (
        <Link
          href={allHref}
          aria-current={activeSlug === null ? "page" : undefined}
          className={`${pill} ${
            activeSlug === null
              ? "bg-brand text-brand-fg"
              : "text-text-5 shadow-[inset_0_0_0_2px_var(--f1-text-5)] hover:bg-white/10"
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
            className={`${pill} flex items-center gap-2 ${active ? "" : "text-text-5 shadow-[inset_0_0_0_2px_var(--f1-surface-4)] hover:bg-white/10"}`}
            style={
              active
                ? { backgroundColor: c.color, color: readableOn(c.color) }
                : undefined
            }
          >
            {active ? null : <CategoryDot color={c.color} className="h-2 w-2" />}
            {c.shortName}
          </Link>
        );
      })}
    </nav>
  );
}

/** Round/GP status tag on any surface. */
export function StatusChip({
  status,
  className = "",
}: {
  status: "scheduled" | "live" | "completed" | "cancelled";
  className?: string;
}) {
  const styles: Record<typeof status, string> = {
    scheduled: "border border-surface-6 text-text-3",
    live: "bg-live-blue text-white",
    completed: "bg-white/10 text-text-5",
    cancelled: "border border-surface-6 text-text-3 line-through",
  };
  const labels: Record<typeof status, string> = {
    scheduled: "Scheduled",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-1 text-[11px] font-bold uppercase leading-4 ${styles[status]} ${className}`}
    >
      {status === "live" ? (
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {labels[status]}
    </span>
  );
}
