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
import { publicUrl } from "@/lib/storage";
import { EmptyState, LinkButton, PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { DeclarationPanel } from "@/components/results/declaration-panel";
import { ResultsGrid } from "@/components/results/results-grid";
import { compareRows, isRaceLike, type GridRow, type SessionKind } from "@/components/results/types";
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

/** "Race 2" for (race, 2); the stored label still wins for display. */
const sessionTypeLabel = (type: string, sequence: number) =>
  type === "race" ? `Race ${sequence}` : (SESSION_LABELS[type] ?? type);

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
      round: {
        with: {
          championshipSeason: { with: { championship: { columns: { shortName: true } } } },
          circuit: { columns: { name: true } },
        },
      },
      category: { columns: { id: true, name: true, shortName: true, color: true } },
      results: true,
      declarationDocument: true,
    },
  });
  if (!session) notFound();
  const round = session.round;
  const championshipSeason = round.championshipSeason;
  const seasonLabel = `${championshipSeason.championship.shortName} ${championshipSeason.year}`;

  // the retired "race2" enum value can still exist on legacy rows — treat as a race
  const sessionKind: SessionKind = session.type === "race2" ? "race" : session.type;

  // driver entries active at this round — restricted to the session's
  // category when it has one (multi-class weekends).
  const entries = await db.query.driverSeasonEntries.findMany({
    where: and(
      eq(driverSeasonEntries.championshipSeasonId, round.championshipSeasonId),
      session.categoryId ? eq(driverSeasonEntries.categoryId, session.categoryId) : undefined,
      or(isNull(driverSeasonEntries.fromRound), lte(driverSeasonEntries.fromRound, round.round)),
      or(isNull(driverSeasonEntries.toRound), gte(driverSeasonEntries.toRound, round.round)),
    ),
    with: {
      driver: { columns: { firstName: true, lastName: true, code: true } },
      teamSeasonEntry: { columns: { shortName: true, primaryColor: true } },
    },
  });

  const resultByEntry = new Map(session.results.map((r) => [r.driverSeasonEntryId, r]));
  const raceLike = isRaceLike(sessionKind);

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

  // points schemes come from the championship season's points system
  const pointsSystem = championshipSeason.pointsSystem;

  return (
    <>
      <PageHeader
        title={`${round.name} — ${session.label ?? sessionTypeLabel(session.type, session.sequence)}`}
        sub={`Round ${round.round} · ${seasonLabel} · ${round.circuit.name}${
          session.startsAt ? ` · ${format(session.startsAt, "EEE d MMM yyyy, HH:mm")}` : ""
        }`}
        actions={
          <>
            {session.category ? (
              <span className="inline-flex items-center gap-1.5 border border-line bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-sm"
                  style={{ backgroundColor: session.category.color }}
                />
                {session.category.shortName}
              </span>
            ) : null}
            <StatusPill status={session.status} />
            <LinkButton href={`/results?season=${round.championshipSeasonId}`} variant="ghost">
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
            sessionType={sessionKind}
            initialRows={rows}
            racePoints={pointsSystem.race}
            sprintPoints={pointsSystem.sprint ?? []}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton>Publish results</SubmitButton>
            <SubmitButton variant="secondary" formAction={saveResultsDraftAction}>
              Save without completing
            </SubmitButton>
            <span className="text-xs text-fg-muted">
              Publishing replaces the stored classification, marks the session completed
              {sessionKind === "race" ? ", completes the round" : ""} and recomputes the{" "}
              {seasonLabel} standings.
            </span>
            {pointsSystem.fastestLapPoint && sessionKind === "race" ? (
              <Badge tone="outline">Fastest-lap point season — add it to PTS manually</Badge>
            ) : null}
          </div>
        </form>
      ) : (
        <EmptyState
          title={
            session.category
              ? `No active ${session.category.shortName} driver entries for this round`
              : "No active driver entries for this round"
          }
          hint={`Add ${seasonLabel} driver season entries${
            session.category ? ` in the ${session.category.name} category` : ""
          } (Drivers → season entries) before entering results.`}
        />
      )}

      <DeclarationPanel
        sessionId={session.id}
        current={
          session.declarationDocument
            ? {
                url: publicUrl(session.declarationDocument.path),
                filename: session.declarationDocument.filename,
                sizeBytes: session.declarationDocument.sizeBytes,
              }
            : null
        }
      />
    </>
  );
}
