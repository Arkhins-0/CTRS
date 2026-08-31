import { relations, sql } from "drizzle-orm";
import {
  char,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./auth";
import { articles } from "./content";
import { members } from "./members";
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

export const newsletterIssueKindEnum = pgEnum("newsletter_issue_kind", ["digest", "broadcast"]);
export const newsletterIssueStatusEnum = pgEnum("newsletter_issue_status", [
  "draft",
  "sending",
  "sent",
  "failed",
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

/**
 * Self-service password reset for fans. Same discipline as
 * member_password_reset_tokens / admin_verification_tokens: only the sha256
 * of the token is stored, single use, claimed by a conditional UPDATE. A
 * separate table rather than a shared one because it FKs to fans, not
 * members or admin_users — three structurally disjoint account types.
 */
export const fanPasswordResetTokens = pgTable(
  "fan_password_reset_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fan_password_reset_tokens_fan_idx").on(t.fanId)],
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
    /** set when the device subscribed from the member (/m) area */
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("push_subscriptions_fan_idx").on(t.fanId),
    index("push_subscriptions_member_idx").on(t.memberId),
  ],
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
  /**
   * One-click unsubscribe token. Stable per subscriber (not rotated on use)
   * so the same emailed link keeps working and can drive a Resubscribe
   * action afterwards. Nullable because subscribers created before this
   * column existed have none yet; the newsletter senders backfill it lazily
   * for any row missing one right before a send.
   */
  unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).unique(),
  source: varchar("source", { length: 60 }), // "footer", "account", ...
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per newsletter send — both the automated weekly digest and an
 * admin-composed one-off broadcast. Doubles as the send history shown in the
 * admin UI and as the idempotency record for the digest cron.
 */
export const newsletterIssues = pgTable(
  "newsletter_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: newsletterIssueKindEnum("kind").notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    /** Broadcast only — TipTap JSON is the source of truth, mirroring articles. */
    bodyJson: text("body_json"),
    /** Broadcast only — the editor's own client-rendered HTML, cached so a
     *  draft has something to preview before the first send. */
    bodyHtml: text("body_html"),
    /**
     * The final rendered HTML actually sent, captured at send time so the
     * admin can review a past issue exactly as recipients saw it — not
     * reconstructed from live data, which may have since changed.
     */
    sentHtml: text("sent_html"),
    /**
     * Digest only. An ISO week key ("2026-W36") claimed via unique-constraint
     * insert BEFORE the send starts, so a cron re-triggered by an overlapping
     * schedule (Vercel + GitHub Actions + cron-job.org, as round-reminders
     * documents) cannot send the same week's digest twice.
     */
    periodKey: varchar("period_key", { length: 20 }),
    status: newsletterIssueStatusEnum("status").notNull().default("draft"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("newsletter_issues_period_key_uq")
      .on(t.periodKey)
      .where(sql`${t.kind} = 'digest' AND ${t.periodKey} IS NOT NULL`),
    index("newsletter_issues_created_idx").on(t.createdAt),
  ],
);

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

export const newsletterIssuesRelations = relations(newsletterIssues, ({ one }) => ({
  author: one(adminUsers, { fields: [newsletterIssues.createdBy], references: [adminUsers.id] }),
}));

export const fanSessionsRelations = relations(fanSessions, ({ one }) => ({
  fan: one(fans, { fields: [fanSessions.fanId], references: [fans.id] }),
}));

export const fanPasswordResetTokensRelations = relations(fanPasswordResetTokens, ({ one }) => ({
  fan: one(fans, { fields: [fanPasswordResetTokens.fanId], references: [fans.id] }),
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
