import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConstructorStandingsForSeason, getSeasonYears } from "@/components/racing/data";
import { StandingsShell } from "@/components/racing/standings-shell";
import { ConstructorStandingsTable } from "@/components/racing/standings-tables";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Constructor Standings`,
    description: `${year} Formula Racing constructors' championship standings.`,
  };
}

export default async function ConstructorStandingsPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const years = await getSeasonYears();
  if (!years.includes(year)) notFound();

  const standings = await getConstructorStandingsForSeason(year);

  return (
    <StandingsShell
      year={year}
      years={years}
      active="constructors"
      computedThroughRound={standings.computedThroughRound}
    >
      {standings.rows.length === 0 ? (
        <p className="chamfer-tr border border-warm-grey bg-white p-6 text-f1-grey">
          No constructor standings are available for this season yet.
        </p>
      ) : (
        <ConstructorStandingsTable rows={standings.rows} />
      )}
    </StandingsShell>
  );
}
