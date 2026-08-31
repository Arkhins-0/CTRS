import { eq } from "drizzle-orm";
import { adminNotificationPrefs, db } from "@ctr/db";

/**
 * Per-admin notification preferences.
 *
 * Rows are created lazily: a missing row means "never touched the settings",
 * which resolves to every category on. Readers must therefore go through
 * getNotificationPrefs() rather than assuming a row exists.
 */

export type NotificationPrefs = {
  announcements: boolean;
  raceOps: boolean;
  resultsReminders: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  announcements: true,
  raceOps: true,
  resultsReminders: true,
  emailEnabled: true,
  pushEnabled: true,
};

export const NOTIFICATION_CATEGORIES = [
  {
    key: "announcements" as const,
    label: "Announcements",
    hint: "Broadcast messages sent to the whole organisation.",
  },
  {
    key: "raceOps" as const,
    label: "Race operations",
    hint: "Schedule changes, session updates and entry list activity.",
  },
  {
    key: "resultsReminders" as const,
    label: "Results reminders",
    hint: "Nudges when a completed session still has no classification.",
  },
];

export const NOTIFICATION_CHANNELS = [
  { key: "pushEnabled" as const, label: "Push", hint: "Alerts on devices you've enabled." },
  { key: "emailEnabled" as const, label: "Email", hint: "Sent to your sign-in address." },
];

export async function getNotificationPrefs(adminUserId: string): Promise<NotificationPrefs> {
  const row = await db.query.adminNotificationPrefs.findFirst({
    where: eq(adminNotificationPrefs.adminUserId, adminUserId),
  });
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFS };
  return {
    announcements: row.announcements,
    raceOps: row.raceOps,
    resultsReminders: row.resultsReminders,
    emailEnabled: row.emailEnabled,
    pushEnabled: row.pushEnabled,
  };
}

export async function saveNotificationPrefs(
  adminUserId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  await db
    .insert(adminNotificationPrefs)
    .values({ adminUserId, ...prefs, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: adminNotificationPrefs.adminUserId,
      set: { ...prefs, updatedAt: new Date() },
    });
}

/**
 * Resolves which admins should receive a push for a given category.
 *
 * Admins with no preference row are included — absence means defaults, and the
 * defaults are on. Expressed as a filter over a caller-supplied id list so the
 * push fan-out stays a single query.
 */
export async function filterAdminsForCategory(
  adminUserIds: string[],
  category: keyof Pick<NotificationPrefs, "announcements" | "raceOps" | "resultsReminders">,
): Promise<Set<string>> {
  if (!adminUserIds.length) return new Set();

  const rows = await db.query.adminNotificationPrefs.findMany();
  const byId = new Map(rows.map((r) => [r.adminUserId, r]));

  return new Set(
    adminUserIds.filter((id) => {
      const row = byId.get(id);
      if (!row) return true; // no row -> defaults -> opted in
      return row.pushEnabled && Boolean(row[category]);
    }),
  );
}
