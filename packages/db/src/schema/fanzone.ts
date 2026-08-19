import { relations } from "drizzle-orm";
import {
  char,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./auth";
import { articles } from "./content";
import { drivers, grandsPrix } from "./racing";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export const favouriteEntityEnum = pgEnum("favourite_entity", ["driver", "team"]);
export const pollKindEnum = pgEnum("poll_kind", ["poll", "prediction"]);
export const pollStatusEnum = pgEnum("poll_status", ["draft", "open", "closed"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "confirmed",
  "unsubscribed",
]);

/* ── Fan accounts ────────────────────────────────────────────────────────── */

export const fans = pgTable("fans", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  countryCode: char("country_code", { length: 2 }),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }), // null = active
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fanSessions = pgTable(
  "fan_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fan_sessions_fan_idx").on(t.fanId)],
);

export const fanFavourites = pgTable(
  "fan_favourites",
  {
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    entityType: favouriteEntityEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(), // driver.id or team.id
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fanId, t.entityType, t.entityId] })],
);

export const savedArticles = pgTable(
  "saved_articles",
  {
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fanId, t.articleId] })],
);

/* ── Polls & predictions ─────────────────────────────────────────────────── */

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  question: varchar("question", { length: 500 }).notNull(),
  kind: pollKindEnum("kind").notNull().default("poll"),
  grandPrixId: uuid("grand_prix_id").references(() => grandsPrix.id, { onDelete: "set null" }),
  status: pollStatusEnum("status").notNull().default("draft"),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  sort: integer("sort").notNull().default(0),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.fanId] })], // one vote per fan per poll
);

/* ── Newsletter ──────────────────────────────────────────────────────────── */

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fanId: uuid("fan_id").references(() => fans.id, { onDelete: "set null" }),
  status: subscriberStatusEnum("status").notNull().default("pending"),
  confirmToken: varchar("confirm_token", { length: 64 }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  source: varchar("source", { length: 60 }), // "footer", "account", ...
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Relations ───────────────────────────────────────────────────────────── */

export const fansRelations = relations(fans, ({ many }) => ({
  favourites: many(fanFavourites),
  saved: many(savedArticles),
  votes: many(pollVotes),
}));

export const fanSessionsRelations = relations(fanSessions, ({ one }) => ({
  fan: one(fans, { fields: [fanSessions.fanId], references: [fans.id] }),
}));

export const fanFavouritesRelations = relations(fanFavourites, ({ one }) => ({
  fan: one(fans, { fields: [fanFavourites.fanId], references: [fans.id] }),
}));

export const savedArticlesRelations = relations(savedArticles, ({ one }) => ({
  fan: one(fans, { fields: [savedArticles.fanId], references: [fans.id] }),
  article: one(articles, { fields: [savedArticles.articleId], references: [articles.id] }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  options: many(pollOptions),
  votes: many(pollVotes),
  grandPrix: one(grandsPrix, { fields: [polls.grandPrixId], references: [grandsPrix.id] }),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, { fields: [pollOptions.pollId], references: [polls.id] }),
  driver: one(drivers, { fields: [pollOptions.driverId], references: [drivers.id] }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, { fields: [pollVotes.pollId], references: [polls.id] }),
  option: one(pollOptions, { fields: [pollVotes.optionId], references: [pollOptions.id] }),
  fan: one(fans, { fields: [pollVotes.fanId], references: [fans.id] }),
}));
