import Link from "next/link";
import type { ReactNode } from "react";
import { SeasonSelector } from "./season-selector";

const TABS = [
  { key: "drivers", label: "Drivers" },
  { key: "constructors", label: "Constructors" },
] as const;

export type StandingsTab = (typeof TABS)[number]["key"];

/** Shared frame for the standings pages: heading, drivers/constructors
 *  toggle, season selector and the "after round N" note. */
export function StandingsShell({
  year,
  years,
  active,
  computedThroughRound,
  children,
}: {
  year: number;
  years: number[];
  active: StandingsTab;
  computedThroughRound: number;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="border-l-4 border-f1-red pl-3 text-3xl font-black uppercase tracking-tight text-carbon sm:text-4xl">
          {year} Standings
        </h1>
        <SeasonSelector years={years} selected={year} hrefFor={(y) => `/standings/${y}/${active}`} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Championship" className="flex gap-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/standings/${year}/${tab.key}`}
              aria-current={tab.key === active ? "page" : undefined}
              style={{ ["--chamfer" as string]: "8px" }}
              className={`chamfer-tr px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                tab.key === active
                  ? "bg-carbon text-white"
                  : "border border-warm-grey bg-white text-f1-grey hover:border-f1-red hover:text-carbon"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {computedThroughRound > 0 ? (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-f1-grey">
            After Round {computedThroughRound}
          </p>
        ) : null}
      </div>

      <div className="mt-4">{children}</div>
    </main>
  );
}
