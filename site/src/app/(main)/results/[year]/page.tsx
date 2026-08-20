import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { StatusChip } from "@/components/racing/category-ui";
import { getSeasonRounds, getSeasonYears } from "@/components/racing/data";
import { formatDateRange } from "@/components/racing/meta";
import { SeasonSelector } from "@/components/racing/season-selector";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Results`,
    description: `Round-by-round results of the ${year} CTR–JK Tyre FMSCI Indian National Car Racing Championship.`,
  };
}

const th = "px-3 py-2.5 text-xs font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

export default async function ResultsYearPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const years = await getSeasonYears();
  if (!years.includes(year)) notFound();

  const rounds = await getSeasonRounds(year);

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {year} Results
          </h1>
          <SeasonSelector years={years} selected={year} hrefFor={(y) => `/results/${y}`} />
        </div>

        {rounds.length === 0 ? (
          <p className="mt-10 text-fg-muted">
            No rounds have been announced for this season yet.
          </p>
        ) : (
          <div className="chamfer-tr mt-8 overflow-x-auto border border-line bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="bg-panel text-white">
                  <th className={`${th} w-20`}>Round</th>
                  <th className={th}>Circuit</th>
                  <th className={th}>Dates</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`} aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => (
                  <tr
                    key={round.id}
                    className="border-b border-line last:border-0 hover:bg-panel/60"
                  >
                    <td className={`${td} font-black text-white`}>{round.round}</td>
                    <td className={td}>
                      <Link
                        href={`/results/${year}/${round.slug}`}
                        className="group flex items-center gap-2"
                      >
                        <CountryFlag code={round.countryCode} />
                        <span className="min-w-0">
                          <span className="block font-bold text-white group-hover:text-accent">
                            {round.circuitName}
                          </span>
                          {round.locality ? (
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                              {round.locality}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </td>
                    <td className={`${td} whitespace-nowrap text-fg-muted`}>
                      {formatDateRange(round.startDate, round.endDate) || "TBC"}
                    </td>
                    <td className={td}>
                      <StatusChip status={round.status} />
                    </td>
                    <td className={`${td} text-right`}>
                      <Link
                        href={`/results/${year}/${round.slug}`}
                        className="text-xs font-black uppercase tracking-wider text-accent hover:text-accent-dark"
                      >
                        {round.hasResults ? "Results" : "Preview"} <span aria-hidden>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
