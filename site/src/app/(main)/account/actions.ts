"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { compareSync, hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, fans, newsletterSubscribers } from "@ctr/db";
import { fanPasswordChangedNoticeEmail, sendEmail } from "@ctr/email";
import {
  createFanSession,
  destroyFanSession,
  evictAllFanSessions,
  requireFan,
} from "@/lib/fan-auth";
import { sendConfirmationEmail, upsertPendingSubscription } from "@/components/fanzone/newsletter-db";

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

/* ── Password ────────────────────────────────────────────────────────────── */

export type PasswordState = { error: string | null; ok: boolean };

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Your new password must be at least 8 characters.")
      .max(72, "Your new password must be 72 characters or fewer."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "New password and confirmation don't match.",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await requireFan();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      ok: false,
    };
  }

  const [fan] = await db.select().from(fans).where(eq(fans.id, session.fan.id));
  if (!fan || !compareSync(parsed.data.currentPassword, fan.passwordHash)) {
    return { error: "Your current password is incorrect.", ok: false };
  }

  await db
    .update(fans)
    .set({ passwordHash: hashSync(parsed.data.newPassword, 12) })
    .where(eq(fans.id, fan.id));

  // Every session (including this one) is invalidated, then this device is
  // signed straight back in — a stolen cookie dies here even though the fan
  // who just typed their password notices nothing.
  await evictAllFanSessions(fan.id);
  await createFanSession(fan.id);

  try {
    await sendEmail({
      to: fan.email,
      ...fanPasswordChangedNoticeEmail({ displayName: fan.displayName }),
    });
  } catch (err) {
    console.error("[account] password-changed notice failed", err);
  }

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
  const result = await upsertPendingSubscription(session.fan.email, session.fan.id, "account");
  await sendConfirmationEmail(session.fan.email, result.token);
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
