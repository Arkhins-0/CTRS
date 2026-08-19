import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { Badge } from "@ctr/ui";
import {
  db,
  grandsPrix,
  raceSessions,
  seasons,
  sessionResults,
  PERMISSIONS,
} from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

const SESSION_LABELS: Record<string, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_qualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};

const SESSION_ORDER = ["fp1", "fp2", "fp3", "sprint_qualifying", "sprint", "qualifying", "race"];

function SeasonTabs({ years, active }: { years: number[]; active: number }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b-2 border-carbon">
      {years.map((y) => (
        <Link
          key={y}
          href={`/results?year=${y}`}
          className={`px-4 py-2 text-sm font-black uppercase tracking-wide transition-colors ${
            y === active ? "chamfer-tr bg-carbon text-white" : "text-f1-grey hover:text-carbon"
          }`}
        >
          {y}
        </Link>
      ))}
    </div>
  );
}

export default async function ResultsPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const sp = await searchParams;

  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.year));
  if (!allSeasons.length) {
    return (
      <>
        <PageHeader title="Results Entry" sub="Pick a session to enter its classification" />
        <EmptyState title="No seasons yet" hint="Seed a season and calendar first." />
      </>
    );
  }

  const years = allSeasons.map((s) => s.year);
  const parsedYear = Number(sp.year);
  const year = years.includes(parsedYear) ? parsedYear : years[0];

  const [gps, counts] = await Promise.all([
    db.query.grandsPrix.findMany({
      where: eq(grandsPrix.seasonYear, year),
      orderBy: (t, { asc }) => [asc(t.round)],
      with: {
        circuit: { columns: { name: true } },
        sessions: true,
      },
    }),
    db
      .select({ sessionId: sessionResults.sessionId, n: count() })
      .from(sessionResults)
      .innerJoin(raceSessions, eq(sessionResults.sessionId, raceSessions.id))
      .innerJoin(grandsPrix, eq(raceSessions.grandPrixId, grandsPrix.id))
      .where(eq(grandsPrix.seasonYear, year))
      .groupBy(sessionResults.sessionId),
  ]);

  const resultCount = new Map(counts.map((c) => [c.sessionId, c.n]));

  return (
    <>
      <PageHeader title="Results Entry" sub="Pick a session to enter or edit its classification" />
      <SeasonTabs years={years} active={year} />

      {gps.length ? (
        <div className="space-y-3">
          {gps.map((gp) => {
            const sessions = [...gp.sessions].sort(
              (a, b) => SESSION_ORDER.indexOf(a.type) - SESSION_ORDER.indexOf(b.type),
            );
            const hasMissing = sessions.some(
              (s) => s.status === "completed" && (resultCount.get(s.id) ?? 0) === 0,
            );
            return (
              <details
                key={gp.id}
                open={hasMissing || gp.status === "live"}
                className="chamfer-tr border border-warm-grey bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="w-8 text-center font-black">{gp.round}</span>
                  <span className="font-bold uppercase">{gp.name}</span>
                  <span className="text-sm text-f1-grey">{gp.circuit.name}</span>
                  {gp.hasSprint ? <Badge tone="red">Sprint</Badge> : null}
                  <StatusPill status={gp.status} />
                  {hasMissing ? <Badge tone="amber">Missing results</Badge> : null}
                  <span className="ml-auto text-xs font-bold uppercase text-f1-grey">
                    {sessions.length} session{sessions.length === 1 ? "" : "s"}
                  </span>
                </summary>

                {sessions.length ? (
                  <table className="w-full border-t border-warm-grey text-sm">
                    <tbody className="[&>tr]:border-b [&>tr]:border-warm-grey [&>tr:last-child]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                      {sessions.map((s) => {
                        const n = resultCount.get(s.id) ?? 0;
                        const missing = s.status === "completed" && n === 0;
                        return (
                          <tr key={s.id} className={missing ? "bg-amber-50" : ""}>
                            <td className="w-48 font-bold uppercase">
                              {SESSION_LABELS[s.type] ?? s.type}
                            </td>
                            <td className="whitespace-nowrap text-f1-grey">
                              {s.startsAt ? format(s.startsAt, "EEE d MMM, HH:mm") : "TBC"}
                            </td>
                            <td>
                              <StatusPill status={s.status} />
                            </td>
                            <td>
                              {missing ? (
                                <Badge tone="amber">Missing results</Badge>
                              ) : (
                                <span className={n ? "font-bold" : "text-f1-grey-light"}>
                                  {n ? `${n} classified` : "No results yet"}
                                </span>
                              )}
                            </td>
                            <td className="text-right">
                              <Link
                                href={`/results/session/${s.id}`}
                                className="text-xs font-bold uppercase text-f1-red hover:underline"
                              >
                                Enter / edit results →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="border-t border-warm-grey px-4 py-3 text-sm text-f1-grey">
                    No sessions — add them on the{" "}
                    <Link href={`/races/${gp.id}`} className="font-bold text-f1-red hover:underline">
                      race weekend page
                    </Link>
                    .
                  </p>
                )}
              </details>
            );
          })}
        </div>
      ) : (
        <EmptyState title={`No race weekends in ${year}`} hint="Create the calendar under Race Weekends first." />
      )}
    </>
  );
}
