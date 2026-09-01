import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { Countdown } from "@/components/news/countdown";
import { readableOn, shadeHex } from "@/components/racing/colors";
import type {
  ConstructorStandingRow,
  DriverStandingRow,
  ScheduleGp,
} from "@/components/racing/data";
import { formatDateRange } from "@/components/racing/meta";
import { HalftoneWash } from "@/components/racing/profile-ui";
import {
  ConstructorStandingsTable,
  DriverStandingsTable,
} from "@/components/racing/standings-tables";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import { RacingLine } from "./band";
import { StandingsTabs } from "./standings-tabs";

/* ── Band 4 · "{year} Season" standings bundle ─────────────────────────────
   Racing-line motif + uppercase season heading, then DRIVERS/TEAMS tabs that
   switch IN PLACE (client state, no navigation — the F1.com behaviour): each
   tab is a 2nd-1st-3rd podium of flat team-coloured cards with a halftone
   texture, the top of its standings table, and a stroke CTA into the full
   standings hub. When no standings exist yet the caller swaps in
   <NextGpPromo/>. ───────────────────────────────────────────────────────── */

const ORDINALS = ["th", "st", "nd", "rd"] as const;

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ORDINALS[v % 10] ?? "th";
}

/** Card heights shared by the driver and team podium cards (1st is tall). */
function podiumHeight(tall: boolean): string {
  return tall
    ? "min-h-[220px] md:min-h-[300px] lg:min-h-[324px]"
    : "min-h-[180px] md:min-h-[260px] lg:min-h-[276px]";
}

function PodiumPosition({ position }: { position: number }) {
  return (
    <p className="flex items-start gap-0.5">
      <span className="technical-2xl font-bold">{position}</span>
      <span className="technical-xs mt-[3px] font-bold">{ordinalSuffix(position)}</span>
    </p>
  );
}

function PodiumCard({
  row,
  tall = false,
  orderClass = "",
}: {
  row: DriverStandingRow;
  tall?: boolean;
  orderClass?: string;
}) {
  const color = row.team?.color ?? "#67676d";
  const fg = readableOn(color);
  const headshot = mediaUrl(row.driver.headshotPath);

  return (
    <article
      className={`group relative flex overflow-hidden rounded-md ${orderClass} ${podiumHeight(tall)}`}
      style={{ backgroundColor: color, color: fg }}
    >
      <HalftoneWash fg={fg} />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: shadeHex(color, -0.4) }}
      />

      {headshot ? (
        <span className="pointer-events-none absolute bottom-0 right-0 aspect-square w-[150px] md:w-[210px] lg:w-[240px]">
          <Image
            src={headshot}
            alt=""
            fill
            sizes="240px"
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
        <PodiumPosition position={row.position} />

        <Link
          href={`/drivers/${row.driver.slug}`}
          className="flex max-w-[60%] flex-col after:absolute after:inset-0 group-hover:underline"
        >
          <span className="display-l font-normal">{row.driver.firstName}</span>
          <span className="display-l font-medium uppercase">{row.driver.lastName}</span>
        </Link>

        {row.team ? (
          <span className="display-s max-w-[60%] font-normal opacity-75">
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

function TeamPodiumCard({
  row,
  tall = false,
  orderClass = "",
}: {
  row: ConstructorStandingRow;
  tall?: boolean;
  orderClass?: string;
}) {
  const color = row.team.color;
  const fg = readableOn(color);
  const logo = mediaUrl(row.team.logoPath);
  const disc = shadeHex(color, -0.35);

  return (
    <article
      className={`group relative flex overflow-hidden rounded-md ${orderClass} ${podiumHeight(tall)}`}
      style={{ backgroundColor: color, color: fg }}
    >
      <HalftoneWash fg={fg} />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: disc }}
      />

      {/* Team roundel — the F1 teams-tab card carries the logo in a darker
          circle of the team's own colour, top-right. */}
      <span
        aria-hidden
        className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full lg:h-16 lg:w-16"
        style={{ backgroundColor: disc }}
      >
        {logo ? (
          <span className="relative block h-full w-full">
            <Image src={logo} alt="" fill sizes="64px" className="object-contain p-2" />
          </span>
        ) : (
          <span className="display-s font-bold" style={{ color: readableOn(disc) }}>
            {row.team.shortName.slice(0, 3).toUpperCase()}
          </span>
        )}
      </span>

      <div className="relative z-10 flex flex-1 flex-col gap-2 px-4 py-3">
        <PodiumPosition position={row.position} />

        <Link
          href={`/teams/${row.team.teamSlug}`}
          className="max-w-[70%] after:absolute after:inset-0 group-hover:underline"
        >
          <span className="display-l font-medium uppercase">{row.team.displayName}</span>
        </Link>

        {row.wins > 0 ? (
          <span className="display-s font-normal opacity-75">
            {row.wins} {row.wins === 1 ? "win" : "wins"}
          </span>
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

/** 2nd · 1st · 3rd grid, the leader tallest — shared by both tabs. */
function PodiumGrid({ cards }: { cards: (React.ReactNode | null)[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">{cards}</div>
  );
}

export function SeasonStandingsBand({
  year,
  categoryName,
  rows,
  teamRows,
  note,
}: {
  year: number;
  categoryName: string;
  rows: DriverStandingRow[];
  teamRows: ConstructorStandingRow[];
  note?: string | null;
}) {
  if (!rows.length) return null;

  const podium = rows.slice(0, 3);
  const teamPodium = teamRows.slice(0, 3);

  const driversPanel = (
    <>
      <PodiumGrid
        cards={[
          podium[1] ? (
            <PodiumCard key="p2" row={podium[1]} orderClass="md:order-1 max-md:ml-6" />
          ) : null,
          podium[0] ? (
            <PodiumCard key="p1" row={podium[0]} tall orderClass="md:order-2" />
          ) : null,
          podium[2] ? (
            <PodiumCard key="p3" row={podium[2]} orderClass="md:order-3 max-md:ml-12" />
          ) : null,
        ]}
      />
      <DriverStandingsTable rows={rows.slice(0, 5)} />
      <div className="flex justify-center">
        <Link href={`/standings/${year}/drivers`} className="btn btn-sm btn-stroke">
          View full standings
        </Link>
      </div>
    </>
  );

  const teamsPanel = teamRows.length ? (
    <>
      <PodiumGrid
        cards={[
          teamPodium[1] ? (
            <TeamPodiumCard key="t2" row={teamPodium[1]} orderClass="md:order-1 max-md:ml-6" />
          ) : null,
          teamPodium[0] ? (
            <TeamPodiumCard key="t1" row={teamPodium[0]} tall orderClass="md:order-2" />
          ) : null,
          teamPodium[2] ? (
            <TeamPodiumCard key="t3" row={teamPodium[2]} orderClass="md:order-3 max-md:ml-12" />
          ) : null,
        ]}
      />
      <ConstructorStandingsTable rows={teamRows.slice(0, 5)} />
      <div className="flex justify-center">
        <Link href={`/standings/${year}/constructors`} className="btn btn-sm btn-stroke">
          View full standings
        </Link>
      </div>
    </>
  ) : null;

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

        <StandingsTabs drivers={driversPanel} teams={teamsPanel} />
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
