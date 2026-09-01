import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { Countdown } from "@/components/news/countdown";
import { teamGradient } from "@/components/racing/colors";
import type { DriverStandingRow, ScheduleGp } from "@/components/racing/data";
import { formatDateRange } from "@/components/racing/meta";
import { DriverStandingsTable } from "@/components/racing/standings-tables";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import { RacingLine } from "./band";

/* ── Band 4 · "{year} Season" standings bundle ─────────────────────────────
   Racing-line motif + uppercase season heading, DRIVERS/TEAMS underline tabs
   (plain links into the standings hub), a 2nd-1st-3rd podium of team-coloured
   cards, then the top of the drivers' table with a stroke CTA below it. When
   no standings exist yet the caller swaps in <NextGpPromo/>. ─────────────── */

const ORDINALS = ["th", "st", "nd", "rd"] as const;

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ORDINALS[v % 10] ?? "th";
}

function PodiumCard({
  row,
  headshotPath,
  tall = false,
  orderClass = "",
}: {
  row: DriverStandingRow;
  headshotPath: string | null;
  tall?: boolean;
  orderClass?: string;
}) {
  const color = row.team?.color ?? "#67676d";
  const headshot = mediaUrl(headshotPath);

  return (
    <article
      className={`group relative flex overflow-hidden rounded-md text-white ${orderClass} ${
        tall
          ? "min-h-[220px] md:min-h-[300px] lg:min-h-[324px]"
          : "min-h-[180px] md:min-h-[260px] lg:min-h-[276px]"
      }`}
      style={teamGradient(color)}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: color }}
      />

      {headshot ? (
        <span className="pointer-events-none absolute bottom-0 right-0 aspect-square w-[110px] lg:w-[160px]">
          <Image
            src={headshot}
            alt=""
            fill
            sizes="160px"
            className="object-contain object-bottom"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="technical-l pointer-events-none absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-full font-bold text-white/70 lg:h-20 lg:w-20"
          style={placeholderStyle(row.driver.code)}
        >
          {row.driver.code}
        </span>
      )}

      <div className="relative z-10 flex flex-1 flex-col gap-2 px-4 py-3">
        <p className="flex items-start gap-0.5">
          <span className="technical-2xl font-bold">{row.position}</span>
          <span className="technical-xs mt-[3px] font-bold">
            {ordinalSuffix(row.position)}
          </span>
        </p>

        <Link
          href={`/drivers/${row.driver.slug}`}
          className="flex max-w-[60%] flex-col after:absolute after:inset-0 group-hover:underline"
        >
          <span className="display-l font-normal">{row.driver.firstName}</span>
          <span className="display-l font-medium uppercase">{row.driver.lastName}</span>
        </Link>

        {row.team ? (
          <span className="display-s max-w-[60%] font-normal text-static-3">
            {row.team.shortName}
          </span>
        ) : null}

        {row.driver.countryCode ? (
          <CountryFlag
            code={row.driver.countryCode}
            className="hidden text-lg leading-none md:block"
          />
        ) : null}

        <span className="flex-1" aria-hidden />

        <p className="flex items-baseline gap-1">
          <span className="technical-xl font-bold">{row.points}</span>
          <span className="technical-xs font-bold">PTS</span>
        </p>
      </div>
    </article>
  );
}

export function SeasonStandingsBand({
  year,
  categoryName,
  rows,
  headshotBySlug,
  note,
}: {
  year: number;
  categoryName: string;
  rows: DriverStandingRow[];
  headshotBySlug: Record<string, string | null>;
  note?: string | null;
}) {
  if (!rows.length) return null;

  const podium = rows.slice(0, 3);
  const tabs = [
    { label: "Drivers", href: `/standings/${year}/drivers`, active: true },
    { label: "Teams", href: `/standings/${year}/constructors`, active: false },
  ];

  return (
    <section className="bg-surface-1 text-text-5">
      <div className="f1-inner flex flex-col gap-6 py-6 md:py-8 lg:gap-8">
        <div className="flex flex-col gap-4 lg:gap-6">
          <RacingLine />
          {/* The one "poster" moment on the page: impact face, italic
              slant — see globals.css --font-impact for why it's scoped
              to this fixed heading and nowhere near article titles. */}
          <h2
            className="display-2xl lg:display-3xl italic uppercase"
            style={{ fontFamily: "var(--font-impact)", fontWeight: 900 }}
          >
            {year} Season
          </h2>
          <p className="body-xs text-text-3">
            {categoryName}
            {note ? ` · ${note}` : ""}
          </p>
        </div>

        <div className="border-b-2 border-surface-4">
          <nav aria-label="Standings" className="-mb-[2px] flex">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={`body-m-compact block max-w-[220px] flex-1 border-b-2 px-4 py-2 text-center uppercase transition-colors duration-500 md:px-6 ${
                  t.active
                    ? "border-brand font-bold text-text-5"
                    : "border-transparent font-semibold text-text-3 hover:border-surface-6 hover:text-text-5"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Podium — 2nd · 1st · 3rd, the leader tallest */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          {podium[1] ? (
            <PodiumCard
              row={podium[1]}
              headshotPath={headshotBySlug[podium[1].driver.slug] ?? null}
              orderClass="md:order-1 max-md:ml-6"
            />
          ) : null}
          {podium[0] ? (
            <PodiumCard
              row={podium[0]}
              headshotPath={headshotBySlug[podium[0].driver.slug] ?? null}
              tall
              orderClass="md:order-2"
            />
          ) : null}
          {podium[2] ? (
            <PodiumCard
              row={podium[2]}
              headshotPath={headshotBySlug[podium[2].driver.slug] ?? null}
              orderClass="md:order-3 max-md:ml-12"
            />
          ) : null}
        </div>

        <DriverStandingsTable rows={rows.slice(0, 5)} />

        <div className="flex justify-center">
          <Link href={`/standings/${year}/drivers`} className="btn btn-sm btn-stroke">
            View full standings
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Fallback band · next race weekend ─────────────────────────────────────
   Shown in place of the standings bundle before the first round is scored. ── */

export function NextGpPromo({ year, gp }: { year: number; gp: ScheduleGp }) {
  const countdownIso = gp.firstRaceStartsAt;
  const dates = formatDateRange(gp.startDate, gp.endDate);

  return (
    <section className="dark-section bg-surface-3">
      <div className="f1-inner flex flex-col gap-8 py-8 lg:flex-row lg:items-end lg:justify-between lg:py-12">
        <div>
          <span className="body-2xs inline-flex rounded-sm bg-brand px-2 py-1 font-bold uppercase leading-4 text-brand-fg">
            Up next · Round {gp.round}
          </span>
          <h2 className="display-2xl lg:display-3xl mt-3 font-black uppercase">{gp.name}</h2>
          <p className="body-s mt-2 flex flex-wrap items-center gap-2 font-semibold text-text-3">
            <CountryFlag code={gp.circuit.countryCode} className="text-lg leading-none" />
            <span>
              {gp.circuit.name}
              {gp.circuit.locality ? ` · ${gp.circuit.locality}` : ""}, {gp.circuit.country}
            </span>
          </p>
          {dates ? (
            <p className="display-s mt-1 font-normal uppercase text-text-3">{dates}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-6 lg:items-end">
          {countdownIso ? <Countdown targetIso={countdownIso} /> : null}
          <div className="flex flex-wrap gap-3">
            <Link href={`/schedule/${year}/${gp.slug}`} className="btn btn-sm btn-white">
              Race weekend info
            </Link>
            <Link href={`/schedule/${year}`} className="btn btn-sm btn-stroke">
              Full schedule
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
