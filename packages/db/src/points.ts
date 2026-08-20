import { and, eq } from "drizzle-orm";
import type { Db, Tx } from "./client";
import {
  championships,
  championshipSeasons,
  constructorStandings,
  driverSeasonEntries,
  driverStandings,
  raceSessions,
  rounds,
  sessionResults,
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
  raceCounts: number[]; // finishes per position — countback tie-break
  sprintCounts: number[];
};

const newTally = (): Tally => ({
  points: 0,
  wins: 0,
  podiums: 0,
  poles: 0,
  raceCounts: [],
  sprintCounts: [],
});

function compareCountback(a: Tally, b: Tally): number {
  if (b.points !== a.points) return b.points - a.points;
  for (let pos = 1; pos <= 40; pos++) {
    if ((b.raceCounts[pos] ?? 0) !== (a.raceCounts[pos] ?? 0))
      return (b.raceCounts[pos] ?? 0) - (a.raceCounts[pos] ?? 0);
  }
  for (let pos = 1; pos <= 40; pos++) {
    if ((b.sprintCounts[pos] ?? 0) !== (a.sprintCounts[pos] ?? 0))
      return (b.sprintCounts[pos] ?? 0) - (a.sprintCounts[pos] ?? 0);
  }
  return 0;
}

const NO_CATEGORY = "__none__";
const RESERVED_TYPES = new Set(["overall", "team"]);

/**
 * Recomputes every standings table for one championship season:
 * per category, the "overall" driver table and "team" constructor table, plus
 * one sub-table per extra standingsType enabled on the season (e.g. "rookie",
 * "gentlemen") built from entries carrying that `classification` tag.
 * Race 1/2/3 (type "race", any sequence) all score with the race scheme;
 * "sprint" scores with the sprint scheme. Deterministic and re-runnable.
 */
export async function computeStandings(db: DbOrTx, championshipSeasonId: string) {
  const [season] = await db
    .select()
    .from(championshipSeasons)
    .where(eq(championshipSeasons.id, championshipSeasonId));
  if (!season) throw new Error(`championship season ${championshipSeasonId} not found`);

  const rows = await db
    .select({
      sessionType: raceSessions.type,
      roundNumber: rounds.round,
      driverId: driverSeasonEntries.driverId,
      teamSeasonEntryId: driverSeasonEntries.teamSeasonEntryId,
      categoryId: driverSeasonEntries.categoryId,
      position: sessionResults.position,
      status: sessionResults.status,
      points: sessionResults.points,
    })
    .from(sessionResults)
    .innerJoin(raceSessions, eq(sessionResults.sessionId, raceSessions.id))
    .innerJoin(rounds, eq(raceSessions.roundId, rounds.id))
    .innerJoin(driverSeasonEntries, eq(sessionResults.driverSeasonEntryId, driverSeasonEntries.id))
    .where(
      and(
        eq(rounds.championshipSeasonId, championshipSeasonId),
        eq(raceSessions.status, "completed"),
      ),
    );

  const seasonEntries = await db
    .select({
      driverId: driverSeasonEntries.driverId,
      teamSeasonEntryId: driverSeasonEntries.teamSeasonEntryId,
      categoryId: driverSeasonEntries.categoryId,
      classification: driverSeasonEntries.classification,
      role: driverSeasonEntries.role,
    })
    .from(driverSeasonEntries)
    .where(eq(driverSeasonEntries.championshipSeasonId, championshipSeasonId));

  const key = (cat: string | null, id: string) => `${cat ?? NO_CATEGORY}|${id}`;
  const driverTallies = new Map<string, Tally>();
  const teamTallies = new Map<string, Tally>();
  // (categoryKey|driverId) -> classification tag(s)
  const driverClassification = new Map<string, Set<string>>();

  for (const e of seasonEntries) {
    if (e.role !== "primary") continue;
    const dk = key(e.categoryId, e.driverId);
    if (!driverTallies.has(dk)) driverTallies.set(dk, newTally());
    const tk = key(e.categoryId, e.teamSeasonEntryId);
    if (!teamTallies.has(tk)) teamTallies.set(tk, newTally());
    if (e.classification) {
      const set = driverClassification.get(dk) ?? new Set<string>();
      set.add(e.classification.toLowerCase());
      driverClassification.set(dk, set);
    }
  }

  let maxRound = 0;

  for (const r of rows) {
    const dk = key(r.categoryId, r.driverId);
    const tk = key(r.categoryId, r.teamSeasonEntryId);
    const dt = driverTallies.get(dk) ?? newTally();
    driverTallies.set(dk, dt);
    const tt = teamTallies.get(tk) ?? newTally();
    teamTallies.set(tk, tt);

    const isRace = r.sessionType === "race" || r.sessionType === "race2";
    const isSprint = r.sessionType === "sprint";

    if (isRace || isSprint) {
      dt.points += r.points;
      tt.points += r.points;
      if (isRace) maxRound = Math.max(maxRound, r.roundNumber);

      if (r.status === "finished" && r.position) {
        const counts = isRace ? "raceCounts" : "sprintCounts";
        dt[counts][r.position] = (dt[counts][r.position] ?? 0) + 1;
        tt[counts][r.position] = (tt[counts][r.position] ?? 0) + 1;
        if (isRace) {
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

  const groupByCategory = (tallies: Map<string, Tally>) => {
    const byCat = new Map<string, [string, Tally][]>();
    for (const [k, tally] of tallies) {
      const [cat, id] = k.split("|");
      const list = byCat.get(cat) ?? [];
      list.push([id, tally]);
      byCat.set(cat, list);
    }
    for (const list of byCat.values()) list.sort((a, b) => compareCountback(a[1], b[1]));
    return byCat;
  };

  const driversByCat = groupByCategory(driverTallies);
  const teamsByCat = groupByCategory(teamTallies);
  const subTypes = (season.standingsTypes ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => !RESERVED_TYPES.has(t));

  const catId = (cat: string) => (cat === NO_CATEGORY ? null : cat);
  const now = new Date();

  const driverValues = [...driversByCat.entries()].flatMap(([cat, list]) => {
    const overall = list.map(([driverId, t], i) => ({
      championshipSeasonId,
      driverId,
      categoryId: catId(cat),
      standingsType: "overall",
      position: i + 1,
      points: t.points,
      wins: t.wins,
      podiums: t.podiums,
      poles: t.poles,
      computedThroughRound: maxRound,
      updatedAt: now,
    }));
    // sub-classifications: same tallies, filtered + re-ranked
    const subs = subTypes.flatMap((type) =>
      list
        .filter(([driverId]) => driverClassification.get(key(catId(cat), driverId))?.has(type))
        .map(([driverId, t], i) => ({
          championshipSeasonId,
          driverId,
          categoryId: catId(cat),
          standingsType: type,
          position: i + 1,
          points: t.points,
          wins: t.wins,
          podiums: t.podiums,
          poles: t.poles,
          computedThroughRound: maxRound,
          updatedAt: now,
        })),
    );
    return [...overall, ...subs];
  });

  const teamValues = [...teamsByCat.entries()].flatMap(([cat, list]) =>
    list.map(([teamSeasonEntryId, t], i) => ({
      championshipSeasonId,
      teamSeasonEntryId,
      categoryId: catId(cat),
      standingsType: "team",
      position: i + 1,
      points: t.points,
      wins: t.wins,
      computedThroughRound: maxRound,
      updatedAt: now,
    })),
  );

  await db.transaction(async (tx) => {
    await tx
      .delete(driverStandings)
      .where(eq(driverStandings.championshipSeasonId, championshipSeasonId));
    await tx
      .delete(constructorStandings)
      .where(eq(constructorStandings.championshipSeasonId, championshipSeasonId));
    if (driverValues.length) await tx.insert(driverStandings).values(driverValues);
    if (teamValues.length) await tx.insert(constructorStandings).values(teamValues);
  });

  return {
    drivers: driverTallies.size,
    teams: teamTallies.size,
    categories: driversByCat.size,
    subTypes: subTypes.length,
    computedThroughRound: maxRound,
  };
}

/** Convenience: resolve a championship season by championship slug + year. */
export async function findChampionshipSeason(
  db: DbOrTx,
  championshipSlug: string,
  year: number,
): Promise<string | null> {
  const [row] = await db
    .select({ id: championshipSeasons.id })
    .from(championshipSeasons)
    .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
    .where(and(eq(championships.slug, championshipSlug), eq(championshipSeasons.year, year)));
  return row?.id ?? null;
}
