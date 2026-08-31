import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db, memberInvitations } from "@ctr/db";
import type { MemberRole } from "./member-auth";

/**
 * Member invitations.
 *
 * There is no open signup — an account exists only because someone with
 * authority over that roster invited the address. The emailed token therefore
 * doubles as proof of inbox control, which is why accepting one marks the
 * account email-verified without a second round trip.
 *
 * Same storage discipline as admin tokens: sha256 only, single-use, claimed by
 * a conditional UPDATE so two people opening the same link cannot both win.
 */

const TTL_MS = 14 * 24 * 3600 * 1000; // 14 days — rosters are assembled slowly

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type InviteDraft = {
  email: string;
  displayName: string;
  role: MemberRole;
  teamId: string | null;
  jobTitle?: string | null;
  invitedByAdminId?: string | null;
  invitedByMemberId?: string | null;
};

/** Issues an invitation and returns the RAW token for the email. */
export async function issueInvitation(draft: InviteDraft): Promise<string> {
  // Supersede any outstanding invite for the same address so an older link
  // cannot be used to join with stale role or team details.
  await db
    .delete(memberInvitations)
    .where(and(eq(memberInvitations.email, draft.email), isNull(memberInvitations.acceptedAt)));

  const raw = randomBytes(32).toString("base64url");
  await db.insert(memberInvitations).values({
    tokenHash: sha256(raw),
    email: draft.email,
    displayName: draft.displayName,
    role: draft.role,
    teamId: draft.teamId,
    jobTitle: draft.jobTitle ?? null,
    invitedByAdminId: draft.invitedByAdminId ?? null,
    invitedByMemberId: draft.invitedByMemberId ?? null,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return raw;
}

/** Reads an invitation without consuming it, for rendering the accept form. */
export async function peekInvitation(raw: string) {
  return db.query.memberInvitations.findFirst({
    where: and(
      eq(memberInvitations.tokenHash, sha256(raw)),
      isNull(memberInvitations.acceptedAt),
      gt(memberInvitations.expiresAt, new Date()),
    ),
  });
}

/**
 * Claims an invitation. The conditional UPDATE is the atomic step — whichever
 * request lands first is the only one that receives a row.
 */
export async function consumeInvitation(raw: string) {
  const rows = await db
    .update(memberInvitations)
    .set({ acceptedAt: new Date() })
    .where(
      and(
        eq(memberInvitations.tokenHash, sha256(raw)),
        isNull(memberInvitations.acceptedAt),
        gt(memberInvitations.expiresAt, new Date()),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/** Revokes an outstanding invitation (team admin changed their mind). */
export async function revokeInvitation(tokenHash: string) {
  await db
    .delete(memberInvitations)
    .where(and(eq(memberInvitations.tokenHash, tokenHash), isNull(memberInvitations.acceptedAt)));
}

/** Housekeeping: drop expired and long-accepted rows. */
export async function pruneInvitations() {
  await db
    .delete(memberInvitations)
    .where(
      or(
        lt(memberInvitations.expiresAt, new Date()),
        lt(memberInvitations.acceptedAt, new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      ),
    );
}
