import { db, TAGS } from "@ctr/db";
import { cached } from "@/lib/cache";
import { isEntryActiveAtRound, SESSION_ORDER, type SessionType } from "./meta";

/* ══════════════════════════════════════════════════════════════════════════
   Cached read layer for the racing section (schedule / results / standings /
   drivers / teams). Every function returns plain serialisable objects so the
   shapes survive the unstable_cache JSON round-trip (timestamps become ISO
   strings here, never raw Date objects).
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Shared shapes ───────────────────────────────────────────────────────── */

export type WinnerInfo = {
  firstName: string;
  lastName: string;
  code: string;
  countryCode: string | null;
  driverSlug: string;
  teamName: string;
  teamColor: string;
};

export type ScheduleGp = {
  id: string;
  round: number;
  slug: string;
  name: string;
  officialName: string | null;
  startDate: string | null;
  endDate: string | null;
  hasSprint: boolean;
  status: "scheduled" | "live" | "completed" | "cancelled";
  circuit: {
    name: string;
    locality: string | null;
    country: string;
    countryCode: string | null;
  };
  winner: WinnerInfo | null;
};

export type GpSessionInfo = {
  id: string;
  type: SessionType;
  status: "scheduled" | "live" | "completed" | "cancelled";
  startsAt: string | null;
  endsAt: string | null;
  hasResults: boolean;
};

export type GpDetail = {
  id: string;
  seasonYear: number;
  round: number;
  slug: string;
  name: string;
  officialName: string | null;
  startDate: string | null;
  endDate: string | null;
  hasSprint: boolean;
  status: "scheduled" | "live" | "completed" | "cancelled";
  circuit: {
    slug: string;
    name: string;
    officialName: string | null;
    locality: string | null;
    country: string;
    countryCode: string | null;
    lengthKm: number | null;
    raceLaps: number | null;
    lapRecordTimeMs: number | null;
    lapRecordDriver: string | null;
    lapRecordYear: number | null;
    firstGpYear: number | null;
    description: string | null;
  };
  sessions: GpSessionInfo[];
};

export type ClassificationRow = {
  id: string;
  position: number | null;
  status: "finished" | "dnf" | "dns" | "dsq" | "nc";
  gridPosition: number | null;
  laps: number | null;
  timeMs: number | null;
  gapMs: number | null;
  lapsBehind: number | null;
  q1TimeMs: number | null;
  q2TimeMs: number | null;
  q3TimeMs: number | null;
  points: number;
  fastestLap: boolean;
  carNumber: number;
  driver: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    countryCode: string | null;
  };
  team: { shortName: string; color: string };
};

/* ── Seasons ─────────────────────────────────────────────────────────────── */

/** All season years, newest first (shared by every season selector). */
export function getSeasonYears(): Promise<number[]> {
  return cached(
    async () => {
      const rows = await db.query.seasons.findMany({
        columns: { year: true },
        orderBy: (s, { desc }) => [desc(s.year)],
      });
      return rows.map((r) => r.year);
    },
    ["racing-season-years"],
    [TAGS.schedule, TAGS.results, TAGS.standings],
    3600,
  );
}

/* ── Schedule ────────────────────────────────────────────────────────────── */

export function getScheduleForSeason(year: number): Promise<ScheduleGp[]> {
  return cached(
    async () => {
      const gps = await db.query.grandsPrix.findMany({
        where: (gp, { eq }) => eq(gp.seasonYear, year),
        orderBy: (gp, { asc }) => [asc(gp.round)],
        with: {
          circuit: true,
          sessions: {
            where: (s, { eq }) => eq(s.type, "race"),
            with: {
              results: {
                where: (r, { eq }) => eq(r.position, 1),
                with: { entry: { with: { driver: true, teamSeasonEntry: true } } },
              },
            },
          },
        },
      });

      return gps.map((gp): ScheduleGp => {
        const p1 = gp.status === "completed" ? gp.sessions[0]?.results[0] : undefined;
        return {
          id: gp.id,
          round: gp.round,
          slug: gp.slug,
          name: gp.name,
          officialName: gp.officialName,
          startDate: gp.startDate,
          endDate: gp.endDate,
          hasSprint: gp.hasSprint,
          status: gp.status,
          circuit: {
            name: gp.circuit.name,
            locality: gp.circuit.locality,
            country: gp.circuit.country,
            countryCode: gp.circuit.countryCode,
          },
          winner: p1
            ? {
                firstName: p1.entry.driver.firstName,
                lastName: p1.entry.driver.lastName,
                code: p1.entry.driver.code,
                countryCode: p1.entry.driver.countryCode,
                driverSlug: p1.entry.driver.slug,
                teamName: p1.entry.teamSeasonEntry.shortName,
                teamColor: p1.entry.teamSeasonEntry.primaryColor,
              }
            : null,
        };
      });
    },
    ["schedule-season", String(year)],
    [TAGS.schedule],
  );
}

export async function getGpDetail(year: number, gpSlug: string): Promise<GpDetail | null> {
  // Two-phase read so the detail cache entry can carry the TAGS.gp(id) tag.
  const stub = await cached(
    () =>
      db.query.grandsPrix.findFirst({
        columns: { id: true },
        where: (gp, { and, eq }) => and(eq(gp.seasonYear, year), eq(gp.slug, gpSlug)),
      }),
    ["gp-id", String(year), gpSlug],
    [TAGS.schedule],
  );
  if (!stub) return null;

  return cached(
    async () => {
      const gp = await db.query.grandsPrix.findFirst({
        where: (g, { eq }) => eq(g.id, stub.id),
        with: {
          circuit: true,
          sessions: { with: { results: { columns: { id: true }, limit: 1 } } },
        },
      });
      if (!gp) return null;
      return {
        id: gp.id,
        seasonYear: gp.seasonYear,
        round: gp.round,
        slug: gp.slug,
        name: gp.name,
        officialName: gp.officialName,
        startDate: gp.startDate,
        endDate: gp.endDate,
        hasSprint: gp.hasSprint,
        status: gp.status,
        circuit: {
          slug: gp.circuit.slug,
          name: gp.circuit.name,
          officialName: gp.circuit.officialName,
          locality: gp.circuit.locality,
          country: gp.circuit.country,
          countryCode: gp.circuit.countryCode,
          lengthKm: gp.circuit.lengthKm,
          raceLaps: gp.circuit.raceLaps,
          lapRecordTimeMs: gp.circuit.lapRecordTimeMs,
          lapRecordDriver: gp.circuit.lapRecordDriver,
          lapRecordYear: gp.circuit.lapRecordYear,
          firstGpYear: gp.circuit.firstGpYear,
          description: gp.circuit.description,
        },
        sessions: gp.sessions
          .map(
            (s): GpSessionInfo => ({
              id: s.id,
              type: s.type,
              status: s.status,
              startsAt: s.startsAt ? s.startsAt.toISOString() : null,
              endsAt: s.endsAt ? s.endsAt.toISOString() : null,
              hasResults: s.results.length > 0,
            }),
          )
          .sort((a, b) => SESSION_ORDER[a.type] - SESSION_ORDER[b.type]),
      } satisfies GpDetail;
    },
    ["gp-detail", stub.id],
    [TAGS.schedule, TAGS.gp(stub.id)],
  );
}

/* ── Results ─────────────────────────────────────────────────────────────── */

export type SeasonResultRow = {
  id: string;
  round: number;
  slug: string;
  name: string;
  circuitName: string;
  locality: string | null;
  countryCode: string | null;
  date: string | null;
  winner: WinnerInfo | null;
};

export function getSeasonRaceResults(year: number): Promise<SeasonResultRow[]> {
  return cached(
    async () => {
      const gps = await db.query.grandsPrix.findMany({
        where: (gp, { and, eq }) => and(eq(gp.seasonYear, year), eq(gp.status, "completed")),
        orderBy: (gp, { asc }) => [asc(gp.round)],
        with: {
          circuit: true,
          sessions: {
            where: (s, { eq }) => eq(s.type, "race"),
            with: {
              results: {
                where: (r, { eq }) => eq(r.position, 1),
                with: { entry: { with: { driver: true, teamSeasonEntry: true } } },
              },
            },
          },
        },
      });

      return gps.map((gp): SeasonResultRow => {
        const p1 = gp.sessions[0]?.results[0];
        return {
          id: gp.id,
          round: gp.round,
          slug: gp.slug,
          name: gp.name,
          circuitName: gp.circuit.name,
          locality: gp.circuit.locality,
          countryCode: gp.circuit.countryCode,
          date: gp.endDate ?? gp.startDate,
          winner: p1
            ? {
                firstName: p1.entry.driver.firstName,
                lastName: p1.entry.driver.lastName,
                code: p1.entry.driver.code,
                countryCode: p1.entry.driver.countryCode,
                driverSlug: p1.entry.driver.slug,
                teamName: p1.entry.teamSeasonEntry.shortName,
                teamColor: p1.entry.teamSeasonEntry.primaryColor,
              }
            : null,
        };
      });
    },
    ["results-season", String(year)],
    [TAGS.results],
  );
}

export type GpResultsContext = {
  id: string;
  seasonYear: number;
  round: number;
  slug: string;
  name: string;
  officialName: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  circuit: { name: string; locality: string | null; country: string; countryCode: string | null };
  sessions: GpSessionInfo[];
};

/** GP header + which of its sessions already have results (for tab bars). */
export function getGpResultsContext(year: number, gpSlug: string): Promise<GpResultsContext | null> {
  return cached(
    async () => {
      const gp = await db.query.grandsPrix.findFirst({
        where: (g, { and, eq }) => and(eq(g.seasonYear, year), eq(g.slug, gpSlug)),
        with: {
          circuit: true,
          sessions: { with: { results: { columns: { id: true }, limit: 1 } } },
        },
      });
      if (!gp) return null;
      return {
        id: gp.id,
        seasonYear: gp.seasonYear,
        round: gp.round,
        slug: gp.slug,
        name: gp.name,
        officialName: gp.officialName,
        status: gp.status,
        circuit: {
          name: gp.circuit.name,
          locality: gp.circuit.locality,
          country: gp.circuit.country,
          countryCode: gp.circuit.countryCode,
        },
        sessions: gp.sessions
          .map(
            (s): GpSessionInfo => ({
              id: s.id,
              type: s.type,
              status: s.status,
              startsAt: s.startsAt ? s.startsAt.toISOString() : null,
              endsAt: s.endsAt ? s.endsAt.toISOString() : null,
              hasResults: s.results.length > 0,
            }),
          )
          .sort((a, b) => SESSION_ORDER[a.type] - SESSION_ORDER[b.type]),
      } satisfies GpResultsContext;
    },
    ["results-gp", String(year), gpSlug],
    [TAGS.results],
  );
}

/** Full classification for one session, ordered by position (nulls last). */
export function getSessionClassification(sessionId: string): Promise<ClassificationRow[]> {
  return cached(
    async () => {
      const rows = await db.query.sessionResults.findMany({
        where: (r, { eq }) => eq(r.sessionId, sessionId),
        with: { entry: { with: { driver: true, teamSeasonEntry: true } } },
      });
      return rows
        .map(
          (r): ClassificationRow => ({
            id: r.id,
            position: r.position,
            status: r.status,
            gridPosition: r.gridPosition,
            laps: r.laps,
            timeMs: r.timeMs,
            gapMs: r.gapMs,
            lapsBehind: r.lapsBehind,
            q1TimeMs: r.q1TimeMs,
            q2TimeMs: r.q2TimeMs,
            q3TimeMs: r.q3TimeMs,
            points: r.points,
            fastestLap: r.fastestLap,
            carNumber: r.entry.carNumber,
            driver: {
              slug: r.entry.driver.slug,
              firstName: r.entry.driver.firstName,
              lastName: r.entry.driver.lastName,
              code: r.entry.driver.code,
              countryCode: r.entry.driver.countryCode,
            },
            team: {
              shortName: r.entry.teamSeasonEntry.shortName,
              color: r.entry.teamSeasonEntry.primaryColor,
            },
          }),
        )
        .sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
            (b.laps ?? 0) - (a.laps ?? 0) ||
            a.carNumber - b.carNumber,
        );
    },
    ["session-classification", sessionId],
    [TAGS.results, TAGS.resultsSession(sessionId)],
  );
}

/* ── Standings ───────────────────────────────────────────────────────────── */

export type DriverStandingRow = {
  position: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  driver: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    countryCode: string | null;
  };
  team: { shortName: string; color: string; teamSlug: string } | null;
};

export type DriverStandingsData = {
  computedThroughRound: number;
  rows: DriverStandingRow[];
};

export function getDriverStandingsForSeason(year: number): Promise<DriverStandingsData> {
  return cached(
    async () => {
      const [standings, entries] = await Promise.all([
        db.query.driverStandings.findMany({
          where: (s, { eq }) => eq(s.seasonYear, year),
          orderBy: (s, { asc }) => [asc(s.position)],
          with: { driver: true },
        }),
        db.query.driverSeasonEntries.findMany({
          where: (e, { eq }) => eq(e.seasonYear, year),
          with: { teamSeasonEntry: { with: { team: true } } },
        }),
      ]);

      // Latest entry per driver: highest fromRound wins (null = from round 1).
      const latestByDriver = new Map<string, (typeof entries)[number]>();
      for (const e of entries) {
        const prev = latestByDriver.get(e.driverId);
        if (!prev || (e.fromRound ?? 1) > (prev.fromRound ?? 1)) latestByDriver.set(e.driverId, e);
      }

      return {
        computedThroughRound: standings[0]?.computedThroughRound ?? 0,
        rows: standings.map((s): DriverStandingRow => {
          const entry = latestByDriver.get(s.driverId);
          return {
            position: s.position,
            points: s.points,
            wins: s.wins,
            podiums: s.podiums,
            poles: s.poles,
            driver: {
              slug: s.driver.slug,
              firstName: s.driver.firstName,
              lastName: s.driver.lastName,
              code: s.driver.code,
              countryCode: s.driver.countryCode,
            },
            team: entry
              ? {
                  shortName: entry.teamSeasonEntry.shortName,
                  color: entry.teamSeasonEntry.primaryColor,
                  teamSlug: entry.teamSeasonEntry.team.slug,
                }
              : null,
          };
        }),
      } satisfies DriverStandingsData;
    },
    ["driver-standings", String(year)],
    [TAGS.standings],
  );
}

export type ConstructorStandingRow = {
  position: number;
  points: number;
  wins: number;
  team: { displayName: string; shortName: string; color: string; teamSlug: string };
};

export type ConstructorStandingsData = {
  computedThroughRound: number;
  rows: ConstructorStandingRow[];
};

export function getConstructorStandingsForSeason(year: number): Promise<ConstructorStandingsData> {
  return cached(
    async () => {
      const standings = await db.query.constructorStandings.findMany({
        where: (s, { eq }) => eq(s.seasonYear, year),
        orderBy: (s, { asc }) => [asc(s.position)],
        with: { teamSeasonEntry: { with: { team: true } } },
      });
      return {
        computedThroughRound: standings[0]?.computedThroughRound ?? 0,
        rows: standings.map(
          (s): ConstructorStandingRow => ({
            position: s.position,
            points: s.points,
            wins: s.wins,
            team: {
              displayName: s.teamSeasonEntry.displayName,
              shortName: s.teamSeasonEntry.shortName,
              color: s.teamSeasonEntry.primaryColor,
              teamSlug: s.teamSeasonEntry.team.slug,
            },
          }),
        ),
      } satisfies ConstructorStandingsData;
    },
    ["constructor-standings", String(year)],
    [TAGS.standings],
  );
}

/* ── Drivers ─────────────────────────────────────────────────────────────── */

export type DriverIndexCard = {
  slug: string;
  firstName: string;
  lastName: string;
  code: string;
  countryCode: string | null;
  carNumber: number;
  teamName: string;
  teamColor: string;
  headshotPath: string | null;
  position: number | null;
  points: number;
};

export function getDriversIndex(year: number): Promise<DriverIndexCard[]> {
  return cached(
    async () => {
      const [entries, standings] = await Promise.all([
        db.query.driverSeasonEntries.findMany({
          where: (e, { eq }) => eq(e.seasonYear, year),
          with: { driver: { with: { headshot: true } }, teamSeasonEntry: true },
        }),
        db.query.driverStandings.findMany({ where: (s, { eq }) => eq(s.seasonYear, year) }),
      ]);

      const latestByDriver = new Map<string, (typeof entries)[number]>();
      for (const e of entries) {
        const prev = latestByDriver.get(e.driverId);
        if (!prev || (e.fromRound ?? 1) > (prev.fromRound ?? 1)) latestByDriver.set(e.driverId, e);
      }
      const standingByDriver = new Map(standings.map((s) => [s.driverId, s]));

      const cards = [...latestByDriver.values()].map((e): DriverIndexCard => {
        const standing = standingByDriver.get(e.driverId);
        return {
          slug: e.driver.slug,
          firstName: e.driver.firstName,
          lastName: e.driver.lastName,
          code: e.driver.code,
          countryCode: e.driver.countryCode,
          carNumber: e.carNumber,
          teamName: e.teamSeasonEntry.shortName,
          teamColor: e.teamSeasonEntry.primaryColor,
          headshotPath: e.driver.headshot?.path ?? null,
          position: standing?.position ?? null,
          points: standing?.points ?? 0,
        };
      });

      // Standings order first; drivers without a standing go last, alphabetically.
      cards.sort(
        (a, b) =>
          (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      );
      return cards;
    },
    ["drivers-index", String(year)],
    [TAGS.drivers, TAGS.standings],
  );
}

export type DriverSeasonResultRow = {
  round: number;
  gpName: string;
  gpSlug: string;
  seasonYear: number;
  gridPosition: number | null;
  position: number | null;
  status: "finished" | "dnf" | "dns" | "dsq" | "nc";
  points: number;
};

export type DriverDetail = {
  slug: string;
  firstName: string;
  lastName: string;
  code: string;
  countryCode: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  biography: string | null;
  headshotPath: string | null;
  isActive: boolean;
  current: {
    seasonYear: number;
    carNumber: number;
    teamName: string;
    teamColor: string;
    teamSlug: string;
  } | null;
  stats: {
    grandsPrixEntered: number;
    careerPoints: number;
    wins: number;
    podiums: number;
    poles: number;
    bestFinish: number | null;
  };
  seasonTable: { seasonYear: number; rows: DriverSeasonResultRow[] } | null;
};

export function getDriverDetail(slug: string): Promise<DriverDetail | null> {
  return cached(
    async () => {
      const driver = await db.query.drivers.findFirst({
        where: (d, { eq }) => eq(d.slug, slug),
        with: { headshot: true },
      });
      if (!driver) return null;

      const entries = await db.query.driverSeasonEntries.findMany({
        where: (e, { eq }) => eq(e.driverId, driver.id),
        with: {
          teamSeasonEntry: { with: { team: true } },
          results: { with: { session: { with: { grandPrix: true } } } },
        },
      });

      // Career stats, computed live from every session result.
      const allResults = entries.flatMap((e) => e.results);
      const raceResults = allResults.filter((r) => r.session.type === "race");
      const stats = {
        grandsPrixEntered: raceResults.length,
        careerPoints: allResults.reduce((sum, r) => sum + r.points, 0),
        wins: raceResults.filter((r) => r.position === 1).length,
        podiums: raceResults.filter((r) => r.position != null && r.position <= 3).length,
        poles: allResults.filter((r) => r.session.type === "qualifying" && r.position === 1).length,
        bestFinish: raceResults.reduce<number | null>(
          (best, r) => (r.position != null && (best == null || r.position < best) ? r.position : best),
          null,
        ),
      };

      // Current team = latest entry of the most recent season the driver has an entry for.
      const latestSeason = entries.reduce<number | null>(
        (max, e) => (max == null || e.seasonYear > max ? e.seasonYear : max),
        null,
      );
      let current: DriverDetail["current"] = null;
      if (latestSeason != null) {
        const seasonEntries = entries.filter((e) => e.seasonYear === latestSeason);
        const latest = seasonEntries.reduce((a, b) => ((b.fromRound ?? 1) > (a.fromRound ?? 1) ? b : a));
        current = {
          seasonYear: latestSeason,
          carNumber: latest.carNumber,
          teamName: latest.teamSeasonEntry.shortName,
          teamColor: latest.teamSeasonEntry.primaryColor,
          teamSlug: latest.teamSeasonEntry.team.slug,
        };
      }

      // Per-round race results of the most recent season the driver raced in.
      const racedSeasons = entries
        .filter((e) => e.results.some((r) => r.session.type === "race"))
        .map((e) => e.seasonYear);
      const tableSeason = racedSeasons.length ? Math.max(...racedSeasons) : null;
      let seasonTable: DriverDetail["seasonTable"] = null;
      if (tableSeason != null) {
        const rows = entries
          .filter((e) => e.seasonYear === tableSeason)
          .flatMap((e) => e.results)
          .filter((r) => r.session.type === "race")
          .map(
            (r): DriverSeasonResultRow => ({
              round: r.session.grandPrix.round,
              gpName: r.session.grandPrix.name,
              gpSlug: r.session.grandPrix.slug,
              seasonYear: r.session.grandPrix.seasonYear,
              gridPosition: r.gridPosition,
              position: r.position,
              status: r.status,
              points: r.points,
            }),
          )
          .sort((a, b) => a.round - b.round);
        seasonTable = { seasonYear: tableSeason, rows };
      }

      return {
        slug: driver.slug,
        firstName: driver.firstName,
        lastName: driver.lastName,
        code: driver.code,
        countryCode: driver.countryCode,
        dateOfBirth: driver.dateOfBirth,
        placeOfBirth: driver.placeOfBirth,
        biography: driver.biography,
        headshotPath: driver.headshot?.path ?? null,
        isActive: driver.isActive,
        current,
        stats,
        seasonTable,
      } satisfies DriverDetail;
    },
    ["driver-detail", slug],
    [TAGS.driver(slug), TAGS.results],
  );
}

/* ── Teams ───────────────────────────────────────────────────────────────── */

export type TeamIndexCard = {
  slug: string;
  displayName: string;
  shortName: string;
  color: string;
  position: number | null;
  points: number;
  drivers: { name: string; slug: string }[];
  carModel: string | null;
  powerUnit: string | null;
  base: string | null;
};

export function getTeamsIndex(year: number): Promise<TeamIndexCard[]> {
  return cached(
    async () => {
      const [entries, standings] = await Promise.all([
        db.query.teamSeasonEntries.findMany({
          where: (e, { eq }) => eq(e.seasonYear, year),
          with: { team: true, car: true, driverEntries: { with: { driver: true } } },
        }),
        db.query.constructorStandings.findMany({ where: (s, { eq }) => eq(s.seasonYear, year) }),
      ]);
      const standingByEntry = new Map(standings.map((s) => [s.teamSeasonEntryId, s]));

      const cards = entries.map((entry): TeamIndexCard => {
        const standing = standingByEntry.get(entry.id);
        // "Current" drivers = primary entries active at the round after the
        // last computed one (fromRound null = round 1, toRound null = end).
        const atRound = (standing?.computedThroughRound ?? 0) + 1;
        const active = entry.driverEntries
          .filter((d) => isEntryActiveAtRound(d, atRound))
          .sort((a, b) => (a.role === b.role ? a.carNumber - b.carNumber : a.role === "primary" ? -1 : 1))
          .slice(0, 2);
        return {
          slug: entry.team.slug,
          displayName: entry.displayName,
          shortName: entry.shortName,
          color: entry.primaryColor,
          position: standing?.position ?? null,
          points: standing?.points ?? 0,
          drivers: active.map((d) => ({
            name: `${d.driver.firstName} ${d.driver.lastName}`,
            slug: d.driver.slug,
          })),
          carModel: entry.car?.modelName ?? null,
          powerUnit: entry.car?.powerUnit ?? entry.powerUnitSupplier,
          base: entry.team.base,
        };
      });

      cards.sort(
        (a, b) =>
          (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
          a.displayName.localeCompare(b.displayName),
      );
      return cards;
    },
    ["teams-index", String(year)],
    [TAGS.teams, TAGS.standings],
  );
}

export type TeamSeasonHistoryRow = {
  seasonYear: number;
  displayName: string;
  carModel: string | null;
  position: number | null;
  points: number | null;
};

export type TeamDetail = {
  slug: string;
  name: string;
  fullName: string | null;
  base: string | null;
  countryCode: string | null;
  firstEntryYear: number | null;
  worldChampionships: number;
  description: string | null;
  current: {
    seasonYear: number;
    displayName: string;
    shortName: string;
    color: string;
    teamPrincipal: string | null;
    powerUnitSupplier: string | null;
    car: { modelName: string; chassis: string | null; powerUnit: string | null } | null;
    drivers: {
      slug: string;
      firstName: string;
      lastName: string;
      code: string;
      countryCode: string | null;
      carNumber: number;
    }[];
    standing: { position: number; points: number; computedThroughRound: number } | null;
  } | null;
  color: string;
  history: TeamSeasonHistoryRow[];
};

export function getTeamDetail(slug: string, currentYear: number): Promise<TeamDetail | null> {
  return cached(
    async () => {
      const team = await db.query.teams.findFirst({
        where: (t, { eq }) => eq(t.slug, slug),
        with: {
          seasonEntries: {
            orderBy: (e, { desc }) => [desc(e.seasonYear)],
            with: { car: true, driverEntries: { with: { driver: true } } },
          },
        },
      });
      if (!team) return null;

      const entryIds = team.seasonEntries.map((e) => e.id);
      const standings = entryIds.length
        ? await db.query.constructorStandings.findMany({
            where: (s, { inArray }) => inArray(s.teamSeasonEntryId, entryIds),
          })
        : [];
      const standingByEntry = new Map(standings.map((s) => [s.teamSeasonEntryId, s]));

      const currentEntry = team.seasonEntries.find((e) => e.seasonYear === currentYear) ?? null;
      let current: TeamDetail["current"] = null;
      if (currentEntry) {
        const standing = standingByEntry.get(currentEntry.id);
        const atRound = (standing?.computedThroughRound ?? 0) + 1;
        const active = currentEntry.driverEntries
          .filter((d) => isEntryActiveAtRound(d, atRound))
          .sort((a, b) => (a.role === b.role ? a.carNumber - b.carNumber : a.role === "primary" ? -1 : 1));
        current = {
          seasonYear: currentEntry.seasonYear,
          displayName: currentEntry.displayName,
          shortName: currentEntry.shortName,
          color: currentEntry.primaryColor,
          teamPrincipal: currentEntry.teamPrincipal,
          powerUnitSupplier: currentEntry.powerUnitSupplier,
          car: currentEntry.car
            ? {
                modelName: currentEntry.car.modelName,
                chassis: currentEntry.car.chassis,
                powerUnit: currentEntry.car.powerUnit,
              }
            : null,
          drivers: active.map((d) => ({
            slug: d.driver.slug,
            firstName: d.driver.firstName,
            lastName: d.driver.lastName,
            code: d.driver.code,
            countryCode: d.driver.countryCode,
            carNumber: d.carNumber,
          })),
          standing: standing
            ? {
                position: standing.position,
                points: standing.points,
                computedThroughRound: standing.computedThroughRound,
              }
            : null,
        };
      }

      return {
        slug: team.slug,
        name: team.name,
        fullName: team.fullName,
        base: team.base,
        countryCode: team.countryCode,
        firstEntryYear: team.firstEntryYear,
        worldChampionships: team.worldChampionships,
        description: team.description,
        current,
        color: current?.color ?? team.seasonEntries[0]?.primaryColor ?? "#67676d",
        history: team.seasonEntries.map(
          (e): TeamSeasonHistoryRow => ({
            seasonYear: e.seasonYear,
            displayName: e.displayName,
            carModel: e.car?.modelName ?? null,
            position: standingByEntry.get(e.id)?.position ?? null,
            points: standingByEntry.get(e.id)?.points ?? null,
          }),
        ),
      } satisfies TeamDetail;
    },
    ["team-detail", slug, String(currentYear)],
    [TAGS.team(slug)],
  );
}
