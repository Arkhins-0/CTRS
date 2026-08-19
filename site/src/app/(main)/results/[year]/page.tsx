import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag, TeamColorBar } from "@ctr/ui";
import { getSeasonRaceResults, getSeasonYears } from "@/components/racing/data";
import { formatDate } from "@/components/racing/meta";
import { SeasonSelector } from "@/components/racing/season-selector";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Race Results`,
    description: `Winners of every completed grand prix of the ${year} Formula Racing season.`,
  };
}

const th = "px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

export default async function ResultsYearPage({ params }: Props) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const years = await getSeasonYears();
  if (!years.includes(year)) notFound();

  const rows = await getSeasonRaceResults(year);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="border-l-4 border-f1-red pl-3 text-3xl font-black uppercase tracking-tight text-carbon sm:text-4xl">
          {year} Race Results
        </h1>
        <SeasonSelector years={years} selected={year} hrefFor={(y) => `/results/${y}`} />
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-f1-grey">No grands prix have been completed this season yet.</p>
      ) : (
        <div className="chamfer-tr mt-8 overflow-x-auto border border-warm-grey bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="bg-carbon text-white">
                <th className={`${th} w-16`}>Round</th>
                <th className={th}>Grand Prix</th>
                <th className={th}>Circuit</th>
                <th className={th}>Date</th>
                <th className={th}>Winner</th>
                <th className={th}>Team</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((gp) => (
                <tr key={gp.id} className="border-b border-warm-grey last:border-0 hover:bg-off-white">
                  <td className={`${td} font-black text-carbon`}>{gp.round}</td>
                  <td className={td}>
                    <Link
                      href={`/results/${year}/${gp.slug}`}
                      className="flex items-center gap-2 font-bold text-carbon hover:text-f1-red"
                    >
                      <CountryFlag code={gp.countryCode} />
                      {gp.name}
                    </Link>
                  </td>
                  <td className={`${td} whitespace-nowrap text-f1-grey`}>{gp.circuitName}</td>
                  <td className={`${td} whitespace-nowrap text-f1-grey`}>{formatDate(gp.date)}</td>
                  <td className={td}>
                    {gp.winner ? (
                      <span className="flex items-center gap-2">
                        <TeamColorBar color={gp.winner.teamColor} />
                        <Link
                          href={`/drivers/${gp.winner.driverSlug}`}
                          className="whitespace-nowrap font-semibold text-carbon hover:text-f1-red"
                        >
                          {gp.winner.firstName} {gp.winner.lastName}
                        </Link>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-f1-grey`}>
                    {gp.winner?.teamName ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
