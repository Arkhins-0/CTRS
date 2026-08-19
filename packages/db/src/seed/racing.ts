import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "../client";
import { parseTimeToMs } from "../format";
import { computeStandings } from "../points";
import {
  cars,
  circuits,
  driverSeasonEntries,
  drivers,
  driverStandings,
  grandsPrix,
  raceSessions,
  seasons,
  sessionResults,
  teams,
  teamSeasonEntries,
} from "../schema";
import {
  CIRCUIT_STATS,
  CONSTRUCTOR_TO_TEAM,
  COUNTRY_TO_CODE,
  NATIONALITY_TO_CODE,
  SEASON_POINTS,
  TEAM_SEASON_INFO,
} from "./static-data";

const DATA = resolve(process.cwd(), "src/seed/data");
const readJson = (rel: string) => JSON.parse(readFileSync(resolve(DATA, rel), "utf8"));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type ResultStatus = "finished" | "dnf" | "dns" | "dsq" | "nc";

function mapStatus(
  positionText: string,
  statusStr: string,
): { status: ResultStatus; position: number | null; lapsBehind: number | null } {
  if (/^\d+$/.test(positionText)) {
    const lapMatch = statusStr?.match(/^\+(\d+) Laps?$/);
    return {
      status: "finished",
      position: Number(positionText),
      lapsBehind: lapMatch ? Number(lapMatch[1]) : null,
    };
  }
  const status: ResultStatus =
    positionText === "D" || positionText === "E"
      ? "dsq"
      : positionText === "W" || positionText === "F"
        ? "dns"
        : positionText === "N"
          ? "nc"
          : "dnf"; // "R" and anything else
  return { status, position: null, lapsBehind: null };
}

const SESSION_DURATION_MS: Record<string, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprint_qualifying: 44,
  sprint: 60,
  qualifying: 60,
  race: 120,
};

export async function seedRacing(db: Db, years: number[]) {
  const now = new Date();

  /* ── Seasons ─────────────────────────────────────────────────────────── */
  const currentYear = Math.max(...years);
  for (const year of years) {
    const pts = SEASON_POINTS[year] ?? SEASON_POINTS[2026];
    await db
      .insert(seasons)
      .values({
        year,
        isCurrent: year === currentYear,
        racePoints: pts.race,
        sprintPoints: pts.sprint,
        fastestLapPoint: pts.fastestLapPoint,
      })
      .onConflictDoUpdate({
        target: seasons.year,
        set: { isCurrent: year === currentYear, racePoints: pts.race, sprintPoints: pts.sprint },
      });
  }

  /* ── Circuits ────────────────────────────────────────────────────────── */
  console.log("Seeding circuits…");
  const circuitList = readJson("circuits.json") as any[];
  const circuitIdBySlug = new Map<string, string>();
  for (const c of circuitList) {
    const slug = c.circuitId.replace(/_/g, "-");
    const stats = CIRCUIT_STATS[c.circuitId];
    const [row] = await db
      .insert(circuits)
      .values({
        slug,
        name: c.circuitName,
        locality: c.Location?.locality ?? null,
        country: c.Location?.country ?? "Unknown",
        countryCode: COUNTRY_TO_CODE[c.Location?.country] ?? null,
        lengthKm: stats?.lengthKm ?? null,
        raceLaps: stats?.raceLaps ?? null,
        firstGpYear: stats?.firstGpYear ?? null,
      })
      .onConflictDoUpdate({
        target: circuits.slug,
        set: { name: c.circuitName, locality: c.Location?.locality ?? null },
      })
      .returning({ id: circuits.id });
    circuitIdBySlug.set(c.circuitId, row.id);
  }

  /* ── Canonical teams (identity survives rebrands) ────────────────────── */
  console.log("Seeding teams…");
  const teamIdBySlug = new Map<string, string>();
  const constructorIdsSeen = new Set<string>();
  for (const year of years) {
    for (const c of readJson(`${year}/constructors.json`) as any[]) {
      constructorIdsSeen.add(c.constructorId);
    }
  }
  for (const constructorId of constructorIdsSeen) {
    const info = CONSTRUCTOR_TO_TEAM[constructorId] ?? {
      slug: constructorId.replace(/_/g, "-"),
      name: constructorId,
      fullName: constructorId,
      base: "",
      countryCode: "GB",
      firstEntryYear: 1950,
      championships: 0,
    };
    if (teamIdBySlug.has(info.slug)) continue;
    const [row] = await db
      .insert(teams)
      .values({
        slug: info.slug,
        name: info.name,
        fullName: info.fullName,
        base: info.base,
        countryCode: info.countryCode,
        firstEntryYear: info.firstEntryYear,
        worldChampionships: info.championships,
      })
      .onConflictDoUpdate({
        target: teams.slug,
        set: { name: info.name, fullName: info.fullName, worldChampionships: info.championships },
      })
      .returning({ id: teams.id });
    teamIdBySlug.set(info.slug, row.id);
  }

  /* ── Per-season data (deterministic: wipe season, re-insert) ─────────── */
  for (const year of years) {
    console.log(`\nSeeding season ${year}…`);
    const calendar = readJson(`${year}/calendar.json`) as any[];
    const rounds = readJson(`${year}/rounds.json`) as any[];
    const driverList = readJson(`${year}/drivers.json`) as any[];
    const constructorList = readJson(`${year}/constructors.json`) as any[];

    // wipe (cascades: GPs→sessions→results; teamEntries→cars+driverEntries)
    await db.delete(grandsPrix).where(eq(grandsPrix.seasonYear, year));
    await db.delete(teamSeasonEntries).where(eq(teamSeasonEntries.seasonYear, year));

    /* team season entries + cars */
    const teamEntryByConstructor = new Map<string, string>();
    for (const c of constructorList) {
      const canonical = CONSTRUCTOR_TO_TEAM[c.constructorId];
      const teamId = teamIdBySlug.get(
        canonical?.slug ?? c.constructorId.replace(/_/g, "-"),
      );
      if (!teamId) continue;
      const info = TEAM_SEASON_INFO[year]?.[c.constructorId] ?? {
        displayName: c.name,
        shortName: c.name,
        primaryColor: "#67676d",
        principal: "",
        powerUnit: "",
        carModel: `${year} car`,
      };
      const [entry] = await db
        .insert(teamSeasonEntries)
        .values({
          teamId,
          seasonYear: year,
          displayName: info.displayName,
          shortName: info.shortName,
          primaryColor: info.primaryColor,
          secondaryColor: info.secondaryColor ?? null,
          teamPrincipal: info.principal,
          powerUnitSupplier: info.powerUnit,
        })
        .returning({ id: teamSeasonEntries.id });
      teamEntryByConstructor.set(c.constructorId, entry.id);
      await db.insert(cars).values({
        teamSeasonEntryId: entry.id,
        modelName: info.carModel,
        chassis: info.carModel,
        powerUnit: info.powerUnit,
      });
    }

    /* participation → drivers + driver season entries */
    type Participation = { rounds: number[]; numbers: number[]; driver: any; constructorId: string };
    const participation = new Map<string, Participation>();
    let maxCompletedRound = 0;

    for (const r of rounds) {
      if (r.results.length) maxCompletedRound = Math.max(maxCompletedRound, r.round);
      for (const list of [r.results, r.qualifying, r.sprint]) {
        for (const res of list as any[]) {
          const key = `${res.Driver.driverId}|${res.Constructor.constructorId}`;
          const p =
            participation.get(key) ??
            ({ rounds: [], numbers: [], driver: res.Driver, constructorId: res.Constructor.constructorId } as Participation);
          p.rounds.push(r.round);
          if (res.number) p.numbers.push(Number(res.number));
          participation.set(key, p);
        }
      }
    }

    // upsert driver rows for everyone who actually took part
    const driverInfoById = new Map(driverList.map((d: any) => [d.driverId, d]));
    const driverDbId = new Map<string, string>();
    for (const p of participation.values()) {
      const d = driverInfoById.get(p.driver.driverId) ?? p.driver;
      if (driverDbId.has(d.driverId)) continue;
      const slug = d.driverId.replace(/_/g, "-");
      const [row] = await db
        .insert(drivers)
        .values({
          slug,
          firstName: d.givenName,
          lastName: d.familyName,
          code: d.code ?? d.familyName.slice(0, 3).toUpperCase(),
          countryCode: NATIONALITY_TO_CODE[d.nationality] ?? null,
          dateOfBirth: d.dateOfBirth ?? null,
        })
        .onConflictDoUpdate({
          target: drivers.slug,
          set: { firstName: d.givenName, lastName: d.familyName, isActive: true },
        })
        .returning({ id: drivers.id });
      driverDbId.set(d.driverId, row.id);
    }

    // insert entries with round ranges (handles mid-season swaps)
    type EntryLookup = { driverId: string; constructorId: string; from: number; to: number; entryId: string };
    const entryLookups: EntryLookup[] = [];
    for (const p of participation.values()) {
      const from = Math.min(...p.rounds);
      const to = Math.max(...p.rounds);
      const teamEntryId = teamEntryByConstructor.get(p.constructorId);
      const dbDriverId = driverDbId.get(p.driver.driverId);
      if (!teamEntryId || !dbDriverId) continue;
      const counts = new Map<number, number>();
      for (const n of p.numbers) counts.set(n, (counts.get(n) ?? 0) + 1);
      const carNumber = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
      const [entry] = await db
        .insert(driverSeasonEntries)
        .values({
          driverId: dbDriverId,
          teamSeasonEntryId: teamEntryId,
          seasonYear: year,
          carNumber,
          role: "primary",
          fromRound: from === 1 ? null : from,
          toRound: to >= maxCompletedRound ? null : to,
        })
        .returning({ id: driverSeasonEntries.id });
      entryLookups.push({
        driverId: p.driver.driverId,
        constructorId: p.constructorId,
        from,
        to,
        entryId: entry.id,
      });
    }
    const findEntry = (driverId: string, constructorId: string) =>
      entryLookups.find((e) => e.driverId === driverId && e.constructorId === constructorId)?.entryId;

    /* grands prix + sessions */
    const resultsByRound = new Map<number, any>(rounds.map((r: any) => [r.round, r]));
    const sessionIdByKey = new Map<string, string>();

    for (const race of calendar) {
      const round = Number(race.round);
      const roundData = resultsByRound.get(round);
      const hasRaceResults = !!roundData?.results?.length;
      const [gp] = await db
        .insert(grandsPrix)
        .values({
          seasonYear: year,
          round,
          slug: slugify(race.raceName),
          name: race.raceName,
          circuitId: circuitIdBySlug.get(race.Circuit.circuitId)!,
          startDate: race.FirstPractice?.date ?? race.date,
          endDate: race.date,
          hasSprint: !!race.Sprint,
          status: hasRaceResults ? "completed" : "scheduled",
        })
        .returning({ id: grandsPrix.id });

      const sessionDefs: [string, { date?: string; time?: string } | undefined][] = [
        ["fp1", race.FirstPractice],
        ["fp2", race.SecondPractice],
        ["fp3", race.ThirdPractice],
        ["sprint_qualifying", race.SprintQualifying ?? race.SprintShootout],
        ["sprint", race.Sprint],
        ["qualifying", race.Qualifying],
        ["race", { date: race.date, time: race.time }],
      ];
      for (const [type, def] of sessionDefs) {
        if (!def?.date) continue;
        const startsAt = new Date(`${def.date}T${def.time ?? "12:00:00Z"}`);
        const endsAt = new Date(startsAt.getTime() + (SESSION_DURATION_MS[type] ?? 60) * 60000);
        const completed =
          (type === "race" && hasRaceResults) ||
          (type === "qualifying" && !!roundData?.qualifying?.length) ||
          (type === "sprint" && !!roundData?.sprint?.length) ||
          startsAt < now;
        const [session] = await db
          .insert(raceSessions)
          .values({
            grandPrixId: gp.id,
            type: type as any,
            startsAt,
            endsAt,
            status: completed ? "completed" : "scheduled",
          })
          .returning({ id: raceSessions.id });
        sessionIdByKey.set(`${round}:${type}`, session.id);
      }
    }

    /* session results */
    let resultCount = 0;
    for (const roundData of rounds) {
      const round = roundData.round;

      const insertRaceLike = async (type: "race" | "sprint", list: any[]) => {
        const sessionId = sessionIdByKey.get(`${round}:${type}`);
        if (!sessionId || !list.length) return;
        const winnerMillis = list[0]?.Time?.millis ? Number(list[0].Time.millis) : null;
        const values = list
          .map((r) => {
            const entryId = findEntry(r.Driver.driverId, r.Constructor.constructorId);
            if (!entryId) return null;
            const { status, position, lapsBehind } = mapStatus(r.positionText, r.status);
            const millis = r.Time?.millis ? Number(r.Time.millis) : null;
            return {
              sessionId,
              driverSeasonEntryId: entryId,
              position,
              status,
              gridPosition: r.grid != null ? Number(r.grid) : null,
              laps: r.laps != null ? Number(r.laps) : null,
              timeMs: millis,
              gapMs:
                position !== 1 && millis != null && winnerMillis != null
                  ? millis - winnerMillis
                  : null,
              lapsBehind,
              points: Number(r.points ?? 0),
              fastestLap: r.FastestLap?.rank === "1",
              fastestLapTimeMs: parseTimeToMs(r.FastestLap?.Time?.time),
            };
          })
          .filter(Boolean) as any[];
        if (values.length) {
          await db.insert(sessionResults).values(values);
          resultCount += values.length;
        }
      };

      await insertRaceLike("race", roundData.results);
      await insertRaceLike("sprint", roundData.sprint);

      const qualiSessionId = sessionIdByKey.get(`${round}:qualifying`);
      if (qualiSessionId && roundData.qualifying.length) {
        const values = roundData.qualifying
          .map((q: any) => {
            const entryId = findEntry(q.Driver.driverId, q.Constructor.constructorId);
            if (!entryId) return null;
            return {
              sessionId: qualiSessionId,
              driverSeasonEntryId: entryId,
              position: Number(q.position),
              status: "finished" as const,
              q1TimeMs: parseTimeToMs(q.Q1),
              q2TimeMs: parseTimeToMs(q.Q2),
              q3TimeMs: parseTimeToMs(q.Q3),
              points: 0,
            };
          })
          .filter(Boolean) as any[];
        if (values.length) {
          await db.insert(sessionResults).values(values);
          resultCount += values.length;
        }
      }
    }
    console.log(`  ${resultCount} session results inserted`);

    /* standings + verification against official data */
    const computed = await computeStandings(db, year);
    console.log(
      `  standings computed through round ${computed.computedThroughRound} (${computed.drivers} drivers, ${computed.teams} teams)`,
    );

    const official = readJson(`${year}/official-standings.json`);
    if (official.drivers.length) {
      const rows = await db
        .select({ points: driverStandings.points, driverId: driverStandings.driverId })
        .from(driverStandings)
        .where(eq(driverStandings.seasonYear, year));
      const dbDriverRows = await db.select({ id: drivers.id, slug: drivers.slug }).from(drivers);
      const slugById = new Map(dbDriverRows.map((d) => [d.id, d.slug]));
      const computedBySlug = new Map(rows.map((r) => [slugById.get(r.driverId), r.points]));
      let mismatches = 0;
      for (const o of official.drivers) {
        const slug = o.Driver.driverId.replace(/_/g, "-");
        const ours = computedBySlug.get(slug) ?? 0;
        if (Math.abs(ours - Number(o.points)) > 0.01) {
          console.warn(`  ⚠ ${slug}: computed ${ours} vs official ${o.points}`);
          mismatches++;
        }
      }
      console.log(
        mismatches === 0
          ? `  ✓ computed standings match official standings exactly`
          : `  ⚠ ${mismatches} standings mismatches (see above)`,
      );
    }
  }
}
