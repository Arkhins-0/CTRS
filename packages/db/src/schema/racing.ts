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

export const gpStatusEnum = pgEnum("gp_status", ["scheduled", "live", "completed", "cancelled"]);

export const sessionTypeEnum = pgEnum("session_type", [
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "live",
  "completed",
  "cancelled",
]);

export const resultStatusEnum = pgEnum("result_status", ["finished", "dnf", "dns", "dsq", "nc"]);

export const driverRoleEnum = pgEnum("driver_role", ["primary", "reserve"]);

/* ── Seasons & circuits ──────────────────────────────────────────────────── */

export const seasons = pgTable("seasons", {
  year: integer("year").primaryKey(),
  isCurrent: boolean("is_current").notNull().default(false),
  // points-by-position arrays drive all standings math
  racePoints: integer("race_points").array().notNull(),
  sprintPoints: integer("sprint_points").array().notNull(),
  fastestLapPoint: boolean("fastest_lap_point").notNull().default(false),
});

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
  lapRecordTimeMs: integer("lap_record_time_ms"),
  lapRecordDriver: varchar("lap_record_driver", { length: 120 }),
  lapRecordYear: integer("lap_record_year"),
  firstGpYear: integer("first_gp_year"),
  description: text("description"),
  mapMediaId: uuid("map_media_id").references(() => media.id, { onDelete: "set null" }),
});

/* ── Race weekends & sessions ────────────────────────────────────────────── */

export const grandsPrix = pgTable(
  "grands_prix",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonYear: integer("season_year")
      .notNull()
      .references(() => seasons.year, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(), // "Australian Grand Prix"
    officialName: varchar("official_name", { length: 255 }), // full sponsor title
    circuitId: uuid("circuit_id")
      .notNull()
      .references(() => circuits.id),
    startDate: date("start_date"),
    endDate: date("end_date"),
    hasSprint: boolean("has_sprint").notNull().default(false),
    status: gpStatusEnum("status").notNull().default("scheduled"),
    heroMediaId: uuid("hero_media_id").references(() => media.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("gp_season_round_uq").on(t.seasonYear, t.round),
    unique("gp_season_slug_uq").on(t.seasonYear, t.slug),
  ],
);

export const raceSessions = pgTable(
  "race_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    grandPrixId: uuid("grand_prix_id")
      .notNull()
      .references(() => grandsPrix.id, { onDelete: "cascade" }),
    type: sessionTypeEnum("type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
  },
  (t) => [unique("session_gp_type_uq").on(t.grandPrixId, t.type)],
);

/* ── Teams, cars & drivers ───────────────────────────────────────────────── */

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(), // "McLaren"
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
    seasonYear: integer("season_year")
      .notNull()
      .references(() => seasons.year, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 200 }).notNull(), // "McLaren Formula 1 Team"
    shortName: varchar("short_name", { length: 60 }).notNull(), // "McLaren"
    primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#67676d"),
    secondaryColor: varchar("secondary_color", { length: 7 }),
    teamPrincipal: varchar("team_principal", { length: 120 }),
    powerUnitSupplier: varchar("power_unit_supplier", { length: 120 }),
    logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
    carImageMediaId: uuid("car_image_media_id").references(() => media.id, { onDelete: "set null" }),
  },
  (t) => [unique("team_season_uq").on(t.teamId, t.seasonYear)],
);

export const cars = pgTable("cars", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamSeasonEntryId: uuid("team_season_entry_id")
    .notNull()
    .unique()
    .references(() => teamSeasonEntries.id, { onDelete: "cascade" }),
  modelName: varchar("model_name", { length: 60 }).notNull(), // "MCL39"
  chassis: varchar("chassis", { length: 120 }),
  powerUnit: varchar("power_unit", { length: 120 }),
  specs: jsonb("specs"), // { weightKg, ers, gearbox, fuel, ... }
  imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  code: char("code", { length: 3 }).notNull(), // "VER"
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
    seasonYear: integer("season_year")
      .notNull()
      .references(() => seasons.year, { onDelete: "cascade" }), // denormalised for query speed
    carNumber: integer("car_number").notNull(),
    role: driverRoleEnum("role").notNull().default("primary"),
    // mid-season swaps (e.g. Lawson↔Tsunoda 2025 from round 3)
    fromRound: integer("from_round"),
    toRound: integer("to_round"),
  },
  (t) => [
    unique("driver_entry_uq").on(t.driverId, t.teamSeasonEntryId, t.fromRound),
    index("driver_entries_season_idx").on(t.seasonYear),
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
    timeMs: bigint("time_ms", { mode: "number" }), // winner total time / best lap in practice
    gapMs: bigint("gap_ms", { mode: "number" }), // gap to winner
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
    seasonYear: integer("season_year")
      .notNull()
      .references(() => seasons.year, { onDelete: "cascade" }),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    points: real("points").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    podiums: integer("podiums").notNull().default(0),
    poles: integer("poles").notNull().default(0),
    computedThroughRound: integer("computed_through_round").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("driver_standings_uq").on(t.seasonYear, t.driverId)],
);

export const constructorStandings = pgTable(
  "constructor_standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonYear: integer("season_year")
      .notNull()
      .references(() => seasons.year, { onDelete: "cascade" }),
    teamSeasonEntryId: uuid("team_season_entry_id")
      .notNull()
      .references(() => teamSeasonEntries.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    points: real("points").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    computedThroughRound: integer("computed_through_round").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("constructor_standings_uq").on(t.seasonYear, t.teamSeasonEntryId)],
);

/* ── Relations ───────────────────────────────────────────────────────────── */

export const seasonsRelations = relations(seasons, ({ many }) => ({
  grandsPrix: many(grandsPrix),
  teamEntries: many(teamSeasonEntries),
  driverEntries: many(driverSeasonEntries),
}));

export const circuitsRelations = relations(circuits, ({ one, many }) => ({
  grandsPrix: many(grandsPrix),
  mapImage: one(media, { fields: [circuits.mapMediaId], references: [media.id] }),
}));

export const grandsPrixRelations = relations(grandsPrix, ({ one, many }) => ({
  season: one(seasons, { fields: [grandsPrix.seasonYear], references: [seasons.year] }),
  circuit: one(circuits, { fields: [grandsPrix.circuitId], references: [circuits.id] }),
  sessions: many(raceSessions),
  heroImage: one(media, { fields: [grandsPrix.heroMediaId], references: [media.id] }),
}));

export const raceSessionsRelations = relations(raceSessions, ({ one, many }) => ({
  grandPrix: one(grandsPrix, { fields: [raceSessions.grandPrixId], references: [grandsPrix.id] }),
  results: many(sessionResults),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  seasonEntries: many(teamSeasonEntries),
  logo: one(media, { fields: [teams.logoMediaId], references: [media.id] }),
}));

export const teamSeasonEntriesRelations = relations(teamSeasonEntries, ({ one, many }) => ({
  team: one(teams, { fields: [teamSeasonEntries.teamId], references: [teams.id] }),
  season: one(seasons, { fields: [teamSeasonEntries.seasonYear], references: [seasons.year] }),
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
  season: one(seasons, { fields: [driverSeasonEntries.seasonYear], references: [seasons.year] }),
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
  season: one(seasons, { fields: [driverStandings.seasonYear], references: [seasons.year] }),
  driver: one(drivers, { fields: [driverStandings.driverId], references: [drivers.id] }),
}));

export const constructorStandingsRelations = relations(constructorStandings, ({ one }) => ({
  season: one(seasons, { fields: [constructorStandings.seasonYear], references: [seasons.year] }),
  teamSeasonEntry: one(teamSeasonEntries, {
    fields: [constructorStandings.teamSeasonEntryId],
    references: [teamSeasonEntries.id],
  }),
}));
