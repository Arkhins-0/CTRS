"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, memberInvitations, members } from "@ctr/db";
import { memberInviteEmail, sendEmail } from "@ctr/email";
import { writeAudit } from "@/lib/audit";
import { evictAllMemberSessions, requireTeamAdmin } from "@/lib/member-auth";
import { issueInvitation, revokeInvitation } from "@/lib/member-invites";
import { ROLE_LABELS, TEAM_ASSIGNABLE_ROLES } from "@/lib/member-roles";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminUrl } from "@/lib/urls";

const INVITE_TTL_DAYS = 14;

function back(status: string): never {
  redirect(`/m/roster?status=${status}`);
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(2).max(120),
  // A team admin may only grant team roles — never `official`, which is
  // organisation-wide and is not theirs to hand out.
  role: z.enum(["team_admin", "team_member"]),
  jobTitle: z.string().trim().max(120).optional(),
});

/**
 * Invites someone onto the caller's OWN team.
 *
 * The team is taken from the session, never the form — a team admin editing a
 * hidden input must not be able to seed another team's roster.
 */
export async function inviteMemberAction(formData: FormData) {
  const session = await requireTeamAdmin();
  const teamId = session.member.teamId!;

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    jobTitle: formData.get("jobTitle") || undefined,
  });
  if (!parsed.success) back("invalid");
  if (!TEAM_ASSIGNABLE_ROLES.includes(parsed.data.role)) back("invalid");

  const limit = await checkRateLimit(`invite:send:${session.member.id}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) back("rate-limited");

  const existing = await db.query.members.findFirst({
    where: eq(members.email, parsed.data.email),
    columns: { id: true },
  });
  if (existing) back("exists");

  const token = await issueInvitation({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    teamId,
    jobTitle: parsed.data.jobTitle ?? null,
    invitedByMemberId: session.member.id,
  });

  try {
    await sendEmail({
      to: parsed.data.email,
      ...memberInviteEmail({
        displayName: parsed.data.displayName,
        inviterName: session.member.displayName,
        teamName: session.team?.name ?? null,
        roleLabel: ROLE_LABELS[parsed.data.role],
        acceptUrl: adminUrl(`/m/join/${token}`),
        expiresInDays: INVITE_TTL_DAYS,
      }),
    });
  } catch (err) {
    console.error("[roster] invite send failed", err);
    back("send-failed");
  }

  revalidatePath("/m/roster");
  back("invited");
}

/** Withdraws an invitation that has not been accepted. */
export async function revokeInviteAction(formData: FormData) {
  const session = await requireTeamAdmin();
  const tokenHash = String(formData.get("tokenHash") ?? "");

  // Scope the delete to this team so a crafted hash cannot clear someone
  // else's pending invites.
  const invite = await db.query.memberInvitations.findFirst({
    where: and(
      eq(memberInvitations.tokenHash, tokenHash),
      eq(memberInvitations.teamId, session.member.teamId!),
    ),
    columns: { tokenHash: true },
  });
  if (!invite) back("not-found");

  await revokeInvitation(invite.tokenHash);
  revalidatePath("/m/roster");
  back("invite-revoked");
}

/** Deactivates a roster member and signs out every device they hold. */
export async function setMemberActiveAction(formData: FormData) {
  const session = await requireTeamAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const active = formData.get("active") === "true";

  if (memberId === session.member.id) back("self");

  const target = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.teamId, session.member.teamId!)),
    columns: { id: true, email: true, isActive: true },
  });
  if (!target) back("not-found");

  await db.update(members).set({ isActive: active }).where(eq(members.id, target.id));
  // Deactivating must take effect immediately, not whenever their cookie
  // happens to expire.
  if (!active) await evictAllMemberSessions(target.id);

  await writeAudit({
    actorId: null,
    action: active ? "member.reactivate" : "member.deactivate",
    entityType: "member",
    entityId: target.id,
    diff: { before: { isActive: target.isActive }, after: { isActive: active } },
  });

  revalidatePath("/m/roster");
  back(active ? "reactivated" : "deactivated");
}
