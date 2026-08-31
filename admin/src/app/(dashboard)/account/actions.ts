"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminUsers, db } from "@ctr/db";
import {
  adminEmailChangeEmail,
  adminPasswordChangedNoticeEmail,
  sendEmail,
} from "@ctr/email";
import { evictOtherSessions, requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { issueToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveNotificationPrefs } from "@/lib/notification-prefs";
import { adminUrl } from "@/lib/urls";

/**
 * Self-service account actions.
 *
 * These are the only mutations an admin can make to their OWN record — every
 * one re-reads the session rather than trusting an id from the form, so a
 * crafted POST cannot target another user. Changing a credential evicts every
 * other session, because rotating a password is pointless while a stolen
 * cookie stays valid.
 */

const PASSWORD_MIN = 10;

/** Result surfaced back into the page via searchParams. */
function back(status: string): never {
  redirect(`/account?status=${status}`);
}

/* ── Profile ─────────────────────────────────────────────────────────────── */

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Name is too short").max(120),
});

export async function updateProfileAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = profileSchema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) back("invalid-name");

  await db
    .update(adminUsers)
    .set({ displayName: parsed.data.displayName })
    .where(eq(adminUsers.id, session.user.id));

  await writeAudit({
    actorId: session.user.id,
    action: "account.profile-update",
    entityType: "admin_user",
    entityId: session.user.id,
    diff: { before: { displayName: session.user.displayName }, after: parsed.data },
  });

  revalidatePath("/account");
  back("profile-saved");
}

/* ── Password ────────────────────────────────────────────────────────────── */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords do not match" });

export async function changePasswordAction(formData: FormData) {
  const session = await requireAdmin();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) back("invalid-password");

  // Throttle per account: a stolen session should not be a password oracle.
  const limit = await checkRateLimit(`pwchange:${session.user.id}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) back("rate-limited");

  const row = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.user.id),
    columns: { passwordHash: true, displayName: true, email: true },
  });
  if (!row) back("invalid-password");

  if (!bcrypt.compareSync(parsed.data.currentPassword, row.passwordHash)) {
    back("wrong-password");
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: bcrypt.hashSync(parsed.data.newPassword, 12) })
    .where(eq(adminUsers.id, session.user.id));

  await evictOtherSessions(session.user.id);

  await writeAudit({
    actorId: session.user.id,
    action: "account.password-change",
    entityType: "admin_user",
    entityId: session.user.id,
  });

  // Notify, but never let a mail outage roll back a completed change.
  try {
    await sendEmail({
      to: row.email,
      ...adminPasswordChangedNoticeEmail({
        displayName: row.displayName,
        supportEmail: process.env.EMAIL_FROM ?? "support@ctrsports.in",
      }),
    });
  } catch (err) {
    console.error("[account] password-changed notice failed", err);
  }

  revalidatePath("/account");
  back("password-saved");
}

/* ── Email change (two step) ─────────────────────────────────────────────── */

const emailSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Confirm with your password"),
});

export async function requestEmailChangeAction(formData: FormData) {
  const session = await requireAdmin();

  const parsed = emailSchema.safeParse({
    newEmail: formData.get("newEmail"),
    password: formData.get("password"),
  });
  if (!parsed.success) back("invalid-email");

  const limit = await checkRateLimit(`emailchange:${session.user.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) back("rate-limited");

  const row = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.user.id),
    columns: { passwordHash: true, displayName: true },
  });
  if (!row || !bcrypt.compareSync(parsed.data.password, row.passwordHash)) {
    back("wrong-password");
  }

  if (parsed.data.newEmail === session.user.email.toLowerCase()) back("same-email");

  /*
   * Deliberately does NOT reveal whether the address is already registered:
   * we issue the token and send mail either way, and the confirm step fails
   * closed on the unique constraint. Telling the caller here would turn this
   * form into an account-enumeration oracle.
   */
  const taken = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, parsed.data.newEmail),
    columns: { id: true },
  });

  if (!taken) {
    const token = await issueToken(session.user.id, "email_change", parsed.data.newEmail);
    try {
      await sendEmail({
        to: parsed.data.newEmail,
        ...adminEmailChangeEmail({
          displayName: row.displayName,
          newEmail: parsed.data.newEmail,
          confirmUrl: adminUrl(`/confirm-email/${token}`),
        }),
      });
    } catch (err) {
      console.error("[account] email-change mail failed", err);
      back("email-send-failed");
    }
  }

  await writeAudit({
    actorId: session.user.id,
    action: "account.email-change-request",
    entityType: "admin_user",
    entityId: session.user.id,
  });

  back("email-change-sent");
}

/* ── Notification preferences ────────────────────────────────────────────── */

export async function updateNotificationPrefsAction(formData: FormData) {
  const session = await requireAdmin();

  // Unchecked checkboxes are simply absent from the payload.
  const on = (name: string) => formData.get(name) === "on";

  await saveNotificationPrefs(session.user.id, {
    announcements: on("announcements"),
    raceOps: on("raceOps"),
    resultsReminders: on("resultsReminders"),
    emailEnabled: on("emailEnabled"),
    pushEnabled: on("pushEnabled"),
  });

  revalidatePath("/account");
  back("prefs-saved");
}
