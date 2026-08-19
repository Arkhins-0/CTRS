import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, newsletterSubscribers } from "@ctr/db";

export type SubscriptionResult = {
  status: "pending" | "confirmed";
  /** confirm token when a (re-)confirmation is required, null when already confirmed */
  token: string | null;
};

/**
 * Create or refresh a pending newsletter subscription for `email`.
 * Never downgrades an already-confirmed subscriber (their status is kept and
 * no new token is issued). Server-side only.
 */
export async function upsertPendingSubscription(
  email: string,
  fanId: string | null,
  source: string,
): Promise<SubscriptionResult> {
  const [existing] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email));

  if (existing && existing.status === "confirmed") {
    if (fanId && !existing.fanId) {
      await db
        .update(newsletterSubscribers)
        .set({ fanId })
        .where(eq(newsletterSubscribers.id, existing.id));
    }
    return { status: "confirmed", token: null };
  }

  const token = randomBytes(16).toString("hex"); // 32 hex chars

  if (existing) {
    await db
      .update(newsletterSubscribers)
      .set({
        status: "pending",
        confirmToken: token,
        confirmedAt: null,
        source,
        fanId: fanId ?? existing.fanId,
      })
      .where(eq(newsletterSubscribers.id, existing.id));
  } else {
    await db
      .insert(newsletterSubscribers)
      .values({ email, fanId, status: "pending", confirmToken: token, source });
  }

  return { status: "pending", token };
}
