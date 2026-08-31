import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import {
  adminNotificationPrefs,
  db,
  memberNotificationPrefs,
  members,
  pushSubscriptions,
} from "@ctr/db";

/**
 * Web Push (VAPID) fan-out. Each device is one send, individually try/caught;
 * endpoints the push service reports as gone (404/410) are pruned so the table
 * never accumulates dead devices.
 */

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/**
 * Builds the VAPID "subject" — a contact identifier for the push service to
 * reach the operator, never a URL anything fetches.
 *
 * web-push REJECTS anything that is not https: or mailto: and throws, which
 * previously escaped as a 500 on the announcements page whenever SITE_URL was
 * an http:// origin. Since the value is only an identifier, an insecure origin
 * is upgraded rather than treated as fatal, and a mailto: built from EMAIL_FROM
 * is preferred because it actually reaches a person.
 */
export function vapidSubject(): string {
  const email = process.env.EMAIL_FROM?.trim();
  const candidates = [
    process.env.VAPID_SUBJECT,
    email && email.includes("@") ? `mailto:${email}` : undefined,
    process.env.SITE_URL,
    process.env.ADMIN_URL,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (value.startsWith("mailto:") && value.length > "mailto:".length) return value;
    // A bare address with no scheme, e.g. VAPID_SUBJECT=ops@ctrsports.in
    if (value.includes("@") && !value.includes("/")) return `mailto:${value}`;

    const origin = value.startsWith("https://")
      ? value
      : value.startsWith("http://")
        ? `https://${value.slice("http://".length)}`
        : null;
    if (!origin) continue;
    // Apple's push service rejects a localhost subject with BadJwtToken, so a
    // dev origin is worse than no origin — fall through to the mailto instead.
    if (/^https:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(origin)) continue;
    return origin;
  }

  // Nothing configured at all — valid, and obviously a placeholder in logs.
  return "mailto:noreply@ctrsports.invalid";
}

function configure(): void {
  webpush.setVapidDetails(
    vapidSubject(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
}

export type PushPayload = { title: string; body: string; url: string };

/** Notification categories a recipient can opt out of. */
export type PushCategory = "announcements" | "raceOps" | "resultsReminders" | "rsvpReminders";

export type PushAudience = {
  /** Public fan devices. Fans have no preference table yet, so all or none. */
  fans?: boolean;
  /** CMS staff devices. */
  admins?: boolean;
  /** Member devices. */
  members?: boolean;
  /** Restrict member devices to one team. Ignored unless `members` is set. */
  teamId?: string | null;
};

export const EVERYONE: PushAudience = { fans: true, admins: true, members: true };

export type PushResult = { sent: number; failed: number; skipped: number; total: number };

/**
 * Resolves which admin ids have opted OUT of a category.
 *
 * A missing preference row means the person never opened the settings, which
 * resolves to defaults-on — so we collect refusals rather than consents.
 * Getting this backwards would silently mute everyone who never visited the
 * page, which is most people.
 */
async function optedOutAdmins(category: PushCategory): Promise<Set<string>> {
  if (category === "rsvpReminders") return new Set(); // not an admin category
  const rows = await db.query.adminNotificationPrefs.findMany();
  const out = new Set<string>();
  for (const row of rows) {
    const wantsCategory =
      category === "announcements"
        ? row.announcements
        : category === "raceOps"
          ? row.raceOps
          : row.resultsReminders;
    if (!row.pushEnabled || !wantsCategory) out.add(row.adminUserId);
  }
  return out;
}

async function optedOutMembers(category: PushCategory): Promise<Set<string>> {
  if (category === "resultsReminders") return new Set(); // not a member category
  const rows = await db.query.memberNotificationPrefs.findMany();
  const out = new Set<string>();
  for (const row of rows) {
    const wantsCategory =
      category === "announcements"
        ? row.announcements
        : category === "raceOps"
          ? row.raceOps
          : row.rsvpReminders;
    if (!row.pushEnabled || !wantsCategory) out.add(row.memberId);
  }
  return out;
}

/**
 * Sends a push to an audience, honouring each recipient's preferences.
 *
 * `skipped` counts devices deliberately not sent to (opted out or outside the
 * audience) so the operator can tell "nobody wanted this" apart from
 * "delivery is broken" — the two look identical if you only report sent.
 */
export async function sendPush(
  payload: PushPayload,
  audience: PushAudience = EVERYONE,
  category: PushCategory = "announcements",
): Promise<PushResult> {
  configure();

  const subs = await db.query.pushSubscriptions.findMany();
  const [adminOptOut, memberOptOut] = await Promise.all([
    audience.admins ? optedOutAdmins(category) : Promise.resolve(new Set<string>()),
    audience.members ? optedOutMembers(category) : Promise.resolve(new Set<string>()),
  ]);

  // Team filter needs the member -> team mapping for the devices we hold.
  let teamMemberIds: Set<string> | null = null;
  if (audience.members && audience.teamId) {
    const rows = await db.query.members.findMany({
      where: eq(members.teamId, audience.teamId),
      columns: { id: true },
    });
    teamMemberIds = new Set(rows.map((r) => r.id));
  }

  const targets = subs.filter((sub) => {
    if (sub.memberId) {
      if (!audience.members) return false;
      if (teamMemberIds && !teamMemberIds.has(sub.memberId)) return false;
      return !memberOptOut.has(sub.memberId);
    }
    if (sub.adminUserId) {
      if (!audience.admins) return false;
      return !adminOptOut.has(sub.adminUserId);
    }
    // Neither set: an anonymous or fan device.
    return Boolean(audience.fans);
  });

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (const sub of targets) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 24 * 3600 },
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        gone.push(sub.id); // device unsubscribed/expired — prune below
      } else {
        failed += 1;
        console.error(`push failed for ${sub.endpoint.slice(0, 60)}…`, err);
      }
    }
  }

  if (gone.length) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  }

  return { sent, failed, skipped: subs.length - targets.length, total: subs.length };
}

/** Back-compat wrapper for the existing announcement fan-out. */
export async function sendPushToAll(payload: PushPayload) {
  const { sent, failed, total } = await sendPush(payload, EVERYONE, "announcements");
  return { sent, failed, total };
}
