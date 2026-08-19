import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLapTime } from "@ctr/db";
import { Badge, CountryFlag, SectionHeading } from "@ctr/ui";
import { getGpDetail } from "@/components/racing/data";
import { LocalTime } from "@/components/racing/local-time";
import { formatDateRange, SESSION_LABELS } from "@/components/racing/meta";
import { SessionTabs } from "@/components/racing/session-tabs";

type Props = { params: Promise<{ year: string; gpSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: yearParam, gpSlug } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) return {};
  const gp = await getGpDetail(year, gpSlug);
  if (!gp) return {};
  return {
    title: `${gp.name} ${gp.seasonYear}`,
    description: `${gp.name} ${gp.seasonYear} — round ${gp.round}, sessions, timetable and results at ${gp.circuit.name}.`,
  };
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="chamfer-tr border border-warm-grey bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-f1-grey">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-carbon">{value}</p>
      {sub ? <p className="mt-0.5 text-xs font-semibold text-f1-grey">{sub}</p> : null}
    </div>
  );
}

export default async function GrandPrixPage({ params }: Props) {
  const { year: yearParam, gpSlug } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const gp = await getGpDetail(year, gpSlug);
  if (!gp) notFound();

  const dates = formatDateRange(gp.startDate, gp.endDate);
  const sessionsWithResults = gp.sessions.filter((s) => s.hasResults);
  const raceHasResults = sessionsWithResults.some((s) => s.type === "race");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero strip */}
      <section className="chamfer-tr-lg bg-carbon-fibre p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-f1-grey-light">
          <span>Round {gp.round}</span>
          {dates ? (
            <>
              <span aria-hidden>·</span>
              <span>{dates}</span>
            </>
          ) : null}
          <span className="ml-auto flex gap-1.5">
            {gp.hasSprint ? <Badge tone="red">Sprint</Badge> : null}
            {gp.status === "live" ? <Badge tone="green">Live</Badge> : null}
            {gp.status === "completed" ? <Badge tone="grey">Completed</Badge> : null}
            {gp.status === "cancelled" ? <Badge tone="outline">Cancelled</Badge> : null}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">{gp.name}</h1>
        {gp.officialName ? (
          <p className="mt-1 text-sm font-semibold text-f1-grey-light">{gp.officialName}</p>
        ) : null}

        <p className="mt-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <CountryFlag code={gp.circuit.countryCode} />
          <span>
            {gp.circuit.name}
            {gp.circuit.locality ? ` — ${gp.circuit.locality}` : ""}, {gp.circuit.country}
          </span>
        </p>
      </section>

      {/* Circuit facts */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Circuit Length"
          value={gp.circuit.lengthKm != null ? `${gp.circuit.lengthKm.toFixed(3)} km` : "—"}
        />
        <StatTile
          label="Race Laps"
          value={gp.circuit.raceLaps != null ? String(gp.circuit.raceLaps) : "—"}
        />
        <StatTile
          label="Lap Record"
          value={gp.circuit.lapRecordTimeMs != null ? formatLapTime(gp.circuit.lapRecordTimeMs) : "—"}
          sub={
            gp.circuit.lapRecordDriver
              ? `${gp.circuit.lapRecordDriver}${gp.circuit.lapRecordYear ? ` (${gp.circuit.lapRecordYear})` : ""}`
              : undefined
          }
        />
        <StatTile
          label="First Grand Prix"
          value={gp.circuit.firstGpYear != null ? String(gp.circuit.firstGpYear) : "—"}
        />
      </section>

      {gp.circuit.description ? (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-f1-grey">{gp.circuit.description}</p>
      ) : null}

      {/* Weekend timetable */}
      <section className="mt-10">
        <SectionHeading>Weekend Timetable</SectionHeading>
        {gp.sessions.length === 0 ? (
          <p className="mt-4 text-f1-grey">The session timetable has not been announced yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-warm-grey border border-warm-grey bg-white chamfer-tr">
            {gp.sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
              >
                <span className="w-40 text-sm font-black uppercase tracking-wide text-carbon">
                  {SESSION_LABELS[session.type]}
                </span>
                <span className="text-sm font-semibold tabular-nums text-f1-grey">
                  {session.startsAt ? <LocalTime iso={session.startsAt} /> : "TBC"}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {session.status === "live" ? <Badge tone="green">Live</Badge> : null}
                  {session.status === "cancelled" ? <Badge tone="outline">Cancelled</Badge> : null}
                  {session.hasResults ? (
                    <Link
                      href={`/results/${gp.seasonYear}/${gp.slug}/${session.type}`}
                      className="text-xs font-bold uppercase tracking-wide text-f1-red hover:text-f1-red-dark"
                    >
                      View Results
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Results */}
      {sessionsWithResults.length ? (
        <section className="mt-10">
          <SectionHeading
            right={
              raceHasResults ? (
                <Link
                  href={`/results/${gp.seasonYear}/${gp.slug}/race`}
                  className="text-f1-red hover:text-f1-red-dark"
                >
                  Full Race Result →
                </Link>
              ) : undefined
            }
          >
            Results
          </SectionHeading>
          <div className="mt-4">
            <SessionTabs year={gp.seasonYear} gpSlug={gp.slug} sessions={gp.sessions} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
