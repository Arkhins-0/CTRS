import { notFound, redirect } from "next/navigation";
import { getGpResultsContext } from "@/components/racing/data";

type Props = { params: Promise<{ year: string; gpSlug: string }> };

/**
 * /results/[year]/[gpSlug] has no view of its own — it forwards to the race
 * classification, or to the latest session that already has results
 * (sessions arrive sorted in chronological weekend order).
 */
export default async function GpResultsIndexPage({ params }: Props) {
  const { year: yearParam, gpSlug } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const gp = await getGpResultsContext(year, gpSlug);
  if (!gp) notFound();

  const withResults = gp.sessions.filter((s) => s.hasResults);
  const target =
    withResults.find((s) => s.type === "race")?.type ??
    withResults[withResults.length - 1]?.type ??
    "race";

  redirect(`/results/${year}/${gpSlug}/${target}`);
}
