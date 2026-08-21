import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCategories,
  getDriverStandingsForSeason,
  getSeasonRounds,
  getSeasonYears,
  getStandingsSubTypes,
} from "@/components/racing/data";
import { formatDateRange } from "@/components/racing/meta";
import { ResultsHub } from "@/components/racing/results-hub";
import {
  CategoryDropdown,
  DriverStandingsTable,
  StandingsEmpty,
  SubTypePills,
} from "@/components/racing/standings-tables";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ category?: string; type?: string }>;
};

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
    <ResultsHub
      year={year}
      years={years}
      active="drivers"
      title={`${year} Drivers' Standings`}
      note={note}
      filters={
        <>
          <CategoryDropdown
            categories={categories}
            activeSlug={activeCategory.slug}
            hrefFor={(slug) => `/standings/${year}/drivers?category=${slug}`}
          />
          {subTypes.length > 0 ? (
            <SubTypePills
              types={["overall", ...subTypes]}
              activeType={activeType}
              hrefFor={(t) =>
                `/standings/${year}/drivers?category=${activeCategory.slug}${
                  t === "overall" ? "" : `&type=${t}`
                }`
              }
            />
          ) : null}
        </>
      }
    >
      {standings.rows.length === 0 ? (
        <StandingsEmpty>
          The {activeCategory.name} entry list has not been announced yet.
        </StandingsEmpty>
      ) : (
        <DriverStandingsTable rows={standings.rows} />
      )}
    </ResultsHub>
  );
}
