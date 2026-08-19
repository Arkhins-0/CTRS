import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { getGpResultsContext, getSessionClassification } from "@/components/racing/data";
import { LocalTime } from "@/components/racing/local-time";
import { isSessionType, SESSION_LABELS } from "@/components/racing/meta";
import { ResultsTable } from "@/components/racing/results-table";
import { SessionTabs } from "@/components/racing/session-tabs";

type Props = { params: Promise<{ year: string; gpSlug: string; sessionType: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: yearParam, gpSlug, sessionType } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || !isSessionType(sessionType)) return {};
  const gp = await getGpResultsContext(year, gpSlug);
  if (!gp) return {};
  return {
    title: `${gp.name} ${gp.seasonYear} — ${SESSION_LABELS[sessionType]} Results`,
    description: `Full ${SESSION_LABELS[sessionType].toLowerCase()} classification for the ${gp.seasonYear} ${gp.name}.`,
  };
}

export default async function SessionResultsPage({ params }: Props) {
  const { year: yearParam, gpSlug, sessionType } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || !isSessionType(sessionType)) notFound();

  const gp = await getGpResultsContext(year, gpSlug);
  if (!gp) notFound();

  const session = gp.sessions.find((s) => s.type === sessionType);
  if (!session) notFound();

  const rows = await getSessionClassification(session.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-f1-grey">
        <Link href={`/results/${year}`} className="hover:text-f1-red">
          {year} Results
        </Link>{" "}
        <span aria-hidden>/</span> Round {gp.round}
      </p>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 border-l-4 border-f1-red pl-3 text-3xl font-black uppercase tracking-tight text-carbon sm:text-4xl">
            {gp.name} {gp.seasonYear}
            <CountryFlag code={gp.circuit.countryCode} className="text-2xl" />
          </h1>
          <p className="mt-1 pl-4 text-sm font-semibold text-f1-grey">
            {SESSION_LABELS[session.type]}
            {session.startsAt ? (
              <>
                {" — "}
                <LocalTime iso={session.startsAt} />
              </>
            ) : null}
            {" · "}
            {gp.circuit.name}
            {gp.circuit.locality ? `, ${gp.circuit.locality}` : ""}
          </p>
        </div>
        <Link
          href={`/schedule/${gp.seasonYear}/${gp.slug}`}
          className="text-xs font-bold uppercase tracking-wide text-f1-red hover:text-f1-red-dark"
        >
          Race Weekend →
        </Link>
      </div>

      <div className="mt-6">
        <SessionTabs
          year={gp.seasonYear}
          gpSlug={gp.slug}
          sessions={gp.sessions}
          active={session.type}
        />
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="chamfer-tr border border-warm-grey bg-white p-6 text-f1-grey">
            No classification is available for this session yet.
          </p>
        ) : (
          <ResultsTable rows={rows} sessionType={session.type} />
        )}
      </div>
    </main>
  );
}
