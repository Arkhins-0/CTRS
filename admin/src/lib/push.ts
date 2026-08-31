import webpush from "web-push";
import { inArray } from "drizzle-orm";
import { db, pushSubscriptions } from "@ctr/db";

/**
 * Web Push (VAPID) fan-out for announcements. Each device is one send,
 * individually try/caught; endpoints the push service reports as gone
 * (404/410) are pruned so the table never accumulates dead devices.
 */

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure(): void {
  const subject =
    process.env.VAPID_SUBJECT || process.env.SITE_URL || "https://localhost:3001";
  webpush.setVapidDetails(
    subject,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
}

export type PushPayload = { title: string; body: string; url: string };

export async function sendPushToAll(
  payload: PushPayload,
): Promise<{ sent: number; failed: number; total: number }> {
  configure();
  const subs = await db.query.pushSubscriptions.findMany();
  const body = JSON.stringify(payload);

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (const sub of subs) {
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

  return { sent, failed, total: subs.length };
}
