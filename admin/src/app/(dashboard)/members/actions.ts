"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PERMISSIONS, db, memberInvitations, members, teams } from "@ctr/db";
import { memberInviteEmail, memberPasswordChangedNoticeEmail, sendEmail } from "@ctr/email";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { evictAllMemberSessions } from "@/lib/member-auth";
import { issueInvitation, revokeInvitation } from "@/lib/member-invites";
import { ADMIN_ASSIGNABLE_ROLES, ROLE_LABELS, isMemberRole, isTeamRole } from "@/lib/member-roles";
import { adminUrl } from "@/lib/urls";

const INVITE_TTL_DAYS = 14;

function back(status: string): never {
  redirect(`/members?status=${status}`);
}

const inviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    displayName: z.string().trim().min(2).max(120),
    role: z.string().refine(isMemberRole),
    teamId: z.string().uuid().optional().or(z.literal("")),
    jobTitle: z.string().trim().max(120).optional(),
  })
  .refine((v) => (isMemberRole(v.role) && isTeamRole(v.role) ? Boolean(v.teamId) : true), {
    // Officials are organisation-wide; everyone else belongs to exactly one team.
    message: "Team roles require a team",
    path: ["teamId"],
  });

/** CMS-side invite — staff may create officials as well as team members. */
export async function adminInviteMemberAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    teamId: formData.get("teamId") || "",
    jobTitle: formData.get("jobTitle") || undefined,
  });
  if (!parsed.success) back("invalid");
  if (!ADMIN_ASSIGNABLE_ROLES.includes(parsed.data.role)) back("invalid");

  const existing = await db.query.members.findFirst({
    where: eq(members.email, parsed.data.email),
    columns: { id: true },
  });
  if (existing) back("exists");

  const teamId = isTeamRole(parsed.data.role) ? (parsed.data.teamId as string) : null;
  const team = teamId
    ? await db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { name: true } })
    : null;
  if (teamId && !team) back("invalid");

  const token = await issueInvitation({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    teamId,
    jobTitle: parsed.data.jobTitle ?? null,
    invitedByAdminId: session.user.id,
  });

  try {
    await sendEmail({
      to: parsed.data.email,
      ...memberInviteEmail({
        displayName: parsed.data.displayName,
        inviterName: session.user.displayName,
        teamName: team?.name ?? null,
        roleLabel: ROLE_LABELS[parsed.data.role],
        acceptUrl: adminUrl(`/m/join/${token}`),
        expiresInDays: INVITE_TTL_DAYS,
      }),
    });
  } catch (err) {
    console.error("[members] invite send failed", err);
    back("send-failed");
  }

  await writeAudit({
    actorId: session.user.id,
    action: "member.invite",
    entityType: "member_invitation",
    entityId: parsed.data.email,
    diff: { after: { role: parsed.data.role, teamId } },
  });

  revalidatePath("/members");
  back("invited");
}

export async function adminRevokeInviteAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const tokenHash = String(formData.get("tokenHash") ?? "");

  const invite = await db.query.memberInvitations.findFirst({
    where: and(eq(memberInvitations.tokenHash, tokenHash), isNull(memberInvitations.acceptedAt)),
    columns: { tokenHash: true, email: true },
  });
  if (!invite) back("not-found");

  await revokeInvitation(invite.tokenHash);
  await writeAudit({
    actorId: session.user.id,
    action: "member.invite-revoke",
    entityType: "member_invitation",
    entityId: invite.email,
  });

  revalidatePath("/members");
  back("invite-revoked");
}

export async function adminSetMemberActiveAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const memberId = String(formData.get("memberId") ?? "");
  const active = formData.get("active") === "true";

  const target = await db.query.members.findFirst({
    where: eq(members.id, memberId),
    columns: { id: true, isActive: true, email: true },
  });
  if (!target) back("not-found");

  await db.update(members).set({ isActive: active }).where(eq(members.id, target.id));
  if (!active) await evictAllMemberSessions(target.id);

  await writeAudit({
    actorId: session.user.id,
    action: active ? "member.reactivate" : "member.deactivate",
    entityType: "member",
    entityId: target.id,
    diff: { before: { isActive: target.isActive }, after: { isActive: active } },
  });

  revalidatePath("/members");
  back(active ? "reactivated" : "deactivated");
}

const resetPasswordSchema = z.object({
  memberId: z.string().uuid(),
  newPassword: z.string().min(10, "Use at least 10 characters."),
});

/**
 * Manual override: a Super Admin sets a member's password directly, rather
 * than waiting on the self-service email flow.
 *
 * Deliberately gated on admins.manage, not members.manage — the same
 * permission that gates resetting an admin_user's password in
 * admin/src/app/(dashboard)/admins/actions.ts. members.manage is held by
 * team managers on the CMS side too (see ROLE_DEFINITIONS), which is right
 * for roster administration but too broad for setting someone else's
 * credential directly; only super_admin holds admins.manage.
 */
export async function resetMemberPasswordAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);

  const parsed = resetPasswordSchema.safeParse({
    memberId: formData.get("memberId"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    redirect(`/members/${String(formData.get("memberId") ?? "")}/reset-password?error=invalid`);
  }

  const target = await db.query.members.findFirst({
    where: eq(members.id, parsed.data.memberId),
    columns: { id: true, email: true, displayName: true },
  });
  if (!target) back("not-found");

  await db
    .update(members)
    .set({ passwordHash: bcrypt.hashSync(parsed.data.newPassword, 12), failedLogins: 0 })
    .where(eq(members.id, target.id));

  // A reset is meaningless if a stolen session survives it.
  await evictAllMemberSessions(target.id);

  await writeAudit({
    actorId: session.user.id,
    action: "member.password-reset",
    entityType: "member",
    entityId: target.id,
  });

  try {
    await sendEmail({
      to: target.email,
      ...memberPasswordChangedNoticeEmail({ displayName: target.displayName }),
    });
  } catch (err) {
    console.error("[members] password-changed notice failed", err);
  }

  revalidatePath("/members");
  redirect(`/members?status=password-reset`);
}
