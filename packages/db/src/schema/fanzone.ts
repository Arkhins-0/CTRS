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
import { drivers, rounds } from "./racing";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export const favouriteEntityEnum = pgEnum("favourite_entity", ["driver", "team"]);
export const pollKindEnum = pgEnum("poll_kind", ["poll", "prediction"]);
export const pollStatusEnum = pgEnum("poll_status", ["draft", "open", "closed"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "confirmed",
  "unsubscribed",
]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "maybe", "not_going"]);

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

/* ── Race-weekend RSVPs ──────────────────────────────────────────────────── */

/** One attendance response per fan per round (adapted from OpenLeague's RSVP
 *  model — the composite PK sidesteps its nullable-member unique-index gotcha
 *  because fans only ever answer for themselves). */
export const roundRsvps = pgTable(
  "round_rsvps",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roundId, t.fanId] }),
    index("round_rsvps_round_idx").on(t.roundId),
  ],
);

/* ── Polls & predictions ─────────────────────────────────────────────────── */

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  question: varchar("question", { length: 500 }).notNull(),
  kind: pollKindEnum("kind").notNull().default("poll"),
  roundId: uuid("round_id").references(() => rounds.id, { onDelete: "set null" }),
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

/* ── Web push ────────────────────────────────────────────────────────────── */

/** One browser push endpoint (VAPID Web Push). Anonymous visitors may
 *  subscribe too — fanId is optional and only links the device to an account. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    fanId: uuid("fan_id").references(() => fans.id, { onDelete: "set null" }),
    /** set when the device subscribed from the admin dashboard */
    adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "cascade" }),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_fan_idx").on(t.fanId)],
);

/** Admin-authored announcements pushed to every subscribed device; the row is
 *  the send history (sentAt + delivery counts). */
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 120 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  /** click-through target, absolute or site-relative ("/results/2026/...") */
  url: varchar("url", { length: 300 }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  rsvps: many(roundRsvps),
}));

export const roundRsvpsRelations = relations(roundRsvps, ({ one }) => ({
  fan: one(fans, { fields: [roundRsvps.fanId], references: [fans.id] }),
  round: one(rounds, { fields: [roundRsvps.roundId], references: [rounds.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  fan: one(fans, { fields: [pushSubscriptions.fanId], references: [fans.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(adminUsers, { fields: [announcements.createdBy], references: [adminUsers.id] }),
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
  round: one(rounds, { fields: [polls.roundId], references: [rounds.id] }),
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
