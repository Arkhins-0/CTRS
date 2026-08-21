import type { ScheduleGp } from "./data";
import { RoundCard } from "./race-weekend-card";
import { SeasonDropdown } from "./results-hub";

/* ── Season calendar (F1 schedule page) ────────────────────────────────────
   White header band (season dropdown + uppercase H1) over a warm band that
   holds one flat, chronological card grid: 1 → 2 (md) → 3 (lg) columns.
   Shared by /schedule and /schedule/[year]. Server-only. ─────────────────── */

export function ScheduleSeasonView({
  year,
  years,
  gps,
  highlightUpNext = false,
}: {
  year: number;
  years: number[];
  gps: ScheduleGp[];
  /** Fills the next scheduled/live round with the blue "up next" card. */
  highlightUpNext?: boolean;
}) {
  const next = highlightUpNext
    ? (gps.find((gp) => gp.status === "live" || gp.status === "scheduled") ?? null)
    : null;

  return (
    <div className="bg-surface-3 pb-12 lg:pb-16">
      {/* Band 1 — white: season selector + page title */}
      <div className="bg-surface-1">
        <div className="f1-inner flex flex-col gap-6 py-8 lg:gap-8 lg:py-12">
          <div className="-ml-4">
            <SeasonDropdown year={year} years={years} hrefFor={(y) => `/schedule/${y}`} />
          </div>
          <h1 className="display-2xl lg:display-3xl font-black uppercase text-text-5">
            {year} Race Calendar
          </h1>
        </div>
      </div>

      {/* Band 2 — warm: the round grid */}
      <div className="f1-inner pt-8 lg:pt-12">
        {gps.length === 0 ? (
          <div className="rounded-md bg-surface-1 px-6 py-8 md:px-8">
            <p className="body-s text-text-3">
              No race weekends have been announced for this season yet.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
            {gps.map((gp) => (
              <li key={gp.id} className="h-full">
                <RoundCard gp={gp} year={year} next={gp.id === next?.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
