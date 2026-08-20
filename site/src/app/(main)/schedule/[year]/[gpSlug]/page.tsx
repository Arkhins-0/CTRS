import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLapTime } from "@ctr/db";
import { CountryFlag } from "@ctr/ui";
import { CategoryDot, CategoryPills, StatusChip } from "@/components/racing/category-ui";
import { getGpDetail, type GpSessionInfo } from "@/components/racing/data";
import { LocalTime } from "@/components/racing/local-time";
import {
  formatDate,
  formatDateRange,
  istDateKey,
  sessionDisplayLabel,
  weekdayName,
} from "@/components/racing/meta";
import { mediaUrl, placeholderStyle } from "@/lib/media";

type Props = {
  params: Promise<{ year: string; gpSlug: string }>;
  searchParams: Promise<{ category?: string }>;
};

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

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="chamfer-tr border border-line bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-faint">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">{value}</p>
      {sub ? <p className="mt-0.5 text-xs font-semibold text-fg-muted">{sub}</p> : null}
    </div>
  );
}

export default async function GrandPrixPage({ params, searchParams }: Props) {
  const [{ year: yearParam, gpSlug }, { category: categoryParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const gp = await getGpDetail(year, gpSlug);
  if (!gp) notFound();

  const dates = formatDateRange(gp.startDate, gp.endDate);
  const heroUrl = mediaUrl(gp.heroPath ?? gp.circuit.photoPath);
  const mapUrl = mediaUrl(gp.circuit.mapPath);

  // Categories present on this weekend's timetable, in display order.
  const categoriesById = new Map(
    gp.sessions.flatMap((s) => (s.category ? [[s.category.id, s.category] as const] : [])),
  );
  const categories = [...categoriesById.values()].sort((a, b) => a.sort - b.sort);
  const activeCategory =
    categories.find((c) => c.slug === categoryParam) ?? null;

  const visibleSessions = activeCategory
    ? gp.sessions.filter((s) => s.category?.id === activeCategory.id)
    : gp.sessions;

  // Group the timetable by IST calendar day.
  const days = new Map<string, GpSessionInfo[]>();
  for (const session of visibleSessions) {
    const key = session.startsAt ? istDateKey(session.startsAt) : "tbc";
    const list = days.get(key) ?? [];
    list.push(session);
    days.set(key, list);
  }
  const dayKeys = [...days.keys()].sort((a, b) =>
    a === "tbc" ? 1 : b === "tbc" ? -1 : a.localeCompare(b),
  );

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero */}
        <section className="chamfer-tr-lg relative overflow-hidden border border-line bg-surface">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={gp.circuit.name}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover opacity-40"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={placeholderStyle(gp.circuit.name)}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-page via-page/55 to-transparent"
          />
          <div className="relative p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fg-muted">
              <span
                className="chamfer-tr bg-accent px-2.5 py-1 text-accent-fg"
                style={{ ["--chamfer" as string]: "6px" }}
              >
                Round {gp.round}
              </span>
              {dates ? <span>{dates}</span> : null}
              <StatusChip status={gp.status} className="ml-auto" />
            </div>

            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
              {gp.name}
            </h1>
            {gp.officialName ? (
              <p className="mt-1 max-w-3xl text-sm font-semibold text-fg-muted">
                {gp.officialName}
              </p>
            ) : null}

            <p className="mt-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
              <CountryFlag code={gp.circuit.countryCode} />
              <span>
                {gp.circuit.name}
                {gp.circuit.locality ? ` — ${gp.circuit.locality}` : ""}, {gp.circuit.country}
              </span>
            </p>

            {gp.hasAnyResults ? (
              <Link
                href={`/results/${gp.seasonYear}/${gp.slug}`}
                className="chamfer-tr mt-6 inline-flex items-center gap-2 bg-accent px-4 py-2 text-xs font-black uppercase tracking-wider text-accent-fg transition-colors hover:bg-accent-dark"
                style={{ ["--chamfer" as string]: "8px" }}
              >
                View Results <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        </section>

        {/* Circuit guide: stat tiles + track map */}
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3 lg:col-span-2">
            <StatTile
              label="Circuit Length"
              value={gp.circuit.lengthKm != null ? `${gp.circuit.lengthKm.toFixed(2)} km` : "—"}
            />
            <StatTile
              label="Turns"
              value={gp.circuit.turns != null ? String(gp.circuit.turns) : "—"}
            />
            <StatTile label="Direction" value={gp.circuit.direction ?? "—"} />
            <StatTile
              label="FIA Grade"
              value={gp.circuit.fiaGrade != null ? `Grade ${gp.circuit.fiaGrade}` : "—"}
            />
            <StatTile
              label="Lap Record"
              value={
                gp.circuit.lapRecordTimeMs != null
                  ? formatLapTime(gp.circuit.lapRecordTimeMs)
                  : "—"
              }
              sub={
                gp.circuit.lapRecordTimeMs != null
                  ? [gp.circuit.lapRecordDriver, gp.circuit.lapRecordYear]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  : undefined
              }
            />
            <StatTile
              label="Opened"
              value={gp.circuit.firstGpYear != null ? String(gp.circuit.firstGpYear) : "—"}
            />
            <StatTile label="Owner" value={gp.circuit.owner ?? "—"} />
            {gp.circuit.description ? (
              <p className="col-span-2 mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted sm:col-span-3">
                {gp.circuit.description}
              </p>
            ) : null}
          </div>

          <div className="chamfer-tr flex flex-col border border-line bg-panel p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-faint">
              Track Map
            </p>
            <div className="relative mt-3 min-h-52 flex-1">
              {mapUrl ? (
                <Image
                  src={mapUrl}
                  alt={`${gp.circuit.name} track map`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-wider text-fg-faint">
                  Map coming soon
                </div>
              )}
            </div>
            <p className="mt-3 text-xs font-semibold text-fg-muted">{gp.circuit.name}</p>
          </div>
        </section>

        {/* Weekend timetable */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="border-l-4 border-accent pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
              Weekend Timetable
            </h2>
            <CategoryPills
              categories={categories}
              activeSlug={activeCategory?.slug ?? null}
              hrefFor={(slug) => `/schedule/${year}/${gp.slug}?category=${slug}`}
              allHref={`/schedule/${year}/${gp.slug}`}
            />
          </div>

          {visibleSessions.length === 0 ? (
            <p className="mt-6 text-fg-muted">The session timetable has not been announced yet.</p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {dayKeys.map((key) => (
                <section key={key} className="chamfer-tr border border-line bg-surface">
                  <header className="border-b border-line bg-panel px-4 py-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {key === "tbc" ? "Time TBC" : weekdayName(key)}
                    </h3>
                    {key !== "tbc" ? (
                      <p className="text-[11px] font-bold uppercase tracking-wider text-fg-faint">
                        {formatDate(key)}
                      </p>
                    ) : null}
                  </header>
                  <ul className="divide-y divide-line">
                    {(days.get(key) ?? []).map((session) => (
                      <li key={session.id} className="flex items-center gap-3 px-4 py-2.5">
                        <CategoryDot color={session.category?.color ?? "#f7d619"} />
                        <span className="min-w-0 truncate text-sm font-bold text-white">
                          {sessionDisplayLabel(session)}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-2">
                          {session.status === "live" ? (
                            <span className="bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                              Live
                            </span>
                          ) : null}
                          {session.status === "cancelled" ? (
                            <span className="text-[10px] font-black uppercase text-fg-faint line-through">
                              Cancelled
                            </span>
                          ) : null}
                          {session.hasResults ? (
                            <Link
                              href={`/results/${gp.seasonYear}/${gp.slug}${
                                session.category ? `?category=${session.category.slug}` : ""
                              }`}
                              className="text-[10px] font-black uppercase tracking-wider text-accent hover:text-accent-dark"
                            >
                              Results
                            </Link>
                          ) : null}
                          <span className="text-sm font-semibold tabular-nums text-fg-muted">
                            {session.startsAt ? (
                              <LocalTime iso={session.startsAt} mode="time" />
                            ) : (
                              "TBC"
                            )}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
