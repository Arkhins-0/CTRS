import { relations } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ── Admin users & RBAC ──────────────────────────────────────────────────── */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  // plain uuid (no FK) to avoid a circular dependency with media
  avatarMediaId: uuid("avatar_media_id"),
  isActive: boolean("is_active").notNull().default(true),
  failedLogins: integer("failed_logins").notNull().default(0),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 60 }).notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const adminUserRoles = pgTable(
  "admin_user_roles",
  {
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.adminUserId, t.roleId] })],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(), // sha256 hex of cookie token
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: varchar("ip", { length: 60 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_sessions_user_idx").on(t.adminUserId)],
);

/* ── Self-service account tokens ─────────────────────────────────────────── */

export const adminTokenTypeEnum = pgEnum("admin_token_type", ["password_reset", "email_change"]);

/**
 * Single-use tokens for password reset and email change.
 *
 * Only the sha256 of the token is stored — the raw value exists solely in the
 * email, so a database leak cannot be replayed into an account takeover. Rows
 * are consumed by stamping usedAt rather than deleting, which keeps a short
 * audit trail of what was used and when.
 */
export const adminVerificationTokens = pgTable(
  "admin_verification_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    type: adminTokenTypeEnum("type").notNull(),
    // email_change only: the address being moved to, confirmed via this token
    newEmail: varchar("new_email", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_verification_tokens_user_idx").on(t.adminUserId, t.type)],
);

/**
 * Per-admin notification preferences.
 *
 * One row per admin, created lazily on first read. Absence of a row means
 * "every default on" — see DEFAULT_NOTIFICATION_PREFS in the admin app.
 */
export const adminNotificationPrefs = pgTable("admin_notification_prefs", {
  adminUserId: uuid("admin_user_id")
    .primaryKey()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  // categories
  announcements: boolean("announcements").notNull().default(true),
  raceOps: boolean("race_ops").notNull().default(true),
  resultsReminders: boolean("results_reminders").notNull().default(true),
  // delivery channels
  emailEnabled: boolean("email_enabled").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Durable fixed-window rate limiter.
 *
 * Middleware runs on the edge with no DB and server actions POST to page URLs,
 * so in-memory limiting cannot cover the auth surface — and per-instance state
 * is lost on every cold start anyway. Keyed rows here survive both.
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: varchar("key", { length: 200 }).notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    index("rate_limit_buckets_expiry_idx").on(t.expiresAt),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(), // e.g. "article.publish"
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 60 }),
    diff: jsonb("diff"), // { before, after } snapshots
    ip: varchar("ip", { length: 60 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

/* ── Relations ───────────────────────────────────────────────────────────── */

export const adminUsersRelations = relations(adminUsers, ({ many, one }) => ({
  userRoles: many(adminUserRoles),
  sessions: many(adminSessions),
  verificationTokens: many(adminVerificationTokens),
  notificationPrefs: one(adminNotificationPrefs, {
    fields: [adminUsers.id],
    references: [adminNotificationPrefs.adminUserId],
  }),
}));

export const adminVerificationTokensRelations = relations(adminVerificationTokens, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminVerificationTokens.adminUserId],
    references: [adminUsers.id],
  }),
}));

export const adminNotificationPrefsRelations = relations(adminNotificationPrefs, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminNotificationPrefs.adminUserId],
    references: [adminUsers.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(adminUserRoles),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const adminUserRolesRelations = relations(adminUserRoles, ({ one }) => ({
  user: one(adminUsers, { fields: [adminUserRoles.adminUserId], references: [adminUsers.id] }),
  role: one(roles, { fields: [adminUserRoles.roleId], references: [roles.id] }),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, { fields: [adminSessions.adminUserId], references: [adminUsers.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(adminUsers, { fields: [auditLog.adminUserId], references: [adminUsers.id] }),
}));
