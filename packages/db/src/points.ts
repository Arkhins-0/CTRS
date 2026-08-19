import { and, eq } from "drizzle-orm";
import type { Db, Tx } from "./client";
import {
  constructorStandings,
  driverSeasonEntries,
  driverStandings,
  grandsPrix,
  raceSessions,
  sessionResults,
  teamSeasonEntries,
} from "./schema";

type DbOrTx = Db | Tx;

/** Points for a finishing position under a scheme like [25,18,15,12,10,8,6,4,2,1]. */
export function pointsForPosition(
  scheme: readonly number[],
  position: number | null | undefined,
): number {
  if (!position || position < 1 || position > scheme.length) return 0;
  return scheme[position - 1] ?? 0;
}

type Tally = {
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  /** count of race finishes per position (index 1..N) — official countback tie-break */
  raceCounts: number[];
  sprintCounts: number[];
};

function newTally(): Tally {
  return { points: 0, wins: 0, podiums: 0, poles: 0, raceCounts: [], sprintCounts: [] };
}

function compareCountback(a: Tally, b: Tally): number {
  if (b.points !== a.points) return b.points - a.points;
  for (let pos = 1; pos <= 30; pos++) {
    const ra = a.raceCounts[pos] ?? 0;
    const rb = b.raceCounts[pos] ?? 0;
    if (rb !== ra) return rb - ra;
  }
  for (let pos = 1; pos <= 30; pos++) {
    const sa = a.sprintCounts[pos] ?? 0;
    const sb = b.sprintCounts[pos] ?? 0;
    if (sb !== sa) return sb - sa;
  }
  return 0;
}

/**
 * Recomputes driver + constructor standings snapshots for a season from
 * published session results. Deterministic and re-runnable: points are read
 * from `session_results.points` (auto-filled at entry time, editable for
 * penalties), so this is a pure aggregation.
 */
export async function computeStandings(db: DbOrTx, seasonYear: number) {
  const rows = await db
    .select({
      sessionType: raceSessions.type,
      round: grandsPrix.round,
      driverId: driverSeasonEntries.driverId,
      teamSeasonEntryId: driverSeasonEntries.teamSeasonEntryId,
      position: sessionResults.position,
      status: sessionResults.status,
      points: sessionResults.points,
    })
    .from(sessionResults)
    .innerJoin(raceSessions, eq(sessionResults.sessionId, raceSessions.id))
    .innerJoin(grandsPrix, eq(raceSessions.grandPrixId, grandsPrix.id))
    .innerJoin(driverSeasonEntries, eq(sessionResults.driverSeasonEntryId, driverSeasonEntries.id))
    .where(and(eq(grandsPrix.seasonYear, seasonYear), eq(raceSessions.status, "completed")));

  // Every entered driver/team appears in standings even with zero results yet.
  const seasonDriverEntries = await db
    .select({
      driverId: driverSeasonEntries.driverId,
      teamSeasonEntryId: driverSeasonEntries.teamSeasonEntryId,
      role: driverSeasonEntries.role,
    })
    .from(driverSeasonEntries)
    .where(eq(driverSeasonEntries.seasonYear, seasonYear));

  const seasonTeamEntries = await db
    .select({ id: teamSeasonEntries.id })
    .from(teamSeasonEntries)
    .where(eq(teamSeasonEntries.seasonYear, seasonYear));

  const driverTallies = new Map<string, Tally>();
  const teamTallies = new Map<string, Tally>();

  for (const e of seasonDriverEntries) {
    if (e.role === "primary" && !driverTallies.has(e.driverId)) {
      driverTallies.set(e.driverId, newTally());
    }
  }
  for (const t of seasonTeamEntries) teamTallies.set(t.id, newTally());

  let maxRound = 0;

  for (const r of rows) {
    const dt = driverTallies.get(r.driverId) ?? newTally();
    driverTallies.set(r.driverId, dt);
    const tt = teamTallies.get(r.teamSeasonEntryId) ?? newTally();
    teamTallies.set(r.teamSeasonEntryId, tt);

    if (r.sessionType === "race" || r.sessionType === "sprint") {
      dt.points += r.points;
      tt.points += r.points;
      if (r.sessionType === "race") maxRound = Math.max(maxRound, r.round);

      if (r.status === "finished" && r.position) {
        const counts = r.sessionType === "race" ? "raceCounts" : "sprintCounts";
        dt[counts][r.position] = (dt[counts][r.position] ?? 0) + 1;
        tt[counts][r.position] = (tt[counts][r.position] ?? 0) + 1;
        if (r.sessionType === "race") {
          if (r.position === 1) {
            dt.wins++;
            tt.wins++;
          }
          if (r.position <= 3) dt.podiums++;
        }
      }
    } else if (r.sessionType === "qualifying" && r.position === 1) {
      dt.poles++;
    }
  }

  const driverOrder = [...driverTallies.entries()].sort((a, b) => compareCountback(a[1], b[1]));
  const teamOrder = [...teamTallies.entries()].sort((a, b) => compareCountback(a[1], b[1]));

  const run = async (tx: DbOrTx) => {
    await tx.delete(driverStandings).where(eq(driverStandings.seasonYear, seasonYear));
    await tx.delete(constructorStandings).where(eq(constructorStandings.seasonYear, seasonYear));

    if (driverOrder.length) {
      await tx.insert(driverStandings).values(
        driverOrder.map(([driverId, t], i) => ({
          seasonYear,
          driverId,
          position: i + 1,
          points: t.points,
          wins: t.wins,
          podiums: t.podiums,
          poles: t.poles,
          computedThroughRound: maxRound,
          updatedAt: new Date(),
        })),
      );
    }
    if (teamOrder.length) {
      await tx.insert(constructorStandings).values(
        teamOrder.map(([teamSeasonEntryId, t], i) => ({
          seasonYear,
          teamSeasonEntryId,
          position: i + 1,
          points: t.points,
          wins: t.wins,
          computedThroughRound: maxRound,
          updatedAt: new Date(),
        })),
      );
    }
  };

  await db.transaction(async (tx) => run(tx));

  return {
    drivers: driverOrder.length,
    teams: teamOrder.length,
    computedThroughRound: maxRound,
  };
}
