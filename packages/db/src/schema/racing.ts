import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { media } from "./content";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export const roundStatusEnum = pgEnum("gp_status", ["scheduled", "live", "completed", "cancelled"]);

// NOTE: "race2" remains in the pg enum (Postgres can't drop enum values) but is
// no longer used — multi-race rounds are modelled as type "race" + sequence 1..N.
export const sessionTypeEnum = pgEnum("session_type", [
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
  "race2",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "live",
  "completed",
  "cancelled",
]);

export const resultStatusEnum = pgEnum("result_status", ["finished", "dnf", "dns", "dsq", "nc"]);

export const driverRoleEnum = pgEnum("driver_role", ["primary", "reserve"]);

/* ── Championships & their seasons ───────────────────────────────────────── */

export type PointsSystem = {
  race: number[];
  sprint?: number[];
  fastestLapPoint?: boolean;
};

export const championships = pgTable("championships", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 60 }).notNull(),
  type: varchar("type", { length: 40 }).notNull().default("mixed"), // mixed | touring | single_seater | ...
  description: text("description"),
  logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#F7D619"),
  secondaryColor: varchar("secondary_color", { length: 7 }),
  isActive: boolean("is_active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const championshipSeasons = pgTable(
  "championship_seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    pointsSystem: jsonb("points_system")
      .$type<PointsSystem>()
      .notNull()
      .default({ race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], sprint: [8, 7, 6, 5, 4, 3, 2, 1] }),
    // which classification tables this season runs, e.g. ["overall","team","rookie","gentlemen"]
    standingsTypes: text("standings_types").array().notNull().default(["overall", "team"]),
  },
  (t) => [unique("championship_season_uq").on(t.championshipId, t.year)],
);

/* ── Racing categories (classes within a championship) ───────────────────── */

export const raceCategories = pgTable("race_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  championshipId: uuid("championship_id").references(() => championships.id, {
    onDelete: "cascade",
  }),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  shortName: varchar("short_name", { length: 60 }).notNull(),
  description: text("description"),
  carSpec: text("car_spec"),
  color: varchar("color", { length: 7 }).notNull().default("#FFC800"),
  imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

/* ── Circuits (unchanged from v1) ────────────────────────────────────────── */

export const circuits = pgTable("circuits", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  officialName: varchar("official_name", { length: 255 }),
  locality: varchar("locality", { length: 120 }),
  country: varchar("country", { length: 120 }).notNull(),
  countryCode: char("country_code", { length: 2 }),
  lengthKm: real("length_km"),
  raceLaps: integer("race_laps"),
  turns: integer("turns"),
  direction: varchar("direction", { length: 20 }),
  fiaGrade: varchar("fia_grade", { length: 10 }),
  owner: varchar("owner", { length: 200 }),
  website: varchar("website", { length: 300 }),
  lapRecordTimeMs: integer("lap_record_time_ms"),
  lapRecordDriver: varchar("lap_record_driver", { length: 120 }),
  lapRecordYear: integer("lap_record_year"),
  firstGpYear: integer("first_gp_year"),
  description: text("description"),
  mapMediaId: uuid("map_media_id").references(() => media.id, { onDelete: "set null" }),
  photoMediaId: uuid("photo_media_id").references(() => media.id, { onDelete: "set null" }),
});

/* ── Rounds (formerly grands_prix) & sessions ────────────────────────────── */

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipSeasonId: uuid("championship_season_id")
      .notNull()
      .references(() => championshipSeasons.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    officialName: varchar("official_name", { length: 255 }),
    circuitId: uuid("circuit_id")
      .notNull()
      .references(() => circuits.id),
    startDate: date("start_date"),
    endDate: date("end_date"),
    hasSprint: boolean("has_sprint").notNull().default(false),
    status: roundStatusEnum("status").notNull().default("scheduled"),
    heroMediaId: uuid("hero_media_id").references(() => media.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("round_season_number_uq").on(t.championshipSeasonId, t.round),
    unique("round_season_slug_uq").on(t.championshipSeasonId, t.slug),
  ],
);

export const raceSessions = pgTable(
  "race_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => raceCategories.id, { onDelete: "cascade" }),
    type: sessionTypeEnum("type").notNull(),
    /** Race 1 / Race 2 / Race 3 = type "race", sequence 1 / 2 / 3 */
    sequence: integer("sequence").notNull().default(1),
    label: varchar("label", { length: 120 }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
  },
  (t) => [unique("session_round_cat_type_seq_uq").on(t.roundId, t.categoryId, t.type, t.sequence)],
);

/* ── Teams, cars & drivers ───────────────────────────────────────────────── */

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  fullName: varchar("full_name", { length: 200 }),
  base: varchar("base", { length: 200 }),
  countryCode: char("country_code", { length: 2 }),
  firstEntryYear: integer("first_entry_year"),
  worldChampionships: integer("world_championships").notNull().default(0),
  description: text("description"),
  logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
});

export const teamSeasonEntries = pgTable(
  "team_season_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    championshipSeasonId: uuid("championship_season_id")
      .notNull()
      .references(() => championshipSeasons.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    shortName: varchar("short_name", { length: 60 }).notNull(),
    primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#67676d"),
    secondaryColor: varchar("secondary_color", { length: 7 }),
    teamPrincipal: varchar("team_principal", { length: 120 }),
    powerUnitSupplier: varchar("power_unit_supplier", { length: 120 }),
    logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
    carImageMediaId: uuid("car_image_media_id").references(() => media.id, { onDelete: "set null" }),
  },
  (t) => [unique("team_season_uq").on(t.teamId, t.championshipSeasonId)],
);

export const cars = pgTable("cars", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamSeasonEntryId: uuid("team_season_entry_id")
    .notNull()
    .unique()
    .references(() => teamSeasonEntries.id, { onDelete: "cascade" }),
  modelName: varchar("model_name", { length: 60 }).notNull(),
  chassis: varchar("chassis", { length: 120 }),
  powerUnit: varchar("power_unit", { length: 120 }),
  specs: jsonb("specs"),
  imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  code: char("code", { length: 3 }).notNull(),
  countryCode: char("country_code", { length: 2 }),
  dateOfBirth: date("date_of_birth"),
  placeOfBirth: varchar("place_of_birth", { length: 200 }),
  biography: text("biography"),
  headshotMediaId: uuid("headshot_media_id").references(() => media.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
});

export const driverSeasonEntries = pgTable(
  "driver_season_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    teamSeasonEntryId: uuid("team_season_entry_id")
      .notNull()
      .references(() => teamSeasonEntries.id, { onDelete: "cascade" }),
    championshipSeasonId: uuid("championship_season_id")
      .notNull()
      .references(() => championshipSeasons.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => raceCategories.id, { onDelete: "cascade" }),
    /** sub-classification tag, e.g. "rookie" | "gentlemen" — drives extra standings tables */
    classification: varchar("classification", { length: 30 }),
    carNumber: integer("car_number").notNull(),
    role: driverRoleEnum("role").notNull().default("primary"),
    fromRound: integer("from_round"),
    toRound: integer("to_round"),
  },
  (t) => [
    unique("driver_entry_uq").on(t.driverId, t.teamSeasonEntryId, t.fromRound),
    index("driver_entries_season_idx").on(t.championshipSeasonId),
  ],
);

/* ── Results & standings ─────────────────────────────────────────────────── */

export const sessionResults = pgTable(
  "session_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => raceSessions.id, { onDelete: "cascade" }),
    driverSeasonEntryId: uuid("driver_season_entry_id")
      .notNull()
      .references(() => driverSeasonEntries.id, { onDelete: "cascade" }),
    position: integer("position"),
    status: resultStatusEnum("status").notNull().default("finished"),
    gridPosition: integer("grid_position"),
    laps: integer("laps"),
    timeMs: bigint("time_ms", { mode: "number" }),
    gapMs: bigint("gap_ms", { mode: "number" }),
    lapsBehind: integer("laps_behind"),
    q1TimeMs: integer("q1_time_ms"),
    q2TimeMs: integer("q2_time_ms"),
    q3TimeMs: integer("q3_time_ms"),
    points: real("points").notNull().default(0),
    fastestLap: boolean("fastest_lap").notNull().default(false),
    fastestLapTimeMs: integer("fastest_lap_time_ms"),
  },
  (t) => [
    unique("result_session_entry_uq").on(t.sessionId, t.driverSeasonEntryId),
    index("results_session_idx").on(t.sessionId),
    index("results_entry_idx").on(t.driverSeasonEntryId),
  ],
);

export const driverStandings = pgTable(
  "driver_standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipSeasonId: uuid("championship_season_id")
      .notNull()
      .references(() => championshipSeasons.id, { onDelete: "cascade" }),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => raceCategories.id, { onDelete: "cascade" }),
    /** "overall" | "rookie" | "gentlemen" | … (config: championshipSeasons.standingsTypes) */
    standingsType: varchar("standings_type", { length: 30 }).notNull().default("overall"),
    position: integer("position").notNull(),
    points: real("points").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    podiums: integer("podiums").notNull().default(0),
    poles: integer("poles").notNull().default(0),
    computedThroughRound: integer("computed_through_round").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("driver_standings_uq").on(
      t.championshipSeasonId,
      t.categoryId,
      t.standingsType,
      t.driverId,
    ),
  ],
);

export const constructorStandings = pgTable(
  "constructor_standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipSeasonId: uuid("championship_season_id")
      .notNull()
      .references(() => championshipSeasons.id, { onDelete: "cascade" }),
    teamSeasonEntryId: uuid("team_season_entry_id")
      .notNull()
      .references(() => teamSeasonEntries.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => raceCategories.id, { onDelete: "cascade" }),
    standingsType: varchar("standings_type", { length: 30 }).notNull().default("team"),
    position: integer("position").notNull(),
    points: real("points").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    computedThroughRound: integer("computed_through_round").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("constructor_standings_uq").on(
      t.championshipSeasonId,
      t.categoryId,
      t.standingsType,
      t.teamSeasonEntryId,
    ),
  ],
);

/* ── Relations ───────────────────────────────────────────────────────────── */

export const championshipsRelations = relations(championships, ({ one, many }) => ({
  seasons: many(championshipSeasons),
  categories: many(raceCategories),
  logo: one(media, { fields: [championships.logoMediaId], references: [media.id] }),
}));

export const championshipSeasonsRelations = relations(championshipSeasons, ({ one, many }) => ({
  championship: one(championships, {
    fields: [championshipSeasons.championshipId],
    references: [championships.id],
  }),
  rounds: many(rounds),
  teamEntries: many(teamSeasonEntries),
  driverEntries: many(driverSeasonEntries),
}));

export const raceCategoriesRelations = relations(raceCategories, ({ one, many }) => ({
  championship: one(championships, {
    fields: [raceCategories.championshipId],
    references: [championships.id],
  }),
  sessions: many(raceSessions),
  driverEntries: many(driverSeasonEntries),
  image: one(media, { fields: [raceCategories.imageMediaId], references: [media.id] }),
}));

export const circuitsRelations = relations(circuits, ({ one, many }) => ({
  rounds: many(rounds),
  mapImage: one(media, { fields: [circuits.mapMediaId], references: [media.id] }),
  photo: one(media, { fields: [circuits.photoMediaId], references: [media.id] }),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  championshipSeason: one(championshipSeasons, {
    fields: [rounds.championshipSeasonId],
    references: [championshipSeasons.id],
  }),
  circuit: one(circuits, { fields: [rounds.circuitId], references: [circuits.id] }),
  sessions: many(raceSessions),
  heroImage: one(media, { fields: [rounds.heroMediaId], references: [media.id] }),
}));

export const raceSessionsRelations = relations(raceSessions, ({ one, many }) => ({
  round: one(rounds, { fields: [raceSessions.roundId], references: [rounds.id] }),
  category: one(raceCategories, {
    fields: [raceSessions.categoryId],
    references: [raceCategories.id],
  }),
  results: many(sessionResults),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  seasonEntries: many(teamSeasonEntries),
  logo: one(media, { fields: [teams.logoMediaId], references: [media.id] }),
}));

export const teamSeasonEntriesRelations = relations(teamSeasonEntries, ({ one, many }) => ({
  team: one(teams, { fields: [teamSeasonEntries.teamId], references: [teams.id] }),
  championshipSeason: one(championshipSeasons, {
    fields: [teamSeasonEntries.championshipSeasonId],
    references: [championshipSeasons.id],
  }),
  car: one(cars),
  driverEntries: many(driverSeasonEntries),
  carImage: one(media, { fields: [teamSeasonEntries.carImageMediaId], references: [media.id] }),
  logo: one(media, { fields: [teamSeasonEntries.logoMediaId], references: [media.id] }),
}));

export const carsRelations = relations(cars, ({ one }) => ({
  teamSeasonEntry: one(teamSeasonEntries, {
    fields: [cars.teamSeasonEntryId],
    references: [teamSeasonEntries.id],
  }),
  image: one(media, { fields: [cars.imageMediaId], references: [media.id] }),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  seasonEntries: many(driverSeasonEntries),
  headshot: one(media, { fields: [drivers.headshotMediaId], references: [media.id] }),
}));

export const driverSeasonEntriesRelations = relations(driverSeasonEntries, ({ one, many }) => ({
  driver: one(drivers, { fields: [driverSeasonEntries.driverId], references: [drivers.id] }),
  teamSeasonEntry: one(teamSeasonEntries, {
    fields: [driverSeasonEntries.teamSeasonEntryId],
    references: [teamSeasonEntries.id],
  }),
  championshipSeason: one(championshipSeasons, {
    fields: [driverSeasonEntries.championshipSeasonId],
    references: [championshipSeasons.id],
  }),
  category: one(raceCategories, {
    fields: [driverSeasonEntries.categoryId],
    references: [raceCategories.id],
  }),
  results: many(sessionResults),
}));

export const sessionResultsRelations = relations(sessionResults, ({ one }) => ({
  session: one(raceSessions, { fields: [sessionResults.sessionId], references: [raceSessions.id] }),
  entry: one(driverSeasonEntries, {
    fields: [sessionResults.driverSeasonEntryId],
    references: [driverSeasonEntries.id],
  }),
}));

export const driverStandingsRelations = relations(driverStandings, ({ one }) => ({
  championshipSeason: one(championshipSeasons, {
    fields: [driverStandings.championshipSeasonId],
    references: [championshipSeasons.id],
  }),
  driver: one(drivers, { fields: [driverStandings.driverId], references: [drivers.id] }),
  category: one(raceCategories, {
    fields: [driverStandings.categoryId],
    references: [raceCategories.id],
  }),
}));

export const constructorStandingsRelations = relations(constructorStandings, ({ one }) => ({
  championshipSeason: one(championshipSeasons, {
    fields: [constructorStandings.championshipSeasonId],
    references: [championshipSeasons.id],
  }),
  teamSeasonEntry: one(teamSeasonEntries, {
    fields: [constructorStandings.teamSeasonEntryId],
    references: [teamSeasonEntries.id],
  }),
  category: one(raceCategories, {
    fields: [constructorStandings.categoryId],
    references: [raceCategories.id],
  }),
}));
