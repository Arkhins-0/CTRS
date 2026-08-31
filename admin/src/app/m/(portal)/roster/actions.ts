"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, memberInvitations, members } from "@ctr/db";
import { memberInviteEmail, sendEmail } from "@ctr/email";
import { writeAudit } from "@/lib/audit";
import { evictAllMemberSessions, requireRosterManager } from "@/lib/member-auth";
import { parseCsvRecords } from "@/lib/csv";
import { issueInvitation, revokeInvitation } from "@/lib/member-invites";
import { ASSIGNABLE_BY, ROLE_LABELS, canActOnRole, canAssignRole, isMemberRole } from "@/lib/member-roles";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminUrl } from "@/lib/urls";

const INVITE_TTL_DAYS = 14;

function back(status: string): never {
  redirect(`/m/roster?status=${status}`);
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(2).max(120),
  // Any member role is accepted by the shape; whether THIS caller may grant it
  // is checked against ASSIGNABLE_BY below, which is the real gate.
  role: z.string().refine(isMemberRole),
  jobTitle: z.string().trim().max(120).optional(),
});

/**
 * Invites someone onto the caller's OWN team.
 *
 * The team is taken from the session, never the form — a team admin editing a
 * hidden input must not be able to seed another team's roster.
 */
export async function inviteMemberAction(formData: FormData) {
  const session = await requireRosterManager();
  const teamId = session.member.teamId!;

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    jobTitle: formData.get("jobTitle") || undefined,
  });
  if (!parsed.success) back("invalid");
  /*
   * The authority check. A manager may add drivers, media and crew but must
   * not be able to mint another manager — or a team manager — by posting a
   * different role value than the form offered them.
   */
  if (!canAssignRole(session.member.role, parsed.data.role)) back("forbidden-role");

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

/**
 * Bulk-invites a crew list from a CSV.
 *
 * Every row is validated independently and the outcome is counted rather than
 * aborting the batch: a single malformed line in a 40-row crew list should not
 * discard the other 39. Rows that are already members or already invited are
 * skipped rather than treated as errors — re-uploading a corrected sheet is
 * the normal way people use this.
 */
export async function bulkInviteAction(formData: FormData) {
  const session = await requireRosterManager();
  const teamId = session.member.teamId!;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) back("no-file");
  if (file.size > 512 * 1024) back("file-too-big");

  const limit = await checkRateLimit(`invite:bulk:${session.member.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) back("rate-limited");

  const records = parseCsvRecords(await file.text());
  if (!records.length) back("empty-file");
  if (records.length > 100) back("too-many-rows");

  let invited = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    const parsed = inviteSchema.safeParse({
      email: record.email,
      displayName: record.name || record.displayname || record["full name"],
      /*
       * A CSV row may name a role, but only one this caller may actually
       * grant; anything else falls back to their least-privileged option so a
       * spreadsheet can never be used to escalate.
       */
      role:
        isMemberRole(record.role) && canAssignRole(session.member.role, record.role)
          ? record.role
          : (ASSIGNABLE_BY[session.member.role].at(-1) ?? "crew"),
      jobTitle: record.position || record.jobtitle || undefined,
    });
    if (!parsed.success) {
      failed += 1;
      continue;
    }

    const existing = await db.query.members.findFirst({
      where: eq(members.email, parsed.data.email),
      columns: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    try {
      const token = await issueInvitation({
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        teamId,
        jobTitle: parsed.data.jobTitle ?? null,
        invitedByMemberId: session.member.id,
      });
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
      invited += 1;
    } catch (err) {
      console.error("[roster] bulk invite row failed", err);
      failed += 1;
    }
  }

  revalidatePath("/m/roster");
  redirect(`/m/roster?status=bulk&invited=${invited}&skipped=${skipped}&failed=${failed}`);
}

/** Withdraws an invitation that has not been accepted. */
export async function revokeInviteAction(formData: FormData) {
  const session = await requireRosterManager();
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
  const session = await requireRosterManager();
  const memberId = String(formData.get("memberId") ?? "");
  const active = formData.get("active") === "true";

  if (memberId === session.member.id) back("self");

  const target = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.teamId, session.member.teamId!)),
    columns: { id: true, email: true, isActive: true, role: true },
  });
  if (!target) back("not-found");
  // You may only act on people whose role you could have granted — otherwise a
  // manager could deactivate the team manager who appointed them.
  if (!canActOnRole(session.member.role, target.role)) back("forbidden-role");

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
