import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./auth";
import { teams } from "./racing";

/*
 * ── Organisation members ─────────────────────────────────────────────────
 *
 * A third principal type, deliberately separate from both admin_users (CMS
 * staff, who publish to the public site) and fans (public accounts). Members
 * are the people who actually run race weekends — team crew, drivers,
 * officials and marshals. They sign in to the same installed console but only
 * ever reach the /m area.
 *
 * Kept as its own table rather than a flag on admin_users because the two have
 * genuinely different lifecycles: members are invited by a team admin, scoped
 * to one team, and churn every season, while admin_users are provisioned by a
 * Super Admin and hold site-wide publishing permissions. Merging them would
 * put every crew member one bad role assignment away from the CMS.
 */

/**
 * Member roles. Coarse on purpose — a team's crew list does not need the
 * 17-permission matrix the CMS uses, and a smaller surface is easier to reason
 * about when team admins (not staff) are the ones granting it.
 */
export const memberRoleEnum = pgEnum("member_role", [
  "team_admin", // manages their own team's roster; cannot see other teams
  "team_member", // crew, driver or engineer on one team
  "official", // organisation-level: stewards, marshals, race control
]);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    role: memberRoleEnum("role").notNull().default("team_member"),
    /*
     * Null for organisation-level officials, who are not attached to a team.
     * Team admins and team members must have one — enforced in the actions
     * rather than the schema, since the same table serves both shapes.
     */
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    // free text so a team can record "Chief Mechanic", "Data Engineer", etc.
    jobTitle: varchar("job_title", { length: 120 }),
    avatarMediaId: uuid("avatar_media_id"),
    isActive: boolean("is_active").notNull().default(true),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    failedLogins: integer("failed_logins").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("members_team_idx").on(t.teamId), index("members_role_idx").on(t.role)],
);

export const memberSessions = pgTable(
  "member_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(), // sha256 of the cookie token
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: varchar("ip", { length: 60 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("member_sessions_member_idx").on(t.memberId)],
);

/**
 * Invitations are how members are created — there is no open signup. The
 * invite proves control of the inbox, so an accepted invitation starts the
 * account already email-verified.
 *
 * Only the sha256 of the token is stored, matching admin_verification_tokens.
 */
export const memberInvitations = pgTable(
  "member_invitations",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    role: memberRoleEnum("role").notNull().default("team_member"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    jobTitle: varchar("job_title", { length: 120 }),
    /* Exactly one of these is set — whoever issued the invite. */
    invitedByAdminId: uuid("invited_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    invitedByMemberId: uuid("invited_by_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("member_invitations_email_idx").on(t.email),
    index("member_invitations_team_idx").on(t.teamId),
  ],
);

/** Mirrors admin_notification_prefs; a missing row means defaults-on. */
export const memberNotificationPrefs = pgTable("member_notification_prefs", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  announcements: boolean("announcements").notNull().default(true),
  raceOps: boolean("race_ops").notNull().default(true),
  rsvpReminders: boolean("rsvp_reminders").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Relations ───────────────────────────────────────────────────────────── */

export const membersRelations = relations(members, ({ one, many }) => ({
  team: one(teams, { fields: [members.teamId], references: [teams.id] }),
  sessions: many(memberSessions),
  notificationPrefs: one(memberNotificationPrefs, {
    fields: [members.id],
    references: [memberNotificationPrefs.memberId],
  }),
}));

export const memberSessionsRelations = relations(memberSessions, ({ one }) => ({
  member: one(members, { fields: [memberSessions.memberId], references: [members.id] }),
}));

export const memberInvitationsRelations = relations(memberInvitations, ({ one }) => ({
  team: one(teams, { fields: [memberInvitations.teamId], references: [teams.id] }),
  invitedByAdmin: one(adminUsers, {
    fields: [memberInvitations.invitedByAdminId],
    references: [adminUsers.id],
  }),
}));

export const memberNotificationPrefsRelations = relations(memberNotificationPrefs, ({ one }) => ({
  member: one(members, { fields: [memberNotificationPrefs.memberId], references: [members.id] }),
}));
