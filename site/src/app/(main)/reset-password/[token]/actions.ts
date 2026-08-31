"use server";

import { redirect } from "next/navigation";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, fans } from "@ctr/db";
import { fanPasswordChangedNoticeEmail, sendEmail } from "@ctr/email";
import { evictAllFanSessions } from "@/lib/fan-auth";
import { consumeFanResetToken } from "@/lib/fan-tokens";
import { checkRateLimit } from "@/lib/rate-limit";

const PASSWORD_MIN = 8;

const schema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN).max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword);

function fail(token: string, status: string): never {
  redirect(`/reset-password/${token}?status=${status}`);
}

/**
 * Completes a fan password reset. Consumed on POST only — a mail scanner
 * that prefetches the GET link must not burn the single-use token before the
 * fan clicks it themselves (same reasoning as the admin/member equivalents).
 */
export async function resetFanPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const parsed = schema.safeParse({
    token,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) fail(token, "invalid");

  const limit = await checkRateLimit(`fpwreset:consume:${token.slice(0, 32)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) fail(token, "rate-limited");

  const fanId = await consumeFanResetToken(token);
  if (!fanId) fail(token, "expired");

  await db
    .update(fans)
    .set({ passwordHash: hashSync(parsed.data.newPassword, 12) })
    .where(eq(fans.id, fanId));

  await evictAllFanSessions(fanId);

  const fan = await db.query.fans.findFirst({
    where: eq(fans.id, fanId),
    columns: { email: true, displayName: true },
  });
  if (fan) {
    try {
      await sendEmail({
        to: fan.email,
        ...fanPasswordChangedNoticeEmail({ displayName: fan.displayName }),
      });
    } catch (err) {
      console.error("[reset-password] notice failed", err);
    }
  }

  redirect("/login?status=password-reset");
}
