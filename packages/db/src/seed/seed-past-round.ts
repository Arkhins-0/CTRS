/**
 * Seeds ONE completed round in the past, with full classifications, so the
 * results pages and the championship tables have something real to show
 * before the season's first actual round (11–13 Sep 2026) is run.
 *
 * MOCK DATA. The finishing order is invented — deterministically, from a
 * hash of each entry id, so a re-run reproduces the same weekend rather than
 * reshuffling the championship. It is a pre-season event deliberately
 * numbered round 0 and named as a test/shakedown meeting, so it never
 * collides with, or gets mistaken for, a real calendar round.
 *
 *   npm run seed:past-round -w @ctr/db            fill it in
 *   npm run seed:past-round -w @ctr/db -- --undo  remove it again
 *
 * Idempotent either way: re-running does not double-write, and --undo drops
 * the round, its sessions and its results, then recomputes the standings
 * back to zero.
 */
import "./load-env";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../client";
import { computeStandings, pointsForPosition } from "../points";
import {
  championshipSeasons,
  circuits,
  driverSeasonEntries,
  raceCategories,
  raceSessions,
  rounds,
  sessionResults,
} from "../schema";

const SLUG = "pre-season-test-coimbatore";
const CIRCUIT_SLUG = "kari-motor-speedway";
const START = "2026-08-21";
const MIDDLE = "2026-08-22";
const END = "2026-08-23";

/** Stable pseudo-random 0..1 from a string — same weekend on every re-run. */
function rnd(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * A representative lap for the category, in ms. The circuit is ~2.1 km, so
 * roughly a minute and a half a lap — varied per category so a Formula car
 * and a touring car do not post identical times.
 */
const BASE_LAP_MS = 92_000;
const RACE_LAPS = 18;

const at = (date: string, h: number, m: number) =>
  new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`);
const slot = (base: Date, idx: number, mins: number) =>
  new Date(base.getTime() + idx * mins * 60000);

async function currentSeason() {
  const [season] = await db
    .select()
    .from(championshipSeasons)
    .where(eq(championshipSeasons.isCurrent, true));
  if (!season) throw new Error("no current championship season");
  return season;
}

async function undo() {
  const [round] = await db.select().from(rounds).where(eq(rounds.slug, SLUG));
  if (!round) {
    console.log("nothing to undo — the pre-season round is not present");
    return;
  }
  const sessions = await db
    .select({ id: raceSessions.id })
    .from(raceSessions)
    .where(eq(raceSessions.roundId, round.id));
  if (sessions.length) {
    await db.delete(sessionResults).where(
      inArray(
        sessionResults.sessionId,
        sessions.map((s) => s.id),
      ),
    );
  }
  await db.delete(raceSessions).where(eq(raceSessions.roundId, round.id));
  await db.delete(rounds).where(eq(rounds.id, round.id));

  const season = await currentSeason();
  await computeStandings(db, season.id);
  console.log(`removed the pre-season round (${sessions.length} sessions) and recomputed standings`);
}

async function seed() {
  const season = await currentSeason();

  const existing = await db.select().from(rounds).where(eq(rounds.slug, SLUG));
  if (existing[0]) {
    console.log("pre-season round already present — recomputing standings only");
    await computeStandings(db, season.id);
    return;
  }

  const [circuit] = await db.select().from(circuits).where(eq(circuits.slug, CIRCUIT_SLUG));
  if (!circuit) throw new Error(`circuit ${CIRCUIT_SLUG} not found`);

  const cats = await db
    .select()
    .from(raceCategories)
    .where(
      and(
        eq(raceCategories.championshipId, season.championshipId),
        eq(raceCategories.isActive, true),
      ),
    );

  const [round] = await db
    .insert(rounds)
    .values({
      championshipSeasonId: season.id,
      round: 0,
      slug: SLUG,
      name: "Pre-Season Test — Coimbatore",
      officialName: `CTR–JK Tyre FMSCI INCRC 2026 · Pre-Season Test · ${circuit.name}`,
      circuitId: circuit.id,
      startDate: START,
      endDate: END,
      hasSprint: false,
      status: "completed",
    })
    .returning({ id: rounds.id });

  const scheme = season.pointsSystem.race;
  let sessionCount = 0;
  let resultCount = 0;

  for (const [i, cat] of cats.entries()) {
    const entries = await db
      .select({ id: driverSeasonEntries.id })
      .from(driverSeasonEntries)
      .where(
        and(
          eq(driverSeasonEntries.championshipSeasonId, season.id),
          eq(driverSeasonEntries.categoryId, cat.id),
          eq(driverSeasonEntries.role, "primary"),
        ),
      );
    if (!entries.length) continue;

    // Each category runs its own pace, so a formula car and a touring car
    // do not post identical lap times at the same circuit.
    const catLap = BASE_LAP_MS + Math.round(rnd(`${cat.slug}-pace`) * 14_000) - 4_000;

    const mk = (
      type: "fp1" | "qualifying" | "race",
      sequence: number,
      label: string,
      startsAt: Date,
      durMin: number,
    ) => ({
      roundId: round.id,
      categoryId: cat.id,
      type,
      sequence,
      label: `${cat.shortName} — ${label}`,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durMin * 60000),
      status: "completed" as const,
    });

    const created = await db
      .insert(raceSessions)
      .values([
        mk("fp1", 1, "Practice", slot(at(START, 8, 30), i, 40), 30),
        mk("qualifying", 1, "Qualifying", slot(at(START, 14, 0), i, 30), 20),
        mk("race", 1, "Race 1", slot(at(MIDDLE, 9, 30), i, 45), 35),
        mk("race", 2, "Race 2", slot(at(END, 9, 30), i, 45), 35),
      ])
      .returning({ id: raceSessions.id, type: raceSessions.type, sequence: raceSessions.sequence });
    sessionCount += created.length;

    // Qualifying order sets the grid; each race shuffles it a little from there.
    const qualifying = [...entries].sort(
      (a, b) => rnd(`${cat.id}-q-${a.id}`) - rnd(`${cat.id}-q-${b.id}`),
    );
    const gridPos = new Map(qualifying.map((e, idx) => [e.id, idx + 1]));

    for (const session of created) {
      if (session.type === "fp1") continue;

      if (session.type === "qualifying") {
        // Pole sets the benchmark; the field fans out behind it in tenths.
        let lap = catLap + Math.round(rnd(`${cat.id}-pole`) * 600);
        await db.insert(sessionResults).values(
          qualifying.map((e, idx) => {
            if (idx > 0) lap += 90 + Math.round(rnd(`${cat.id}-q-gap-${e.id}`) * 420);
            return {
              sessionId: session.id,
              driverSeasonEntryId: e.id,
              position: idx + 1,
              status: "finished" as const,
              points: 0,
              timeMs: lap,
              q1TimeMs: lap,
            };
          }),
        );
        resultCount += qualifying.length;
        continue;
      }

      // race: reorder from the grid, then retire the last couple of runners
      const seed = `${cat.id}-r${session.sequence}`;
      const order = [...entries].sort(
        (a, b) =>
          gridPos.get(a.id)! + rnd(`${seed}-${a.id}`) * 6 -
          (gridPos.get(b.id)! + rnd(`${seed}-${b.id}`) * 6),
      );
      const dnfCount = order.length > 8 ? 2 : order.length > 4 ? 1 : 0;
      const finishers = order.slice(0, order.length - dnfCount);
      const retired = order.slice(order.length - dnfCount);

      // Winner's total race time; everyone else is stored as a gap to it,
      // which is what the classification table reads (leader → time,
      // the rest → +gap).
      const winnerMs = RACE_LAPS * catLap + Math.round(rnd(`${seed}-win`) * 4000);
      let gap = 0;

      await db.insert(sessionResults).values([
        ...finishers.map((e, idx) => {
          if (idx > 0) gap += 600 + Math.round(rnd(`${seed}-gap-${e.id}`) * 5200);
          return {
            sessionId: session.id,
            driverSeasonEntryId: e.id,
            position: idx + 1,
            gridPosition: gridPos.get(e.id) ?? null,
            status: "finished" as const,
            laps: RACE_LAPS,
            points: pointsForPosition(scheme, idx + 1),
            fastestLap: idx === (session.sequence === 1 ? 0 : 1),
            timeMs: winnerMs + gap,
            gapMs: idx === 0 ? null : gap,
          };
        }),
        ...retired.map((e) => ({
          sessionId: session.id,
          driverSeasonEntryId: e.id,
          position: null,
          gridPosition: gridPos.get(e.id) ?? null,
          status: "dnf" as const,
          laps: 6 + Math.floor(rnd(`${seed}-dnf-${e.id}`) * 8),
          points: 0,
          fastestLap: false,
          lapsBehind: RACE_LAPS - (6 + Math.floor(rnd(`${seed}-dnf-${e.id}`) * 8)),
        })),
      ]);
      resultCount += order.length;
    }
  }

  const standings = await computeStandings(db, season.id);
  console.log(
    `Pre-Season Test — Coimbatore (21–23 Aug 2026): ${cats.length} categories, ${sessionCount} sessions, ${resultCount} classifications`,
  );
  console.log(
    `standings recomputed — ${standings.drivers} drivers across ${standings.categories} category tables`,
  );
}

async function main() {
  if (process.argv.includes("--undo")) await undo();
  else await seed();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
