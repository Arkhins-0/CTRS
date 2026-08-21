import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCategories,
  getConstructorStandingsForSeason,
  getSeasonRounds,
  getSeasonYears,
} from "@/components/racing/data";
import { formatDateRange } from "@/components/racing/meta";
import { ResultsHub } from "@/components/racing/results-hub";
import {
  CategoryDropdown,
  ConstructorStandingsTable,
  StandingsEmpty,
} from "@/components/racing/standings-tables";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Constructor Standings`,
    description: `${year} CTR–JK Tyre FMSCI Indian National Car Racing Championship — teams' standings in every category.`,
  };
}

export default async function ConstructorStandingsPage({ params, searchParams }: Props) {
  const [{ year: yearParam }, { category: categoryParam }] = await Promise.all([
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

  const [standings, rounds] = await Promise.all([
    getConstructorStandingsForSeason(year, activeCategory.id),
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
      active="teams"
      title={`${year} Teams' Standings`}
      note={note}
      filters={
        <CategoryDropdown
          categories={categories}
          activeSlug={activeCategory.slug}
          hrefFor={(slug) => `/standings/${year}/constructors?category=${slug}`}
        />
      }
    >
      {standings.rows.length === 0 ? (
        <StandingsEmpty>
          The {activeCategory.name} team entry list has not been announced yet.
        </StandingsEmpty>
      ) : (
        <ConstructorStandingsTable rows={standings.rows} />
      )}
    </ResultsHub>
  );
}
