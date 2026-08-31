"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, fans } from "@ctr/db";
import { fanPasswordResetEmail, sendEmail } from "@ctr/email";
import { issueFanResetToken } from "@/lib/fan-tokens";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

const RESET_TTL_MINUTES = 60;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Starts a fan password reset. Same enumeration-safety and two-tier rate
 * limiting as admin/src/app/forgot-password and admin/src/app/m/forgot-password
 * — the response is identical whether or not the address has an account, and
 * a send failure is swallowed rather than surfaced (see those files' notes).
 */
export async function requestFanPasswordResetAction(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });

  const ip = await clientIp();
  const byIp = await checkRateLimit(`fpwreset:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!byIp.allowed) redirect("/forgot-password?status=sent");

  if (parsed.success) {
    const byEmail = await checkRateLimit(`fpwreset:email:${parsed.data.email}`, 3, 60 * 60 * 1000);

    if (byEmail.allowed) {
      const fan = await db.query.fans.findFirst({
        where: eq(fans.email, parsed.data.email),
        columns: { id: true, displayName: true, email: true, deactivatedAt: true },
      });

      if (fan && !fan.deactivatedAt) {
        const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
        const token = await issueFanResetToken(fan.id);
        try {
          await sendEmail({
            to: fan.email,
            ...fanPasswordResetEmail({
              displayName: fan.displayName,
              resetUrl: `${base}/reset-password/${token}`,
              expiresInMinutes: RESET_TTL_MINUTES,
            }),
          });
        } catch (err) {
          console.error("[forgot-password] send failed", err);
        }
      }
    }
  }

  redirect("/forgot-password?status=sent");
}
