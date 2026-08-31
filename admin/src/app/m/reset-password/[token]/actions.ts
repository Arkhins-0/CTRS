"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, members } from "@ctr/db";
import { memberPasswordChangedNoticeEmail, sendEmail } from "@ctr/email";
import { evictAllMemberSessions } from "@/lib/member-auth";
import { consumeMemberResetToken } from "@/lib/member-tokens";
import { checkRateLimit } from "@/lib/rate-limit";

const PASSWORD_MIN = 10;

const schema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword);

function fail(token: string, status: string): never {
  redirect(`/m/reset-password/${token}?status=${status}`);
}

/**
 * Completes a member password reset. Consumed on POST only — see the admin
 * equivalent's note on mail scanners burning single-use tokens on GET.
 */
export async function resetMemberPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const parsed = schema.safeParse({
    token,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) fail(token, "invalid");

  const limit = await checkRateLimit(`mpwreset:consume:${token.slice(0, 32)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) fail(token, "rate-limited");

  const memberId = await consumeMemberResetToken(token);
  if (!memberId) fail(token, "expired");

  await db
    .update(members)
    .set({ passwordHash: bcrypt.hashSync(parsed.data.newPassword, 12), failedLogins: 0 })
    .where(eq(members.id, memberId));

  await evictAllMemberSessions(memberId);

  const member = await db.query.members.findFirst({
    where: eq(members.id, memberId),
    columns: { email: true, displayName: true },
  });
  if (member) {
    try {
      await sendEmail({
        to: member.email,
        ...memberPasswordChangedNoticeEmail({ displayName: member.displayName }),
      });
    } catch (err) {
      console.error("[m/reset-password] notice failed", err);
    }
  }

  redirect("/m/login?status=password-reset");
}
