import { and, desc, eq } from "drizzle-orm";
import {
  championships,
  championshipSeasons,
  db,
  driverStandings,
  findChampionshipSeason,
  formatGap,
  TAGS,
} from "@ctr/db";
import { cached } from "@/lib/cache";
import { SESSION_ORDER, type SessionType } from "./meta";

/** The championship this site is "home" to — all year-based reads resolve
 *  their championshipSeasonId against this slug. */
export const HOME_CHAMPIONSHIP = "incrc";

/* ══════════════════════════════════════════════════════════════════════════
   Cached read layer for the racing section (schedule / results / standings /
   drivers / teams) — multi-class INCRC model: every session, standings row
   and driver entry belongs to a race category. Every function returns plain
   serialisable objects so the shapes survive the unstable_cache JSON
   round-trip (timestamps become ISO strings here, never raw Date objects).
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Shared shapes ───────────────────────────────────────────────────────── */

export type CategoryInfo = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  carSpec: string | null;
  description: string | null;
  sort: number;
};

export type SessionCategoryRef = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  sort: number;
};

/** media.id → media.path lookup (circuits have no `photo` relation, so photo
 *  and map paths are resolved manually inside the cache boundary). */
async function mediaPathsByIds(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (!wanted.length) return new Map();
  const rows = await db.query.media.findMany({
    where: (m, { inArray }) => inArray(m.id, wanted),
    columns: { id: true, path: true },
  });
  return new Map(rows.map((r) => [r.id, r.path]));
}

/** Latest entry per key: highest fromRound wins (null = from round 1). */
function keepLatest<T extends { fromRound: number | null }>(
  map: Map<string, T>,
  key: string,
  entry: T,
): void {
  const prev = map.get(key);
  if (!prev || (entry.fromRound ?? 1) > (prev.fromRound ?? 1)) map.set(key, entry);
}

/* ── Categories ──────────────────────────────────────────────────────────── */

/** The championship's active race categories, in display order. */
export function getCategories(): Promise<CategoryInfo[]> {
  return cached(
    async () => {
      const rows = await db.query.raceCategories.findMany({
        where: (c, { eq }) => eq(c.isActive, true),
        orderBy: (c, { asc }) => [asc(c.sort), asc(c.name)],
      });
      return rows.map(
        (c): CategoryInfo => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          shortName: c.shortName,
          color: c.color,
          carSpec: c.carSpec,
          description: c.description,
          sort: c.sort,
        }),
      );
    },
    ["racing-categories"],
    [TAGS.categories],
    3600,
  );
}

/* ── Seasons ─────────────────────────────────────────────────────────────── */

/** All home-championship season years, newest first (shared by every season
 *  selector). */
export function getSeasonYears(): Promise<number[]> {
  return cached(
    async () => {
      const rows = await db
        .select({ year: championshipSeasons.year })
        .from(championshipSeasons)
        .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
        .where(eq(championships.slug, HOME_CHAMPIONSHIP))
        .orderBy(desc(championshipSeasons.year));
      return rows.map((r) => r.year);
    },
    ["racing-season-years"],
    [TAGS.schedule, TAGS.results, TAGS.standings],
    3600,
  );
}

/** year → championshipSeason of the home championship (id + its configured
 *  standings tables). Callers translate public plain-year URLs through this. */
async function findHomeSeason(
  year: number,
): Promise<{ id: string; standingsTypes: string[] } | null> {
  const [row] = await db
    .select({ id: championshipSeasons.id, standingsTypes: championshipSeasons.standingsTypes })
    .from(championshipSeasons)
    .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
    .where(and(eq(championships.slug, HOME_CHAMPIONSHIP), eq(championshipSeasons.year, year)));
  return row ?? null;
}

/* ── Schedule ────────────────────────────────────────────────────────────── */

export type PodiumLine = {
  position: number;
  code: string;
  driverSlug: string;
  gap: string;
};

export type ScheduleGp = {
  id: string;
  round: number;
  slug: string;
  name: string;
  officialName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  circuit: {
    name: string;
    locality: string | null;
    country: string;
    countryCode: string | null;
    photoPath: string | null;
    mapPath: string | null;
  };
  /** Earliest Race 1 start of the weekend — the "lights out" countdown target. */
  firstRaceStartsAt: string | null;
  /** Flagship-category podium — only present once the round is completed. */
  podium: {
    categoryShortName: string;
    categoryColor: string;
    lines: PodiumLine[];
  } | null;
};

export function getScheduleForSeason(year: number): Promise<ScheduleGp[]> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return [];

      const gps = await db.query.rounds.findMany({
        where: (r, { eq: whereEq }) => whereEq(r.championshipSeasonId, season.id),
        orderBy: (r, { asc }) => [asc(r.round)],
        with: {
          circuit: true,
          sessions: {
            where: (s, { eq: whereEq }) => whereEq(s.type, "race"),
            with: {
              category: true,
              results: {
                where: (r, { and: whereAnd, isNotNull, lte }) =>
                  whereAnd(isNotNull(r.position), lte(r.position, 3)),
                with: { entry: { with: { driver: true } } },
              },
            },
          },
        },
      });

      const paths = await mediaPathsByIds(
        gps.flatMap((gp) => [gp.circuit.photoMediaId, gp.circuit.mapMediaId]),
      );

      return gps.map((gp): ScheduleGp => {
        // Sessions here are race sessions only — the earliest is Race 1.
        const raceStarts = gp.sessions
          .filter((s) => s.startsAt)
          .map((s) => (s.startsAt as Date).getTime());
        const firstMs = raceStarts.length ? Math.min(...raceStarts) : null;

        let podium: ScheduleGp["podium"] = null;
        if (gp.status === "completed") {
          const flagship = [...gp.sessions]
            .filter((s) => s.results.length > 0)
            .sort(
              (a, b) =>
                (a.category?.sort ?? 999) - (b.category?.sort ?? 999) || a.sequence - b.sequence,
            )[0];
          if (flagship) {
            podium = {
              categoryShortName: flagship.category?.shortName ?? "",
              categoryColor: flagship.category?.color ?? "#f7d619",
              lines: [...flagship.results]
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                .slice(0, 3)
                .map(
                  (r): PodiumLine => ({
                    position: r.position ?? 0,
                    code: r.entry.driver.code,
                    driverSlug: r.entry.driver.slug,
                    gap: formatGap({
                      position: r.position,
                      status: r.status,
                      gapMs: r.gapMs,
                      lapsBehind: r.lapsBehind,
                      timeMs: r.timeMs,
                    }),
                  }),
                ),
            };
          }
        }

        return {
          id: gp.id,
          round: gp.round,
          slug: gp.slug,
          name: gp.name,
          officialName: gp.officialName,
          startDate: gp.startDate,
          endDate: gp.endDate,
          status: gp.status,
          circuit: {
            name: gp.circuit.name,
            locality: gp.circuit.locality,
            country: gp.circuit.country,
            countryCode: gp.circuit.countryCode,
            photoPath: gp.circuit.photoMediaId
              ? (paths.get(gp.circuit.photoMediaId) ?? null)
              : null,
            mapPath: gp.circuit.mapMediaId ? (paths.get(gp.circuit.mapMediaId) ?? null) : null,
          },
          firstRaceStartsAt: firstMs != null ? new Date(firstMs).toISOString() : null,
          podium,
        };
      });
    },
    ["schedule-season", String(year)],
    [TAGS.schedule, TAGS.results, TAGS.categories],
  );
}

/* ── Round (GP) detail ───────────────────────────────────────────────────── */

export type GpSessionInfo = {
  id: string;
  type: SessionType;
  /** Race 1 / Race 2 = type "race", sequence 1 / 2. */
  sequence: number;
  label: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  startsAt: string | null;
  endsAt: string | null;
  hasResults: boolean;
  category: SessionCategoryRef | null;
  /** Official signed classification PDF (S3 key + display name), when published. */
  declaration: { path: string; filename: string } | null;
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
  status: "scheduled" | "live" | "completed" | "cancelled";
  heroPath: string | null;
  circuit: {
    slug: string;
    name: string;
    officialName: string | null;
    locality: string | null;
    country: string;
    countryCode: string | null;
    lengthKm: number | null;
    raceLaps: number | null;
    turns: number | null;
    direction: string | null;
    fiaGrade: string | null;
    owner: string | null;
    website: string | null;
    lapRecordTimeMs: number | null;
    lapRecordDriver: string | null;
    lapRecordYear: number | null;
    firstGpYear: number | null;
    description: string | null;
    photoPath: string | null;
    mapPath: string | null;
  };
  sessions: GpSessionInfo[];
  hasAnyResults: boolean;
  /** Earliest Race 1 start — countdown target for empty result states. */
  firstRaceStartsAt: string | null;
};

export async function getGpDetail(year: number, gpSlug: string): Promise<GpDetail | null> {
  // Two-phase read so the detail cache entry can carry the TAGS.gp(id) tag.
  const stub = await cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return null;
      const round = await db.query.rounds.findFirst({
        columns: { id: true },
        where: (r, { and: whereAnd, eq: whereEq }) =>
          whereAnd(whereEq(r.championshipSeasonId, season.id), whereEq(r.slug, gpSlug)),
      });
      return round ?? null;
    },
    ["gp-id", String(year), gpSlug],
    [TAGS.schedule],
  );
  if (!stub) return null;

  return cached(
    async () => {
      const gp = await db.query.rounds.findFirst({
        where: (r, { eq: whereEq }) => whereEq(r.id, stub.id),
        with: {
          circuit: true,
          heroImage: true,
          sessions: {
            with: {
              category: true,
              results: { columns: { id: true }, limit: 1 },
              declarationDocument: { columns: { path: true, filename: true } },
            },
          },
        },
      });
      if (!gp) return null;

      const paths = await mediaPathsByIds([gp.circuit.photoMediaId, gp.circuit.mapMediaId]);

      const sessions = gp.sessions
        .map(
          (s): GpSessionInfo => ({
            id: s.id,
            type: s.type,
            sequence: s.sequence,
            label: s.label,
            status: s.status,
            startsAt: s.startsAt ? s.startsAt.toISOString() : null,
            endsAt: s.endsAt ? s.endsAt.toISOString() : null,
            hasResults: s.results.length > 0,
            category: s.category
              ? {
                  id: s.category.id,
                  slug: s.category.slug,
                  name: s.category.name,
                  shortName: s.category.shortName,
                  color: s.category.color,
                  sort: s.category.sort,
                }
              : null,
            declaration: s.declarationDocument
              ? { path: s.declarationDocument.path, filename: s.declarationDocument.filename }
              : null,
          }),
        )
        .sort(
          (a, b) =>
            (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999") ||
            SESSION_ORDER[a.type] - SESSION_ORDER[b.type] ||
            a.sequence - b.sequence ||
            (a.category?.sort ?? 999) - (b.category?.sort ?? 999),
        );

      const raceStarts = sessions
        .filter((s) => s.type === "race" && s.startsAt)
        .map((s) => s.startsAt as string)
        .sort();

      return {
        id: gp.id,
        seasonYear: year,
        round: gp.round,
        slug: gp.slug,
        name: gp.name,
        officialName: gp.officialName,
        startDate: gp.startDate,
        endDate: gp.endDate,
        status: gp.status,
        heroPath: gp.heroImage?.path ?? null,
        circuit: {
          slug: gp.circuit.slug,
          name: gp.circuit.name,
          officialName: gp.circuit.officialName,
          locality: gp.circuit.locality,
          country: gp.circuit.country,
          countryCode: gp.circuit.countryCode,
          lengthKm: gp.circuit.lengthKm,
          raceLaps: gp.circuit.raceLaps,
          turns: gp.circuit.turns,
          direction: gp.circuit.direction,
          fiaGrade: gp.circuit.fiaGrade,
          owner: gp.circuit.owner,
          website: gp.circuit.website,
          lapRecordTimeMs: gp.circuit.lapRecordTimeMs,
          lapRecordDriver: gp.circuit.lapRecordDriver,
          lapRecordYear: gp.circuit.lapRecordYear,
          firstGpYear: gp.circuit.firstGpYear,
          description: gp.circuit.description,
          photoPath: gp.circuit.photoMediaId
            ? (paths.get(gp.circuit.photoMediaId) ?? null)
            : null,
          mapPath: gp.circuit.mapMediaId ? (paths.get(gp.circuit.mapMediaId) ?? null) : null,
        },
        sessions,
        hasAnyResults: sessions.some((s) => s.hasResults),
        firstRaceStartsAt: raceStarts[0] ?? null,
      } satisfies GpDetail;
    },
    ["gp-detail", stub.id],
    [TAGS.schedule, TAGS.results, TAGS.gp(stub.id)],
  );
}

/* ── Results ─────────────────────────────────────────────────────────────── */

export type SeasonRoundRow = {
  id: string;
  round: number;
  slug: string;
  name: string;
  circuitName: string;
  locality: string | null;
  countryCode: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  hasResults: boolean;
};

/** Every round of a season with its status — the /results/[year] table. */
export function getSeasonRounds(year: number): Promise<SeasonRoundRow[]> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return [];
      const gps = await db.query.rounds.findMany({
        where: (r, { eq: whereEq }) => whereEq(r.championshipSeasonId, season.id),
        orderBy: (r, { asc }) => [asc(r.round)],
        with: {
          circuit: true,
          sessions: { with: { results: { columns: { id: true }, limit: 1 } } },
        },
      });
      return gps.map(
        (gp): SeasonRoundRow => ({
          id: gp.id,
          round: gp.round,
          slug: gp.slug,
          name: gp.name,
          circuitName: gp.circuit.name,
          locality: gp.circuit.locality,
          countryCode: gp.circuit.countryCode,
          startDate: gp.startDate,
          endDate: gp.endDate,
          status: gp.status,
          hasResults: gp.sessions.some((s) => s.results.length > 0),
        }),
      );
    },
    ["results-rounds", String(year)],
    [TAGS.results, TAGS.schedule],
  );
}

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
  fastestLapTimeMs: number | null;
  carNumber: number;
  driver: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    countryCode: string | null;
    headshotPath: string | null;
  };
  team: { shortName: string; color: string; logoPath: string | null };
};

/** Full classification for one session, ordered by position (nulls last). */
export function getSessionClassification(sessionId: string): Promise<ClassificationRow[]> {
  return cached(
    async () => {
      const rows = await db.query.sessionResults.findMany({
        where: (r, { eq }) => eq(r.sessionId, sessionId),
        with: {
          entry: {
            with: {
              driver: { with: { headshot: true } },
              teamSeasonEntry: { with: { team: { with: { logo: true } } } },
            },
          },
        },
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
            fastestLapTimeMs: r.fastestLapTimeMs,
            carNumber: r.entry.carNumber,
            driver: {
              slug: r.entry.driver.slug,
              firstName: r.entry.driver.firstName,
              lastName: r.entry.driver.lastName,
              code: r.entry.driver.code,
              countryCode: r.entry.driver.countryCode,
              headshotPath: r.entry.driver.headshot?.path ?? null,
            },
            team: {
              shortName: r.entry.teamSeasonEntry.shortName,
              color: r.entry.teamSeasonEntry.primaryColor,
              logoPath: r.entry.teamSeasonEntry.team.logo?.path ?? null,
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

/* ── Standings (per category) ────────────────────────────────────────────── */

export type DriverStandingRow = {
  position: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  carNumber: number | null;
  driver: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    countryCode: string | null;
    headshotPath: string | null;
  };
  team: { shortName: string; color: string; teamSlug: string; logoPath: string | null } | null;
};

export type DriverStandingsData = {
  computedThroughRound: number;
  rows: DriverStandingRow[];
};

/** Extra standings tables (beyond overall/team) with rows for this category —
 *  e.g. Levitas Cup runs "rookie" and "gentlemen" classifications. Ordered as
 *  configured on the championship season. */
export function getStandingsSubTypes(year: number, categoryId: string): Promise<string[]> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return [];
      const rows = await db
        .selectDistinct({ standingsType: driverStandings.standingsType })
        .from(driverStandings)
        .where(
          and(
            eq(driverStandings.championshipSeasonId, season.id),
            eq(driverStandings.categoryId, categoryId),
          ),
        );
      const order = season.standingsTypes.map((t) => t.toLowerCase());
      return rows
        .map((r) => r.standingsType)
        .filter((t) => t !== "overall" && t !== "team")
        .sort((a, b) => {
          const ai = order.indexOf(a);
          const bi = order.indexOf(b);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
        });
    },
    ["standings-sub-types", String(year), categoryId],
    [TAGS.standings],
  );
}

export function getDriverStandingsForSeason(
  year: number,
  categoryId: string,
  standingsType = "overall",
): Promise<DriverStandingsData> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return { computedThroughRound: 0, rows: [] } satisfies DriverStandingsData;

      const [standings, entries] = await Promise.all([
        db.query.driverStandings.findMany({
          where: (s, { and: whereAnd, eq: whereEq }) =>
            whereAnd(
              whereEq(s.championshipSeasonId, season.id),
              whereEq(s.categoryId, categoryId),
              whereEq(s.standingsType, standingsType),
            ),
          orderBy: (s, { asc }) => [asc(s.position)],
          with: { driver: { with: { headshot: true } } },
        }),
        db.query.driverSeasonEntries.findMany({
          where: (e, { and: whereAnd, eq: whereEq }) =>
            whereAnd(whereEq(e.championshipSeasonId, season.id), whereEq(e.categoryId, categoryId)),
          with: { teamSeasonEntry: { with: { team: { with: { logo: true } } } } },
        }),
      ]);

      const latestByDriver = new Map<string, (typeof entries)[number]>();
      for (const e of entries) keepLatest(latestByDriver, e.driverId, e);

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
            carNumber: entry?.carNumber ?? null,
            driver: {
              slug: s.driver.slug,
              firstName: s.driver.firstName,
              lastName: s.driver.lastName,
              code: s.driver.code,
              countryCode: s.driver.countryCode,
              headshotPath: s.driver.headshot?.path ?? null,
            },
            team: entry
              ? {
                  shortName: entry.teamSeasonEntry.shortName,
                  color: entry.teamSeasonEntry.primaryColor,
                  teamSlug: entry.teamSeasonEntry.team.slug,
                  logoPath: entry.teamSeasonEntry.team.logo?.path ?? null,
                }
              : null,
          };
        }),
      } satisfies DriverStandingsData;
    },
    ["driver-standings", String(year), categoryId, standingsType],
    [TAGS.standings],
  );
}

export type ConstructorStandingRow = {
  position: number;
  points: number;
  wins: number;
  team: {
    displayName: string;
    shortName: string;
    color: string;
    teamSlug: string;
    logoPath: string | null;
  };
};

export type ConstructorStandingsData = {
  computedThroughRound: number;
  rows: ConstructorStandingRow[];
};

export function getConstructorStandingsForSeason(
  year: number,
  categoryId: string,
): Promise<ConstructorStandingsData> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return { computedThroughRound: 0, rows: [] } satisfies ConstructorStandingsData;

      const standings = await db.query.constructorStandings.findMany({
        where: (s, { and: whereAnd, eq: whereEq }) =>
          whereAnd(
            whereEq(s.championshipSeasonId, season.id),
            whereEq(s.categoryId, categoryId),
            whereEq(s.standingsType, "team"),
          ),
        orderBy: (s, { asc }) => [asc(s.position)],
        with: { teamSeasonEntry: { with: { team: { with: { logo: true } } } } },
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
              logoPath: s.teamSeasonEntry.team.logo?.path ?? null,
            },
          }),
        ),
      } satisfies ConstructorStandingsData;
    },
    ["constructor-standings", String(year), categoryId],
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
};

export type CategoryDriverGroup = {
  category: CategoryInfo;
  drivers: DriverIndexCard[];
};

/** The season's entry list grouped by category (categories in display order,
 *  drivers by car number). Categories without entries are omitted. */
export function getDriversByCategory(year: number): Promise<CategoryDriverGroup[]> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return [];
      const [categories, entries] = await Promise.all([
        db.query.raceCategories.findMany({
          where: (c, { eq: whereEq }) => whereEq(c.isActive, true),
          orderBy: (c, { asc }) => [asc(c.sort), asc(c.name)],
        }),
        db.query.driverSeasonEntries.findMany({
          where: (e, { eq: whereEq }) => whereEq(e.championshipSeasonId, season.id),
          with: { driver: { with: { headshot: true } }, teamSeasonEntry: true },
        }),
      ]);

      const latest = new Map<string, (typeof entries)[number]>();
      for (const e of entries) {
        if (!e.categoryId) continue;
        keepLatest(latest, `${e.categoryId}:${e.driverId}`, e);
      }

      const byCategory = new Map<string, DriverIndexCard[]>();
      for (const e of latest.values()) {
        const card: DriverIndexCard = {
          slug: e.driver.slug,
          firstName: e.driver.firstName,
          lastName: e.driver.lastName,
          code: e.driver.code,
          countryCode: e.driver.countryCode,
          carNumber: e.carNumber,
          teamName: e.teamSeasonEntry.shortName,
          teamColor: e.teamSeasonEntry.primaryColor,
          headshotPath: e.driver.headshot?.path ?? null,
        };
        const list = byCategory.get(e.categoryId as string) ?? [];
        list.push(card);
        byCategory.set(e.categoryId as string, list);
      }

      return categories
        .map((c): CategoryDriverGroup => {
          const drivers = (byCategory.get(c.id) ?? []).sort(
            (a, b) =>
              a.carNumber - b.carNumber ||
              a.lastName.localeCompare(b.lastName) ||
              a.firstName.localeCompare(b.firstName),
          );
          return {
            category: {
              id: c.id,
              slug: c.slug,
              name: c.name,
              shortName: c.shortName,
              color: c.color,
              carSpec: c.carSpec,
              description: c.description,
              sort: c.sort,
            },
            drivers,
          };
        })
        .filter((g) => g.drivers.length > 0);
    },
    ["drivers-by-category", String(year)],
    [TAGS.drivers, TAGS.categories],
  );
}

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
    category: { slug: string; name: string; shortName: string; color: string } | null;
  } | null;
  /** Current-season form (standings snapshot + race count). */
  season: {
    year: number;
    position: number | null;
    points: number;
    races: number;
    wins: number;
    podiums: number;
    poles: number;
    computedThroughRound: number;
  } | null;
  /** All-time numbers, computed live from every session result. */
  career: {
    grandsPrixEntered: number;
    careerPoints: number;
    wins: number;
    podiums: number;
    poles: number;
    bestFinish: number | null;
  };
  teammates: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    carNumber: number;
    headshotPath: string | null;
  }[];
};

/** Race-like session types — every "race" regardless of sequence, plus sprints. */
const RACE_TYPES: readonly SessionType[] = ["race", "sprint"];

export function getDriverDetail(slug: string): Promise<DriverDetail | null> {
  return cached(
    async () => {
      const driver = await db.query.drivers.findFirst({
        where: (d, { eq: whereEq }) => whereEq(d.slug, slug),
        with: { headshot: true },
      });
      if (!driver) return null;

      const entries = await db.query.driverSeasonEntries.findMany({
        where: (e, { eq: whereEq }) => whereEq(e.driverId, driver.id),
        with: {
          category: true,
          championshipSeason: { columns: { id: true, year: true } },
          teamSeasonEntry: { with: { team: true } },
          results: { with: { session: { with: { round: true } } } },
        },
      });

      // Career stats — every race (any sequence) counts.
      const allResults = entries.flatMap((e) => e.results);
      const raceResults = allResults.filter((r) =>
        RACE_TYPES.includes(r.session.type as SessionType),
      );
      const career = {
        grandsPrixEntered: new Set(raceResults.map((r) => r.session.roundId)).size,
        careerPoints: allResults.reduce((sum, r) => sum + r.points, 0),
        wins: raceResults.filter((r) => r.position === 1).length,
        podiums: raceResults.filter((r) => r.position != null && r.position <= 3).length,
        poles: allResults.filter((r) => r.session.type === "qualifying" && r.position === 1)
          .length,
        bestFinish: raceResults.reduce<number | null>(
          (best, r) =>
            r.position != null && (best == null || r.position < best) ? r.position : best,
          null,
        ),
      };

      // Current entry = latest entry of the most recent season.
      const latestSeason = entries.reduce<number | null>(
        (max, e) => (max == null || e.championshipSeason.year > max ? e.championshipSeason.year : max),
        null,
      );
      let current: DriverDetail["current"] = null;
      let season: DriverDetail["season"] = null;
      let teammates: DriverDetail["teammates"] = [];

      if (latestSeason != null) {
        const seasonEntries = entries.filter((e) => e.championshipSeason.year === latestSeason);
        const latest = seasonEntries.reduce((a, b) =>
          (b.fromRound ?? 1) > (a.fromRound ?? 1) ? b : a,
        );
        current = {
          seasonYear: latestSeason,
          carNumber: latest.carNumber,
          teamName: latest.teamSeasonEntry.shortName,
          teamColor: latest.teamSeasonEntry.primaryColor,
          teamSlug: latest.teamSeasonEntry.team.slug,
          category: latest.category
            ? {
                slug: latest.category.slug,
                name: latest.category.name,
                shortName: latest.category.shortName,
                color: latest.category.color,
              }
            : null,
        };

        const standing = await db.query.driverStandings.findFirst({
          where: (s, { and: whereAnd, eq: whereEq, isNull }) =>
            whereAnd(
              whereEq(s.championshipSeasonId, latest.championshipSeasonId),
              whereEq(s.driverId, driver.id),
              whereEq(s.standingsType, "overall"),
              latest.categoryId
                ? whereEq(s.categoryId, latest.categoryId)
                : isNull(s.categoryId),
            ),
        });
        const seasonRaces = seasonEntries
          .flatMap((e) => e.results)
          .filter((r) => RACE_TYPES.includes(r.session.type as SessionType)).length;
        season = {
          year: latestSeason,
          position: standing?.position ?? null,
          points: standing?.points ?? 0,
          races: seasonRaces,
          wins: standing?.wins ?? 0,
          podiums: standing?.podiums ?? 0,
          poles: standing?.poles ?? 0,
          computedThroughRound: standing?.computedThroughRound ?? 0,
        };

        const mateEntries = await db.query.driverSeasonEntries.findMany({
          where: (e, { and: whereAnd, eq: whereEq, ne, isNull }) =>
            whereAnd(
              whereEq(e.teamSeasonEntryId, latest.teamSeasonEntryId),
              whereEq(e.championshipSeasonId, latest.championshipSeasonId),
              latest.categoryId
                ? whereEq(e.categoryId, latest.categoryId)
                : isNull(e.categoryId),
              ne(e.driverId, driver.id),
            ),
          with: { driver: { with: { headshot: true } } },
        });
        const uniqueMates = new Map<string, (typeof mateEntries)[number]>();
        for (const m of mateEntries) keepLatest(uniqueMates, m.driverId, m);
        teammates = [...uniqueMates.values()]
          .sort((a, b) => a.carNumber - b.carNumber)
          .map((m) => ({
            slug: m.driver.slug,
            firstName: m.driver.firstName,
            lastName: m.driver.lastName,
            code: m.driver.code,
            carNumber: m.carNumber,
            headshotPath: m.driver.headshot?.path ?? null,
          }));
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
        season,
        career,
        teammates,
      } satisfies DriverDetail;
    },
    ["driver-detail", slug],
    [TAGS.driver(slug), TAGS.results, TAGS.standings],
  );
}

/* ── Teams ───────────────────────────────────────────────────────────────── */

export type TeamIndexCard = {
  slug: string;
  displayName: string;
  shortName: string;
  color: string;
  base: string | null;
  principal: string | null;
  driverCount: number;
  /** Line-up shown as chips on the team card (one entry per driver). */
  drivers: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    carNumber: number;
    headshotPath: string | null;
  }[];
  categories: { slug: string; shortName: string; color: string; sort: number }[];
};

export function getTeamsIndex(year: number): Promise<TeamIndexCard[]> {
  return cached(
    async () => {
      const season = await findHomeSeason(year);
      if (!season) return [];
      const entries = await db.query.teamSeasonEntries.findMany({
        where: (e, { eq: whereEq }) => whereEq(e.championshipSeasonId, season.id),
        with: {
          team: true,
          driverEntries: {
            with: { category: true, driver: { with: { headshot: true } } },
          },
        },
      });

      const cards = entries.map((entry): TeamIndexCard => {
        const categories = new Map<
          string,
          { slug: string; shortName: string; color: string; sort: number }
        >();
        // One chip per driver — the latest entry wins when a driver switched
        // seats mid-season.
        const byDriver = new Map<string, (typeof entry.driverEntries)[number]>();
        for (const d of entry.driverEntries) {
          keepLatest(byDriver, d.driverId, d);
          if (d.category) {
            categories.set(d.category.id, {
              slug: d.category.slug,
              shortName: d.category.shortName,
              color: d.category.color,
              sort: d.category.sort,
            });
          }
        }
        return {
          slug: entry.team.slug,
          displayName: entry.displayName,
          shortName: entry.shortName,
          color: entry.primaryColor,
          base: entry.team.base,
          principal: entry.teamPrincipal,
          driverCount: byDriver.size,
          drivers: [...byDriver.values()]
            .sort((a, b) => a.carNumber - b.carNumber)
            .map((d) => ({
              slug: d.driver.slug,
              firstName: d.driver.firstName,
              lastName: d.driver.lastName,
              code: d.driver.code,
              carNumber: d.carNumber,
              headshotPath: d.driver.headshot?.path ?? null,
            })),
          categories: [...categories.values()].sort((a, b) => a.sort - b.sort),
        };
      });

      cards.sort(
        (a, b) => b.driverCount - a.driverCount || a.displayName.localeCompare(b.displayName),
      );
      return cards;
    },
    ["teams-index", String(year)],
    [TAGS.teams, TAGS.categories],
  );
}

export type TeamCategoryGroup = {
  category: { slug: string; name: string; shortName: string; color: string; sort: number };
  standing: { position: number; points: number; computedThroughRound: number } | null;
  drivers: {
    slug: string;
    firstName: string;
    lastName: string;
    code: string;
    countryCode: string | null;
    carNumber: number;
    headshotPath: string | null;
  }[];
};

export type TeamDetail = {
  slug: string;
  name: string;
  fullName: string | null;
  base: string | null;
  countryCode: string | null;
  firstEntryYear: number | null;
  description: string | null;
  seasonYear: number;
  displayName: string | null;
  shortName: string | null;
  color: string;
  secondaryColor: string | null;
  teamPrincipal: string | null;
  logoPath: string | null;
  groups: TeamCategoryGroup[];
};

export function getTeamDetail(slug: string, currentYear: number): Promise<TeamDetail | null> {
  return cached(
    async () => {
      const season = await findHomeSeason(currentYear);
      const team = await db.query.teams.findFirst({
        where: (t, { eq: whereEq }) => whereEq(t.slug, slug),
        with: {
          logo: true,
          seasonEntries: {
            where: (e, { eq: whereEq, sql }) =>
              season ? whereEq(e.championshipSeasonId, season.id) : sql`false`,
            with: {
              driverEntries: {
                with: { driver: { with: { headshot: true } }, category: true },
              },
            },
          },
        },
      });
      if (!team) return null;

      const entry = team.seasonEntries[0] ?? null;
      let groups: TeamCategoryGroup[] = [];

      if (entry) {
        const standings = await db.query.constructorStandings.findMany({
          where: (s, { and: whereAnd, eq: whereEq }) =>
            whereAnd(
              whereEq(s.championshipSeasonId, entry.championshipSeasonId),
              whereEq(s.teamSeasonEntryId, entry.id),
              whereEq(s.standingsType, "team"),
            ),
        });
        const standingByCategory = new Map(
          standings.filter((s) => s.categoryId).map((s) => [s.categoryId as string, s]),
        );

        const latest = new Map<string, (typeof entry.driverEntries)[number]>();
        for (const d of entry.driverEntries) {
          if (!d.categoryId) continue;
          keepLatest(latest, `${d.categoryId}:${d.driverId}`, d);
        }

        const byCategory = new Map<string, TeamCategoryGroup>();
        for (const d of latest.values()) {
          if (!d.category) continue;
          let group = byCategory.get(d.category.id);
          if (!group) {
            const standing = standingByCategory.get(d.category.id);
            group = {
              category: {
                slug: d.category.slug,
                name: d.category.name,
                shortName: d.category.shortName,
                color: d.category.color,
                sort: d.category.sort,
              },
              standing: standing
                ? {
                    position: standing.position,
                    points: standing.points,
                    computedThroughRound: standing.computedThroughRound,
                  }
                : null,
              drivers: [],
            };
            byCategory.set(d.category.id, group);
          }
          group.drivers.push({
            slug: d.driver.slug,
            firstName: d.driver.firstName,
            lastName: d.driver.lastName,
            code: d.driver.code,
            countryCode: d.driver.countryCode,
            carNumber: d.carNumber,
            headshotPath: d.driver.headshot?.path ?? null,
          });
        }
        groups = [...byCategory.values()]
          .map((g) => ({
            ...g,
            drivers: g.drivers.sort((a, b) => a.carNumber - b.carNumber),
          }))
          .sort((a, b) => a.category.sort - b.category.sort);
      }

      return {
        slug: team.slug,
        name: team.name,
        fullName: team.fullName,
        base: team.base,
        countryCode: team.countryCode,
        firstEntryYear: team.firstEntryYear,
        description: team.description,
        seasonYear: currentYear,
        displayName: entry?.displayName ?? null,
        shortName: entry?.shortName ?? null,
        color: entry?.primaryColor ?? "#67676d",
        secondaryColor: entry?.secondaryColor ?? null,
        teamPrincipal: entry?.teamPrincipal ?? null,
        logoPath: team.logo?.path ?? null,
        groups,
      } satisfies TeamDetail;
    },
    ["team-detail", slug, String(currentYear)],
    [TAGS.team(slug), TAGS.standings, TAGS.categories],
  );
}
