"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, newsletterSubscribers } from "@ctr/db";

/**
 * Re-confirms a subscription from its unsubscribe link.
 *
 * Deliberately skips the double opt-in loop: the token itself was only ever
 * emailed to this address as part of a newsletter issue, so clicking a link
 * that arrived in that inbox is the same proof of control the original
 * confirm email established. Re-sending a fresh confirm email here would
 * just be friction, not more safety.
 */
export async function resubscribeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/newsletter");

  const [subscriber] = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeToken, token));

  if (subscriber) {
    await db
      .update(newsletterSubscribers)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(newsletterSubscribers.id, subscriber.id));
  }

  redirect(`/newsletter/unsubscribe/${token}?resubscribed=1`);
}
