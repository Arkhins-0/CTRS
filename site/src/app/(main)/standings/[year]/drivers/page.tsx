import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategories,
  getDriverStandingsForSeason,
  getSeasonRounds,
  getSeasonYears,
  getStandingsSubTypes,
} from "@/components/racing/data";
import { formatDateRange } from "@/components/racing/meta";
import { StandingsShell } from "@/components/racing/standings-shell";
import { DriverStandingsTable } from "@/components/racing/standings-tables";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ category?: string; type?: string }>;
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Driver Standings`,
    description: `${year} CTR–JK Tyre FMSCI Indian National Car Racing Championship — drivers' standings in every category.`,
  };
}

export default async function DriverStandingsPage({ params, searchParams }: Props) {
  const [{ year: yearParam }, { category: categoryParam, type: typeParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const [years, categories] = await Promise.all([getSeasonYears(), getCategories()]);
  if (!years.includes(year)) notFound();

  const activeCategory =
    categories.find((c) => c.slug === categoryParam) ?? categories[0] ?? null;
  if (!activeCategory) notFound();

  // Extra classification tables (e.g. Levitas Cup: rookie / gentlemen).
  const subTypes = await getStandingsSubTypes(year, activeCategory.id);
  const activeType =
    typeParam && subTypes.includes(typeParam) ? typeParam : "overall";

  const [standings, rounds] = await Promise.all([
    getDriverStandingsForSeason(year, activeCategory.id, activeType),
    getSeasonRounds(year),
  ]);

  const firstRound = rounds[0] ?? null;
  const note =
    standings.computedThroughRound === 0 && standings.rows.length > 0 && firstRound
      ? `Season starts ${formatDateRange(firstRound.startDate, firstRound.endDate)} — standings update after every race.`
      : standings.computedThroughRound > 0
        ? `After Round ${standings.computedThroughRound}.`
        : null;

  return (
    <StandingsShell
      year={year}
      years={years}
      active="drivers"
      categories={categories}
      activeCategorySlug={activeCategory.slug}
      note={note}
    >
      {subTypes.length > 0 ? (
        <nav aria-label="Classification" className="mb-4 flex flex-wrap gap-1.5">
          {["overall", ...subTypes].map((t) => (
            <Link
              key={t}
              href={`/standings/${year}/drivers?category=${activeCategory.slug}${
                t === "overall" ? "" : `&type=${t}`
              }`}
              aria-current={t === activeType ? "page" : undefined}
              style={{ ["--chamfer" as string]: "6px" }}
              className={`chamfer-tr px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                t === activeType
                  ? "bg-accent text-accent-fg"
                  : "border border-line bg-surface text-fg-muted hover:border-accent hover:text-white"
              }`}
            >
              {capitalise(t)}
            </Link>
          ))}
        </nav>
      ) : null}

      {standings.rows.length === 0 ? (
        <p className="chamfer-tr border border-line bg-surface p-6 text-fg-muted">
          The {activeCategory.name} entry list has not been announced yet.
        </p>
      ) : (
        <DriverStandingsTable rows={standings.rows} />
      )}
    </StandingsShell>
  );
}
