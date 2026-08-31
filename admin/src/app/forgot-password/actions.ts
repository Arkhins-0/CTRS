"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminUsers, db } from "@ctr/db";
import { adminPasswordResetEmail, sendEmail } from "@ctr/email";
import { writeAudit } from "@/lib/audit";
import { issueToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminUrl } from "@/lib/urls";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

const RESET_TTL_MINUTES = 60;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Starts a password reset.
 *
 * ENUMERATION-SAFE: the response is identical whether or not the address
 * belongs to an account, and whether or not that account is active. Anything
 * else turns this form into a directory of who works here. The only
 * observable difference is timing, which the rate limit bounds.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });

  // Two limiters: per-IP stops a broad sweep, per-address stops mailbombing
  // one person. Both must pass.
  const ip = await clientIp();
  const byIp = await checkRateLimit(`pwreset:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!byIp.allowed) redirect("/forgot-password?status=sent");

  if (parsed.success) {
    const byEmail = await checkRateLimit(`pwreset:email:${parsed.data.email}`, 3, 60 * 60 * 1000);

    if (byEmail.allowed) {
      const user = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.email, parsed.data.email),
        columns: { id: true, displayName: true, email: true, isActive: true },
      });

      // A deactivated account must not be recoverable by its former holder.
      if (user && user.isActive) {
        const token = await issueToken(user.id, "password_reset");
        try {
          await sendEmail({
            to: user.email,
            ...adminPasswordResetEmail({
              displayName: user.displayName,
              resetUrl: adminUrl(`/reset-password/${token}`),
              expiresInMinutes: RESET_TTL_MINUTES,
            }),
          });
        } catch (err) {
          // Swallowed on purpose: surfacing a send failure would leak that the
          // address exists. It is logged for operators instead.
          console.error("[forgot-password] send failed", err);
        }

        await writeAudit({
          actorId: user.id,
          action: "auth.password-reset-request",
          entityType: "admin_user",
          entityId: user.id,
        });
      }
    }
  }

  redirect("/forgot-password?status=sent");
}
