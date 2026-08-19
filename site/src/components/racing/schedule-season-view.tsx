import type { ScheduleGp } from "./data";
import { RaceWeekendCard } from "./race-weekend-card";
import { SeasonSelector } from "./season-selector";

/** Shared season-schedule view used by /schedule and /schedule/[year]. */
export function ScheduleSeasonView({
  year,
  years,
  gps,
  highlightUpNext = false,
}: {
  year: number;
  years: number[];
  gps: ScheduleGp[];
  highlightUpNext?: boolean;
}) {
  const upNextId = highlightUpNext
    ? (gps.find((gp) => gp.status === "live" || gp.status === "scheduled")?.id ?? null)
    : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="border-l-4 border-f1-red pl-3 text-3xl font-black uppercase tracking-tight text-carbon sm:text-4xl">
          {year} Schedule
        </h1>
        <SeasonSelector years={years} selected={year} hrefFor={(y) => `/schedule/${y}`} />
      </div>

      {gps.length === 0 ? (
        <p className="mt-10 text-f1-grey">No race weekends have been announced for this season yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gps.map((gp) => (
            <RaceWeekendCard key={gp.id} gp={gp} year={year} upNext={gp.id === upNextId} />
          ))}
        </div>
      )}
    </main>
  );
}
