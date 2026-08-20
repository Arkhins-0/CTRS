import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { CategoryTabBar, StatusChip } from "@/components/racing/category-ui";
import { CountdownBoxes } from "@/components/racing/countdown";
import {
  getCategories,
  getGpDetail,
  getSessionClassification,
} from "@/components/racing/data";
import { LocalTime } from "@/components/racing/local-time";
import {
  formatDate,
  formatDateRange,
  istDateKey,
  SESSION_ORDER,
  sessionDisplayLabel,
} from "@/components/racing/meta";
import { ResultsTable } from "@/components/racing/results-table";

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
    title: `${gp.name} — Results`,
    description: `Classifications for every category and session of ${gp.name}, ${gp.seasonYear} CTR–JK Tyre FMSCI Indian National Car Racing Championship.`,
  };
}

export default async function RoundResultsPage({ params, searchParams }: Props) {
  const [{ year: yearParam, gpSlug }, { category: categoryParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const [gp, categories] = await Promise.all([getGpDetail(year, gpSlug), getCategories()]);
  if (!gp) notFound();

  // Which categories have any results this weekend?
  const resultsByCategory = new Set(
    gp.sessions.filter((s) => s.hasResults && s.category).map((s) => s.category?.id),
  );

  // Active tab: ?category= → first category with results → first category.
  const activeCategory =
    categories.find((c) => c.slug === categoryParam) ??
    categories.find((c) => resultsByCategory.has(c.id)) ??
    categories[0] ??
    null;

  // This category's sessions with results, newest first (R2 → R1 → Q → P).
  const categorySessions = activeCategory
    ? gp.sessions
        .filter((s) => s.category?.id === activeCategory.id && s.hasResults)
        .sort(
          (a, b) => SESSION_ORDER[b.type] - SESSION_ORDER[a.type] || b.sequence - a.sequence,
        )
    : [];

  const classifications = await Promise.all(
    categorySessions.map((s) => getSessionClassification(s.id)),
  );

  const lightsOutDate = gp.firstRaceStartsAt
    ? istDateKey(gp.firstRaceStartsAt)
    : (gp.startDate ?? null);

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb + header */}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-fg-faint">
          <Link href={`/results/${year}`} className="hover:text-accent">
            {year} Results
          </Link>{" "}
          <span aria-hidden>/</span> Round {gp.round}
        </p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              {gp.name}
              <CountryFlag code={gp.circuit.countryCode} className="text-2xl" />
            </h1>
            <p className="mt-1 pl-4 text-sm font-semibold text-fg-muted">
              {gp.circuit.name}
              {gp.circuit.locality ? `, ${gp.circuit.locality}` : ""}
              {" · "}
              {formatDateRange(gp.startDate, gp.endDate) || "Dates TBC"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={gp.status} />
            <Link
              href={`/schedule/${gp.seasonYear}/${gp.slug}`}
              className="text-xs font-black uppercase tracking-wider text-accent hover:text-accent-dark"
            >
              Race Weekend <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Category tabs */}
        <div className="mt-8">
          <CategoryTabBar
            categories={categories}
            activeSlug={activeCategory?.slug ?? null}
            hrefFor={(slug) => `/results/${year}/${gp.slug}?category=${slug}`}
          />
        </div>

        {/* Classifications */}
        {!gp.hasAnyResults ? (
          <section className="chamfer-tr mt-8 flex flex-col items-center border border-line bg-surface px-6 py-12 text-center">
            <p className="text-2xl font-black uppercase tracking-tight text-white">
              No results yet
            </p>
            <p className="mt-2 max-w-md text-sm font-semibold text-fg-muted">
              Lights out on {formatDate(lightsOutDate)} at {gp.circuit.name}
              {gp.circuit.locality ? `, ${gp.circuit.locality}` : ""}.
            </p>
            {gp.firstRaceStartsAt ? (
              <CountdownBoxes targetIso={gp.firstRaceStartsAt} className="mt-8" />
            ) : null}
            <Link
              href={`/schedule/${gp.seasonYear}/${gp.slug}`}
              className="chamfer-tr mt-8 inline-flex items-center gap-2 bg-accent px-4 py-2 text-xs font-black uppercase tracking-wider text-accent-fg transition-colors hover:bg-accent-dark"
              style={{ ["--chamfer" as string]: "8px" }}
            >
              Weekend Timetable <span aria-hidden>→</span>
            </Link>
          </section>
        ) : categorySessions.length === 0 ? (
          <p className="chamfer-tr mt-8 border border-line bg-surface p-6 text-fg-muted">
            No {activeCategory?.shortName ?? ""} classifications are available for this round yet
            — check another category.
          </p>
        ) : (
          <div className="mt-8 space-y-10">
            {categorySessions.map((session, i) => (
              <section key={session.id}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2
                    className="border-l-4 pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl"
                    style={{ borderColor: activeCategory?.color ?? "var(--color-accent)" }}
                  >
                    {sessionDisplayLabel(session)}
                  </h2>
                  {session.startsAt ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-fg-faint">
                      <LocalTime iso={session.startsAt} />
                    </p>
                  ) : null}
                </div>
                <div className="mt-4">
                  <ResultsTable rows={classifications[i] ?? []} sessionType={session.type} />
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
