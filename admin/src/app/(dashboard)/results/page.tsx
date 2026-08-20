import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { format } from "date-fns";
import { Badge } from "@ctr/ui";
import { db, raceSessions, rounds, sessionResults, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { loadSeasonTabs, pickSeason, SeasonTabs } from "@/components/racing/season-tabs";

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

const SESSION_ORDER: readonly string[] = [
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
];

/** "Race 2" for (race, 2); the stored label still wins for display. */
const sessionTypeLabel = (type: string, sequence: number) =>
  type === "race" ? `Race ${sequence}` : (SESSION_LABELS[type] ?? type);

export default async function ResultsPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const sp = await searchParams;

  const seasons = await loadSeasonTabs();
  const season = pickSeason(seasons, sp.season);
  if (!season) {
    return (
      <>
        <PageHeader title="Results Entry" sub="Pick a session to enter its classification" />
        <EmptyState title="No championship seasons yet" hint="Seed a championship season and calendar first." />
      </>
    );
  }

  const [roundRows, counts] = await Promise.all([
    db.query.rounds.findMany({
      where: eq(rounds.championshipSeasonId, season.id),
      orderBy: (t, { asc }) => [asc(t.round)],
      with: {
        circuit: { columns: { name: true } },
        sessions: {
          with: { category: { columns: { id: true, shortName: true, color: true, sort: true } } },
        },
      },
    }),
    db
      .select({ sessionId: sessionResults.sessionId, n: count() })
      .from(sessionResults)
      .innerJoin(raceSessions, eq(sessionResults.sessionId, raceSessions.id))
      .innerJoin(rounds, eq(raceSessions.roundId, rounds.id))
      .where(eq(rounds.championshipSeasonId, season.id))
      .groupBy(sessionResults.sessionId),
  ]);

  const resultCount = new Map(counts.map((c) => [c.sessionId, c.n]));

  return (
    <>
      <PageHeader title="Results Entry" sub="Pick a session to enter or edit its classification" />
      <SeasonTabs seasons={seasons} activeId={season.id} base="/results" />

      {roundRows.length ? (
        <div className="space-y-3">
          {roundRows.map((round) => {
            // weekend-wide sessions first, then one group per category (by sort)
            const sessions = [...round.sessions].sort((a, b) => {
              const catA = a.category ? a.category.sort : -1;
              const catB = b.category ? b.category.sort : -1;
              if (catA !== catB) return catA - catB;
              const nameA = a.category?.shortName ?? "";
              const nameB = b.category?.shortName ?? "";
              if (nameA !== nameB) return nameA.localeCompare(nameB);
              if (a.type !== b.type)
                return SESSION_ORDER.indexOf(a.type) - SESSION_ORDER.indexOf(b.type);
              return a.sequence - b.sequence;
            });
            const groups: { key: string; category: (typeof sessions)[number]["category"]; sessions: typeof sessions }[] = [];
            for (const s of sessions) {
              const key = s.category?.id ?? "weekend";
              const last = groups[groups.length - 1];
              if (last && last.key === key) last.sessions.push(s);
              else groups.push({ key, category: s.category, sessions: [s] });
            }
            const hasMissing = sessions.some(
              (s) => s.status === "completed" && (resultCount.get(s.id) ?? 0) === 0,
            );
            return (
              <details
                key={round.id}
                open={hasMissing || round.status === "live"}
                className="chamfer-tr border border-warm-grey bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="w-8 text-center font-black">{round.round}</span>
                  <span className="font-bold uppercase">{round.name}</span>
                  <span className="text-sm text-f1-grey">{round.circuit.name}</span>
                  {round.hasSprint ? <Badge tone="red">Sprint</Badge> : null}
                  <StatusPill status={round.status} />
                  {hasMissing ? <Badge tone="amber">Missing results</Badge> : null}
                  <span className="ml-auto text-xs font-bold uppercase text-f1-grey">
                    {sessions.length} session{sessions.length === 1 ? "" : "s"}
                  </span>
                </summary>

                {sessions.length ? (
                  <table className="w-full border-t border-warm-grey text-sm">
                    <tbody className="[&>tr]:border-b [&>tr]:border-warm-grey [&>tr:last-child]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                      {groups.map((group) => (
                        <GroupRows
                          key={group.key}
                          category={group.category}
                          sessions={group.sessions}
                          resultCount={resultCount}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="border-t border-warm-grey px-4 py-3 text-sm text-f1-grey">
                    No sessions — add them on the{" "}
                    <Link href={`/races/${round.id}`} className="font-bold text-f1-red hover:underline">
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
        <EmptyState
          title={`No race weekends in ${season.label}`}
          hint="Create the calendar under Race Weekends first."
        />
      )}
    </>
  );
}

function GroupRows({
  category,
  sessions,
  resultCount,
}: {
  category: { id: string; shortName: string; color: string } | null;
  sessions: {
    id: string;
    type: string;
    sequence: number;
    label: string | null;
    startsAt: Date | null;
    status: "scheduled" | "live" | "completed" | "cancelled";
  }[];
  resultCount: Map<string, number>;
}) {
  return (
    <>
      <tr className="bg-off-white">
        <td colSpan={5} className="!py-1.5">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-f1-grey">
            <span
              aria-hidden
              className="inline-block size-3 rounded-sm border border-warm-grey"
              style={{ backgroundColor: category?.color ?? "#67676d" }}
            />
            {category ? category.shortName : "Weekend-wide"}
          </span>
        </td>
      </tr>
      {sessions.map((s) => {
        const n = resultCount.get(s.id) ?? 0;
        const missing = s.status === "completed" && n === 0;
        return (
          <tr key={s.id} className={missing ? "bg-amber-50" : ""}>
            <td className="w-64 font-bold uppercase">
              {s.label ?? sessionTypeLabel(s.type, s.sequence)}
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
    </>
  );
}
