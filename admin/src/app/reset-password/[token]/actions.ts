"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminUsers, db } from "@ctr/db";
import { adminPasswordChangedNoticeEmail, sendEmail } from "@ctr/email";
import { writeAudit } from "@/lib/audit";
import { evictAllSessions } from "@/lib/auth";
import { consumeToken, revokeTokens } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";

const PASSWORD_MIN = 10;

const schema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword);

/*
 * Declared (not an arrow) with an explicit `never` return so TypeScript
 * narrows control flow past every call — an arrow assigned to a const does
 * not get that treatment.
 */
function fail(token: string, status: string): never {
  redirect(`/reset-password/${token}?status=${status}`);
}

/**
 * Completes a password reset.
 *
 * The token is consumed here, on POST, and never on the GET that renders the
 * form — mail scanners and link previewers routinely fetch URLs in email, and
 * a token burned by a scanner locks the real user out of their own reset.
 */
export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const parsed = schema.safeParse({
    token,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) fail(token, "invalid");

  // Bound brute-forcing of the token space.
  const limit = await checkRateLimit(`pwreset:consume:${token.slice(0, 32)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) fail(token, "rate-limited");

  const claim = await consumeToken(token, "password_reset");
  if (!claim) fail(token, "expired");

  await db
    .update(adminUsers)
    .set({
      passwordHash: bcrypt.hashSync(parsed.data.newPassword, 12),
      // A successful reset also clears the failed-login lockout — otherwise
      // someone locked out by an attacker's guessing could never get back in.
      failedLogins: 0,
    })
    .where(eq(adminUsers.id, claim.adminUserId));

  // Everything else this account had open is now untrusted, including any
  // session an attacker established before the reset.
  await evictAllSessions(claim.adminUserId);
  await revokeTokens(claim.adminUserId);

  await writeAudit({
    actorId: claim.adminUserId,
    action: "auth.password-reset",
    entityType: "admin_user",
    entityId: claim.adminUserId,
  });

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, claim.adminUserId),
    columns: { email: true, displayName: true },
  });
  if (user) {
    try {
      await sendEmail({
        to: user.email,
        ...adminPasswordChangedNoticeEmail({
          displayName: user.displayName,
          supportEmail: process.env.EMAIL_FROM ?? "support@ctrsports.in",
        }),
      });
    } catch (err) {
      console.error("[reset-password] notice failed", err);
    }
  }

  redirect("/login?status=password-reset");
}
