import type { Metadata } from "next";
import { getScheduleForSeason, getSeasonYears } from "@/components/racing/data";
import { ScheduleSeasonView } from "@/components/racing/schedule-season-view";
import { getCurrentSeasonYear } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Every race weekend of the current Formula Racing season.",
};

export default async function SchedulePage() {
  const year = await getCurrentSeasonYear();
  const [years, gps] = await Promise.all([getSeasonYears(), getScheduleForSeason(year)]);

  return <ScheduleSeasonView year={year} years={years} gps={gps} highlightUpNext />;
}
