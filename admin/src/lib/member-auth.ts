import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, ne } from "drizzle-orm";
import { db, memberSessions, members, teams } from "@ctr/db";
import { canManageRoster } from "./member-roles";

/*
 * Member sessions.
 *
 * Deliberately a separate cookie and table from the admin session rather than
 * a role flag on one principal: the two grant fundamentally different things
 * (a member can never reach the CMS), and keeping the credentials disjoint
 * means a bug in one path cannot escalate into the other. Someone who is both
 * staff and crew simply holds two accounts.
 */

const COOKIE = "ctr_member_session";
const SESSION_MS = 30 * 24 * 3600 * 1000; // 30 days, matching the admin session

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type MemberRole =
  | "team_manager"
  | "manager"
  | "driver"
  | "media"
  | "crew"
  | "official";

export type MemberSession = {
  member: {
    id: string;
    email: string;
    displayName: string;
    role: MemberRole;
    teamId: string | null;
    jobTitle: string | null;
  };
  team: { id: string; name: string } | null;
};

export async function createMemberSession(memberId: string, ip?: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(memberSessions).values({
    tokenHash: sha256(token),
    memberId,
    expiresAt: new Date(Date.now() + SESSION_MS),
    ip,
    userAgent,
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS / 1000,
    path: "/",
  });
}

export async function destroyMemberSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.delete(memberSessions).where(eq(memberSessions.tokenHash, sha256(token)));
  }
  store.delete(COOKIE);
}

/** Signs out a member's other devices — used after a credential change. */
export async function evictOtherMemberSessions(memberId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  await db
    .delete(memberSessions)
    .where(
      token
        ? and(eq(memberSessions.memberId, memberId), ne(memberSessions.tokenHash, sha256(token)))
        : eq(memberSessions.memberId, memberId),
    );
}

export async function evictAllMemberSessions(memberId: string) {
  await db.delete(memberSessions).where(eq(memberSessions.memberId, memberId));
}

/** Loads the member + their team once per request. */
export const getMemberSession = cache(async (): Promise<MemberSession | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: members.id,
      email: members.email,
      displayName: members.displayName,
      role: members.role,
      teamId: members.teamId,
      jobTitle: members.jobTitle,
      teamName: teams.name,
    })
    .from(memberSessions)
    .innerJoin(members, eq(memberSessions.memberId, members.id))
    .leftJoin(teams, eq(teams.id, members.teamId))
    .where(
      and(
        eq(memberSessions.tokenHash, sha256(token)),
        gt(memberSessions.expiresAt, new Date()),
        eq(members.isActive, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    member: {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      teamId: row.teamId,
      jobTitle: row.jobTitle,
    },
    team: row.teamId && row.teamName ? { id: row.teamId, name: row.teamName } : null,
  };
});

/** Redirects to the member sign-in when unauthenticated. */
export async function requireMember(): Promise<MemberSession> {
  const session = await getMemberSession();
  if (!session) redirect("/m/login");
  return session;
}

/**
 * Gate for managing a team roster.
 *
 * Admits any role the hierarchy says may grant something — currently team
 * managers and managers — rather than testing a single role string, so adding
 * a tier to ASSIGNABLE_BY does not require touching this guard.
 *
 * Roster managers are scoped to their OWN team: the caller may pass the team
 * it is about to act on and a mismatch is refused. Without that check a
 * manager could edit any roster by changing an id in the form.
 */
export async function requireRosterManager(teamId?: string): Promise<MemberSession> {
  const session = await requireMember();
  if (!canManageRoster(session.member.role)) redirect("/m");
  if (!session.member.teamId) redirect("/m");
  if (teamId && teamId !== session.member.teamId) redirect("/m");
  return session;
}
