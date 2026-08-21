import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { getSeasonRounds, getSeasonYears } from "@/components/racing/data";
import { ResultsHub } from "@/components/racing/results-hub";
import { FilterDropdown, SeasonRoundsTable } from "@/components/racing/results-table";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Race Results`,
    description: `Round-by-round results of the ${year} CTR–JK Tyre FMSCI Indian National Car Racing Championship.`,
  };
}

export default async function ResultsYearPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const years = await getSeasonYears();
  if (!years.includes(year)) notFound();

  const rounds = await getSeasonRounds(year);

  return (
    <ResultsHub
      year={year}
      years={years}
      active="races"
      title={`${year} Race Results`}
      filters={
        rounds.length > 0 ? (
          <FilterDropdown
            ariaLabel="Filter by Grand Prix"
            label="All"
            options={[
              { key: "all", label: "All", href: `/results/${year}`, active: true },
              ...rounds.map((r) => ({
                key: r.id,
                label: (
                  <>
                    <CountryFlag code={r.countryCode} className="text-base leading-none" />
                    {r.name}
                  </>
                ),
                href: r.hasResults
                  ? `/results/${year}/${r.slug}`
                  : `/schedule/${year}/${r.slug}`,
              })),
            ]}
          />
        ) : null
      }
    >
      {rounds.length === 0 ? (
        <div className="rounded-md bg-surface-1 px-6 py-8 md:px-8">
          <p className="body-s text-text-3">
            No rounds have been announced for this season yet.
          </p>
        </div>
      ) : (
        <SeasonRoundsTable year={year} rounds={rounds} />
      )}
    </ResultsHub>
  );
}
