import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDriverStandingsForSeason, getSeasonYears } from "@/components/racing/data";
import { StandingsShell } from "@/components/racing/standings-shell";
import { DriverStandingsTable } from "@/components/racing/standings-tables";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Driver Standings`,
    description: `${year} Formula Racing drivers' championship standings.`,
  };
}

export default async function DriverStandingsPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const years = await getSeasonYears();
  if (!years.includes(year)) notFound();

  const standings = await getDriverStandingsForSeason(year);

  return (
    <StandingsShell
      year={year}
      years={years}
      active="drivers"
      computedThroughRound={standings.computedThroughRound}
    >
      {standings.rows.length === 0 ? (
        <p className="chamfer-tr border border-warm-grey bg-white p-6 text-f1-grey">
          No driver standings are available for this season yet.
        </p>
      ) : (
        <DriverStandingsTable rows={standings.rows} />
      )}
    </StandingsShell>
  );
}
