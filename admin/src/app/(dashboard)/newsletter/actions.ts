"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, newsletterSubscribers, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const idSchema = z.object({ subscriberId: z.string().uuid() });

export async function markUnsubscribedAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_VIEW);
  const { subscriberId } = idSchema.parse({ subscriberId: String(formData.get("subscriberId") ?? "") });

  const [before] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriberId));
  if (!before) throw new Error("Subscriber not found");
  if (before.status === "unsubscribed") return;

  await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed" })
    .where(eq(newsletterSubscribers.id, subscriberId));

  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.update",
    entityType: "newsletter_subscriber",
    entityId: subscriberId,
    diff: { before: { status: before.status }, after: { status: "unsubscribed" } },
  });
  revalidatePath("/newsletter");
}

export async function deleteSubscriberAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_VIEW);
  const { subscriberId } = idSchema.parse({ subscriberId: String(formData.get("subscriberId") ?? "") });

  const [before] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriberId));
  if (!before) throw new Error("Subscriber not found");

  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId));

  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.delete",
    entityType: "newsletter_subscriber",
    entityId: subscriberId,
    diff: { before: { email: before.email, status: before.status, source: before.source } },
  });
  revalidatePath("/newsletter");
}
