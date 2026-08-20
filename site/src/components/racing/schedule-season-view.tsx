import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import type { ScheduleGp } from "./data";
import { formatDateRange } from "./meta";
import { RoundCard } from "./race-weekend-card";
import { SeasonSelector } from "./season-selector";

/** Compact photo card used in the Previous / Upcoming slots of the top strip. */
function StripCard({ gp, year, tag }: { gp: ScheduleGp; year: number; tag: string }) {
  const photo = mediaUrl(gp.circuit.photoPath ?? gp.circuit.mapPath);
  const city = gp.circuit.locality ?? gp.circuit.name;
  const dates = formatDateRange(gp.startDate, gp.endDate);

  return (
    <Link href={`/schedule/${year}/${gp.slug}`} className="group block h-full">
      <article className="chamfer-tr relative flex h-full min-h-36 flex-col justify-end overflow-hidden border border-line bg-surface transition-all duration-150 group-hover:-translate-y-1 group-hover:border-accent">
        {photo ? (
          <Image
            src={photo}
            alt={gp.circuit.name}
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className="object-cover opacity-50 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div aria-hidden className="absolute inset-0" style={placeholderStyle(gp.circuit.name)} />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-page/90 via-page/40 to-transparent"
        />
        <div className="relative p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fg-faint">
            {tag} · Round {gp.round}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-lg font-black uppercase tracking-tight text-white group-hover:text-accent">
            {city}
            <CountryFlag code={gp.circuit.countryCode} className="text-sm" />
          </p>
          {dates ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">{dates}</p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

/** Shared season-calendar view used by /schedule and /schedule/[year]. */
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
  const nextIdx = highlightUpNext
    ? gps.findIndex((gp) => gp.status === "live" || gp.status === "scheduled")
    : -1;
  const next = nextIdx >= 0 ? gps[nextIdx] : null;
  const previous = next
    ? ([...gps.slice(0, nextIdx)].reverse().find((gp) => gp.status === "completed") ?? null)
    : null;
  const upcoming = next
    ? gps.slice(nextIdx + 1).filter((gp) => gp.status === "scheduled").slice(0, previous ? 1 : 2)
    : [];

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Previous / Next / Upcoming strip */}
        {next ? (
          <section aria-label="Next race" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {previous ? <StripCard gp={previous} year={year} tag="Previous" /> : null}
            <div className="sm:col-span-2">
              <RoundCard gp={next} year={year} next />
            </div>
            {upcoming.map((gp) => (
              <StripCard key={gp.id} gp={gp} year={year} tag="Upcoming" />
            ))}
          </section>
        ) : null}

        {/* Title + season selector */}
        <div className={`flex flex-wrap items-end justify-between gap-4 ${next ? "mt-12" : ""}`}>
          <h1 className="max-w-4xl border-l-4 border-accent pl-3 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
            {year} CTR–JK Tyre FMSCI Indian National Car Racing Championship
            <span className="text-accent"> · Race Calendar</span>
          </h1>
          <SeasonSelector years={years} selected={year} hrefFor={(y) => `/schedule/${y}`} />
        </div>

        {/* Round grid */}
        {gps.length === 0 ? (
          <p className="mt-10 text-fg-muted">
            No race weekends have been announced for this season yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gps.map((gp) => (
              <RoundCard key={gp.id} gp={gp} year={year} next={gp.id === next?.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
