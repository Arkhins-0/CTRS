"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, fans, newsletterSubscribers } from "@ctr/db";
import { destroyFanSession, requireFan } from "@/lib/fan-auth";
import { upsertPendingSubscription } from "@/components/fanzone/newsletter-db";

/* ── Profile ─────────────────────────────────────────────────────────────── */

export type ProfileState = { error: string | null; ok: boolean };

const profileSchema = z.object({
  displayName: z
    .string({ required_error: "Please enter a display name." })
    .trim()
    .min(2, "Your display name must be at least 2 characters.")
    .max(120, "Your display name must be 120 characters or fewer."),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Please choose a valid country.")
    .optional(),
});

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await requireFan();

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    countryCode: (formData.get("countryCode") as string | null) || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      ok: false,
    };
  }

  await db
    .update(fans)
    .set({
      displayName: parsed.data.displayName,
      countryCode: parsed.data.countryCode ?? null,
    })
    .where(eq(fans.id, session.fan.id));

  revalidatePath("/account");
  return { error: null, ok: true };
}

/* ── Sign out ────────────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  await destroyFanSession();
  redirect("/");
}

/* ── Newsletter (from the account dashboard) ─────────────────────────────── */

export async function subscribeNewsletter(): Promise<void> {
  const session = await requireFan();
  await upsertPendingSubscription(session.fan.email, session.fan.id, "account");
  revalidatePath("/account");
}

export async function unsubscribeNewsletter(): Promise<void> {
  const session = await requireFan();
  await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", confirmToken: null })
    .where(eq(newsletterSubscribers.email, session.fan.email));
  revalidatePath("/account");
}
