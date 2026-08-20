import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryTabBar, type CategoryRef } from "./category-ui";
import { SeasonSelector } from "./season-selector";

const TABS = [
  { key: "drivers", label: "Drivers" },
  { key: "constructors", label: "Constructors" },
] as const;

export type StandingsTab = (typeof TABS)[number]["key"];

/**
 * Dark frame for the per-category standings pages: heading, category tab bar,
 * drivers/constructors toggle, season selector and the pre-season note.
 */
export function StandingsShell({
  year,
  years,
  active,
  categories,
  activeCategorySlug,
  note,
  children,
}: {
  year: number;
  years: number[];
  active: StandingsTab;
  categories: CategoryRef[];
  activeCategorySlug: string;
  note?: string | null;
  children: ReactNode;
}) {
  const withCategory = (base: string) => `${base}?category=${activeCategorySlug}`;
  const activeCategory = categories.find((c) => c.slug === activeCategorySlug) ?? null;

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {year} Standings
          </h1>
          <SeasonSelector
            years={years}
            selected={year}
            hrefFor={(y) => withCategory(`/standings/${y}/${active}`)}
          />
        </div>

        {/* Drivers / Constructors toggle */}
        <nav aria-label="Championship" className="mt-6 flex gap-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={withCategory(`/standings/${year}/${tab.key}`)}
              aria-current={tab.key === active ? "page" : undefined}
              style={{ ["--chamfer" as string]: "8px" }}
              className={`chamfer-tr px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                tab.key === active
                  ? "bg-accent text-accent-fg"
                  : "border border-line bg-surface text-fg-muted hover:border-accent hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Category tabs */}
        <div className="mt-5">
          <CategoryTabBar
            categories={categories}
            activeSlug={activeCategorySlug}
            hrefFor={(slug) => `/standings/${year}/${active}?category=${slug}`}
          />
        </div>

        {activeCategory ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-fg-muted">
            <span
              aria-hidden
              className="inline-block h-4 w-1 rounded-sm"
              style={{ backgroundColor: activeCategory.color }}
            />
            {activeCategory.name}
          </p>
        ) : null}

        {note ? <p className="mt-2 text-xs font-semibold text-fg-faint">{note}</p> : null}

        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
