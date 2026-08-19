import { notFound } from "next/navigation";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { format } from "date-fns";
import { Badge } from "@ctr/ui";
import {
  db,
  driverSeasonEntries,
  formatLapTime,
  formatRaceTime,
  raceSessions,
  PERMISSIONS,
} from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { ResultsGrid } from "@/components/results/results-grid";
import { compareRows, isRaceLike, type GridRow } from "@/components/results/types";
import { publishResultsAction, saveResultsDraftAction } from "./actions";

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

export default async function SessionResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const [{ sessionId }, sp] = await Promise.all([params, searchParams]);

  const session = await db.query.raceSessions.findFirst({
    where: eq(raceSessions.id, sessionId),
    with: {
      grandPrix: { with: { season: true, circuit: { columns: { name: true } } } },
      results: true,
    },
  });
  if (!session) notFound();
  const gp = session.grandPrix;

  // driver entries active at this GP's round
  const entries = await db.query.driverSeasonEntries.findMany({
    where: and(
      eq(driverSeasonEntries.seasonYear, gp.seasonYear),
      or(isNull(driverSeasonEntries.fromRound), lte(driverSeasonEntries.fromRound, gp.round)),
      or(isNull(driverSeasonEntries.toRound), gte(driverSeasonEntries.toRound, gp.round)),
    ),
    with: {
      driver: { columns: { firstName: true, lastName: true, code: true } },
      teamSeasonEntry: { columns: { shortName: true, primaryColor: true } },
    },
  });

  const resultByEntry = new Map(session.results.map((r) => [r.driverSeasonEntryId, r]));
  const raceLike = isRaceLike(session.type);

  const rows: GridRow[] = entries
    .map((e): GridRow => {
      const r = resultByEntry.get(e.id);
      return {
        entryId: e.id,
        carNumber: e.carNumber,
        driverName: `${e.driver.firstName} ${e.driver.lastName}`,
        driverCode: e.driver.code,
        teamName: e.teamSeasonEntry.shortName,
        teamColor: e.teamSeasonEntry.primaryColor,
        position: r?.position ?? null,
        gridPosition: r?.gridPosition ?? null,
        laps: r?.laps ?? null,
        timeText:
          r?.timeMs != null ? (raceLike ? formatRaceTime(r.timeMs) : formatLapTime(r.timeMs)) : "",
        gapText: r?.lapsBehind
          ? `+${r.lapsBehind} lap${r.lapsBehind > 1 ? "s" : ""}`
          : r?.gapMs != null
            ? `+${(r.gapMs / 1000).toFixed(3)}`
            : "",
        q1Text: r?.q1TimeMs != null ? formatLapTime(r.q1TimeMs) : "",
        q2Text: r?.q2TimeMs != null ? formatLapTime(r.q2TimeMs) : "",
        q3Text: r?.q3TimeMs != null ? formatLapTime(r.q3TimeMs) : "",
        status: r?.status ?? "finished",
        points: r?.points ?? 0,
        fastestLap: r?.fastestLap ?? false,
      };
    })
    .sort(compareRows);

  return (
    <>
      <PageHeader
        title={`${gp.name} — ${SESSION_LABELS[session.type] ?? session.type}`}
        sub={`Round ${gp.round} · ${gp.seasonYear} · ${gp.circuit.name}${
          session.startsAt ? ` · ${format(session.startsAt, "EEE d MMM yyyy, HH:mm")}` : ""
        }`}
        actions={
          <>
            <StatusPill status={session.status} />
            <LinkButton href={`/results?year=${gp.seasonYear}`} variant="ghost">
              Back to results
            </LinkButton>
          </>
        }
      />

      {sp.saved === "1" ? (
        <div className="chamfer-tr mb-4 border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Results published — session completed and standings recomputed.
        </div>
      ) : sp.saved === "draft" ? (
        <div className="chamfer-tr mb-4 border border-amber-500 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          Results saved as a draft — session status and standings were left untouched.
        </div>
      ) : null}

      {entries.length ? (
        <form action={publishResultsAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <ResultsGrid
            sessionType={session.type}
            initialRows={rows}
            racePoints={gp.season.racePoints}
            sprintPoints={gp.season.sprintPoints}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton>Publish results</SubmitButton>
            <SubmitButton variant="secondary" formAction={saveResultsDraftAction}>
              Save without completing
            </SubmitButton>
            <span className="text-xs text-f1-grey">
              Publishing replaces the stored classification, marks the session completed
              {session.type === "race" ? ", completes the Grand Prix" : ""} and recomputes the
              {" "}
              {gp.seasonYear} standings.
            </span>
            {gp.season.fastestLapPoint && session.type === "race" ? (
              <Badge tone="outline">Fastest-lap point season — add it to PTS manually</Badge>
            ) : null}
          </div>
        </form>
      ) : (
        <EmptyState
          title="No active driver entries for this round"
          hint={`Add ${gp.seasonYear} driver season entries (Drivers → season entries) before entering results.`}
        />
      )}
    </>
  );
}
