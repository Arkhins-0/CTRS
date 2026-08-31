"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, members } from "@ctr/db";
import { memberPasswordResetEmail, sendEmail } from "@ctr/email";
import { issueMemberResetToken } from "@/lib/member-tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminUrl } from "@/lib/urls";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

const RESET_TTL_MINUTES = 60;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Starts a member password reset. Mirrors admin/src/app/forgot-password's
 * action exactly — same enumeration-safety, same two-tier rate limiting —
 * scoped to the members table instead of admin_users.
 */
export async function requestMemberPasswordResetAction(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });

  const ip = await clientIp();
  const byIp = await checkRateLimit(`mpwreset:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!byIp.allowed) redirect("/m/forgot-password?status=sent");

  if (parsed.success) {
    const byEmail = await checkRateLimit(`mpwreset:email:${parsed.data.email}`, 3, 60 * 60 * 1000);

    if (byEmail.allowed) {
      const member = await db.query.members.findFirst({
        where: eq(members.email, parsed.data.email),
        columns: { id: true, displayName: true, email: true, isActive: true },
      });

      if (member && member.isActive) {
        const token = await issueMemberResetToken(member.id);
        try {
          await sendEmail({
            to: member.email,
            ...memberPasswordResetEmail({
              displayName: member.displayName,
              resetUrl: adminUrl(`/m/reset-password/${token}`),
              expiresInMinutes: RESET_TTL_MINUTES,
            }),
          });
        } catch (err) {
          // Swallowed on purpose — see the admin equivalent's note on why
          // surfacing a send failure here would leak account existence.
          console.error("[m/forgot-password] send failed", err);
        }
      }
    }
  }

  redirect("/m/forgot-password?status=sent");
}
