import { redirect } from "next/navigation";
import { getCurrentSeasonYear } from "@/lib/settings";

/** /standings always forwards to the current season's drivers table. */
export default async function StandingsPage() {
  const year = await getCurrentSeasonYear();
  redirect(`/standings/${year}/drivers`);
}
