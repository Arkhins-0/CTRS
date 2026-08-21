import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatGap, formatLapTime } from "@ctr/db";
import { CountryFlag } from "@ctr/ui";
import { CategoryBadge, CategoryDot, StatusChip } from "@/components/racing/category-ui";
import { CountdownBoxes } from "@/components/racing/countdown";
import {
  getGpDetail,
  getSessionClassification,
  type GpSessionInfo,
} from "@/components/racing/data";
import { LocalTime } from "@/components/racing/local-time";
import {
  formatDate,
  formatDateRange,
  istDateKey,
  sessionDisplayLabel,
  weekdayName,
  type SessionType,
} from "@/components/racing/meta";
import { mediaUrl, placeholderStyle } from "@/lib/media";

type Props = { params: Promise<{ year: string; gpSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: yearParam, gpSlug } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) return {};
  const gp = await getGpDetail(year, gpSlug);
  if (!gp) return {};
  return {
    title: gp.name,
    description: `${gp.officialName ?? gp.name} — weekend timetable, circuit guide and results at ${gp.circuit.name}.`,
  };
}

/** Race-like session types — the results preview only previews a race. */
const RACE_TYPES: readonly SessionType[] = ["race", "race2", "sprint"];

/** One stat in the circuit list: hairline, small label, Formula1 value. */
function CircuitStat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string | null;
}) {
  return (
    <div className="border-t border-black/10 py-4">
      <dt className="body-xs font-semibold uppercase text-text-3">{label}</dt>
      <dd className="display-l mt-1 font-medium text-text-5">{value}</dd>
      {caption ? <p className="body-xs mt-1 font-semibold text-text-3">{caption}</p> : null}
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
  const heroUrl = mediaUrl(gp.heroPath ?? gp.circuit.photoPath);
  const mapUrl = mediaUrl(gp.circuit.mapPath);
  const circuitLine = [gp.circuit.name, gp.circuit.locality, gp.circuit.country]
    .filter(Boolean)
    .join(", ");

  /* ── Timetable: chronological sessions grouped by IST calendar day ──────── */
  const timetable: { session: GpSessionInfo; dayKey: string; firstOfDay: boolean }[] = [];
  let lastDay: string | null = null;
  for (const session of gp.sessions) {
    const dayKey = session.startsAt ? istDateKey(session.startsAt) : "tbc";
    timetable.push({ session, dayKey, firstOfDay: dayKey !== lastDay });
    lastDay = dayKey;
  }

  /* ── Results preview: newest completed race session with a classification ─ */
  const withResults = gp.sessions.filter((s) => s.hasResults);
  const previewSession =
    [...withResults].reverse().find((s) => RACE_TYPES.includes(s.type)) ??
    withResults[withResults.length - 1] ??
    null;
  const previewRows = previewSession
    ? (await getSessionClassification(previewSession.id)).slice(0, 5)
    : [];

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="dark-section relative z-0 h-90 overflow-hidden bg-surface-3 md:h-103.75 lg:h-115">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={gp.circuit.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div aria-hidden className="absolute inset-0" style={placeholderStyle(gp.circuit.name)} />
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-black via-black/60 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0">
          <div className="f1-inner pb-8">
            <p className="body-2xs flex items-center gap-3 font-bold uppercase text-white/80">
              Round {gp.round}
              {gp.status === "live" || gp.status === "cancelled" ? (
                <StatusChip status={gp.status} />
              ) : null}
            </p>
            <h1 className="display-2xl lg:display-3xl mt-2 text-white">
              {gp.officialName ?? gp.name}
            </h1>
            {dates ? <p className="technical-s mt-3 text-white/90">{dates}</p> : null}
            <p className="body-xs mt-2 flex items-center gap-2 font-semibold text-white/80">
              <CountryFlag code={gp.circuit.countryCode} className="text-base leading-none" />
              {circuitLine}
            </p>
          </div>
        </div>
      </section>

      {/* ── Warm band: schedule + results ────────────────────────────────── */}
      <section className="bg-surface-3">
        <div className="f1-inner flex flex-col gap-6 py-12 lg:gap-8 lg:py-16">
          <h2 className="display-xl font-black uppercase text-text-5">Schedule</h2>

          {timetable.length === 0 ? (
            <div className="rounded-md bg-surface-1 px-6 py-8 md:px-8">
              <p className="body-s text-text-3">
                The session timetable has not been announced yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md bg-surface-1 p-2 md:p-4 lg:p-6">
              <ul className="divide-y divide-surface-3">
                {timetable.map(({ session, dayKey, firstOfDay }) => {
                  const completed = session.status === "completed" || session.hasResults;
                  return (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-5 md:px-4"
                    >
                      {/* Date cell — printed once per IST day */}
                      <div className="w-14 shrink-0 self-stretch border-r border-surface-4 pr-3">
                        {firstOfDay ? (
                          dayKey === "tbc" ? (
                            <span className="body-2xs font-bold uppercase text-text-3">TBC</span>
                          ) : (
                            <>
                              <span className="body-2xs block font-bold uppercase text-text-3">
                                {weekdayName(dayKey).slice(0, 3)}
                              </span>
                              <span className="technical-l mt-1 block font-bold text-text-5">
                                {formatDate(dayKey, "d")}
                              </span>
                              <span className="technical-s mt-1 block text-text-3">
                                {formatDate(dayKey, "MMM")}
                              </span>
                            </>
                          )
                        ) : null}
                      </div>

                      {/* Session identity */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          {session.category ? (
                            <CategoryDot color={session.category.color} />
                          ) : null}
                          <span className="display-m font-medium uppercase text-text-5">
                            {sessionDisplayLabel(session)}
                          </span>
                          {session.category ? (
                            <CategoryBadge category={session.category} />
                          ) : null}
                        </span>
                        {completed && session.startsAt ? (
                          <LocalTime
                            iso={session.startsAt}
                            mode="time"
                            className="technical-s text-text-3"
                          />
                        ) : null}
                      </div>

                      {/* Right rail: live chip / results link / local start time */}
                      <div className="ml-auto shrink-0">
                        {session.status === "live" ? (
                          <StatusChip status="live" />
                        ) : session.status === "cancelled" ? (
                          <StatusChip status="cancelled" />
                        ) : session.hasResults ? (
                          <Link
                            href={`/results/${gp.seasonYear}/${gp.slug}?session=${session.id}`}
                            className="body-s font-semibold text-text-5 underline decoration-1 underline-offset-2 hover:decoration-[3px]"
                          >
                            Results <span aria-hidden>&rarr;</span>
                          </Link>
                        ) : session.startsAt ? (
                          <LocalTime
                            iso={session.startsAt}
                            mode="time"
                            className="technical-s text-text-5"
                          />
                        ) : (
                          <span className="technical-s text-text-3">TBC</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── Results module ──────────────────────────────────────────── */}
          <h2 className="display-xl mt-4 font-black uppercase text-text-5">Results</h2>

          {previewSession && previewRows.length > 0 ? (
            <div className="flex flex-col items-start gap-5 rounded-md bg-surface-1 px-6 py-6 md:px-8">
              <p className="body-xs font-semibold uppercase text-text-3">
                {sessionDisplayLabel(previewSession)}
                {previewSession.category ? ` · ${previewSession.category.shortName}` : ""}
              </p>
              <ul className="w-full divide-y divide-surface-4">
                {previewRows.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 py-3 md:gap-4">
                    <span className="technical-m w-6 shrink-0 font-bold text-text-5">
                      {row.position ?? "—"}
                    </span>
                    <span
                      aria-hidden
                      className="h-5 w-5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.team.color }}
                    />
                    <span className="body-s min-w-0 truncate font-semibold text-text-5">
                      <span className="hidden lg:inline">{row.driver.firstName} </span>
                      <span className="hidden md:inline">{row.driver.lastName}</span>
                      <span className="md:hidden">{row.driver.code}</span>
                    </span>
                    <span className="technical-s ml-auto shrink-0 text-text-3">
                      {formatGap({
                        position: row.position,
                        status: row.status,
                        gapMs: row.gapMs,
                        lapsBehind: row.lapsBehind,
                        timeMs: row.timeMs,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/results/${gp.seasonYear}/${gp.slug}?session=${previewSession.id}`}
                className="btn btn-sm btn-stroke"
              >
                View full results
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 rounded-md bg-surface-1 px-6 py-12 text-center lg:py-16">
              <p className="body-m-compact text-text-3">
                No results available for this event yet.
              </p>
              {gp.firstRaceStartsAt ? <CountdownBoxes targetIso={gp.firstRaceStartsAt} /> : null}
            </div>
          )}
        </div>
      </section>

      {/* ── White band: circuit ──────────────────────────────────────────── */}
      <section className="bg-surface-1">
        <div className="f1-inner flex flex-col gap-6 py-12 lg:gap-8 lg:py-16">
          <h2 className="display-xl font-black uppercase text-text-5">Circuit</h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            {/* Track map */}
            <div className="flex min-h-75 items-center justify-center rounded-md bg-surface-3 p-6">
              {mapUrl ? (
                <Image
                  src={mapUrl}
                  alt={`${gp.circuit.name} track map`}
                  width={900}
                  height={600}
                  className="h-auto max-h-80 w-full object-contain"
                />
              ) : (
                <div
                  className="flex h-full min-h-60 w-full items-end rounded-sm p-4"
                  style={placeholderStyle(gp.circuit.name)}
                >
                  <span className="body-2xs font-bold uppercase text-white/70">
                    Track map coming soon
                  </span>
                </div>
              )}
            </div>

            {/* Stat list */}
            <dl className="flex flex-col">
              {gp.circuit.lengthKm != null ? (
                <div className="pb-6">
                  <dt className="body-s font-semibold uppercase text-text-3">Circuit Length</dt>
                  <dd className="display-3xl mt-1 font-black text-text-5">
                    {gp.circuit.lengthKm.toFixed(3)}
                    <span className="display-l font-medium"> km</span>
                  </dd>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {gp.circuit.raceLaps != null ? (
                  <CircuitStat label="Number of Laps" value={String(gp.circuit.raceLaps)} />
                ) : null}
                {gp.circuit.turns != null ? (
                  <CircuitStat label="Turns" value={String(gp.circuit.turns)} />
                ) : null}
                {gp.circuit.direction ? (
                  <CircuitStat label="Direction" value={gp.circuit.direction} />
                ) : null}
                {gp.circuit.fiaGrade ? (
                  <CircuitStat label="FIA Grade" value={`Grade ${gp.circuit.fiaGrade}`} />
                ) : null}
                {gp.circuit.lapRecordTimeMs != null ? (
                  <CircuitStat
                    label="Lap Record"
                    value={formatLapTime(gp.circuit.lapRecordTimeMs)}
                    caption={
                      [gp.circuit.lapRecordDriver, gp.circuit.lapRecordYear]
                        .filter(Boolean)
                        .join(" · ") || null
                    }
                  />
                ) : null}
              </div>
            </dl>
          </div>

          {gp.circuit.description ? (
            <p className="body-m max-w-3xl text-text-4">{gp.circuit.description}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
