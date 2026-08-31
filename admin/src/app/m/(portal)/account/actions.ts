"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, memberNotificationPrefs, members } from "@ctr/db";
import { adminPasswordChangedNoticeEmail, sendEmail } from "@ctr/email";
import { evictOtherMemberSessions, requireMember } from "@/lib/member-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const PASSWORD_MIN = 10;

function back(status: string): never {
  redirect(`/m/account?status=${status}`);
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  jobTitle: z.string().trim().max(120).optional(),
});

/** Members may edit their own contact details, but never their role or team. */
export async function updateMemberProfileAction(formData: FormData) {
  const session = await requireMember();

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone") || undefined,
    jobTitle: formData.get("jobTitle") || undefined,
  });
  if (!parsed.success) back("invalid-profile");

  await db
    .update(members)
    .set({
      displayName: parsed.data.displayName,
      phone: parsed.data.phone ?? null,
      jobTitle: parsed.data.jobTitle ?? null,
    })
    .where(eq(members.id, session.member.id));

  revalidatePath("/m/account");
  back("profile-saved");
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword);

export async function changeMemberPasswordAction(formData: FormData) {
  const session = await requireMember();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) back("invalid-password");

  const limit = await checkRateLimit(`mpwchange:${session.member.id}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) back("rate-limited");

  const row = await db.query.members.findFirst({
    where: eq(members.id, session.member.id),
    columns: { passwordHash: true, email: true, displayName: true },
  });
  if (!row) back("invalid-password");
  if (!bcrypt.compareSync(parsed.data.currentPassword, row.passwordHash)) back("wrong-password");

  await db
    .update(members)
    .set({ passwordHash: bcrypt.hashSync(parsed.data.newPassword, 12) })
    .where(eq(members.id, session.member.id));

  await evictOtherMemberSessions(session.member.id);

  try {
    await sendEmail({
      to: row.email,
      ...adminPasswordChangedNoticeEmail({
        displayName: row.displayName,
        supportEmail: process.env.EMAIL_FROM ?? "support@ctrsports.in",
      }),
    });
  } catch (err) {
    console.error("[m/account] password notice failed", err);
  }

  revalidatePath("/m/account");
  back("password-saved");
}

export async function updateMemberPrefsAction(formData: FormData) {
  const session = await requireMember();
  const on = (name: string) => formData.get(name) === "on";

  const prefs = {
    announcements: on("announcements"),
    raceOps: on("raceOps"),
    rsvpReminders: on("rsvpReminders"),
    emailEnabled: on("emailEnabled"),
    pushEnabled: on("pushEnabled"),
  };

  await db
    .insert(memberNotificationPrefs)
    .values({ memberId: session.member.id, ...prefs, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: memberNotificationPrefs.memberId,
      set: { ...prefs, updatedAt: new Date() },
    });

  revalidatePath("/m/account");
  back("prefs-saved");
}
