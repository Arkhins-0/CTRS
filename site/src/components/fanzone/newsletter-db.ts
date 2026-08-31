import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, newsletterSubscribers } from "@ctr/db";
import { newsletterConfirmEmail, sendEmail } from "@ctr/email";

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

/**
 * Send the double-opt-in confirmation email for a pending subscription.
 * Returns true when a real email went out; false when the subscription is
 * already confirmed (`token` null) or no provider is configured (dev "log"
 * mode — callers may then surface the confirm link on-screen instead).
 * Never throws: subscribing must survive a mail outage.
 */
export async function sendConfirmationEmail(
  email: string,
  token: string | null,
): Promise<boolean> {
  if (!token) return false;
  try {
    const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
    const { delivered } = await sendEmail({
      to: email,
      ...newsletterConfirmEmail({ confirmUrl: `${base}/newsletter/confirm/${token}` }),
    });
    return delivered;
  } catch (err) {
    console.error("newsletter confirmation email failed", err);
    return false;
  }
}
