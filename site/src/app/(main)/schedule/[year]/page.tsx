import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getScheduleForSeason, getSeasonYears } from "@/components/racing/data";
import { ScheduleSeasonView } from "@/components/racing/schedule-season-view";
import { getCurrentSeasonYear } from "@/lib/settings";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Race Calendar`,
    description: `Every round of the ${year} CTR–JK Tyre FMSCI Indian National Car Racing Championship — dates, circuits and results.`,
  };
}

export default async function ScheduleYearPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const [years, currentYear] = await Promise.all([getSeasonYears(), getCurrentSeasonYear()]);
  if (!years.includes(year)) notFound();

  const gps = await getScheduleForSeason(year);

  return (
    <ScheduleSeasonView year={year} years={years} gps={gps} highlightUpNext={year === currentYear} />
  );
}
