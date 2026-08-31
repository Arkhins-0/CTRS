"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, members } from "@ctr/db";
import { writeAudit } from "@/lib/audit";
import { consumeInvitation } from "@/lib/member-invites";
import { checkRateLimit } from "@/lib/rate-limit";

const PASSWORD_MIN = 10;

const schema = z
  .object({
    newPassword: z.string().min(PASSWORD_MIN),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword);

function fail(token: string, status: string): never {
  redirect(`/m/join/${token}?status=${status}`);
}

/**
 * Accepts an invitation and creates the member account.
 *
 * Consumed on POST only, so a mail scanner prefetching the link cannot burn
 * the invitation before the invitee opens it.
 *
 * The account is created already email-verified: the token was delivered to
 * that inbox and nowhere else, so possession of it IS proof of control. The
 * role, team and email all come from the invitation row — never from the form
 * — so the invitee cannot promote themselves by editing the payload.
 */
export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  const parsed = schema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) fail(token, "invalid");

  const limit = await checkRateLimit(`invite:accept:${token.slice(0, 32)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) fail(token, "rate-limited");

  const invite = await consumeInvitation(token);
  if (!invite) fail(token, "expired");

  // The address may have been given an account by another route since the
  // invite was issued. Fail closed rather than hitting the unique index.
  const existing = await db.query.members.findFirst({
    where: eq(members.email, invite.email),
    columns: { id: true },
  });
  if (existing) fail(token, "exists");

  const created = await db
    .insert(members)
    .values({
      email: invite.email,
      passwordHash: bcrypt.hashSync(parsed.data.newPassword, 12),
      displayName: invite.displayName,
      role: invite.role,
      teamId: invite.teamId,
      jobTitle: invite.jobTitle,
      emailVerifiedAt: new Date(),
    })
    .returning({ id: members.id });

  await writeAudit({
    actorId: invite.invitedByAdminId,
    action: "member.invite-accepted",
    entityType: "member",
    entityId: created[0]?.id ?? null,
    diff: { after: { email: invite.email, role: invite.role, teamId: invite.teamId } },
  });

  // Deliberately does NOT sign them in — they arrive at a normal sign-in and
  // prove the password they just chose actually works.
  redirect("/m/login?status=joined");
}
