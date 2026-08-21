import Link from "next/link";
import { ChevronDown } from "lucide-react";

/* ── Shared results/standings hub scaffolding (F1 results-hub skeleton) ────
   White top strip: season dropdown + Races/Drivers/Teams underline tabs.
   Beige band below: uppercase H1, optional filter row, page content.
   Used by /results/[year] and /standings/[year]/… so the hub reads as one
   surface across all three tabs. Server-only (no client boundary). ───────── */

export type HubTab = "races" | "drivers" | "teams";

const TABS: { key: HubTab; label: string; href: (year: number) => string }[] = [
  { key: "races", label: "Races", href: (y) => `/results/${y}` },
  { key: "drivers", label: "Drivers", href: (y) => `/standings/${y}/drivers` },
  { key: "teams", label: "Teams", href: (y) => `/standings/${y}/constructors` },
];

/** Native-details season dropdown styled as a ghost pill + bordered menu. */
export function SeasonDropdown({
  year,
  years,
  hrefFor,
}: {
  year: number;
  years: number[];
  hrefFor: (year: number) => string;
}) {
  return (
    <details className="relative">
      <summary className="btn btn-sm btn-ghost cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        {year}
        <ChevronDown size={16} aria-hidden />
      </summary>
      <div className="absolute left-0 z-30 mt-3 max-h-80 min-w-32 overflow-y-auto rounded-md border-2 border-text-5 bg-surface-1 p-1">
        {years.map((y) => (
          <Link
            key={y}
            href={hrefFor(y)}
            className="body-xs m-1 flex items-center gap-2 rounded-md p-2 font-bold text-text-5 hover:bg-black/10"
          >
            {y}
            {y === year ? (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            ) : null}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function ResultsHub({
  year,
  years,
  active,
  title,
  filters,
  note,
  children,
}: {
  year: number;
  years: number[];
  active: HubTab;
  title: string;
  /** Optional pill-dropdown/filter row rendered under the H1. */
  filters?: React.ReactNode;
  /** Small "After Round N" style caption under the title. */
  note?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-3 pb-16">
      {/* White top strip: season selector + hub tabs on a shared hairline */}
      <div className="bg-surface-1">
        <div className="f1-inner flex flex-wrap items-end justify-between gap-x-6">
          <div className="py-2">
            <SeasonDropdown
              year={year}
              years={years}
              hrefFor={(y) => TABS.find((t) => t.key === active)!.href(y)}
            />
          </div>
          <nav aria-label="Results section" className="-mb-px flex overflow-x-auto">
            {TABS.map((t) => {
              const isActive = t.key === active;
              return (
                <Link
                  key={t.key}
                  href={t.href(year)}
                  aria-current={isActive ? "page" : undefined}
                  className={`body-m-compact block whitespace-nowrap px-4 py-2 text-center transition-colors duration-500 md:px-6 ${
                    isActive
                      ? "border-b-2 border-brand font-bold text-text-5"
                      : "border-b border-surface-4 font-semibold text-text-3 hover:border-surface-6 hover:text-text-5"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="f1-inner pt-8">
        {filters ? <div className="mb-6 flex flex-wrap items-center gap-3">{filters}</div> : null}
        <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">
          {title}
        </h1>
        {note ? <p className="body-xs mt-2 text-text-3">{note}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
